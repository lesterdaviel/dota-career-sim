/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   ENGINE / EVENTS — motor de acontecimientos
   ------------------------------------------------------------
   Los efectos se aplican en el momento en que el evento se genera
   (o en que se elige una opción) y quedan escritos en el estado.
   Recargar la página no vuelve a tirar los dados.
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;
  var D = DCS.data;

  function makeFx(state, rng, season) {
    var p = state.player;
    var team = DCS.engine.world.getTeam(state, p.teamId);
    var changes = [];

    function note(t) { changes.push(t); }

    return {
      changes: changes,
      form: function (d) { p.form = U.clamp(p.form + d, 0, 100); },
      morale: function (d) { p.morale = U.clamp(p.morale + d, 0, 100); },
      rep: function (d) { p.reputation = U.clamp(p.reputation + d, 0, 100); },
      synergy: function (d) { if (team) team.synergy = U.clamp(team.synergy + d, 10, 96); },
      attrDrift: function (k, d) { p.attrs[k] = U.clamp(p.attrs[k] + d, 3, 99); p.overall = DCS.engine.player.overall(p); },
      capPenalty: function (k, d) { p.caps[k] = U.clamp(p.caps[k] - d, 15, 99); },
      capBoost: function (k, d) { p.caps[k] = U.clamp(p.caps[k] + d, 15, 99); },
      money: function (d) {
        state.career.earnings.other += d;
        if (season) season.earnings.other += d;
      },
      salary: function (mult) {
        if (p.contract) p.contract.salary = Math.round(p.contract.salary * mult);
      },
      trainingBonus: function (x) { p.trainingMod = (p.trainingMod || 0) + x; },
      trainingPenalty: function (x) { p.trainingMod = (p.trainingMod || 0) - x; },
      captain: function (v) { p.isCaptain = !!v; if (team && v) team.synergy = U.clamp(team.synergy + 2, 10, 96); },
      flag: function (k, v) { p.flags[k] = v; },
      rerollTeammate: function () {
        if (!team) return;
        var idx = [];
        team.roster.forEach(function (m, i) { if (!m.isPlayer) idx.push(i); });
        if (!idx.length) return;
        var i2 = rng.pick(idx);
        team.roster[i2] = DCS.engine.world.makeNpc(rng, state.world, team.region, team.roster[i2].role,
          team.quality + rng.gauss(-1, 5));
        team.quality = DCS.engine.world.rosterQuality(team);
      },
      changeRole: function (role) {
        p.role = role;
        p.overall = DCS.engine.player.overall(p);
        if (team) team.roster.forEach(function (m) { if (m.isPlayer) m.role = role; });
      },
      changeRegion: function (reg) {
        p.region = reg;
        if (p.teamId) DCS.engine.world.leaveTeam(state, 'region');
      },
      leaveTeam: function (reason) {
        DCS.engine.world.leaveTeam(state, reason);
        p.teamChanges++;
      }
    };
  }

  function buildContext(state, rng, season) {
    var p = state.player;
    var team = DCS.engine.world.getTeam(state, p.teamId);
    var mates = team ? team.roster.filter(function (m) { return !m.isPlayer; }).map(function (m) { return m.nick; }) : [];
    var rivals = state.world.teams.filter(function (t) { return t.region === p.region && t.id !== p.teamId; })
      .slice(0, 8).map(function (t) {
        var r = t.roster[0];
        return r ? r.nick + ' (' + t.name + ')' : t.name;
      });
    var altRoles = D.ROLE_LIST.filter(function (r) { return r !== p.role; });
    var altRegions = D.REGION_LIST.filter(function (r) { return r !== p.region; });

    var c = {
      state: state,
      rng: rng,
      player: p,
      team: team,
      teammateNames: mates.length ? mates : null,
      rivalNames: rivals.length ? rivals : ['un rival de la región'],
      lastRating: state.career.lastRating === null || state.career.lastRating === undefined ? 55 : state.career.lastRating,
      altRole: rng.pick(altRoles),
      altRegion: rng.pick(altRegions)
    };
    c.fx = makeFx(state, rng, season);
    return c;
  }

  /**
   * Extrae un evento para la fase indicada. Devuelve null si no toca.
   */
  function draw(state, rng, phase, season, chance) {
    if (!rng.chance(chance === undefined ? 0.5 : chance)) return null;
    var c = buildContext(state, rng, season);

    var pool = D.EVENTS.filter(function (e) {
      if (e.phase !== phase && e.phase !== 'any') return false;
      if (state.usedEvents[e.id] && !rng.chance(0.35)) return false;   /* evita repetir demasiado */
      try { return e.when(c); } catch (err) { return false; }
    });
    if (!pool.length) return null;

    var chosen = rng.weighted(pool, function (e) { return Math.max(0, e.weight(c)); });
    if (!chosen) return null;

    var built = chosen.build(c);
    state.usedEvents[chosen.id] = (state.usedEvents[chosen.id] || 0) + 1;

    var inst = {
      id: 'e' + (state.counters.event++),
      key: chosen.id,
      year: state.year,
      age: state.player.age,
      title: built.title,
      text: built.text,
      tone: built.tone || 'neutral',
      options: (built.options || []).map(function (o) { return { label: o.label, hint: o.hint }; }),
      resolved: !built.options,
      outcome: null
    };
    if (built.options) {
      /* las funciones no se serializan: se recuperan por clave al resolver */
      inst.pendingKey = chosen.id;
      inst.ctxSnapshot = { altRole: c.altRole, altRegion: c.altRegion };
    }
    return inst;
  }

  /** Resuelve una decisión pendiente aplicando la opción elegida. */
  function resolve(state, rng, inst, optionIndex, season) {
    var def = null;
    for (var i = 0; i < D.EVENTS.length; i++) if (D.EVENTS[i].id === inst.pendingKey) def = D.EVENTS[i];
    if (!def) { inst.resolved = true; return 'La situación se resuelve sola.'; }

    var c = buildContext(state, rng, season);
    if (inst.ctxSnapshot) {
      c.altRole = inst.ctxSnapshot.altRole;
      c.altRegion = inst.ctxSnapshot.altRegion;
    }
    /* Los eventos con opciones no aplican efectos en build(): se puede
       reconstruir sin riesgo para recuperar las funciones de cada opción. */
    var rebuilt = def.build(c);
    var opt = (rebuilt.options || [])[optionIndex];
    if (!opt) { inst.resolved = true; return 'No haces nada.'; }

    var text = opt.apply(c);
    inst.resolved = true;
    inst.outcome = text;
    inst.chosen = opt.label;
    return text;
  }

  DCS.engine = DCS.engine || {};
  DCS.engine.events = { draw: draw, resolve: resolve, makeFx: makeFx, buildContext: buildContext };
})(window.DCS = window.DCS || {});
