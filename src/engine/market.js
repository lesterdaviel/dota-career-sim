/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   ENGINE / MARKET — valor de mercado, ofertas y contratos
   ------------------------------------------------------------
   El mercado no mira solo tu valoración: mira lo que hiciste la
   última temporada, tu reputación, tu edad, lo que creen que
   puedes llegar a ser y si encajas en un hueco concreto.
   Y a veces, simplemente, tienes suerte.
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;
  var D = DCS.data;

  /* Umbral aproximado de nivel exigido por un equipo */
  function requiredScore(team) {
    if (team.tier === 1) return 73 + (team.quality - 72) * 0.8;
    if (team.tier === 2) return 53 + (team.quality - 60) * 0.75;
    return 27 + (team.quality - 46) * 0.6;
  }

  /** Puntuación de mercado del jugador: 0-100 */
  function marketScore(state, rng) {
    var p = state.player;
    var last = state.career.lastRating;
    var mmrNorm = U.norm(p.mmr, 2800, 11000) * 100;
    var base = 0.49 * p.overall + 0.22 * (last === null || last === undefined ? p.overall * 0.9 : last) +
      0.15 * p.reputation + 0.14 * mmrNorm;

    var perceived = DCS.engine.player.perceivedPotential(p, rng);
    var potWeight = U.clamp((23 - p.age) / 9, 0, 1) * 0.32;
    var score = base * (1 - potWeight) + perceived * potWeight;

    if (p.age >= 29) score -= (p.age - 28) * 2.6;
    if (p.age >= 34) score -= (p.age - 33) * 2.6;
    /* Estar parado pesa, pero que un chaval de 16-18 aún no tenga
       equipo es lo normal: no puede convertirse en una espiral. */
    var idle = Math.min(3, p.seasonsWithoutTeam - (p.age <= 18 ? 1 : 0));
    if (idle > 0) score -= idle * 3.4;
    if (p.flags && p.flags.provisional) score -= 3;
    return U.clamp(score, 1, 100);
  }

  /* ¿Tiene ese equipo un hueco real en tu posición? */
  function opening(state, team, rng) {
    var incumbent = null;
    team.roster.forEach(function (m) { if (m.role === state.player.role && !m.isPlayer) incumbent = m; });
    if (!incumbent) return 0.9;
    var weak = incumbent.rating < team.quality - 3;
    var old = incumbent.age >= 30;
    var base = 0.22;
    if (weak) base += 0.35;
    if (old) base += 0.22;
    if (team.synergy < 45) base += 0.12;
    return U.clamp(base, 0.05, 0.9);
  }

  function salaryFor(team, score, rng) {
    var band;
    if (team.tier === 1) band = [70000, 620000];
    else if (team.tier === 2) band = [22000, 150000];
    else band = [4000, 34000];
    var t = U.clamp((score - requiredScore(team)) / 30 + 0.35, 0, 1.15);
    var res = 0.75 + team.resources / 200;
    var value = U.lerp(band[0], band[1], t) * res * rng.range(0.88, 1.14);
    return Math.round(value / 500) * 500;
  }

  function oddsLabel(team, tier) {
    if (tier === 1) {
      if (team.quality >= 80) return 'Candidato a todo, incluido The International';
      if (team.quality >= 74) return 'Presencia habitual en torneos internacionales';
      return 'Peleará por entrar en los grandes eventos';
    }
    if (tier === 2) {
      if (team.quality >= 66) return 'Opciones reales de dar el salto a Tier 1';
      return 'Circuito regional y algún clasificatorio';
    }
    return 'Ligas menores y clasificatorios abiertos';
  }

  /**
   * Genera las ofertas del mercado de fin de temporada.
   * @param ctx { renewal:boolean }
   */
  function generateOffers(state, rng, ctx) {
    ctx = ctx || {};
    var p = state.player;
    var score = marketScore(state, rng);
    var offers = [];
    var current = DCS.engine.world.getTeam(state, p.teamId);

    var candidates = state.world.teams.filter(function (t) {
      if (current && t.id === current.id) return false;
      if (t.hasPlayer) return false;
      return true;
    });

    var scored = [];
    candidates.forEach(function (team) {
      var req = requiredScore(team);
      var fit = U.logistic(score - req, 7);
      var regionMod = team.region === p.region ? 1 : (p.reputation > 45 ? 0.5 : 0.16);
      var interest = fit * opening(state, team, rng) * regionMod;
      /* factor suerte: alguien se fija en ti sin motivo evidente */
      interest *= rng.range(0.55, 1.5);
      /* las estructuras pequeñas viven de apostar por chavales */
      if (team.tier === 3 && p.age <= 20) interest *= 1.35;
      if (team.tier === 1 && score < req - 8) interest *= 0.05;
      if (interest > 0.08) scored.push({ team: team, interest: interest, req: req });
    });

    scored.sort(function (a, b) { return b.interest - a.interest; });

    var maxOffers = 0;
    var top = scored.length ? scored[0].interest : 0;
    if (top > 0.12) maxOffers = 1;
    if (top > 0.26) maxOffers = 2;
    if (top > 0.42) maxOffers = 3;
    if (top > 0.60) maxOffers = 4;
    if (top > 0.75 && rng.chance(0.5)) maxOffers = 5;

    var picked = scored.slice(0, Math.min(scored.length, maxOffers + 3));
    picked = rng.sample(picked, maxOffers);

    picked.forEach(function (s) {
      offers.push(buildOffer(state, rng, s.team, score, false));
    });

    /* Renovación del equipo actual */
    if (current && ctx.renewal !== false) {
      var keep = U.logistic(score - requiredScore(current) + 6, 8) *
        (state.career.lastRating > 55 ? 1 : 0.6) *
        (current.synergy > 55 ? 1.1 : 0.9);
      if (rng.chance(U.clamp(keep, 0.05, 0.94))) {
        var o = buildOffer(state, rng, current, score, true);
        offers.unshift(o);
      }
    }

    offers.sort(function (a, b) {
      if (a.isRenewal !== b.isRenewal) return a.isRenewal ? -1 : 1;
      return a.tier - b.tier || b.salary - a.salary;
    });
    return offers;
  }

  function buildOffer(state, rng, team, score, isRenewal) {
    var p = state.player;
    var others = team.roster.filter(function (m) { return !m.isPlayer && m.role !== p.role; });
    var rosterLevel = others.length ? Math.round(U.avg(others, function (m) { return m.rating; })) : team.quality;

    /* A veces te quieren para otra posición: decisión de verdad.
       Solo ocurre cuando tiene sentido: a un jugador asentado y en
       forma nadie le pide que se reinvente.                        */
    var role = p.role;
    var last = state.career.lastRating;
    var reinventable = p.age <= 19 || (last !== null && last < 62);
    if (!isRenewal && reinventable && rng.chance(0.06)) {
      var alt = D.ROLE_LIST.filter(function (r) { return r !== p.role; });
      role = rng.pick(alt);
    }

    var years = team.tier === 1 ? rng.int(1, 3) : rng.int(1, 2);
    return {
      id: 'o' + (state.counters.offer++),
      teamId: team.id,
      teamName: team.name,
      region: team.region,
      tier: team.tier,
      role: role,
      years: years,
      salary: salaryFor(team, score, rng),
      expectation: team.expectation,
      rosterLevel: rosterLevel,
      synergy: team.synergy,
      reputation: team.reputation,
      odds: oddsLabel(team, team.tier),
      isRenewal: !!isRenewal,
      note: role !== p.role ? 'Te quieren como ' + D.ROLES[role].name + ' (' + D.ROLES[role].label + ')' : null
    };
  }

  function acceptOffer(state, offer) {
    var p = state.player;
    var rng = DCS.runtime.get();
    var team = DCS.engine.world.getTeam(state, offer.teamId);
    if (!team) return false;

    var wasTeam = p.teamId;
    if (wasTeam && wasTeam !== team.id) {
      DCS.engine.world.leaveTeam(state, 'transfer');
      p.teamChanges++;
      /* cambiar demasiado desgasta la imagen */
      if (state.career.lastChangeYear && state.year - state.career.lastChangeYear <= 1) {
        p.reputation = U.clamp(p.reputation - 2, 0, 100);
      }
      state.career.lastChangeYear = state.year;
    }
    if (offer.role !== p.role) {
      p.role = offer.role;
      p.overall = DCS.engine.player.overall(p);
    }
    if (team.region !== p.region) p.region = team.region;

    DCS.engine.world.joinTeam(state, team, {
      years: offer.years,
      salary: offer.salary,
      signedYear: state.year,
      expectation: offer.expectation
    });
    p.seasonsWithoutTeam = 0;
    if (offer.isRenewal) {
      team.synergy = U.clamp(team.synergy + 6, 15, 95);
      p.morale = U.clamp(p.morale + 3, 0, 100);
    }
    return true;
  }

  DCS.engine = DCS.engine || {};
  DCS.engine.market = {
    marketScore: marketScore,
    generateOffers: generateOffers,
    acceptOffer: acceptOffer,
    requiredScore: requiredScore,
    salaryFor: salaryFor
  };
})(window.DCS = window.DCS || {});
