/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   UI / CHARTS — gráficos SVG sin dependencias
   ------------------------------------------------------------
   El gráfico de trayectoria es el mapa de la carrera: se ve de un
   vistazo el arranque, el crecimiento, el prime, el declive y la
   retirada. Y cada año es pulsable.
   ============================================================ */
(function (DCS) {
  'use strict';

  var U = DCS.util;
  var C = { ember: '#ff6b3d', teal: '#1fd9b0', gold: '#ffc247', blue: '#4d9dff', steel: '#8496ab', dim: '#8494a7' };

  function esc(s) { return DCS.ui.c.esc(s); }

  function bandColor(r) {
    if (r === null || r === undefined) return C.steel;
    if (r >= 90) return C.gold;
    if (r >= 80) return C.ember;
    if (r >= 70) return C.teal;
    if (r >= 60) return C.blue;
    return C.steel;
  }

  function tierColor(t) {
    return t === 1 ? C.ember : (t === 2 ? C.blue : (t === 3 ? C.steel : '#2a3646'));
  }

  /* --------------------------------------------------------
     Línea simple (evolución de un valor)
     -------------------------------------------------------- */
  function sparkline(series, opts) {
    opts = opts || {};
    var pts = series.filter(function (s) { return s.value !== null && s.value !== undefined; });
    if (pts.length < 2) return '<p class="empty">Aún no hay suficientes temporadas para dibujar la evolución.</p>';
    var w = 640, h = 150, padX = 26, padT = 14, padB = 24;
    var min = opts.min !== undefined ? opts.min : Math.min.apply(null, pts.map(function (p) { return p.value; })) - 5;
    var max = opts.max !== undefined ? opts.max : Math.max.apply(null, pts.map(function (p) { return p.value; })) + 5;
    if (max - min < 12) max = min + 12;
    var color = opts.color || C.ember;
    var id = 'sg' + Math.random().toString(36).slice(2, 7);
    var x = function (i) { return padX + (i / (pts.length - 1)) * (w - padX * 2); };
    var y = function (v) { return padT + (1 - (v - min) / (max - min)) * (h - padT - padB); };

    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(p.value).toFixed(1); }).join(' ');
    var area = line + ' L' + x(pts.length - 1).toFixed(1) + ',' + (h - padB) + ' L' + x(0).toFixed(1) + ',' + (h - padB) + ' Z';

    var grid = '';
    [0.25, 0.5, 0.75].forEach(function (g) {
      var gy = padT + g * (h - padT - padB);
      grid += '<line x1="' + padX + '" y1="' + gy + '" x2="' + (w - padX) + '" y2="' + gy +
        '" stroke="#1f2833" stroke-width="1"/>';
    });

    var dots = pts.map(function (p, i) {
      return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.value).toFixed(1) + '" r="3" fill="' + color + '">' +
        '<title>' + esc(p.label + ': ' + p.value) + '</title></circle>';
    }).join('');

    var labels = pts.map(function (p, i) {
      if (pts.length > 10 && i % 2) return '';
      return '<text x="' + x(i).toFixed(1) + '" y="' + (h - 6) + '" fill="#8494a7" font-size="9.5" text-anchor="middle">' +
        esc(String(p.label).slice(-2)) + '</text>';
    }).join('');

    return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:150px" preserveAspectRatio="none">' +
      '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' + color + '" stop-opacity=".3"/>' +
      '<stop offset="100%" stop-color="' + color + '" stop-opacity="0"/></linearGradient></defs>' +
      grid +
      '<path d="' + area + '" fill="url(#' + id + ')"/>' +
      '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + labels + '</svg>';
  }

  /* --------------------------------------------------------
     Trayectoria completa: rating + valoración + tier, pulsable
     -------------------------------------------------------- */
  function careerChart(history, openYear) {
    if (!history.length) return '<p class="empty">Todavía no has completado ninguna temporada.</p>';
    var n = history.length;
    var w = 900, h = 250, padX = 34, padT = 18, padB = 54;
    var innerH = h - padT - padB;
    var step = n > 1 ? (w - padX * 2) / (n - 1) : 0;
    var x = function (i) { return n > 1 ? padX + i * step : w / 2; };
    var y = function (v) { return padT + (1 - U.clamp(v, 0, 100) / 100) * innerH; };
    var colW = n > 1 ? step : (w - padX * 2);

    /* rejilla y referencias */
    var svg = '';
    [90, 75, 60, 45, 30].forEach(function (v) {
      svg += '<line x1="' + padX + '" y1="' + y(v) + '" x2="' + (w - padX) + '" y2="' + y(v) +
        '" stroke="#1f2833" stroke-width="1"/>' +
        '<text x="' + (padX - 8) + '" y="' + (y(v) + 3) + '" fill="#5d6c80" font-size="9" text-anchor="end">' + v + '</text>';
    });

    /* franja de tier bajo el gráfico */
    svg += '<text x="' + (padX - 8) + '" y="' + (h - padB + 21) + '" fill="#5d6c80" font-size="8.5" text-anchor="end" letter-spacing="1">TIER</text>';
    history.forEach(function (hh, i) {
      var cx = x(i) - colW / 2;
      svg += '<rect x="' + Math.max(0, cx).toFixed(1) + '" y="' + (h - padB + 12) + '" width="' + Math.max(2, colW - 2).toFixed(1) +
        '" height="7" rx="2" fill="' + tierColor(hh.tier) + '" opacity="' + (hh.tier ? '.9' : '.28') + '">' +
        '<title>' + esc(hh.year + ': ' + (hh.tier ? 'Tier ' + hh.tier : 'sin equipo')) + '</title></rect>';
    });

    /* líneas */
    function pathFor(getter) {
      var d = '', started = false;
      history.forEach(function (hh, i) {
        var v = getter(hh);
        if (v === null || v === undefined) { started = false; return; }
        d += (started ? 'L' : 'M') + x(i).toFixed(1) + ',' + y(v).toFixed(1) + ' ';
        started = true;
      });
      return d.trim();
    }
    var overallPath = pathFor(function (hh) { return hh.overallEnd; });
    var ratingPath = pathFor(function (hh) { return hh.rating; });

    /* relleno bajo la línea de rating: da cuerpo a la trayectoria */
    var rated = history.filter(function (hh) { return hh.rating !== null && hh.rating !== undefined; });
    if (rated.length > 1) {
      var firstI = history.indexOf(rated[0]), lastI = history.indexOf(rated[rated.length - 1]);
      var gid = 'cg' + Math.random().toString(36).slice(2, 7);
      svg = '<defs><linearGradient id="' + gid + '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' + C.teal + '" stop-opacity=".26"/>' +
        '<stop offset="100%" stop-color="' + C.teal + '" stop-opacity="0"/></linearGradient></defs>' + svg +
        '<path d="' + ratingPath + ' L' + x(lastI).toFixed(1) + ',' + (h - padB) +
        ' L' + x(firstI).toFixed(1) + ',' + (h - padB) + ' Z" fill="url(#' + gid + ')"/>';
    }

    svg += '<path d="' + overallPath + '" fill="none" stroke="' + C.ember +
      '" stroke-width="2" stroke-linejoin="round" stroke-dasharray="4 4" opacity=".75"/>';
    svg += '<path d="' + ratingPath + '" fill="none" stroke="' + C.teal +
      '" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"/>';

    /* puntos, hitos y zonas pulsables */
    history.forEach(function (hh, i) {
      var cx = x(i), open = openYear === hh.year;
      if (hh.rating !== null && hh.rating !== undefined) {
        svg += '<circle class="dot" cx="' + cx.toFixed(1) + '" cy="' + y(hh.rating).toFixed(1) + '" r="' + (open ? 5.5 : 3.6) +
          '" fill="' + bandColor(hh.rating) + '" stroke="#080a0f" stroke-width="1.5"/>';
      }
      var titles = (hh.tournaments || []).filter(function (t) { return t.placement === 1 && t.kind !== 'qualifier' && t.prestige >= 6; }).length;
      var ti = (hh.tournaments || []).some(function (t) { return t.kind === 'ti'; });
      var tiWin = (hh.tournaments || []).some(function (t) { return t.kind === 'ti' && t.placement === 1; });
      if (tiWin) {
        svg += '<text x="' + cx.toFixed(1) + '" y="' + (y(hh.rating || 50) - 12) + '" fill="' + C.gold +
          '" font-size="15" text-anchor="middle">★</text>';
      } else if (titles) {
        svg += '<text x="' + cx.toFixed(1) + '" y="' + (y(hh.rating || 50) - 11) + '" fill="' + C.gold +
          '" font-size="11" text-anchor="middle">●</text>';
      } else if (ti) {
        svg += '<circle cx="' + cx.toFixed(1) + '" cy="' + (y(hh.rating || 50) - 12) + '" r="3" fill="none" stroke="' + C.gold + '" stroke-width="1.4"/>';
      }
      /* etiqueta de año */
      if (n <= 14 || i % 2 === 0 || open) {
        svg += '<text x="' + cx.toFixed(1) + '" y="' + (h - padB + 34) + '" fill="' + (open ? '#f0f4f9' : '#8494a7') +
          '" font-size="10" font-weight="' + (open ? '700' : '400') + '" text-anchor="middle">' + hh.year + '</text>';
      }
      svg += '<rect class="hit" data-action="toggle-year" data-value="' + hh.year + '" x="' + (cx - colW / 2).toFixed(1) +
        '" y="' + padT + '" width="' + Math.max(6, colW).toFixed(1) + '" height="' + (innerH + 26).toFixed(1) +
        '" fill="' + (open ? 'rgba(255,107,61,.10)' : 'transparent') + '">' +
        '<title>' + esc(hh.year + ' · ' + hh.age + ' años · ' + hh.teamName +
          (hh.rating !== null ? ' · rating ' + hh.rating : '')) + '</title></rect>';
    });

    var legend = '<div class="row small muted" style="justify-content:center;gap:18px;margin-top:6px">' +
      '<span><span style="display:inline-block;width:14px;height:2.6px;background:' + C.teal + ';vertical-align:middle;margin-right:6px"></span>Rating de temporada</span>' +
      '<span><span style="display:inline-block;width:14px;height:0;border-top:2px dashed ' + C.ember + ';vertical-align:middle;margin-right:6px"></span>Valoración</span>' +
      '<span><span style="color:' + C.gold + '">★</span> The International</span>' +
      '<span><span style="color:' + C.gold + '">●</span> Título de prestigio</span>' +
      '</div>';

    return '<svg class="tl-chart" viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:250px">' + svg + '</svg>' + legend;
  }

  /* --------------------------------------------------------
     Anillo de rating
     -------------------------------------------------------- */
  function ring(value, label) {
    if (value === null || value === undefined) {
      return '<div class="center muted small">Sin rating</div>';
    }
    var size = 116, stroke = 9, r = (size - stroke) / 2, cx = size / 2;
    var circ = 2 * Math.PI * r;
    var pct = U.clamp(value, 0, 100) / 100;
    var color = bandColor(value);
    return '<div style="display:flex;flex-direction:column;align-items:center;gap:6px">' +
      '<svg viewBox="0 0 ' + size + ' ' + size + '" style="width:116px;height:116px">' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="#212c3a" stroke-width="' + stroke + '"/>' +
      '<circle cx="' + cx + '" cy="' + cx + '" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="' + stroke +
      '" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(1) + '" stroke-dashoffset="' + (circ * (1 - pct)).toFixed(1) +
      '" transform="rotate(-90 ' + cx + ' ' + cx + ')"/>' +
      '<text x="' + cx + '" y="' + (cx + 3) + '" text-anchor="middle" fill="#f0f4f9" font-size="30" font-weight="700" font-family="ui-monospace,Consolas,monospace">' +
      Math.round(value) + '</text>' +
      '<text x="' + cx + '" y="' + (cx + 20) + '" text-anchor="middle" fill="#8494a7" font-size="9" letter-spacing="1.5">/100</text>' +
      '</svg>' +
      (label ? '<span class="small muted">' + esc(label) + '</span>' : '') +
      '</div>';
  }

  DCS.ui.charts = {
    sparkline: sparkline,
    careerChart: careerChart,
    ring: ring,
    bandColor: bandColor,
    tierColor: tierColor
  };
})(window.DCS = window.DCS || {});
