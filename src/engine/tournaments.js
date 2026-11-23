/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   ENGINE / TOURNAMENTS — calendario y simulación de eventos
   ------------------------------------------------------------
   El acceso a los grandes torneos NO es automático: hay que
   ganarse la plaza en liga o en clasificatorio. The International
   está deliberadamente lejos: la mayoría de carreras no lo pisan.

   La sesión live permite pausar entre series. Cada serie usa
   exactamente simulateSeries del motor de partidas.
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;
  var D = DCS.data;
  var T = D.TOURNAMENT_TEMPLATES;

  function eventName(rng, template, year) {
    if (template.series) return template.label + ' ' + year;
    if (template.id === 'ti') return 'The International ' + year;
    if (template.kind === 'league' || template.kind === 'qualifier') return null;
    return rng.pick(D.EVENT_HEADS) + ' ' + rng.pick(D.EVENT_TAILS);
  }

  function calendarLabel(template, year) {
    if (!template) return '';
    if (template.series) return template.label + ' ' + year;
    return template.label;
  }

  function label(template, team, rng, year) {
    var nm = eventName(rng, template, year);
    if (nm) return nm;
    if (template.kind === 'league') return template.label + ' · ' + D.REGIONS[team.region].short;
    return template.label + ' · ' + D.REGIONS[team.region].short;
  }

  /* Rivales del evento: se toman equipos reales del mundo y se
     completa con relleno del nivel adecuado si no hay suficientes. */
  function buildField(state, rng, template, team) {
    var pool;
    if (template.regional) {
      pool = DCS.engine.world.teamsIn(state, team.region, null).filter(function (t) {
        return t.id !== team.id && Math.abs(t.tier - template.tier) <= 1;
      });
    } else {
      pool = state.world.teams.filter(function (t) {
        return t.id !== team.id && t.tier <= Math.max(1, template.tier);
      });
    }
    /* los eventos grandes reúnen a los mejores */
    pool.sort(function (a, b) {
      return DCS.engine.world.teamStrength(state, b, false) - DCS.engine.world.teamStrength(state, a, false);
    });
    var need = template.field - 1;
    var chosen;
    if (template.prestige >= 8 || template.strongField) chosen = pool.slice(0, need);
    else if (template.prestige >= 6) chosen = rng.sample(pool.slice(0, Math.min(pool.length, need * 2)), need);
    else chosen = rng.sample(pool, need);

    var strengths = chosen.map(function (t) { return DCS.engine.world.teamStrength(state, t, false); });
    while (strengths.length < need) {
      strengths.push(U.clamp(rng.gauss(template.tier === 1 ? 74 : (template.tier === 2 ? 60 : 45), 6), 10, 95));
    }
    return { teams: chosen, strengths: strengths };
  }

  function lives(template) {
    return (template.kind === 'ti' || template.kind === 'international' || template.kind === 'elite') ? 2 : 1;
  }

  /* Nombre de la ronda contando hacia atrás desde la final */
  function roundName(r, rounds) {
    var left = rounds - r;
    if (left === 0) return 'Final';
    if (left === 1) return 'Semifinal';
    if (left === 2) return 'Cuartos de final';
    if (left === 3) return 'Octavos de final';
    return 'Ronda ' + r;
  }

  function formatLabel(fmt) {
    if (!fmt) return 'BO3';
    return String(fmt).toUpperCase();
  }

  function groupStageName(template) {
    return template.kind === 'league' ? 'Liga regular' : 'Fase de grupos';
  }

  function oppName(live, i) {
    var names = live.names || [];
    if (!names.length) return 'Rival ' + (i + 1);
    return names[((i % names.length) + names.length) % names.length];
  }

  function oppRef(live, i) {
    var teams = (live.field && live.field.teams) || [];
    var t = teams.length ? teams[((i % teams.length) + teams.length) % teams.length] : null;
    return { id: t && t.id, name: oppName(live, i) };
  }

  function playSeries(state, rng, live, team, oppLevel, format, stage, opponent, oppIndex) {
    var r = DCS.engine.match.simulateSeries(state, rng, {
      team: team, teamLevel: live.teamLevel, oppLevel: oppLevel, format: format
    });
    r.maps.forEach(function (m) { DCS.engine.stats.add(live.acc, m.line, m.win); });
    live.seriesPlayed++;
    if (r.won === true) live.seriesWon++; else if (r.won === false) live.seriesLost++;
    var ref = opponent && typeof opponent === 'object' ? opponent : oppRef(live, oppIndex || 0);
    var entry = {
      stage: stage,
      opp: ref,
      oppId: ref.id,
      fmt: format,
      w: r.mapsWon,
      l: r.mapsLost,
      won: r.won,
      maps: r.maps.map(function (m) { return m.win ? 'W' : 'L'; }).join('')
    };
    live.log.push(entry);
    live.last = {
      stage: stage,
      opp: ref,
      format: format,
      formatLabel: formatLabel(format),
      w: r.mapsWon,
      l: r.mapsLost,
      won: r.won,
      maps: r.maps.map(function (m) {
        return { win: m.win, line: m.line };
      })
    };
    return r;
  }

  function closeTournament(state, rng, live, team, template) {
    var placement = live.placement;
    var teamPrize = 0;
    if (template.prize) {
      var split = D.PRIZE_SPLIT[Math.min(placement - 1, D.PRIZE_SPLIT.length - 1)] || 0.005;
      teamPrize = template.prize * split;
    }
    var prize = Math.round(teamPrize * D.PLAYER_PRIZE_SHARE);
    team.points += Math.round((template.prestige * 12) * U.clamp(1 - (placement - 1) / template.field, 0, 1));

    var record = {
      id: 'ev' + (state.counters.event++),
      key: template.id,
      name: live.name,
      kind: template.kind,
      prestige: template.prestige,
      teamId: team.id,
      teamName: team.name,
      year: live.year,
      field: template.field,
      placement: placement,
      result: D.resultLabel(placement, template.field, template),
      qualified: template.kind === 'qualifier' ? placement <= 2 : null,
      prize: prize,
      prizePool: template.prize || 0,
      series: template.series || template.id,
      edition: live.year,
      logo: template.logo || null,
      format: template.format,
      playoffFormat: template.playoffFormat,
      participants: template.field,
      maps: live.acc.maps,
      wins: live.acc.wins,
      losses: live.acc.losses,
      seriesPlayed: live.seriesPlayed,
      seriesWon: live.seriesWon,
      seriesLost: live.seriesLost,
      log: live.log,
      opponents: ((live.field && live.field.teams) || []).slice(0, 6).map(function (t) { return t.name; }),
      avgOpp: Math.round(live.avgOpp)
    };
    record.rating = DCS.engine.performance.rate(state, live.acc, {
      role: state.player.role,
      tournaments: [{ placement: placement, field: template.field, prestige: template.prestige }],
      oppLevel: live.avgOpp,
      tier: team.tier
    });
    live.record = record;
    live.done = true;
    live.stage = 'done';
    return record;
  }

  function afterGroups(state, rng, live, team, template) {
    var cut = Math.min(template.field, Math.pow(2, template.playoff));
    var groupRatio = template.groupSeries ? live.groupWins / template.groupSeries : 0.5;
    var needed = 0.42 + (template.prestige >= 8 ? 0.10 : 0) + (template.cutBonus || 0) + rng.range(-0.06, 0.06);
    live.needed = needed;
    var advanced = cut >= template.field ? true : groupRatio >= needed;
    if (!advanced) {
      var lo = cut + 1, hi = template.field;
      var t = U.clamp(1 - groupRatio / Math.max(0.01, needed), 0, 1);
      var placement = Math.round(U.lerp(lo, hi, t * rng.range(0.55, 1)));
      live.placement = U.clamp(placement, lo, hi);
      closeTournament(state, rng, live, team, template);
      return;
    }
    live.stage = 'playoff';
    live.playoffR = 1;
    live.lower = false;
    live.lives = lives(template);
    live.roundsWon = 0;
  }

  function finishPlayoff(state, rng, live, team, template) {
    var cut = Math.min(template.field, Math.pow(2, template.playoff));
    if (live.roundsWon >= template.playoff) live.placement = 1;
    else {
      var hiP = Math.max(2, Math.ceil(cut / Math.pow(2, live.roundsWon)));
      var loP = Math.max(2, Math.ceil(cut / Math.pow(2, live.roundsWon + 1)) + 1);
      live.placement = rng.int(Math.min(loP, hiP), Math.max(loP, hiP));
    }
    closeTournament(state, rng, live, team, template);
  }

  function begin(state, rng, team, template, year, opts) {
    opts = opts || {};
    var field = buildField(state, rng, template, team);
    var names = field.teams.map(function (t) { return t.name; });
    var live = {
      templateId: template.id,
      series: template.series || template.id,
      edition: year,
      logo: template.logo || null,
      name: opts.name || label(template, team, rng, year),
      teamId: team.id,
      teamName: team.name,
      year: year,
      field: {
        teams: field.teams.map(function (t) {
          return { id: t.id, name: t.name, region: t.region, tier: t.tier };
        }),
        strengths: field.strengths.slice()
      },
      names: names,
      avgOpp: field.strengths.length ? U.avg(field.strengths) : 55,
      teamLevel: DCS.engine.world.teamStrength(state, team, true),
      acc: DCS.engine.stats.blank(state.player.role),
      log: [],
      seriesPlayed: 0,
      seriesWon: 0,
      seriesLost: 0,
      groupWins: 0,
      groupI: 0,
      stage: template.groupSeries > 0 ? 'group' : 'playoff',
      playoffR: 1,
      lives: lives(template),
      roundsWon: 0,
      lower: false,
      holdOpp: null,
      placement: null,
      last: null,
      done: false,
      absorbed: false,
      meta: null
    };
    return live;
  }

  function peek(live) {
    if (!live || live.done) return null;
    var template = D.TOURNAMENT_TEMPLATES[live.templateId];
    if (!template) return null;
    if (live.stage === 'group') {
      var i = live.groupI;
      var ref = oppRef(live, i);
      return {
        stage: groupStageName(template),
        format: template.format,
        formatLabel: formatLabel(template.format),
        opp: ref,
        w: 0,
        l: 0
      };
    }
    if (live.stage !== 'playoff') return null;
    var rounds = template.playoff;
    var r = live.playoffR;
    if (live.lower) {
      return {
        stage: 'Bracket inferior · ' + roundName(r, rounds),
        format: template.playoffFormat,
        formatLabel: formatLabel(template.playoffFormat),
        opp: oppRef(live, rounds - r + 1),
        w: 0,
        l: 0
      };
    }
    var fmt = (r === rounds && template.prestige >= 6) ? 'bo5' : template.playoffFormat;
    return {
      stage: roundName(r, rounds),
      format: fmt,
      formatLabel: formatLabel(fmt),
      opp: oppRef(live, rounds - r),
      w: 0,
      l: 0
    };
  }

  function step(state, rng, live, team) {
    if (!live || live.done) return live;
    var template = D.TOURNAMENT_TEMPLATES[live.templateId];
    if (!template || !team) return live;

    if (live.stage === 'group') {
      var i = live.groupI;
      var opp = live.field.strengths[i % live.field.strengths.length] + rng.gauss(0, 2);
      var res = playSeries(state, rng, live, team, opp, template.format,
        groupStageName(template), oppRef(live, i), i);
      if (res.won === true) live.groupWins += 1;
      else if (res.won === null) live.groupWins += 0.5;
      live.groupI++;
      if (live.groupI >= template.groupSeries) afterGroups(state, rng, live, team, template);
      return live;
    }

    if (live.stage === 'playoff') {
      var rounds = template.playoff;
      var r = live.playoffR;
      if (!live.lower) {
        var strengthStep = (r - 1) * 2.4;
        var oppLevel = U.clamp(live.avgOpp + strengthStep + rng.gauss(0, 2.5), 10, 99);
        live.holdOpp = oppLevel;
        var fmt = (r === rounds && template.prestige >= 6) ? 'bo5' : template.playoffFormat;
        var pr = playSeries(state, rng, live, team, oppLevel, fmt,
          roundName(r, rounds), oppRef(live, rounds - r), rounds - r);
        if (pr.won) {
          live.roundsWon++;
          live.playoffR++;
          if (live.playoffR > rounds) finishPlayoff(state, rng, live, team, template);
        } else {
          live.lives--;
          if (live.lives <= 0) finishPlayoff(state, rng, live, team, template);
          else live.lower = true;
        }
        return live;
      }
      var lowerOpp = U.clamp(live.holdOpp - rng.range(1, 4), 10, 99);
      var lr = playSeries(state, rng, live, team, lowerOpp, template.playoffFormat,
        'Bracket inferior · ' + roundName(r, rounds), oppRef(live, rounds - r + 1), rounds - r + 1);
      live.lower = false;
      if (lr.won) {
        live.roundsWon++;
        live.playoffR++;
        if (live.playoffR > rounds) finishPlayoff(state, rng, live, team, template);
      } else {
        finishPlayoff(state, rng, live, team, template);
      }
    }
    return live;
  }

  function runTournament(state, rng, team, template, year, opts) {
    var live = begin(state, rng, team, template, year, opts);
    while (!live.done) step(state, rng, live, team);
    return { record: live.record, acc: live.acc };
  }

  function bracketPath(template) {
    if (!template) return [];
    var n = template.playoff || 0;
    var path = [];
    if (template.groupSeries) path.push(groupStageName(template));
    for (var r = 1; r <= n; r++) path.push(roundName(r, n));
    return path;
  }

  /* --------------------------------------------------------
     Calendario anual según el tier del equipo y sus méritos
     -------------------------------------------------------- */
  function planSeason(state, rng, team) {
    var plan = [];
    if (team.tier === 3) {
      plan.push(T.t3_league);
      if (rng.chance(0.75)) plan.push(T.t3_open);
      if (rng.chance(0.5)) plan.push(T.t3_online);
    } else if (team.tier === 2) {
      plan.push(T.t2_league);
      if (rng.chance(0.85)) plan.push(T.t2_qual);
    } else {
      plan.push(T.t1_league);
      plan.push(T.dreamleague);
      plan.push(T.pgl_wallachia);
      plan.push(T.blast_slam);
      plan.push(T.epl_masters);
    }
    return plan;
  }

  DCS.engine = DCS.engine || {};
  DCS.engine.tournaments = {
    runTournament: runTournament,
    begin: begin,
    step: step,
    peek: peek,
    planSeason: planSeason,
    calendarLabel: calendarLabel,
    buildField: buildField,
    label: label,
    formatLabel: formatLabel,
    roundName: roundName,
    bracketPath: bracketPath
  };
})(window.DCS = window.DCS || {});
