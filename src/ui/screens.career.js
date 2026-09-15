/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   UI / SCREENS · PERFIL, EQUIPO, TEMPORADA, OFERTAS, CARRERA
   ============================================================ */
(function (DCS) {
  'use strict';

  var c = DCS.ui.c, fmt = DCS.ui.fmt, D = DCS.data, U = DCS.util;
  var S = DCS.ui.screens = DCS.ui.screens || {};
  var ch = function () { return DCS.ui.charts; };

  function pnlClass(n) {
    return n > 0 ? 'good' : (n < 0 ? 'bad' : 'muted');
  }

  function catLabel(id) {
    var list = DCS.data.WEALTH_CATS || [];
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i].name;
    return id;
  }

  function competitionTally(state) {
    var series = D.COMPETITIONS || [];
    var map = {};
    series.forEach(function (s) {
      map[s.id] = { id: s.id, name: s.name, rank: s.rank, played: 0, wins: 0 };
    });
    function eat(t) {
      if (!t) return;
      var id = t.series || t.key;
      if (!map[id] || t.kind === 'qualifier') return;
      map[id].played++;
      if (t.placement === 1) map[id].wins++;
    }
    (state.history || []).forEach(function (h) {
      (h.tournaments || []).forEach(eat);
    });
    if (state.season && state.season.tournaments) state.season.tournaments.forEach(eat);
    return series.map(function (s) { return map[s.id]; });
  }

  function competitionCircuitCard(state) {
    var rows = competitionTally(state).map(function (s) {
      var rank = s.rank === 'ti' ? 'Máximo nivel' : 'Internacional';
      var rec = s.played
        ? (s.wins ? s.wins + ' título' + (s.wins === 1 ? '' : 's') + ' · ' + s.played + ' ediciones' : s.played + ' ediciones')
        : rank;
      return '<div class="kv"><span>' + c.esc(s.name) + '</span><span>' + rec + '</span></div>';
    }).join('');
    return c.card({
      title: 'Circuito',
      subtitle: 'La misma competición se reedita cada temporada. The International es el techo.',
      body: rows
    });
  }

  S.finances = function (state) {
    var snap = DCS.engine.finance.snapshot(state);
    var done = !!state.finished;
    var head = '<div class="page-head"><div><div class="eyebrow">Lo que ganas en el servidor no es el final</div><h2>Patrimonio</h2><p>Earnings es historia. El cash es lo que puedes mover. El patrimonio es lo que queda.</p></div></div>';
    var k = c.kpis([
      c.kpi('Cash', fmt.money(snap.cash), 'disponible', 'gold', { v: snap.cash, fmt: 'money' }),
      c.kpi('Patrimonio', fmt.money(snap.net), 'neto', null, { v: snap.net, fmt: 'money' }),
      c.kpi('Earnings', fmt.money(snap.earnings), 'histórico de carrera', null, { v: snap.earnings, fmt: 'money' })
    ]);
    var buckets = '<div class="finance-grid">' + snap.buckets.map(function (b) {
      var d = b.value - b.put;
      return '<article class="wealth-card">' +
        '<div class="asset-type">' + c.esc(b.name) + '</div>' +
        '<div class="asset-value">' + fmt.money(b.value) + '</div>' +
        '<div class="risk-row"><span>Riesgo: ' + c.esc(b.risk) + '</span><span>Potencial: ' + c.esc(b.potential) + '</span></div>' +
        '<p>' + c.esc(b.blurb) + '</p>' +
        '<div class="kv"><span>Invertido</span><span>' + fmt.money(b.put) + '</span></div>' +
        '<div class="kv"><span>Variación</span><span class="' + pnlClass(d) + '">' + (d > 0 ? '+' : '') + fmt.money(d) + '</span></div>' +
        '</article>';
    }).join('') + '</div>';
    var sellBody = !done ? '<div class="wealth-invest">' + snap.buckets.filter(function(b){return b.value>0&&b.id!=='tech';}).map(function(b){var n=Math.min(25000,b.value);return '<div class="wealth-invest-row"><div><b>Vender '+c.esc(b.name)+'</b><span class="small muted">Incluye costes de salida</span></div>'+c.btn(fmt.money(n),'wealth-withdraw',{value:b.id+':'+n,variant:'ghost'})+'</div>';}).join('') + '</div>' : '';
    var pnl = snap.pnl;
    var yieldCard = c.card({
      title: 'Rendimiento histórico',
      body: c.kpis([
        c.kpi('Invertido', fmt.money(snap.invested), null, null, { v: snap.invested, fmt: 'money' }),
        c.kpi('Valor actual', fmt.money(snap.current), null, 'gold', { v: snap.current, fmt: 'money' }),
        c.kpi('Ganancia / pérdida', (pnl > 0 ? '+' : '') + fmt.money(pnl), null, pnl >= 0 ? 'good' : 'bad', { v: pnl, fmt: 'money' })
      ])
    });
    var tick = snap.lastTick;
    var yearBody = '';
    if (tick && tick.notes && tick.notes.length) {
      yearBody = '<ul class="lines">' + tick.notes.map(function (n) { return '<li>' + c.esc(n) + '</li>'; }).join('') + '</ul>';
    } else {
      yearBody = '<p class="muted small">Sin movimientos de mercado este año. Mantener cash también cuenta.</p>';
    }
    if (snap.climate) {
      yearBody = '<p class="wealth-climate">' + c.esc(snap.climate.title) + ' — ' + c.esc(snap.climate.note) + '</p>' + yearBody;
    }
    var yearCard = c.card({ title: 'Clima del circuito', subtitle: tick && tick.year ? String(tick.year) : 'Todavía no ha cerrado un año con inversiones.', body: yearBody });
    var amounts = snap.amounts || [];
    var investBody;
    if (done) {
      investBody = '<p class="muted small">La carrera ya está cerrada. Esto es lo que construiste.</p>';
    } else if (snap.cash < 10000) {
      investBody = '<p class="muted small">Todavía no hay liquidez suficiente para mover ficha. Gana en el servidor y vuelve.</p>';
    } else if (!amounts.length) {
      investBody = '<p class="muted small">Tienes efectivo, pero no llega al mínimo para una ronda.</p>';
    } else {
      investBody = '<p class="small muted">Elige categoría y cantidad. No hay cifras de retorno. El año decide.</p>' +
        '<div class="wealth-invest">' + snap.buckets.map(function (b) {
          var btns = amounts.map(function (n) {
            return c.btn(fmt.money(n), 'wealth-invest', { value: b.id + ':' + n, variant: 'ghost' });
          }).join('');
          return '<div class="wealth-invest-row"><div><b>' + c.esc(b.name) + '</b><span class="small muted">Riesgo ' + c.esc(b.risk) + '</span></div><div class="row">' + btns + '</div></div>';
        }).join('') + '</div>' +
        '<p class="small muted mt">O no hagas nada: el cash no se mueve solo.</p>';
    }
    var investCard = c.card({ title: '¿Qué haces con el dinero?', subtitle: 'Pocas decisiones. Sin microgestión.', body: investBody });
    if(!done && snap.cash>=25000) investCard += c.card({title:'Lujo y estilo de vida',subtitle:'No produce rentabilidad.',body:'<p class="small muted">Mejora moderadamente moral y reputación, pero el dinero no vuelve. Gastado: '+fmt.money(snap.luxurySpent||0)+'</p><div class="row">'+c.btn('Gastar '+fmt.money(25000),'wealth-luxury',{value:'25000',variant:'ghost'})+(snap.cash>=100000?c.btn('Gastar '+fmt.money(100000),'wealth-luxury',{value:'100000',variant:'ghost'}):'')+'</div>'});
    return head + k + yieldCard + c.card({ title: 'Inversiones', body: buckets + sellBody }) + yearCard + investCard;
  };

  S.liveTournament = function (state) {
    var live = state.season && state.season.liveTour;
    if (!live) return c.empty('No hay un torneo en curso.');
    var me = DCS.game.team() || { id: live.teamId, name: live.teamName };
    var peek = DCS.engine.tournaments.peek(live);
    var tpl = D.TOURNAMENT_TEMPLATES[live.templateId];
    var path = DCS.engine.tournaments.bracketPath(tpl);
    var last = live.last;
    var next = peek;

    var head = '<div class="page-head"><div><div class="eyebrow">Serie a serie</div><h2>' + c.esc(live.name) + '</h2>' +
      '<p>' + (next ? c.esc(next.stage) : (live.record ? c.esc(live.record.result) : 'Torneo cerrado')) + '</p></div></div>';

    var show = next || (last && last.opp ? {
      stage: last.stage, formatLabel: last.formatLabel, opp: last.opp, w: last.w, l: last.l
    } : null);

    var vs = '';
    if (show) {
      vs = '<div class="match-vs">' +
        '<div class="match-side">' + c.teamMark(me, 'md') + '<span class="match-name">' + c.esc(me.name) + '</span></div>' +
        '<div class="match-mid">' +
          '<div class="match-stage">' + c.esc(show.stage) + '</div>' +
          '<div class="match-score">' + (next ? '0-0' : (show.w + '-' + show.l)) + '</div>' +
          '<div class="match-fmt">' + c.esc(show.formatLabel || DCS.engine.tournaments.formatLabel(show.format)) + '</div>' +
        '</div>' +
        '<div class="match-side">' + c.teamMark(show.opp, 'md') + '<span class="match-name">' + c.esc(show.opp.name) + '</span></div>' +
        '</div>';
    }

    var fate = '';
    if (last && !live.done) {
      if (last.won === true) fate = '<p class="good">Avanzas. Siguiente serie abajo.</p>';
      else if (last.won === false) fate = '<p class="bad">Derrota. Sigues con vida en el bracket.</p>';
      else fate = '<p class="muted">Empate en la serie.</p>';
    }
    if (live.done && live.record) {
      if (live.record.placement === 1) fate = '<p class="good">Ganas el torneo. ' + c.esc(live.record.result) + '.</p>';
      else if (last && last.won === false) fate = '<p class="bad">Eliminado. ' + c.esc(live.record.result) + '.</p>';
      else fate = '<p>' + c.esc(live.record.result) + '</p>';
    }

    var lastCard = '';
    if (last) {
      var acc = DCS.engine.stats.blank(state.player.role);
      (last.maps || []).forEach(function (m) { DCS.engine.stats.add(acc, m.line, m.win); });
      var avg = DCS.engine.stats.averages(acc);
      var resTxt = last.won === true ? 'Victoria' : (last.won === false ? 'Derrota' : 'Empate');
      lastCard = c.card({
        title: 'Serie jugada',
        meta: c.badge(resTxt, last.won === true ? 'gold' : 'muted'),
        body: '<div class="kv"><span>Marcador</span><span>' + last.w + '-' + last.l + '</span></div>' +
          '<div class="kv"><span>Mapas</span><span>' + acc.wins + ' ganados · ' + acc.losses + ' perdidos</span></div>' +
          (acc.maps ? '<div class="mt">' + c.statBars(state.player.role, avg) + '</div>' : '')
      });
    }

    var stagesHtml = '<div class="bracket-path">' + path.map(function (st) {
      var played = live.log.filter(function (x) { return x.stage === st || (x.stage && x.stage.indexOf(st) >= 0 && st !== 'Fase de grupos' && st !== 'Liga regular'); });
      if (st.indexOf('grupos') >= 0 || st.indexOf('Liga') >= 0) {
        played = live.log.filter(function (x) { return x.stage === st; });
      }
      var isNext = next && next.stage === st;
      var bits = played.map(function (x) {
        var nm = x.opp && x.opp.name ? x.opp.name : x.opp;
        return '<span class="' + (x.won === true ? 'good' : (x.won === false ? 'bad' : 'muted')) + '">' +
          c.esc(nm) + ' ' + x.w + '-' + x.l + '</span>';
      }).join(' · ');
      return '<div class="bracket-step' + (isNext ? ' now' : '') + '"><b>' + c.esc(st) + '</b>' +
        (bits ? '<div class="small">' + bits + '</div>' : (isNext ? '<div class="small">Siguiente</div>' : '<div class="small muted">—</div>')) +
        '</div>';
    }).join('') + '</div>';

    if (live.done && live.record) {
      stagesHtml += '<p class="mt"><b>Posición final:</b> ' + c.esc(live.record.result) +
        ' · ' + live.record.seriesWon + '-' + live.record.seriesLost + ' series</p>';
    }

    var actions = live.done
      ? c.btn('Continuar', 'tour-continue', { variant: 'primary' })
      : c.btn('Simular serie', 'tour-series', { variant: 'primary' }) +
        c.btn('Simular torneo', 'tour-rest', { variant: 'ghost' });

    var history = (live.log && live.log.length)
      ? c.card({ title: 'Series jugadas', body: c.seriesList(live.log) })
      : '';

    return head + c.card({ title: next ? 'Próxima serie' : 'Resultado', body: vs + fate + '<div class="row mt match-actions">' + actions + '</div>' }) +
      lastCard +
      history +
      c.card({ title: 'Camino al título', subtitle: 'De la fase actual hasta la eliminación o el campeonato.', body: stagesHtml });
  };

  S.tournaments = function (state) {
    var live = state.season && state.season.liveTour;
    if (live) return S.liveTournament(state);

    var head = '<div class="page-head"><div><div class="eyebrow">Calendario competitivo</div><h2>Torneos</h2>' +
      '<p>Cada serie se decide aquí: enfrentamiento, formato y camino en el bracket.</p></div></div>';

    var remaining = [];
    var comp = state.season && state.season.comp;
    var plan = (comp && comp.plan) || (state.season && state.season.plan) || [];
    var start = comp ? comp.i : 0;
    for (var i = start; i < plan.length; i++) {
      var tpl = D.TOURNAMENT_TEMPLATES[plan[i]];
      if (tpl) remaining.push(DCS.engine.tournaments.calendarLabel(tpl, state.year));
    }

    var body = '<p class="muted">No hay un torneo en juego. Abre el siguiente evento avanzando la temporada.</p>';
    if (remaining.length) {
      body += '<p class="small muted mt">Siguiente en el calendario:</p><ul class="lines">' +
        remaining.map(function (n) { return '<li>' + c.esc(n) + '</li>'; }).join('') + '</ul>';
    }
    var done = state.season && state.season.tournaments ? state.season.tournaments : [];
    if (done.length) {
      body += '<p class="small muted mt">Ya disputados esta temporada:</p>' +
        done.map(function (t, idx) { return c.resultRow(t, false, idx); }).join('');
    }

    return head + c.card({ title: 'Sin serie pendiente', body: body }) + competitionCircuitCard(state);
  };

  /* ---------------------------------------------------------
     PERFIL
     --------------------------------------------------------- */
  S.profile = function (state, tab) {
    var p = state.player;
    var role = D.ROLES[p.role];
    var perceived = DCS.engine.player.perceivedPotential(p, null);
    var opinion = DCS.engine.player.scoutingOpinion(perceived);
    var careerAvg = DCS.engine.stats.averages(state.career.acc);

    var head = '<div class="page-head"><div><h2>Perfil</h2><div class="sub">' +
      c.esc(p.nick) + ' · ' + D.ARCHETYPES[p.archetype].name + ' · ' + p.age + ' años</div></div>' +
      '<div class="head-right">' + c.posChipFull(p.role) + c.badge('General ' + p.overall, 'info') + '</div></div>' +
      c.tabs([
        { id: 'attrs', label: 'Atributos' },
        { id: 'evo', label: 'Evolución' },
        { id: 'stats', label: 'Estadísticas' }
      ], tab, 'tab-profile');

    if (tab === 'evo') {
      var evo = state.history.map(function (h) { return { label: h.year, value: h.overallEnd }; });
      var ratings = state.history.map(function (h) { return { label: h.year, value: h.rating }; });
      var mmr = state.history.map(function (h) { return { label: h.year, value: h.mmrEnd }; });
      return head +
        c.card({ title: 'Valoración general', subtitle: 'Tu nivel real año a año.', body: ch().sparkline(evo, { color: '#ff6b3d' }) }) +
        c.card({ title: 'Rating de temporada', subtitle: 'Cómo te evaluó el circuito cada año.', body: ch().sparkline(ratings, { color: '#1fd9b0', min: 0, max: 100 }), delay: 60 }) +
        c.card({ title: 'MMR', subtitle: 'Habilidad individual pura. Importa, pero no manda.', body: ch().sparkline(mmr, { color: '#4d9dff' }), delay: 120 });
    }

    if (tab === 'stats') {
      if (!state.career.acc || !state.career.acc.maps) {
        return head + c.card({ title: 'Sin datos', body: c.empty('Todavía no has disputado mapas oficiales.') });
      }
      return head +
        c.card({
          title: 'Promedios de carrera · ' + role.name, meta: state.career.maps + ' mapas',
          body: c.statGrid(p.role, careerAvg)
        }) +
        c.card({
          title: 'Frente al baremo de tu posición',
          subtitle: 'Dónde caen tus números entre un jugador flojo y uno de élite en ' + role.name + '.',
          body: c.statBars(p.role, careerAvg), delay: 60
        });
    }

    return head +
      '<div class="grid grid-2">' +
      c.card({
        title: 'Atributos', meta: c.badge('General ' + p.overall, 'info'),
        body: D.ATTRS.map(function (a) { return c.attrRow(a.label, p.attrs[a.key]); }).join('') +
          '<p class="small muted mt">La valoración general se pondera con los criterios de ' + role.name +
          '. Un ' + role.name + ' y un Hard Support no necesitan lo mismo para llegar a 90.</p>'
      }) +
      c.card({
        title: 'Estado y percepción',
        body: c.tiles([
          c.tile('Forma', Math.round(p.form)),
          c.tile('Moral', Math.round(p.morale)),
          c.tile('Reputación', Math.round(p.reputation)),
          c.tile('Experiencia', Math.round(p.experience)),
          c.tile('MMR', fmt.mmr(p.mmr), null, null, { v: p.mmr, fmt: 'mmr' }),
          c.tile('MMR máximo', fmt.mmr(p.peakMmr), null, null, { v: p.peakMmr, fmt: 'mmr' })
        ]) +
          '<div class="mt">' +
          '<div class="kv"><span>Opinión del scouting</span><span>' + opinion + '</span></div>' +
          '<div class="kv"><span>Mejor valoración alcanzada</span><span>' + p.peakOverall + '</span></div>' +
          '<div class="kv"><span>Equipos en su carrera</span><span>' + p.teamsPlayed.length + '</span></div></div>' +
          '<p class="small muted mt">Nadie conoce tu techo real, ni siquiera tú. Solo se descubre jugando.</p>',
        delay: 60
      }) +
      '</div>';
  };

  /* ---------------------------------------------------------
     EQUIPO
     --------------------------------------------------------- */
  S.team = function (state) {
    var team = DCS.game.team();
    if (!team) {
      return '<div class="page-head"><div><h2>Equipo</h2><div class="sub">Agente libre</div></div></div>' +
        c.card({
          title: 'Sin equipo',
          body: '<p class="muted">Ahora mismo no perteneces a ninguna organización. Grindeas pubs, ' +
            'juegas tryouts y esperas que alguien se fije en ti en el mercado.</p>' +
            '<div class="kv"><span>Temporadas seguidas sin equipo</span><span>' + state.player.seasonsWithoutTeam + '</span></div>'
        });
    }

    var rows = team.roster.map(function (m) {
      return {
        attrs: m.isPlayer ? 'class="you"' : '',
        cells: [
          (m.isPlayer ? '<span class="nick">' + c.esc(m.nick) + '</span>' : c.esc(m.nick)),
          c.posChip(m.role),
          '<span class="mono">' + m.rating + '</span>',
          m.age + '',
          m.isPlayer ? '<span class="muted">Tú</span>' : c.esc(m.name)
        ]
      };
    });

    var season = state.season && state.season.tournaments.length ? state.season.tournaments : [];
    var open = DCS.ui.app.openTourn;

    return '<div class="page-head"><div><h2>' + c.teamMark(team, 'md') + '</h2><div class="sub">' +
      D.REGIONS[team.region].name + ' · Estilo ' + team.style + '</div></div>' +
      '<div class="head-right">' + c.tierBadge(team.tier) + '</div></div>' +

      c.card({
        title: 'Organización',
        body: c.kpis([
          c.kpi('Calidad', DCS.engine.world.rosterQuality(team), 'del roster'),
          c.kpi('Sinergia', team.synergy, 'química interna'),
          c.kpi('Reputación', team.reputation, 'del club'),
          c.kpi('Recursos', team.resources, 'presupuesto'),
          c.kpi('Puntos', team.points, 'circuito')
        ]) +
          '<div class="mt"><div class="kv"><span>Expectativa</span><span>' + c.esc(team.expectation) + '</span></div></div>'
      }) +

      c.card({ title: 'Roster', meta: c.badge(team.roster.length + ' jugadores'), body: c.table(['Jugador', 'Pos', 'Rating', 'Edad', 'Nombre'], rows), delay: 60 }) +

      (season.length ? c.card({
        title: 'Resultados de la temporada',
        subtitle: 'Pulsa un torneo para ver el recorrido serie a serie.',
        body: season.map(function (t, i) { return c.resultRow(t, open === t.id, i); }).join(''),
        delay: 120
      }) : '');
  };

  /* ---------------------------------------------------------
     TEMPORADA
     --------------------------------------------------------- */
  S.season = function (state, tab) {
    var s = state.season;
    var useHistory = (!s || !s.acc || !s.acc.maps) && state.history.length;
    var rec = useHistory ? state.history[state.history.length - 1] : null;
    var acc = rec ? rec.acc : (s ? s.acc : null);
    var role = rec ? rec.role : state.player.role;
    var tournaments = rec ? rec.tournaments : (s ? s.tournaments : []);
    var title = rec ? 'Temporada ' + rec.year : 'Temporada ' + state.year;
    var rating = rec ? rec.rating : (s ? s.rating : null);

    var head = '<div class="page-head"><div><h2>' + title + '</h2><div class="sub">' +
      D.ROLES[role].name + ' · ' + (rec ? c.teamMark({ id: rec.teamId, name: rec.teamName }, 'sm') : (DCS.game.team() ? c.teamMark(DCS.game.team(), 'sm') : 'Sin equipo')) +
      '</div></div><div class="head-right">' + c.posChip(role) +
      (rating !== null && rating !== undefined ? c.ratingChip(rating) : '') + '</div></div>';

    if (!acc || !acc.maps) {
      return head + c.card({
        title: 'Sin mapas oficiales',
        body: '<p class="muted">Todavía no has disputado partidas oficiales esta temporada.</p>'
      });
    }

    head += c.tabs([
      { id: 'summary', label: 'Resumen' },
      { id: 'stats', label: 'Estadísticas' },
      { id: 'tourn', label: 'Torneos' }
    ], tab, 'tab-season');

    var avg = DCS.engine.stats.averages(acc);
    var sw = rec ? rec.seriesWon : s.seriesWon;
    var sl = rec ? rec.seriesLost : s.seriesLost;
    var sp = rec ? rec.seriesPlayed : s.seriesPlayed;
    var stints = (rec ? rec.stints : (s ? s.stints : [])) || [];
    var open = DCS.ui.app.openTourn;

    if (tab === 'stats') {
      return head +
        c.card({ title: 'Estadísticas · ' + D.ROLES[role].name, meta: acc.maps + ' mapas', body: c.statGrid(role, avg) }) +
        c.card({
          title: 'Frente al baremo de la posición',
          subtitle: 'Esto es exactamente lo que pesa en tu rating de temporada.',
          body: c.statBars(role, avg), delay: 60
        });
    }

    if (tab === 'tourn') {
      return head + c.card({
        title: 'Torneos', subtitle: 'Pulsa cualquier torneo para desplegar el recorrido serie a serie.',
        body: tournaments.length
          ? tournaments.map(function (t, i) { return c.resultRow(t, open === t.id, i); }).join('')
          : c.empty('Sin torneos disputados.')
      });
    }

    var stintHtml = '';
    if (stints.length > 1) {
      stintHtml = c.card({
        title: 'Desglose por equipo',
        subtitle: 'Cambiaste de equipo durante el año: el total anual se conserva y el reparto también.',
        body: c.table(['Equipo', 'Mapas', 'V', 'D', 'Winrate'],
          stints.map(function (x) {
            return [c.teamMark({ id: x.teamId, name: x.teamName }, 'sm'), x.acc.maps, '<span class="good">' + x.acc.wins + '</span>',
            '<span class="bad">' + x.acc.losses + '</span>', fmt.pct(x.acc.maps ? x.acc.wins / x.acc.maps : 0)];
          }).concat([[
            '<b>TOTAL</b>', '<b>' + acc.maps + '</b>', '<b>' + acc.wins + '</b>',
            '<b>' + acc.losses + '</b>', '<b>' + fmt.pct(avg.winrate) + '</b>'
          ]])),
        delay: 60
      });
    }

    return head +
      c.card({
        title: 'Resumen',
        meta: rating !== null && rating !== undefined ? c.ratingChip(rating) : '',
        body: c.kpis([
          c.kpi('Mapas', acc.maps),
          c.kpi('Victorias', acc.wins, null, 'good'),
          c.kpi('Derrotas', acc.losses, null, 'bad'),
          c.kpi('Winrate', fmt.pct(avg.winrate), null, null, { v: avg.winrate, fmt: 'pct' }),
          c.kpi('Series', sp, sw + '-' + sl),
          c.kpi('Torneos', tournaments.filter(function (t) { return t.kind !== 'qualifier'; }).length)
        ])
      }) +
      stintHtml +
      c.card({
        title: 'Torneos de la temporada',
        body: tournaments.length
          ? tournaments.map(function (t, i) { return c.resultRow(t, open === t.id, i); }).join('')
          : c.empty('Sin torneos disputados.'),
        delay: 120
      });
  };

  /* ---------------------------------------------------------
     OFERTAS
     --------------------------------------------------------- */
  S.offers = function (state) {
    var offers = state.offers || [];
    var p = state.player;
    if (!offers.length) {
      return '<div class="page-head"><div><h2>Mercado</h2><div class="sub">Sin ofertas activas</div></div></div>' +
        c.card({
          title: 'Nada sobre la mesa',
          body: '<p class="muted">No tienes ofertas pendientes ahora mismo. El mercado se abre al cerrar cada temporada.</p>'
        });
    }

    var bestTier = Math.min.apply(null, offers.map(function (o) { return o.tier; }));

    var html = '<div class="page-head"><div><h2>Mercado</h2><div class="sub">' + offers.length +
      ' oferta' + (offers.length > 1 ? 's' : '') + ' · decide antes de cerrar el año</div></div>' +
      '<div class="head-right">' + c.badge('No siempre gana el mejor equipo', 'muted') + '</div></div>';

    html += offers.map(function (o, i) {
      var roleChanged = o.role !== p.role;
      var top = o.tier === bestTier;
      return '<div class="' + c.cls(['offer', 'reveal', o.isRenewal ? 'renewal' : '', top && !o.isRenewal ? 'top' : '']) +
        '" style="animation-delay:' + (i * 70) + 'ms">' +
        '<div class="offer-head">' + c.teamMark({ id: o.teamId, name: o.teamName }, 'md') +
        c.tierBadge(o.tier) + c.badge(D.REGIONS[o.region].short) +
        (o.isRenewal ? c.badge('Renovación', 'good') : '') +
        (roleChanged ? c.badge('Cambio de rol', 'gold') : '') + '</div>' +
        c.tiles([
          c.tile('Rol', D.ROLES[o.role].short, D.ROLES[o.role].name),
          c.tile('Duración', o.years + (o.years === 1 ? ' año' : ' años')),
          c.tile('Salario', fmt.money(o.salary), 'por temporada', 'gold', { v: o.salary, fmt: 'money' }),
          c.tile('Nivel del roster', o.rosterLevel),
          c.tile('Sinergia', o.synergy),
          c.tile('Reputación', o.reputation)
        ]) +
        '<div class="mt"><div class="kv"><span>Expectativa</span><span>' + c.esc(o.expectation) + '</span></div>' +
        '<div class="kv"><span>Perspectiva competitiva</span><span>' + c.esc(o.odds) + '</span></div></div>' +
        (o.note ? '<p class="note">' + c.esc(o.note) + '</p>' : '') +
        '<div class="offer-actions">' +
        c.btn('Aceptar y firmar', 'accept-offer', { value: o.id, variant: top ? 'primary' : undefined }) +
        '</div></div>';
    }).join('');

    html += c.card({
      title: 'Rechazar todo',
      body: '<p class="small muted">Puedes quedarte donde estás o seguir libre esperando algo mejor. ' +
        'No siempre llega.</p>' + c.btn('Rechazar todas las ofertas', 'decline-offers', { variant: 'danger' })
    });
    return html;
  };

  /* ---------------------------------------------------------
     CARRERA
     --------------------------------------------------------- */
  S.career = function (state, tab, openYear) {
    var p = state.player;
    var cr = state.career;
    var avg = DCS.engine.stats.averages(cr.acc);
    var totalEarn = cr.earnings.salary + cr.earnings.prize + cr.earnings.other;

    var head = '<div class="page-head"><div><h2>Carrera</h2><div class="sub">' +
      c.esc(p.nick) + ' · semilla <span class="seed">' + c.esc(state.seed) + '</span></div></div>' +
      '<div class="head-right">' + c.posChip(p.role) + c.badge(p.proYears + ' temporadas pro', 'info') + '</div></div>' +
      (DCS.ui.trophyRoom ? DCS.ui.trophyRoom.entry(state) : '') +
      c.tabs([
        { id: 'timeline', label: 'Trayectoria' },
        { id: 'totals', label: 'Totales' },
        { id: 'teams', label: 'Equipos' }
      ], tab, 'tab-career');

    if (tab === 'totals') {
      var played = cr.rolesPlayed || {};
      var roleKeys = Object.keys(played);
      var roleSplit = roleKeys.length > 1
        ? '<p class="small muted mt">Has jugado en varias posiciones: ' +
        roleKeys.map(function (r) { return D.ROLES[r].name + ' (' + played[r] + ' mapas)'; }).join(' · ') +
        '. Cada dato se promedia sobre los mapas en los que se registró.</p>'
        : '';

      return head +
        c.card({
          title: 'Totales de carrera',
          body: c.kpis([
            c.kpi('Mapas', cr.maps),
            c.kpi('Victorias', cr.wins, null, 'good'),
            c.kpi('Derrotas', cr.losses, null, 'bad'),
            c.kpi('Winrate', fmt.pct(cr.maps ? cr.wins / cr.maps : 0), null, null, { v: cr.maps ? cr.wins / cr.maps : 0, fmt: 'pct' }),
            c.kpi('Series', cr.seriesPlayed, cr.seriesWon + '-' + cr.seriesLost),
            c.kpi('Títulos', cr.titles, cr.tournaments + ' torneos', 'gold')
          ]) +
            '<div class="mt">' + c.tiles([
              c.tile('TI disputados', cr.tiPlayed),
              c.tile('TI ganados', cr.tiWon, null, cr.tiWon ? 'gold' : null),
              c.tile('Mejor rating', cr.bestRating === null ? '—' : cr.bestRating, cr.bestSeason || ''),
              c.tile('MMR máximo', fmt.mmr(p.peakMmr), null, null, { v: p.peakMmr, fmt: 'mmr' }),
              c.tile('Años Tier 1', p.tierYears[1] || 0),
              c.tile('Años Tier 2', p.tierYears[2] || 0),
              c.tile('Años Tier 3', p.tierYears[3] || 0),
              c.tile('Earnings', fmt.money(totalEarn), null, 'gold', { v: totalEarn, fmt: 'money' }),
              c.tile('Salarios', fmt.money(cr.earnings.salary), null, null, { v: cr.earnings.salary, fmt: 'money' }),
              c.tile('Premios', fmt.money(cr.earnings.prize), null, 'gold', { v: cr.earnings.prize, fmt: 'money' })
            ]) + '</div>'
        }) +
        (cr.acc && cr.acc.maps ? c.card({
          title: 'Promedios de carrera · ' + D.ROLES[p.role].name,
          body: c.statGrid(p.role, avg) + roleSplit, delay: 60
        }) : '') +
        competitionCircuitCard(state) +
        retireCard(state);
    }

    if (tab === 'teams') {
      var map = {};
      state.history.forEach(function (h) {
        h.stints.forEach(function (st) {
          if (!map[st.teamId]) map[st.teamId] = { id: st.teamId, name: st.teamName, tier: st.tier, seasons: 0, maps: 0, wins: 0, losses: 0, from: h.year, to: h.year };
          var e = map[st.teamId];
          e.seasons++; e.maps += st.acc.maps; e.wins += st.acc.wins; e.losses += st.acc.losses;
          e.to = h.year;
          if (st.tier && (!e.tier || st.tier < e.tier)) e.tier = st.tier;
        });
      });
      var list = Object.keys(map).map(function (k) { return map[k]; });
      return head + c.card({
        title: 'Equipos en tu carrera', meta: c.badge(list.length + ' clubes'),
        body: list.length ? c.table(['Equipo', 'Tier', 'Años', 'Temporadas', 'Mapas', 'V-D', 'Winrate'],
          list.map(function (e) {
            return [c.teamMark({ id: e.id, name: e.name }, 'sm'), c.tierBadge(e.tier), e.from + (e.to !== e.from ? '–' + e.to : ''),
            e.seasons, e.maps, '<span class="good">' + e.wins + '</span>-<span class="bad">' + e.losses + '</span>',
            fmt.pct(e.maps ? e.wins / e.maps : 0)];
          })) : c.empty('Todavía no has jugado en ningún equipo.')
      }) + retireCard(state);
    }

    var timeline = state.history.length
      ? '<div class="timeline">' + state.history.slice().reverse().map(function (h) {
        return yearItem(state, h, openYear === h.year);
      }).join('') + '</div>'
      : c.empty('Todavía no has completado ninguna temporada.');

    return head +
      c.card({
        title: 'Mapa de la carrera',
        subtitle: 'Inicio, crecimiento, prime, declive y retirada. Pulsa cualquier año para abrirlo.',
        body: ch().careerChart(state.history, openYear)
      }) +
      c.card({ title: 'Temporada a temporada', body: timeline, delay: 60 }) +
      retireCard(state);
  };

  function retireCard(state) {
    if (state.finished) return '';
    return c.card({
      title: 'Colgar el ratón',
      body: '<p class="small muted">Puedes retirarte cuando quieras. La carrera se cierra al instante y ' +
        'se calcula tu legado con todo lo conseguido hasta hoy.</p>' +
        c.btn('Retirarme ahora', 'retire-now', { variant: 'danger' }),
      delay: 120
    });
  }

  function yearItem(state, h, open) {
    var tierCls = h.tier ? 't' + h.tier : '';
    var head = '<div class="tl-item ' + tierCls + '" data-action="toggle-year" data-value="' + h.year + '">' +
      '<div class="tl-head">' +
      '<span class="tl-year">' + h.year + '</span>' +
      '<span class="muted small">' + h.age + ' años</span>' +
      c.tierBadge(h.tier) +
      '<span class="tl-team">' + c.teamMark({ id: h.teamId, name: h.teamName }, 'sm') + '</span>' +
      (h.titles ? c.badge('★ ' + h.titles, 'gold') : '') +
      '<span class="tl-right">' + c.ratingChip(h.rating) + '</span>' +
      '</div>' +
      '<div class="tl-best">' + c.esc(h.bestResult) + '</div></div>';
    return head + (open ? yearDetail(state, h) : '');
  }

  function yearDetail(state, h) {
    var avg = DCS.engine.stats.averages(h.acc);
    var open = DCS.ui.app.openTourn;
    var body = c.tiles([
      c.tile('Mapas', h.acc.maps),
      c.tile('Victorias', h.acc.wins, null, 'good'),
      c.tile('Derrotas', h.acc.losses, null, 'bad'),
      c.tile('Winrate', fmt.pct(avg.winrate)),
      c.tile('Series', h.seriesPlayed, h.seriesWon + '-' + h.seriesLost),
      c.tile('Rating', h.rating === null ? '—' : h.rating),
      c.tile('MMR final', fmt.mmr(h.mmrEnd)),
      c.tile('Salario', fmt.money(h.earnings.salary)),
      c.tile('Premios', fmt.money(h.earnings.prize), null, 'gold')
    ]);

    if (h.acc.maps) body += '<div class="mt">' + c.statGrid(h.role, avg) + '</div>';

    if (h.stints.length > 1) {
      body += '<div class="mt">' + c.table(['Etapa', 'Mapas', 'V', 'D', 'Winrate'],
        h.stints.map(function (x) {
          return [c.teamMark({ id: x.teamId, name: x.teamName }, 'sm'), x.acc.maps, x.acc.wins, x.acc.losses,
          fmt.pct(x.acc.maps ? x.acc.wins / x.acc.maps : 0)];
        }).concat([['<b>TOTAL ' + h.year + '</b>', '<b>' + h.acc.maps + '</b>', '<b>' + h.acc.wins + '</b>',
          '<b>' + h.acc.losses + '</b>', '<b>' + fmt.pct(avg.winrate) + '</b>']])) + '</div>';
    }

    if (h.tournaments.length) {
      body += '<div class="mt">' + h.tournaments.map(function (t, i) {
        return c.resultRow(t, open === t.id, i);
      }).join('') + '</div>';
    }

    if (h.events && h.events.length) {
      body += '<div class="mt">' + h.events.map(function (e) {
        return '<div class="event ' + c.toneClass(e.tone) + '"><h4>' + c.esc(e.title) + '</h4>' +
          '<p>' + c.esc(e.text) + '</p>' +
          (e.outcome ? '<div class="outcome"><b>' + c.esc(e.chosen || '') + '</b> — ' + c.esc(e.outcome) + '</div>' : '') +
          '</div>';
      }).join('') + '</div>';
    }

    if (h.devNotes && h.devNotes.length) {
      body += '<ul class="lines mt">' + h.devNotes.map(function (n) { return '<li>' + c.esc(n) + '</li>'; }).join('') + '</ul>';
    }

    return '<div class="tl-detail">' + body + '</div>';
  }

  /* ---------------------------------------------------------
     LEGADO
     --------------------------------------------------------- */
  S.legacy = function (state) {
    var l = state.legacy;
    var p = state.player;
    var cr = state.career;
    if (!l) {
      return '<div class="page-head"><div><h2>Legado</h2></div></div>' +
        c.card({ title: 'Carrera en curso', body: '<p class="muted">Tu legado se escribirá cuando cuelgues el ratón.</p>' });
    }
    var avg = DCS.engine.stats.averages(cr.acc);
    var totalEarn = cr.earnings.salary + cr.earnings.prize + cr.earnings.other;

    var html = '<div class="legacy-hero">' +
      '<div class="kicker">Tu legado</div>' +
      '<h1>' + c.esc(p.nick) + '</h1>' +
      '<div class="muted small">' + c.esc(p.name) + ' · ' + c.esc(p.nationality) + ' · ' +
      D.ROLES[p.role].name + ' · retirado a los ' + l.retireAge + '</div>' +
      '<div class="cat">' + c.esc(l.category) + '</div>' +
      '<p class="desc">' + c.esc(l.categoryDesc) + '</p></div>';

    if (state.history.length > 1) {
      html += c.card({
        title: 'La carrera de un vistazo',
        body: DCS.ui.charts.careerChart(state.history, null)
      });
    }

    html += c.card({
      title: 'La carrera en números',
      body: c.kpis([
        c.kpi('Años pro', l.proYears),
        c.kpi('Mapas', cr.maps),
        c.kpi('Winrate', fmt.pct(l.winrate), cr.wins + '-' + cr.losses, null, { v: l.winrate, fmt: 'pct' }),
        c.kpi('Títulos', cr.titles, null, 'gold'),
        c.kpi('TI', cr.tiPlayed, cr.tiWon + ' ganados', cr.tiWon ? 'gold' : null),
        c.kpi('Earnings', fmt.money(totalEarn), null, 'gold', { v: totalEarn, fmt: 'money' })
      ]) +
        '<div class="mt">' + c.tiles([
          c.tile('Equipos', l.teams),
          c.tile('Series', cr.seriesPlayed, cr.seriesWon + '-' + cr.seriesLost),
          c.tile('Torneos', cr.tournaments),
          c.tile('Mejor rating', cr.bestRating === null ? '—' : cr.bestRating, cr.bestSeason || ''),
          c.tile('MMR máximo', fmt.mmr(p.peakMmr), null, null, { v: p.peakMmr, fmt: 'mmr' }),
          c.tile('Valoración máxima', p.peakOverall)
        ]) + '</div>',
      delay: 60
    });

    if (cr.acc.maps) {
      html += c.card({ title: 'Promedios · ' + D.ROLES[p.role].name, body: c.statGrid(p.role, avg), delay: 120 });
    }

    html += competitionCircuitCard(state);

    var fin = l.finance || {};
    var best = fin.best ? catLabel(fin.best.cat) + ' · +' + fmt.money(fin.best.delta) : '—';
    var worst = fin.worst ? catLabel(fin.worst.cat) + ' · ' + fmt.money(fin.worst.delta) : '—';
    html += c.card({
      title: 'Patrimonio final',
      subtitle: fin.category ? fin.category : 'Sin clasificación financiera',
      body: '<p class="small muted">' + c.esc(fin.categoryDesc || 'El dinero de la carrera y lo que hiciste con él van por caminos distintos.') + '</p>' +
        c.kpis([
          c.kpi('Earnings deportivos', fmt.money(fin.earnings != null ? fin.earnings : totalEarn), 'histórico', null, { v: fin.earnings != null ? fin.earnings : totalEarn, fmt: 'money' }),
          c.kpi('Cash', fmt.money(fin.cash != null ? fin.cash : 0), null, null, { v: fin.cash || 0, fmt: 'money' }),
          c.kpi('Inversiones', fmt.money(fin.investments != null ? fin.investments : 0), 'valor actual', 'gold', { v: fin.investments || 0, fmt: 'money' }),
          c.kpi('Patrimonio neto', fmt.money(fin.netWorth != null ? fin.netWorth : l.netWorth), null, 'gold', { v: fin.netWorth != null ? fin.netWorth : l.netWorth, fmt: 'money' })
        ]) +
        '<div class="mt">' + c.tiles([
          c.tile('Mejor movimiento', best),
          c.tile('Peor movimiento', worst),
          c.tile('Invirtiendo', (fin.pnl > 0 ? '+' : '') + fmt.money(fin.pnl || 0), 'ganancia / pérdida', fin.pnl >= 0 ? 'good' : 'bad')
        ]) + '</div>' +
        (l.topAssets && l.topAssets.length
          ? '<ul class="lines mt">' + l.topAssets.map(function (a) { return '<li>' + c.esc(a.name) + ' · ' + fmt.money(a.value) + '</li>'; }).join('') + '</ul>'
          : '<p class="muted mt">Terminaste sin posiciones relevantes.</p>')
    });

    html += '<div class="grid grid-2">' +
      c.card({
        title: 'Momento álgido',
        body: (l.prime
          ? '<div class="kv"><span>Prime</span><span>' + l.prime.from + '–' + l.prime.to + '</span></div>' +
          '<div class="kv"><span>Rating medio en el prime</span><span>' + l.prime.avg + '</span></div>'
          : '<p class="muted">Nunca llegaste a encadenar un prime reconocible.</p>') +
          (l.mainTeam ? '<div class="kv"><span>Equipo más importante</span><span>' + c.esc(l.mainTeam.name) + '</span></div>' +
            '<div class="kv"><span>Temporadas allí</span><span>' + l.mainTeam.seasons + '</span></div>' : ''),
        delay: 180
      }) +
      c.card({
        title: 'Logros principales',
        body: '<ul class="lines">' + l.achievements.map(function (a) { return '<li>' + c.esc(a) + '</li>'; }).join('') + '</ul>' +
          (l.bigTitles.list.length ? '<p class="small muted mt">Títulos de prestigio:</p><ul class="lines">' +
            l.bigTitles.list.map(function (t) { return '<li>' + c.esc(t) + '</li>'; }).join('') + '</ul>' : ''),
        delay: 180
      }) + '</div>';

    html += c.card({
      title: 'Y ahora',
      body: '<p class="small muted">Cada carrera nueva genera una semilla distinta, un mundo distinto y un techo distinto. ' +
        'Esta fue la tuya: <span class="seed">' + c.esc(state.seed) + '</span></p>' +
        '<div class="row">' + c.btn('Empezar una carrera nueva', 'new-career', { variant: 'primary' }) + '</div>',
      delay: 240
    });

    return html;
  };
})(window.DCS = window.DCS || {});
