'use strict';
/* Decisiones de carrera (DECISION-01) sobre dist/index.html.
   `node tools/decision-test.js`. Invariantes (exit 1): requisitos, efectos
   visibles, registro único, recarga sin duplicar, diferidos una vez, sin
   staff sin equipo, máx. 1 decisión por fase y determinismo. */
const mem = {};
global.localStorage = { setItem: (k, v) => (mem[k] = String(v)), getItem: k => (k in mem ? mem[k] : null), removeItem: k => delete mem[k] };
require('./load-dist.js')();
DCS.store.setSilent(true);
const E = DCS.engine, G = DCS.game, CD = E.careerDecisions;

function fail(msg) { console.error('FALLO: ' + msg); process.exit(1); }
function ok(c, msg) { if (!c) fail(msg); }
ok(CD && DCS.data.DECISIONS && DCS.data.DECISIONS.length === 4 && CD.make && CD.resolve && CD.closeSeason && CD.eligible, 'faltan APIs de DECISION-01');
const IDS = DCS.data.DECISIONS.map(d => d.id);

function fresh(seed, tier) {
  const s = DCS.store.newState({ seed, name: 'T', nick: 't', nationality: 'España', region: 'weu', role: 'mid', archetype: 'mechanical' });
  G.state = s;
  if (tier) {
    const tm = s.world.teams.find(t => t.tier === tier && t.region === s.player.region && !t.hasPlayer) || s.world.teams.find(t => t.tier === tier && !t.hasPlayer);
    E.market.acceptOffer(s, { id: 'force-dec', teamId: tm.id, teamName: tm.name, region: tm.region,
      tier: tm.tier, role: s.player.role, years: 2, salary: 40000, expectation: tm.expectation });
    s.offers = [];
  }
  E.season.startSeason(s);
  const p = s.player;
  p.form = 60; p.morale = 60; p.reputation = 50; p.trainingMod = 0;
  s.career.lastRating = 70;
  const team = E.world.getTeam(s, p.teamId);
  if (team) team.synergy = 50;
  CD.ensure(s);
  return s;
}
const clone = s => JSON.parse(JSON.stringify(s));
/* fuerza el valor de mercado para starter_vs_bench (nearTier1 lee market.profile) */
const realProfile = E.market.profile;
function withValue(v, fn) {
  E.market.profile = st => Object.assign({}, realProfile(st), { value: v });
  try { return fn(); } finally { E.market.profile = realProfile; }
}
/* estado que cumple los requisitos de cada decisión */
function meets(id) {
  const s = fresh('DEC-A', 2);
  if (id === 'contract_renewal') s.player.contract.years = 1;
  if (id === 'rest_vs_training') s.player.form = 40;
  if (id === 'public_conflict') s.career.lastRating = 40;
  return s;
}
const PHASE = { contract_renewal: 'pre', starter_vs_bench: 'mid', rest_vs_training: 'pre', public_conflict: 'mid' };
const elig = (s, ph, v) => withValue(v === undefined ? 0 : v, () => CD.eligible(s, ph));

/* ---------- (a) requisitos ---------- */
const fa = fresh('DEC-FA', 0);
fa.player.contract = { years: 1, salary: 1 }; fa.player.form = 10; fa.player.morale = 10; fa.career.lastRating = 10;
['pre', 'mid', 'post'].forEach(ph => ok(elig(fa, ph, 99).length === 0, 'sin equipo sale una decisión en ' + ph));
IDS.forEach(id => {
  const s = meets(id);
  ok(elig(s, PHASE[id], id === 'starter_vs_bench' ? 99 : 0).indexOf(id) >= 0, id + ': no aparece cumpliendo requisitos');
});
{
  const s = fresh('DEC-A', 2); s.player.contract.years = 2; s.player.form = 70; s.player.morale = 70; s.career.lastRating = 70;
  ['pre', 'mid', 'post'].forEach(ph => ok(elig(s, ph, 0).length === 0, 'sin requisitos sale ' + elig(s, ph, 0).join(',') + ' en ' + ph));
  ok(elig(s, 'post', 99).indexOf('starter_vs_bench') >= 0, 'starter_vs_bench no aparece en post cerca del listón');
  ok(elig(fresh('DEC-A', 1), 'mid', 99).indexOf('starter_vs_bench') < 0, 'starter_vs_bench sale en un Tier 1');
  const r = meets('contract_renewal');
  ok(elig(r, 'post').indexOf('contract_renewal') < 0, 'contract_renewal sale fuera de pre/mid');
  CD.make(r, 'contract_renewal', 'pre'); r.season.events[r.season.events.length - 1].resolved = true;
  ok(elig(r, 'mid').indexOf('contract_renewal') < 0, 'contract_renewal repite en la misma temporada');
}

/* ---------- (b) cada opción cambia un estado visible ---------- */
function visible(s) {
  const p = s.player, tm = E.world.getTeam(s, p.teamId);
  return JSON.stringify({ f: p.form, m: p.morale, r: p.reputation, c: p.contract, syn: tm ? tm.synergy : null,
    tr: p.trainingMod || 0, team: p.teamId, def: s.career.deferred.length });
}
IDS.forEach(id => {
  const def = DCS.data.DECISIONS.find(d => d.id === id);
  ok(def.options.length >= 2 && def.options.length <= 3, id + ': 2-3 opciones');
  def.options.forEach((_, i) => {
    const s = meets(id);
    const inst = CD.make(s, id, PHASE[id]);
    const before = visible(s);
    const seen = JSON.stringify(inst.options);
    ok(before === visible(s), id + ': crear la instancia aplicó efectos');
    CD.resolve(s, inst, i);
    ok(visible(s) !== before, id + ' opción ' + i + ': no cambia nada visible');
    ok(inst.outcomeKey && inst.outcome && DCS.t(inst.outcomeKey) !== inst.outcomeKey, id + ' opción ' + i + ': sin texto i18n de resultado');
    ok(seen.indexOf('"label":""') < 0 && seen.indexOf('"hint":""') < 0, id + ': opciones sin texto');
  });
});

/* ---------- (c) registro único ---------- */
{
  const s = meets('rest_vs_training');
  const inst = CD.make(s, 'rest_vs_training', 'pre');
  s.pending = { type: 'event', eventId: inst.id };
  E.season.resolvePendingEvent(s, 1);
  const once = visible(s);
  ok(E.season.resolvePendingEvent(s, 1) === null, 'el segundo resolve encontró pendiente');
  CD.resolve(s, inst, 1);
  inst.applied = false; inst.resolved = false;
  CD.resolve(s, inst, 2);
  ok(visible(s) === once, 'resolver dos veces reaplica efectos');
  ok(s.career.decisions.filter(d => d.id === inst.id).length === 1, 'registro duplicado en career.decisions');
}

/* ---------- (d) recarga ---------- */
function loadFrom(json) {
  localStorage.setItem(DCS.store.KEY, json);
  const l = DCS.store.load();
  ok(l, 'load() devolvió null');
  G.state = l;
  return l;
}
function raw(st) { DCS.runtime.sync(st); return JSON.stringify(st); }
function snap(st) { return JSON.stringify(JSON.parse(raw(st), (k, v) => (/At$/.test(k) && typeof v === 'number' ? undefined : v))); }
{
  const s = meets('public_conflict');
  const inst = CD.make(s, 'public_conflict', 'mid');
  s.pending = { type: 'event', eventId: inst.id };
  const pend = raw(s);
  /* sin recargar: se resuelve sobre el objeto vivo */
  E.season.resolvePendingEvent(s, 2); const A = snap(loadFrom(raw(s)));
  /* recargando con el pendiente sin resolver */
  const b = loadFrom(pend); E.season.resolvePendingEvent(b, 2); const B = snap(loadFrom(raw(b)));
  ok(A === B, 'recargar con la decisión pendiente cambia el resultado');
  const c = loadFrom(raw(b));
  ok(E.season.resolvePendingEvent(c, 2) === null, 'tras recargar reaparece el pendiente');
  ok(snap(c) === B, 'recargar tras resolver cambia el estado');
  ok(c.career.decisions.length === 1, 'recargar tras resolver duplica el registro');
  const m = clone(c); delete m.career.decisions; delete m.career.deferred;
  const lm = loadFrom(JSON.stringify(m));
  ok(Array.isArray(lm.career.decisions) && Array.isArray(lm.career.deferred), 'migrate no crea career.decisions/deferred');
}

/* ---------- (e) diferidos, una vez ---------- */
{
  const s = meets('rest_vs_training');
  CD.resolve(s, CD.make(s, 'rest_vs_training', 'pre'), 2);
  ok(Math.abs(s.player.trainingMod - 0.15) < 1e-9, 'entrenar más no sube trainingMod');
  CD.closeSeason(s);
  ok(Math.abs(s.player.trainingMod) < 1e-9 && s.career.deferred.every(d => d.done), 'training_restore no se aplica al cierre');
  CD.closeSeason(s);
  ok(Math.abs(s.player.trainingMod) < 1e-9, 'training_restore se reaplica');

  const r = meets('contract_renewal');
  CD.resolve(r, CD.make(r, 'contract_renewal', 'pre'), 2);
  ok(r.player.teamId, 'rechazar renovar saca del equipo antes del cierre');
  CD.closeSeason(r);
  ok(!r.player.teamId && !r.player.contract, 'contract_expire no deja agente libre');
  const st1 = visible(r); CD.closeSeason(r);
  ok(visible(r) === st1 && r.career.deferred.every(d => d.done), 'contract_expire se reaplica');

  const b = meets('starter_vs_bench');
  CD.resolve(b, CD.make(b, 'starter_vs_bench', 'mid'), 1);
  ok(CD.closeSeason(b).benchOffer === true, 'bench_offer no se activa al cierre');
  ok(CD.closeSeason(b).benchOffer === false, 'bench_offer se reaplica');
  const o = CD.benchOffer(b);
  ok(o && o.tier === 1 && o.provisional && o.teamId !== b.player.teamId, 'sin oferta Tier 1 de suplente');
  E.market.acceptOffer(b, o);
  ok(b.player.flags.provisional === true && E.world.getTeam(b, b.player.teamId).tier === 1, 'aceptar la oferta no deja suplente en Tier 1');
}

/* ---------- (f)+(g) 20 carreras jugadas ---------- */
const STAFF = /staff|cuerpo técnico|entrenador|coach/i;
const realDraw = CD.draw, realEv = E.events.draw;
let perPhase = {};
CD.draw = function (state, phase) {
  const inst = realDraw(state, phase);
  if (inst) {
    ok(state.player.teamId, 'decisión ' + inst.key + ' sin equipo');
    const k = state.seed + '|' + state.year + '|' + phase;
    perPhase[k] = (perPhase[k] || 0) + 1;
    ok(perPhase[k] === 1, 'más de una decisión en ' + k);
    ok(state.season.events.filter(e => e.decision && e.key === inst.key).length === 1, inst.key + ' repite en la temporada ' + state.year);
  }
  return inst;
};
E.events.draw = function (state, rng, phase, season, chance) {
  const ev = realEv(state, rng, phase, season, chance);
  if (ev && !state.player.teamId) {
    const view = DCS.i18n.eventView(ev);
    ok(!STAFF.test(view.title + ' ' + view.text + ' ' + view.options.map(o => o.label + ' ' + o.hint).join(' ')), 'evento con staff sin equipo: ' + ev.key);
  }
  return ev;
};
function play(seed) {
  const s = DCS.store.newState({ seed, name: 'T', nick: 't', nationality: 'España', region: 'weu', role: 'mid', archetype: 'mechanical' });
  G.state = s; let g = 0, k = 0;
  while (!s.finished && g++ < 4000) {
    if (s.pending) {
      const t = s.pending.type;
      if (t === 'event') E.season.resolvePendingEvent(s, (k++) % 3);
      else if (t === 'wealth') E.finance.resolveSpecial(s, false);
      else if (t === 'tournament') { E.season.playLive(s, true); s.pending = null; if (s.season.liveTour && s.season.liveTour.done) E.season.continueCompetition(s); }
      else { s.pending = null; s.career.lastRetirementPrompt = s.year; }
      continue;
    }
    const o = E.season.advance(s);
    if (o && o.blocked && o.reason === 'offers' && s.offers.length) { E.market.acceptOffer(s, s.offers.slice().sort((a, b) => b.salary - a.salary)[0]); s.offers = []; }
  }
  const dec = (s.career.decisions || []);
  dec.forEach(d => ok(IDS.indexOf(d.key) >= 0, 'decisión desconocida ' + d.key));
  ok(new Set(dec.map(d => d.id)).size === dec.length, seed + ': registro duplicado');
  (s.career.deferred || []).forEach(d => ok(d.done || d.year >= s.year - 1, seed + ': diferido sin aplicar ' + d.id));
  return JSON.stringify(dec);
}
let total = 0;
for (let i = 0; i < 20; i++) total += JSON.parse(play('DEC-' + i)).length;
ok(total > 0, 'en 20 carreras no salió ninguna decisión de carrera');
perPhase = {};
const g1 = play('DEC-0'); perPhase = {};
ok(play('DEC-0') === g1, 'misma semilla, decisiones distintas');
CD.draw = realDraw; E.events.draw = realEv;

console.log('decisiones en 20 carreras: ' + total);
console.log('OK: decisiones — requisitos, efectos visibles, registro único, recarga sin duplicar, diferidos una vez, sin staff sin equipo.');
