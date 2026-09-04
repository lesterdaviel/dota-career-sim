/* ============================================================
   ENGINE / MATCH — simulación de mapas y series
   ------------------------------------------------------------
   Nadie tiene la victoria garantizada. La probabilidad nace de
   la diferencia de fuerza entre los dos equipos, se corrige con
   forma, moral, sinergia y meta, y SIEMPRE queda acotada: un
   equipo inferior puede ganar cualquier mapa.
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;

  var FORMATS = {
    bo1: { maps: 1, need: 1 },
    bo2: { maps: 2, need: 2 },
    bo3: { maps: 3, need: 2 },
    bo5: { maps: 5, need: 3 }
  };

  /** probabilidad de ganar un mapa, acotada para evitar determinismo */
  function mapWinProbability(us, them) {
    var p = U.logistic(us - them, 16);
    return U.clamp(p, 0.10, 0.90);
  }

  /**
   * Genera la línea estadística del jugador en un mapa.
   * f = qué tan por encima/debajo de la media compite hoy.
   */
  function statLine(state, rng, level, win, ctx) {
    var p = state.player;
    var role = DCS.data.ROLES[p.role];
    var model = role.statModel;
    var arch = DCS.data.ARCHETYPES[p.archetype];

    var f = U.clamp((level - 55) / 32, -1.35, 1.45);
    /* dispersión individual: los agresivos e inconsistentes oscilan más */
    var varMul = arch.variance * (1.30 - p.attrs.cons / 200) * ((ctx && ctx.varMul) || 1);
    /* rendimiento del equipo en ese mapa arrastra las estadísticas */
    var teamPull = ((ctx && ctx.teamLevel) || level) - level;
    f += U.clamp(teamPull / 90, -0.25, 0.25);

    var line = {};
    for (var k in model) {
      var m = model[k];
      var center;
      if (m.abs !== undefined) center = m.base + m.abs * f;
      else center = m.base * (1 + m.slope * f);
      center += (m.win || 0) * (win ? 1 : -1);
      var v = rng.gauss(center, Math.abs(m.sd) * varMul);
      if (m.min !== undefined) v = Math.max(m.min, v);
      if (m.max !== undefined) v = Math.min(m.max, v);
      line[k] = v;
    }
    return line;
  }

  /**
   * Simula un mapa completo.
   * @returns {win:boolean, line:Object, level:number}
   */
  function simulateMap(state, rng, ctx) {
    var p = state.player;
    var team = ctx.team;
    var teamLevel = ctx.teamLevel;
    var oppLevel = ctx.oppLevel;

    /* el día concreto del jugador: puede desviarse mucho de su nivel */
    var arch = DCS.data.ARCHETYPES[p.archetype];
    var dayVar = 4.2 * arch.variance * (1.25 - p.attrs.cons / 190);
    var level = U.clamp(DCS.engine.player.effectiveLevel(p, team) + rng.gauss(0, dayVar), 1, 99);

    /* el jugador influye en el resultado según el peso de su rol */
    var role = DCS.data.ROLES[p.role];
    var indiv = (level - DCS.engine.player.effectiveLevel(p, team)) * role.impact * 0.55;
    var us = teamLevel + indiv + (ctx.momentum || 0) + rng.gauss(0, 1.6);
    var them = oppLevel + rng.gauss(0, 1.6);

    var pWin = mapWinProbability(us, them);
    var win = rng.chance(pWin);

    return {
      win: win,
      level: level,
      pWin: pWin,
      line: statLine(state, rng, level, win, { teamLevel: teamLevel, varMul: ctx.varMul })
    };
  }

  /**
   * Simula una serie completa (BO1/BO3/BO5) y devuelve el desglose
   * de mapas para que el llamante acumule estadísticas.
   */
  function simulateSeries(state, rng, ctx) {
    var fmt = FORMATS[ctx.format || 'bo3'];
    var mapsWon = 0, mapsLost = 0, momentum = 0;
    var maps = [];

    while (true) {
      var res = simulateMap(state, rng, {
        team: ctx.team,
        teamLevel: ctx.teamLevel,
        oppLevel: ctx.oppLevel,
        momentum: momentum,
        varMul: ctx.varMul
      });
      maps.push(res);
      if (res.win) { mapsWon++; momentum = U.clamp(momentum + 1.1, -2.6, 2.6); }
      else { mapsLost++; momentum = U.clamp(momentum - 1.1, -2.6, 2.6); }

      if (fmt.need === fmt.maps) {                 /* bo2: se juegan todos */
        if (mapsWon + mapsLost >= fmt.maps) break;
      } else if (mapsWon >= fmt.need || mapsLost >= fmt.need) break;
    }

    var won;
    if (ctx.format === 'bo2') won = mapsWon > mapsLost ? true : (mapsWon === mapsLost ? null : false);
    else won = mapsWon > mapsLost;

    return { won: won, mapsWon: mapsWon, mapsLost: mapsLost, maps: maps };
  }

  DCS.engine = DCS.engine || {};
  DCS.engine.match = {
    FORMATS: FORMATS,
    mapWinProbability: mapWinProbability,
    simulateMap: simulateMap,
    simulateSeries: simulateSeries,
    statLine: statLine
  };
})(window.DCS = window.DCS || {});
