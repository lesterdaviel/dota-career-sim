/* ============================================================
   CORE / RUNTIME — puente entre el estado guardado y el RNG vivo
   ------------------------------------------------------------
   Solo existe UN generador activo. Su cursor se vuelca al estado
   antes de cada guardado, de modo que la partida siempre continúa
   exactamente donde se quedó la secuencia aleatoria.
   ============================================================ */
(function (DCS) {
  'use strict';

  var runtime = {
    rng: null,
    state: null,

    bind: function (state) {
      runtime.state = state;
      runtime.rng = new DCS.rng.Rng(state.seed, state.cursor || 0);
      return runtime.rng;
    },

    /** vuelca el cursor consumido al estado (llamar antes de guardar) */
    sync: function (state) {
      var s = state || runtime.state;
      if (s && runtime.rng) s.cursor = runtime.rng.cursor;
      return s;
    },

    get: function () {
      return runtime.rng;
    }
  };

  DCS.runtime = runtime;
})(window.DCS = window.DCS || {});
