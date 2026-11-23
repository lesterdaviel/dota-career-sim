'use strict';
/* Héroes favoritos (PROFILE-01): topThree solo con partidas reales del rol
   actual, sin relleno; desempate; héroe atípico; cambio de rol; migración
   aditiva e idempotente de heroStats sin roles; suma de partidas.
   Se ejecuta con `node tools/hero-test.js` sobre dist/index.html. */
const assert = require('assert');
const mem = {};
global.localStorage = { setItem: (k, v) => (mem[k] = String(v)), getItem: k => (k in mem ? mem[k] : null), removeItem: k => delete mem[k] };
require('./load-dist.js')();
DCS.store.setSilent(true);
const E = DCS.engine, H = E.heroes;
const KEY = 'dcs.career.v1';

function fresh(role, seed) {
  const s = DCS.store.newState({ seed: seed || 'HERO-T', name: 'T', nick: 't', nationality: 'España', region: 'weu', role: role || 'mid', archetype: 'mechanical' });
  DCS.game.state = s;
  return s;
}
const ids = s => H.topThree(s).map(r => r.id);
function rec(s, id, n, wins) { for (let i = 0; i < n; i++) H.record(s, id, i < wins, s.player.role); }
const MID = H.poolForPosition('mid').map(h => h.id);

try {
  /* a. carrera nueva */
  let s = fresh('mid');
  assert.deepStrictEqual(H.topThree(s), []);
  assert.deepStrictEqual(Object.keys(s.career.heroStats || {}), []);

  /* b. 1, 2, 3 y 5 héroes */
  [1, 2, 3, 5].forEach(n => {
    const st = fresh('mid');
    for (let i = 0; i < n; i++) rec(st, MID[i], 1, 1);
    const top = H.topThree(st);
    assert.strictEqual(top.length, Math.min(n, 3), n + ' héroes');
    top.forEach(r => { assert.ok(r.maps > 0); assert.strictEqual(r.role, 'mid'); assert.ok(!r.filler); });
  });

  /* c. desempate */
  s = fresh('mid'); rec(s, MID[0], 2, 1); rec(s, MID[1], 2, 2);
  assert.deepStrictEqual(ids(s), [MID[1], MID[0]], 'más victorias');
  s = fresh('mid'); rec(s, MID[0], 1, 1); rec(s, MID[1], 1, 1);
  assert.deepStrictEqual(ids(s), [MID[1], MID[0]], 'más reciente');
  s = fresh('mid');
  s.career.heroStats = {
    9: { maps: 1, wins: 1, losses: 0, roles: { mid: { maps: 1, wins: 1 } }, last: 5 },
    10: { maps: 1, wins: 1, losses: 0, roles: { mid: { maps: 1, wins: 1 } }, last: 5 }
  };
  assert.deepStrictEqual(ids(s), [10, 9], 'id asc como String');
  s = fresh('mid'); rec(s, MID[0], 2, 2); rec(s, MID[1], 3, 0);
  assert.deepStrictEqual(ids(s), [MID[1], MID[0]], 'prima partidas');
  const row = H.topThree(s)[0];
  assert.strictEqual(row.heroId, MID[1]); assert.strictEqual(row.losses, 3); assert.strictEqual(row.winrate, 0);

  /* d. héroe atípico */
  s = fresh('carry');
  const carryPool = H.poolForPosition('carry').map(h => h.id);
  const odd = DCS.data.HEROES.map(h => h.id).find(id => carryPool.indexOf(id) < 0);
  assert.ok(odd != null);
  rec(s, odd, 1, 0);
  assert.deepStrictEqual(ids(s), [odd], 'atípico');

  /* e. cambio de rol */
  s = fresh('carry');
  rec(s, carryPool[0], 3, 2); rec(s, carryPool[1], 2, 1); rec(s, carryPool[2], 1, 1);
  const carryTop = JSON.stringify(H.topThree(s));
  const sup = H.poolForPosition('pos5').map(h => h.id).find(id => carryPool.indexOf(id) < 0);
  s.player.role = 'pos5'; rec(s, sup, 1, 1);
  assert.deepStrictEqual(ids(s), [sup], 'top pos5 solo con su héroe');
  s.player.role = 'carry';
  assert.strictEqual(JSON.stringify(H.topThree(s)), carryTop, 'carry intacto al volver');

  /* g. invariante con el motor (antes de f, que reutiliza esta carrera) */
  s = fresh('mid', 'HERO-1');
  let g = 0;
  while (!s.finished && s.history.length < 2 && g++ < 4000) {
    if (s.pending) {
      const t = s.pending.type;
      if (t === 'event') E.season.resolvePendingEvent(s, 0);
      else if (t === 'wealth') E.finance.resolveSpecial(s, false);
      else if (t === 'tournament') { E.season.playLive(s, true); s.pending = null; if (s.season.liveTour && s.season.liveTour.done) E.season.continueCompetition(s); }
      else { s.pending = null; s.career.lastRetirementPrompt = s.year; }
      continue;
    }
    const o = E.season.advance(s);
    if (o && o.blocked && o.reason === 'offers' && s.offers.length) { E.market.acceptOffer(s, s.offers.slice().sort((a, b) => b.salary - a.salary)[0]); s.offers = []; }
  }
  assert.ok(s.history.length >= 2, 'la carrera llega a 2 temporadas');
  const bag = s.career.heroStats;
  let total = 0, byRole = 0;
  Object.keys(bag).forEach(id => {
    const h = bag[id];
    total += h.maps;
    assert.strictEqual(h.wins + h.losses, h.maps);
    Object.keys(h.roles).forEach(r => { byRole += h.roles[r].maps; });
  });
  const archived = !!s.history.length && !!s.season && s.history[s.history.length - 1].year === s.season.year;
  const hist = s.history.reduce((a, h) => a + ((h.acc && h.acc.maps) || 0), 0) + (!archived && s.season && s.season.acc ? (s.season.acc.maps || 0) : 0);
  assert.ok(total > 0, 'hay partidas');
  assert.strictEqual(total, hist, 'heroStats == history + temporada');
  assert.strictEqual(total, s.career.acc.maps, 'heroStats == career.acc.maps');
  assert.strictEqual(byRole, total, 'suma por rol == total');

  /* f. migración de un guardado viejo */
  function oldSave(roles) {
    const st = JSON.parse(JSON.stringify(s));
    const old = {};
    Object.keys(st.career.heroStats).forEach(id => {
      const h = st.career.heroStats[id];
      old[id] = { maps: h.maps, wins: h.wins, losses: h.losses };
    });
    st.career.heroStats = old;
    delete st.career.heroSeq;
    st.history.forEach((h, i) => { h.role = roles[i % roles.length]; });
    if (st.season) st.season.role = roles[0];
    st.player.role = roles[0];
    return { st, old };
  }
  function loadSave(st) { mem[KEY] = JSON.stringify(st); return DCS.store.load(); }

  let { st, old } = oldSave(['mid']);
  let L = loadSave(st);
  Object.keys(old).forEach(id => {
    const h = L.career.heroStats[id];
    assert.deepStrictEqual([h.maps, h.wins, h.losses], [old[id].maps, old[id].wins, old[id].losses], 'totales intactos');
    assert.deepStrictEqual(h.roles, { mid: { maps: old[id].maps, wins: old[id].wins } });
    assert.ok(!h.legacy);
  });
  assert.ok(H.topThree(L).length > 0, 'un solo rol → top visible');
  const once = JSON.stringify(L.career.heroStats);
  mem[KEY] = JSON.stringify(L);
  assert.strictEqual(JSON.stringify(DCS.store.load().career.heroStats), once, 'idempotente');

  ({ st, old } = oldSave(['mid', 'carry']));
  L = loadSave(st);
  Object.keys(old).forEach(id => {
    const h = L.career.heroStats[id];
    assert.deepStrictEqual([h.maps, h.wins, h.losses], [old[id].maps, old[id].wins, old[id].losses], 'totales intactos (legacy)');
    assert.deepStrictEqual(h.roles, {});
    assert.strictEqual(h.legacy, true);
  });
  assert.deepStrictEqual(H.topThree(L), [], 'legacy no inventa rol');
  const twice = JSON.stringify(L.career.heroStats);
  mem[KEY] = JSON.stringify(L);
  assert.strictEqual(JSON.stringify(DCS.store.load().career.heroStats), twice, 'idempotente (legacy)');
} catch (e) {
  console.error('FALLO: ' + (e && e.message));
  process.exit(1);
}
console.log('OK: héroes favoritos — 0/1/2/3+, desempate, atípico, cambio de rol, migración idempotente y suma de partidas.');
