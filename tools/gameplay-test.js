'use strict';
/* Serie BO1/BO3/BO5 con decisiones (GAMEPLAY-01) sobre dist/index.html.
   `node tools/gameplay-test.js`. Invariantes (exit 1): auto idéntico al
   camino clásico, determinismo, distribuciones por eje, save/load entre
   mapas, formatos válidos, guardado antiguo y sin bloqueos. */
const mem = {};
global.localStorage = { setItem: (k, v) => (mem[k] = String(v)), getItem: k => (k in mem ? mem[k] : null), removeItem: k => delete mem[k] };
require('./load-dist.js')();
DCS.store.setSilent(true);
const E = DCS.engine, D = DCS.data, G = DCS.game, M = E.match, DEC = E.decisions;

function fail(msg) { console.error('FALLO: ' + msg); process.exit(1); }
function ok(c, msg) { if (!c) fail(msg); }
ok(M.stepOpenSeries && M.mapBounds && DEC && DEC.resolveMods && DEC.rivalStyle && G.setPlan && G.playMap, 'faltan APIs de GAMEPLAY-01');

/* ---------- llegar a un torneo en vivo (patrón ranking-test) ---------- */
const s = DCS.store.newState({ seed: 'GP-1', name: 'T', nick: 't', nationality: 'España', region: 'weu', role: 'mid', archetype: 'mechanical' });
G.state = s;
const team0 = s.world.teams.find(t => t.tier === 2 && t.region === s.player.region) || s.world.teams.find(t => t.tier === 2);
E.market.acceptOffer(s, { id: 'force-gp', teamId: team0.id, teamName: team0.name, region: team0.region,
  tier: team0.tier, role: s.player.role, years: 2, salary: 40000, expectation: team0.expectation });
s.offers = [];
const inLive = st => st.pending && st.pending.type === 'tournament' && st.season.liveTour && !st.season.liveTour.done;
let g = 0;
while (!inLive(s) && g++ < 4000) {
  if (s.pending) {
    const t = s.pending.type;
    if (t === 'event') E.season.resolvePendingEvent(s, 0);
    else if (t === 'wealth') E.finance.resolveSpecial(s, false);
    else { s.pending = null; s.career.lastRetirementPrompt = s.year; }
    continue;
  }
  const o = E.season.advance(s);
  if (o && o.blocked && o.reason === 'offers' && s.offers.length) { E.market.acceptOffer(s, s.offers.slice().sort((a, b) => b.salary - a.salary)[0]); s.offers = []; }
}
ok(inLive(s), 'no se llegó a un torneo en vivo');
DCS.runtime.sync(s);
const S0 = JSON.stringify(s);

function loadFrom(json) {
  localStorage.setItem(DCS.store.KEY, json);
  const l = DCS.store.load();
  ok(l, 'load() devolvió null');
  G.state = l;
  return l;
}
function snap(st) {
  DCS.runtime.sync(st);
  /* fuera los sellos de reloj (Date.now): createdAt, savedAt, *At numéricos */
  const c = JSON.parse(JSON.stringify(st, (k, v) => (/At$/.test(k) && typeof v === 'number' ? undefined : v)));
  if (c.season && c.season.liveTour && c.season.liveTour.open == null) delete c.season.liveTour.open;
  return JSON.stringify(c);
}
/* guardado real (sin quitar nada) para recargar */
function raw(st) { DCS.runtime.sync(st); return JSON.stringify(st); }
const live = () => G.state.season.liveTour;
/* Una serie mapa a mapa; reload=true guarda y recarga entre mapas. */
function seriesByMaps(reload) {
  const n0 = live().seriesPlayed;
  let k = 0;
  while (!live().done && live().seriesPlayed === n0 && k++ < 12) {
    const before = live().open ? live().open.maps.length : 0;
    G.playMap();
    const op = live().open;
    if (op) ok(op.maps.length === before + 1, 'playMap no jugó exactamente un mapa (' + before + ' -> ' + op.maps.length + ')');
    if (reload && op) loadFrom(raw(G.state));
  }
  ok(k < 12, 'serie mapa a mapa bloqueada');
}
function tournamentByMaps(reload) {
  let k = 0;
  while (!live().done && k++ < 80) seriesByMaps(reload);
  ok(live().done, 'torneo mapa a mapa sin terminar');
}
function tournamentBySeries() {
  let k = 0;
  while (!live().done && k++ < 80) G.simSeries();
  ok(live().done, 'torneo por series sin terminar');
}
function validMaps(e) {
  const n = e.w + e.l, mx = Math.max(e.w, e.l);
  if (e.fmt === 'bo1') return n === 1;
  if (e.fmt === 'bo2') return n === 2;
  if (e.fmt === 'bo3') return n >= 2 && n <= 3 && mx === 2;
  if (e.fmt === 'bo5') return n >= 3 && n <= 5 && mx === 3;
  return false;
}
function checkLog(lv, tag) {
  lv.log.forEach(e => {
    ok(validMaps(e), tag + ': nº de mapas inválido ' + e.fmt + ' ' + e.w + '-' + e.l);
    ok(e.maps.length === e.w + e.l, tag + ': mapas duplicados o perdidos en el log');
  });
}

/* (a) auto por playMap == simSeries clásico: mismo estado y cursor */
loadFrom(S0); tournamentBySeries(); const refA = snap(G.state); const curA = G.state.cursor;
loadFrom(S0); tournamentByMaps(false); const byMaps = snap(G.state);
ok(G.state.cursor === curA, 'auto: cursor del rng distinto (' + G.state.cursor + ' vs ' + curA + ')');
ok(byMaps === refA, 'auto: el camino mapa a mapa no es idéntico al clásico');
ok(!live().log.some(e => e.dec), 'auto: el log lleva dec sin decisiones');
checkLog(live(), 'auto');

/* (f) guardado antiguo (live sin plan/open) juega en auto */
const old = JSON.parse(S0); delete old.season.liveTour.plan; delete old.season.liveTour.open;
loadFrom(JSON.stringify(old)); tournamentByMaps(false);
ok(snap(G.state) === refA, 'guardado antiguo no juega en auto');

/* (b) misma semilla + mismas decisiones x2 */
const PLAN = { draft: 'early', focus: 'obj', roshan: 'contest', hg: 'force', adapt: 'reset' };
function withPlan(reload) {
  loadFrom(S0);
  const n0 = live().seriesPlayed;
  Object.keys(PLAN).forEach(k => ok(G.setPlan(k, PLAN[k]), 'setPlan rechaza ' + k));
  ok(G.setPlan('draft', 'nope') === false && G.setPlan('zzz', 'auto') === false, 'setPlan acepta valores inválidos');
  ok(G.state.cursor === JSON.parse(S0).cursor, 'setPlan tiró rng');
  seriesByMaps(reload);
  ok(live().seriesPlayed === n0 + 1 || live().done, 'la serie con plan no terminó');
  ok(!live().plan, 'el plan no se borra al terminar la serie');
  return snap(G.state);
}
const p1 = withPlan(false), p2 = withPlan(false);
ok(p1 === p2, 'decisiones: misma semilla y plan dan resultados distintos');
ok(JSON.parse(p1).season.liveTour.log.slice(-1)[0].dec, 'el log no lleva dec con decisiones');
/* (d) save/load entre mapas == sin recargar (plan y auto) */
ok(withPlan(true) === p1, 'save/load entre mapas cambia el resultado (con plan)');
loadFrom(S0); tournamentByMaps(true);
ok(snap(G.state) === refA, 'save/load entre mapas cambia el resultado (auto)');

/* (d)+(e) BO1/BO3/BO5 forzados en la plantilla real */
const tpl = D.TOURNAMENT_TEMPLATES[JSON.parse(S0).season.liveTour.templateId];
const keepFmt = [tpl.format, tpl.playoffFormat];
['bo1', 'bo3', 'bo5'].forEach(fmt => {
  tpl.format = fmt; tpl.playoffFormat = fmt;
  loadFrom(S0); G.simSeries(); const e1 = live().log.slice(-1)[0];
  ok(validMaps(e1), fmt + ': simSeries con mapas inválidos');
  const ref = snap(G.state);
  loadFrom(S0); seriesByMaps(false);
  ok(snap(G.state) === ref, fmt + ': playMap != simSeries');
  loadFrom(S0); seriesByMaps(true);
  ok(snap(G.state) === ref, fmt + ': save/load entre mapas cambia el resultado');
  if (fmt !== 'bo1') {
    /* dos playMap tras recargar a mitad de serie no duplican */
    loadFrom(S0); Object.keys(PLAN).forEach(k => G.setPlan(k, PLAN[k]));
    G.playMap();
    const mid = raw(G.state);
    ok(live().open && live().open.maps.length === 1, fmt + ': la serie no quedó abierta tras 1 mapa');
    loadFrom(mid);
    const n0 = live().seriesPlayed;
    for (let c = 0; c < 2 && live().seriesPlayed === n0; c++) {
      const b = live().open.maps.length;
      G.playMap();
      const now = live().seriesPlayed === n0 ? live().open.maps.length : live().log.slice(-1)[0].maps.length;
      ok(now === b + 1, fmt + ': mapa duplicado o perdido tras recargar');
    }
    /* misma serie sin recarga */
    loadFrom(S0); Object.keys(PLAN).forEach(k => G.setPlan(k, PLAN[k])); seriesByMaps(false); const noRl = snap(G.state);
    loadFrom(mid); seriesByMaps(false);
    ok(snap(G.state) === noRl, fmt + ': recargar a mitad de serie cambia el resultado');
    checkLog(live(), fmt);
  }
  /* simTournament con plan termina */
  loadFrom(S0); G.setPlan('hg', 'force'); G.playMap(); G.simTournament();
  ok(live().done, fmt + ': simTournament con serie abierta no termina');
  checkLog(live(), fmt + ' torneo');
});
tpl.format = keepFmt[0]; tpl.playoffFormat = keepFmt[1];

/* (c) distribuciones: rival fijo (nivel 60, estilo 'late'), BO5, CRN */
const base = loadFrom(S0);
const team = E.world.getTeam(base, base.player.teamId);
const N = 2000;
function runSeries(plan, i, pw) {
  const rng = new DCS.rng.Rng('GP-C|' + i, 0);
  const open = { fmt: 'bo5', oppLevel: 60, teamLevel: 60, mapsWon: 0, mapsLost: 0, momentum: 0, maps: [] };
  let sr, k = 0;
  do {
    const rm = DEC.resolveMods(open, plan, 'late', new DCS.rng.Rng('GP-D|' + i + '|' + open.maps.length, 0));
    if (rm.mods) ok(Math.abs(rm.mods.dp) <= DEC.CAP + 1e-12, '|dp| > 0.08');
    ok(!!rm.mods === DEC.planActive(plan) && (rm.mods || !rm.events.length), 'auto con mods o eventos');
    sr = M.stepOpenSeries(base, rng, open, { team, teamLevel: 60, prestige: 8, mods: rm.mods });
    if (pw) pw.push(sr.maps[sr.maps.length - 1].pWin);
    open.lastDraft = rm.mods && plan.draft && plan.draft !== 'auto' ? plan.draft : null;
  } while (!sr.done && k++ < 10);
  ok(sr.done, 'serie bloqueada en la simulación');
  return sr.won ? 1 : 0;
}
function rate(plan, n, pw) { let w = 0; for (let i = 0; i < (n || N); i++) w += runSeries(plan, i, pw); return w / (n || N); }
const P = o => Object.assign({ draft: 'auto', focus: 'auto', roshan: 'auto', hg: 'auto', adapt: 'auto' }, o);
const auto = rate(P({}));
const pp = x => (x * 100).toFixed(2) + ' pp';
const dDraft = rate(P({ draft: 'early' })) - auto;
ok(dDraft > 0.015, 'draft temprano vs rival tardío no sube > 1,5 pp (' + pp(dDraft) + ')');
const dFocus = rate(P({ focus: 'obj' })) - auto;
ok(dFocus > 0.015, 'foco objetivos no sube > 1,5 pp (' + pp(dFocus) + ')');
const pwC = [], pwX = [];
const dCede = rate(P({ roshan: 'cede' }), N, pwX) - auto;
rate(P({ roshan: 'contest' }), N, pwC);
ok(dCede < -0.015, 'ceder Roshan no baja > 1,5 pp (' + pp(dCede) + ')');
const vr = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return a.reduce((x, y) => x + (y - m) * (y - m), 0) / a.length; };
ok(vr(pwC) > vr(pwX), 'disputar Roshan no tiene más varianza que ceder');
const lateBase = rate(P({ draft: 'late' }));
const dHg = rate(P({ draft: 'late', hg: 'force' })) - lateBase;
ok(dHg < -0.015, 'forzar HG con draft tardío no baja > 1,5 pp (' + pp(dHg) + ')');
const dReset = rate(P({ adapt: 'reset' })) - auto;
ok(dReset > 0, 'reiniciar tras derrota no mejora (' + pp(dReset) + ')');
/* ninguna combinación da 100 % ni 0 % */
const O = DEC.OPTIONS;
O.draft.forEach(d => O.focus.forEach(f => O.roshan.forEach(r => O.hg.forEach(h => O.adapt.forEach(a => {
  const x = rate({ draft: d, focus: f, roshan: r, hg: h, adapt: a }, 60);
  ok(x > 0 && x < 1, 'combinación determinista ' + [d, f, r, h, a].join('/') + ' = ' + x);
})))));
ok(['early', 'late', 'balanced'].indexOf(DEC.rivalStyle('x', 2026)) >= 0 && DEC.rivalStyle('x', 2026) === DEC.rivalStyle('x', 2026), 'rivalStyle no determinista');

console.log('draft ' + pp(dDraft) + ' · foco ' + pp(dFocus) + ' · ceder ' + pp(dCede) + ' · HG ' + pp(dHg) + ' · reset ' + pp(dReset));
console.log('OK: gameplay — auto idéntico, determinismo, distribuciones, save/load entre mapas, BO1/3/5, sin bloqueo.');
