/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   UI / ANIM — vida en la interfaz
   ------------------------------------------------------------
   Animaciones cortas y con propósito: los números suben al
   aparecer, los resultados se revelan en cascada y los grandes
   títulos se celebran. Nada de esto altera el estado del juego.
   ============================================================ */
(function (DCS) {
  'use strict';

  var reduced = false;
  try {
    reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reduced = false; }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  /** Recorre [data-count] y hace subir el número hasta su valor final. */
  function countUp(root, duration) {
    var nodes = (root || document).querySelectorAll('[data-count]');
    if (!nodes.length) return;
    var dur = duration || 460;

    for (var i = 0; i < nodes.length; i++) {
      (function (el) {
        var target = parseFloat(el.getAttribute('data-count'));
        var kind = el.getAttribute('data-fmt') || 'int';
        if (!isFinite(target)) { return; }

        /* números pequeños y enteros: sin teatro */
        if (reduced || (Math.abs(target) < 20 && kind === 'int')) {
          el.textContent = DCS.ui.fmt.stat(kind, target);
          el.removeAttribute('data-count');
          return;
        }

        var start = performance.now();
        el.removeAttribute('data-count');
        function frame(now) {
          var t = Math.min(1, (now - start) / dur);
          var v = target * easeOutCubic(t);
          el.textContent = DCS.ui.fmt.stat(kind, t === 1 ? target : v);
          if (t < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
      })(nodes[i]);
    }
  }

  /** Escalona la aparición de una lista de elementos ya renderizados. */
  function stagger(selector, step, root) {
    var nodes = (root || document).querySelectorAll(selector);
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].style.animationDelay = (i * (step || 70)) + 'ms';
    }
  }

  /** Pantallazo de celebración para títulos grandes y The International. */
  function celebrate(o) {
    if (reduced) return;
    var el = document.createElement('div');
    el.className = 'celebrate';
    el.innerHTML = '<div class="c-inner">' +
      '<div class="c-kicker">' + DCS.ui.c.esc(o.kicker || '') + '</div>' +
      '<div class="c-title">' + DCS.ui.c.esc(o.title || '') + '</div>' +
      (o.sub ? '<div class="c-sub">' + DCS.ui.c.esc(o.sub) + '</div>' : '') +
      '</div>';
    document.body.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.remove(); }, 2700);
  }

  /**
   * Decide si un informe de competición merece celebración.
   * Solo lo grande: The International y títulos de prestigio.
   */
  function celebrateFromReport(report) {
    if (!report || !report.tournaments) return;
    var best = null;
    report.tournaments.forEach(function (t) {
      if (t.placement !== 1 || t.kind === 'qualifier') return;
      if (!best || t.prestige > best.prestige) best = t;
    });
    if (!best) return;
    if (best.kind === 'ti') {
      celebrate({ kicker: 'Campeones del mundo', title: best.name, sub: best.teamName + ' levanta el Aegis' });
    } else if (best.prestige >= 8) {
      celebrate({ kicker: 'Título internacional', title: best.name, sub: 'Campeón con ' + best.teamName });
    } else if (best.prestige >= 6) {
      celebrate({ kicker: 'Campeón', title: best.name, sub: 'con ' + best.teamName });
    }
  }

  DCS.ui.anim = {
    countUp: countUp,
    stagger: stagger,
    celebrate: celebrate,
    celebrateFromReport: celebrateFromReport,
    reduced: reduced
  };
})(window.DCS = window.DCS || {});
