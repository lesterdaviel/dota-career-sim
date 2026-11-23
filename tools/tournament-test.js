/* Auditoría masiva del motor de torneos: ninguna carrera puede producir un
   equipo con más derrotas que victorias en grupos y clasificado a playoffs,
   ni partidos de grupos jugados de más/de menos sin motivo, ni estadísticas
   que no cuadren con el log real. Carga dist/index.html, el artefacto que
   se publica (ver tools/load-dist.js): src/ no representa el producto. */
const mem = {};
global.localStorage = { setItem: (k, v) => mem[k] = v, getItem: k => mem[k] || null, removeItem: k => delete mem[k] };
global.crypto = { getRandomValues: a => a.fill(123456789) };
require('./load-dist.js')();
DCS.store.setSilent(true);

const T = DCS.data.TOURNAMENT_TEMPLATES;
const violations = [];
let recordsAudited = 0;
let negativeRecordsSeen = 0;
let negativeRecordsBlocked = 0;

function playCareer(seed) {
  const s = DCS.store.newState({
    seed, name: 'Test', nick: 'test', nationality: 'España',
    region: 'weu', role: 'mid', archetype: 'mechanical'
  });
  DCS.game.state = s;
  let guard = 0;
  while (!s.finished && guard++ < 4000) {
    if (s.pending) {
      if (s.pending.type === 'event') DCS.engine.season.resolvePendingEvent(s, 0);
      else if (s.pending.type === 'wealth') DCS.engine.finance.resolveSpecial(s, false);
      else if (s.pending.type === 'tournament') {
        DCS.engine.season.playLive(s, true);
        s.pending = null;
        if (s.season.liveTour && s.season.liveTour.done) DCS.engine.season.continueCompetition(s);
      } else { s.pending = null; s.career.lastRetirementPrompt = s.year; }
      continue;
    }
    const out = DCS.engine.season.advance(s);
    if (out && out.blocked && out.reason === 'offers') {
      if (s.offers.length) {
        const best = s.offers.slice().sort((a, b) => b.salary - a.salary)[0];
        DCS.engine.market.acceptOffer(s, best);
        s.offers = [];
      }
      continue;
    }
  }
  return s;
}

function collectRecords(s) {
  const out = [];
  (s.season && s.season.tournaments || []).forEach(r => out.push(r));
  (s.history || []).forEach(h => (h.tournaments || []).forEach(r => out.push(r)));
  return out;
}

function auditRecord(rec) {
  const tpl = T[rec.key];
  if (!tpl) return; /* plantilla legacy fuera del catálogo actual: no auditable */
  recordsAudited++;

  const isNegative = rec.groupWins < rec.groupLosses;
  if (isNegative) {
    negativeRecordsSeen++;
    if (rec.qualifiedForPlayoffs === true) {
      violations.push({ type: 'NEGATIVE_RECORD_QUALIFIED', key: rec.key, year: rec.year,
        groupWins: rec.groupWins, groupLosses: rec.groupLosses });
    } else {
      negativeRecordsBlocked++;
    }
  }

  /* Invariante: ningún equipo con más derrotas que victorias en grupos
     tiene series de playoff en su log real (comprobación independiente
     del flag qualifiedForPlayoffs). */
  const groupLabel = DCS.engine.tournaments.groupStageName(tpl);
  const groupEntries = (rec.log || []).filter(x => x.stage === groupLabel);
  const playoffEntries = (rec.log || []).filter(x => x.stage !== groupLabel);
  if (isNegative && playoffEntries.length > 0) {
    violations.push({ type: 'NEGATIVE_RECORD_PLAYED_PLAYOFFS', key: rec.key, year: rec.year,
      groupWins: rec.groupWins, groupLosses: rec.groupLosses, playoffSeries: playoffEntries.length });
  }

  /* Invariante: nunca más series de grupos que las que define la plantilla. */
  if (groupEntries.length > tpl.groupSeries) {
    violations.push({ type: 'GROUP_OVERPLAY', key: rec.key, year: rec.year,
      played: groupEntries.length, expected: tpl.groupSeries });
  }
  /* Si no hubo un corte temprano por derrotas (rec.eliminated), el equipo
     debe haber jugado exactamente las series de grupo del formato: ni una
     de más para unos equipos ni de menos para otros. */
  if (!rec.eliminated && groupEntries.length !== tpl.groupSeries) {
    violations.push({ type: 'GROUP_UNDERPLAY_WITHOUT_CUT', key: rec.key, year: rec.year,
      played: groupEntries.length, expected: tpl.groupSeries });
  }

  /* Invariante: los contadores de serie cuadran con el log real. Los
     formatos BO2 permiten un empate 1-1 (won === null): cuenta para
     seriesPlayed pero no para won ni para lost, así que se resta aparte. */
  const draws = (rec.log || []).filter(x => x.won !== true && x.won !== false).length;
  if (rec.seriesWon + rec.seriesLost + draws !== rec.seriesPlayed) {
    violations.push({ type: 'SERIES_COUNT_MISMATCH', key: rec.key, year: rec.year,
      seriesWon: rec.seriesWon, seriesLost: rec.seriesLost, draws: draws, seriesPlayed: rec.seriesPlayed });
  }
  if ((rec.log || []).length !== rec.seriesPlayed) {
    violations.push({ type: 'LOG_LENGTH_MISMATCH', key: rec.key, year: rec.year,
      logLength: (rec.log || []).length, seriesPlayed: rec.seriesPlayed });
  }

  /* Invariante: el récord de grupos guardado no se inventa; se recalcula
     del log real y debe coincidir. */
  const recomputed = DCS.engine.tournaments.groupRecord({ log: rec.log || [] });
  const recomputedWins = recomputed.wins + recomputed.draws * 0.5;
  if (recomputedWins !== rec.groupWins || recomputed.losses !== rec.groupLosses) {
    violations.push({ type: 'INVENTED_GROUP_STATS', key: rec.key, year: rec.year,
      stored: { wins: rec.groupWins, losses: rec.groupLosses },
      recomputed: { wins: recomputedWins, losses: recomputed.losses } });
  }
}

/* BALANCE-01: puesto dentro del campo y clasificados coherentes con el corte auditado. */
function auditCut(rec) {
  if (!(rec.placement >= 1 && rec.placement <= rec.field)) {
    violations.push({ type: 'PLACEMENT_OUT_OF_FIELD', key: rec.key, year: rec.year, placement: rec.placement, field: rec.field });
  }
  if (rec.audit && rec.qualifiedForPlayoffs === true && rec.audit.advanced.indexOf(rec.teamId) < 0) {
    violations.push({ type: 'QUALIFIED_NOT_IN_AUDIT', key: rec.key, year: rec.year });
  }
}

/* BALANCE-01: como mucho un bonus tiQual por temporada (registros + cobro suelto). */
function auditTiQual(s) {
  (s.history || []).forEach(h => {
    const tours = h.tournaments || [];
    const inRecords = tours.filter(t => (t.bonusLines || []).some(l => /clasificar a The International/.test(l.label || ''))).length;
    const loose = ((h.earnings && h.earnings.bonus) || 0) - tours.reduce((a, t) => a + (t.bonus || 0), 0);
    if (inRecords + (loose > 0 ? 1 : 0) > 1) violations.push({ type: 'TIQUAL_BONUS_TWICE', year: h.year });
  });
}

/* BALANCE-01: decideCut con 8 equipos y empates resueltos a mano.
   A,B 4 series; A mejor diferencia de mapas → A, B.
   C,D 3 series y misma diferencia; D ganó a C → D, C.
   E,F 2 series, misma diferencia, sin h2h; seed F 70 > E 60 → F, E.
   G 1 serie, H 0 → G, H. Corte 4: A, B, D, C. */
(function () {
  const r = (id, sw, mw, ml, h2h, seed) => ({ id, isPlayer: id === 'C', seriesW: sw, seriesL: 5 - sw, mapW: mw, mapL: ml, h2h: h2h || {}, seed });
  const table = [
    r('H', 0, 1, 9, null, 50), r('C', 3, 7, 4, null, 80), r('E', 2, 5, 6, null, 60), r('B', 4, 8, 3, null, 55),
    r('G', 1, 3, 8, null, 40), r('D', 3, 7, 4, { C: 1 }, 45), r('F', 2, 5, 6, null, 70), r('A', 4, 9, 2, null, 30)
  ];
  const res = DCS.engine.tournaments.decideCut({ field: 8, cut: 4, playoff: 2 }, table);
  const want = ['A', 'B', 'D', 'C', 'F', 'E', 'G', 'H'];
  if (JSON.stringify(res.order) !== JSON.stringify(want) || JSON.stringify(res.advanced) !== JSON.stringify(want.slice(0, 4)) ||
      res.cut !== 4 || res.rule !== 'seriesW>mapDiff>h2h>seed') {
    violations.push({ type: 'DECIDE_CUT_ORDER', got: res.order, advanced: res.advanced, cut: res.cut });
  }
})();

/* BALANCE-01: TI con 16 equipos y corte 8 → 3 rondas de playoffs. */
(function () {
  const ti = T.ti;
  const rounds = DCS.engine.tournaments.bracketPath(ti).length - (ti.groupSeries ? 1 : 0);
  if (ti.field !== 16 || DCS.engine.tournaments.cutOf(ti) !== 8 || rounds !== 3) {
    violations.push({ type: 'TI_PLAYOFF_ROUNDS', field: ti.field, cut: DCS.engine.tournaments.cutOf(ti), rounds });
  }
})();

const N = 120;
for (let i = 0; i < N; i++) {
  const s = playCareer('TOUR-TEST-' + i);
  collectRecords(s).forEach(auditRecord);
  collectRecords(s).forEach(auditCut);
  auditTiQual(s);
}

console.log(JSON.stringify({
  careersSimulated: N,
  recordsAudited,
  negativeRecordsSeen,
  negativeRecordsBlocked,
  violations: violations.length
}, null, 2));

if (violations.length) {
  console.log(JSON.stringify(violations.slice(0, 20), null, 2));
  throw new Error(violations.length + ' violación(es) de invariantes del motor de torneos');
}
console.log('OK: ' + N + ' carreras simuladas, ' + recordsAudited + ' torneos auditados, ' +
  negativeRecordsSeen + ' con más derrotas que victorias en grupos (todos bloqueados), 0 violaciones.');
