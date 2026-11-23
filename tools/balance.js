/* ============================================================
   TOOLS / BALANCE — simulación masiva de carreras
   ------------------------------------------------------------
   Ejecuta N carreras completas con un jugador automático para
   comprobar que los resultados son DIVERSOS: que existan carreras
   malas, medias, buenas, élite y legendarias.
   No toca la partida guardada del usuario (anula el guardado).
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util, D = DCS.data;

  /* --- el guardado se desactiva: esta herramienta no debe tocar tu carrera --- */
  DCS.store.setSilent(true);

  function autoOffer(state, rng) {
    var offers = state.offers || [];
    if (!offers.length) return;
    var best = null, bestScore = -1e9;
    offers.forEach(function (o) {
      var s = (4 - o.tier) * 22 + o.rosterLevel * 0.8 + o.salary / 20000 + (o.isRenewal ? 4 : 0);
      if (o.role !== state.player.role) s -= 14;
      if (s > bestScore) { bestScore = s; best = o; }
    });
    /* a veces se rechaza todo, como haría un jugador real */
    if (rng.chance(0.12)) { state.offers = []; return; }
    DCS.engine.market.acceptOffer(state, best);
    state.offers = [];
  }

  function runCareer(opts) {
    var seed = DCS.rng.newSeed();
    var roles = D.ROLE_LIST, archs = D.ARCHETYPE_LIST;
    var tmp = new DCS.rng.Rng(seed, 999999);
    var state = DCS.store.newState({
      seed: seed,
      name: 'Auto Player',
      nick: 'auto' + Math.floor(tmp.float() * 9999),
      nationality: 'Rusia',
      region: opts && opts.region ? opts.region : D.REGION_LIST[Math.floor(tmp.float() * D.REGION_LIST.length)],
      role: opts && opts.role ? opts.role : roles[Math.floor(tmp.float() * roles.length)],
      archetype: opts && opts.archetype ? opts.archetype : archs[Math.floor(tmp.float() * archs.length)]
    });
    DCS.game.state = state;

    var rng = DCS.runtime.get();
    var guard = 0;

    while (!state.finished && guard++ < 400) {
      if (state.pending) {
        if (state.pending.type === 'event') {
          var ev = DCS.engine.season.findUnresolvedEvent(state);
          var idx = ev && ev.options.length ? Math.floor(rng.float() * ev.options.length) : 0;
          DCS.engine.season.resolvePendingEvent(state, idx);
        } else if (state.pending.type === 'retirement') {
          var d = state.pending.data;
          var age = state.player.age;
          var accept = age >= 33 ? rng.chance(0.75) : (age >= 28 ? rng.chance(0.40) : rng.chance(0.15));
          state.pending = null;
          if (accept) DCS.engine.retirement.retire(state, 'choice');
          else state.career.lastRetirementPrompt = state.year;
        } else if (state.pending.type === 'tournament') {
          /* Torneo en vivo: simularlo entero de golpe (equivale al botón
             "Simular torneo"), y cuando termine, continuar el calendario
             (equivale al botón "Continuar"). Sin esto el bucle se queda
             congelado en el mismo pending para siempre. */
          var live = state.season && state.season.liveTour;
          if (live && live.done) DCS.engine.season.continueCompetition(state);
          else if (live) DCS.engine.season.playLive(state, true);
          else state.pending = null;
        } else {
          state.pending = null;
        }
        continue;
      }
      var phase = state.season ? state.season.phase : null;
      DCS.engine.season.advance(state);
      if (phase === 'market') autoOffer(state, rng);
    }

    if (!state.finished) DCS.engine.retirement.retire(state, 'timeout');

    /* El desglose serie a serie tiene que cuadrar con los totales del torneo */
    var logIssues = 0;
    state.history.forEach(function (h) {
      h.tournaments.forEach(function (t) {
        if (!t.log) { logIssues++; return; }
        if (t.log.length !== t.seriesPlayed) logIssues++;
        var mw = 0, ml = 0;
        t.log.forEach(function (sr) {
          mw += sr.w; ml += sr.l;
          if ((sr.maps || '').length !== sr.w + sr.l) logIssues++;
        });
        if (mw !== t.wins || ml !== t.losses) logIssues++;
      });
    });

    var l = state.legacy;
    var cr = state.career;
    var bestTier = 3;
    state.history.forEach(function (h) { if (h.tier && h.tier < bestTier) bestTier = h.tier; });

    return {
      seed: seed,
      role: state.player.role,
      arch: state.player.archetype,
      potential: state.player.potential,
      peakOverall: state.player.peakOverall,
      bestRating: cr.bestRating,
      retireAge: l.retireAge,
      proYears: l.proYears,
      bestTier: state.history.some(function (h) { return h.tier; }) ? bestTier : null,
      t1Years: state.player.tierYears[1] || 0,
      maps: cr.maps,
      wins: cr.wins,
      losses: cr.losses,
      titles: cr.titles,
      bigTitles: l.bigTitles.count,
      tiPlayed: cr.tiPlayed,
      tiWon: cr.tiWon,
      earnings: cr.earnings.salary + cr.earnings.prize + cr.earnings.other,
      category: l.category,
      score: l.score,
      logIssues: logIssues
    };
  }

  function summarize(rows) {
    var n = rows.length;
    var byCat = {};
    var byRole = {};
    rows.forEach(function (r) {
      byCat[r.category] = (byCat[r.category] || 0) + 1;
      if (!byRole[r.role]) byRole[r.role] = { n: 0, rating: 0, ti: 0 };
      byRole[r.role].n++;
      byRole[r.role].rating += r.bestRating || 0;
      byRole[r.role].ti += r.tiPlayed > 0 ? 1 : 0;
    });

    var pctOf = function (fn) { return rows.filter(fn).length / n; };
    var mean = function (fn) { return U.avg(rows, fn); };

    return {
      n: n,
      categories: byCat,
      roles: byRole,
      reachedT1: pctOf(function (r) { return r.bestTier === 1; }),
      reachedT2: pctOf(function (r) { return r.bestTier === 2; }),
      stuckT3: pctOf(function (r) { return r.bestTier === 3; }),
      neverPro: pctOf(function (r) { return r.bestTier === null; }),
      playedTi: pctOf(function (r) { return r.tiPlayed > 0; }),
      wonTi: pctOf(function (r) { return r.tiWon > 0; }),
      anyTitle: pctOf(function (r) { return r.titles > 0; }),
      bigTitle: pctOf(function (r) { return r.bigTitles > 0; }),
      rating90: pctOf(function (r) { return (r.bestRating || 0) >= 90; }),
      rating80: pctOf(function (r) { return (r.bestRating || 0) >= 80; }),
      rating70: pctOf(function (r) { return (r.bestRating || 0) >= 70; }),
      retiredEarly: pctOf(function (r) { return r.retireAge < 28; }),
      reached38: pctOf(function (r) { return r.retireAge >= 38; }),
      avgRetireAge: mean(function (r) { return r.retireAge; }),
      avgProYears: mean(function (r) { return r.proYears; }),
      avgBestRating: mean(function (r) { return r.bestRating || 0; }),
      avgMaps: mean(function (r) { return r.maps; }),
      avgEarnings: mean(function (r) { return r.earnings; }),
      integrity: checkIntegrity(rows)
    };
  }

  /* Validaciones duras (§43) */
  function checkIntegrity(rows) {
    var problems = [];
    rows.forEach(function (r, i) {
      if (r.wins + r.losses !== r.maps) problems.push('#' + i + ' victorias+derrotas != mapas');
      if (r.maps < 0 || r.wins < 0 || r.losses < 0) problems.push('#' + i + ' estadística negativa');
      if (r.retireAge > 38) problems.push('#' + i + ' se retira con ' + r.retireAge);
      if (r.tiWon > r.tiPlayed) problems.push('#' + i + ' gana más TI de los que juega');
      if (r.bestRating !== null && (r.bestRating < 0 || r.bestRating > 100)) problems.push('#' + i + ' rating fuera de rango');
      if (r.logIssues) problems.push('#' + i + ' el desglose de series no cuadra con el torneo (' + r.logIssues + ')');
    });
    return problems;
  }

  DCS.balance = {
    runCareer: runCareer,
    summarize: summarize,
    restoreSave: function () { DCS.store.setSilent(false); }
  };
})(window.DCS = window.DCS || {});
