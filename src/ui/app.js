/* ============================================================
   LEGACY — NO EDITAR. Congelado el 31 ago 2026.
   ------------------------------------------------------------
   Lo que se publica es dist/index.html. Este archivo ya no forma
   parte del producto ni de los tests: le faltan, entre otras
   cosas, el mercado de agentes libres, las estadísticas de héroes
   y 19 equipos del catálogo. Ver ARCHITECTURE.md.
   ============================================================ */
/* ============================================================
   UI / APP — router, acciones, teclado y arranque
   ============================================================ */
(function (DCS) {
  'use strict';

  var c = DCS.ui.c, fmt = DCS.ui.fmt, D = DCS.data;
  var S = DCS.ui.screens;

  var NAV = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'profile', label: 'Perfil' },
    { id: 'team', label: 'Equipo' },
    { id: 'season', label: 'Temporada' },
    { id: 'tournaments', label: 'Torneos' },
    { id: 'finances', label: 'Patrimonio' },
    { id: 'offers', label: 'Ofertas' },
    { id: 'career', label: 'Carrera' },
    { id: 'legacy', label: 'Legado' }
  ];

  var PHASES = [
    { id: 'preseason', label: 'Pretemporada' },
    { id: 'competition', label: 'Competición' },
    { id: 'review', label: 'Cierre' },
    { id: 'market', label: 'Mercado' },
    { id: 'yearEnd', label: 'Fin de año' }
  ];

  var app = {
    view: 'home',
    openYear: null,
    openTourn: null,
    tab: { profile: 'attrs', season: 'summary', career: 'timeline' },
    draft: null,
    root: null,

    newDraft: function () {
      return {
        name: '', nick: '', region: 'eeu',
        nationality: D.REGIONS.eeu.nationalities[0],
        role: 'mid', archetype: 'mechanical'
      };
    },

    go: function (view) {
      var prev = app.view;
      if (prev === 'trophyRoom' && view !== 'trophyRoom' && DCS.ui.trophyRoom) {
        DCS.ui.trophyRoom.leave();
      }
      if (view === 'trophyRoom' && prev !== 'trophyRoom' && DCS.ui.trophyRoom && DCS.game.state) {
        DCS.ui.trophyRoom.beginVisit(DCS.game.state);
      }
      app.view = view;
      app.render();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    toast: function (msg) {
      var old = document.querySelector('.toast');
      if (old) old.remove();
      var el = document.createElement('div');
      el.className = 'toast';
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(function () { if (el.parentNode) el.remove(); }, 2800);
    },

    /* ------------------------------------------------------- */
    render: function () {
      var state = DCS.game.state;
      var html;

      if (app.view === 'home') html = S.home();
      else if (app.view === 'create') html = S.create(app.draft || (app.draft = app.newDraft()));
      else if (!state) { app.view = 'home'; html = S.home(); }
      else html = app.shell(state);

      app.root.innerHTML = html;
      if (app.view === 'create') app.wireCreate();
      if (app.view === 'trophyRoom' && DCS.ui.trophyRoom) DCS.ui.trophyRoom.mount();
      if (state && state.pending) app.renderModal(state);
      DCS.ui.anim.countUp(app.root);
    },

    shell: function (state) {
      var p = state.player;
      var team = DCS.game.team();
      var body;
      switch (app.view) {
        case 'profile': body = S.profile(state, app.tab.profile); break;
        case 'team': body = S.team(state); break;
        case 'season': body = S.season(state, app.tab.season); break;
        case 'tournaments': body = S.tournaments(state); break;
        case 'offers': body = S.offers(state); break;
        case 'finances': body = S.finances(state); break;
        case 'career': body = S.career(state, app.tab.career, app.openYear); break;
        case 'trophyRoom': body = S.trophyRoom ? S.trophyRoom(state) : S.career(state, app.tab.career, app.openYear); break;
        case 'legacy': body = S.legacy(state); break;
        default: body = S.dashboard(state);
      }

      var nav = NAV.map(function (n) {
        var badge = '';
        if (n.id === 'offers' && state.offers && state.offers.length) {
          badge = ' <span class="badge badge-gold">' + state.offers.length + '</span>';
        }
        if (n.id === 'tournaments' && state.season && state.season.liveTour) {
          badge = state.season.liveTour.done
            ? ' <span class="badge badge-gold">cierre</span>'
            : ' <span class="badge badge-gold">en juego</span>';
        }
        var on = app.view === n.id || (n.id === 'career' && app.view === 'trophyRoom');
        return '<button data-action="nav" data-value="' + n.id + '" class="' +
          (on ? 'active' : '') + '"' +
          (n.id === 'career' && app.view === 'trophyRoom' ? ' aria-current="page"' : '') +
          '>' + n.label + badge + '</button>';
      }).join('');

      var last = state.career.lastRating;
      var hud = '<div class="hud">' +
        '<div class="hud-item"><span class="hud-k">Edad</span><span class="hud-v">' + p.age + '</span></div>' +
        '<div class="hud-item"><span class="hud-k">Val</span><span class="hud-v" style="color:var(--gold)">' + p.overall + '</span></div>' +
        '<div class="hud-item"><span class="hud-k">MMR</span><span class="hud-v">' + fmt.mmr(p.mmr) + '</span></div>' +
        '<div class="hud-item"><span class="hud-k">Rating</span><span class="hud-v">' + (last === null ? '—' : last) + '</span></div>' +
        '<div class="hud-item"><span class="hud-k">Rep</span><span class="hud-v">' + Math.round(p.reputation) + '</span></div>' +
        '<div class="hud-item"><span class="hud-k">€</span><span class="hud-v">' + fmt.money(DCS.engine.finance.snapshot(state).cash) + '</span></div>' +
        '</div>';

      return '<div class="app">' +
        '<header class="topbar">' +
        '<div class="brand"><i></i><span>DOTA 2</span><b>CAREER</b></div>' +
        '<div class="identity"><span class="nick">' + c.esc(p.nick) + '</span>' +
        c.posChip(p.role) +
        '<span class="meta">' + (team ? c.teamMark(team, 'sm') : 'Agente libre') + '</span></div>' +
        '<div class="topbar-right">' + hud +
        c.badge(state.year, 'info') + '</div></header>' +

        '<div class="shell"><nav class="nav">' + nav +
        '<div class="nav-sep"></div>' +
        '<button data-action="go-home">Inicio</button>' +
        '</nav><main class="main">' + body + '</main></div>' +

        app.advanceBar(state) +
        '</div>';
    },

    phaseTrack: function (state) {
      var current = state.season ? state.season.phase : 'preseason';
      if (current === 'done') current = 'preseason';
      var idx = 0;
      PHASES.forEach(function (ph, i) { if (ph.id === current) idx = i; });
      var html = '<div class="phase-track">';
      PHASES.forEach(function (ph, i) {
        var cls = i < idx ? 'done' : (i === idx ? 'now' : '');
        html += '<span class="phase-step ' + cls + '">' +
          (i ? '<span class="phase-line"></span>' : '') +
          '<span class="phase-dot" title="' + c.esc(ph.label) + '"></span></span>';
      });
      return html + '</div><span class="phase-name">' + c.esc(PHASES[idx].label) + '</span>';
    },

    advanceBar: function (state) {
      if (state.finished) {
        return '<div class="advance">' +
          '<span class="hint">Carrera finalizada · ' + (state.legacy ? c.esc(state.legacy.category) : '') + '</span>' +
          '<span class="spacer"></span>' +
          c.btn('Ver legado', 'nav', { value: 'legacy' }) +
          c.btn('Nueva carrera', 'new-career', { variant: 'primary' }) +
          '</div>';
      }
      if (state.pending && state.pending.type === 'tournament') {
        var live = state.season && state.season.liveTour;
        if (app.view !== 'tournaments') {
          return '<div class="advance"><span class="hint">Serie pendiente en Torneos</span><span class="spacer"></span>' +
            c.btn('Ir al torneo', 'nav', { value: 'tournaments', variant: 'primary' }) + '</div>';
        }
        if (live && live.done) {
          return '<div class="advance"><span class="hint">Torneo cerrado</span><span class="spacer"></span>' +
            c.btn('Continuar', 'tour-continue', { variant: 'primary' }) + '</div>';
        }
        return '<div class="advance"><span class="hint">Serie en curso</span><span class="spacer"></span>' +
          c.btn('Simular serie', 'tour-series', { variant: 'primary' }) +
          c.btn('Simular torneo', 'tour-rest', { variant: 'ghost' }) + '</div>';
      }
      if (state.pending) {
        return '<div class="advance"><span class="hint">Tienes una decisión pendiente</span>' +
          '<span class="spacer"></span>' + c.btn('Resolver', 'show-pending', { variant: 'primary' }) + '</div>';
      }
      var offersPending = state.offers && state.offers.length;
      return '<div class="advance">' +
        app.phaseTrack(state) +
        '<span class="spacer"></span>' +
        (offersPending
          ? '<span class="hint gold">' + state.offers.length + ' oferta(s) sin responder</span>' +
          c.btn('Ver ofertas', 'nav', { value: 'offers', variant: 'gold' })
          : c.btn('Saltar al mercado', 'advance-fast', { variant: 'ghost' })) +
        c.btn(DCS.game.nextLabel(), 'advance', { variant: 'primary', key: 'espacio' }) +
        '</div>';
    },

    /* ------------------------------------------------------- */
    renderModal: function (state) {
      var pend = state.pending;
      if (!pend || pend.type === 'tournament') return;
      var html = '';
      if (pend.type === 'event') {
        var ev = DCS.engine.season.findUnresolvedEvent(state);
        if (!ev) { state.pending = null; return; }
        html = '<div class="modal-bg"><div class="modal">' +
          '<div class="modal-head"><div class="modal-kicker">Decisión</div><h3>' + c.esc(ev.title) + '</h3></div>' +
          '<div class="modal-body"><p>' + c.esc(ev.text) + '</p><div class="choices">' +
          ev.options.map(function (o, i) {
            return '<button class="choice" data-action="choose" data-value="' + i + '">' +
              '<b>' + c.esc(o.label) + '</b><span>' + c.esc(o.hint || '') + '</span></button>';
          }).join('') +
          '</div><p class="small muted mt">Nadie te va a decir qué pasa después.</p></div></div></div>';
      } else if (pend.type === 'retirement') {
        var d = pend.data;
        html = '<div class="modal-bg"><div class="modal">' +
          '<div class="modal-head"><div class="modal-kicker">Fin de ciclo</div><h3>¿Ha llegado el momento?</h3></div>' +
          '<div class="modal-body"><p>' + c.esc(d.text) + '</p>' +
          '<ul class="lines">' + d.reasons.map(function (r) { return '<li>' + c.esc(r) + '</li>'; }).join('') + '</ul>' +
          '<div class="choices">' +
          '<button class="choice" data-action="retire-no"><b>Continuar mi carrera</b>' +
          '<span>Seguir intentándolo: bajar de tier, cambiar de región o de rol, reconstruirte.</span></button>' +
          '<button class="choice" data-action="retire-yes"><b>Retirarme</b>' +
          '<span>Cerrar la carrera aquí y descubrir tu legado.</span></button>' +
          '</div></div></div></div>';
      } else if (pend.type === 'wealth') {
        html = '<div class="modal-bg"><div class="modal">' +
          '<div class="modal-head"><div class="modal-kicker">Dinero</div><h3>' + c.esc(pend.title) + '</h3></div>' +
          '<div class="modal-body"><p>' + c.esc(pend.text) + '</p>' +
          '<p class="small muted">Te piden ' + fmt.money(pend.amount) + ' en ' + c.esc(pend.catName) + '. Nadie te dice qué sale.</p>' +
          '<div class="choices">' +
          '<button class="choice" data-action="wealth-yes"><b>Invertir</b>' +
          '<span>Riesgo alto. Pones el dinero y esperas.</span></button>' +
          '<button class="choice" data-action="wealth-no"><b>Rechazar</b>' +
          '<span>Conservas la liquidez.</span></button>' +
          '</div></div></div></div>';
      }
      if (html) app.root.insertAdjacentHTML('beforeend', html);
    },

    /* ------------------------------------------------------- */
    wireCreate: function () {
      function fitLine(el, maxPx, minPx) {
        if (!el) return;
        el.style.letterSpacing = '0.02em';
        var size = maxPx;
        el.style.fontSize = size + 'px';
        while (size > minPx && el.scrollWidth > el.clientWidth + 1) {
          size -= 0.5;
          el.style.fontSize = size + 'px';
          if (size < 18) el.style.letterSpacing = '0';
        }
      }
      function paintCard() {
        if (!app.draft) return;
        var nameEl = document.querySelector('.pcard-name');
        var nickEl = document.querySelector('.pcard-nick');
        var name = document.getElementById('f-name');
        var nick = document.getElementById('f-nick');
        if (name) app.draft.name = name.value;
        if (nick) app.draft.nick = nick.value;
        if (nameEl) {
          var nm = (app.draft.name || 'sin nombre').trim() || 'sin nombre';
          nameEl.textContent = nm;
          nameEl.setAttribute('title', nm);
        }
        if (nickEl) {
          var nk = ((app.draft.nick || 'nick').trim() || 'nick').toUpperCase();
          nickEl.textContent = nk;
          nickEl.setAttribute('title', nk);
        }
        fitLine(nickEl, 22, 14);
        fitLine(nameEl, 12, 10);
      }
      var name = document.getElementById('f-name');
      var nick = document.getElementById('f-nick');
      if (name) name.addEventListener('input', paintCard);
      if (nick) nick.addEventListener('input', paintCard);
      paintCard();
      var search = document.getElementById('f-nat-search');
      function fold(s) {
        s = String(s || '').toLowerCase();
        try { s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, ''); } catch (e) { }
        return s;
      }
      function filterNats() {
        if (!search || !app.draft) return;
        app.draft.natQuery = search.value;
        var q = fold(search.value.trim());
        var items = document.querySelectorAll('.nat-item');
        var shown = 0;
        for (var i = 0; i < items.length; i++) {
          var n = fold(items[i].getAttribute('data-name') || '');
          var hide = !!(q && n.indexOf(q) === -1);
          items[i].hidden = hide;
          if (!hide) shown++;
        }
        var empty = document.querySelector('.nat-empty');
        if (empty) empty.hidden = !q || shown > 0;
        var grid = document.querySelector('.nat-grid');
        if (grid) grid.hidden = !!(q && shown === 0);
      }
      if (search) {
        search.addEventListener('input', filterNats);
        search.addEventListener('search', filterNats);
        filterNats();
      }
    },

    readDraft: function () {
      var g = function (id) { var el = document.getElementById(id); return el ? el.value : null; };
      var d = app.draft;
      if (g('f-name') !== null) d.name = g('f-name');
      if (g('f-nick') !== null) d.nick = g('f-nick');
      if (g('f-region') !== null) d.region = g('f-region');
      if (g('f-nat') !== null) d.nationality = g('f-nat');
      return d;
    },

    /* ------------------------------------------------------- */
    handle: function (action, value) {
      var state = DCS.game.state;

      switch (action) {
        case 'new-career':
          if (DCS.store.hasSave() && !confirm('Ya existe una carrera guardada. Empezar una nueva la borrará. ¿Continuar?')) return;
          DCS.game.reset();
          app.draft = app.newDraft();
          app.go('create');
          return;

        case 'wipe':
          if (!confirm('Se borrará la carrera guardada. ¿Seguro?')) return;
          DCS.game.reset();
          app.render();
          return;

        case 'continue':
          if (DCS.game.resume()) {
            DCS.game.persist();
            app.go(DCS.game.state.finished ? 'legacy' : 'dashboard');
          }
          else app.toast('No hay ninguna partida guardada.');
          return;

        case 'go-home':
          app.go('home');
          return;

        case 'pick-role':
          app.readDraft(); app.draft.role = value; app.render(); return;

        case 'pick-arch':
          app.readDraft(); app.draft.archetype = value; app.render(); return;

        case 'pick-nat':
          app.readDraft(); app.draft.nationality = value; app.render(); return;

        case 'pick-region':
          app.readDraft(); app.draft.region = value; app.render(); return;

        case 'create-confirm': {
          var d = app.readDraft();
          if (!d.nick || !d.nick.trim()) { app.toast('Necesitas un nickname.'); return; }
          if (!d.name || !d.name.trim()) d.name = d.nick.trim();
          DCS.game.start({
            name: d.name.trim(), nick: d.nick.trim(), nationality: d.nationality,
            region: d.region, role: d.role, archetype: d.archetype
          });
          app.openYear = null; app.openTourn = null;
          app.go('dashboard');
          return;
        }

        case 'nav':
          app.go(value); return;

        case 'tab-profile': app.tab.profile = value; app.render(); return;
        case 'tab-season': app.tab.season = value; app.render(); return;
        case 'tab-career': app.tab.career = value; app.render(); return;

        case 'advance': {
          var before = state.season ? state.season.phase : null;
          var r = DCS.game.advance();
          if (r && r.blocked && r.reason === 'offers') {
            app.toast('Responde al mercado antes de cerrar el año.');
            app.go('offers');
            return;
          }
          if (r && r.legacy) { app.go('legacy'); return; }
          app.openTourn = null;
          if (app.view !== 'dashboard' && !(DCS.game.state.offers || []).length) app.view = 'dashboard';
          if (before === 'market' && DCS.game.state.offers.length) app.view = 'offers';
          app.render();
          if (r && r.type === 'competition') DCS.ui.anim.celebrateFromReport(r);
          return;
        }

        case 'tour-series':
          DCS.game.simSeries();
          app.render();
          return;

        case 'tour-rest':
          DCS.game.simTournament();
          app.render();
          return;

        case 'tour-continue': {
          var next = DCS.game.continueCalendar();
          app.render();
          if (next && next.type === 'competition') DCS.ui.anim.celebrateFromReport(next);
          return;
        }

        case 'advance-fast': {
          var reports = DCS.game.advanceUntilInput(6);
          var st = DCS.game.state;
          if (st.finished) { app.go('legacy'); return; }
          app.openTourn = null;
          app.view = (st.offers && st.offers.length) ? 'offers' : 'dashboard';
          app.render();
          for (var i = 0; i < reports.length; i++) {
            if (reports[i] && reports[i].type === 'competition') DCS.ui.anim.celebrateFromReport(reports[i]);
          }
          return;
        }

        case 'accept-offer': {
          var offer = null;
          (state.offers || []).forEach(function (o) { if (o.id === value) offer = o; });
          if (!offer) return;
          if (DCS.game.acceptOffer(value)) {
            app.toast('Has firmado con ' + offer.teamName + '.');
            app.go('dashboard');
          }
          return;
        }

        case 'decline-offers':
          DCS.game.declineOffers();
          app.toast('Has rechazado todas las ofertas.');
          app.go('dashboard');
          return;

        case 'wealth-invest': {
          var parts = String(value || '').split(':');
          var cat = parts[0];
          var amt = parseInt(parts[1], 10);
          var put = DCS.game.invest(cat, amt);
          app.toast(put.ok ? 'Has puesto ' + fmt.money(put.amount) + ' en ' + put.name + '.' : (put.reason || 'No se pudo invertir.'));
          app.render();
          return;
        }

        case 'wealth-withdraw': {
          var sale=String(value||'').split(':'),sold=DCS.game.withdraw(sale[0],parseInt(sale[1],10));
          app.toast(sold.ok?'Recuperas '+fmt.money(sold.proceeds)+' tras costes.':sold.reason);app.render();return;
        }

        case 'wealth-luxury': {
          var lux=DCS.game.luxury(parseInt(value,10));
          app.toast(lux.ok?'Te das un respiro. El gasto no volverá.':lux.reason);app.render();return;
        }

        case 'wealth-yes': {
          var yes = DCS.game.resolveWealth(true);
          app.toast(yes.ok ? yes.text : (yes.reason || 'No se pudo invertir.'));
          app.render();
          return;
        }

        case 'wealth-no': {
          var no = DCS.game.resolveWealth(false);
          app.toast(no.text || 'Conservas la liquidez.');
          app.render();
          return;
        }

        case 'choose': {
          var out = DCS.game.resolveEvent(parseInt(value, 10));
          app.render();
          if (out && out.outcome) app.toast(out.outcome.slice(0, 110));
          return;
        }

        case 'retire-yes':
          DCS.game.answerRetirement(true);
          app.go('legacy');
          return;

        case 'retire-no':
          DCS.game.answerRetirement(false);
          app.toast('Sigues adelante.');
          app.render();
          return;

        case 'retire-now':
          if (!confirm('¿Retirarte ahora y cerrar la carrera?')) return;
          DCS.game.retireNow();
          app.go('legacy');
          return;

        case 'show-pending':
          app.render();
          return;

        case 'toggle-year':
          app.openYear = (app.openYear === parseInt(value, 10)) ? null : parseInt(value, 10);
          if (app.view === 'career') app.tab.career = 'timeline';
          app.render();
          return;

        case 'toggle-tourn':
          app.openTourn = (app.openTourn === value) ? null : value;
          app.render();
          return;

        case 'trophy-select':
          if (DCS.ui.trophyRoom) DCS.ui.trophyRoom.select(value);
          return;

        case 'trophy-view':
          if (value === '2d' && DCS.ui.trophyRoom) DCS.ui.trophyRoom.leave();
          if (DCS.ui.trophyRoom) DCS.ui.trophyRoom.setView(value);
          app.render();
          return;

        case 'trophy-lang':
          if (DCS.ui.trophyRoom) DCS.ui.trophyRoom.setLang(value);
          app.render();
          return;

        case 'trophy-reset': {
          var sc = DCS.ui.trophyScene && DCS.ui.trophyScene.current();
          if (sc) sc.resetCamera();
          return;
        }

        case 'trophy-skip': {
          var tr = DCS.ui.trophyRoom && DCS.ui.trophyRoom.room;
          if (tr) tr.celebrating = false;
          var scs = DCS.ui.trophyScene && DCS.ui.trophyScene.current();
          if (scs) scs.skipCelebrate();
          var skipBtn = document.querySelector('[data-action="trophy-skip"]');
          if (skipBtn && skipBtn.parentNode) skipBtn.parentNode.removeChild(skipBtn);
          return;
        }
      }
    },

    /* ------------------------------------------------------- */
    keydown: function (e) {
      var tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      var state = DCS.game.state;
      var modal = document.querySelector('.modal');

      if (modal) {
        /* en una decisión, 1 y 2 eligen opción */
        if (e.key === '1' || e.key === '2' || e.key === '3') {
          var choices = modal.querySelectorAll('.choice');
          var idx = parseInt(e.key, 10) - 1;
          if (choices[idx]) { e.preventDefault(); choices[idx].click(); }
        }
        return;
      }

      if (app.view === 'trophyRoom' && e.key === 'Escape') {
        e.preventDefault();
        app.go('career');
        return;
      }
      if (app.view === 'trophyRoom' && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
        var items = document.querySelectorAll('.trophy-navitem');
        if (items.length) {
          e.preventDefault();
          var idx = -1;
          for (var i = 0; i < items.length; i++) {
            if (items[i].classList.contains('is-on')) idx = i;
          }
          if (e.key === 'ArrowDown') idx = Math.min(items.length - 1, idx + 1);
          else idx = Math.max(0, idx < 0 ? 0 : idx - 1);
          items[idx].focus();
          items[idx].click();
        }
        return;
      }
      if (e.code === 'Space' || e.key === 'Enter') {
        if (app.view === 'trophyRoom' && e.target && e.target.closest && !e.target.closest('.advance')) return;
        var liveBtn = document.querySelector('.advance [data-action="tour-series"], .advance [data-action="tour-continue"]');
        if (liveBtn && !liveBtn.disabled) { e.preventDefault(); liveBtn.click(); return; }
        var btn = document.querySelector('.advance [data-action="advance"]');
        if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
        return;
      }
      /* 1-9 saltan de pantalla */
      if (state && /^[1-9]$/.test(e.key)) {
        var n = NAV[parseInt(e.key, 10) - 1];
        if (n) { e.preventDefault(); app.go(n.id); }
      }
    },

    boot: function () {
      app.root = document.getElementById('root');
      document.addEventListener('click', function (e) {
        var el = e.target.closest ? e.target.closest('[data-action]') : null;
        if (!el) return;
        e.preventDefault();
        app.handle(el.getAttribute('data-action'), el.getAttribute('data-value'));
      });
      document.addEventListener('keydown', app.keydown);
      app.render();
    }
  };

  DCS.ui.app = app;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', app.boot);
  else app.boot();
})(window.DCS = window.DCS || {});
