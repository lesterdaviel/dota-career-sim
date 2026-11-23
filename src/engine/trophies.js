/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   ENGINE / TROPHIES — lectura del historial de títulos
   ------------------------------------------------------------
   La sala de trofeos no guarda campeonatos propios: cada pieza
   nace de un registro ya persistido (history y, si el año aún
   no se ha cerrado, season.tournaments). No muta resultados.
   ============================================================ */
(function (DCS) {
  'use strict';

  function isTitle(t) {
    return !!(t && t.placement === 1 && t.kind !== 'qualifier');
  }

  function categoryOf(t) {
    var series = String((t && (t.series || t.key)) || '').toLowerCase();
    var name = String((t && t.name) || '').toLowerCase();
    var kind = t && t.kind;
    if (kind === 'ti' || series === 'ti') return 'ti';
    if (series === 'pgl_wallachia' || name.indexOf('wallachia') !== -1) return 'pgl';
    if (series === 'dreamleague' || name.indexOf('dreamleague') !== -1) return 'dreamleague';
    if (series === 'blast_slam' || (name.indexOf('blast') !== -1 && name.indexOf('slam') !== -1)) return 'blast';
    if (series.indexOf('esl') !== -1 || name.indexOf('esl') !== -1) return 'esl';
    if (kind === 'elite' || (t && t.prestige >= 9)) return 'elite';
    if (kind === 'international' || (t && t.prestige >= 8)) return 'international';
    if (kind === 'league') return 'league';
    return 'generic';
  }

  function stableId(t, year, fallback) {
    if (t && t.id) return String(t.id);
    return 't|' + (year || t.year || '') + '|' + (t.series || t.key || '') + '|' +
      (t.name || '') + '|' + (t.teamId || '') + '|' + fallback;
  }

  function finalFromLog(t) {
    var log = t && t.log;
    if (!log || !log.length) return null;
    var last = log[log.length - 1];
    if (!last) return null;
    var w = last.w;
    var l = last.l;
    if (w == null && last.mapsWon != null) w = last.mapsWon;
    if (l == null && last.mapsLost != null) l = last.mapsLost;
    if (w == null && l == null) return null;
    var opp = last.opp;
    var oppName = null;
    if (opp) {
      if (typeof opp === 'string') oppName = opp;
      else oppName = opp.name || null;
    }
    return {
      mapsWon: w,
      mapsLost: l,
      opponent: oppName || null,
      stage: last.stage || null,
      won: last.won
    };
  }

  function present(t, year, role, id, fresh) {
    var final = finalFromLog(t);
    return {
      id: id,
      recordId: t.id || null,
      name: t.name || null,
      year: t.year || t.edition || year || null,
      teamId: t.teamId || null,
      teamName: t.teamName || null,
      role: role || null,
      prestige: typeof t.prestige === 'number' ? t.prestige : null,
      kind: t.kind || null,
      series: t.series || t.key || null,
      category: categoryOf(t),
      result: t.result || null,
      final: final,
      fresh: !!fresh
    };
  }

  function seenMap(state) {
    return (state && state.trophyRoom && state.trophyRoom.seen) || {};
  }

  function collect(state) {
    var out = [];
    var used = {};
    if (!state) return out;

    function eat(t, year, role, fallback) {
      if (!isTitle(t)) return;
      var id = stableId(t, year, fallback);
      if (used[id]) return;
      used[id] = true;
      out.push(present(t, year, role, id, !seenMap(state)[id]));
    }

    (state.history || []).forEach(function (h, hi) {
      var year = h && h.year;
      var role = h && h.role;
      (h.tournaments || []).forEach(function (t, ti) {
        eat(t, year, role, hi + ':' + ti);
      });
    });

    if (state.season && state.season.tournaments) {
      var sy = state.season.year || state.year;
      var sr = state.season.role || (state.player && state.player.role);
      state.season.tournaments.forEach(function (t, ti) {
        eat(t, sy, sr, 's:' + ti);
      });
    }

    out.sort(function (a, b) {
      if (a.category === 'ti' && b.category !== 'ti') return -1;
      if (b.category === 'ti' && a.category !== 'ti') return 1;
      var pa = a.prestige == null ? -1 : a.prestige;
      var pb = b.prestige == null ? -1 : b.prestige;
      if (pb !== pa) return pb - pa;
      var ya = a.year || 0, yb = b.year || 0;
      if (ya !== yb) return ya - yb;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    return out;
  }

  function ensureState(state) {
    if (!state) return;
    if (!state.trophyRoom) state.trophyRoom = { seen: {} };
    if (!state.trophyRoom.seen) state.trophyRoom.seen = {};
  }

  /**
   * Partidas antiguas: crea el bloque y marca los títulos ya ganados
   * como vistos para no disparar la celebración de desbloqueo.
   * No se llama en cada carga si el bloque ya existe.
   */
  function migrate(state) {
    if (!state) return;
    if (state.trophyRoom && state.trophyRoom.seen) return;
    ensureState(state);
    collect(state).forEach(function (t) {
      state.trophyRoom.seen[t.id] = true;
    });
  }

  function markSeen(state, ids) {
    ensureState(state);
    var seen = state.trophyRoom.seen;
    var list = ids || collect(state).map(function (t) { return t.id; });
    var changed = false;
    list.forEach(function (id) {
      if (id && !seen[id]) {
        seen[id] = true;
        changed = true;
      }
    });
    return changed;
  }

  DCS.engine = DCS.engine || {};
  DCS.engine.trophies = {
    isTitle: isTitle,
    categoryOf: categoryOf,
    list: collect,
    ensureState: ensureState,
    migrate: migrate,
    markSeen: markSeen
  };
})(window.DCS = window.DCS || {});
