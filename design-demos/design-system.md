# Sistema de diseño · Dota 2 Career Sim

**Base:** dirección aprobada en `direction-approved.md` (D1 sistema · D3 ceremonial · D2 pliego).
**Estado:** definición. Todavía no aplicado al juego.
**Principio rector:** este documento **extiende** el sistema existente, no lo sustituye. Los tokens
y componentes que ya funcionan conservan su nombre para no tocar 325 clases CSS sin necesidad.

---

## 0. Reglas de higiene (leer antes de escribir una línea de CSS)

1. **No se crean componentes nuevos si existe uno reutilizable.** La librería es `DCS.ui.c`
   (31 helpers). Antes de escribir HTML a mano, comprobar si hay helper.
2. **Ningún color, tamaño, espacio, radio o duración se escribe a pelo.** Solo tokens.
   Hoy hay 87 hex sueltos, 283 `rgba()`, 104 `border-radius` (25 con token) y 44 `box-shadow`
   (6 con token). Todo eso migra a tokens.
3. **Una familia de clases por concepto.** Prohibido `X-card` nuevo: es `.card` + modificador.
4. **El registro ceremonial (D3) y el pliego (D2) no son temas nuevos**: son *overrides* acotados
   sobre los mismos tokens. Ver §6.
5. Si una regla nueva contradice este documento, se cambia el documento primero.

---

## 1. TIPOGRAFÍA

Tres familias, papeles fijos. No se añade una cuarta.

| Token | Valor | Uso |
|---|---|---|
| `--font-display` | `"Saira Condensed", "Arial Narrow", sans-serif` | Títulos y cifras dominantes |
| `--sans` *(ya existe)* | `"Segoe UI", Inter, system-ui, …` | Cuerpo e interfaz |
| `--mono` *(ya existe)* | `ui-monospace, "Cascadia Mono", Consolas, …` | Toda cifra comparable |

### Escala — 7 papeles, 7 tokens, ni uno más

| Papel pedido | Token | Tamaño | Peso | Familia | Reglas |
|---|---|---|---|---|---|
| **Números importantes** | `--fz-display` | 64px | 700 | display | Máximo **uno por pantalla**. `line-height:.9`, `letter-spacing:-.02em` |
| **Títulos principales** | `--fz-h1` | 34px | 700 | display | Uno por pantalla. Mayúsculas permitidas |
| **Títulos secundarios** | `--fz-h2` | 22px | 600 | display | Cabecera de sección o de panel |
| **Estadísticas** | `--fz-stat` | 20px | 500 | mono | Cifra dentro de tabla, tile o KPI |
| **Cuerpo** | `--fz-body` | 16px | 400 | sans | `line-height:1.5`, medida ≤ 70ch |
| **Textos secundarios** | `--fz-sm` | 14px | 400 | sans | Color `--text-2`. Celdas, subtítulos, notas |
| **Etiquetas** | `--fz-label` | 12px | 600 | sans | **Suelo absoluto.** Tracking `.06em`. Único sitio donde se permiten versalitas |

Escalones auxiliares (no son papeles nuevos, son variantes del mismo):
`--fz-figure: 34px` (segunda cifra en importancia) · `--fz-h3: 17px` (título dentro de panel).

**Interlineado:** `--lh-tight:1.1` (display/h1) · `--lh-snug:1.3` (h2/h3) · `--lh-body:1.5` ·
`--lh-relaxed:1.65` (párrafos largos).

### Prohibiciones tipográficas

- **Nada por debajo de 12px.** Hoy hay 36 reglas en mayúsculas a ≤11px (mínimo 9,5px con `.35em`).
- **Mayúsculas + tracking solo en `--fz-label`.** Ni en títulos de sección, ni en subtítulos,
  ni en botones del registro diario.
- **Nunca la display para cifras comparables**: rating, MMR, dinero y marcadores van en `--mono`
  con `font-variant-numeric: tabular-nums` (ya global, se conserva).
- Salto de jerarquía mínimo: título principal ≥ 2× cuerpo.

---

## 2. ESPACIADO

Rejilla de **4px**. Hoy hay 39 valores distintos y 316 usos fuera de rejilla.

| Token | px | Uso típico |
|---|---|---|
| `--sp-1` | 4 | Separación intra-elemento (icono↔texto) |
| `--sp-2` | 8 | Gap corto, padding de chip |
| `--sp-3` | 12 | Padding de celda, gap de lista |
| `--sp-4` | 16 | Padding de panel compacto, gap de rejilla |
| `--sp-5` | 24 | Padding de panel, separación entre bloques |
| `--sp-6` | 32 | Separación entre secciones |
| `--sp-7` | 48 | Aire de cabecera de pantalla |
| `--sp-8` | 64 | Respiración del registro ceremonial |
| `--sp-9` | 96 | Solo ceremonial |

### Aplicación

- **Paddings:** `--pad-panel: var(--sp-5)` · `--pad-panel-sm: var(--sp-4)` ·
  `--pad-cell: var(--sp-3)` · `--pad-control: 0 var(--sp-5)`.
- **Gaps:** `--gap-tight: var(--sp-2)` · `--gap: var(--sp-3)` · `--gap-block: var(--sp-5)` ·
  `--gap-section: var(--sp-6)`.
- **Márgenes:** solo verticales y solo entre bloques (`--gap-block` / `--gap-section`).
  Prohibido el margen lateral suelto: la posición la da la rejilla del contenedor.
- **Alturas de elemento:**
  `--h-control: 40px` (botón, input, select) · `--h-control-sm: 32px` (chip, botón pequeño) ·
  `--h-row: 44px` (fila pulsable — suelo táctil) · `--h-topbar: 56px` · `--h-nav-mobile: 60px`.

### Radios y filetes

| Token | Valor | Nota |
|---|---|---|
| `--radius-s` | **2px** | Controles, chips, badges *(hoy 7px)* |
| `--radius` | **4px** | Paneles y tarjetas *(hoy 12px)* |
| `--bw` | 1px | Filete estándar |
| `--bw-state` | 3px | Filete izquierdo que **codifica estado**, nunca decora |

Rectángulos por sistema: bajar el radio es el cambio más barato y el que más aleja del look
«dashboard SaaS». **Sombras: eliminadas** en el registro diario; la profundidad la da el filete
y el escalón de fondo (`--bg` → `--panel` → `--panel-2` → `--panel-3`).

---

## 3. COLOR — roles, no valores

Se conservan los tokens actuales y se añaden **alias semánticos** para que ningún componente
vuelva a referenciar un color por su nombre físico.

| Alias nuevo | Apunta a | Significado |
|---|---|---|
| `--accent` | `--ember` | Acción primaria. Uno por pantalla |
| `--win` | `--teal` | Victoria / positivo |
| `--loss` | `--red` | Derrota / negativo |
| `--warn` | **nuevo `#F0A92E`** | Aviso. **Hoy no existe** |
| `--info` | `--blue` | Informativo / neutro |
| `--prize` | `--gold` | Títulos, dinero ganado, premios |
| `--focus-ring` | `--ember` | Anillo de foco |
| `--faction-warm` | **activar `--radiant`** | Eje cálido |
| `--faction-cold` | **activar `--dire`** | Eje frío |

`--radiant` y `--dire` están declarados y usados **0 veces**: se activan como eje de temperatura
(enfrentamientos, comparativas, lados de un partido). Tiers y posiciones se mantienen intactos.

---

## 4. COMPONENTES

Para cada uno: **qué hay hoy → regla del sistema**.

### Cards → `c.card()` · `.card`
Hoy: `.card` con `card-accent`, `card-head`, `card-sub`, `card-body`, `card-foot`, `delay`.
Regla: se conserva la API. Cambia el envoltorio: `--radius`, sin sombra, filete 1px.
Modificadores: `.card--flat` (sin filete, para anidar), `.card--state` (filete izquierdo 3px).
**Prohibido**: crear `.ach-card`, `.wealth-card`, `.invest-card`. Son `.card` + modificador.

### Botones → `c.btn(label, action, {variant,size,block,disabled,key})`
Hoy: variantes `primary`, `ghost`, `danger`, tamaño `lg`, soporte `disabled` y `kbd`.
Regla: se conserva la API tal cual. Tres variantes canónicas:
`primary` (lleno, `--accent`, **uno por pantalla**) · `ghost` (filete) · `quiet` (enlace subrayado,
para acciones postergables). `danger` se mantiene solo para destructivo real.
Altura `--h-control`; `--radius-s`; sin mayúsculas en registro diario.

### Tabs → `c.tabs(items, active, action)` · `.tabs .tab.active`
Hoy: funciona y ya se usa en 4 pantallas.
Regla: se conserva. El activo se marca con `box-shadow: inset 0 -2px 0 var(--accent)`, no con
relleno. Scroll horizontal en móvil con degradado de borde (ver §7).

### Badges → `c.badge(text, tone)` · `c.tierBadge` · `c.levelBadge` · `c.posChip` · `c.ratingChip`
Hoy: cinco helpers de chip conviviendo, con tres convenciones de clase distintas.
Regla: se conservan los cinco (cada uno codifica un dato distinto) pero **unifican tono**:
`badge-<tono>` con el vocabulario de §5. Altura `--h-control-sm`, `--fz-label`, `--radius-s`.

### Inputs → **sin sistema hoy** (estilos sueltos en `.id-field`, `#f-nat-search`)
Regla: crear `.field` (contenedor), `.field-label` (`--fz-label`), `.field-input`.
Altura `--h-control`, fondo `--panel-2`, filete 1px, foco con anillo. Un solo estilo para
`input`, `select` y `textarea`.

### Modales → `.modal` + `.modal-bg`
Hoy: existe, con `modal-kicker/head/body` y elección por teclado 1·2·3.
Regla: se conserva. `transform-origin: center` (es modal, no popover), entrada
`scale(.97)→1` + opacidad en `--dur`. Fondo con `backdrop-filter: blur(10px)`.

### Tooltips → **no existen**
Regla: `.tip` sobre `data-tip`. Aparece a 400ms; **si ya hay uno abierto, el siguiente es
instantáneo y sin animación**. `transform-origin` en el disparador. Máx. 32ch.
Nunca contiene información que no esté disponible de otra forma.

### Tablas → `c.table(headers, rows, opts)` · `.tbl` · `.table-wrap`
Hoy: **ya emite `data-label` por celda y ya colapsa a tarjetas en ≤768px.** Es el mejor
componente del proyecto.
Regla: se conserva entero. Se le añade: cabecera pegajosa en tablas largas, `.tbl td.num`
(mono + derecha) como clase canónica, y fila de estado con `--bw-state`.

### Barras de progreso → `c.bar(value,max,tone)` · `c.statBar()` · `c.attrRow()`
Hoy: tres barras distintas para tres cosas distintas (progreso simple, baremo del rol, atributo).
Regla: se conservan las tres, se unifican pista y relleno con tokens (`--panel-3` / `--accent`),
altura 6px, `--radius-s`.
**El «techo» del motivo no se dibuja como relleno**: es una marca vertical sobre la pista
(`statbar-mark` ya hace exactamente eso — se reutiliza).

### Rankings → hoy resuelto con `c.table` + `.mtow`/`.mc-*` (66 clases)
Regla: un solo componente `c.standings()` construido **sobre `c.table`**, con columnas fijas:
puesto · escudo+club · tier · métrica · delta. Nada de una segunda maquinaria de tabla.

### Estadísticas → `c.statGrid()`, `c.statBars()`, `c.tile()`, `c.kpi()`
Hoy: `tile` y `kpi` son casi lo mismo con dos convenciones de tono distintas.
Regla: **`kpi` = cifra de cabecera** (grande, `--fz-figure`), **`tile` = dato de rejilla**
(`--fz-stat`). Misma convención de tono en ambos. En móvil, rejilla mínima de **2 columnas**
(hoy `kpis` colapsa a 1 y produce 5 pantallas de scroll).

### Paneles de partido → `.match*` (9 clases) + `c.resultRow` + `c.seriesList`
Hoy: existen y funcionan; las fichas W/L por mapa son un acierto propio.
Regla: se conservan. Estructura canónica: cabecera (torneo · ronda · formato) → cuerpo
(local ▸ marcador ◂ visitante, con el eje cálido/frío por lado) → tira de mapas → detalle
desplegable. El marcador en `--fz-figure` mono.

### Paneles de torneo → `.tour*` (11 clases) + `c.prizeBreakdown` + `c.levelBadge`
Regla: se conservan. Estructura: banda de cabecera (nombre · edición · bote en `--prize`) →
camino por etapas con estado (`hecho` / `en curso` / `pendiente`) → resultados.
El bote siempre en mono; el nivel siempre con `c.levelBadge`.

---

## 5. ESTADOS

Vocabulario único. Un solo sufijo de tono para todos los componentes: `-<tono>`.

| Estado | Regla | Hoy |
|---|---|---|
| **hover** | Solo dentro de `@media (hover:hover) and (pointer:fine)`. Cambio de filete y +4 % de brillo. Sin desplazamiento salvo en tarjetas pulsables (`translateY(-1px)`) | 36 reglas, **0 gates** |
| **active** | `transform: scale(.985)` en `--dur-fast`. **Obligatorio en todo elemento pulsable** | **1 sola regla** en todo el proyecto |
| **selected** | Filete `--prize` + `box-shadow: inset 0 -2px 0` o `--bw-state` izquierdo. Nunca solo color de texto | `.sel` / `.active` / `.is-open`: 3 convenciones |
| **disabled** | `opacity:.45`, `cursor:default`, sin hover ni active, `aria-disabled` | Parcial (3 reglas) |
| **success** | `--win`. Texto o filete; nunca fondo saturado | `.good` |
| **warning** | `--warn`. **A crear** | **No existe** |
| **defeat** | `--loss`. Marcadores, rachas, resultados negativos | `.bad` |
| **victory** | `--win` para el resultado; `--prize` **solo si es título** | Mezclado hoy |
| *focus* | `--focus-ring` a 2px con offset de 2px. Nunca `outline:none` sin sustituto | 5 reglas `:focus-visible` |

Regla de oro: **victoria ≠ título**. Verde es ganar; oro es haber ganado algo que se guarda.

---

## 6. Registros ceremonial (D3) y pliego (D2)

No son temas. Son overrides acotados que **solo cambian estos tokens**:

**Ceremonial (D3)** — únicamente en los cinco contextos de `direction-approved.md` §2:
```
--bg: #07080A · --text: #F2EDE4 (hueso, no blanco puro)
--font-display: Anton · --fz-display: 132px · --sp escala ×1,5
+ un único foco radial descentrado por pantalla
```
Todo lo demás (tokens de color semántico, componentes, estados) es idéntico.

**Pliego (D2)** — únicamente contratos importantes:
```
--panel: #E8E1D0 · --text: #171310 · --line: #C8BFA8 · --radius: 0
```
Es una **inversión de superficie**, no una familia tipográfica nueva.

---

## 7. RESPONSIVE

De 9 breakpoints a **3**. Hoy la banda 640–768px encadena tres saltos de layout.

| Token | Ancho | Comportamiento |
|---|---|---|
| **desktop** | ≥ 1025px | Riel de navegación lateral fijo. Rejillas de 3–4 columnas. Tablas completas |
| **tablet** | 769–1024px | Navegación lateral colapsada a iconos+texto corto. Rejillas de 2 columnas. Tablas completas con scroll horizontal en `.table-wrap` |
| **móvil** | ≤ 768px | Navegación inferior con **degradado de borde y contador de secciones ocultas**. Tablas → tarjetas (`data-label`, **ya implementado**). Rejillas **mínimo 2 columnas** |

Reglas móviles no negociables (salen de la auditoría):
- La cabecera **no puede solapar**: hoy `.pos-chip` (x145–212) y `.lang-switch` (x171–304) chocan 41px.
- El cromo fijo **no supera el 25 %** del alto. Hoy es 31 % (barra 53 + nav 61 + acción 142 = 256px de 812).
- Ninguna pantalla de consulta diaria pasa de **2 alturas de viewport**. Hoy el Dashboard son 4.053px (5 pantallas).
- Objetivo táctil ≥ 44px (ya se cumple en la nav).

Los anchos antiguos (560 / 640 / 720 / 880 / 1100 / 1240) se reasignan a estos tres.

---

## 8. MOTION

| Token | Valor |
|---|---|
| `--dur-fast` | 140ms — pulsación, cambio de estado |
| `--dur` | 180ms — desplegables, tabs, tooltips |
| `--dur-slow` | 240ms — modales, paneles |
| `--ease-out` | `cubic-bezier(.23,1,.32,1)` — entradas y respuestas |
| `--ease-in-out` | `cubic-bezier(.77,0,.175,1)` — movimiento en pantalla |

Reglas: nunca `ease-in`. Nunca `transition: all` (hoy hay 3). Solo se animan `transform` y
`opacity`. **Sin animaciones de entrada en pantallas de uso diario** — hoy `.reveal` se aplica en
masa y es el patrón que más «generado» hace ver una interfaz. El momento orquestado se reserva
al registro ceremonial. `prefers-reduced-motion` cubre el 100 % (hoy: 3 bloques para 48
animaciones).

---

## 9. Checklist antes de dar por buena una pantalla

- [ ] Cero valores a pelo: color, tamaño, espacio, radio y duración vienen de tokens
- [ ] Una sola acción primaria y una sola cifra dominante
- [ ] Ninguna etiqueta por debajo de 12px; mayúsculas solo en `--fz-label`
- [ ] Todo pulsable tiene `:active`, `:focus-visible` y su hover con gate
- [ ] La tabla usa `c.table` (y por tanto ya funciona en móvil)
- [ ] En ≤768px: sin solapes, rejillas ≥2 columnas, ≤2 alturas de viewport
- [ ] Ningún componente nuevo que duplique uno existente

---

## Addendum · Piloto del Dashboard (validado el 3/9/2026)

Dos piezas que el piloto obligó a añadir al sistema. Ambas viven en el
componente, no en la pantalla, y ya están implementadas.

### Tarjeta plegable — `card({ collapsible })`

Progressive disclosure sobre el componente que ya existe: no hay un
contenedor nuevo. `collapsible` convierte `<section class="card">` en
`<details>` y su `<header class="card-head">` en `<summary>`.

- **Nada se elimina.** El contenido sigue en el DOM plegado; solo se
  difiere. Un `<details>` cerrado conserva sus 9 filas `kv` y sus 5 filas
  de roster: comprobado.
- **Criterio por defecto:** desplegada por encima de 768px, plegada por
  debajo. Lo decide el renderizador (`foldIsOpen`), no el CSS, para que
  el `<details>` conserve su semántica y su accesibilidad de teclado.
- **Memoria:** lo que el jugador abre se recuerda mientras dure la
  sesión (`foldState`, en la capa de vista). No entra en la partida ni se
  guarda. Al cruzar los 768px se reinicia (`resetFolds`), para que cada
  ancho recupere su criterio.
- **Señal:** `.fold-mark`, un galón dibujado con dos bordes de 1,5px.
  Gira 180° al abrir, 180ms `--ease-out`. Sin icono ni SVG decorativo.
- **Cuándo usarla:** secciones de consulta ocasional. **Nunca** en una
  tarjeta con llamada a la acción (la de agente libre se queda abierta),
  ni en la de estado, ni en el torneo en curso.
- `o.collapsible === true` deriva la clave del título; una cadena la fija.

### Modificadores de rejilla — `kpi--hero`, `kpi--wide`, `tile--wide`

La jerarquía se declara en el marcado, nunca se deduce de la posición.
`c.kpi()` y `c.tile()` aceptan una clase extra como 6.º argumento.

| Clase | Significado | Efecto en móvil |
|---|---|---|
| `kpi--hero` | El veredicto de la pantalla. Uno por rejilla. | `order:-1` + fila entera + `--fz-display` |
| `kpi--wide` | Cifra larga (dinero) que necesita ancho. | Fila entera |
| `tile--wide` | Ídem en la rejilla de tiles. | Fila entera |

**Prohibido** resolver la jerarquía o las celdas huérfanas con
`:nth-child()` / `:last-child`: se rompe en cuanto un dato es condicional.
