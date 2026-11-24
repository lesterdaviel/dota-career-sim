'use strict';
/* Progresión de carrera sobre el artefacto real (dist/index.html vía
   load-dist.js). `node tools/progression-test.js`.
   Solo mide: no cambia fórmulas. Los rangos objetivo son hipótesis y se
   informan, no se aseveran. Lo que hace fallar (exit 1) son invariantes:
   (a) history estable tras guardar y cargar dos veces,
   (b) todos los equipos tienen tierHistory (tras jugar y tras migrar),
   (c) cargar no reescribe tierHistory,
   (d) TEAM_SNAPSHOT fechado (catálogo DLTV del 2026-11-23) y con al menos una fuente.
   Referencia (120 carreras PROG-i, tras ajustar rollPotential el 23 nov
   2026): T2 54,2 %, T1 16,7 %, años a T1 mediana 11 (p10 7, p90 18), 33 %
   de temporadas sin equipo, títulos mediana 2 / p90 8 / máx 33, TI en 4
   carreras (máx 6). Antes del ajuste: T2 55 %, T1 13,3 %, años a T1
   mediana 11, 34 % sin equipo, títulos p90 7 / máx 29, TI en 3 carreras.
   «Años hasta T1» = nº de temporada (1-based) de la primera con tier 1. */
const mem = {};
global.localStorage = { setItem: (k, v) => (mem[k] = String(v)), getItem: k => (k in mem ? mem[k] : null), removeItem: k => delete mem[k] };
require('./load-dist.js')();
DCS.store.setSilent(true);
const E = DCS.engine;
const REGIONS = ['weu', 'eeu', 'cn', 'sea', 'na', 'sa'];
const ROLES = ['carry', 'mid', 'offlane', 'pos4', 'pos5'];
const ARCHS = ['mechanical', 'smart', 'aggressive', 'consistent', 'leader'];

function fail(msg) { console.error('FALLO: ' + msg); process.exit(1); }

function newCareer(i) {
  return DCS.store.newState({ seed: 'PROG-' + i, name: 'T', nick: 't', nationality: 'España',
    region: REGIONS[i % 6], role: ROLES[i % 5], archetype: ARCHS[i % 5] });
}

/* Firma forzada con la función real del mercado (acceptOffer). buildOffer
   no está exportado: se construye una oferta mínima con los campos que lee
   acceptOffer. ponytail: salario fijo por tier, no el de salaryFor. */
function forceSign(s, tier) {
  const teams = s.world.teams;
  const team = teams.find(t => t.tier === tier && t.region === s.player.region) || teams.find(t => t.tier === tier);
  if (!team) return false;
  const ok = E.market.acceptOffer(s, { id: 'force-' + tier, teamId: team.id, teamName: team.name, region: team.region,
    tier: team.tier, role: s.player.role, years: 2, salary: tier === 1 ? 120000 : 40000, expectation: team.expectation });
  s.offers = [];
  return ok !== false;
}

function play(s) {
  DCS.game.state = s; let g = 0;
  while (!s.finished && g++ < 4000) {
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
  if (!s.finished) E.retirement.retire(s, 'audit');
  return s;
}

function tierHistories(s) { return JSON.stringify(s.world.teams.map(t => [t.id, t.tierHistory])); }
function allHaveTierHistory(s) { return s.world.teams.every(t => t && t.tierHistory && typeof t.tierHistory === 'object'); }
function histKey(s) { return JSON.stringify(s.history.map(h => [h.tier, h.teamName])); }

function checkInvariants(s, label) {
  if (!allHaveTierHistory(s)) fail(label + ': equipo sin tierHistory tras jugar');
  const before = histKey(s), len = s.history.length, th = tierHistories(s);
  DCS.store.setSilent(false); DCS.store.save(s); DCS.store.setSilent(true);
  const l1 = DCS.store.load();
  if (!l1) fail(label + ': load() devolvió null');
  localStorage.setItem(DCS.store.KEY, JSON.stringify(l1));
  const l2 = DCS.store.load();
  [l1, l2].forEach((l, k) => {
    if (l.history.length !== len || histKey(l) !== before) fail(label + ': history cambia tras carga ' + (k + 1));
    if (tierHistories(l) !== th) fail(label + ': tierHistory reescrito al cargar ' + (k + 1));
  });
  const stripped = JSON.parse(JSON.stringify(l2));
  stripped.world.teams.forEach(t => { if (t) delete t.tierHistory; });
  localStorage.setItem(DCS.store.KEY, JSON.stringify(stripped));
  const l3 = DCS.store.load();
  if (!l3 || !allHaveTierHistory(l3)) fail(label + ': migrate no crea tierHistory');
  localStorage.removeItem(DCS.store.KEY);
}

function row(s) {
  const h = s.history || [], c = s.career || {};
  const firstT1 = h.findIndex(x => x.tier === 1);
  return {
    t2: h.some(x => x.tier === 2 || x.tier === 1), t1: firstT1 >= 0,
    yearsToT1: firstT1 >= 0 ? firstT1 + 1 : null,
    seasons: h.length, idle: h.filter(x => !x.teamId).length,
    titles: Array.isArray(c.titles) ? c.titles.length : (c.titles || 0), ti: c.tiWon || 0
  };
}

function q(v, p) { v = v.slice().sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.ceil(p * v.length) - 1)] : null; }
function pct(n, d) { return d ? Math.round(n * 1000 / d) / 10 : 0; }
function summary(rows) {
  const y = rows.filter(r => r.t1).map(r => r.yearsToT1), ti = rows.map(r => r.ti), tt = rows.map(r => r.titles);
  const seasons = rows.reduce((a, r) => a + r.seasons, 0), idle = rows.reduce((a, r) => a + r.idle, 0);
  return {
    n: rows.length, t2: pct(rows.filter(r => r.t2).length, rows.length), t1: pct(rows.filter(r => r.t1).length, rows.length),
    yearsT1: { med: q(y, 0.5), p10: q(y, 0.1), p90: q(y, 0.9) }, idlePct: pct(idle, seasons),
    titles: { med: q(tt, 0.5), p90: q(tt, 0.9), max: Math.max.apply(null, tt), zero: tt.filter(x => !x).length },
    ti: { careers: ti.filter(x => x > 0).length, max: Math.max.apply(null, ti) }
  };
}

const snap = DCS.data.TEAM_SNAPSHOT;
if (!snap || snap.asOf !== '2026-11-23' || !Array.isArray(snap.sources) || snap.sources.length < 1) fail("TEAM_SNAPSHOT debe tener asOf '2026-11-23' y al menos una fuente");

const initial = [];
for (let i = 0; i < 120; i++) {
  const s = newCareer(i);
  if (!allHaveTierHistory(s) || !s.world.teams.every(t => t.tierHistory[s.year] === t.tier)) fail('PROG-' + i + ': tierHistory inicial incompleto');
  play(s);
  checkInvariants(s, 'PROG-' + i);
  initial.push(row(s));
}

function forced(tier) {
  const rows = [];
  for (let i = 0; i < 20; i++) {
    const s = newCareer(i);
    if (!forceSign(s, tier)) fail('no se pudo firmar con un Tier ' + tier + ' (PROG-' + i + ')');
    play(s);
    checkInvariants(s, 'T' + tier + '-PROG-' + i);
    rows.push(row(s));
  }
  return summary(rows);
}

const ini = summary(initial), mid = forced(2), eli = forced(1);
console.log(JSON.stringify({ inicial: ini, mitad: mid, elite: eli }, null, 2));
/* Hipótesis informativas (no fallan): T1 inicial 10-25 %, temporadas sin equipo < 40 %. */
console.log('Hipótesis: T1 inicial 10-25 % → ' + (ini.t1 >= 10 && ini.t1 <= 25 ? 'dentro' : 'fuera') +
  '; sin equipo < 40 % → ' + (ini.idlePct < 40 ? 'dentro' : 'fuera'));
console.log('OK: progresión — inicial T2 ' + ini.t2 + '% / T1 ' + ini.t1 + '%, mitad T2 ' + mid.t2 + '% / T1 ' + mid.t1 +
  '%, élite T2 ' + eli.t2 + '% / T1 ' + eli.t1 + '%, historial preservado');
