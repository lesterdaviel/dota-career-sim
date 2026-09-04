/* ============================================================
   STATE / GAME — fachada única entre la interfaz y el motor
   ------------------------------------------------------------
   La UI no toca el motor directamente. Cada acción muta el estado
   y lo persiste al instante, para que el juego sea idéntico tras
   cerrar la pestaña.
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;

  var game = {
    state: null,

    start: function (opts) {
      game.state = DCS.store.newState(opts);
      return game.state;
    },

    resume: function () {
      game.state = DCS.store.load();
      return game.state;
    },

    persist: function () {
      if (!game.state) return;
      var p = game.state.player;
      var c = game.state.career;
      if (p.reputation > c.peakReputation) c.peakReputation = Math.round(p.reputation);
      DCS.store.save(game.state);
    },

    /** Ejecuta la siguiente fase de la temporada */
    advance: function () {
      var s = game.state;
      if (!s || s.finished) return null;
      var report = DCS.engine.season.advance(s);
      game.persist();
      return report;
    },

    /** Avanza fases hasta que algo requiera al usuario */
    advanceUntilInput: function (maxSteps) {
      var out = [];
      var steps = maxSteps || 6;
      for (var i = 0; i < steps; i++) {
        var s = game.state;
        if (!s || s.finished || s.pending) break;
        var phase = s.season ? s.season.phase : null;
        var r = game.advance();
        if (!r || r.blocked) break;
        out.push(r);
        if (game.state.pending) break;
        if (phase === 'market' && r.offers && r.offers.length) break;
        if (phase === 'yearEnd') break;
      }
      return out;
    },

    acceptOffer: function (offerId) {
      var s = game.state;
      var offer = null;
      for (var i = 0; i < s.offers.length; i++) if (s.offers[i].id === offerId) offer = s.offers[i];
      if (!offer) return false;
      var ok = DCS.engine.market.acceptOffer(s, offer);
      if (ok) {
        s.offers = [];
        /* si el fichaje ocurre con la temporada ya cerrada, la nueva
           etapa se abrirá al arrancar el próximo año */
        game.persist();
      }
      return ok;
    },

    declineOffers: function () {
      var s = game.state;
      s.offers = [];
      game.persist();
      return true;
    },

    invest: function (cat, amount) {
      var out = DCS.engine.finance.invest(game.state, cat, amount);
      if (out.ok) game.persist();
      return out;
    },

    withdraw: function (cat, amount) {
      var out=DCS.engine.finance.withdraw(game.state,cat,amount);if(out.ok)game.persist();return out;
    },

    luxury: function (amount) {
      var out=DCS.engine.finance.luxury(game.state,amount);if(out.ok)game.persist();return out;
    },

    resolveWealth: function (accept) {
      var out = DCS.engine.finance.resolveSpecial(game.state, accept);
      game.persist();
      return out;
    },

    resolveEvent: function (optionIndex) {
      var s = game.state;
      var out = DCS.engine.season.resolvePendingEvent(s, optionIndex);
      game.persist();
      return out;
    },

    simSeries: function () {
      var s = game.state;
      if (!s || !s.season || !s.season.liveTour || s.season.liveTour.done) return null;
      DCS.engine.season.playLive(s, false);
      game.persist();
      return s.season.liveTour;
    },

    simTournament: function () {
      var s = game.state;
      if (!s || !s.season || !s.season.liveTour || s.season.liveTour.done) return null;
      DCS.engine.season.playLive(s, true);
      game.persist();
      return s.season.liveTour;
    },

    continueCalendar: function () {
      var s = game.state;
      if (!s || !s.season || !s.season.liveTour || !s.season.liveTour.done) return null;
      var report = DCS.engine.season.continueCompetition(s);
      s.lastReport = report;
      if (s.season) s.season.report = report;
      game.persist();
      return report;
    },

    /** Respuesta a la propuesta de retirada */
    answerRetirement: function (accept) {
      var s = game.state;
      if (!s.pending || s.pending.type !== 'retirement') return null;
      s.pending = null;
      if (accept) {
        DCS.engine.retirement.retire(s, 'choice');
      } else {
        s.player.morale = U.clamp(s.player.morale + 8, 0, 100);
        s.career.lastRetirementPrompt = s.year;
      }
      game.persist();
      return s.finished ? s.legacy : null;
    },

    retireNow: function () {
      var s = game.state;
      if (!s || s.finished) return null;
      DCS.engine.retirement.retire(s, 'choice');
      game.persist();
      return s.legacy;
    },

    reset: function () {
      DCS.store.clear();
      game.state = null;
    },

    /* --------- lecturas de conveniencia para la UI --------- */
    team: function () {
      var s = game.state;
      return s ? DCS.engine.world.getTeam(s, s.player.teamId) : null;
    },

    phaseLabel: function () {
      var s = game.state;
      if (!s || s.finished) return 'Carrera finalizada';
      if (s.pending && s.pending.type === 'retirement') return '¿Ha llegado el momento?';
      if (s.pending && s.pending.type === 'event') return 'Decisión pendiente';
      if (s.pending && s.pending.type === 'wealth') return 'Oportunidad financiera';
      if (s.pending && s.pending.type === 'tournament') return s.season.liveTour ? s.season.liveTour.name : 'Torneo';
      var ph = s.season ? s.season.phase : 'preseason';
      if (ph === 'done') return 'Pretemporada';
      return DCS.engine.season.PHASE_LABEL[ph] || ph;
    },

    nextLabel: function () {
      var s = game.state;
      if (!s) return '';
      var ph = s.season ? s.season.phase : 'preseason';
      var map = {
        preseason: 'Iniciar pretemporada',
        competition: 'Jugar la temporada',
        review: 'Cerrar la temporada',
        market: 'Abrir el mercado',
        yearEnd: 'Terminar el año',
        done: 'Empezar ' + s.year
      };
      return map[ph] || 'Continuar';
    }
  };

  DCS.game = game;
})(window.DCS = window.DCS || {});
