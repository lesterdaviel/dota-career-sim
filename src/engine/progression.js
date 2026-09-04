/* ============================================================
   ENGINE / PROGRESSION — desarrollo del jugador
   ------------------------------------------------------------
   Nunca hay "+1 por temporada". El crecimiento nace de la
   distancia al techo oculto, la edad, el rendimiento, la calidad
   del entorno, la moral, el entrenamiento y el azar controlado.
   De ahí salen breakouts, estancamientos, regresiones y declives.
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;
  var ATTR_KEYS = DCS.data.ATTR_KEYS;

  /* Qué atributos dependen de las manos y cuáles de la cabeza */
  var MECH_ATTRS = { mech: 1, pool: 0.6, cons: 0.3 };
  var MIND_ATTRS = { sense: 1, ment: 1, team: 1, adapt: 1, lead: 1, cons: 0.7, pool: 0.4 };

  function mechWeight(k) { return MECH_ATTRS[k] || 0; }
  function mindWeight(k) { return MIND_ATTRS[k] || 0; }

  /* Ventanas de desarrollo por edad (§11).
     Los valores expresan qué fracción de la distancia al techo se
     puede recorrer en un año: alta de joven, residual en el declive. */
  function ageFactorMech(age, peak, delay) {
    if (age <= 20) return 1.00;
    if (age <= 24) return 0.62;
    if (age <= peak) return 0.36;
    if (age <= peak + delay) return 0.16;
    return 0.02;
  }
  function ageFactorMind(age) {
    if (age <= 20) return 0.90;
    if (age <= 24) return 0.76;
    if (age <= 27) return 0.60;
    if (age <= 32) return 0.44;
    return 0.28;
  }

  function declinePressure(player) {
    var start = player.peakAge + player.declineDelay;
    if (player.age <= start) return 0;
    return (player.age - start) * 0.72;
  }

  /**
   * @param ctx { rating, teammateLevel, mapsPlayed, played }
   * @returns { deltas, notes, breakout, slump }
   */
  function develop(state, rng, ctx) {
    var p = state.player;
    var role = DCS.data.ROLES[p.role];
    var arch = DCS.data.ARCHETYPES[p.archetype];
    var notes = [];

    var rating = ctx.rating === null || ctx.rating === undefined ? 48 : ctx.rating;
    var perfMod = 0.62 + (rating / 100) * 0.86;
    if (!ctx.played) perfMod = 0.66;                        /* sin equipo: solo pubs */

    var teamMod = ctx.teammateLevel ? U.clamp(0.86 + (ctx.teammateLevel - 52) / 110, 0.75, 1.25) : 0.86;
    var moraleMod = U.clamp(0.84 + p.morale / 330, 0.74, 1.18);
    var volumeMod = U.clamp(0.80 + (ctx.mapsPlayed || 0) / 200, 0.80, 1.20);
    var trainMod = 1 + (p.trainingMod || 0);

    /* Sucesos de temporada: un salto o un frenazo brusco */
    var youth = U.clamp((24 - p.age) / 8, 0, 1);
    var breakoutChance = 0.055 * (0.45 + youth) * (rating > 68 ? 1.7 : 0.9) * p.growth;
    var slumpChance = 0.075 / arch.slumpResist * (rating < 55 ? 1.6 : 0.85) * (p.morale < 45 ? 1.5 : 1);
    var breakout = rng.chance(breakoutChance);
    var slump = !breakout && rng.chance(slumpChance);

    var eventMul = breakout ? rng.range(2.1, 3.0) : (slump ? rng.range(-0.35, 0.25) : 1);

    var deltas = {};
    var decline = declinePressure(p);

    /* Techo REAL de esta temporada: el potencial es solo un máximo
       teórico. Lo que se materializa depende del entorno, la cabeza
       y un factor personal que el jugador nunca llega a conocer.   */
    var realization = p.realization === undefined ? 0.92 : p.realization;
    var realMod = U.clamp(0.96 +
      (p.morale - 55) / 500 +
      (p.attrs.ment - 50) / 700 +
      ((ctx.teammateLevel || 50) - 52) / 900, 0.90, 1.08);

    ATTR_KEYS.forEach(function (k) {
      var cap = Math.min(99, p.caps[k] * realization * realMod);
      var cur = p.attrs[k];
      var gap = cap - cur;

      var mw = mechWeight(k), dw = mindWeight(k);
      var ageF = (ageFactorMech(p.age, p.peakAge, p.declineDelay) * mw + ageFactorMind(p.age) * dw) /
        Math.max(0.0001, mw + dw);

      var rate = 0.34 * ageF * p.growth * role.growthBias[k] * arch.growth[k] *
        perfMod * teamMod * moraleMod * volumeMod * trainMod * rng.range(0.55, 1.5);

      var d = gap * rate * eventMul;

      /* declive: las manos se van antes que la cabeza */
      if (decline > 0) d -= decline * (0.35 + mw * 0.95) * rng.range(0.4, 1.5);
      /* y hasta en el prime se puede regresar sin jugar */
      if (!ctx.played) d -= rng.range(0.2, 1.6) * (0.4 + mw);

      deltas[k] = d;
    });

    /* Aplicar */
    ATTR_KEYS.forEach(function (k) {
      p.attrs[k] = U.clamp(p.attrs[k] + deltas[k], 3, 99);
    });

    /* Superar (o no alcanzar) las expectativas iniciales */
    if (breakout && rng.chance(0.35)) {
      var up = rng.int(2, 5);
      ATTR_KEYS.forEach(function (k) { p.caps[k] = U.clamp(p.caps[k] + up, 20, 99); });
      p.potential = U.clamp(p.potential + up, 20, 99);
      notes.push('Algo ha cambiado: tu techo ya no parece el mismo.');
    } else if (slump && rng.chance(0.30)) {
      var down = rng.int(1, 4);
      ATTR_KEYS.forEach(function (k) { p.caps[k] = U.clamp(p.caps[k] - down, 15, 99); });
      p.potential = U.clamp(p.potential - down, 15, 99);
    }

    if (breakout) {
      p.morale = U.clamp(p.morale + rng.int(8, 16), 0, 100);
      p.form = U.clamp(p.form + rng.int(6, 14), 0, 100);
      notes.push('Temporada de explosión: todo lo que entrenas cuaja de golpe.');
    }
    if (slump) {
      p.morale = U.clamp(p.morale - rng.int(6, 15), 0, 100);
      p.form = U.clamp(p.form - rng.int(5, 13), 0, 100);
      notes.push('Te has estancado. El trabajo no se traduce en juego.');
    }

    /* Redondeo y valoración general */
    ATTR_KEYS.forEach(function (k) { p.attrs[k] = Math.round(p.attrs[k]); });
    var before = p.overall;
    p.overall = DCS.engine.player.overall(p);
    if (p.overall > p.peakOverall) p.peakOverall = p.overall;

    /* MMR: se mueve hacia su objetivo, no salta */
    var target = DCS.engine.player.targetMmr(p, rng);
    var pull = ctx.played ? 0.5 : 0.62;                      /* sin equipo se grindea más */
    p.mmr = Math.round(U.clamp(p.mmr + (target - p.mmr) * pull + rng.gauss(0, 120), 500, 16000));
    if (p.mmr > p.peakMmr) p.peakMmr = p.mmr;

    p.experience = U.clamp(p.experience + (ctx.mapsPlayed || 0) * 0.09 + (ctx.played ? 2 : 0.4), 0, 200);

    /* Notas de desarrollo para el usuario (sin revelar números ocultos) */
    var sorted = ATTR_KEYS.slice().sort(function (a, b) { return deltas[b] - deltas[a]; });
    var top = sorted[0], bottom = sorted[sorted.length - 1];
    var label = function (k) {
      for (var i = 0; i < DCS.data.ATTRS.length; i++) if (DCS.data.ATTRS[i].key === k) return DCS.data.ATTRS[i].label;
      return k;
    };
    if (deltas[top] > 2.2) notes.push('Progreso claro en ' + label(top).toLowerCase() + '.');
    if (deltas[bottom] < -1.6) notes.push('Retroceso en ' + label(bottom).toLowerCase() + '.');
    if (!notes.length) {
      notes.push(Math.abs(p.overall - before) < 1
        ? 'Temporada plana: ni avances ni retrocesos evidentes.'
        : 'Progresión discreta pero real.');
    }

    return { deltas: deltas, notes: notes, breakout: breakout, slump: slump, overallBefore: before };
  }

  DCS.engine = DCS.engine || {};
  DCS.engine.progression = { develop: develop, declinePressure: declinePressure };
})(window.DCS = window.DCS || {});
