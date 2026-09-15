/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   ENGINE / WORLD — ecosistema de equipos ficticios
   ------------------------------------------------------------
   El mundo NO es estático: cada año los equipos suben, bajan,
   fichan, se hunden o se disuelven. La carrera del jugador
   ocurre dentro de un circuito vivo.
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;
  var D = DCS.data;

  var EXPECTATIONS = {
    3: ['Crecer y no descender', 'Pelear el ascenso', 'Ganar la división'],
    2: ['Consolidarse en la categoría', 'Clasificarse para eventos internacionales', 'Ascender a Tier 1'],
    1: ['Mantener la plaza', 'Entrar en playoffs internacionales', 'Clasificarse para The International', 'Pelear títulos internacionales']
  };
  var STYLES = ['Agresivo', 'Metódico', 'Caótico', 'Estratégico', 'Reactivo', 'Ultraofensivo', 'Paciente'];

  function genNick(rng, used) {
    for (var tries = 0; tries < 40; tries++) {
      var nick;
      if (rng.chance(0.22)) {
        nick = rng.pick(D.NICK_SOLO);
      } else {
        nick = rng.pick(D.NICK_HEADS) + rng.pick(D.NICK_TAILS);
        if (rng.chance(0.16)) nick = nick.toLowerCase();
        if (rng.chance(0.10)) nick += rng.int(1, 99);
      }
      if (!used[nick]) { used[nick] = true; return nick; }
    }
    return 'Player' + rng.int(1000, 9999);
  }

  function genOrgName(rng, used) {
    for (var tries = 0; tries < 40; tries++) {
      var head = rng.pick(D.ORG_HEADS);
      var name = rng.chance(0.45) ? head + ' ' + rng.pick(D.ORG_TAILS) : head;
      if (rng.chance(0.12)) name = 'Team ' + head;
      if (!used[name]) { used[name] = true; return name; }
    }
    return 'Org ' + rng.int(100, 999);
  }

  function genRealName(rng, region) {
    var f = D.FIRST_NAMES[region] || D.FIRST_NAMES.weu;
    var l = D.LAST_NAMES[region] || D.LAST_NAMES.weu;
    return rng.pick(f) + ' ' + rng.pick(l);
  }

  function tierQualityMean(tier, region) {
    var s = D.REGIONS[region].strength;
    var base = tier === 1 ? 76 : (tier === 2 ? 61 : 46);
    return base + (s - 0.9) * 16;
  }

  function makeNpc(rng, world, region, role, quality) {
    var age = U.clamp(rng.gaussInt(24, 4), 17, 35);
    var rating = U.clamp(Math.round(rng.gauss(quality, 4.5)), 15, 97);
    return {
      id: 'n' + (world.nextId++),
      nick: genNick(rng, world.usedNicks),
      name: genRealName(rng, region),
      role: role,
      age: age,
      rating: rating,
      isPlayer: false
    };
  }

  function makeTeam(rng, world, region, tier, spec) {
    var q = U.clamp(rng.gauss(tierQualityMean(tier, region), tier === 1 ? 4 : 5), 12, 95);
    var startTier = (spec && typeof spec.tier === 'number') ? spec.tier : tier;
    var team = {
      id: spec ? spec.id : ('t' + (world.nextId++)),
      name: spec ? spec.name : genOrgName(rng, world.usedOrgs),
      region: spec ? spec.region : region,
      baseTier: startTier,
      tier: startTier,
      logo: spec ? (spec.logo || ('assets/teams/' + spec.id + '.png')) : null,
      quality: Math.round(spec && typeof spec.strength === 'number' ? U.clamp(spec.strength, 12, 95) : q),
      reputation: Math.round(U.clamp(rng.gauss(startTier === 1 ? 74 : (startTier === 2 ? 48 : 22), 12), 2, 99)),
      resources: Math.round(U.clamp(rng.gauss(startTier === 1 ? 76 : (startTier === 2 ? 50 : 24), 14), 3, 99)),
      synergy: Math.round(U.clamp(rng.gauss(58, 10), 20, 92)),
      expectation: rng.pick(EXPECTATIONS[startTier]),
      style: rng.pick(STYLES),
      roster: [],
      points: 0,
      form: 0,
      lastResults: [],
      hasPlayer: false
    };
    D.ROLE_LIST.forEach(function (r) {
      team.roster.push(makeNpc(rng, world, team.region, r, team.quality));
    });
    return team;
  }

  function createWorld(rng) {
    var world = { teams: [], nextId: 1, usedNicks: {}, usedOrgs: {} };
    var catalog = D.TEAMS || [];
    if (catalog.length) {
      catalog.forEach(function (spec) {
        world.usedOrgs[spec.name] = true;
        world.teams.push(makeTeam(rng, world, spec.region, spec.tier, spec));
      });
      return world;
    }
    D.REGION_LIST.forEach(function (reg) {
      var slots = D.REGIONS[reg].slots;
      [1, 2, 3].forEach(function (tier) {
        var n = slots['t' + tier];
        for (var i = 0; i < n; i++) world.teams.push(makeTeam(rng, world, reg, tier));
      });
    });
    return world;
  }

  function getTeam(state, id) {
    if (!id) return null;
    var t = state.world.teams;
    for (var i = 0; i < t.length; i++) if (t[i].id === id) return t[i];
    return null;
  }

  /* Fuerza competitiva real: calidad del roster + química.
     El jugador aporta según el peso de impacto de su rol.        */
  function teamStrength(state, team, includePlayer) {
    var sum = 0, n = 0;
    for (var i = 0; i < team.roster.length; i++) {
      var m = team.roster[i];
      if (m.isPlayer) {
        if (includePlayer === false) continue;
        var role = D.ROLES[state.player.role];
        sum += DCS.engine.player.effectiveLevel(state.player, team) * (1 + (role.impact - 0.22));
        n++;
      } else {
        sum += m.rating;
        n++;
      }
    }
    var avg = n ? sum / n : team.quality;
    return U.clamp(avg + (team.synergy - 55) * 0.10 + (team.resources - 50) * 0.03, 5, 99);
  }

  function rosterQuality(team) {
    var vals = team.roster.filter(function (m) { return !m.isPlayer; }).map(function (m) { return m.rating; });
    return vals.length ? Math.round(U.avg(vals)) : team.quality;
  }

  /* Llegar nuevo siempre cuesta química: más cuanto más se cambia. */
  function newcomerPenalty(state) {
    var p = state.player;
    return 6 + Math.min(10, p.teamChanges * 1.6) - (p.attrs.team + p.attrs.adapt) / 40;
  }

  function joinTeam(state, team, contract) {
    var p = state.player;
    var idx = -1;
    for (var i = 0; i < team.roster.length; i++) if (team.roster[i].role === p.role) idx = i;
    if (idx < 0) idx = 0;
    team.roster[idx] = { id: 'you', nick: p.nick, name: p.name, role: p.role, age: p.age, rating: p.overall, isPlayer: true };
    team.hasPlayer = true;
    team.synergy = Math.round(U.clamp(team.synergy - newcomerPenalty(state), 15, 95));
    p.teamId = team.id;
    p.status = 'signed';
    p.contract = contract;
    if (p.teamsPlayed.indexOf(team.id) < 0) p.teamsPlayed.push(team.id);
  }

  function leaveTeam(state, reason) {
    var p = state.player;
    var team = getTeam(state, p.teamId);
    if (team) {
      var rng = DCS.runtime.get();
      for (var i = 0; i < team.roster.length; i++) {
        if (team.roster[i].isPlayer) {
          team.roster[i] = makeNpc(rng, state.world, team.region, p.role, team.quality);
        }
      }
      team.hasPlayer = false;
    }
    p.teamId = null;
    p.contract = null;
    p.status = 'free';
    p.isCaptain = false;
    if (p.flags) delete p.flags.provisional;
    return reason;
  }

  /* Evolución anual del ecosistema ------------------------------ */
  function evolveWorld(state, rng, log) {
    var world = state.world;
    var replacements = [];

    world.teams.forEach(function (team) {
      /* NPCs envejecen y progresan o decaen */
      team.roster.forEach(function (m) {
        if (m.isPlayer) return;
        m.age++;
        var delta;
        if (m.age <= 21) delta = rng.gauss(3.6, 2.6);
        else if (m.age <= 25) delta = rng.gauss(1.5, 2.2);
        else if (m.age <= 28) delta = rng.gauss(0.2, 1.8);
        else if (m.age <= 31) delta = rng.gauss(-1.4, 2.0);
        else delta = rng.gauss(-3.2, 2.2);
        m.rating = Math.round(U.clamp(m.rating + delta, 12, 97));
        if (m.age > 32 && rng.chance(0.28 + (m.age - 32) * 0.12)) m.retiring = true;
      });

      /* Retiradas y fichajes NPC */
      for (var i = 0; i < team.roster.length; i++) {
        var m = team.roster[i];
        if (m.isPlayer) continue;
        if (m.retiring || (rng.chance(0.16) && !team.hasPlayer)) {
          team.roster[i] = makeNpc(rng, world, team.region, m.role, team.quality + rng.gauss(0, 4));
        }
      }

      team.quality = rosterQuality(team);
      team.synergy = Math.round(U.clamp(team.synergy + rng.gauss(1.5, 7), 15, 95));
      team.resources = Math.round(U.clamp(team.resources + rng.gauss(0, 7) + (team.points > 60 ? 5 : -2), 3, 99));
      team.reputation = Math.round(U.clamp(team.reputation + rng.gauss(0, 4) + (team.points > 60 ? 4 : (team.points < 15 ? -3 : 0)), 2, 99));

      /* Ascensos y descensos: el catálogo solo fija el tier de
         partida; a partir de ahí manda el rendimiento del año. */
      var mean = tierQualityMean(team.tier, team.region);
      if (team.tier > 1 && team.quality > mean + 9 && rng.chance(0.45)) {
        team.tier--;
        team.expectation = rng.pick(EXPECTATIONS[team.tier]);
        if (log) log.push(team.name + ' asciende a Tier ' + team.tier + '.');
      } else if (team.tier < 3 && team.quality < mean - 9 && rng.chance(0.42)) {
        team.tier++;
        team.expectation = rng.pick(EXPECTATIONS[team.tier]);
        if (log) log.push(team.name + ' cae a Tier ' + team.tier + '.');
      }

      /* Disolución (nunca el equipo del jugador aquí: se gestiona
         como evento propio para que tenga peso narrativo) */
      var risk = 0.05 + (team.resources < 25 ? 0.07 : 0) + (team.quality < mean - 7 ? 0.05 : 0);
      if (!team.hasPlayer && rng.chance(risk)) {
        replacements.push(team);
      }
      team.points = 0;
      team.lastResults = [];
    });

    replacements.forEach(function (team) {
      var idx = world.teams.indexOf(team);
      if (idx < 0) return;
      var catalog = D.TEAMS || [];
      var fresh;
      if (catalog.length) {
        var used = {};
        world.teams.forEach(function (t) { if (t && t.id !== team.id) used[t.id] = true; });
        var spec = null;
        for (var c = 0; c < catalog.length; c++) {
          if (!used[catalog[c].id]) { spec = catalog[c]; break; }
        }
        if (!spec) return;
        fresh = makeTeam(rng, world, spec.region, spec.tier, spec);
      } else {
        fresh = makeTeam(rng, world, team.region, team.tier);
      }
      world.teams[idx] = fresh;
      if (log) log.push(team.name + ' cierra su división de Dota 2. ' + fresh.name + ' ocupa su lugar.');
    });
  }

  function teamsIn(state, region, tier) {
    return state.world.teams.filter(function (t) {
      return (!region || t.region === region) && (!tier || t.tier === tier);
    });
  }

  DCS.engine = DCS.engine || {};
  DCS.engine.world = {
    createWorld: createWorld,
    makeTeam: makeTeam,
    makeNpc: makeNpc,
    genNick: genNick,
    getTeam: getTeam,
    teamStrength: teamStrength,
    rosterQuality: rosterQuality,
    joinTeam: joinTeam,
    leaveTeam: leaveTeam,
    evolveWorld: evolveWorld,
    teamsIn: teamsIn,
    EXPECTATIONS: EXPECTATIONS
  };
})(window.DCS = window.DCS || {});
