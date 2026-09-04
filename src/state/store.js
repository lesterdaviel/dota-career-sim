/* ============================================================
   STATE / STORE — creación del estado y persistencia
   ------------------------------------------------------------
   La seed se genera una vez por carrera y viaja con la partida.
   El cursor del RNG se guarda con cada escritura: cerrar la web,
   recargar o volver mañana continúa la misma secuencia. No hay
   forma de refrescar para conseguir otro resultado.
   ============================================================ */
(function (DCS) {
  'use strict';

  var KEY = 'dcs.career.v1';
  var VERSION = 4;

  var available = (function () {
    try {
      var k = '__dcs_test__';
      window.localStorage.setItem(k, '1');
      window.localStorage.removeItem(k);
      return true;
    } catch (e) { return false; }
  })();

  var memory = null;   /* respaldo si el navegador bloquea localStorage */
  var silent = false;  /* modo herramienta: no tocar la partida del usuario */

  function newState(opts) {
    var seed = opts.seed || DCS.rng.newSeed();
    var startYear = (new Date()).getFullYear();

    var state = {
      version: VERSION,
      seed: seed,
      cursor: 0,
      createdAt: Date.now(),
      year: startYear,
      finished: false,
      pending: null,
      legacy: null,
      lastReport: null,
      offers: [],
      history: [],
      usedEvents: {},
      counters: { event: 1, offer: 1 },
      career: {
        maps: 0, wins: 0, losses: 0,
        seriesPlayed: 0, seriesWon: 0, seriesLost: 0,
        titles: 0, tournaments: 0,
        tiPlayed: 0, tiWon: 0,
        earnings: { salary: 0, prize: 0, other: 0 },
        acc: null,
        rolesPlayed: {},
        bestRating: null, bestSeason: null, lastRating: null,
        peakReputation: 0,
        lastChangeYear: null,
        lastRetirementPrompt: null
      },
      trophyRoom: { seen: {} }
    };

    DCS.runtime.bind(state);
    var rng = DCS.runtime.get();

    state.player = DCS.engine.player.createPlayer(opts, rng);
    DCS.engine.finance.init(state);
    state.career.acc = DCS.engine.stats.blank(state.player.role);
    state.world = DCS.engine.world.createWorld(rng);
    DCS.engine.season.startSeason(state);

    save(state);
    return state;
  }

  function save(state) {
    if (!state) return false;
    DCS.runtime.sync(state);
    if (silent) return false;
    state.savedAt = Date.now();
    var json;
    try { json = JSON.stringify(state); } catch (e) { return false; }
    memory = json;
    if (!available) return false;
    try { window.localStorage.setItem(KEY, json); return true; }
    catch (e) { return false; }
  }

  function load() {
    var json = null;
    if (available) {
      try { json = window.localStorage.getItem(KEY); } catch (e) { json = null; }
    }
    if (!json) json = memory;
    if (!json) return null;
    var state;
    try { state = JSON.parse(json); } catch (e) { return null; }
    if (!state || !state.player || !state.world) return null;
    if (state.version && state.version > VERSION) return null;
    migrate(state);
    DCS.runtime.bind(state);
    return state;
  }

  /** Aditiva: nunca borra la partida. Rellena logo si el nombre coincide con el catálogo. */
  /* Equipos que se fusionaron en otro (mismo club, un solo registro).
     clave = id retirado, valor = id que se conserva. */
  var TEAM_MERGES = {
    'oh-yes': 'yellow-submarine',
    'tundra-esports': 'pipsqueak-4',
    'team-tickles': 'pipsqueak-4'
  };

  /** Fusiona equipos retirados en el que los sustituye, sin romper
      partidas guardadas: si el jugador estaba fichado por el equipo
      que desaparece, se traslada al que se conserva conservando su
      puesto en el roster. Idempotente: si el id ya no existe, no hace nada. */
  function mergeRetiredTeams(state) {
    var teams = state.world && state.world.teams;
    if (!teams) return;
    Object.keys(TEAM_MERGES).forEach(function (fromId) {
      var toId = TEAM_MERGES[fromId];
      var idxOld = -1, idxNew = -1;
      teams.forEach(function (t, i) {
        if (!t) return;
        if (t.id === fromId) idxOld = i;
        if (t.id === toId) idxNew = i;
      });
      if (idxOld < 0) return; /* ya fusionado en una carga anterior */

      var oldTeam = teams[idxOld];
      /* Si el sucesor aún no está en este mundo, reetiqueta el
         registro antiguo en su lugar para no dejar al jugador
         apuntando a un id que ya no existe. */
      if (idxNew < 0) {
        var cat = DCS.data.TEAM_BY_ID && DCS.data.TEAM_BY_ID[toId];
        if (cat) {
          oldTeam.id = cat.id;
          oldTeam.name = cat.name;
          oldTeam.region = cat.region;
          oldTeam.baseTier = cat.tier;
          if (typeof oldTeam.tier !== 'number') oldTeam.tier = cat.tier;
          if (cat.rating) oldTeam.rating = cat.rating;
          oldTeam.logo = cat.logo || ('assets/teams/' + cat.id + '.png');
        }
        if (state.player && state.player.teamId === fromId) state.player.teamId = toId;
        if (state.offers && cat) {
          state.offers.forEach(function (o) {
            if (o.teamId === fromId) { o.teamId = toId; o.teamName = cat.name; }
          });
        }
        return;
      }
      if (oldTeam.hasPlayer && idxNew >= 0) {
        var newTeam = teams[idxNew];
        var playerEntry = oldTeam.roster.filter(function (m) { return m.isPlayer; })[0];
        if (playerEntry) {
          var slot = -1;
          newTeam.roster.forEach(function (m, i) { if (m.role === playerEntry.role) slot = i; });
          if (slot < 0) slot = 0;
          newTeam.roster[slot] = playerEntry;
        }
        newTeam.hasPlayer = true;
        state.player.teamId = toId;
      } else if (state.player.teamId === fromId) {
        state.player.teamId = toId; /* por si acaso, sin roster que trasladar */
      }

      teams.splice(idxOld, 1);
      if (state.offers) {
        state.offers = state.offers.filter(function (o) { return o.teamId !== fromId; });
      }
    });
  }

  function injectMissingCatalogTeams(state) {
    var catalog = DCS.data.TEAMS;
    var world = state.world;
    if (!catalog || !world || !world.teams) return;
    if (!world.usedOrgs) world.usedOrgs = {};
    var have = {};
    world.teams.forEach(function (t) {
      if (!t) return;
      if (t.id) have[t.id] = true;
      if (t.name) have[t.name] = true;
    });
    catalog.forEach(function (spec) {
      if (have[spec.id] || have[spec.name]) return;
      var rng = new DCS.rng.Rng(String(state.seed) + '|TEAM|' + spec.id, 0);
      world.usedOrgs[spec.name] = true;
      world.teams.push(DCS.engine.world.makeTeam(rng, world, spec.region, spec.tier, spec));
    });
  }

  function migrate(state) {
    mergeRetiredTeams(state);
    var teams = state.world && state.world.teams;
    if (teams) {
      teams.forEach(function (t) {
        if (!t) return;
        var cat = (DCS.data.TEAM_BY_ID && t.id && DCS.data.TEAM_BY_ID[t.id]) ||
          (DCS.data.TEAM_BY_NAME && t.name && DCS.data.TEAM_BY_NAME[t.name]);
        if (!cat) return;
        if (typeof t.baseTier !== 'number' && typeof cat.tier === 'number') t.baseTier = cat.tier;
        if (cat.rating) t.rating = cat.rating;
        t.logo = cat.logo || ('assets/teams/' + cat.id + '.png');
      });
    }
    injectMissingCatalogTeams(state);
    DCS.engine.finance.init(state);
    DCS.engine.finance.pull(state);
    if (state.finished && state.legacy && !state.legacy.finance) {
      DCS.engine.finance.attachLegacy(state, state.legacy);
    }
    if (DCS.engine.trophies && DCS.engine.trophies.migrate) {
      DCS.engine.trophies.migrate(state);
    }
    state.version = VERSION;
  }

  function hasSave() {
    if (available) {
      try { if (window.localStorage.getItem(KEY)) return true; } catch (e) { }
    }
    return !!memory;
  }

  function clear() {
    memory = null;
    if (available) { try { window.localStorage.removeItem(KEY); } catch (e) { } }
  }

  /** Resumen rápido para la pantalla de inicio */
  function peek() {
    var s = load();
    if (!s) return null;
    return {
      nick: s.player.nick,
      age: s.player.age,
      year: s.year,
      role: s.player.role,
      overall: s.player.overall,
      finished: s.finished,
      teamName: (function () {
        var t = DCS.engine.world.getTeam(s, s.player.teamId);
        return t ? t.name : 'Sin equipo';
      })(),
      teamId: s.player.teamId || null,
      tier: (function () {
        var t = DCS.engine.world.getTeam(s, s.player.teamId);
        return t ? t.tier : null;
      })(),
      seed: s.seed
    };
  }

  DCS.store = {
    KEY: KEY,
    VERSION: VERSION,
    persistent: available,
    /** las herramientas de simulación masiva lo activan para no pisar la partida */
    setSilent: function (v) { silent = !!v; },
    newState: newState,
    save: save,
    load: load,
    hasSave: hasSave,
    clear: clear,
    peek: peek
  };
})(window.DCS = window.DCS || {});
