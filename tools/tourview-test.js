'use strict';
/* TOURNAMENT-01 · vista de torneo en vivo sobre dist/index.html.
   `node tools/tourview-test.js`. Comprueba DCS.ui.tourView.state/ctaLabel
   en los 8 estados, la etiqueta BO1/BO3/BO5 y, renderizando
   S.liveTournament + app.advanceBar, que los CTA son únicos e
   inequívocos en ES y EN. Solo UI: no cambia el motor. */
const mem = {};
global.localStorage = { setItem: (k, v) => (mem[k] = String(v)), getItem: k => (k in mem ? mem[k] : null), removeItem: k => delete mem[k] };
require('./load-dist.js')();
DCS.store.setSilent(true);
const E = DCS.engine, D = DCS.data, G = DCS.game, TV = DCS.ui.tourView;

function fail(msg) { console.error('FALLO: ' + msg); process.exit(1); }
function ok(c, msg) { if (!c) fail(msg); }
ok(TV && TV.state && TV.ctaLabel && TV.mapLines && TV.kicker, 'falta DCS.ui.tourView');

/* ---------- llegar a un torneo en vivo (patrón gameplay-test) ---------- */
const s = DCS.store.newState({ seed: 'TV-1', name: 'T', nick: 't', nationality: 'España', region: 'weu', role: 'mid', archetype: 'mechanical' });
G.state = s;
const team0 = s.world.teams.find(t => t.tier === 2 && t.region === s.player.region) || s.world.teams.find(t => t.tier === 2);
E.market.acceptOffer(s, { id: 'force-tv', teamId: team0.id, teamName: team0.name, region: team0.region,
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
const tpl = D.TOURNAMENT_TEMPLATES[s.season.liveTour.templateId];
const keep = { format: tpl.format, playoffFormat: tpl.playoffFormat, playoff: tpl.playoff, kind: tpl.kind };

function loadFrom(json) {
  localStorage.setItem(DCS.store.KEY, json);
  const l = DCS.store.load();
  ok(l, 'load() devolvió null');
  G.state = l;
  return l;
}
const live = () => G.state.season.liveTour;
const copy = x => JSON.parse(JSON.stringify(x));

/* ---------- estados reales: next, live, between ---------- */
tpl.format = 'bo3'; tpl.playoffFormat = 'bo3';
const cases = {};
loadFrom(S0);
cases.next = copy(live());
G.playMap();
ok(live().open, 'bo3: la serie no quedó abierta tras 1 mapa');
cases.live = copy(live());
loadFrom(S0); G.simSeries();
ok(!live().done, 'el torneo terminó tras una serie');
cases.between = copy(live());
/* estados de cierre: un torneo real terminado, con la colocación forzada */
loadFrom(S0); G.simTournament();
ok(live().done, 'simTournament no terminó');
const doneLive = copy(live());
const lastOf = (won, stage) => Object.assign(copy(doneLive.last), { won: won, stage: stage || doneLive.last.stage });
function closed(o) {
  const l = copy(doneLive);
  l.eliminated = false; delete l.elimReason;
  Object.assign(l, o.live || {});
  l.record = Object.assign(copy(doneLive.record), o.record);
  /* syncGroupFlags() relee el log: fuera las derrotas de grupos si el
     caso forzado no es una eliminación en grupos. */
  if (!l.eliminated && !o.groupsOnly) {
    l.log = l.log.filter(x => !(x.won === false && isGroup(x)));
    /* Forma real de un torneo que pasó el corte (begin playoffs, L10329 y
       closeTournament L10157): qualifiedForPlayoffs true en live y record,
       y la serie que cierra el caso con un código de ronda del motor
       (roundName: FINAL / SEMIFINALS / QUARTERFINALS). */
    l.qualifiedForPlayoffs = true;
    l.record.qualifiedForPlayoffs = true;
    if (isGroup(l.last)) l.last.stage = 'SEMIFINALS';
    l.log.push(playoffEntry(l.last.stage, l.last.won));
  }
  if (o.groupsOnly) l.log = l.log.filter(isGroup);
  return l;
}
/* Entrada de live.log con la forma real del motor (live.last no la tiene):
   se copia una serie jugada de verdad y solo cambian fase, w/l y won. */
function playoffEntry(stage, won) {
  ok(doneLive.log.length, 'el torneo terminado no tiene series en el log');
  const src = doneLive.log.find(x => x.won === won) || doneLive.log[doneLive.log.length - 1];
  const e = copy(src);
  if (e.won !== won) { const w = e.w; e.w = e.l; e.l = w; }
  e.won = won; e.stage = stage;
  return e;
}
function isGroup(x) { const r = E.tournaments.groupRecord({ log: [x] }); return r.wins + r.losses + r.draws > 0; }
/* liga con corte (8 equipos, cut 4) en la que no se alcanzan los playoffs */
const CUT = { field: 8, cut: 4, playoff: 2, groupSeries: 7 };
function run(k, fn) {
  if (k !== 'leagueCut') return fn();
  const prev = {}; Object.keys(CUT).forEach(x => (prev[x] = tpl[x]));
  Object.assign(tpl, CUT);
  try { return fn(); } finally { Object.assign(tpl, prev); }
}
cases.champion = closed({ record: { placement: 1, result: 'CHAMPION' }, live: { last: lastOf(true, 'FINAL') } });
cases.runnerUp = closed({ record: { placement: 2, result: 'RUNNER_UP' }, live: { last: lastOf(false, 'FINAL') } });
cases.elim = closed({ record: { placement: 5, result: 'PLACE:5' }, live: { last: lastOf(false, 'Bracket inferior · SEMIFINALS') } });
cases.elimGroups = closed({ record: { placement: 12, result: 'ELIMINATED_GROUPS' }, live: { eliminated: true, elimReason: 'groups', last: lastOf(false) } });
cases.closed = closed({ record: { placement: 3, result: 'PLACE:3' }, live: { last: lastOf(true) } });
cases.leagueCut = closed({ groupsOnly: true, record: { placement: 5, result: 'PLACE:5-6', qualifiedForPlayoffs: false }, live: { last: lastOf(false) } });
tpl.playoff = tpl.playoff || 3; tpl.kind = keep.kind === 'league' ? 'cup' : keep.kind;

const OVER = { elimGroups: 1, elim: 1, runnerUp: 1, champion: 1, closed: 1, leagueCut: 1 };
const want = k => (k === 'leagueCut' ? 'elimGroups' : k);
const peekOf = l => E.tournaments.peek(copy(l));
Object.keys(cases).forEach(k => run(k, () => {
  const l = cases[k], nx = peekOf(l);
  ok(TV.state(l, nx) === want(k), 'state ' + k + ': esperado ' + want(k) + ', obtenido ' + TV.state(l, nx));
  const cta = TV.ctaLabel(l, nx);
  if (OVER[k]) {
    ok(cta.action === 'tour-continue' && cta.key === 'tourView.cta.close', k + ': el CTA de cierre no es tour-continue/cta.close');
    ok(TV.ctaLabel(l, nx, 'map').action === 'tour-continue', k + ': con done hay CTA de mapa');
  } else {
    ok(cta.action === 'tour-series', k + ': el CTA primario no es tour-series');
    ok(cta.key === (k === 'live' ? 'tourView.cta.simSeriesOpen' : 'tourView.cta.simSeries'), k + ': clave de CTA ' + cta.key);
    ok(TV.ctaLabel(l, nx, 'map').action === 'tour-map', k + ': falta tour-map');
  }
}));
run('leagueCut', () => {
  DCS.i18n.setLang('es', { render: false });
  const kk = TV.kicker(cases.leagueCut, null);
  ok(/^Eliminado en fase de grupos · \S/.test(kk), 'liga con corte: kicker «' + kk + '»');
});

/* ---------- BO1/BO3/BO5 en la etiqueta de playMap ---------- */
DCS.i18n.setLang('es', { render: false });
['bo1', 'bo3', 'bo5'].forEach(fmt => {
  tpl.format = fmt; tpl.playoffFormat = fmt;
  const l = copy(cases.next), lbl = TV.ctaLabel(l, peekOf(l), 'map').label;
  ok(lbl === 'Jugar mapa 1 de ' + fmt.toUpperCase(), fmt + ': etiqueta de mapa "' + lbl + '"');
});
tpl.format = 'bo3'; tpl.playoffFormat = 'bo3';
const lblOpen = TV.ctaLabel(cases.live, peekOf(cases.live), 'map').label;
ok(lblOpen === 'Jugar mapa ' + (cases.live.open.maps.length + 1) + ' de BO3', 'serie abierta: etiqueta "' + lblOpen + '"');
ok(/<ol[^>]*>[\s\S]*Mapa 1 [WL]/.test(TV.mapLines(cases.between.last.maps)), 'mapLines sin «Mapa 1 W/L»');

/* ---------- HTML de S.liveTournament y app.advanceBar en ES/EN ---------- */
const BANNED = { es: ['Continuar', 'Simular serie', 'Simular torneo'], en: ['Continue', 'Simulate series', 'Simulate tournament'] };
const buttons = html => {
  const out = [], re = /<button[^>]*data-action="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g;
  let m;
  while ((m = re.exec(html))) out.push({ action: m[1], text: m[2].replace(/<[^>]+>/g, '').trim() });
  return out;
};
const app = DCS.ui.app;
app.view = 'tournaments';
['es', 'en'].forEach(lang => {
  DCS.i18n.setLang(lang, { render: false });
  Object.keys(cases).forEach(k => run(k, () => {
    const st = JSON.parse(S0);
    st.season.liveTour = copy(cases[k]);
    G.state = st;
    const html = DCS.ui.screens.liveTournament(st);
    const nx = peekOf(cases[k]);
    const kick = DCS.ui.c.esc(TV.kicker(cases[k], nx));
    ok(kick && html.indexOf(kick) >= 0, lang + '/' + k + ': falta el kicker «' + kick + '»');
    if (k === 'elim') {
      ok(!/SEMIFINALS|QUARTERFINALS|ROUND_OF_16|>FINAL</.test(html), lang + '/elim: código de ronda sin traducir en el HTML');
      if (lang === 'es') ok(kick === 'Eliminado · Bracket inferior · Semifinales', 'es/elim: kicker «' + kick + '»');
      if (lang === 'en') ok(kick === 'Eliminated · Lower bracket · Semifinals', 'en/elim: kicker «' + kick + '»');
    }
    /* como texto completo de un elemento (titular, eyebrow, pista): una sola vez */
    const own = html.split('>' + kick + '<').length - 1;
    if (OVER[k]) ok(own === 1, lang + '/' + k + ': el estado final aparece ' + own + ' veces');
    if (lang === 'en') ok(!/Eliminado|Torneo|Próxim|Simular|Jugar mapa|Estilo del rival/.test(html), 'en/' + k + ': queda texto en español');
    const bs = buttons(html);
    const n = a => bs.filter(b => b.action === a).length;
    if (OVER[k]) {
      ok(n('tour-series') === 0 && n('tour-map') === 0 && n('tour-rest') === 0, lang + '/' + k + ': con done quedan CTA de juego');
      ok(n('tour-continue') === 1, lang + '/' + k + ': tour-continue no aparece una vez');
    } else {
      ok(n('tour-series') === 1, lang + '/' + k + ': tour-series aparece ' + n('tour-series') + ' veces');
      ok(n('tour-map') === 1 && n('tour-rest') === 1, lang + '/' + k + ': tour-map/tour-rest no aparecen una vez');
      ok(html.indexOf(DCS.ui.c.esc(DCS.t('tourView.cta.simTourWarn'))) >= 0, lang + '/' + k + ': falta el aviso de simular torneo');
    }
    const bar = app.advanceBar(st);
    const bb = buttons(bar).filter(b => /^tour-/.test(b.action));
    ok(bb.length <= 1, lang + '/' + k + ': advanceBar con ' + bb.length + ' botones');
    ok(bb.length === 1 && bb[0].action === (OVER[k] ? 'tour-continue' : 'tour-series'), lang + '/' + k + ': advanceBar sin el CTA primario');
    bs.concat(bb).forEach(b => ok(BANNED[lang].indexOf(b.text) < 0, lang + '/' + k + ': botón ambiguo «' + b.text + '»'));
  }));
});
DCS.i18n.setLang('es', { render: false });
Object.assign(tpl, keep);

console.log('OK: tourview — estados, CTA únicos e inequívocos, BO1/3/5, ES/EN.');
