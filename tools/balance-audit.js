'use strict';
/* Auditoría de balance de torneos y The International sobre dist/index.html.
   node tools/balance-audit.js [N] [--report]
   Semillas BAL-0..N-1, región y rol rotando. Imprime una línea JSON con
   métricas y violaciones; sale con 1 si hay violaciones salvo con --report. */
const mem = {};
global.localStorage = { setItem: (k, v) => (mem[k] = String(v)), getItem: k => (k in mem ? mem[k] : null), removeItem: k => delete mem[k] };
require('./load-dist.js')();
DCS.store.setSilent(true);
const E = DCS.engine;

const REGIONS = ['weu', 'eeu', 'cn', 'sea', 'na', 'sa'];
const ROLES = ['carry', 'mid', 'offlane', 'pos4', 'pos5'];
const argN = process.argv.slice(2).find(a => /^\d+$/.test(a));
const N = argN ? +argN : 60;
const REPORT = process.argv.includes('--report');

function playCareer(i) {
  const s = DCS.store.newState({ seed: 'BAL-' + i, name: 'T', nick: 't', nationality: 'España', region: REGIONS[i % 6], role: ROLES[i % 5], archetype: 'mechanical' });
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

const isTiQualLine = l => /clasificar a The International/.test(l.label || '');

function run() {
  const m = { careers: N, t1Seasons: 0, tiQualified: 0, tiWon: 0, tiPerT1Season: 0, maxTiCareer: 0, titlesPerCareer: 0, goatCareers: 0, goatPct: 0 };
  const v = { placementOutOfField: 0, negativeQualified: 0, qualifiedNotInAudit: 0, tiQualBonusTwice: 0, championLostWithoutGrandFinal: 0 };
  const samples = [];
  let titles = 0;
  for (let i = 0; i < N; i++) {
    const s = playCareer(i);
    let tiCareer = 0;
    titles += (s.career && s.career.titles) || 0;
    if (s.legacy && s.legacy.category === 'Candidato a GOAT') m.goatCareers++;
    (s.history || []).forEach(h => {
      const tours = h.tournaments || [];
      if (h.tier === 1) {
        m.t1Seasons++;
        if (tours.some(t => t.key === 'ti')) m.tiQualified++;
      }
      tours.forEach(t => {
        if (t.key === 'ti' && t.placement === 1) { m.tiWon++; tiCareer++; }
        const bad = (type) => { v[type]++; if (samples.length < 10) samples.push({ type, seed: 'BAL-' + i, year: t.year, key: t.key, placement: t.placement, field: t.field }); };
        /* (a) */ if (!(t.placement >= 1 && t.placement <= t.field)) bad('placementOutOfField');
        /* (b) */ if (t.qualifiedForPlayoffs === true && t.groupWins < t.groupLosses) bad('negativeQualified');
        /* (c) */ if (t.audit && t.qualifiedForPlayoffs === true && t.audit.advanced.indexOf(t.teamId) < 0) bad('qualifiedNotInAudit');
        /* (e) */
        if (t.placement === 1 && t.kind !== 'qualifier') {
          const label = DCS.engine.tournaments.groupStageName(DCS.data.TOURNAMENT_TEMPLATES[t.key] || {});
          const po = (t.log || []).filter(x => x.stage !== label && x.stage !== 'GROUP_STAGE' && x.stage !== 'LEAGUE');
          if (po.some(x => x.won === false) && !po.some(x => x.grandFinal)) bad('championLostWithoutGrandFinal');
        }
      });
      /* (d) tiQual: líneas en registros + cobros sueltos (awardBonus) que
         explican la diferencia entre earnings.bonus y la suma de registros. */
      const inRecords = tours.filter(t => (t.bonusLines || []).some(isTiQualLine)).length;
      const loose = ((h.earnings && h.earnings.bonus) || 0) - tours.reduce((a, t) => a + (t.bonus || 0), 0);
      if (inRecords + (loose > 0 ? 1 : 0) > 1) { v.tiQualBonusTwice++; if (samples.length < 10) samples.push({ type: 'tiQualBonusTwice', seed: 'BAL-' + i, year: h.year }); }
    });
    m.maxTiCareer = Math.max(m.maxTiCareer, tiCareer);
  }
  m.titlesPerCareer = +(titles / N).toFixed(2);
  m.tiPerT1Season = m.t1Seasons ? +(m.tiWon / m.t1Seasons).toFixed(3) : 0;
  m.tiQualRate = m.t1Seasons ? +(m.tiQualified / m.t1Seasons).toFixed(3) : 0;
  m.goatPct = +(100 * m.goatCareers / N).toFixed(1);
  return { metrics: m, violations: v, samples };
}

const out = run();
const total = Object.values(out.violations).reduce((a, b) => a + b, 0);
console.log(JSON.stringify(out));
if (total === 0) console.log('OK: balance-audit ' + N + ' carreras, 0 violaciones');
else if (!REPORT) { console.error('FALLO: balance-audit ' + total + ' violaciones'); process.exit(1); }
