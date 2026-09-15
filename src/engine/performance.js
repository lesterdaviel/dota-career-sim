/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   ENGINE / PERFORMANCE — rating de rendimiento 0-100
   ------------------------------------------------------------
   Cada posición se juzga con criterios distintos (ratingSpec).
   Un pos 5 puede firmar una temporada excepcional con 3 kills por
   mapa; un carry con muchas kills y mal farm, no.
   Ningún dato aislado domina: los pesos internos lo impiden.
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;

  /* Calidad del resultado de un torneo, normalizada 0-1 y
     escalada por prestigio: ganar una copa T3 no es un Major.   */
  function tournamentQuality(t) {
    var field = t.field || 8;
    var pos = U.clamp(1 - (t.placement - 1) / Math.max(1, field - 1), 0, 1);
    var prestigeW = 0.42 + t.prestige / 16;           /* 0.48 .. 1.05 */
    var q = pos * prestigeW;
    if (t.placement === 1) q += 0.10 + t.prestige / 60;
    return U.clamp(q, 0, 1.25);
  }

  /**
   * @param {Object} acc  acumulador de estadísticas (sumas por mapa)
   * @param {Object} ctx  { role, tournaments:[], oppLevel, tier, maps }
   */
  function rate(state, acc, ctx) {
    if (!acc || !acc.maps) return null;
    var role = DCS.data.ROLES[ctx.role || state.player.role];
    var avg = DCS.engine.stats.averages(acc);

    /* --- 1. calidad estadística según el rol ------------------ */
    var statScore = 0, wsum = 0;
    role.ratingSpec.forEach(function (s) {
      var v = avg[s.key];
      if (v === undefined) return;
      statScore += s.w * U.norm(v, s.low, s.high);
      wsum += s.w;
    });
    statScore = wsum ? statScore / wsum : 0.5;

    /* --- 2. resultados competitivos -------------------------- */
    var wr = acc.maps ? acc.wins / acc.maps : 0;
    var wrScore = U.norm(wr, 0.33, 0.74);
    var best = 0, titleBonus = 0;
    (ctx.tournaments || []).forEach(function (t) {
      var q = tournamentQuality(t);
      if (q > best) best = q;
      if (t.placement === 1 && t.prestige >= 6) titleBonus += 0.05;
    });
    var resultScore = U.clamp(0.55 * wrScore + 0.45 * best + titleBonus, 0, 1.05);

    /* --- 3. contexto: nivel del circuito en el que compite ---- */
    var ctxScore = U.clamp(
      0.6 * U.norm(ctx.oppLevel || 50, 38, 86) +
      0.4 * U.norm(4 - (ctx.tier || 3), 0.5, 3),
      0, 1);

    var raw = 0.60 * statScore + 0.27 * resultScore + 0.13 * ctxScore;
    var rating = 22 + raw * 74;

    /* pequeña dosis de subjetividad: la percepción nunca es exacta */
    var rng = DCS.runtime.get();
    if (rng) rating += rng.gauss(0, 1.8);

    /* muestras cortas tiran hacia la media: 8 mapas no son una temporada */
    if (acc.maps < 25) rating = U.lerp(56, rating, 0.45 + acc.maps / 45);

    return Math.round(U.clamp(rating, 5, 99));
  }

  DCS.engine = DCS.engine || {};
  DCS.engine.performance = {
    rate: rate,
    tournamentQuality: tournamentQuality
  };
})(window.DCS = window.DCS || {});
