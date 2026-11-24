'use strict';
/* Seis regiones (sin 'mena'): catálogo, nacionalidades, mundo nuevo y
   migración de guardados antiguos. `node tools/region-test.js` */
const assert = require('assert');
const mem = {};
global.localStorage = { setItem: (k, v) => (mem[k] = String(v)), getItem: k => (k in mem ? mem[k] : null), removeItem: k => delete mem[k] };
require('./load-dist.js')();
DCS.store.setSilent(true);
const D = DCS.data, E = DCS.engine;
const SIX = ['eeu', 'weu', 'cn', 'sea', 'na', 'sa'];

try {
  // 1. Lista de regiones
  assert.deepStrictEqual(D.REGION_LIST.slice().sort(), SIX.slice().sort());
  assert.strictEqual(D.REGIONS.mena, undefined, 'REGIONS.mena sigue existiendo');

  // 2. Catálogo de equipos y plantillas
  D.TEAMS.forEach(t => assert.ok(SIX.includes(t.region), 'equipo fuera de las 6: ' + t.id + ' ' + t.region));
  D.circuitCatalog().forEach(e => assert.ok(e.region === null || SIX.includes(e.region), 'plantilla fuera de las 6: ' + e.id));

  // 3. Nacionalidades antes mena
  const nat = { 'Turquía': 'eeu', 'Arabia Saudita': 'eeu', 'Egipto': 'weu', 'Marruecos': 'weu', 'Nigeria': 'weu', 'Sudáfrica': 'weu', 'Kenia': 'weu' };
  Object.keys(nat).forEach(n => assert.strictEqual(D.regionForNationality(n), nat[n], 'nacionalidad ' + n));

  // 4. Los 12 ex-MENA ficticios ya no existen (catálogo DLTV, TEAMS-01)
  const moved = {
    'mirage-esports': 'weu', 'nile-guardians': 'weu', 'atlas-wolves': 'weu', 'sahara-sentinels': 'weu', 'marrakech-storm': 'weu', 'dune-runners': 'weu',
    'crescent-titans': 'eeu', 'oryx-esports': 'eeu', 'phoenix-al-sharq': 'eeu', 'red-sea-rebels': 'eeu', 'sultans-esports': 'eeu', 'oasis-kings': 'eeu'
  };
  const s = DCS.store.newState({ seed: 'REGION-TEST', name: 'T', nick: 't', nationality: 'Egipto', region: 'weu', role: 'mid', archetype: 'mechanical' });
  Object.keys(moved).forEach(id => {
    assert.ok(!s.world.teams.some(x => x.id === id), 'sigue en el mundo ' + id);
    assert.ok(!DCS.data.TEAM_BY_ID[id], 'sigue en el catálogo ' + id);
  });
  // equipos reales que sí existen, para fabricar el guardado con 'mena'
  const keep = {};
  ['natus-vincere', 'team-spirit'].forEach(id => { keep[id] = DCS.data.TEAM_BY_ID[id].region; });

  // 5. Migración de un guardado con 'mena'
  const old = JSON.parse(JSON.stringify(s));
  old.player.region = old.player.homeRegion = 'mena';
  if (old.career) old.career.startingRegion = 'mena';
  Object.keys(keep).forEach(id => { old.world.teams.find(x => x.id === id).region = 'mena'; });
  const mine = old.player.teamId && old.world.teams.find(x => x.id === old.player.teamId);
  if (mine) mine.region = 'mena';
  (old.offers || []).forEach(o => { if ('region' in o) o.region = 'mena'; });
  (old.history || []).forEach(h => { if (h && 'region' in h) h.region = 'mena'; });
  const oldJson = JSON.stringify(old);
  localStorage.setItem(DCS.store.KEY, oldJson);

  const a = DCS.store.load();
  assert.ok(a, 'load devolvió null');
  assert.strictEqual(a.seed, old.seed);
  assert.strictEqual((a.history || []).length, (old.history || []).length);
  assert.strictEqual(a.player.nick, old.player.nick);
  const aJson = JSON.stringify(a);
  assert.ok(!aJson.includes('"mena"'), 'queda "mena" tras migrar');
  assert.ok(SIX.includes(a.player.region) && SIX.includes(a.player.homeRegion));
  Object.keys(keep).forEach(id => assert.strictEqual(a.world.teams.find(x => x.id === id).region, keep[id], 'migración ' + id));

  const b = DCS.store.load();
  assert.strictEqual(JSON.stringify(b), aJson, 'cargar dos veces no da lo mismo');
  localStorage.setItem(DCS.store.KEY, aJson);
  const c = DCS.store.load();
  assert.ok(!JSON.stringify(c).includes('"mena"'));
  assert.strictEqual(c.player.region, a.player.region, 'remigrar cambia la región');

  // Avanzar tras migrar no lanza
  DCS.game.state = a;
  for (let g = 0; g < 60 && !a.finished; g++) {
    if (a.pending) {
      const t = a.pending.type;
      if (t === 'event') E.season.resolvePendingEvent(a, 0);
      else if (t === 'wealth') E.finance.resolveSpecial(a, false);
      else if (t === 'tournament') { E.season.playLive(a, true); a.pending = null; if (a.season.liveTour && a.season.liveTour.done) E.season.continueCompetition(a); }
      else { a.pending = null; a.career.lastRetirementPrompt = a.year; }
      continue;
    }
    const o = E.season.advance(a);
    if (o && o.blocked && o.reason === 'offers' && a.offers.length) { E.market.acceptOffer(a, a.offers.slice().sort((x, y) => y.salary - x.salary)[0]); a.offers = []; }
  }
} catch (e) {
  console.error('FALLO: ' + (e && e.stack || e));
  process.exit(1);
}
console.log('OK: seis regiones — catálogo, nacionalidades, ex-MENA ficticios retirados, migración mena idempotente y avance tras migrar.');
