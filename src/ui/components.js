/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   UI / COMPONENTS — piezas de interfaz reutilizables
   ------------------------------------------------------------
   Todo devuelve HTML como string. El color siempre significa algo:
   tier, posición y banda de rendimiento tienen tono propio.
   ============================================================ */
(function (DCS) {
  'use strict';

  var fmt = DCS.ui.fmt;
  var U = DCS.util;

  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function cls(list) { return list.filter(Boolean).join(' '); }

  /* --------------------------------------------------------
     Contenedores
     -------------------------------------------------------- */
  function card(o) {
    return '<section class="' + cls(['card', 'reveal', o.className]) + '"' +
      (o.delay ? ' style="animation-delay:' + o.delay + 'ms"' : '') + '>' +
      '<span class="card-accent"></span>' +
      (o.title ? '<header class="card-head">' +
        '<h3>' + esc(o.title) + '</h3>' +
        (o.meta ? '<span class="card-meta">' + o.meta + '</span>' : '') +
        '</header>' : '') +
      (o.subtitle ? '<p class="card-sub">' + o.subtitle + '</p>' : '') +
      '<div class="card-body">' + (o.body || '') + '</div>' +
      (o.footer ? '<footer class="card-foot">' + o.footer + '</footer>' : '') +
      '</section>';
  }

  /* --------------------------------------------------------
     Números
     -------------------------------------------------------- */
  /**
   * Un número suelto se anima al aparecer; una cadena ya formateada, no.
   * El valor final se escribe YA en el HTML: si el navegador pausa las
   * animaciones (pestaña en segundo plano), el dato sigue siendo correcto.
   */
  function valueHtml(value, count) {
    if (count && typeof count.v === 'number' && isFinite(count.v)) {
      var k = count.fmt || 'int';
      return '<span class="tile-value" data-count="' + count.v + '" data-fmt="' + k + '">' +
        fmt.stat(k, count.v) + '</span>';
    }
    if (typeof value === 'number' && isFinite(value)) {
      return '<span class="tile-value" data-count="' + value + '" data-fmt="int">' + fmt.int(value) + '</span>';
    }
    return '<span class="tile-value">' + value + '</span>';
  }

  function tile(label, value, sub, tone, count) {
    return '<div class="' + cls(['tile', tone ? 'tone-' + tone : '']) + '">' +
      '<span class="tile-label">' + esc(label) + '</span>' +
      valueHtml(value, count) +
      (sub ? '<span class="tile-sub">' + sub + '</span>' : '') +
      '</div>';
  }

  function tiles(list) { return '<div class="tiles" data-n="' + list.length + '">' + list.join('') + '</div>'; }

  function kpi(label, value, sub, tone, count) {
    var v;
    if (count && typeof count.v === 'number' && isFinite(count.v)) {
      var k = count.fmt || 'int';
      v = '<span class="kpi-v ' + (tone || '') + '" data-count="' + count.v + '" data-fmt="' + k + '">' +
        fmt.stat(k, count.v) + '</span>';
    } else if (typeof value === 'number' && isFinite(value)) {
      v = '<span class="kpi-v ' + (tone || '') + '" data-count="' + value + '" data-fmt="int">' + fmt.int(value) + '</span>';
    } else {
      v = '<span class="kpi-v ' + (tone || '') + '">' + value + '</span>';
    }
    return '<div class="kpi"><span class="kpi-k">' + esc(label) + '</span>' + v +
      (sub ? '<span class="kpi-s">' + sub + '</span>' : '') + '</div>';
  }

  function kpis(list) { return '<div class="kpis" data-n="' + list.length + '">' + list.join('') + '</div>'; }

  /* --------------------------------------------------------
     Barras
     -------------------------------------------------------- */
  function bar(value, max, tone) {
    var p = U.clamp((value / (max || 100)) * 100, 0, 100);
    return '<span class="bar"><span class="bar-fill ' + (tone ? 'tone-' + tone : '') +
      '" style="width:' + p.toFixed(1) + '%"></span></span>';
  }

  function attrRow(label, value, delta) {
    var tone = value >= 80 ? 'hi' : (value >= 60 ? 'mid' : (value >= 40 ? 'lo' : 'min'));
    var d = '';
    if (delta !== undefined && delta !== null && Math.abs(delta) >= 1) {
      d = '<span class="attr-delta ' + (delta > 0 ? 'up' : 'down') + '">' + fmt.signed(delta) + '</span>';
    } else if (delta !== undefined) {
      d = '<span class="attr-delta muted">·</span>';
    }
    return '<div class="attr">' +
      '<span class="attr-name">' + esc(label) + '</span>' +
      bar(value, 100, tone) +
      '<span class="attr-val">' + Math.round(value) + '</span>' + d +
      '</div>';
  }

  /**
   * Barra de estadística contra el baremo REAL del rol: dónde cae
   * tu número entre "flojo" y "élite" para tu posición.
   */
  function statBar(label, value, low, high, fmtKind) {
    var pos = U.clamp(U.norm(value, low, high), 0, 1) * 100;
    return '<div class="statbar" title="Baremo de tu posición: ' +
      esc(fmt.stat(fmtKind, low)) + ' → ' + esc(fmt.stat(fmtKind, high)) + '">' +
      '<div class="statbar-head"><span class="statbar-name">' + esc(label) + '</span>' +
      '<span class="statbar-val">' + fmt.stat(fmtKind, value) + '</span></div>' +
      '<div class="statbar-track"><span class="statbar-mark" style="left:calc(' + pos.toFixed(1) + '% - 1.5px)"></span></div>' +
      '<div class="statbar-scale"><span>Flojo</span><span>Media</span><span>Élite</span></div>' +
      '</div>';
  }

  /** Todas las barras que realmente pesan en el rating de ese rol */
  function statBars(role, avg) {
    var spec = DCS.data.ROLES[role].ratingSpec;
    var display = DCS.data.ROLES[role].display;
    var labels = {}, fmts = {};
    display.forEach(function (d) { labels[d.key] = d.label; fmts[d.key] = d.fmt; });
    labels.kda = 'KDA'; fmts.kda = fmts.kda || 'dec2';
    return spec.map(function (s) {
      var v = avg[s.key];
      if (v === undefined) return '';
      return statBar(labels[s.key] || s.key, v, s.low, s.high, fmts[s.key] || 'dec1');
    }).join('');
  }

  /* --------------------------------------------------------
     Distintivos
     -------------------------------------------------------- */
  function badge(text, tone) {
    return '<span class="' + cls(['badge', tone ? 'badge-' + tone : '']) + '">' + esc(text) + '</span>';
  }

  function tierBadge(tier) {
    if (!tier) return badge('Sin equipo', 'muted');
    return badge('TIER ' + tier, 't' + tier);
  }

  function posChip(role) {
    var r = DCS.data.ROLES[role];
    return '<span class="pos-chip pos-' + role + '">' + r.short + '</span>';
  }

  function posChipFull(role) {
    var r = DCS.data.ROLES[role];
    return '<span class="pos-chip pos-' + role + '">' + r.short + ' · ' + esc(r.name) + '</span>';
  }

  function ratingBand(r) {
    if (r >= 90) return 'r-elite';
    if (r >= 80) return 'r-great';
    if (r >= 70) return 'r-good';
    if (r >= 60) return 'r-ok';
    if (r >= 50) return 'r-mid';
    return 'r-bad';
  }

  function ratingChip(r) {
    if (r === null || r === undefined) return '<span class="rating-chip none">—</span>';
    return '<span class="rating-chip ' + ratingBand(r) + '">' + r + '</span>';
  }

  /* --------------------------------------------------------
     Navegación interna
     -------------------------------------------------------- */
  function tabs(items, active, action) {
    return '<div class="tabs">' + items.map(function (it) {
      return '<button class="tab' + (it.id === active ? ' active' : '') +
        '" data-action="' + action + '" data-value="' + esc(it.id) + '">' + esc(it.label) + '</button>';
    }).join('') + '</div>';
  }

  /* --------------------------------------------------------
     Tablas y botones
     -------------------------------------------------------- */
  function headerLabel(x) {
    return String(x).replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function table(headers, rows, opts) {
    opts = opts || {};
    var h = '<thead><tr>' + headers.map(function (x) {
      return '<th' + (/^\s*<b>?\s*$/.test(x) ? '' : '') + '>' + x + '</th>';
    }).join('') + '</tr></thead>';
    var b = '<tbody>' + rows.map(function (r) {
      var attrs = r.attrs || '';
      var cells = (r.cells || r).map(function (c, i) {
        var lab = headers[i] != null ? ' data-label="' + esc(headerLabel(headers[i])) + '"' : '';
        return '<td' + lab + '>' + c + '</td>';
      }).join('');
      return '<tr ' + attrs + '>' + cells + '</tr>';
    }).join('') + '</tbody>';
    return '<div class="table-wrap"><table class="' + cls(['tbl', opts.className]) + '">' + h + b + '</table></div>';
  }

  function btn(label, action, o) {
    o = o || {};
    return '<button type="button" class="' + cls(['btn', o.variant ? 'btn-' + o.variant : '', o.block ? 'btn-block' : '', o.size ? 'btn-' + o.size : '']) +
      '" data-action="' + esc(action) + '"' +
      (o.value !== undefined ? ' data-value="' + esc(o.value) + '"' : '') +
      (o.aria ? ' aria-label="' + esc(o.aria) + '"' : '') +
      (o.title ? ' title="' + esc(o.title) + '"' : '') +
      (o.disabled ? ' disabled' : '') + '>' + label +
      (o.key ? '<kbd>' + esc(o.key) + '</kbd>' : '') + '</button>';
  }

  function empty(text) { return '<p class="empty">' + esc(text) + '</p>'; }

  /* --------------------------------------------------------
     Estadísticas del rol en formato ficha
     -------------------------------------------------------- */
  function statGrid(role, avg) {
    var spec = DCS.data.ROLES[role].display;
    return tiles(spec.map(function (s) {
      return tile(s.label, fmt.stat(s.fmt, avg[s.key]), null, null, { v: avg[s.key], fmt: s.fmt });
    }));
  }

  /* --------------------------------------------------------
     Resultados de torneo (fila desplegable) y desglose de series
     -------------------------------------------------------- */
  function resultRow(t, open, index) {
    var champion = t.placement === 1 && t.kind !== 'qualifier';
    var win = t.wins > t.losses;
    var state = champion ? 'champion' : (win ? 'win' : 'loss');
    var hasLog = t.log && t.log.length;
    return '<div class="' + cls(['result-row', state, t.kind === 'ti' ? 'ti' : '', open ? 'open' : '', 'reveal']) + '"' +
      (index !== undefined ? ' style="animation-delay:' + (index * 70) + 'ms"' : '') +
      (hasLog ? ' data-action="toggle-tourn" data-value="' + esc(t.id) + '"' : '') + '>' +
      '<span class="rmark"></span>' +
      '<div><div class="rname">' + esc(t.name) + '</div>' +
      '<div class="rmeta">' + teamMark({ id: t.teamId, name: t.teamName }, 'sm') + ' · ' + t.wins + '-' + t.losses + ' mapas · ' +
      t.seriesWon + '-' + t.seriesLost + ' series · ' + t.field + ' equipos</div></div>' +
      '<div class="rright">' +
      '<span class="rres">' + esc(t.result) + '</span>' +
      (t.prize ? badge(fmt.money(t.prize), 'gold') : '') +
      ratingChip(t.rating) +
      (hasLog ? '<span class="rchev">▶</span>' : '') +
      '</div></div>' +
      (open && hasLog ? seriesList(t.log) : '');
  }

  function seriesList(log) {
    var html = '<div class="series-list">';
    var stage = null;
    log.forEach(function (s) {
      if (s.stage !== stage) {
        stage = s.stage;
        html += '<div class="series-stage">' + esc(stage) + '</div>';
      }
      var cl = s.won === true ? 'w' : (s.won === false ? 'l' : 'd');
      html += '<div class="series-row ' + cl + '">' +
        '<span class="sopp">vs ' + teamMark(s.opp, 'sm') + '</span>' +
        '<span class="sfmt">' + esc(s.fmt) + '</span>' +
        '<span class="maps">' + (s.maps || '').split('').map(function (m) {
          return '<span class="map-pill ' + m.toLowerCase() + '">' + m + '</span>';
        }).join('') + '</span>' +
        '<span class="sscore">' + s.w + '-' + s.l + '</span>' +
        '</div>';
    });
    return html + '</div>';
  }

  function toneClass(tone) {
    return tone === 'great' ? 'ev-great' : tone === 'good' ? 'ev-good' : tone === 'bad' ? 'ev-bad' : 'ev-neutral';
  }

  function initials(name) {
    var s = String(name || '').trim();
    if (!s) return '?';
    var parts = s.split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  }

  /** [logo] Nombre. size: 'sm' (~28px) | 'md' (~48px) */
  function teamMark(ref, size) {
    if (!ref) {
      return '<span class="team-mark team-mark-sm muted">Sin equipo</span>';
    }
    var id = typeof ref === 'string' ? ref : (ref.id || ref.teamId);
    var name = typeof ref === 'string' ? ref : (ref.name || ref.teamName);
    var cat = DCS.data.teamLookup ? DCS.data.teamLookup(typeof ref === 'string' ? ref : { id: id, name: name }) : null;
    if (cat) {
      if (!name) name = cat.name;
      if (!id) id = cat.id;
    }
    if (!name) name = 'Sin equipo';
    var src = null;
    if (DCS.data.teamLogo) src = DCS.data.teamLogo(typeof ref === 'object' ? ref : { id: id, name: name });
    if (!src && ref && ref.logo) src = ref.logo;
    var sz = size === 'md' ? 'md' : 'sm';
    /* Sin depender de un placeholder.svg externo: si no hay logo, o si
       falla al cargar, se muestran las iniciales del equipo (siempre
       disponibles, no piden ningún archivo). */
    var img = src
      ? '<img class="team-logo" src="' + esc(src) + '" alt="" ' +
      'onerror="this.style.display=\'none\';this.nextElementSibling.style.display=\'flex\'">'
      : '';
    var phStyle = src ? '' : ' style="display:flex"';
    return '<span class="team-mark team-mark-' + sz + '">' +
      '<span class="team-logo-wrap">' + img +
      '<span class="team-logo-ph"' + phStyle + ' aria-hidden="true">' + esc(initials(name)) + '</span></span>' +
      '<span class="team-mark-name">' + esc(name) + '</span></span>';
  }

  DCS.ui.c = {
    esc: esc, cls: cls, card: card,
    tile: tile, tiles: tiles, kpi: kpi, kpis: kpis,
    bar: bar, attrRow: attrRow, statBar: statBar, statBars: statBars,
    badge: badge, tierBadge: tierBadge, posChip: posChip, posChipFull: posChipFull,
    ratingChip: ratingChip, ratingBand: ratingBand,
    tabs: tabs, table: table, btn: btn, empty: empty,
    statGrid: statGrid, resultRow: resultRow, seriesList: seriesList,
    toneClass: toneClass, teamMark: teamMark
  };
})(window.DCS = window.DCS || {});
