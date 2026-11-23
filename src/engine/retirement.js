/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   ENGINE / RETIREMENT — retirada anticipada y legado
   ------------------------------------------------------------
   La retirada no depende solo de la edad: una carrera colapsada
   a los 24 también puede llegar a su final. Pero la propuesta
   siempre se puede rechazar y seguir intentándolo.
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;

  function lastRatings(state, n) {
    var out = [];
    for (var i = state.history.length - 1; i >= 0 && out.length < n; i--) {
      out.push(state.history[i].rating);
    }
    return out;
  }

  /** Devuelve una propuesta de retirada o null. */
  function evaluate(state, rng) {
    var p = state.player;
    if (p.age >= 38) return null;               /* lo gestiona el fin de año */
    if (p.age < 20) return null;                /* con 19 años nadie tira la toalla */
    if (state.career.lastRetirementPrompt && state.year - state.career.lastRetirementPrompt < 2) return null;

    var score = 0;
    var reasons = [];

    if (p.age >= 33) { score += (p.age - 32) * 1.3; reasons.push('Tienes ' + p.age + ' años.'); }
    else if (p.age >= 30) { score += 0.8; }

    var rs = lastRatings(state, 3);
    var bad = 0;
    rs.forEach(function (r) { if (r === null || r < 56) bad++; });
    if (bad >= 2) { score += bad * 1.6; reasons.push('Encadenas ' + bad + ' temporadas por debajo de tu nivel.'); }

    if (p.seasonsWithoutTeam >= 1) {
      score += p.seasonsWithoutTeam * 2.6;
      reasons.push(p.seasonsWithoutTeam === 1 ? 'Llevas un año sin equipo.' : 'Llevas ' + p.seasonsWithoutTeam + ' años sin equipo.');
    }
    if (!p.teamId && p.age >= 24) { score += 1.5; }

    var drop = p.peakOverall - p.overall;
    if (drop >= 7) { score += drop * 0.32; reasons.push('Tu nivel ha caído claramente desde tu mejor momento.'); }

    if (p.morale < 38) { score += 2; reasons.push('La motivación está por los suelos.'); }
    if (p.reputation < 12 && p.age >= 22) { score += 1.6; reasons.push('El circuito casi ha dejado de contar contigo.'); }

    var lastTier = null;
    for (var i = state.history.length - 1; i >= 0; i--) { if (state.history[i].tier) { lastTier = state.history[i].tier; break; } }
    var bestTier = 3;
    state.history.forEach(function (h) { if (h.tier && h.tier < bestTier) bestTier = h.tier; });
    if (lastTier && lastTier > bestTier) { score += (lastTier - bestTier) * 1.4; reasons.push('Has bajado de Tier respecto a tu mejor etapa.'); }

    /* A los veinti pocos hace falta un desastre real para plantearse dejarlo */
    if (p.age < 24) score *= 0.6;
    else if (p.age < 27) score *= 0.85;

    if (score < 6) return null;
    if (!rng.chance(U.clamp((score - 5) / 8, 0.12, 0.9))) return null;

    state.career.lastRetirementPrompt = state.year;
    return {
      age: p.age,
      score: Math.round(score * 10) / 10,
      reasons: reasons,
      text: 'Han pasado los años y el juego ya no te devuelve lo mismo. Nadie te va a decir cuándo parar.'
    };
  }

  /* --------------------------------------------------------
     LEGADO
     -------------------------------------------------------- */
  function bigTitles(state) {
    var n = 0, list = [];
    state.history.forEach(function (h) {
      h.tournaments.forEach(function (t) {
        if (t.placement === 1 && t.kind !== 'qualifier') {
          if (t.prestige >= 6) { n++; list.push(h.year + ' · ' + t.name); }
        }
      });
    });
    return { count: n, list: list };
  }

  function findPrime(state) {
    var h = state.history.filter(function (x) { return x.rating !== null; });
    if (h.length < 2) return h.length ? { from: h[0].year, to: h[0].year, avg: h[0].rating } : null;
    var best = null;
    for (var i = 0; i < h.length; i++) {
      for (var len = 2; len <= 5 && i + len <= h.length; len++) {
        var slice = h.slice(i, i + len);
        var avg = U.avg(slice, function (x) { return x.rating; });
        var scoreW = avg + len * 1.4;
        if (!best || scoreW > best.scoreW) {
          best = { from: slice[0].year, to: slice[slice.length - 1].year, avg: Math.round(avg), scoreW: scoreW };
        }
      }
    }
    return best;
  }

  function mainTeam(state) {
    var map = {};
    state.history.forEach(function (h) {
      h.stints.forEach(function (s) {
        if (!map[s.teamId]) map[s.teamId] = { name: s.teamName, seasons: 0, maps: 0, tier: s.tier, best: 0 };
        map[s.teamId].seasons++;
        map[s.teamId].maps += s.acc.maps;
        if (s.tier && s.tier < map[s.teamId].tier) map[s.teamId].tier = s.tier;
      });
      h.tournaments.forEach(function (t) {
        if (map[t.teamId]) {
          var q = DCS.engine.performance.tournamentQuality(t);
          if (q > map[t.teamId].best) map[t.teamId].best = q;
        }
      });
    });
    var best = null;
    for (var k in map) {
      var v = map[k];
      var w = v.seasons * 2 + v.best * 6 + (4 - (v.tier || 3));
      if (!best || w > best.w) best = { id: k, name: v.name, seasons: v.seasons, maps: v.maps, w: w };
    }
    return best;
  }

  /* Las categorías altas exigen logros reales, no solo puntuación:
     se puede ser leyenda sin ganar TI, pero no sin ganar nada.     */
  var CATEGORIES = [
    {
      /* GOAT exige dominio sostenido, no un solo pico de forma: haber
         ganado TI y además haberlo disputado más de una vez (o, en su
         defecto, una cosecha de títulos grandes realmente enorme). */
      min: 92, name: 'Candidato a GOAT', gate: function (x) { return x.tiWon >= 1 && (x.tiPlayed >= 2 || x.bigTitles >= 7); },
      desc: 'Cuando se discuta quién fue el mejor de la historia, tu nombre estará en la conversación.'
    },
    {
      min: 86, name: 'Leyenda de Dota', gate: function (x) { return x.tiWon >= 1 || x.bigTitles >= 3; },
      desc: 'Tu carrera es parte del canon competitivo. Se te recordará mientras exista el juego.'
    },
    {
      min: 66, name: 'Superestrella', gate: function (x) { return x.bigTitles >= 1 || x.tiPlayed >= 1 || x.t1Years >= 4; },
      desc: 'Fuiste una de las grandes referencias mundiales de tu posición.'
    },
    {
      min: 55, name: 'Campeón', gate: function (x) { return x.titles >= 1; },
      desc: 'Levantaste trofeos que muy poca gente llega a tocar.'
    },
    {
      min: 46, name: 'Estrella internacional', gate: function (x) { return x.t1Years >= 1 || x.tiPlayed >= 1 || x.bigTitles >= 1; },
      desc: 'Competiste de tú a tú con los mejores del mundo durante años.'
    },
    { min: 38, name: 'Veterano respetado', desc: 'Una carrera larga y digna en la élite regional, con algún salto internacional.' },
    { min: 29, name: 'Journeyman', desc: 'Muchos equipos, muchos años, mucha carretera. Siempre encontraste dónde jugar.' },
    { min: 20, name: 'Profesional regional', desc: 'Viviste del juego dentro de tu región, sin llegar a dar el salto grande.' },
    { min: 9, name: 'Jugador de Tier 3', desc: 'Estuviste dentro del circuito, pero nunca cruzaste la puerta.' },
    { min: 0, name: 'Promesa que nunca explotó', desc: 'Talento, ilusión y un final anticipado. Le pasa a la mayoría.' }
  ];

  function computeLegacy(state, reason) {
    var p = state.player;
    var c = state.career;
    var bt = bigTitles(state);
    var prime = findPrime(state);
    var team = mainTeam(state);
    var wr = c.maps ? c.wins / c.maps : 0;
    var t1Years = p.tierYears[1] || 0;
    var totalEarn = c.earnings.salary + c.earnings.prize + c.earnings.other;
    var snap = DCS.engine.finance.snapshot(state);

    var score = 0;
    score += U.norm(c.bestRating || 0, 40, 92) * 30;
    score += U.norm(p.peakOverall, 42, 90) * 20;
    score += Math.min(12, t1Years) * 1.3;
    score += Math.min(8, bt.count) * 3.0;
    score += Math.min(5, c.tiPlayed) * 2.0;
    score += Math.min(3, c.tiWon) * 9;
    score += U.norm(c.peakReputation || p.reputation, 10, 85) * 8;
    score += U.clamp((wr - 0.5) * 26, -4, 5);
    score += Math.min(5, totalEarn / 3000000) * 1.0;
    score += Math.min(14, p.proYears) * 0.55;
    if (p.proYears < 3) score -= 10;

    score = U.clamp(score, 0, 110);

    var gateCtx = {
      tiWon: c.tiWon, tiPlayed: c.tiPlayed, bigTitles: bt.count,
      titles: c.titles, t1Years: t1Years
    };
    var cat = CATEGORIES[CATEGORIES.length - 1];
    for (var i = 0; i < CATEGORIES.length; i++) {
      if (score >= CATEGORIES[i].min && (!CATEGORIES[i].gate || CATEGORIES[i].gate(gateCtx))) {
        cat = CATEGORIES[i];
        break;
      }
    }
    /* matices que el número no capta */
    if (p.age <= 23 && p.proYears <= 4 && score < 40) {
      cat = { name: 'Promesa que nunca explotó', desc: 'Te retiraste antes de descubrir hasta dónde podías llegar.' };
    } else if (p.proYears <= 4 && score < 29) {
      cat = { name: 'Carrera corta', desc: 'Pasaste por el circuito y te fuiste antes de dejar huella.' };
    }

    var achievements = [];
    if (c.tiWon > 0) achievements.push('Campeón de The International (' + c.tiWon + ')');
    if (c.tiPlayed > 0) achievements.push('Participaciones en The International: ' + c.tiPlayed);
    if (bt.count) achievements.push('Títulos de prestigio: ' + bt.count);
    if (c.titles) achievements.push('Torneos ganados: ' + c.titles);
    if (t1Years) achievements.push('Temporadas en Tier 1: ' + t1Years);
    if (c.bestRating) achievements.push('Mejor rating de temporada: ' + c.bestRating + ' (' + c.bestSeason + ')');
    achievements.push('MMR máximo: ' + DCS.ui.fmt.mmr(p.peakMmr));

    return {
      reason: reason,
      retireAge: p.age,
      proYears: p.proYears,
      score: Math.round(score),
      category: cat.name,
      categoryDesc: cat.desc,
      prime: prime,
      mainTeam: team,
      bigTitles: bt,
      achievements: achievements,
      teams: p.teamsPlayed.length,
      winrate: wr,
      netWorth: snap.net,
      topAssets: snap.buckets.slice().sort(function (a, b) { return b.value - a.value; }).filter(function (a) { return a.value > 0; }).slice(0, 3).map(function (a) { return { name: a.name, value: a.value }; })
    };
  }

  function retire(state, reason) {
    var p = state.player;
    p.status = 'retired';
    state.finished = true;
    state.legacy = computeLegacy(state, reason);
    DCS.engine.finance.attachLegacy(state, state.legacy);
    state.pending = null;
    return state.legacy;
  }

  DCS.engine = DCS.engine || {};
  DCS.engine.retirement = {
    evaluate: evaluate,
    retire: retire,
    computeLegacy: computeLegacy,
    findPrime: findPrime,
    bigTitles: bigTitles
  };
})(window.DCS = window.DCS || {});
