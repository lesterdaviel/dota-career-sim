/* Sala de trofeos: lectura del historial, sin mutar simulación. */
const fs = require('fs');
const vm = require('vm');
const path = require('path');
global.window = global;
global.document = { readyState: 'loading', addEventListener() {}, createElement() { return { getContext() { return null; }, getExtension() { return null; } }; } };
global.navigator = { language: 'es-ES' };
const mem = {};
global.localStorage = { setItem: (k, v) => { mem[k] = v; }, getItem: k => mem[k] || null, removeItem: k => { delete mem[k]; } };
global.crypto = { getRandomValues: a => a.fill(123456789) };

const files = [
  'src/core/rng.js', 'src/core/util.js', 'src/core/runtime.js',
  'src/data/roles.js', 'src/data/archetypes.js', 'src/data/world.js', 'src/data/flags.js',
  'src/data/teams.js', 'src/data/tournaments.js', 'src/ui/format.js', 'src/data/events.js',
  'src/data/finance.js', 'src/engine/stats.js', 'src/engine/player.js', 'src/engine/world.js',
  'src/engine/match.js', 'src/engine/performance.js', 'src/engine/progression.js',
  'src/engine/tournaments.js', 'src/engine/market.js', 'src/engine/events.js',
  'src/engine/finance.js', 'src/engine/retirement.js', 'src/engine/season.js',
  'src/engine/trophies.js', 'src/state/store.js', 'src/state/game.js'
];
files.forEach(f => vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), { filename: f }));
DCS.store.setSilent(true);

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function title(o) {
  return Object.assign({
    placement: 1, kind: 'tournament', prestige: 6,
    teamId: 'og', teamName: 'OG', result: 'Campeón', log: []
  }, o);
}

function emptyState() {
  return { history: [], season: { tournaments: [] }, player: { role: 'mid' }, trophyRoom: { seen: {} } };
}

/* vacío */
assert(DCS.engine.trophies.list(emptyState()).length === 0, 'vacío debe ser 0');

/* un título */
{
  const s = emptyState();
  s.history = [{ year: 2026, role: 'mid', tournaments: [title({ id: 'ev1', name: 'DreamLeague 2026', series: 'dreamleague', year: 2026 })] }];
  const list = DCS.engine.trophies.list(s);
  assert(list.length === 1, 'un título');
  assert(list[0].id === 'ev1', 'id estable');
  assert(list[0].category === 'dreamleague', 'categoría DreamLeague');
}

/* clasificatorio no cuenta */
{
  const s = emptyState();
  s.history = [{ year: 2026, role: 'mid', tournaments: [title({ id: 'q1', kind: 'qualifier', name: 'Qual' })] }];
  assert(DCS.engine.trophies.list(s).length === 0, 'qualifier excluido');
}

/* varios + TI primero */
{
  const s = emptyState();
  s.history = [{
    year: 2026, role: 'mid', tournaments: [
      title({ id: 'ev-dl', name: 'DreamLeague', series: 'dreamleague', prestige: 8 }),
      title({ id: 'ev-ti', name: 'The International', series: 'ti', kind: 'ti', prestige: 10 })
    ]
  }];
  const list = DCS.engine.trophies.list(s);
  assert(list.length === 2, 'dos títulos');
  assert(list[0].category === 'ti', 'TI ocupa el lugar principal');
}

/* mismo torneo, dos temporadas */
{
  const s = emptyState();
  s.history = [
    { year: 2026, role: 'mid', tournaments: [title({ id: 'ev-a', name: 'PGL Wallachia', series: 'pgl_wallachia', year: 2026 })] },
    { year: 2027, role: 'mid', tournaments: [title({ id: 'ev-b', name: 'PGL Wallachia', series: 'pgl_wallachia', year: 2027 })] }
  ];
  const list = DCS.engine.trophies.list(s);
  assert(list.length === 2, 'dos victorias del mismo torneo');
  assert(list[0].id !== list[1].id, 'ids distintos');
}

/* no duplicar history + season con el mismo id */
{
  const rec = title({ id: 'ev-same', name: 'BLAST Slam', series: 'blast_slam', year: 2026 });
  const s = emptyState();
  s.history = [{ year: 2026, role: 'mid', tournaments: [rec] }];
  s.season.tournaments = [rec];
  assert(DCS.engine.trophies.list(s).length === 1, 'sin duplicados history/season');
}

/* datos secundarios ausentes → null, no inventados */
{
  const s = emptyState();
  s.history = [{ year: 2024, role: null, tournaments: [{ id: 'old', placement: 1, kind: 'tournament', name: 'Copa online' }] }];
  const item = DCS.engine.trophies.list(s)[0];
  assert(item.teamName == null, 'equipo ausente no se inventa');
  assert(item.final == null, 'final ausente no se inventa');
  assert(item.prestige == null, 'prestigio ausente no se inventa');
}

/* celebración: markSeen apaga fresh; recargar no duplica */
{
  const s = emptyState();
  s.history = [{ year: 2026, role: 'mid', tournaments: [title({ id: 'ev-new', name: 'Major' })] }];
  assert(DCS.engine.trophies.list(s)[0].fresh === true, 'nuevo no visto');
  assert(DCS.engine.trophies.markSeen(s, ['ev-new']) === true, 'marca seen');
  assert(DCS.engine.trophies.list(s)[0].fresh === false, 'ya visto');
  assert(DCS.engine.trophies.markSeen(s, ['ev-new']) === false, 'segunda marca no cambia');
}

/* migrate de partida vieja: no celebra títulos previos */
{
  const s = {
    history: [{ year: 2025, role: 'carry', tournaments: [title({ id: 'legacy-1', name: 'Liga' })] }],
    season: { tournaments: [] }
  };
  DCS.engine.trophies.migrate(s);
  assert(s.trophyRoom && s.trophyRoom.seen['legacy-1'], 'migrate marca vistos');
  assert(DCS.engine.trophies.list(s)[0].fresh === false, 'partida vieja sin celebración');
  DCS.engine.trophies.migrate(s);
  s.history[0].tournaments.push(title({ id: 'legacy-2', name: 'Copa 2' }));
  assert(DCS.engine.trophies.list(s).filter(x => x.fresh).length === 1, 'título nuevo sí es fresh');
}

/* ESL por nombre, sin inventar el torneo */
{
  const s = emptyState();
  s.history = [{ year: 2026, role: 'offlane', tournaments: [title({ id: 'esl1', name: 'ESL One Birmingham', series: 'esl_one' })] }];
  assert(DCS.engine.trophies.list(s)[0].category === 'esl', 'categoría ESL si el historial lo trae');
}

/* persistencia: load no pierde trophyRoom.seen */
{
  const state = DCS.store.newState({ seed: 'TROPHY-SAVE', name: 'T', nick: 't', nationality: 'España', region: 'weu', role: 'mid', archetype: 'mechanical' });
  state.history = [{ year: state.year, role: 'mid', tournaments: [title({ id: 'persist-1', name: 'Copa' })] }];
  DCS.engine.trophies.markSeen(state, ['persist-1']);
  DCS.store.setSilent(false);
  DCS.store.save(state);
  const loaded = DCS.store.load();
  DCS.store.setSilent(true);
  assert(loaded.trophyRoom.seen['persist-1'], 'seen sobrevive al load');
  assert(DCS.engine.trophies.list(loaded).some(x => x.id === 'persist-1'), 'el título sigue en el historial');
}

console.log('OK: sala de trofeos — vacío, uno, varios, TI, duplicados de temporada, persistencia y migrate.');
