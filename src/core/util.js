/* ============================================================
   CORE / UTIL — helpers puros sin dependencias de dominio
   ============================================================ */
(function (DCS) {
  'use strict';

  function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }
  function round(v, d) { var m = Math.pow(10, d || 0); return Math.round(v * m) / m; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /** normaliza v dentro de [low, high] -> [0,1] */
  function norm(v, low, high) {
    if (high === low) return 0.5;
    return clamp((v - low) / (high - low), 0, 1);
  }

  function sum(arr, fn) {
    var t = 0;
    for (var i = 0; i < arr.length; i++) t += fn ? fn(arr[i], i) : arr[i];
    return t;
  }

  function avg(arr, fn) {
    if (!arr.length) return 0;
    return sum(arr, fn) / arr.length;
  }

  function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  /** curva logistica: convierte diferencia de fuerza en probabilidad */
  function logistic(diff, scale) {
    return 1 / (1 + Math.pow(10, -diff / (scale || 18)));
  }

  function pct(v, d) {
    return round(v * 100, d === undefined ? 1 : d);
  }

  function winrate(w, total) {
    if (!total) return 0;
    return w / total;
  }

  DCS.util = {
    clamp: clamp,
    round: round,
    lerp: lerp,
    norm: norm,
    sum: sum,
    avg: avg,
    deepClone: deepClone,
    logistic: logistic,
    pct: pct,
    winrate: winrate
  };
})(window.DCS = window.DCS || {});
