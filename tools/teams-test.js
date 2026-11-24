'use strict';
/* TEAMS-01: catálogo DLTV del 23/11/2026 (solo 35 equipos, sin ficticios),
   logos en disco, mundo nuevo, conteo por región, migración idempotente y
   torneos con NA/SA. `node tools/teams-test.js` */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const mem = {};
global.localStorage = { setItem: (k, v) => (mem[k] = String(v)), getItem: k => (k in mem ? mem[k] : null), removeItem: k => delete mem[k] };
require('./load-dist.js')();
DCS.store.setSilent(true);
const D = DCS.data, E = DCS.engine;
const ROOT = path.join(__dirname, '..');

const EXPECTED = [
  ['team-yandex', 'Team Yandex'], ['parivision', 'PARIVISION'], ['team-spirit', 'Team Spirit'],
  ['natus-vincere', 'Natus Vincere'], ['do-konca', 'DO KONCA'], ['team-liquid', 'Team Liquid'],
  ['aurora-gaming', 'Aurora'], ['gamerlegion', 'GamerLegion'], ['1win', '1win Team'],
  ['team-nemesis', 'Team Nemesis'], ['lgd-gaming', 'LGD Gaming'], ['cyberhero', 'CyberHero'],
  ['xtreme-gaming', 'Xtreme Gaming'], ['og', 'OG'], ['team-resilience', 'Team Resilience'],
  ['yakult-brothers', 'Yakult Brothers'], ['froglings', 'Froglings'], ['legion', 'LEGION'],
  ['inner-circle-insanity', 'Inner Circle'], ['yellow-submarine', 'Yellow Submarine'], ['playtime', 'PlayTime'],
  ['huligani', 'HULIGANI'], ['astra-invicta', 'Astra Invicta'], ['power-rangers', 'Power Rangers'],
  ['team-lynx', 'Team Lynx'], ['xipto-esports', 'Xipto Esports'], ['execration', 'Execration'],
  ['nemiga-gaming', 'Nemiga Gaming'], ['royal-bear', 'Royal Bear'], ['amaru-gaming', 'Amaru Gaming'],
  ['zero-tenacity', 'Zero Tenacity'], ['puckchamp', 'PuckChamp'], ['interactive-philippines', 'InterActive Philippines'],
  ['pibbles-corp', 'Pibbles Corp'], ['team-synapse', 'Team Synapse']
];
const IDS = EXPECTED.map(x => x[0]);

function drive(a, maxSteps, untilYear) {
  DCS.game.state = a;
  let steps = 0;
  for (; steps < maxSteps && !a.finished && (untilYear == null || a.year < untilYear); steps++) {
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
  return steps;
}

function checkWorld(s, label) {
  assert.strictEqual(s.world.teams.length, 35, label + ': equipos en el mundo ' + s.world.teams.length);
  s.world.teams.forEach(t => assert.ok(IDS.includes(t.id), label + ': equipo fuera del catálogo ' + t.id + ' ' + t.name));
  assert.strictEqual(new Set(s.world.teams.map(t => t.id)).size, 35, label + ': ids repetidos');
}

try {
  // 1. Catálogo: 35, en orden, ids y nombres únicos
  assert.strictEqual(D.TEAMS.length, 35);
  D.TEAMS.forEach((t, i) => {
    assert.strictEqual(t.id, EXPECTED[i][0], 'orden/id en ' + (i + 1));
    assert.strictEqual(t.name, EXPECTED[i][1], 'nombre en ' + (i + 1));
    assert.strictEqual(t.rank, i + 1, 'rank de ' + t.id);
    assert.strictEqual(t.tier, i < 16 ? 1 : (i < 26 ? 2 : 3), 'tier de ' + t.id);
    assert.ok(['confirmed', 'provisional', 'unconfirmed'].includes(t.regionStatus));
    assert.ok(t.logo.indexOf('logos/DLTV_Top35_2026-11-23/logos/') === 0, 'logo de ' + t.id);
    assert.ok(t.logo.indexOf('assets/teams') === -1, 'logo antiguo en ' + t.id);
    assert.ok(!(DCS.assetsInline && DCS.assetsInline[t.id]), 'logo base64 duplicado de ' + t.id);
  });
  assert.strictEqual(D.TEAMS[0].rating, 1519);
  assert.strictEqual(D.TEAMS[34].rating, 1000);
  assert.strictEqual(new Set(D.TEAMS.map(t => t.id)).size, 35);
  assert.strictEqual(new Set(D.TEAMS.map(t => t.name)).size, 35);
  assert.strictEqual(D.TEAM_BY_ID['oh-yes'], undefined, 'alias oh-yes sigue activo');
  assert.strictEqual(D.TEAM_SNAPSHOT.asOf, '2026-11-23');

  // 2. Logos en disco (solo la carpeta del usuario en la raíz, sin copias)
  D.TEAMS.forEach(t => {
    assert.ok(fs.existsSync(path.join(ROOT, t.logo)), 'falta logo ' + t.logo);
  });

  // 3. Conteo por región de simulación
  const count = {};
  D.TEAMS.forEach(t => { count[t.region] = (count[t.region] || 0) + 1; });
  assert.deepStrictEqual(count, { eeu: 11, weu: 13, cn: 3, sea: 5, na: 1, sa: 2 });

  // 4. Partida nueva y 3 temporadas
  const s = DCS.store.newState({ seed: 'TEAMS-TEST', name: 'T', nick: 't', nationality: 'Rusia', region: 'eeu', role: 'mid', archetype: 'mechanical' });
  checkWorld(s, 'nueva');
  s.world.teams.forEach(t => assert.ok(!t.logo || t.logo.indexOf('assets/teams') === -1, 'logo antiguo en mundo nuevo ' + t.id));
  const y0 = s.year;
  drive(s, 3000, y0 + 3);
  assert.ok(s.year >= y0 + 3 || s.finished, 'no avanzó 3 temporadas');
  checkWorld(s, '3 temporadas');

  // 5. Migración: jugador en retirado, ofertas de retirados, renombrado
  const fresh = DCS.store.newState({ seed: 'TEAMS-MIG', name: 'M', nick: 'm', nationality: 'Rusia', region: 'eeu', role: 'mid', archetype: 'mechanical' });
  const old = JSON.parse(JSON.stringify(fresh));
  const donor = JSON.parse(JSON.stringify(old.world.teams[0]));
  donor.id = 'boomboys'; donor.name = 'BoomBoys'; donor.hasPlayer = true; donor.logo = 'assets/teams/boomboys.png';
  old.world.teams.push(donor);
  old.player.teamId = 'boomboys';
  old.player.status = 'signed';
  old.player.contract = { teamId: 'boomboys', salary: 1000, years: 2 };
  old.world.teams.find(t => t.id === '1win').name = '1Win';
  old.world.teams.find(t => t.id === 'og').logo = 'assets/teams/og.png';
  old.offers = [{ teamId: 'boomboys', teamName: 'BoomBoys', salary: 5 }, { teamId: 'team-vision', teamName: 'TEAM VISION', salary: 6 }, { teamId: 'og', teamName: 'OG', salary: 7 }];
  const progressBefore = JSON.stringify([old.player.nick, old.player.money, old.player.age, old.player.level, old.history, old.trophies]);

  localStorage.setItem(DCS.store.KEY, JSON.stringify(old));
  const a = DCS.store.load();
  assert.ok(a, 'load devolvió null');
  assert.strictEqual(a.player.teamId, null, 'jugador sigue en un retirado');
  assert.strictEqual(a.player.contract, null, 'contrato de retirado');
  assert.strictEqual(JSON.stringify([a.player.nick, a.player.money, a.player.age, a.player.level, a.history, a.trophies]), progressBefore, 'progreso alterado');
  assert.deepStrictEqual(a.offers.map(o => o.teamId), ['og'], 'quedan ofertas de retirados');
  assert.strictEqual(a.world.teams.find(t => t.id === '1win').name, '1win Team');
  assert.strictEqual(a.world.teams.find(t => t.id === 'og').logo, 'logos/DLTV_Top35_2026-11-23/logos/14-og.png', 'logo antiguo sin migrar');
  checkWorld(a, 'migrada');
  const aJson = JSON.stringify(a);
  const twice = JSON.parse(aJson);
  DCS.store.migrate(twice);
  assert.strictEqual(JSON.stringify(twice), aJson, 'la segunda migración cambia el estado');

  // 6. Torneos con NA y SA: sin bucles (tope de pasos) y sin excepciones
  [['na', 'Estados Unidos'], ['sa', 'Perú']].forEach(([reg, nat]) => {
    const r = DCS.store.newState({ seed: 'TEAMS-' + reg, name: 'R', nick: 'r' + reg, nationality: nat, region: reg, role: 'carry', archetype: 'mechanical' });
    const ry = r.year;
    const steps = drive(r, 1500, ry + 1);
    assert.ok(steps < 1500, 'posible bucle en ' + reg + ' (' + steps + ' pasos)');
    checkWorld(r, reg);
  });

  // 7. Mercado abierto: CN y NA (solo equipos T1 en su región). Cada carrera
  //    ve al menos 1 oferta y tiene equipo en al menos 1 de sus 4 primeras
  //    temporadas; en 6 carreras por región el % de temporadas sin equipo
  //    no supera el del catálogo anterior (na 79 %, cn 40 %).
  const IDLE_MAX = { na: 79, cn: 40 };
  [['cn', 'China'], ['na', 'Estados Unidos']].forEach(([reg, nat]) => {
   let idle = 0, seasons = 0;
   for (let k = 0; k < 6; k++) {
    const r = DCS.store.newState({ seed: 'TEAMS-OPEN-' + reg + '-' + k, name: 'O', nick: 'o' + reg + k, nationality: nat, region: reg, role: 'mid', archetype: 'mechanical' });
    const ry = r.year;
    let offersSeen = (r.offers || []).length > 0;
    const withTeam = new Set();
    DCS.game.state = r;
    for (let g = 0; g < 3000 && !r.finished && r.year < ry + 4; g++) {
      if ((r.offers || []).length) offersSeen = true;
      if (r.player.teamId) withTeam.add(r.year);
      if (r.pending) {
        const t = r.pending.type;
        if (t === 'event') E.season.resolvePendingEvent(r, 0);
        else if (t === 'wealth') E.finance.resolveSpecial(r, false);
        else if (t === 'tournament') { E.season.playLive(r, true); r.pending = null; if (r.season.liveTour && r.season.liveTour.done) E.season.continueCompetition(r); }
        else { r.pending = null; r.career.lastRetirementPrompt = r.year; }
        continue;
      }
      const o = E.season.advance(r);
      if ((r.offers || []).length) offersSeen = true;
      if (o && o.blocked && o.reason === 'offers' && r.offers.length) { E.market.acceptOffer(r, r.offers.slice().sort((x, y) => y.salary - x.salary)[0]); r.offers = []; }
    }
    assert.ok(offersSeen, reg + ' #' + k + ': ninguna oferta');
    let had = 0;
    for (let y = ry; y < ry + 4; y++) { seasons++; if (withTeam.has(y)) had++; else idle++; }
    assert.ok(had >= 1, reg + ' #' + k + ': sin equipo en las 4 primeras temporadas');
    checkWorld(r, 'mercado ' + reg);
   }
    const pctIdle = 100 * idle / seasons;
    assert.ok(pctIdle <= IDLE_MAX[reg], reg + ': ' + pctIdle.toFixed(1) + ' % de temporadas sin equipo (máx ' + IDLE_MAX[reg] + ')');
  });
} catch (e) {
  console.error('FALLO: ' + (e && e.stack || e));
  process.exit(1);
}
console.log('OK: teams — 35 equipos DLTV en orden, logos en disco, mundo sin ficticios tras 3 temporadas, regiones 11/13/3/5/1/2, migración idempotente, NA/SA sin bucles y mercado abierto en CN/NA.');
