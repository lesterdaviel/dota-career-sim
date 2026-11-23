/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   ENGINE / STATS — acumulación y cierre de estadísticas
   ------------------------------------------------------------
   Regla de oro: se guardan SUMAS por mapa. Los promedios se
   calculan al vuelo. Así victorias+derrotas siempre cuadran con
   los mapas jugados y ningún histórico se sobrescribe.
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;

  function statKeys(role) {
    return Object.keys(DCS.data.ROLES[role].statModel);
  }

  function blank(role) {
    /* keyMaps cuenta en cuántos mapas se registró cada dato: si el
       jugador cambia de posición a mitad de carrera, cada estadística
       se promedia solo sobre los mapas en los que existía.          */
    var acc = { maps: 0, wins: 0, losses: 0, sums: {}, keyMaps: {} };
    statKeys(role).forEach(function (k) { acc.sums[k] = 0; acc.keyMaps[k] = 0; });
    return acc;
  }

  function add(acc, line, win) {
    acc.maps++;
    if (win) acc.wins++; else acc.losses++;
    if (!acc.keyMaps) acc.keyMaps = {};
    for (var k in line) {
      if (acc.sums[k] === undefined) acc.sums[k] = 0;
      if (acc.keyMaps[k] === undefined) acc.keyMaps[k] = 0;
      acc.sums[k] += line[k];
      acc.keyMaps[k]++;
    }
    return acc;
  }

  /** suma dos acumuladores (temporada + temporada, o etapa + etapa) */
  function merge(a, b) {
    if (!a) return b ? clone(b) : null;
    if (!b) return a;
    a.maps += b.maps; a.wins += b.wins; a.losses += b.losses;
    if (!a.keyMaps) a.keyMaps = {};
    for (var k in b.sums) {
      if (a.sums[k] === undefined) a.sums[k] = 0;
      a.sums[k] += b.sums[k];
      var bn = (b.keyMaps && b.keyMaps[k] !== undefined) ? b.keyMaps[k] : b.maps;
      a.keyMaps[k] = (a.keyMaps[k] || 0) + bn;
    }
    return a;
  }

  function clone(a) { return JSON.parse(JSON.stringify(a)); }

  /** promedios por mapa + derivados (KDA, winrate) */
  function averages(acc) {
    var out = {};
    var n = acc.maps || 1;
    for (var k in acc.sums) {
      var kn = (acc.keyMaps && acc.keyMaps[k]) ? acc.keyMaps[k] : n;
      out[k] = acc.sums[k] / kn;
    }
    var d = out.deaths === undefined ? 0 : out.deaths;
    out.kda = ((out.kills || 0) + (out.assists || 0)) / Math.max(1, d);
    out.winrate = acc.maps ? acc.wins / acc.maps : 0;
    return out;
  }

  DCS.engine = DCS.engine || {};
  DCS.engine.stats = {
    statKeys: statKeys,
    blank: blank,
    add: add,
    merge: merge,
    clone: clone,
    averages: averages
  };
})(window.DCS = window.DCS || {});
