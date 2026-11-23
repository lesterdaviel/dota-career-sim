'use strict';
/* Línea base reproducible: 20 carreras con semillas fijas (AUDIT-0..AUDIT-19)
   sobre el artefacto real (dist/index.html vía load-dist.js), como red de
   regresión de balance. Se ejecuta con `node tools/baseline-test.js`
   (`--json` imprime solo las filas, para comparar con diff).
   No cambia balances ni mecánicas: solo juega y mide.
   Cifras de referencia (nov 2026): títulos mediana 2 / p90 51 / máx 87;
   TI mediana 0 / p90 6 / máx 14.
   ponytail: no fija umbrales de balance (solo determinismo y que toda carrera
   termine sola), porque el balance está en revisión; se añadirán cuando se corrija. */
const mem = {};
global.localStorage = { setItem: (k, v) => (mem[k] = String(v)), getItem: k => (k in mem ? mem[k] : null), removeItem: k => delete mem[k] };
require('./load-dist.js')();
DCS.store.setSilent(true);
const E = DCS.engine;

function play(seed) {
  const s = DCS.store.newState({ seed, name: 'T', nick: 't', nationality: 'España', region: 'weu', role: 'mid', archetype: 'mechanical' });
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
  const forced = !s.finished;
  if (forced) E.retirement.retire(s, 'audit');
  const c = s.career || {};
  return { seed, retAge: s.player.age, seasons: (s.history || []).length, titles: Array.isArray(c.titles) ? c.titles.length : c.titles, ti: c.tiWon, net: Math.round(E.finance.snapshot(s).net), forced };
}

function fail(msg) { console.error('FALLO: ' + msg); process.exit(1); }
const seeds = Array.from({ length: 20 }, (_, i) => 'AUDIT-' + i);
const rows = seeds.map(play);
if (JSON.stringify(rows) !== JSON.stringify(seeds.map(play))) fail('las dos pasadas difieren (no determinista)');
const bad = rows.filter(r => r.forced);
if (bad.length) fail('carreras sin terminar solas: ' + bad.map(r => r.seed).join(', '));

if (process.argv.includes('--json')) { console.log(JSON.stringify(rows, null, 2)); process.exit(0); }

function stats(key) {
  const v = rows.map(r => r[key] || 0).sort((a, b) => a - b);
  const q = p => v[Math.min(v.length - 1, Math.ceil(p * v.length) - 1)];
  return { med: q(0.5), p90: q(0.9), max: v[v.length - 1] };
}
const t = stats('titles'), ti = stats('ti'), net = stats('net');
console.table(rows);
console.log('OK: baseline 20 carreras deterministas — títulos mediana ' + t.med + ' / p90 ' + t.p90 + ' / máx ' + t.max +
  ', TI mediana ' + ti.med + ' / p90 ' + ti.p90 + ' / máx ' + ti.max + ', net mediana ' + net.med);
