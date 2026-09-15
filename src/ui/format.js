/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   UI / FORMAT — formateo de números y estadísticas (es-ES)
   ============================================================ */
(function (DCS) {
  'use strict';

  function group(n) {
    var s = String(Math.abs(n));
    var out = '', c = 0;
    for (var i = s.length - 1; i >= 0; i--) {
      out = s[i] + out;
      if (++c % 3 === 0 && i > 0) out = '.' + out;
    }
    return (n < 0 ? '-' : '') + out;
  }

  function int(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return group(Math.round(n));
  }

  /** MMR sin separador de miles: 3333, no 3.333 */
  function mmr(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return String(Math.round(n));
  }

  function dec(n, d) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    var v = Math.round(n * Math.pow(10, d)) / Math.pow(10, d);
    var s = v.toFixed(d).replace('.', ',');
    var parts = s.split(',');
    return group(parseInt(parts[0], 10)) + (parts[1] ? ',' + parts[1] : '');
  }

  function money(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    var v = Math.round(n);
    var sign = v < 0 ? '-' : '';
    var a = Math.abs(v);
    if (a >= 1000000) return sign + '$' + dec(a / 1000000, 2) + 'M';
    if (a >= 10000) return sign + '$' + group(Math.round(a / 1000)) + 'K';
    return sign + '$' + group(a);
  }

  function moneyFull(n) {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return '$' + group(Math.round(n));
  }

  function pct(v, d) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    return dec(v * 100, d === undefined ? 1 : d) + '%';
  }

  function signed(v) {
    if (v === null || v === undefined || isNaN(v)) return '—';
    var r = Math.round(v);
    return (r > 0 ? '+' : '') + r;
  }

  /** aplica el formato declarado en ROLES[].display */
  function stat(kind, value) {
    switch (kind) {
      case 'money': return money(value);
      case 'moneyFull': return moneyFull(value);
      case 'int': return int(value);
      case 'mmr': return mmr(value);
      case 'dec1': return dec(value, 1);
      case 'dec2': return dec(value, 2);
      case 'pct': return pct(value, 1);
      case 'signed': return signed(value);
      case 'score': return int(value);
      default: return int(value);
    }
  }

  function ordinal(n) {
    return n + 'º';
  }

  DCS.ui = DCS.ui || {};
  DCS.ui.fmt = {
    int: int, mmr: mmr, dec: dec, money: money, moneyFull: moneyFull,
    pct: pct, signed: signed, stat: stat, ordinal: ordinal, group: group
  };
})(window.DCS = window.DCS || {});
