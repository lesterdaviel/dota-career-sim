/* ============================================================
   Carga dist/index.html dentro de Node.
   ------------------------------------------------------------
   Los tests cargaban antes los ficheros de src/, que llevan
   desactualizados desde el 31 ago 2026 y ya no contienen lo que
   se publica (ni faMarket, ni heroStats, ni sanitizeLive, ni el
   catálogo de 53 equipos). Probar src/ daba confianza falsa.
   Aquí se ejecutan los bloques <script> del propio artefacto que
   va a producción, así el test valida lo que juega la gente.

   El monolito incluye la interfaz, que toca el DOM al definirse:
   basta con un stub, no hace falta un navegador. Solo se rellenan
   los globales que el test no haya puesto ya.
   ============================================================ */
'use strict';
const fs = require('fs');
const vm = require('vm');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist', 'index.html');

function stubEl() {
  return {
    style: {},
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    dataset: {}, children: [], innerHTML: '', textContent: '', value: '',
    appendChild() {}, removeChild() {}, insertBefore() {}, remove() {},
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    getContext() { return null; }, getExtension() { return null; },
    focus() {}, blur() {}, click() {}
  };
}

function ensureDom() {
  if (!global.window) global.window = global;
  if (!global.document) global.document = {};
  const d = global.document;
  if (!d.readyState) d.readyState = 'loading';
  if (!d.documentElement) d.documentElement = stubEl();
  if (!d.body) d.body = stubEl();
  if (!d.head) d.head = stubEl();
  if (!d.addEventListener) d.addEventListener = function () {};
  if (!d.removeEventListener) d.removeEventListener = function () {};
  if (!d.createElement) d.createElement = stubEl;
  if (!d.createTextNode) d.createTextNode = stubEl;
  if (!d.getElementById) d.getElementById = function () { return null; };
  if (!d.querySelector) d.querySelector = function () { return null; };
  if (!d.querySelectorAll) d.querySelectorAll = function () { return []; };
  if (!global.navigator) global.navigator = { language: 'es-ES' };
  if (!global.location) global.location = { href: '', search: '', hash: '' };
  if (!global.matchMedia) {
    global.matchMedia = function () {
      return { matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} };
    };
  }
  if (!global.requestAnimationFrame) global.requestAnimationFrame = function (fn) { return setTimeout(fn, 0); };
  if (!global.cancelAnimationFrame) global.cancelAnimationFrame = function (id) { clearTimeout(id); };
  if (!global.localStorage) {
    const mem = {};
    global.localStorage = {
      setItem(k, v) { mem[k] = String(v); },
      getItem(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
      removeItem(k) { delete mem[k]; }
    };
  }
}

/** Ejecuta los bloques <script> inline de dist/index.html y devuelve DCS. */
function load() {
  ensureDom();
  const html = fs.readFileSync(DIST, 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  let m, n = 0;
  while ((m = re.exec(html))) {
    n++;
    vm.runInThisContext(m[1], { filename: 'dist/index.html#script-' + n });
  }
  if (!n) throw new Error('dist/index.html no tiene bloques <script> inline');
  if (!global.DCS || !global.DCS.game) throw new Error('dist/index.html no expuso DCS.game');
  global.DCS.__blocks = n;
  return global.DCS;
}

module.exports = load;
module.exports.DIST = DIST;
