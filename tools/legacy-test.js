/* Sala de trofeos 2D + legado (LEGACY-01): sin 3D, todo sale de state.history. */
const mem = {};
global.localStorage = { setItem: (k, v) => { mem[k] = v; }, getItem: k => mem[k] || null, removeItem: k => { delete mem[k]; } };

require('./load-dist.js')();
DCS.store.setSilent(true);

function assert(cond, msg) { if (!cond) throw new Error(msg); }
const S = DCS.ui.screens;
const T = DCS.engine.trophies;

function tour(o) {
  return Object.assign({ placement: 1, kind: 'tournament', prestige: 6, result: '2-1' }, o);
}
function season(o) {
  return Object.assign({ role: 'mid', tier: 2, seriesWon: 10, seriesLost: 5, rating: 70,
    earnings: { salary: 1000, prize: 500, other: 0 }, bestResult: 'Campeón', tournaments: [] }, o);
}
function base(history) {
  return { history: history, season: { tournaments: [] }, player: { role: 'mid' }, career: { trophyRoomSeen: [] } };
}
function count(html, re) { return (html.match(re) || []).length; }
function section(html, cls) {
  const i = html.indexOf(cls);
  return i < 0 ? '' : html.slice(i, html.indexOf('</table>', i));
}
const UNLOCKED = /class="trophy-2d-card(?: is-new)?"/g;

/* sin 3D */
assert(typeof DCS.ui.trophyScene === 'undefined', 'DCS.ui.trophyScene debe haber desaparecido');
assert(typeof window.THREE === 'undefined', 'window.THREE no debe existir');
assert(typeof S.trophyRoom === 'function', 'S.trophyRoom existe');

/* 0 temporadas: estado vacío único */
{
  const html = S.trophyRoom(base([]));
  assert(html.indexOf('<canvas') === -1, 'sin canvas');
  assert(!/three/i.test(html), 'sin three');
  assert(html.indexOf('trophy-2d-gallery') === -1, 'sin galería en vacío');
  assert(html.indexOf('trophy-seasons') === -1, 'sin secciones vacías');
}

/* 1 título */
{
  const s = base([season({ year: 2026, teamId: 'og', teamName: 'OG',
    tournaments: [tour({ id: 'one-1', name: 'DreamLeague S1', series: 'dreamleague', year: 2026 })] })]);
  const html = S.trophyRoom(s);
  assert(count(html, UNLOCKED) === 1, '1 tarjeta desbloqueada');
  const tl = html.slice(html.indexOf('trophy-timeline'), html.indexOf('</ol>'));
  assert(tl.indexOf('2026') !== -1 && tl.indexOf('DreamLeague S1') !== -1, 'cronología con año y nombre');
  assert(count(section(html, 'trophy-seasons'), /<tr /g) === 1, '1 fila de temporada');
}

/* muchos: 3 temporadas, 4 títulos y un clasificatorio ganado */
{
  const s = base([
    season({ year: 2026, teamId: 'og', teamName: 'OG', seriesWon: 8, tournaments: [
      tour({ id: 'm1', name: 'Liga Uno', year: 2026 }),
      tour({ id: 'q1', name: 'Clasificatorio Secreto', kind: 'qualifier', year: 2026 })] }),
    season({ year: 2027, teamId: 'og', teamName: 'OG', seriesWon: 14, rating: 81, tournaments: [
      tour({ id: 'm2', name: 'Liga Dos', year: 2027 }),
      tour({ id: 'm3', name: 'Liga Tres', year: 2027 })] }),
    season({ year: 2028, teamId: 'tundra', teamName: 'Tundra', tier: 1, seriesWon: 12, tournaments: [
      tour({ id: 'm4', name: 'The International 2028', series: 'ti', kind: 'ti', prestige: 10, year: 2028 })] })
  ]);
  assert(T.list(s).length === 4, '4 títulos en list()');
  const html = S.trophyRoom(s);
  assert(count(html, UNLOCKED) === 4, '4 tarjetas desbloqueadas');
  assert(html.indexOf('Clasificatorio Secreto') === -1, 'el clasificatorio no es un trofeo');
  assert(count(section(html, 'trophy-seasons'), /<tr /g) === 3, '3 filas de temporada');
  const teams = section(html, 'trophy-teams');
  assert(count(teams, /<tr /g) === 2, 'equipos agrupados (OG y Tundra)');
  assert(teams.indexOf('2026–2027') !== -1, 'OG 2026–2027');
  assert(/(Títulos totales|Total titles)<\/span><span>4<\/span>/.test(html), 'récord de títulos totales = 4');
  assert(/(Temporada con más títulos|Season with most titles)<\/span><span>2027 · 2<\/span>/.test(html), 'mejor temporada 2027');
  assert(/(The International ganados|The International wins)<\/span><span>1<\/span>/.test(html), '1 TI');

  /* insignia «Nuevo»: markSeen la apaga para la siguiente visita */
  assert(T.newSinceLastVisit(s).length === 4, '4 nuevos antes de visitar');
  assert(html.indexOf('is-new') !== -1, 'insignia visible en esta visita');
  T.markSeen(s, T.newSinceLastVisit(s).map(x => x.id));
  assert(T.newSinceLastVisit(s).length === 0, 'tras markSeen no quedan nuevos');
  assert(S.trophyRoom(s).indexOf('is-new') === -1, 'la siguiente visita no muestra «Nuevo»');
}

/* temporada sin equipo y bonus en ganancias */
{
  const s = base([
    season({ year: 2026, teamId: null, teamName: 'Sin equipo', tier: null,
      earnings: { salary: 0, prize: 0, other: 0, bonus: 400 } }),
    season({ year: 2027, teamId: 'og', teamName: 'OG', earnings: { salary: 1000, prize: 500, other: 100, bonus: 0 } })
  ]);
  const html = S.trophyRoom(s);
  const teams = section(html, 'trophy-teams');
  assert(count(teams, /<tr /g) === 1 && teams.indexOf('Sin equipo') === -1, 'sin equipo no está en Equipos');
  assert(count(section(html, 'trophy-seasons'), /<tr /g) === 2, 'sin equipo sigue en Temporadas');
  assert(html.indexOf(DCS.ui.fmt.money(2000)) !== -1, 'ganancias incluyen bonus (2000)');
  const solo = S.trophyRoom(base([season({ year: 2026, teamId: null, teamName: 'Sin equipo' })]));
  assert(solo.indexOf('trophy-teams') === -1, 'sin ningún equipo no se pinta Equipos');
}

console.log('OK: legado — sin 3D, vacío, 1 título, 4 títulos sin clasificatorio, temporadas, equipos, récords y «Nuevo»');
