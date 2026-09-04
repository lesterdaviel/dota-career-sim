/* ============================================================
   ENGINE / PLAYER — creación, valoración y nivel efectivo
   ------------------------------------------------------------
   El potencial es interno: nunca se muestra su valor. El usuario
   solo recibe opiniones de scouting con ruido, y ese ruido se
   reduce a medida que la carrera avanza.
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;
  var ATTR_KEYS = DCS.data.ATTR_KEYS;

  /* Bandas de potencial. Deliberadamente sesgadas hacia abajo:
     la mayoría de los aspirantes no tienen techo de Tier 1.      */
  function rollPotential(rng) {
    var r = rng.float();
    if (r < 0.32) return rng.range(50, 65);
    if (r < 0.64) return rng.range(65, 76);
    if (r < 0.86) return rng.range(76, 85);
    if (r < 0.965) return rng.range(85, 92);
    return rng.range(92, 99);
  }

  function createPlayer(opts, rng) {
    var role = DCS.data.ROLES[opts.role];
    var arch = DCS.data.ARCHETYPES[opts.archetype];

    var potential = U.clamp(rollPotential(rng) + arch.ceilingBonus, 45, 99);

    /* Techo individual por atributo: el potencial global se reparte
       según el sesgo del rol y del arquetipo, con dispersión propia. */
    var caps = {};
    ATTR_KEYS.forEach(function (k) {
      var bias = (role.growthBias[k] - 1) * 20 + (arch.growth[k] - 1) * 14;
      caps[k] = U.clamp(Math.round(potential + bias + rng.gauss(0, 5.5)), 30, 99);
    });

    /* Atributos a los 16: bajos, incompletos y solo levemente
       correlacionados con el potencial (una joya puede no parecerlo). */
    var attrs = {};
    ATTR_KEYS.forEach(function (k) {
      var v = rng.gauss(27, 5.2) + (arch.attr[k] || 0) * 0.9 + (potential - 70) * 0.11 +
        (role.growthBias[k] - 1) * 8;
      attrs[k] = U.clamp(Math.round(v), 8, Math.max(12, caps[k] - 4));
    });

    var player = {
      name: opts.name,
      nick: opts.nick,
      nationality: opts.nationality,
      region: opts.region,
      homeRegion: opts.region,
      role: opts.role,
      archetype: opts.archetype,
      age: 16,
      attrs: attrs,

      /* --- ocultos --- */
      caps: caps,
      potential: Math.round(potential),
      growth: U.clamp(rng.gauss(1.0, 0.17), 0.62, 1.48),
      /* Cuánto de ese techo llegará a materializarse de verdad.
         Tener potencial de élite no garantiza nada: hay carreras
         que se quedan a medio camino sin que nadie sepa por qué. */
      realization: U.clamp(rng.gauss(0.945, 0.07), 0.70, 1.04),
      peakAge: U.clamp(rng.gaussInt(25, 2.5), 21, 30),
      declineDelay: rng.int(1, 5),
      variance: arch.variance,
      slumpResist: arch.slumpResist,

      /* --- estado --- */
      form: 50,
      morale: 62,
      reputation: 4,
      experience: 0,
      mmr: 0,
      peakMmr: 0,
      overall: 0,
      peakOverall: 0,
      isCaptain: false,
      trainingFocus: ({
        mechanical: 'mech',
        smart: 'sense',
        aggressive: 'mech',
        consistent: 'cons',
        leader: 'lead'
      })[opts.archetype] || 'balanced',
      trainingMod: 0,

      /* --- situación --- */
      status: 'amateur',      /* amateur | signed | free | retired */
      teamId: null,
      contract: null,
      seasonsWithoutTeam: 0,
      teamChanges: 0,
      proYears: 0,
      tierYears: { 1: 0, 2: 0, 3: 0 },
      teamsPlayed: [],
      flags: {}
    };

    player.overall = overall(player);
    player.peakOverall = player.overall;
    player.mmr = Math.round(targetMmr(player, rng) * 0.92);
    player.peakMmr = player.mmr;
    return player;
  }

  /* Valoración general: NUNCA es una media simple.
     Cada rol pondera los atributos de forma distinta.            */
  function overall(player) {
    var w = DCS.data.ROLES[player.role].weights;
    var total = 0;
    ATTR_KEYS.forEach(function (k) { total += player.attrs[k] * w[k]; });
    return Math.round(U.clamp(total, 1, 99));
  }

  /* MMR: habilidad individual pura. Importa, pero no manda:
     mentalidad, teamplay y consistencia no entran aquí.          */
  function coreSkill(player) {
    var a = player.attrs;
    return 0.44 * a.mech + 0.28 * a.sense + 0.18 * a.pool + 0.10 * a.cons;
  }

  function targetMmr(player, rng) {
    var arch = DCS.data.ARCHETYPES[player.archetype];
    var base = 900 + coreSkill(player) * 106 + arch.mmrBias;
    base += (player.form - 50) * 6;
    if (player.age < 19) base -= (19 - player.age) * 120;
    if (player.age > 30) base -= (player.age - 30) * 90;
    return Math.max(600, base + (rng ? rng.gauss(0, 220) : 0));
  }

  /* Nivel efectivo en competición: lo que realmente rinde hoy.   */
  function effectiveLevel(player, team) {
    var lvl = player.overall;
    lvl += (player.form - 50) * 0.16;
    lvl += (player.morale - 55) * 0.07;
    lvl += Math.min(6, player.experience * 0.035);
    if (team) lvl += (team.synergy - 55) * 0.05;
    if (player.flags && player.flags.provisional) lvl -= 1.5;
    return U.clamp(lvl, 1, 99);
  }

  /* Estimación de scouting: lo que el mundo CREE que puede llegar
     a ser. Con ruido alto de joven y decreciente con la carrera.  */
  function perceivedPotential(player, rng) {
    var certainty = U.clamp((player.age - 15) / 12 + player.experience / 260, 0.12, 0.94);
    var noise = (1 - certainty) * 26;
    var seen = player.potential * certainty + Math.max(player.overall, player.potential * 0.7) * (1 - certainty);
    return U.clamp(seen + (rng ? rng.gauss(0, noise) : 0), 30, 99);
  }

  /* Texto vago para el usuario: nunca la etiqueta interna.        */
  function scoutingOpinion(value) {
    if (value < 58) return 'Perfil discreto';
    if (value < 68) return 'Proyecto a largo plazo';
    if (value < 76) return 'Jugador con recorrido';
    if (value < 84) return 'Talento a seguir';
    if (value < 91) return 'Perfil muy prometedor';
    return 'Talento excepcional';
  }

  DCS.engine = DCS.engine || {};
  DCS.engine.player = {
    createPlayer: createPlayer,
    overall: overall,
    coreSkill: coreSkill,
    targetMmr: targetMmr,
    effectiveLevel: effectiveLevel,
    perceivedPotential: perceivedPotential,
    scoutingOpinion: scoutingOpinion
  };
})(window.DCS = window.DCS || {});
