/* Sala de trofeos: lectura del historial, sin mutar simulación. */
const mem = {};
global.localStorage = { setItem: (k, v) => { mem[k] = v; }, getItem: k => mem[k] || null, removeItem: k => { delete mem[k]; } };
global.crypto = { getRandomValues: a => a.fill(123456789) };

/* Se carga dist/index.html, el artefacto que se publica. src/ dejó de
   representar el producto el 31 ago 2026: ver tools/load-dist.js. */
require('./load-dist.js')();
DCS.store.setSilent(true);

function assert(cond, msg) { if (!cond) throw new Error(msg); }

function title(o) {
  return Object.assign({
    placement: 1, kind: 'tournament', prestige: 6,
    teamId: 'og', teamName: 'OG', result: 'Campeón', log: []
  }, o);
}

function emptyState() {
  /* Los vistos viven en career.trophyRoomSeen (array de ids). El
     trophyRoom.seen de src/ ya no existe en el motor publicado. */
  return { history: [], season: { tournaments: [] }, player: { role: 'mid' }, career: { trophyRoomSeen: [] } };
}

/* El motor publicado devuelve `design` (id de la serie: dreamleague,
   ti, esl_one…) donde src/ devolvía `category`. Las aserciones siguen
   la forma que se publica. */
/* vacío */
assert(DCS.engine.trophies.list(emptyState()).length === 0, 'vacío debe ser 0');

/* un título */
{
  const s = emptyState();
  s.history = [{ year: 2026, role: 'mid', tournaments: [title({ id: 'ev1', name: 'DreamLeague 2026', series: 'dreamleague', year: 2026 })] }];
  const list = DCS.engine.trophies.list(s);
  assert(list.length === 1, 'un título');
  assert(list[0].id === 'ev1', 'id estable');
  assert(list[0].design === 'dreamleague', 'diseño DreamLeague');
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
  assert(list[0].design === 'ti', 'TI ocupa el lugar principal');
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

/* celebración: lo pendiente de celebrar es newSinceLastVisit, no un
   flag por trofeo. markSeen lo saca de la lista y no duplica ids. */
{
  const s = emptyState();
  s.history = [{ year: 2026, role: 'mid', tournaments: [title({ id: 'ev-new', name: 'Major' })] }];
  assert(DCS.engine.trophies.newSinceLastVisit(s).length === 1, 'nuevo sin ver');
  DCS.engine.trophies.markSeen(s, ['ev-new']);
  assert(DCS.engine.trophies.newSinceLastVisit(s).length === 0, 'ya visto');
  DCS.engine.trophies.markSeen(s, ['ev-new']);
  assert(DCS.engine.trophies.seenIds(s).length === 1, 'segunda marca no duplica');
}

/* un título que ya estaba visto no vuelve a celebrarse, y uno nuevo sí */
{
  const s = emptyState();
  s.history = [{ year: 2025, role: 'carry', tournaments: [title({ id: 'legacy-1', name: 'Liga' })] }];
  DCS.engine.trophies.markSeen(s, DCS.engine.trophies.list(s).map(x => x.id));
  assert(DCS.engine.trophies.newSinceLastVisit(s).length === 0, 'historial ya visto no celebra');
  s.history[0].tournaments.push(title({ id: 'legacy-2', name: 'Copa 2' }));
  const nuevos = DCS.engine.trophies.newSinceLastVisit(s);
  assert(nuevos.length === 1 && nuevos[0].id === 'legacy-2', 'solo el título nuevo celebra');
}

/* ESL por nombre, sin inventar el torneo */
{
  const s = emptyState();
  s.history = [{ year: 2026, role: 'offlane', tournaments: [title({ id: 'esl1', name: 'ESL One Birmingham', series: 'esl_one' })] }];
  assert(DCS.engine.trophies.list(s)[0].design === 'esl_one', 'diseño ESL si el historial lo trae');
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
  assert(DCS.engine.trophies.seenIds(loaded).indexOf('persist-1') >= 0, 'seen sobrevive al load');
  assert(DCS.engine.trophies.list(loaded).some(x => x.id === 'persist-1'), 'el título sigue en el historial');
}

console.log('OK: sala de trofeos — vacío, uno, varios, TI, duplicados de temporada, celebración y persistencia.');
