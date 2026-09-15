/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   ENGINE / WEALTH — cash, cubos de inversión, clima y legado
   Separado del RNG deportivo (seed derivado, no consume cursor).
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;
  var CATS = ['realEstate', 'funds', 'business', 'esports', 'tech'];

  function money(n) {
    n = Number(n);
    return isFinite(n) ? Math.max(0, Math.round(n)) : 0;
  }

  function emptyBuckets() {
    var o = {};
    CATS.forEach(function (k) { o[k] = 0; });
    return o;
  }

  function rng(state, label) {
    return new DCS.rng.Rng(String(state.seed) + '|WEALTH|' + label, 0);
  }

  function catMeta(id) {
    var list = DCS.data.WEALTH_CATS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return { id: id, name: id, risk: 'Medio', potential: 'Medio', blurb: '' };
  }

  function migrateOldAssets(w, old) {
    if (!old || !Array.isArray(old.assets)) return;
    var map = { realEstate: 'realEstate', startup: 'tech', conservative: 'funds', business: 'business' };
    old.assets.forEach(function (a) {
      if (a.category === 'luxury') { w.cash += money(a.value); return; }
      var k = map[a.category];
      if (!k) return;
      var v = money(a.value);
      w.buckets[k] += v;
      w.invested[k] += money(a.cost || a.value);
    });
    if (typeof old.cash === 'number') w.cash = money(Math.max(w.cash, old.cash));
  }

  function init(state) {
    if (!state.wealth) {
      state.wealth = {
        cash: 0,
        buckets: emptyBuckets(),
        invested: emptyBuckets(),
        pulled: { salary: 0, prize: 0, other: 0 },
        climate: null,
        tickedYear: null,
        lastTick: null,
        notes: [],
        best: null,
        worst: null,
        specialYear: null
      };
      migrateOldAssets(state.wealth, state.finances);
      var old = state.finances;
      var used = old && (
        (old.assets && old.assets.length) ||
        (old.cash > 0) ||
        (old.reports && old.reports.length) ||
        (old.totals && old.totals.careerIncome)
      );
      if (used) {
        var e = (state.career && state.career.earnings) || {};
        state.wealth.pulled = {
          salary: e.salary || 0,
          prize: prizeNow(state),
          other: e.other || 0
        };
      }
    }
    var w = state.wealth;
    w.cash = money(w.cash);
    if (!w.buckets) w.buckets = emptyBuckets();
    if (!w.invested) w.invested = emptyBuckets();
    if (w.buckets.lifestyle) {
      w.cash = money(w.cash + w.buckets.lifestyle);
      delete w.buckets.lifestyle;
    }
    if (w.invested && w.invested.lifestyle) delete w.invested.lifestyle;
    CATS.forEach(function (k) {
      w.buckets[k] = money(w.buckets[k]);
      w.invested[k] = money(w.invested[k]);
    });
    w.pulled = w.pulled || { salary: 0, prize: 0, other: 0 };
    w.notes = Array.isArray(w.notes) ? w.notes : [];
    return w;
  }

  function prizeNow(state) {
    var e = state.career && state.career.earnings ? state.career.earnings : { salary: 0, prize: 0, other: 0 };
    var se = state.season && state.season.earnings;
    var prize = e.prize || 0;
    var ph = state.season && state.season.phase;
    if (se && (ph === 'preseason' || ph === 'competition')) prize += se.prize || 0;
    return prize;
  }

  function pull(state) {
    var w = init(state);
    var e = state.career && state.career.earnings ? state.career.earnings : { salary: 0, prize: 0, other: 0 };
    var salary = e.salary || 0;
    var prize = prizeNow(state);
    var other = e.other || 0;
    var ds = salary - (w.pulled.salary || 0);
    var dp = prize - (w.pulled.prize || 0);
    var dOther = other - (w.pulled.other || 0);
    if (ds) w.cash = money(w.cash + ds);
    if (dp) w.cash = money(w.cash + dp);
    if (dOther) w.cash = money(w.cash + dOther);
    w.pulled = { salary: salary, prize: prize, other: other };
    return w;
  }

  function investedTotal(w) {
    var n = 0;
    CATS.forEach(function (k) { n += money(w.invested[k]); });
    return n;
  }

  function bucketsTotal(w) {
    var n = 0;
    CATS.forEach(function (k) { n += money(w.buckets[k]); });
    return n;
  }

  function netWorth(state) {
    var w = pull(state);
    return money(w.cash + bucketsTotal(w));
  }

  function careerEarnings(state) {
    var e = state.career && state.career.earnings;
    if (!e) return 0;
    return money((e.salary || 0) + (e.prize || 0) + (e.other || 0));
  }

  function amounts(state) {
    var cash = pull(state).cash;
    var list = (DCS.data.WEALTH_AMOUNTS || [25000, 100000, 250000]).filter(function (n) { return n <= cash; });
    if (cash >= 10000 && list.indexOf(cash) < 0 && cash < 25000) list.push(cash);
    return list;
  }

  function recordSwing(w, cat, delta) {
    if (!delta) return;
    if (delta > 0 && (!w.best || delta > w.best.delta)) w.best = { cat: cat, delta: delta };
    if (delta < 0 && (!w.worst || delta < w.worst.delta)) w.worst = { cat: cat, delta: delta };
  }

  function growthFor(cat, r, state, climate) {
    var rep = (state.player && state.player.reputation) || 0;
    var ti = state.career && state.career.tiWon > 0;
    var g = 0;
    var note = '';
    if (cat === 'funds') {
      g = r.gauss(0.035, 0.028, -0.07, 0.11);
      if (climate === 'recession') g -= r.range(0.04, 0.10);
      note = g >= 0 ? 'Los fondos avanzan con calma.' : 'Un año flojo en mercados.';
    } else if (cat === 'realEstate') {
      g = r.gauss(0.015, 0.055, -0.15, 0.14);
      if (climate === 'housing') g += r.range(0.04, 0.10);
      if (climate === 'recession') g -= r.range(0.03, 0.09);
      note = g >= 0 ? 'Las propiedades se revalorizan.' : 'El ladrillo se enfría.';
      if (r.chance(0.12)) { g -= r.range(0.04, 0.12); note = 'Una reparación o vacante golpea la rentabilidad.'; }
    } else if (cat === 'tech') {
      var roll = r.float();
      if (roll < 0.22) { g = r.range(-0.85, -0.35); note = 'Una startup se hunde.'; }
      else if (roll < 0.72) { g = r.gauss(0.02, 0.12, -0.22, 0.28); note = 'Avance irregular en tecnología.'; }
      else if (roll < 0.97) { g = r.range(0.22, 0.85); note = 'Ronda con buena valoración.'; }
      else { g = r.range(1.6, 4.0); note = 'Una adquisición cambia el tablero.'; }
      if (climate === 'techBoom' && g > -0.2) g += r.range(0.08, 0.22);
    } else if (cat === 'esports') {
      var boost = U.clamp(rep / 220, 0, 0.12) + (ti ? 0.04 : 0);
      var er = r.float();
      if (er < 0.16) { g = r.range(-0.55, -0.12); note = 'El proyecto gaming no despega.'; }
      else if (er < 0.70) { g = r.gauss(0.03 + boost, 0.10, -0.18, 0.32); note = 'El sector se mueve sin claridad.'; }
      else { g = r.range(0.18 + boost, 0.95 + boost); note = 'Una org da un salto de visibilidad.'; }
      if (climate === 'esportsBoom' && g > 0) g += r.range(0.06, 0.18);
    } else {
      var b = 0.015 + U.clamp(rep / 180, 0, 0.08) + (ti ? 0.03 : 0);
      g = r.gauss(b, 0.08, -0.20, 0.28);
      note = g >= 0 ? 'Tu marca tira del negocio.' : 'El proyecto personal pide más de lo que da.';
    }
    return { g: g, note: note };
  }

  function rent(cat, value, r) {
    if (cat !== 'realEstate' || value < 20000) return 0;
    return money(value * r.range(0.008, 0.022));
  }

  function pickClimate(state) {
    var r = rng(state, 'CLIMATE|' + state.year);
    if (!r.chance(0.10)) return null;
    var list = DCS.data.WEALTH_CLIMATE || [];
    if (!list.length) return null;
    var c = list[Math.floor(r.float() * list.length)];
    return { id: c.id, year: state.year, title: c.title, note: c.note };
  }

  function closeYear(state) {
    var w = pull(state);
    if (w.tickedYear === state.year) return w.lastTick;
    var before = money(w.cash + bucketsTotal(w));
    var r0 = rng(state, 'YEAR|' + state.year);
    var climate = pickClimate(state);
    w.climate = climate;
    var notes = [];
    if (climate) notes.push(climate.title + ': ' + climate.note);
    var cid = climate && climate.id;
    var rentIn = 0;
    CATS.forEach(function (cat, i) {
      var start = money(w.buckets[cat]);
      if (!start) return;
      var r = rng(state, 'YEAR|' + state.year + '|' + cat + '|' + i);
      var out = growthFor(cat, r, state, cid);
      var end = money(start * (1 + out.g));
      var delta = end - start;
      w.buckets[cat] = end;
      recordSwing(w, cat, delta);
      rentIn += rent(cat, end, r);
      if (Math.abs(delta) >= 8000 || (start >= 40000 && Math.abs(out.g) >= 0.12)) {
        notes.push(catMeta(cat).name + ': ' + out.note);
      }
    });
    if (rentIn) {
      w.cash = money(w.cash + rentIn);
      notes.push('Rentas inmobiliarias: +' + rentIn);
    }
    var after = money(w.cash + bucketsTotal(w));
    var tick = { year: state.year, notes: notes, climate: climate, rent: rentIn,
      startNet: before, endNet: after, variation: after - before };
    w.lastTick = tick;
    w.tickedYear = state.year;
    w.notes = (w.notes || []).concat(notes).slice(-24);
    return tick;
  }

  function invest(state, cat, amount) {
    pull(state);
    var w = state.wealth;
    amount = money(amount);
    if (CATS.indexOf(cat) < 0) return { ok: false, reason: 'Categoría no válida.' };
    if (amount < 10000) return { ok: false, reason: 'La cantidad es demasiado pequeña.' };
    if (amount > w.cash) return { ok: false, reason: 'No tienes efectivo suficiente.' };
    w.cash = money(w.cash - amount);
    w.buckets[cat] = money(w.buckets[cat] + amount);
    w.invested[cat] = money(w.invested[cat] + amount);
    return { ok: true, cat: cat, amount: amount, name: catMeta(cat).name };
  }

  function withdraw(state, cat, amount) {
    var w=pull(state); amount=money(amount);
    if(CATS.indexOf(cat)<0||!amount||amount>w.buckets[cat])return{ok:false,reason:'Cantidad no disponible.'};
    if(cat==='tech')return{ok:false,reason:'La tecnología no tiene salida inmediata.'};
    var fee=cat==='funds'?.02:(cat==='realEstate'?.06:.10),proceeds=money(amount*(1-fee));
    w.buckets[cat]=money(w.buckets[cat]-amount);w.cash=money(w.cash+proceeds);return{ok:true,name:catMeta(cat).name,proceeds:proceeds};
  }

  function luxury(state, amount) {
    var w=pull(state);amount=money(amount);
    if(amount<10000||amount>w.cash)return{ok:false,reason:'No tienes efectivo suficiente.'};
    w.cash=money(w.cash-amount);w.luxurySpent=money((w.luxurySpent||0)+amount);
    state.player.morale=U.clamp(state.player.morale+Math.min(8,2+amount/50000),0,100);
    state.player.reputation=U.clamp(state.player.reputation+Math.min(2,amount/125000),0,100);
    w.notes.push('Estilo de vida: -'+amount+'; recuperas moral y visibilidad.');return{ok:true,amount:amount};
  }

  function maybeSpecial(state) {
    var w = pull(state);
    if (state.pending) return null;
    if (w.specialYear === state.year) return null;
    if (w.cash < 40000) return null;
    var r = rng(state, 'SPEC|' + state.year);
    if (!r.chance(0.12)) { w.specialYear = state.year; return null; }
    var p = state.player || {};
    var ti = state.career && state.career.tiWon > 0;
    var kinds = [
      { id: 'startup', cat: 'tech', title: 'Una startup gaming te abre la puerta',
        text: 'Un antiguo compañero te propone entrar con parte de tu liquidez. No hay cifras de retorno. Solo el riesgo.' },
      { id: 'org', cat: 'esports', title: 'Una org busca capital',
        text: 'Una organización quiere que entres como inversor silencioso. Tu nombre abre puertas; el resultado no está escrito.' }
    ];
    if ((p.reputation || 0) >= 55 || (p.proYears || 0) >= 6) {
      kinds.push({ id: 'academy', cat: 'business', title: 'Te proponen montar una academia',
        text: 'Usarían tu nombre. Tú pondrías el dinero. El resto es trabajo y reputación.' });
    }
    if (ti) {
      kinds.push({ id: 'tiDeal', cat: 'esports', title: 'Oferta tras The International',
        text: 'Ganar TI abre cheques. Esta vez te piden que pongas tú también fichas sobre la mesa.' });
    }
    var k = kinds[Math.floor(r.float() * kinds.length)];
    var caps = [80000, 150000, 250000].filter(function (n) { return n <= w.cash; });
    if (!caps.length) caps = [money(Math.min(w.cash, 40000))];
    var amount = caps[Math.floor(r.float() * caps.length)];
    w.specialYear = state.year;
    return {
      type: 'wealth',
      title: k.title,
      text: k.text,
      cat: k.cat,
      amount: amount,
      catName: catMeta(k.cat).name
    };
  }

  function resolveSpecial(state, accept) {
    var pend = state.pending;
    state.pending = null;
    if (!pend || pend.type !== 'wealth') return { ok: false };
    if (!accept) return { ok: true, invested: false, text: 'Conservas la liquidez.' };
    var out = invest(state, pend.cat, pend.amount);
    if (!out.ok) return { ok: false, reason: out.reason };
    return { ok: true, invested: true, text: 'Has puesto ' + pend.amount + ' en ' + pend.catName + '.' };
  }

  function snapshot(state) {
    var w = pull(state);
    var buckets = CATS.map(function (id) {
      var m = catMeta(id);
      return {
        id: id, name: m.name, risk: m.risk, potential: m.potential, blurb: m.blurb,
        value: w.buckets[id], put: w.invested[id]
      };
    });
    var put = investedTotal(w);
    var now = bucketsTotal(w);
    return {
      cash: w.cash,
      net: money(w.cash + now),
      earnings: careerEarnings(state),
      buckets: buckets,
      invested: put,
      current: now,
      pnl: now - put,
      climate: w.climate,
      lastTick: w.lastTick,
      best: w.best,
      worst: w.worst,
      amounts: amounts(state),
      luxurySpent: money(w.luxurySpent||0)
    };
  }

  function classify(state) {
    var snap = snapshot(state);
    var nw = snap.net;
    var pnl = snap.pnl;
    var scene = 0;
    snap.buckets.forEach(function (b) {
      if (b.id === 'business' || b.id === 'esports') scene += b.value;
    });
    if (nw < 35000) return { name: 'Lo gastaste todo', desc: 'El dinero pasó por tus manos y no se quedó.' };
    if (pnl < -200000 && nw < 400000) return { name: 'Mala racha inversora', desc: 'La carrera dio para vivir; las apuestas no.' };
    if (nw < 220000) return { name: 'Vida cómoda', desc: 'Suficiente para no mirar atrás con miedo.' };
    if (scene > nw * 0.45 && nw >= 1200000) {
      return { name: 'Magnate del esports', desc: 'Construiste un negocio alrededor del juego.' };
    }
    if (pnl > 400000 && nw >= 800000) return { name: 'Inversor inteligente', desc: 'Hiciste trabajar al dinero, no solo al ranking.' };
    if (nw < 2500000) return { name: 'Empresario exitoso', desc: 'Patrimonio sólido, más allá de los premios.' };
    return { name: 'Imperio financiero', desc: 'Lo que ganaste en el servidor fue solo el principio.' };
  }

  function attachLegacy(state, legacy) {
    var snap = snapshot(state);
    var cls = classify(state);
    legacy.finance = {
      earnings: snap.earnings,
      cash: snap.cash,
      investments: snap.current,
      netWorth: snap.net,
      invested: snap.invested,
      pnl: snap.pnl,
      best: snap.best,
      worst: snap.worst,
      category: cls.name,
      categoryDesc: cls.desc
    };
    return legacy;
  }

  DCS.engine.finance = {
    init: init,
    pull: pull,
    invest: invest,
    withdraw: withdraw,
    luxury: luxury,
    closeYear: closeYear,
    maybeSpecial: maybeSpecial,
    resolveSpecial: resolveSpecial,
    snapshot: snapshot,
    netWorth: netWorth,
    amounts: amounts,
    classify: classify,
    attachLegacy: attachLegacy,
    cats: CATS
  };
})(window.DCS = window.DCS || {});
