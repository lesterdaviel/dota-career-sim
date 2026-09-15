# Arquitectura canónica

*Fijada el 4 sep 2026, tras auditar el proyecto entero.*

---

## La regla, en una línea

> **Se edita `cursor-merge/latest-cursor2.html`. Se publica `dist/index.html`,
> que es su copia byte a byte. Todo lo demás está congelado.**

```
cursor-merge/latest-cursor2.html   ←  aquí se edita
            │
            │  cp  (copia literal, sin build)
            ▼
      dist/index.html              ←  esto es el juego
            │
            │  subir a GitHub  →  Pages
            ▼
 glester872-commits.github.io/dota-career-sim/
```

No hay build. No hay dependencias. `dist/index.html` son 3,1 MB con el motor,
los datos, la interfaz, los estilos y los logos en base64 dentro. La única
petición externa son las banderas de países (`flagcdn.com`); sin ellas el juego
funciona igual.

Después de cada tanda de cambios:

```bash
cp cursor-merge/latest-cursor2.html dist/index.html
node tools/finance-test.js && node tools/trophy-test.js
```

---

## Por qué NO es `src/`

El README anterior decía que la fuente de verdad era `src/**/*.js` + `styles/main.css`
+ `index.html`. **Dejó de ser cierto el 31 ago 2026** y nadie lo actualizó. La
evidencia, medida el 4 sep 2026:

| Comprobación | Resultado |
|---|---|
| `tools/build-dist.sh` (compila desde `src/`) | produce **1.493.516 bytes** frente a los **3.103.865** que hay en producción |
| Mercado de agentes libres (`faMarket`) | **no existe** en `src/` |
| Estadísticas de héroes (`heroStats`) | **no existe** en `src/` |
| Saneado de torneos a medias (`sanitizeLive`) | **no existe** en `src/` |
| Series majors (`MAJOR_SERIES`) | **no existe** en `src/` |
| Región por nacionalidad (`regionForNationality`) | **no existe** en `src/` |
| Catálogo de equipos | `src/` tiene **34**; producción tiene **53** |
| API de la sala de trofeos | `src/` usa `category` + `fresh` + `migrate`; producción usa `design` + `newSinceLastVisit` + `seenIds` |
| Contrato de `season.advance` | producción bloquea el avance con ofertas sin responder; `src/` no |

> ⛔ **Nunca ejecutar `tools/build-dist.sh` ni `tools/build-dist.ps1`.**
> Escriben en `dist/index.html` y sustituirían el juego publicado por una
> versión de agosto a la que le falta más de la mitad. Se conservan solo como
> referencia de cómo se empaquetaba antes.

Resincronizar `src/` con el monolito significaría volver a partir 3,1 MB en 35
módulos a mano, sin ninguna prueba que cubra la interfaz. Mucho riesgo, cero
ganancia para quien juega. Por eso `src/` queda **congelado, no borrado**.

---

## Mapa de archivos

### CANÓNICO — define el producto

| Ruta | Función | Runtime | Deploy | Riesgo al tocar | Recomendación |
|---|---|---|---|---|---|
| `cursor-merge/latest-cursor2.html` | El juego entero: motor, datos, UI, CSS, i18n. 44 bloques `<script>` colgando del namespace `DCS` | — | indirecto | alto (es el producto) | **Único archivo donde se programa** |
| `dist/index.html` | Copia literal del anterior. Lo que se sube | sí | **sí** | alto | Regenerar solo con `cp`, nunca a mano |
| `assets/teams/*.png` | 36 logos. El build los llevaba a base64; hoy ya están dentro del monolito | no | no | bajo | Fuente para futuros logos |
| `tools/load-dist.js` | Carga el monolito en Node con un stub de DOM, para los tests | no | no | medio | Mantener junto al monolito |
| `tools/finance-test.js` | 50 carreras completas × 5 políticas: contabilidad y persistencia | no | no | bajo | Ejecutar antes de publicar |
| `tools/trophy-test.js` | Sala de trofeos: listado, TI, duplicados, celebración, persistencia | no | no | bajo | Ejecutar antes de publicar |
| `tools/serve.ps1` | Servidor estático local | no | no | bajo | Opcional |
| `.claude/launch.json` | Arranque del preview | no | no | bajo | — |
| `README.md` · `ARCHITECTURE.md` | Documentación | no | no | bajo | Mantener al día |
| `design-demos/direction-approved.md` | Dirección artística aprobada (D1/D2/D3) | no | no | bajo | Referencia viva de diseño |
| `design-demos/design-system.md` · `SPEC.md` | Sistema visual y especificación | no | no | bajo | Referencia |

### DERIVADO — generado desde otro archivo

| Ruta | Origen | Cómo se regenera |
|---|---|---|
| `dist/index.html` | `cursor-merge/latest-cursor2.html` | `cp cursor-merge/latest-cursor2.html dist/index.html` |
| `docs/` | `dist/index.html` | Carpeta de publicación opcional. Está en `.gitignore` |

### LEGACY — congelado, no editar

Todos llevan una cabecera `LEGACY — NO EDITAR` dentro del propio archivo.

| Ruta | Qué era | Por qué se conserva |
|---|---|---|
| `src/**/*.js` (35 archivos) | La versión modular del juego | Referencia legible del motor; es más fácil de leer que el monolito |
| `styles/main.css` | Los estilos de la versión modular | Ídem. Apunta a `../assets/cover-*.svg`, rutas que solo existen ahí |
| `index.html` (raíz) | Entrada de la versión modular | Documenta el orden de carga de los módulos |
| `create-identidad.html` | Prototipo suelto de la pantalla de creación | Histórico |
| `tools/balance.html` · `tools/balance.js` | Test de balance en navegador sobre `src/` | Sus cifras ya no describen el juego publicado |
| `tools/build-dist.sh` · `tools/build-dist.ps1` | El build de `src/` a un solo archivo | **Peligroso**: sobrescribiría producción. Solo referencia |
| `cursor-merge/*.html` (salvo `latest-cursor2`) | Instantáneas del trabajo con Cursor | Único registro de estados intermedios anteriores a git. Ver `cursor-merge/README.md` |
| `cursor-merge/zip-check/` | Zip de i18n descomprimido | Histórico |
| `assets/cover-*.svg` (5) | Fondos de la portada | Ya están en base64 dentro del monolito; solo los usa `styles/main.css` |
| `assets/teams/tundra-esports.png` · `team-tickles.png` | Clubes fusionados en `pipsqueak-4` | Los referencian historiales de partidas antiguas |
| `index.zip` | Zip de un `index.html` de 2,2 KB del 26 ago | Sin valor. Borrable |
| `dist/artifact.html` | Showcase de 282 KB para publicar en foros | Material de marketing, no es el juego |

### DESCONOCIDO

Ninguno. Todos los archivos del proyecto tienen ahora un papel asignado.

---

## Lo que gobierna producción

**Únicamente `dist/index.html`**, subido al repositorio
[glester872-commits/dota-career-sim](https://github.com/glester872-commits/dota-career-sim)
y servido por GitHub Pages.

⚠️ **A 4 sep 2026 lo publicado está desactualizado.** La URL en vivo sirve
3.030.859 bytes; el `dist/index.html` local tiene 3.103.865. Al publicado le
faltan el rediseño V2 (bandas de identidad, marcador de torneos, registros
ceremoniales) y la pasada de exposición. Ese build intermedio **no existe en
ninguna copia local**: se subió y no se guardó. Para alinearlo basta con subir
el `dist/index.html` actual.

---

## Reglas de trabajo

1. **Se programa en `cursor-merge/latest-cursor2.html`.** Nada más.
2. **`dist/index.html` se regenera con `cp`**, nunca se edita a mano y nunca con
   `build-dist`.
3. **Antes de publicar**: `node tools/finance-test.js && node tools/trophy-test.js`.
   Los dos cargan el artefacto real, no `src/`.
4. **Nada de `src/`, `styles/`, `index.html` raíz ni `tools/balance.*`.** Están
   congelados. Si algo de ahí parece útil, se copia al monolito.
5. **Un commit por tanda.** El histórico ya no vive en copias `*-latest-*.html`.
