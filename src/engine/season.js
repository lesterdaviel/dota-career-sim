/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   ENGINE / SEASON — máquina de fases del año competitivo
   ------------------------------------------------------------
   Fases: preparación → competición → cierre → mercado → fin de año.
   Cada llamada a advance() ejecuta UNA fase y devuelve su informe.
   Todo lo generado se escribe en el estado inmediatamente: el
   informe que ves tras recargar es exactamente el mismo.
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;
  var D = DCS.data;
  var W = function () { return DCS.engine.world; };

  var PHASES = ['preseason', 'competition', 'review', 'market', 'yearEnd'];

  var PHASE_LABEL = {
    preseason: 'Pretemporada',
    competition: 'Competición',
    review: 'Cierre de temporada',
    market: 'Mercado',
    yearEnd: 'Fin de año'
  };

  function startSeason(state) {
    var p = state.player;
    var team = W().getTeam(state, p.teamId);
    state.season = {
      year: state.year,
      age: p.age,
      phase: 'preseason',
      teamId: p.teamId,
      acc: DCS.engine.stats.blank(p.role),
      stints: [],
      tournaments: [],
      events: [],
      seriesPlayed: 0, seriesWon: 0, seriesLost: 0,
      earnings: { salary: 0, prize: 0, other: 0 },
      oppLevels: [],
      report: null,
      titles: 0,
      role: p.role
    };
    if (team) openStint(state, team);
    return state.season;
  }

  function openStint(state, team) {
    state.season.stints.push({
      teamId: team.id,
      teamName: team.name,
      tier: team.tier,
      region: team.region,
      acc: DCS.engine.stats.blank(state.player.role),
      seriesPlayed: 0, seriesWon: 0, seriesLost: 0
    });
  }

  function currentStint(state) {
    var st = state.season.stints;
    return st.length ? st[st.length - 1] : null;
  }

  function absorb(state, acc, record) {
    DCS.engine.stats.merge(state.season.acc, acc);
    var stint = currentStint(state);
    if (stint) {
      DCS.engine.stats.merge(stint.acc, acc);
      stint.seriesPlayed += record.seriesPlayed;
      stint.seriesWon += record.seriesWon;
      stint.seriesLost += record.seriesLost;
    }
    state.season.seriesPlayed += record.seriesPlayed;
    state.season.seriesWon += record.seriesWon;
    state.season.seriesLost += record.seriesLost;
    state.season.earnings.prize += record.prize;
    state.season.oppLevels.push(record.avgOpp);
    state.season.tournaments.push(record);
    if (record.placement === 1 && record.kind !== 'qualifier') state.season.titles++;
  }

  /* ---------------------------------------------------------
     FASE 1 · PRETEMPORADA
     --------------------------------------------------------- */
  function phasePreseason(state, rng) {
    var p = state.player;
    var team = W().getTeam(state, p.teamId);
    p.trainingMod = 0;

    var ev = DCS.engine.events.draw(state, rng, 'pre', state.season, team ? 0.55 : 0.35);
    var report = {
      type: 'preseason',
      title: 'Pretemporada ' + state.year,
      team: team ? summarizeTeam(state, team) : null,
      plan: [],
      lines: []
    };

    if (team) {
      report.lines.push('Arranca el año con ' + team.name + ' (Tier ' + team.tier + ', ' +
        D.REGIONS[team.region].name + ').');
      report.lines.push('Objetivo del club: ' + (p.contract ? p.contract.expectation : team.expectation) + '.');
      var plan = DCS.engine.tournaments.planSeason(state, rng, team);
      report.plan = plan.map(function (t) { return DCS.engine.tournaments.calendarLabel(t, state.year); });
      state.season.plan = plan.map(function (t) { return t.id; });
    } else {
      report.lines.push(p.age <= 17
        ? 'Sin equipo. Grindeas pubs, entras en ligas amateur y esperas que alguien se fije en ti.'
        : 'Sigues sin equipo. Pubs, tryouts y llamadas que no siempre se devuelven.');
      state.season.plan = [];
    }

    if (ev) { state.season.events.push(ev); report.event = ev; }
    state.season.phase = 'competition';
    return report;
  }

  /* ---------------------------------------------------------
     FASE 2 · COMPETICIÓN (torneos serie a serie)
     --------------------------------------------------------- */
  function initComp(state) {
    state.season.comp = {
      plan: (state.season.plan || []).slice(),
      i: 0,
      segment: 'plan',
      qualifiedIntl: false,
      midFired: false,
      t2Started: false,
      ti: { rolled: false, direct: false, via: null, eligible: false, qualStarted: false, tiStarted: false },
      lines: [],
      event: null,
      tiRecord: null
    };
  }

  function competitionReport(state) {
    var s = state.season;
    var c = s.comp || {};
    var totals = DCS.engine.stats.averages(s.acc);
    return {
      type: 'competition',
      title: 'Temporada ' + state.year,
      tournaments: s.tournaments.slice(),
      lines: c.lines || [],
      ti: c.tiRecord || null,
      event: c.event || null,
      totals: { acc: s.acc, avg: totals }
    };
  }

  function absorbLive(state, live) {
    if (!live || !live.done || live.absorbed || !live.record) return;
    absorb(state, live.acc, live.record);
    live.absorbed = true;
  }

  function maybeMid(state, rng, team, index) {
    var c = state.season.comp;
    if (c.midFired) return;
    if (index !== Math.floor(c.plan.length / 2)) return;
    c.midFired = true;
    var ev = DCS.engine.events.draw(state, rng, 'mid', state.season, 0.45);
    if (ev) { state.season.events.push(ev); c.event = ev; }
    if (team && rng.chance(disbandRisk(team))) {
      midSeasonMove(state, rng, team);
      c.lines.push(team.name + ' disuelve su roster en mitad del año.');
      c.lines.push('Quedas libre. Un nuevo equipo solo llega si aceptas una oferta.');
      c.segment = 'end';
    }
  }

  function applyFinishedLive(state, rng, live) {
    var c = state.season.comp;
    var rec = live.record;
    var team = W().getTeam(state, state.player.teamId);
    var tpl = D.TOURNAMENT_TEMPLATES[live.templateId];
    if (tpl && tpl.kind === 'qualifier' && rec && rec.qualified) c.qualifiedIntl = true;
    if (live.meta && live.meta.kind === 'plan') maybeMid(state, rng, team, live.meta.index);
    if (live.meta && live.meta.kind === 'tiQual') {
      c.ti.qualStarted = true;
      if (rec && rec.placement === 1) {
        c.ti.direct = true;
        c.ti.via = 'Clasificatorio regional';
      }
    }
    if (live.meta && live.meta.kind === 'ti' && rec) {
      rec.via = live.meta.via || c.ti.via;
      c.tiRecord = rec;
      c.ti.tiStarted = true;
      state.career.tiPlayed++;
      if (rec.placement === 1) {
        state.career.tiWon++;
        state.player.reputation = U.clamp(state.player.reputation + 22, 0, 100);
        state.player.morale = U.clamp(state.player.morale + 20, 0, 100);
      }
    }
  }

  function startLive(state, rng, team, template, meta) {
    var live = DCS.engine.tournaments.begin(state, rng, team, template, state.year, {});
    live.meta = meta;
    state.season.liveTour = live;
    state.pending = { type: 'tournament' };
    return { type: 'tournament', title: live.name, blocked: true };
  }

  function rollTiGate(state, rng, team, c) {
    if (c.ti.tiStarted) return null;
    if (!c.ti.rolled) {
      c.ti.rolled = true;
      /* El calendario Tier 1 reparte puntos de 5 torneos grandes al año
         (antes 1-2), así que una temporada media ya acumula mucho más
         que antes. Los umbrales suben en proporción para que la
         invitación directa siga siendo un premio a una temporada
         excepcional, no a una temporada cualquiera. */
      if (team.tier === 1) {
        var pts = team.points;
        var chance = pts >= 650 ? 0.15 : (pts >= 480 ? 0.05 : (pts >= 340 ? 0.013 : 0.001));
        if (rng.chance(chance)) { c.ti.direct = true; c.ti.via = 'Invitación directa'; }
      }
      c.ti.eligible = (team.tier === 1 && team.points >= 200) ||
        (team.tier === 2 && team.quality > 74 && team.points >= 150);
    }
    if (c.ti.direct) return 'ti';
    if (!c.ti.qualStarted && c.ti.eligible) return 'qual';
    return null;
  }

  function continueCompetition(state) {
    var rng = DCS.runtime.get();
    var s = state.season;
    var p = state.player;
    if (!s.comp) initComp(state);
    var c = s.comp;
    var team = W().getTeam(state, p.teamId);

    if (s.liveTour && s.liveTour.done) {
      absorbLive(state, s.liveTour);
      if (!s.liveTour.posted) {
        applyFinishedLive(state, rng, s.liveTour);
        s.liveTour.posted = true;
      }
      s.liveTour = null;
      state.pending = null;
    }

    var pendingEvent = findUnresolvedEvent(state);
    if (pendingEvent) {
      state.pending = { type: 'event', eventId: pendingEvent.id };
      return { type: 'event', blocked: true };
    }

    if (c.segment === 'end' || !team) {
      var report = competitionReport(state);
      s.phase = 'review';
      state.pending = null;
      return report;
    }

    if (c.segment === 'plan') {
      while (c.i < c.plan.length) {
        var idx = c.i;
        var tpl = D.TOURNAMENT_TEMPLATES[c.plan[idx]];
        c.i++;
        if (!tpl) continue;
        if (p.flags.missEvent && tpl.kind !== 'league' && rng.chance(0.8)) {
          p.flags.missEvent = false;
          c.lines.push('Te pierdes ' + tpl.label + '.');
          continue;
        }
        return startLive(state, rng, team, tpl, { kind: 'plan', index: idx });
      }
      c.segment = 't2';
    }

    if (c.segment === 't2') {
      if (!c.t2Started && c.qualifiedIntl && team.tier === 2) {
        c.t2Started = true;
        return startLive(state, rng, team, D.TOURNAMENT_TEMPLATES.t2_intl, { kind: 't2' });
      }
      c.t2Started = true;
      c.segment = 'ti';
    }

    if (c.segment === 'ti') {
      var gate = rollTiGate(state, rng, team, c);
      if (gate === 'qual') {
        c.ti.qualStarted = true;
        return startLive(state, rng, team, D.TOURNAMENT_TEMPLATES.ti_qual, { kind: 'tiQual' });
      }
      if (gate === 'ti') {
        c.ti.tiStarted = true;
        return startLive(state, rng, team, D.TOURNAMENT_TEMPLATES.ti, { kind: 'ti', via: c.ti.via });
      }
      c.segment = 'end';
    }

    var done = competitionReport(state);
    s.phase = 'review';
    state.pending = null;
    return done;
  }

  function playLive(state, rest) {
    var live = state.season.liveTour;
    if (!live || live.done) return live;
    var rng = DCS.runtime.get();
    var team = W().getTeam(state, live.teamId);
    if (!team) return live;
    if (rest) {
      while (!live.done) DCS.engine.tournaments.step(state, rng, live, team);
    } else {
      DCS.engine.tournaments.step(state, rng, live, team);
    }
    absorbLive(state, live);
    state.pending = { type: 'tournament' };
    return live;
  }

  function phaseCompetition(state, rng) {
    var p = state.player;
    var team = W().getTeam(state, p.teamId);

    if (!team && !(state.season.tournaments && state.season.tournaments.length)) {
      var report = { type: 'competition', title: 'Temporada ' + state.year, tournaments: [], lines: [], ti: null };
      var gain = rng.int(120, 620);
      p.mmr = Math.round(U.clamp(p.mmr + gain, 500, 16000));
      if (p.mmr > p.peakMmr) p.peakMmr = p.mmr;
      p.form = U.clamp(p.form + rng.int(-6, 8), 0, 100);
      report.lines.push('Sin competición oficial. Cierras el año con ' + DCS.ui.fmt.mmr(p.mmr) + ' de MMR.');
      if (rng.chance(0.35)) report.lines.push('Un par de equipos te han probado en scrims. Nada firmado.');
      state.season.phase = 'review';
      return report;
    }

    if (!state.season.comp) initComp(state);
    if (state.season.liveTour && !state.season.liveTour.done) {
      state.pending = { type: 'tournament' };
      return { type: 'tournament', title: state.season.liveTour.name, blocked: true };
    }
    return continueCompetition(state);
  }

  function disbandRisk(team) {
    var r = 0.03;
    if (team.resources < 30) r += 0.05;
    if (team.synergy < 40) r += 0.04;
    if (team.tier === 3) r += 0.03;
    return r;
  }

  function midSeasonMove(state, rng, team) {
    var name = team.name;
    W().leaveTeam(state, 'disband');
    state.season.events.push({
      id: 'e' + (state.counters.event++),
      key: 'disband',
      year: state.year,
      age: state.player.age,
      title: name + ' se disuelve',
      text: name + ' cierra el roster a mitad de año. Quedas libre: un nuevo equipo solo llega si aceptas una oferta.',
      tone: 'bad',
      options: [],
      resolved: true,
      outcome: 'Quedas sin equipo.'
    });
    return null;
  }

  /* Camino a The International: invitación directa o clasificatorio.
     Deliberadamente difícil: es el techo del juego.               */
  function tiPath(state, rng, team, report) {
    var qualified = false, via = null;

    if (team.tier === 1) {
      var pts = team.points;
      var chance = pts >= 185 ? 0.70 : (pts >= 135 ? 0.32 : (pts >= 95 ? 0.11 : 0.015));
      if (rng.chance(chance)) { qualified = true; via = 'Invitación directa'; }
    }
    /* al clasificatorio solo llegan los que han hecho algo durante el año */
    var eligible = (team.tier === 1 && team.points >= 40) || (team.tier === 2 && team.quality > 70 && team.points >= 55);
    if (!qualified && eligible) {
      var q = DCS.engine.tournaments.runTournament(state, rng, team, D.TOURNAMENT_TEMPLATES.ti_qual, state.year);
      absorb(state, q.acc, q.record);
      report.tournaments.push(q.record);
      if (q.record.placement === 1) { qualified = true; via = 'Clasificatorio regional'; }
    }
    if (!qualified) return null;

    var ti = DCS.engine.tournaments.runTournament(state, rng, team, D.TOURNAMENT_TEMPLATES.ti, state.year);
    absorb(state, ti.acc, ti.record);
    report.tournaments.push(ti.record);
    ti.record.via = via;
    state.career.tiPlayed++;
    if (ti.record.placement === 1) {
      state.career.tiWon++;
      state.player.reputation = U.clamp(state.player.reputation + 22, 0, 100);
      state.player.morale = U.clamp(state.player.morale + 20, 0, 100);
    }
    return ti.record;
  }

  /* ---------------------------------------------------------
     FASE 3 · CIERRE DE TEMPORADA
     --------------------------------------------------------- */
  function phaseReview(state, rng) {
    var p = state.player;
    var team = W().getTeam(state, p.teamId);
    var s = state.season;
    var acc = s.acc;

    var rating = acc.maps
      ? DCS.engine.performance.rate(state, acc, {
        role: p.role,
        tournaments: s.tournaments.map(function (t) {
          return { placement: t.placement, field: t.field, prestige: t.prestige };
        }),
        oppLevel: s.oppLevels.length ? U.avg(s.oppLevels) : 50,
        tier: team ? team.tier : 3
      })
      : null;

    /* salario del año */
    if (p.contract && p.contract.salary) s.earnings.salary += p.contract.salary;
    state.career.earnings.salary += s.earnings.salary;
    state.career.earnings.prize += s.earnings.prize;

    /* reputación: sube con nivel, títulos y prestigio; baja sin nada que enseñar */
    var repDelta = 0;
    if (rating !== null) {
      /* el listón se mide contra lo esperable en su tier, no en abstracto:
         un buen año en Tier 3 también construye nombre, solo que más despacio */
      var tier = team ? team.tier : 3;
      var bar = tier === 1 ? 62 : (tier === 2 ? 55 : 48);
      repDelta += (rating - bar) * 0.12;
      repDelta += tier === 1 ? 2.2 : (tier === 2 ? 1.5 : 0.9);
      s.tournaments.forEach(function (t) {
        var q = DCS.engine.performance.tournamentQuality(t);
        repDelta += q * t.prestige * 0.18;
      });
    } else {
      repDelta -= 4 + p.seasonsWithoutTeam * 1.5;
    }
    repDelta -= p.reputation * 0.09;                       /* la fama se evapora sola */
    p.reputation = U.clamp(p.reputation + repDelta, 0, 100);

    /* moral: expectativas cumplidas o no */
    if (rating !== null) {
      var moraleDelta = (rating - 60) * 0.35 + (s.titles * 5);
      p.morale = U.clamp(p.morale + moraleDelta * rng.range(0.6, 1.4), 3, 100);
      p.form = U.clamp(50 + (rating - 60) * 0.5 + rng.gauss(0, 8), 5, 98);
    } else {
      p.morale = U.clamp(p.morale - rng.int(3, 12), 3, 100);
      p.form = U.clamp(p.form - rng.int(0, 8), 5, 98);
    }

    /* desarrollo */
    var mates = team ? team.roster.filter(function (m) { return !m.isPlayer; }) : [];
    var dev = DCS.engine.progression.develop(state, rng, {
      rating: rating,
      teammateLevel: mates.length ? U.avg(mates, function (m) { return m.rating; }) : null,
      mapsPlayed: acc.maps,
      played: !!team && acc.maps > 0
    });

    if (team) {
      p.proYears++;
      p.tierYears[team.tier] = (p.tierYears[team.tier] || 0) + 1;
      team.roster.forEach(function (m) { if (m.isPlayer) m.rating = p.overall; });
      /* la química crece con el tiempo juntos */
      team.synergy = U.clamp(team.synergy + rng.int(1, 7), 10, 96);
      team.quality = W().rosterQuality(team);
    } else {
      p.seasonsWithoutTeam++;
    }

    /* histórico permanente */
    var record = buildSeasonRecord(state, rating, dev, team);
    DCS.engine.finance.pull(state);
    state.history.push(record);
    state.career.lastRating = rating;
    updateCareerTotals(state, record);

    var ev = DCS.engine.events.draw(state, rng, 'post', state.season, 0.45);
    if (ev) { s.events.push(ev); }

    s.rating = rating;
    s.phase = 'market';

    return {
      type: 'review',
      title: 'Cierre de ' + state.year,
      rating: rating,
      record: record,
      dev: dev,
      repDelta: Math.round(repDelta * 10) / 10,
      event: ev || null
    };
  }

  function buildSeasonRecord(state, rating, dev, team) {
    var s = state.season;
    var p = state.player;
    var best = null;
    s.tournaments.forEach(function (t) {
      if (t.kind === 'qualifier') return;
      var q = DCS.engine.performance.tournamentQuality(t);
      if (!best || q > best.q) best = { q: q, label: t.result + ' · ' + t.name, placement: t.placement, name: t.name };
    });
    /* una etapa sin un solo mapa no cuenta como etapa */
    var stints = s.stints.filter(function (x) { return x.acc.maps > 0; });
    if (!stints.length) stints = s.stints;

    return {
      year: s.year,
      age: s.age,
      role: s.role,
      teamId: s.teamId,
      teamName: stints.length ? stints.map(function (x) { return x.teamName; }).join(' / ') : 'Sin equipo',
      tier: team ? team.tier : null,
      stints: stints.map(function (x) {
        return {
          teamId: x.teamId, teamName: x.teamName, tier: x.tier, region: x.region,
          acc: x.acc, seriesPlayed: x.seriesPlayed, seriesWon: x.seriesWon, seriesLost: x.seriesLost
        };
      }),
      acc: s.acc,
      seriesPlayed: s.seriesPlayed,
      seriesWon: s.seriesWon,
      seriesLost: s.seriesLost,
      tournaments: s.tournaments,
      titles: s.titles,
      bestResult: best ? best.label : (s.tournaments.length ? 'Sin resultados destacados' : 'Sin competición oficial'),
      rating: rating,
      earnings: { salary: s.earnings.salary, prize: s.earnings.prize, other: s.earnings.other },
      mmrEnd: p.mmr,
      overallEnd: p.overall,
      reputationEnd: Math.round(p.reputation),
      events: s.events.map(function (e) {
        return { title: e.title, text: e.text, outcome: e.outcome, chosen: e.chosen, tone: e.tone };
      }),
      devNotes: dev ? dev.notes : []
    };
  }

  function updateCareerTotals(state, r) {
    var c = state.career;
    if (!c.rolesPlayed) c.rolesPlayed = {};
    if (r.acc.maps) c.rolesPlayed[r.role] = (c.rolesPlayed[r.role] || 0) + r.acc.maps;
    c.maps += r.acc.maps;
    c.wins += r.acc.wins;
    c.losses += r.acc.losses;
    c.seriesPlayed += r.seriesPlayed;
    c.seriesWon += r.seriesWon;
    c.seriesLost += r.seriesLost;
    c.titles += r.titles;
    c.tournaments += r.tournaments.filter(function (t) { return t.kind !== 'qualifier'; }).length;
    DCS.engine.stats.merge(c.acc, DCS.engine.stats.clone(r.acc));
    if (r.rating !== null && (c.bestRating === null || r.rating > c.bestRating)) {
      c.bestRating = r.rating;
      c.bestSeason = r.year;
    }
  }

  /* ---------------------------------------------------------
     FASE 4 · MERCADO
     --------------------------------------------------------- */
  function phaseMarket(state, rng) {
    var p = state.player;
    var team = W().getTeam(state, p.teamId);
    var contractOver = !p.contract || p.contract.years <= 1;

    var wantOffers = !team || contractOver || rng.chance(0.30);
    var offers = wantOffers ? DCS.engine.market.generateOffers(state, rng, { renewal: contractOver }) : [];

    state.offers = offers;
    state.season.phase = 'yearEnd';

    return {
      type: 'market',
      title: 'Mercado ' + state.year,
      offers: offers,
      contractOver: contractOver,
      hasTeam: !!team,
      marketScore: Math.round(DCS.engine.market.marketScore(state, rng))
    };
  }

  /* ---------------------------------------------------------
     FASE 5 · FIN DE AÑO
     --------------------------------------------------------- */
  function phaseYearEnd(state, rng) {
    var p = state.player;
    var notes = [];
    var team = W().getTeam(state, p.teamId);

    /* contrato: el año de la firma todavía no cuenta */
    if (p.contract && p.contract.years > 0 && p.contract.signedYear !== state.year) {
      p.contract.years--;
      if (p.contract.years <= 0 && team) {
        if (rng.chance(0.45)) {
          notes.push('Tu contrato con ' + team.name + ' expira. Sales al mercado.');
          W().leaveTeam(state, 'contract');
        } else {
          p.contract.years = 1;
          notes.push('Sigues bajo contrato con ' + team.name + ' un año más.');
        }
      }
    } else if (team && !p.contract) {
      W().leaveTeam(state, 'no-contract');
    }

    /* el mundo se mueve */
    W().evolveWorld(state, rng, notes);
    state.offers = [];
    delete p.flags.provisional;

    DCS.engine.finance.pull(state);
    var tick = DCS.engine.finance.closeYear(state);

    /* edad */
    p.age++;
    state.year++;

    var result = { type: 'yearEnd', title: 'Fin de ' + (state.year - 1), notes: notes, age: p.age,
      finances: tick };

    if (p.age >= 38) {
      result.forcedRetirement = true;
      return result;
    }

    var prop = DCS.engine.retirement.evaluate(state, rng);
    if (prop) {
      state.pending = { type: 'retirement', data: prop };
      result.retirementPrompt = prop;
    } else {
      var spec = DCS.engine.finance.maybeSpecial(state);
      if (spec) state.pending = spec;
    }
    return result;
  }

  function summarizeTeam(state, team) {
    return {
      id: team.id, name: team.name, tier: team.tier, region: team.region,
      quality: W().rosterQuality(team), synergy: team.synergy,
      reputation: team.reputation, expectation: team.expectation, style: team.style,
      roster: team.roster
    };
  }

  /* ---------------------------------------------------------
     API
     --------------------------------------------------------- */
  function advance(state) {
    if (state.pending) return { blocked: true, pending: state.pending };
    if (state.finished) return { finished: true };

    var rng = DCS.runtime.get();
    if (!state.season || state.season.phase === 'done') startSeason(state);

    var phase = state.season.phase;
    /* el mercado es una decisión: no se cierra el año dejándolo sin responder */
    if (phase === 'yearEnd' && state.offers && state.offers.length) {
      return { blocked: true, reason: 'offers', offers: state.offers.length };
    }

    var report;
    if (phase === 'preseason') report = phasePreseason(state, rng);
    else if (phase === 'competition') report = phaseCompetition(state, rng);
    else if (phase === 'review') report = phaseReview(state, rng);
    else if (phase === 'market') report = phaseMarket(state, rng);
    else if (phase === 'yearEnd') {
      report = phaseYearEnd(state, rng);
      state.season.phase = 'done';
      if (report.forcedRetirement) {
        DCS.engine.retirement.retire(state, 'age');
        report.legacy = state.legacy;
      }
    }

    /* si el evento generado exige decisión, bloquea el avance */
    var pendingEvent = findUnresolvedEvent(state);
    if (pendingEvent && !state.pending) {
      state.pending = { type: 'event', eventId: pendingEvent.id };
    }

    state.season.report = report;
    state.lastReport = report;
    return report;
  }

  function findUnresolvedEvent(state) {
    if (!state.season) return null;
    var evs = state.season.events;
    for (var i = 0; i < evs.length; i++) if (!evs[i].resolved) return evs[i];
    return null;
  }

  function resolvePendingEvent(state, optionIndex) {
    var ev = findUnresolvedEvent(state);
    if (!ev) { state.pending = null; return null; }
    var rng = DCS.runtime.get();
    var text = DCS.engine.events.resolve(state, rng, ev, optionIndex, state.season);
    state.pending = null;
    return { event: ev, outcome: text };
  }

  DCS.engine = DCS.engine || {};
  DCS.engine.season = {
    PHASES: PHASES,
    PHASE_LABEL: PHASE_LABEL,
    startSeason: startSeason,
    advance: advance,
    continueCompetition: continueCompetition,
    playLive: playLive,
    resolvePendingEvent: resolvePendingEvent,
    findUnresolvedEvent: findUnresolvedEvent,
    summarizeTeam: summarizeTeam
  };
})(window.DCS = window.DCS || {});
