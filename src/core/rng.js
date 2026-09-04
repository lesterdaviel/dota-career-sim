/* ============================================================
   CORE / RNG  —  Motor de azar controlado y determinista
   ------------------------------------------------------------
   El azar NUNCA es "azar puro -> resultado". Estas primitivas
   solo generan numeros; las probabilidades las deciden las capas
   de simulacion a partir del contexto (habilidad, edad, forma...).

   Determinismo: el generador no guarda estado interno propio.
   Cada valor se deriva de (seed, cursor). El cursor vive en el
   estado de la partida y se persiste tras cada accion, por lo que
   recargar la pagina NO permite volver a tirar los dados.
   ============================================================ */
(function (DCS) {
  'use strict';

  function hashString(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  /* splitmix32: buena dispersion a partir de un unico entero */
  function splitmix32(a) {
    a |= 0;
    a = (a + 0x9e3779b9) | 0;
    var t = a ^ (a >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    t = t ^ (t >>> 15);
    return (t >>> 0) / 4294967296;
  }

  function newSeed() {
    var bytes = new Uint32Array(2);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      bytes[0] = (Math.random() * 4294967296) >>> 0;
      bytes[1] = (Date.now() * 1.618) >>> 0;
    }
    return (bytes[0].toString(36) + bytes[1].toString(36)).toUpperCase().slice(0, 12);
  }

  /**
   * @param {string|number} seed  semilla de la carrera
   * @param {number} cursor       nº de valores ya consumidos (persistido)
   */
  function Rng(seed, cursor) {
    this.seed = String(seed);
    this.seedNum = hashString(this.seed);
    this.cursor = cursor | 0;
  }

  Rng.prototype.float = function () {
    var v = splitmix32((this.seedNum + Math.imul(this.cursor + 1, 0x9e3779b9)) | 0);
    this.cursor++;
    return v;
  };

  /** entero en [min, max] inclusive */
  Rng.prototype.int = function (min, max) {
    if (max < min) { var t = min; min = max; max = t; }
    return min + Math.floor(this.float() * (max - min + 1));
  };

  /** flotante en [min, max) */
  Rng.prototype.range = function (min, max) {
    return min + this.float() * (max - min);
  };

  Rng.prototype.chance = function (p) {
    return this.float() < p;
  };

  Rng.prototype.pick = function (arr) {
    return arr[Math.floor(this.float() * arr.length)];
  };

  /** elige n elementos distintos */
  Rng.prototype.sample = function (arr, n) {
    var copy = arr.slice();
    this.shuffle(copy);
    return copy.slice(0, Math.min(n, copy.length));
  };

  Rng.prototype.shuffle = function (arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(this.float() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  };

  /**
   * @param {Array} items
   * @param {Function} weightFn  item -> peso (>=0)
   */
  Rng.prototype.weighted = function (items, weightFn) {
    var total = 0, i, w, weights = [];
    for (i = 0; i < items.length; i++) {
      w = Math.max(0, weightFn ? weightFn(items[i], i) : (items[i].weight || 0));
      weights.push(w);
      total += w;
    }
    if (total <= 0) return null;
    var roll = this.float() * total;
    for (i = 0; i < items.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return items[i];
    }
    return items[items.length - 1];
  };

  /** gaussiana truncada (Box-Muller) */
  Rng.prototype.gauss = function (mean, sd, min, max) {
    var u = 1 - this.float();
    var v = this.float();
    var z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    var out = mean + z * sd;
    if (min !== undefined && out < min) out = min;
    if (max !== undefined && out > max) out = max;
    return out;
  };

  /** gaussiana redondeada a entero */
  Rng.prototype.gaussInt = function (mean, sd, min, max) {
    return Math.round(this.gauss(mean, sd, min, max));
  };

  /** desvia un valor base un +-pct relativo */
  Rng.prototype.jitter = function (value, pct) {
    return value * (1 + this.range(-pct, pct));
  };

  DCS.rng = {
    Rng: Rng,
    newSeed: newSeed,
    hashString: hashString
  };
})(window.DCS = window.DCS || {});
