'use strict';
/* Clasificación (RANKING-01) sobre el artefacto real (dist/index.html vía
   load-dist.js). `node tools/ranking-test.js`. Solo invariantes (exit 1):
   semilla, determinismo, regional = filtro del global, migración
   idempotente, sin doble conteo, cierre de temporada, empates, equipos
   sin resultados o disueltos y tamaño del guardado. */
const mem = {};
global.localStorage = { setItem: (k, v) => (mem[k] = String(v)), getItem: k => (k in mem ? mem[k] : null), removeItem: k => delete mem[k] };
require('./load-dist.js')();
DCS.store.setSilent(true);
const E = DCS.engine, W = E.world, D = DCS.data;
const REGIONS = ['weu', 'eeu', 'cn', 'sea', 'na', 'sa'];

function fail(msg) { console.error('FALLO: ' + msg); process.exit(1); }
function ok(c, msg) { if (!c) fail(msg); }
const ids = rows => rows.map(r => r.id).join(',');
const ptsMap = s => JSON.stringify(W.rankingTable(s, null).map(r => [r.id, r.pts]));
const rkFoot = s => JSON.stringify({ l: s.world.rkLedger, s: s.world.rkSnap, p: s.world.rkPrev, x: s.world.rkLast, t: s.world.teams.map(t => t && t.rk) }).length;

function newCareer(seed) {
  return DCS.store.newState({ seed, name: 'T', nick: 't', nationality: 'España', region: 'weu', role: 'mid', archetype: 'mechanical' });
}
function forceSign(s) {
  const team = s.world.teams.find(t => t.tier === 2 && t.region === s.player.region) || s.world.teams.find(t => t.tier === 2);
  E.market.acceptOffer(s, { id: 'force-rk', teamId: team.id, teamName: team.name, region: team.region,
    tier: team.tier, role: s.player.role, years: 2, salary: 40000, expectation: team.expectation });
  s.offers = [];
}
/* Un paso del bucle de baseline-test */
function step(s) {
  if (s.pending) {
    const t = s.pending.type;
    if (t === 'event') E.season.resolvePendingEvent(s, 0);
    else if (t === 'wealth') E.finance.resolveSpecial(s, false);
    else if (t === 'tournament') { E.season.playLive(s, true); s.pending = null; if (s.season.liveTour && s.season.liveTour.done) E.season.continueCompetition(s); }
    else { s.pending = null; s.career.lastRetirementPrompt = s.year; }
    return;
  }
  const o = E.season.advance(s);
  if (o && o.blocked && o.reason === 'offers' && s.offers.length) { E.market.acceptOffer(s, s.offers.slice().sort((a, b) => b.salary - a.salary)[0]); s.offers = []; }
}
function saveLoad(s) {
  localStorage.setItem(DCS.store.KEY, JSON.stringify(s));
  const l = DCS.store.load();
  ok(l, 'load() devolvió null');
  return l;
}

/* 1. Carrera nueva */
const s = newCareer('RANK-1');
const seeded = s.world.teams.filter(t => t && t.rk && W.rankPoints(t, s.year) > 0);
ok(seeded.length >= 30, 'menos de 30 equipos con semilla > 0 (' + seeded.length + ')');
ok(new Set(seeded.map(t => t.region)).size === 6, 'la semilla no cubre las 6 regiones');
ok(ids(W.rankingTable(s, null)) === ids(W.rankingTable(newCareer('RANK-1'), null)), 'mismo seed, distinto orden');
function regionalIsFilter(st) {
  const g = W.rankingTable(st, null);
  REGIONS.forEach(r => ok(ids(W.rankingTable(st, r)) === ids(g.filter(x => x.region === r)), 'regional ' + r + ' no es filtro del global'));
}
regionalIsFilter(s);
const sizeStart = rkFoot(s);

/* 3. Torneo del jugador */
DCS.game.state = s; forceSign(s);
const startYear = s.year;
let g = 0;
while (!Object.keys(s.world.rkLedger).length && s.year === startYear && g++ < 4000) step(s);
const keys = Object.keys(s.world.rkLedger);
ok(keys.length === 1 && s.year === startYear, 'no se cerró un torneo del jugador antes del fin de temporada');
const key = keys[0];
const scored = s.world.teams.filter(t => t && t.rk && (t.rk.y[startYear] || 0) > 0);
ok(scored.length >= 3, 'solo puntúan ' + scored.length + ' equipos en ' + key);
ok(scored.some(t => t.id === s.player.teamId), 'el equipo del jugador no puntúa');
ok(s.world.rkPrev && W.rankingTable(s, null).some(r => r.move !== null), 'movimiento sin calcular');
const parts = key.split('|');
const tpl = D.TOURNAMENT_TEMPLATES[parts[0]] || Object.values(D.TOURNAMENT_TEMPLATES).find(x => x.series === parts[0]);
ok(tpl, 'plantilla del ledger no encontrada: ' + key);
const beforeDup = rkFoot(s) + ptsMap(s);
ok(W.awardRanking(s, tpl, Number(parts[2]), Number(parts[1]), [{ teamId: scored[0].id, p: 1 }], { region: parts[3] }) === 0, 'doble conteo: awardRanking repetido devuelve > 0');
ok(rkFoot(s) + ptsMap(s) === beforeDup, 'awardRanking repetido cambia el estado');
const pBefore = ptsMap(s);
W.rankingTable(s, null); W.rankingTable(s, 'weu');
const l1 = saveLoad(s);
ok(ptsMap(l1) === pBefore && ptsMap(s) === pBefore, 'puntos distintos tras save/load o rankingTable');

/* 2. Guardado antiguo */
const old = JSON.parse(JSON.stringify(s));
delete old.world.rkLedger; delete old.world.rkSnap; delete old.world.rkPrev; delete old.world.rkLast;
old.world.teams.forEach(t => { if (t) delete t.rk; });
const keep = JSON.stringify(old.world.teams.map(t => t && [t.points, t.tier, t.tierHistory]));
localStorage.setItem(DCS.store.KEY, JSON.stringify(old));
const m1 = DCS.store.load();
localStorage.setItem(DCS.store.KEY, JSON.stringify(old));
const m2 = DCS.store.load();
ok(m1 && m2 && m1.world.rkLedger && m1.world.rkSnap, 'migrate no crea rkLedger/rkSnap');
ok(W.rankingTable(m1, null).length > 0 && ptsMap(m1) === ptsMap(m2), 'migración no determinista');
ok(ptsMap(saveLoad(m1)) === ptsMap(m1), 'migración no idempotente');
ok(JSON.stringify(m1.world.teams.map(t => t && [t.points, t.tier, t.tierHistory])) === keep, 'la migración toca points/tier/tierHistory');
regionalIsFilter(m1);

/* 4. Cambio de temporada */
DCS.game.state = s; g = 0;
while (s.year === startYear && !s.finished && g++ < 4000) step(s);
ok(s.year === startYear + 1, 'no se cerró la temporada');
ok(s.world.rkSnap[startYear] && s.world.rkSnap[startYear].length > 0, 'falta rkSnap[' + startYear + ']');
const pReg = s.player.region;
ok(s.world.teams.some(t => t && t.region !== pReg && (t.rk.y[startYear] || 0) > 0), 'no puntúan equipos de otras regiones');
REGIONS.forEach(r => ok(s.world.teams.some(t => t && t.region === r && (t.rk.y[startYear] || 0) > 0), 'nadie puntúa en ' + r));
const tiers = JSON.stringify(s.world.teams.map(t => t && t.tier));
W.awardRanking(s, { id: 'rk_probe', prestige: 5, field: 4 }, s.year, s.year, s.world.teams.slice(0, 4).map((t, i) => ({ teamId: t.id, p: i + 1 })));
ok(JSON.stringify(s.world.teams.map(t => t && t.tier)) === tiers, 'awardRanking cambió un tier');
delete s.world.rkLedger['rk_probe|' + s.year + '|' + s.year];
regionalIsFilter(s);

/* 4b. Movimiento regional, resultados con nombre y títulos NPC */
let rk3 = false;
REGIONS.forEach(r => {
  const all = s.world.teams.filter(t => t && t.region === r).length;
  const n = s.world.teams.filter(t => t && t.region === r && (t.rk.y[startYear] || 0) > 0).length;
  if (all) ok(n === all, 'solo ' + n + '/' + all + ' equipos con puntos en ' + r);
  if (n >= 3) rk3 = true;
});
ok(rk3, 'ninguna región con >= 3 equipos con puntos');
ok(s.world.teams.some(t => t && t.rk.last.length && t.rk.last.every(e => e && typeof e === 'object' && e.n && e.pl >= 1)), 'rk.last sin objetos {n, pl}');
ok(s.world.teams.some(t => t && t.id !== s.player.teamId && Array.isArray(t.rk.titles) && t.rk.titles.length && t.rk.titles[0].n), 'ningún NPC con rk.titles');
const numOld = JSON.parse(JSON.stringify(s));
numOld.world.teams.forEach(t => { if (t) t.rk.last = [12, 7]; });
localStorage.setItem(DCS.store.KEY, JSON.stringify(numOld));
const nm1 = DCS.store.load();
ok(nm1 && nm1.world.teams.every(t => !t || t.rk.last.every(e => e && typeof e === 'object' && typeof e.p === 'number')), 'rk.last numérico no migra a objetos');
ok(nm1.world.teams.find(t => t).rk.last[0].p === 12, 'migración de rk.last pierde los puntos');
ok(JSON.stringify(saveLoad(nm1).world.teams.map(t => t && t.rk.last)) === JSON.stringify(nm1.world.teams.map(t => t && t.rk.last)), 'migración de rk.last no idempotente');
const HK = DCS.ui && DCS.ui.app && DCS.ui.app.HOTKEYS;
ok(HK && HK['0'] === 'ranking' && HK['5'] === 'tournaments', 'HOTKEYS sin 0 -> ranking / 5 -> tournaments');

/* 6. Equipo sin resultados y equipo disuelto */
const blank = s.world.teams.find(t => t && t.id !== s.player.teamId);
blank.rk = { y: {}, last: [] };
const rowBlank = W.rankingTable(s, null).find(r => r.id === blank.id);
ok(rowBlank && rowBlank.pts === 0, 'equipo sin resultados no aparece con 0');
const gone = s.world.teams.filter(t => t && t.id !== s.player.teamId && t.id !== blank.id).sort((a, b) => W.rankPoints(b, s.year) - W.rankPoints(a, s.year))[0];
const idx = s.world.teams.indexOf(gone);
const sub = { id: 'rk-sub', name: 'Sustituto', region: gone.region, tier: gone.tier, roster: [] };
W.seedTeam(sub, s.year, 1);
s.world.teams[idx] = sub;
const tbl = W.rankingTable(s, null);
ok(!tbl.some(r => r.id === gone.id), 'equipo disuelto sigue en la tabla');
ok(Object.keys(sub.rk.y).join() === String(s.year - 1) && sub.rk.last.length === 0, 'sustituto hereda puntos');
ok(tbl.find(r => r.id === 'rk-sub').pts < W.rankPoints(gone, s.year) || W.rankPoints(gone, s.year) === 0, 'sustituto con los puntos del disuelto');
s.world.teams[idx] = gone;
blank.rk = JSON.parse(JSON.stringify(m1.world.teams.find(t => t && t.id === blank.id).rk));

/* 5. Empates */
const tie = JSON.parse(JSON.stringify(s));
const mk = (id, last) => ({ id, name: id, region: 'weu', tier: 3, roster: [], rk: { y: { [tie.year]: 777 }, last } });
tie.world.teams.push(mk('zz-b', [5]), mk('zz-a', [5]), mk('zz-c', [9]));
const order = () => W.rankingTable(tie, null).filter(r => r.id.indexOf('zz-') === 0).map(r => r.id).join();
ok(order() === 'zz-c,zz-a,zz-b', 'desempate incorrecto: ' + order());
ok(order() === order(), 'desempate inestable');

/* 7. Tamaño tras 3 temporadas + purga */
const sizeSeason1 = rkFoot(s);
g = 0;
while (s.year < startYear + 3 && !s.finished && g++ < 12000) step(s);
ok(s.year === startYear + 3, 'no se jugaron 3 temporadas');
const sizeEnd = rkFoot(s);
ok(sizeEnd < sizeStart + 20480 * 3, 'ranking crece demasiado: ' + sizeStart + ' -> ' + sizeEnd + ' (temporada 1: ' + sizeSeason1 + ')');
while (s.year < startYear + 6 && !s.finished && g++ < 30000) step(s);
const minY = s.year - 1 - W.RANKING_CONFIG.keepYears;
ok(s.world.teams.every(t => !t || Object.keys(t.rk.y).every(y => Number(y) >= minY)), 'rk.y sin purgar');
ok(Object.keys(s.world.rkLedger).every(k => Number(k.split('|')[2]) >= minY), 'rkLedger sin purgar');
ok(Object.keys(s.world.rkSnap).every(y => Number(y) >= s.year - 1 - (W.RANKING_CONFIG.keepYears + 3)), 'rkSnap sin purgar');

console.log('OK: ranking — semilla, migración idempotente, sin doble conteo, temporada, empates y regional = filtro global.');
