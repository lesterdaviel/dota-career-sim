/* ============================================================
   UI / SCREENS · INICIO, CREACIÓN, DASHBOARD E INFORMES
   ============================================================ */
(function (DCS) {
  'use strict';

  var c = DCS.ui.c, fmt = DCS.ui.fmt, D = DCS.data;
  var S = DCS.ui.screens = DCS.ui.screens || {};

  function mapCreep(side, role, extra) {
    return '<span class="mc ' + side + ' ' + role + (extra ? ' ' + extra : '') + '">' +
      '<i class="mc-shadow"></i><i class="mc-leg a"></i><i class="mc-leg b"></i>' +
      '<i class="mc-body"></i><i class="mc-head"></i>' +
      (role === 'range'
        ? '<i class="mc-hat"></i><i class="mc-staff"></i>'
        : '<i class="mc-sword"></i>') +
      '</span>';
  }

  function mapTower(side, cls) {
    return '<span class="mtow ' + side + ' ' + cls + '">' +
      '<i class="mtow-ring"></i><i class="mtow-base"></i><i class="mtow-shaft"></i>' +
      '<i class="mtow-cap"></i><i class="mtow-gem"></i>' +
      '</span>';
  }

  /* ---------------------------------------------------------
     INICIO
     --------------------------------------------------------- */
  S.home = function () {
    var save = DCS.store.peek();
    var html = '<div class="hero-stage">' +
      '<div class="hero-bg" aria-hidden="true">' +
      '<span class="cover-far"></span>' +
      '<span class="cover-mid"></span>' +
      '<span class="cover-stage left"></span>' +
      '<span class="cover-stage right"></span>' +
      '<span class="cover-lanes"></span>' +
      '<span class="cover-water"></span>' +
      '<span class="cover-env radiant"></span>' +
      '<span class="cover-env dire"></span>' +
      '<span class="cover-fog"></span>' +
      '<span class="cover-pit"></span>' +
      '<span class="cover-veil"></span>' +
      '<span class="cover-towers-live">' +
      mapTower('rad', 'a') + mapTower('rad', 'b') +
      mapTower('dir', 'a') + mapTower('dir', 'b') +
      '</span>' +
      '<span class="cover-creeps">' +
      '<span class="mbattle mid">' +
      mapCreep('rad', 'range', 'r1') + mapCreep('rad', 'range', 'r2') +
      mapCreep('rad', 'melee', 'm1') + mapCreep('rad', 'melee', 'm2') + mapCreep('rad', 'melee', 'm3') +
      '<i class="mproj rad a"></i><i class="mproj rad b"></i>' +
      '<i class="mhit a"></i><i class="mhit b"></i>' +
      mapCreep('dir', 'melee', 'm1') + mapCreep('dir', 'melee', 'm2') + mapCreep('dir', 'melee', 'm3') +
      mapCreep('dir', 'range', 'r1') + mapCreep('dir', 'range', 'r2') +
      '<i class="mproj dir a"></i><i class="mproj dir b"></i>' +
      '</span>' +
      '<span class="mbattle bot">' +
      mapCreep('rad', 'melee', 'm1') + mapCreep('rad', 'melee', 'm2') +
      '<i class="mhit a"></i>' +
      mapCreep('dir', 'melee', 'm1') + mapCreep('dir', 'melee', 'm2') +
      '</span>' +
      '</span>' +
      '<span class="cover-fx">' +
      '<span class="cover-motes radiant"></span>' +
      '<span class="cover-motes dire"></span>' +
      '</span>' +
      '<span class="cover-prestige"></span>' +
      '<span class="cover-dust"></span>' +
      '<span class="cover-near"></span>' +
      '<span class="cover-fg radiant"></span>' +
      '<span class="cover-fg dire"></span>' +
      '</div>' +
      '<div class="hero">' +
      '<div class="hero-brand"><i></i><span>DOTA 2</span><b>CAREER</b></div>' +
      '<div class="hero-title">' +
      '<span class="hero-title-mark left" aria-hidden="true"></span>' +
      '<span class="hero-title-flash" aria-hidden="true"></span>' +
      '<h1>Road to Immortal</h1>' +
      '<span class="hero-title-mark right" aria-hidden="true"></span>' +
      '</div>' +
      '<p class="hero-lead">Construye tu carrera. Cada temporada puede cambiarlo todo.</p>' +
      '<div class="hero-actions">' +
      c.btn('Nueva carrera', 'new-career', { variant: 'primary', size: 'lg' }) +
      (save ? c.btn('Continuar carrera', 'continue', { size: 'lg' }) : '') +
      '</div>';

    if (save) {
      html += '<div class="hero-quiet">' +
        c.btn('Borrar y empezar de cero', 'wipe', { variant: 'danger' }) +
        '</div>';
    }

    if (!DCS.store.persistent) {
      html += '<p class="hero-note">Tu navegador ha bloqueado el almacenamiento local; la partida solo vivirá en esta pestaña.</p>';
    }
    html += '</div></div>';
    return html;
  };

  /* ---------------------------------------------------------
     CREACIÓN DE JUGADOR
     --------------------------------------------------------- */
  S.create = function (draft) {
    var region = D.REGIONS[draft.region];
    var role = D.ROLES[draft.role];
    var arch = D.ARCHETYPES[draft.archetype];
    var flag = D.flagMark(draft.nationality, 'lg')
      .replace('flagcdn.com/w40/', 'flagcdn.com/w80/')
      .replace('width="40"', 'width="80"')
      .replace('height="28"', 'height="56"');
    var nickShow = ((draft.nick || 'nick').trim() || 'nick').toUpperCase();
    var nameShow = (draft.name || 'sin nombre').trim() || 'sin nombre';
    var hints = {
      carry: 'Farm · Escalado · Daño',
      mid: 'Mecánicas · Tempo · Dominio',
      offlane: 'Iniciación · Espacio · Teamfight',
      pos4: 'Rotaciones · Playmaking · Control',
      pos5: 'Visión · Teamplay · Liderazgo'
    };
    var hidden = '<input type="hidden" id="f-region" value="' + c.esc(draft.region) + '">' +
      '<input type="hidden" id="f-nat" value="' + c.esc(draft.nationality) + '">';

    var card = '<article class="pcard pcard-' + draft.role + '">' +
      '<div class="pcard-glow" aria-hidden="true"></div>' +
      '<span class="pcard-pos" aria-hidden="true">' + c.esc(role.short) + '</span>' +
      '<div class="pcard-flag" title="' + c.esc(draft.nationality) + '">' + flag + '</div>' +
      '<span class="pcard-nick" title="' + c.esc(nickShow) + '">' + c.esc(nickShow) + '</span>' +
      '<div class="pcard-name" title="' + c.esc(nameShow) + '">' + c.esc(nameShow) + '</div>' +
      '<div class="pcard-tags">' +
      '<span>16 años</span>' +
      '<span>' + c.esc(role.name).toUpperCase() + '</span>' +
      '<span>' + c.esc(arch.name) + '</span>' +
      '</div>' +
      '<div class="pcard-region">' + c.esc(region.name) + '</div>' +
      '</article>';

    var nats = D.NATIONALITIES.map(function (n) {
      return '<button type="button" class="nat-item' + (draft.nationality === n ? ' sel' : '') +
        '" data-action="pick-nat" data-value="' + c.esc(n) + '" data-name="' + c.esc(n) + '">' +
        '<span class="nat-flag">' + D.flagMark(n) + '</span><span>' + c.esc(n) + '</span></button>';
    }).join('');

    var regs = D.REGION_LIST.map(function (r) {
      var rg = D.REGIONS[r];
      return '<button type="button" class="reg-chip' + (draft.region === r ? ' sel' : '') +
        '" data-action="pick-region" data-value="' + r + '"><b>' + c.esc(rg.short) + '</b>' +
        '<span>' + c.esc(rg.name) + '</span></button>';
    }).join('');

    var roles = D.ROLE_LIST.map(function (r) {
      var ro = D.ROLES[r];
      return '<button type="button" class="role-row' + (draft.role === r ? ' sel' : '') +
        '" data-action="pick-role" data-value="' + r + '">' +
        '<b>' + c.esc(ro.short) + ' — ' + c.esc(ro.name).toUpperCase() + '</b>' +
        '<i>' + c.esc(hints[r]) + '</i></button>';
    }).join('');

    var archs = D.ARCHETYPE_LIST.map(function (a) {
      var ar = D.ARCHETYPES[a];
      return '<button type="button" class="arch-chip' + (draft.archetype === a ? ' sel' : '') +
        '" data-action="pick-arch" data-value="' + a + '">' +
        '<b>' + c.esc(ar.name) + '</b>' +
        '<span class="arch-pro">+ ' + c.esc(ar.pros) + '</span>' +
        '<span class="arch-con">− ' + c.esc(ar.cons) + '</span>' +
        '</button>';
    }).join('');

    return '<div class="create-forge">' + hidden +
      '<div class="create-shell">' +
      '<header class="create-head"><div class="kicker">Road to Immortal</div>' +
      '<h2>Define tu identidad</h2></header>' +
      '<div class="create-grid">' +

      '<section class="create-col identity">' +
      '<h3>Identidad</h3>' +
      '<div class="id-block">' +
      card +
      '<div class="id-fields">' +
      '<label class="id-field nick-field"><span>Nick</span>' +
      '<input id="f-nick" type="text" maxlength="16" value="' + c.esc(draft.nick) + '" placeholder="lester" autocomplete="off"></label>' +
      '<label class="id-field"><span>Nombre</span>' +
      '<input id="f-name" type="text" maxlength="28" value="' + c.esc(draft.name) + '" placeholder="Nombre real" autocomplete="off"></label>' +
      '</div></div>' +
      '</section>' +

      '<section class="create-col circuit">' +
      '<h3>Circuito</h3>' +
      '<div class="reg-row">' + regs + '</div>' +
      '</section>' +

      '<section class="create-col origin">' +
      '<h3>Nacionalidad</h3>' +
      '<input id="f-nat-search" type="search" placeholder="Buscar país" autocomplete="off" value="' + c.esc(draft.natQuery || '') + '">' +
      '<div class="nat-grid">' + nats + '</div>' +
      '<p class="nat-empty" hidden>No se encontraron países</p>' +
      '</section>' +

      '<section class="create-col play">' +
      '<h3>Posición</h3>' +
      '<div class="role-list">' + roles + '</div>' +
      '</section>' +

      '<section class="create-col style">' +
      '<h3>Estilo</h3>' +
      '<div class="arch-row">' + archs + '</div>' +
      '</section>' +

      '</div>' +
      '<div class="create-foot">' +
      c.btn('Volver', 'go-home', { variant: 'ghost' }) +
      c.btn('Confirmar identidad', 'create-confirm', { variant: 'primary', size: 'lg' }) +
      '</div></div></div>';
  };

  /* ---------------------------------------------------------
     DASHBOARD
     --------------------------------------------------------- */
  S.dashboard = function (state) {
    var p = state.player;
    var team = DCS.game.team();
    var role = D.ROLES[p.role];
    var career = state.career;
    var totalEarn = career.earnings.salary + career.earnings.prize + career.earnings.other;
    var last = career.lastRating;
    var wealth = DCS.engine.finance.snapshot(state);

    var head = c.card({
      title: 'Estado actual',
      meta: c.tierBadge(team ? team.tier : null) + c.posChip(p.role),
      body: c.kpis([
        c.kpi('Edad', p.age, state.year + ' · temporada ' + (p.proYears + 1)),
        c.kpi('Valoración', p.overall, 'máx ' + p.peakOverall, 'gold'),
        c.kpi('MMR', fmt.mmr(p.mmr), 'máx ' + fmt.mmr(p.peakMmr), null, { v: p.mmr, fmt: 'mmr' }),
        c.kpi('Rating', last === null ? '—' : last, 'última temporada', null, last === null ? null : { v: last, fmt: 'int' }),
        c.kpi('Reputación', Math.round(p.reputation), 'en el circuito'),
        c.kpi('Earnings', fmt.money(totalEarn), 'histórico de carrera', null, { v: totalEarn, fmt: 'money' })
      ]) +
        '<div class="mt">' + c.tiles([
          c.tile('Equipo', team ? c.teamMark(team, 'sm') : '<span class="muted">Libre</span>',
            team ? D.REGIONS[team.region].name : 'agente libre'),
          c.tile('Posición', role.short, role.name),
          c.tile('Forma', Math.round(p.form), estado(p.form), tone(p.form)),
          c.tile('Moral', Math.round(p.morale), estado(p.morale), tone(p.morale)),
          c.tile('Años pro', p.proYears, 'Tier 1: ' + (p.tierYears[1] || 0)),
          c.tile('Títulos', career.titles, career.tiWon ? 'TI: ' + career.tiWon : null, career.titles ? 'gold' : null),
          c.tile('Cash', fmt.money(wealth.cash), 'disponible', null, { v: wealth.cash, fmt: 'money' })
        ]) + '</div>'
    });

    var contract = '';
    if (team && p.contract) {
      contract = c.card({
        title: 'Contrato', meta: c.badge(p.contract.years + (p.contract.years === 1 ? ' año' : ' años'), 'info'),
        body: '<div class="kv"><span>Equipo</span><span>' + c.teamMark(team, 'sm') + '</span></div>' +
          '<div class="kv"><span>Salario anual</span><span>' + fmt.moneyFull(p.contract.salary) + '</span></div>' +
          '<div class="kv"><span>Objetivo del club</span><span>' + c.esc(p.contract.expectation) + '</span></div>' +
          '<div class="kv"><span>Sinergia del roster</span><span>' + team.synergy + '</span></div>' +
          (p.isCaptain ? '<div class="kv"><span>Rol interno</span><span>Capitán</span></div>' : '')
      });
    } else {
      contract = c.card({
        title: 'Situación contractual',
        body: '<p class="muted small">Eres agente libre. Sin equipo no hay mapas oficiales: ' +
          'grindeas pubs y esperas que alguien se fije en ti en el mercado.</p>' +
          '<div class="kv"><span>Temporadas sin equipo</span><span>' + p.seasonsWithoutTeam + '</span></div>'
      });
    }

    return '<div class="page-head"><div><h2>' + c.esc(p.nick) + '</h2>' +
      '<div class="sub">' + c.esc(p.name) + ' · ' + c.esc(p.nationality) + ' · ' +
      D.ARCHETYPES[p.archetype].name + '</div></div>' +
      '<div class="head-right">' + c.badge(D.REGIONS[p.region].name) + '</div></div>' +
      head + S.tournamentBrief(state) + S.reportCard(state) + contract;
  };

  function estado(v) {
    if (v >= 78) return 'excelente';
    if (v >= 60) return 'buena';
    if (v >= 42) return 'normal';
    if (v >= 26) return 'baja';
    return 'crítica';
  }
  function tone(v) { return v >= 70 ? 'good' : (v < 35 ? 'bad' : null); }

  /* Resumen compacto: el enfrentamiento completo vive en Torneos. */
  S.tournamentBrief = function (state) {
    var live = state.season && state.season.liveTour;
    if (!live) return '';
    var peek = DCS.engine.tournaments.peek(live);
    var last = live.last;
    var stage = peek ? peek.stage : (live.record ? live.record.result : 'Torneo cerrado');
    var opp = peek && peek.opp ? peek.opp : (last && last.opp ? last.opp : null);
    var format = peek
      ? (peek.formatLabel || DCS.engine.tournaments.formatLabel(peek.format))
      : (last && last.formatLabel ? last.formatLabel : '');
    var kvs = '<div class="kv"><span>Torneo</span><span>' + c.esc(live.name) + '</span></div>' +
      '<div class="kv"><span>Fase</span><span>' + c.esc(stage) + '</span></div>';
    if (opp) kvs += '<div class="kv"><span>Próximo rival</span><span>' + c.teamMark(opp, 'sm') + '</span></div>';
    if (format) kvs += '<div class="kv"><span>Formato</span><span>' + c.esc(format) + '</span></div>';
    if (live.done && live.record) {
      kvs += '<div class="kv"><span>Resultado</span><span>' + c.esc(live.record.result) + '</span></div>';
    }
    return c.card({
      className: 'tour-brief',
      title: live.done ? 'Torneo cerrado' : 'Torneo en curso',
      meta: c.badge(live.done ? 'Cierre' : 'En juego', live.done ? 'gold' : 'info'),
      body: kvs + '<div class="row mt">' +
        c.btn('Ir al torneo', 'nav', { value: 'tournaments', variant: 'primary' }) +
        '</div>'
    });
  };

  /* ---------------------------------------------------------
     INFORME DE LA ÚLTIMA FASE
     --------------------------------------------------------- */
  S.reportCard = function (state) {
    var r = state.lastReport;
    if (!r) {
      return c.card({
        title: 'Próximo paso',
        body: '<p class="muted">Tu carrera empieza aquí. Pulsa <b>' + DCS.game.nextLabel() +
          '</b> abajo a la derecha (o la barra espaciadora) para avanzar.</p>'
      });
    }
    if (r.type === 'preseason') return S.reportPreseason(state, r);
    if (r.type === 'competition') return S.reportCompetition(state, r);
    if (r.type === 'review') return S.reportReview(state, r);
    if (r.type === 'market') return S.reportMarket(state, r);
    if (r.type === 'yearEnd') return S.reportYearEnd(state, r);
    return '';
  };

  function linesHtml(lines) {
    if (!lines || !lines.length) return '';
    return '<ul class="lines">' + lines.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul>';
  }

  function eventHtml(ev) {
    if (!ev) return '';
    var icon = ev.tone === 'great' ? '★' : (ev.tone === 'good' ? '▲' : (ev.tone === 'bad' ? '▼' : '◆'));
    return '<div class="event ' + c.toneClass(ev.tone) + '">' +
      '<h4><span class="muted small">' + icon + '</span> ' + c.esc(ev.title) + '</h4><p>' + c.esc(ev.text) + '</p>' +
      (ev.outcome ? '<div class="outcome"><b>' + c.esc(ev.chosen || '') + '</b> — ' + c.esc(ev.outcome) + '</div>' : '') +
      '</div>';
  }
  S.eventHtml = eventHtml;

  S.reportPreseason = function (state, r) {
    var body = '';
    if (r.team) {
      body += c.tiles([
        c.tile('Calidad del roster', r.team.quality),
        c.tile('Sinergia', r.team.synergy, null, r.team.synergy >= 65 ? 'good' : (r.team.synergy < 45 ? 'bad' : null)),
        c.tile('Reputación', r.team.reputation),
        c.tile('Recursos', r.team.resources),
        c.tile('Estilo', c.esc(r.team.style))
      ]) + '<div class="mt"></div>';
    }
    body += linesHtml(r.lines);
    if (r.plan && r.plan.length) {
      body += '<p class="small muted mt">Calendario previsto:</p><ul class="lines">' +
        r.plan.map(function (x) { return '<li>' + c.esc(x) + '</li>'; }).join('') + '</ul>';
    }
    body += eventHtml(r.event);
    return c.card({ title: r.title, meta: c.badge('Pretemporada', 'info'), body: body });
  };

  S.reportCompetition = function (state, r) {
    var open = DCS.ui.app.openTourn;
    var body = linesHtml(r.lines);

    if (r.totals && r.totals.acc.maps) {
      var a = r.totals.avg, acc = r.totals.acc;
      body += c.kpis([
        c.kpi('Mapas', acc.maps),
        c.kpi('Victorias', acc.wins, null, 'good'),
        c.kpi('Derrotas', acc.losses, null, 'bad'),
        c.kpi('Winrate', fmt.pct(a.winrate), null, null, { v: a.winrate, fmt: 'pct' }),
        c.kpi('Series', r.tournaments.reduce(function (s, t) { return s + t.seriesPlayed; }, 0)),
        c.kpi('KDA', fmt.dec(a.kda, 2), null, null, { v: a.kda, fmt: 'dec2' })
      ]) + '<div class="mt"></div>';
    }

    if (r.tournaments && r.tournaments.length) {
      body += '<p class="small muted" style="margin-bottom:8px">Pulsa cualquier torneo para ver serie a serie.</p>';
      body += r.tournaments.map(function (t, i) { return c.resultRow(t, open === t.id, i); }).join('');
    }
    body += eventHtml(r.event);
    return (r.ti ? S.tiCard(r.ti) : '') +
      c.card({ title: r.title, meta: c.badge('Competición', 'info'), body: body });
  };

  /* The International merece su propia ficha (§32) */
  S.tiCard = function (ti) {
    var champion = ti.placement === 1;
    return c.card({
      className: 'ti-card',
      title: ti.name,
      meta: c.badge(ti.via || 'Clasificado', 'gold'),
      body: '<div class="ti-head">' +
        '<span class="ti-result' + (champion ? ' champ' : '') + '">' + c.esc(ti.result) + '</span>' +
        (champion ? c.badge('★ campeón del mundo', 'gold') : c.badge(fmt.ordinal(ti.placement) + ' de ' + ti.field, 'muted')) +
        '</div>' +
        c.tiles([
          c.tile('Equipo', c.teamMark({ id: ti.teamId, name: ti.teamName }, 'sm')),
          c.tile('Mapas', ti.maps, ti.wins + '-' + ti.losses),
          c.tile('Series', ti.seriesPlayed, ti.seriesWon + '-' + ti.seriesLost),
          c.tile('Posición final', fmt.ordinal(ti.placement)),
          c.tile('Premio', fmt.money(ti.prize), null, 'gold', { v: ti.prize, fmt: 'money' }),
          c.tile('Rating', ti.rating)
        ]) +
        (ti.log && ti.log.length ? c.seriesList(ti.log) : '') +
        (ti.opponents && ti.opponents.length
          ? '<p class="small muted mt">Rivales en el evento: ' + ti.opponents.map(c.esc).join(' · ') + '</p>'
          : '')
    });
  };

  S.reportReview = function (state, r) {
    var rec = r.record;
    var avg = DCS.engine.stats.averages(rec.acc);
    var p = state.player;

    var left = '<div style="display:flex;gap:18px;align-items:center;flex-wrap:wrap">' +
      DCS.ui.charts.ring(r.rating, 'Rating de temporada') +
      '<div style="flex:1;min-width:180px">' +
      '<div class="row" style="margin-bottom:10px">' + c.badge(rec.bestResult, rec.titles ? 'gold' : 'muted') + '</div>' +
      '<div class="kv"><span>Reputación</span><span>' + Math.round(p.reputation) + ' (' + fmt.signed(r.repDelta) + ')</span></div>' +
      '<div class="kv"><span>Valoración</span><span>' + p.overall + ' (' + fmt.signed(p.overall - r.dev.overallBefore) + ')</span></div>' +
      '<div class="kv"><span>MMR</span><span>' + fmt.mmr(p.mmr) + '</span></div>' +
      '<div class="kv"><span>Salario</span><span>' + fmt.money(rec.earnings.salary) + '</span></div>' +
      '<div class="kv"><span>Premios</span><span class="gold">' + fmt.money(rec.earnings.prize) + '</span></div>' +
      '</div></div>';

    var dev = '';
    if (r.dev && r.dev.deltas) {
      dev = D.ATTRS.map(function (a) {
        return c.attrRow(a.label, p.attrs[a.key], Math.round(r.dev.deltas[a.key]));
      }).join('');
    }

    var body = left +
      '<div class="mt">' + linesHtml(r.dev.notes.map(c.esc)) + '</div>';

    var cards = c.card({ title: r.title, meta: c.badge('Cierre', 'info'), body: body });

    if (rec.acc.maps) {
      cards += c.card({
        title: 'Cómo te ha evaluado el circuito',
        subtitle: 'Tus promedios frente al baremo de un ' + D.ROLES[rec.role].name + '. Esto es lo que pesa en tu rating.',
        body: c.statBars(rec.role, avg), delay: 60
      });
    }
    cards += c.card({ title: 'Desarrollo', subtitle: 'Cambio de atributos en la temporada.', body: dev, delay: 120 });
    if (r.event) cards += c.card({ title: 'Y además…', body: eventHtml(r.event), delay: 180 });
    return cards;
  };

  S.reportMarket = function (state, r) {
    var body;
    if (!r.offers.length) {
      body = '<p class="muted">' + (r.hasTeam
        ? 'Nadie ha llamado a tu puerta este año. Sigues donde estás.'
        : 'Ningún equipo te ha hecho una oferta. El teléfono no suena.') + '</p>';
    } else {
      body = '<p class="small muted">Tienes ' + r.offers.length + ' oferta' + (r.offers.length > 1 ? 's' : '') +
        ' sobre la mesa. No puedes cerrar el año sin responder.</p>' +
        '<div class="row">' + c.btn('Ver ofertas', 'nav', { value: 'offers', variant: 'primary' }) + '</div>';
    }
    return c.card({
      title: r.title,
      meta: c.badge('Valor de mercado ' + r.marketScore, 'info'),
      body: body
    });
  };

  S.reportYearEnd = function (state, r) {
    var body = linesHtml((r.notes || []).map(c.esc));
    if (!r.notes || !r.notes.length) body = '<p class="muted small">El año se cierra sin sobresaltos.</p>';
    body += '<p class="small mt">Cumples <b>' + r.age + '</b> años.</p>';
    var tick = r.finances;
    if (tick && tick.notes && tick.notes.length) {
      body += '<div class="mt"><p class="small">Patrimonio</p><ul class="lines">' +
        tick.notes.map(function (n) { return '<li>' + c.esc(n) + '</li>'; }).join('') + '</ul></div>';
    }
    if (!state.finished) {
      body += '<div class="row mt">' + c.btn('Revisar patrimonio', 'nav', { value: 'finances', variant: 'ghost' }) + '</div>';
    }
    return c.card({ title: r.title, meta: c.badge('Fin de año', 'info'), body: body });
  };

  /* Parallax y luz Radiant/Dire: solo desktop */
  (function homeParallax() {
    var raf = 0, tx = 0, ty = 0, cx = 0, cy = 0;
    var mq = window.matchMedia('(max-width: 880px), (pointer: coarse), (prefers-reduced-motion: reduce)');
    function skip() { return mq.matches || !document.querySelector('.hero-stage'); }
    function paint() {
      raf = 0;
      var stage = document.querySelector('.hero-stage');
      if (!stage || skip()) return;
      cx += (tx - cx) * 0.05;
      cy += (ty - cy) * 0.05;
      var far = stage.querySelector('.cover-far');
      var mid = stage.querySelector('.cover-mid');
      var near = stage.querySelector('.cover-near');
      var water = stage.querySelector('.cover-water');
      var creeps = stage.querySelector('.cover-creeps');
      var towers = stage.querySelector('.cover-towers-live');
      var lanes = stage.querySelector('.cover-lanes');
      var fgR = stage.querySelector('.cover-fg.radiant');
      var fgD = stage.querySelector('.cover-fg.dire');
      if (far) far.style.transform = 'translate3d(' + (cx * 8) + 'px,' + (cy * 5) + 'px,0) scale(1.07)';
      if (mid) mid.style.transform = 'translate3d(' + (cx * 14) + 'px,' + (cy * 9) + 'px,0)';
      if (lanes) lanes.style.transform = 'translate3d(' + (cx * 12) + 'px,' + (cy * 7) + 'px,0)';
      if (water) water.style.transform = 'translate3d(' + (cx * 10) + 'px,' + (cy * 6) + 'px,0)';
      if (creeps) creeps.style.transform = 'translate3d(' + (cx * 16) + 'px,' + (cy * 10) + 'px,0)';
      if (towers) towers.style.transform = 'translate3d(' + (cx * 14) + 'px,' + (cy * 8) + 'px,0)';
      if (near) near.style.transform = 'translate3d(' + (cx * 18) + 'px,' + (cy * 12) + 'px,0)';
      if (fgR) fgR.style.transform = 'translate3d(' + (cx * 22) + 'px,' + (cy * 14) + 'px,0)';
      if (fgD) fgD.style.transform = 'translate3d(' + (cx * 20) + 'px,' + (cy * 12) + 'px,0)';
      var litR = Math.max(0, -cx) * 1.15;
      var litD = Math.max(0, cx) * 1.15;
      stage.style.setProperty('--lit-r', litR.toFixed(3));
      stage.style.setProperty('--lit-d', litD.toFixed(3));
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) raf = requestAnimationFrame(paint);
    }
    document.addEventListener('mousemove', function (e) {
      if (skip()) return;
      tx = (e.clientX / window.innerWidth) - 0.5;
      ty = (e.clientY / window.innerHeight) - 0.5;
      if (!raf) raf = requestAnimationFrame(paint);
    }, { passive: true });
  })();
})(window.DCS = window.DCS || {});
