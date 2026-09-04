/* ============================================================
   UI / TROPHY ROOM — acceso, panel HTML, galería 2D e i18n
   ------------------------------------------------------------
   La sala no altera el historial: solo lo representa. Three.js
   se pide al abrir el modo 3D; si falla, la galería 2D basta.
   ============================================================ */
(function (DCS) {
  'use strict';

  var c = DCS.ui.c;
  var VIEW_KEY = 'dcs.trophyView';
  var LANG_KEY = 'dcs.lang';

  var STR = {
    es: {
      roomTitle: 'Sala de trofeos',
      roomLead: 'Cada pieza corresponde a un título realmente ganado.',
      enter: 'Sala de trofeos',
      back: 'Volver a Mi carrera',
      resetCam: 'Restablecer cámara',
      skip: 'Omitir animación',
      mode3d: 'Vista 3D',
      mode2d: 'Vista 2D',
      loading: 'Preparando la sala…',
      empty: 'Todavía no has ganado ningún trofeo',
      emptyHint: 'Los pedestales esperan. Gana un torneo para colocar la primera pieza.',
      countOne: '1 título en vitrina',
      countMany: '{{n}} títulos en vitrina',
      listLabel: 'Títulos ganados',
      panelTitle: 'Trofeo',
      name: 'Torneo',
      year: 'Temporada',
      team: 'Equipo',
      role: 'Rol',
      final: 'Final',
      prestige: 'Prestigio',
      na: 'No disponible',
      pickHint: 'Selecciona un trofeo en la sala o en la lista.',
      newBadge: 'Nuevo',
      fallback: 'Vista 2D: este dispositivo no puede mostrar la sala 3D.',
      langEs: 'Español',
      langEn: 'English',
      catTi: 'The International',
      catPgl: 'PGL Wallachia',
      catEsl: 'ESL One',
      catDl: 'DreamLeague',
      catBlast: 'BLAST Slam',
      catElite: 'Élite',
      catIntl: 'Internacional',
      catLeague: 'Liga',
      catGeneric: 'Torneo',
      prestigeOf: 'Nivel {{n}} de 10'
    },
    en: {
      roomTitle: 'Trophy room',
      roomLead: 'Each piece is a title actually won in this career.',
      enter: 'Trophy room',
      back: 'Back to My career',
      resetCam: 'Reset camera',
      skip: 'Skip animation',
      mode3d: '3D view',
      mode2d: '2D view',
      loading: 'Preparing the hall…',
      empty: 'You haven’t won any trophies yet',
      emptyHint: 'The pedestals are waiting. Win a tournament to place the first piece.',
      countOne: '1 title on display',
      countMany: '{{n}} titles on display',
      listLabel: 'Titles won',
      panelTitle: 'Trophy',
      name: 'Tournament',
      year: 'Season',
      team: 'Team',
      role: 'Role',
      final: 'Final',
      prestige: 'Prestige',
      na: 'Not available',
      pickHint: 'Select a trophy in the hall or from the list.',
      newBadge: 'New',
      fallback: '2D view: this device cannot display the 3D hall.',
      langEs: 'Español',
      langEn: 'English',
      catTi: 'The International',
      catPgl: 'PGL Wallachia',
      catEsl: 'ESL One',
      catDl: 'DreamLeague',
      catBlast: 'BLAST Slam',
      catElite: 'Elite',
      catIntl: 'International',
      catLeague: 'League',
      catGeneric: 'Tournament',
      prestigeOf: 'Level {{n}} of 10'
    }
  };

  var room = {
    selected: null,
    unlockedThisVisit: [],
    celebrating: false,
    playedUnlock: false,
    mode: null,
    failed3d: false,
    mounting: false,
    mountToken: 0
  };

  function readStore(key) {
    try { return window.localStorage.getItem(key); } catch (e) { return null; }
  }
  function writeStore(key, val) {
    try { window.localStorage.setItem(key, val); } catch (e) { }
  }

  function lang() {
    var v = readStore(LANG_KEY);
    if (v === 'en' || v === 'es') return v;
    var html = (document.documentElement && document.documentElement.lang) || '';
    html = String(html).toLowerCase();
    if (html.indexOf('en') === 0) return 'en';
    if (html.indexOf('es') === 0) return 'es';
    var nav = String((navigator.language || navigator.userLanguage || 'es')).toLowerCase();
    return nav.indexOf('en') === 0 ? 'en' : 'es';
  }

  function t(key, vars) {
    var pack = STR[lang()] || STR.es;
    var s = pack[key] || STR.es[key] || key;
    if (vars) {
      Object.keys(vars).forEach(function (k) {
        s = s.replace(new RegExp('\\{\\{' + k + '\\}\\}', 'g'), vars[k]);
      });
    }
    return s;
  }

  function hasWebGL() {
    try {
      var canvas = document.createElement('canvas');
      var gl = canvas.getContext('webgl2') || canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl');
      if (!gl) return false;
      var lose = gl.getExtension && gl.getExtension('WEBGL_lose_context');
      if (lose) lose.loseContext();
      return true;
    } catch (e) { return false; }
  }

  function weakDevice() {
    var mem = navigator.deviceMemory;
    var cores = navigator.hardwareConcurrency;
    if (typeof mem === 'number' && mem <= 2) return true;
    if (typeof cores === 'number' && cores <= 2 && typeof mem === 'number' && mem <= 4) return true;
    return false;
  }

  function savedView() {
    var v = readStore(VIEW_KEY);
    if (v === '2d' || v === '3d') return v;
    return null;
  }

  function want3d() {
    if (room.failed3d) return false;
    var saved = savedView();
    if (saved === '2d') return false;
    if (saved === '3d') return hasWebGL();
    if (!hasWebGL()) return false;
    if (weakDevice()) return false;
    return true;
  }

  function setView(mode) {
    writeStore(VIEW_KEY, mode);
    room.failed3d = false;
    room.mode = mode;
  }

  function setLang(code) {
    writeStore(LANG_KEY, code);
    document.documentElement.lang = code === 'en' ? 'en' : 'es';
  }

  function val(v) {
    if (v === null || v === undefined || v === '') return t('na');
    return String(v);
  }

  function categoryLabel(cat) {
    var map = {
      ti: 'catTi', pgl: 'catPgl', esl: 'catEsl', dreamleague: 'catDl',
      blast: 'catBlast', elite: 'catElite', international: 'catIntl',
      league: 'catLeague', generic: 'catGeneric'
    };
    return t(map[cat] || 'catGeneric');
  }

  function roleLabel(role) {
    var r = DCS.data.ROLES && DCS.data.ROLES[role];
    if (!r) return t('na');
    return r.label || r.name || t('na');
  }

  function finalLabel(item) {
    if (!item || !item.final) return t('na');
    var f = item.final;
    var score = (f.mapsWon == null || f.mapsLost == null)
      ? null
      : (f.mapsWon + '–' + f.mapsLost);
    if (score && f.opponent) return score + ' vs ' + f.opponent;
    if (score) return score;
    if (f.opponent) return f.opponent;
    return t('na');
  }

  function prestigeLabel(n) {
    if (typeof n !== 'number') return t('na');
    return t('prestigeOf', { n: n });
  }

  function listOf(state) {
    return DCS.engine.trophies.list(state);
  }

  function entry(state) {
    var n = listOf(state).length;
    var meta = n === 0 ? t('empty') : (n === 1 ? t('countOne') : t('countMany', { n: n }));
    return c.card({
      className: 'trophy-entry',
      title: t('roomTitle'),
      subtitle: t('roomLead'),
      body: '<p class="small muted">' + c.esc(meta) + '</p>' +
        '<div class="row mt">' +
        c.btn(t('enter'), 'nav', { value: 'trophyRoom', variant: 'primary', aria: t('enter') }) +
        '</div>'
    });
  }

  function panelHtml(item) {
    if (!item) {
      return '<div class="trophy-panel" role="region" aria-live="polite" aria-label="' + c.esc(t('panelTitle')) + '">' +
        '<p class="muted small">' + c.esc(t('pickHint')) + '</p></div>';
    }
    function row(k, v) {
      return '<div class="kv"><span>' + c.esc(t(k)) + '</span><span>' + v + '</span></div>';
    }
    var team = item.teamName
      ? c.teamMark({ id: item.teamId, name: item.teamName }, 'sm')
      : c.esc(t('na'));
    var fresh = room.unlockedThisVisit.indexOf(item.id) !== -1
      ? ' <span class="badge badge-gold">' + c.esc(t('newBadge')) + '</span>'
      : '';
    return '<div class="trophy-panel" role="region" aria-live="polite" aria-labelledby="trophy-panel-title">' +
      '<h3 id="trophy-panel-title">' + c.esc(item.name || t('na')) + fresh + '</h3>' +
      '<p class="card-sub">' + c.esc(categoryLabel(item.category)) + '</p>' +
      row('name', c.esc(val(item.name))) +
      row('year', c.esc(val(item.year))) +
      row('team', team) +
      row('role', c.esc(roleLabel(item.role))) +
      row('final', c.esc(finalLabel(item))) +
      row('prestige', c.esc(prestigeLabel(item.prestige))) +
      '</div>';
  }

  function gallery2d(list) {
    if (!list.length) {
      return '<div class="trophy-empty" role="status">' +
        '<p class="empty">' + c.esc(t('empty')) + '</p>' +
        '<p class="small muted">' + c.esc(t('emptyHint')) + '</p></div>';
    }
    return '<ul class="trophy-gallery" role="list">' + list.map(function (item) {
      var on = room.selected === item.id ? ' is-on' : '';
      var fresh = room.unlockedThisVisit.indexOf(item.id) !== -1 ? ' is-fresh' : '';
      return '<li><button type="button" class="trophy-card cat-' + c.esc(item.category) + on + fresh +
        '" data-action="trophy-select" data-value="' + c.esc(item.id) + '"' +
        ' aria-pressed="' + (room.selected === item.id ? 'true' : 'false') + '">' +
        '<span class="trophy-sil" aria-hidden="true"></span>' +
        '<span class="trophy-card-name">' + c.esc(item.name || t('na')) + '</span>' +
        '<span class="trophy-card-meta">' + c.esc(val(item.year)) + ' · ' + c.esc(categoryLabel(item.category)) + '</span>' +
        '</button></li>';
    }).join('') + '</ul>';
  }

  function listNav(list) {
    if (!list.length) return '';
    return '<div class="trophy-navlist" role="listbox" aria-label="' + c.esc(t('listLabel')) + '">' +
      list.map(function (item) {
        var on = room.selected === item.id;
        var fresh = room.unlockedThisVisit.indexOf(item.id) !== -1
          ? ' <span class="badge badge-gold">' + c.esc(t('newBadge')) + '</span>' : '';
        return '<button type="button" role="option" aria-selected="' + (on ? 'true' : 'false') + '"' +
          ' class="trophy-navitem' + (on ? ' is-on' : '') + '"' +
          ' data-action="trophy-select" data-value="' + c.esc(item.id) + '">' +
          '<span>' + c.esc(item.name || t('na')) + fresh + '</span>' +
          '<span class="muted small">' + c.esc(val(item.year)) + '</span></button>';
      }).join('') + '</div>';
  }

  function html(state) {
    var list = listOf(state);
    var use3d = want3d();
    room.mode = use3d ? '3d' : '2d';
    var n = list.length;
    var meta = n === 0 ? t('empty') : (n === 1 ? t('countOne') : t('countMany', { n: n }));
    var item = null;
    list.forEach(function (x) { if (x.id === room.selected) item = x; });

    var skip = room.celebrating
      ? c.btn(t('skip'), 'trophy-skip', { variant: 'ghost', aria: t('skip') })
      : '';
    var reset = use3d
      ? c.btn(t('resetCam'), 'trophy-reset', { variant: 'ghost', aria: t('resetCam') })
      : '';

    var langBtns =
      '<div class="trophy-lang" role="group" aria-label="Language">' +
      '<button type="button" class="btn' + (lang() === 'es' ? ' is-on' : '') +
      '" data-action="trophy-lang" data-value="es" aria-pressed="' + (lang() === 'es') + '">' + c.esc(t('langEs')) + '</button>' +
      '<button type="button" class="btn' + (lang() === 'en' ? ' is-on' : '') +
      '" data-action="trophy-lang" data-value="en" aria-pressed="' + (lang() === 'en') + '">' + c.esc(t('langEn')) + '</button>' +
      '</div>';

    var modes =
      '<div class="trophy-modes" role="group" aria-label="' + c.esc(t('roomTitle')) + '">' +
      '<button type="button" class="btn' + (use3d ? ' is-on' : '') +
      '" data-action="trophy-view" data-value="3d" aria-pressed="' + use3d + '">' + c.esc(t('mode3d')) + '</button>' +
      '<button type="button" class="btn' + (!use3d ? ' is-on' : '') +
      '" data-action="trophy-view" data-value="2d" aria-pressed="' + (!use3d) + '">' + c.esc(t('mode2d')) + '</button>' +
      '</div>';

    var stage;
    if (use3d) {
      stage = '<div class="trophy-stage" id="trophy-stage">' +
        '<div class="trophy-loading" id="trophy-loading" role="status">' + c.esc(t('loading')) + '</div>' +
        '</div>';
    } else {
      var note = (!hasWebGL() || room.failed3d)
        ? '<p class="small muted trophy-fallback">' + c.esc(t('fallback')) + '</p>' : '';
      stage = '<div class="trophy-stage is-flat">' + note + gallery2d(list) + '</div>';
    }

    return '<div class="trophy-room">' +
      '<div class="page-head">' +
      '<div><h2>' + c.esc(t('roomTitle')) + '</h2>' +
      '<div class="sub">' + c.esc(meta) + '</div></div>' +
      '<div class="head-right">' +
      c.btn(t('back'), 'nav', { value: 'career', aria: t('back') }) +
      '</div></div>' +
      '<div class="trophy-toolbar">' + modes + reset + skip + langBtns + '</div>' +
      '<div class="trophy-layout">' +
      stage +
      '<aside class="trophy-aside">' +
      panelHtml(item) +
      (n === 0 && use3d
        ? '<p class="empty">' + c.esc(t('empty')) + '</p><p class="small muted">' + c.esc(t('emptyHint')) + '</p>'
        : listNav(list)) +
      '</aside></div></div>';
  }

  function persistSeen(state) {
    if (!state) return;
    if (DCS.engine.trophies.markSeen(state) && DCS.game && DCS.game.persist) {
      DCS.game.persist();
    }
  }

  function beginVisit(state) {
    var list = listOf(state);
    var fresh = list.filter(function (x) { return x.fresh; }).map(function (x) { return x.id; });
    room.unlockedThisVisit = fresh;
    room.playedUnlock = false;
    room.selected = null;
    persistSeen(state);
    if (!room.selected && list.length) {
      var featured = null;
      list.forEach(function (x) {
        if (fresh.indexOf(x.id) !== -1 && !featured) featured = x.id;
      });
      room.selected = featured || (list[0] && list[0].id) || null;
    }
    return fresh;
  }

  function hideLoading() {
    var el = document.getElementById('trophy-loading');
    if (el) el.hidden = true;
  }

  function showLoading() {
    var el = document.getElementById('trophy-loading');
    if (el) el.hidden = false;
  }

  function mount() {
    var state = DCS.game && DCS.game.state;
    if (!state) return;
    var host = document.getElementById('trophy-stage');
    if (!host || !want3d()) {
      room.celebrating = false;
      room.mounting = false;
      return;
    }
    var token = ++room.mountToken;
    room.mounting = true;
    showLoading();
    var list = listOf(state);
    var fresh = room.unlockedThisVisit || [];
    DCS.ui.trophyScene.mount(host, list, {
      onSelect: function (id) {
        room.selected = id;
        var scene = DCS.ui.trophyScene.current();
        if (scene) scene.setSelected(id);
        var aside = document.querySelector('.trophy-aside');
        var item = null;
        listOf(state).forEach(function (x) { if (x.id === id) item = x; });
        if (aside) {
          var panel = aside.querySelector('.trophy-panel');
          var nav = listNav(listOf(state));
          aside.innerHTML = panelHtml(item) + (nav || '');
        }
      },
      onCelebrateEnd: function () {
        room.celebrating = false;
        var skipBtn = document.querySelector('[data-action="trophy-skip"]');
        if (skipBtn && skipBtn.parentNode) skipBtn.parentNode.removeChild(skipBtn);
      }
    }).then(function (scene) {
      if (token !== room.mountToken) {
        DCS.ui.trophyScene.dispose();
        return;
      }
      room.mounting = false;
      hideLoading();
      if (room.selected) scene.setSelected(room.selected);
      if (fresh.length && !room.playedUnlock) {
        room.playedUnlock = true;
        room.celebrating = true;
        scene.celebrate(fresh);
        if (room.celebrating) {
          var bar = document.querySelector('.trophy-toolbar');
          if (bar && !bar.querySelector('[data-action="trophy-skip"]')) {
            bar.insertAdjacentHTML('beforeend', c.btn(t('skip'), 'trophy-skip', { variant: 'ghost', aria: t('skip') }));
          }
        }
      }
    }).catch(function () {
      if (token !== room.mountToken) return;
      room.mounting = false;
      room.failed3d = true;
      if (DCS.ui.app) DCS.ui.app.render();
    });
  }

  function leave() {
    room.celebrating = false;
    room.mounting = false;
    room.mountToken++;
    if (DCS.ui.trophyScene) DCS.ui.trophyScene.dispose();
  }

  function select(id) {
    room.selected = id;
    var state = DCS.game && DCS.game.state;
    var scene = DCS.ui.trophyScene && DCS.ui.trophyScene.current();
    if (scene) scene.setSelected(id);
    var aside = document.querySelector('.trophy-aside');
    if (aside && state) {
      var item = null;
      listOf(state).forEach(function (x) { if (x.id === id) item = x; });
      var nav = listNav(listOf(state));
      aside.innerHTML = panelHtml(item) + (nav || '');
    }
    var nodes = document.querySelectorAll('.trophy-card, .trophy-navitem');
    for (var i = 0; i < nodes.length; i++) {
      var on = nodes[i].getAttribute('data-value') === id;
      nodes[i].classList.toggle('is-on', on);
      nodes[i].setAttribute('aria-pressed', on ? 'true' : 'false');
      if (nodes[i].getAttribute('role') === 'option') {
        nodes[i].setAttribute('aria-selected', on ? 'true' : 'false');
      }
    }
  }

  DCS.ui.screens = DCS.ui.screens || {};
  DCS.ui.screens.trophyRoom = function (state) {
    return html(state);
  };

  DCS.ui.trophyRoom = {
    t: t,
    lang: lang,
    setLang: setLang,
    setView: setView,
    want3d: want3d,
    entry: entry,
    html: html,
    beginVisit: beginVisit,
    mount: mount,
    leave: leave,
    select: select,
    room: room,
    hasWebGL: hasWebGL
  };
})(window.DCS = window.DCS || {});
