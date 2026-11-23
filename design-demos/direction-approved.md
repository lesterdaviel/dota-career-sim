# Dirección artística aprobada · Dota 2 Career Sim

**Estado:** aprobada por el usuario.
**Fecha:** 3 de septiembre de 2026.
**Alcance:** regla visual vinculante para todas las fases de rediseño posteriores.

---

## 1. Decisión, en palabras del usuario

> «Vamos con la recomendación:
> D1 como sistema base de toda la interfaz.
> D3 únicamente para momentos ceremoniales y de máximo prestigio: The International, victorias de
> torneos importantes, Sala de Trofeos, Legado, grandes hitos de carrera.
> Y adopta de D2 únicamente la idea del contrato en formato de pliego/documento para las ofertas y
> renovaciones importantes.
> No quiero mezclar los tres sistemas visuales de forma indiscriminada.
> Quiero: D1 para claridad, jerarquía, densidad y navegación diaria; D3 para prestigio, escala y
> recompensa emocional; D2 solo donde el contrato sea una decisión importante.
> Considera esta dirección aprobada.»

---

## 2. Los tres registros y su alcance

El sistema es **uno**, con tres registros. No son tres temas intercambiables: son tres niveles de
voz dentro de la misma gramática y comparten tokens, escala tipográfica y semántica de color.

### Registro DIARIO — D1 · Torre de control  *(por defecto)*
Sistema base de **toda** la interfaz. Todo lo que no esté explícitamente en las listas de abajo
es D1. Ante la duda: **es D1**.

Cubre: Dashboard, Perfil, Equipo, Temporada, Torneos (navegación y calendario), Partidos,
Ofertas y mercado ordinario, Bandeja, Patrimonio, Carrera (trayectoria, totales, equipos),
Clasificaciones, Estadísticas, creación de personaje, ajustes.

Rasgos no negociables del registro: grafito frío, un solo acento caliente, oro reservado a
títulos, filetes de 1px, radio máximo 2px, cero sombras, cero degradados, cero iconos
decorativos, cifras en monoespaciada, tablas como primitivo central.

### Registro CEREMONIAL — D3 · Cartel de velada  *(lista cerrada)*
Solo en estos cinco contextos:

1. **The International** — cualquier presentación del evento como tal.
2. **Victorias de torneos importantes** — pantalla de campeón / overlay de victoria.
3. **Sala de Trofeos.**
4. **Legado** — pantalla final de carrera.
5. **Grandes hitos de carrera** (ver §4 para la definición operativa).

Rasgos: negro de escenario, **un solo foco de luz descentrado por pantalla**, tipografía a escala
de cartel (Anton), hueso en lugar de blanco puro, oro solo para lo ganado.

### Registro DOCUMENTO — D2 · Pliego  *(una sola idea adoptada)*
Se adopta **exclusivamente** la idea del contrato como pliego de papel: esquema invertido
(papel crema `#E8E1D0`, tinta oscura), cláusulas numeradas, líneas de firma, sello de plazo.

Solo para **contratos que son una decisión importante** (ver §4). El resto de la estética D2
—bronce, serif como voz general, numerales romanos, pestañas de expediente, códigos `EXP-…`—
**queda fuera del proyecto**. No se usa en ningún otro sitio.

---

## 3. Regla de no mezcla

Explícita por petición del usuario: **no se mezclan los tres sistemas de forma indiscriminada.**

- Una pantalla pertenece **a un solo registro**. No hay pantallas mitad D1 mitad D3.
- El registro ceremonial **no se invoca por importancia percibida**, sino por la lista cerrada de §2.
- El foco de luz de D3 **no aparece nunca** en pantallas D1. Es la señal que distingue los registros.
- La display Anton **no se usa nunca** fuera del registro ceremonial.
- El pliego de papel **no se usa** para nada que no sea un contrato de los definidos en §4.
- Si una pantalla parece pedir dos registros, gana D1 y el momento ceremonial se resuelve como
  overlay o pantalla aparte, no fundiendo estilos.

---

## 4. Umbrales operativos  *(propuestos — pendientes de confirmar)*

El usuario definió los contextos, no los umbrales. Propongo estos, anclados al modelo de datos
real del juego. **Marcados como propuesta: confirmar antes de implementar.**

**Victorias de torneo que disparan el registro ceremonial**
Reutilizar la constante que ya existe en el código, `WINNER_OVERLAY_SERIES`:
`ti`, `dreamleague`, `pgl_wallachia`, `blast_slam`, con `placement === 1 && kind !== 'qualifier'`.
Cualquier otro título se celebra en registro diario (D1).

**Grandes hitos de carrera**
- Retirada y cálculo del legado.
- Primer título Tier 1 de la carrera.
- Primera clasificación para The International y primera victoria en TI.
- Cierre de prime (cuando `findPrime` fija el tramo máximo).
- Ascenso a Tier 1 por primera vez.

**Contratos que se presentan como pliego (D2)**
- Toda **renovación** (`isRenewal`), por ser la decisión que define la continuidad.
- Ofertas que **cambian de tier o de región**.
- Ofertas de **Tier 1**.
- El resto de ofertas del mercado ordinario: registro diario, tabla de términos D1.

---

## 5. Fundamentos comunes a los tres registros

Sobreviven a la elección y aplican en todo el proyecto:

- **Motivo central: el techo.** Cada cifra vive bajo un límite que el juego nunca enseña. Se
  expresa como columna GAP en D1, como vacío/grabado en el registro ceremonial. Prohibido
  resolverlo como barra de progreso genérica.
- **Eje Radiant/Dire recuperado** como oposición de temperatura (cálido `#FF7A45` / frío
  `#4FB0FF`). Hoy `--radiant` y `--dire` están declarados en el CSS y usados **0 veces**.
- **Semántica de color heredada, intocable en su significado:** tiers (1 ámbar / 2 azul / 3 acero),
  cinco colores de posición, victoria verde / derrota roja / título oro.
- **Sin assets de Valve.** Única imagen permitida: los escudos de club ya embebidos en
  `DCS.assetsInline`.

---

## 6. Consecuencias de sistema que quedan fijadas

Derivadas de la auditoría (informe de 15 problemas) y ya incorporadas a la dirección:

- **Escala tipográfica cerrada de 6 pasos.** Hoy hay 28 tamaños px distintos y 18 fórmulas
  `clamp()` casi duplicadas. Se sustituyen por tokens.
- **Escala de espaciado en rejilla de 4px.** Hoy hay 39 valores distintos y 316 usos fuera de
  rejilla, sin ningún token de spacing en `:root`.
- **Suelo de legibilidad:** cuerpo ≥ 14px, etiquetas ≥ 12px. Las versalitas con tracking solo se
  permiten a partir de 12px. Hoy hay 46 reglas en mayúsculas, 36 de ellas a ≤ 11px.
- **Salto de jerarquía real:** titular ≥ 3× cuerpo en registro diario; ≥ 6× en ceremonial.
- **`:active` obligatorio en todo elemento pulsable** (`scale(.98–.985)`, 140–160ms). Hoy hay 36
  reglas `:hover` y **una sola** `:active`.
- **Todo `:hover` va detrás de `@media (hover:hover) and (pointer:fine)`.** Hoy hay 0 gates.
- **Sistema de breakpoints único.** Hoy hay 9 anchos distintos; la banda 640–768px encadena tres
  saltos de layout.
- **Motion:** solo funcional en registro diario (120–200ms, `ease-out` fuerte, sin animaciones de
  entrada en pantallas de uso diario). El momento orquestado se reserva al registro ceremonial.
- **Cero iconos decorativos** en los tres registros.

---

## 7. Lo que queda descartado

No volver a proponerlo en fases siguientes salvo petición explícita:

- La dirección clara **«Sala blanca»** (Kenya Hara) de la primera ronda: incompatible con el
  requisito de oscuridad.
- **D2 como sistema completo** (bronce, serif de voz general, expedientes): descartado por leer
  institucional en vez de esports y por duplicar el coste de tokens.
- **D3 como sistema completo**: descartado por densidad insuficiente para un juego de estadísticas.

---

## 8. Trazabilidad

Las tres direcciones se presentaron renderizadas, no descritas. Material de referencia:

| Dirección | Tablero de sistema | Captura |
|---|---|---|
| D1 · Torre de control | `design-demos/D1-torre-de-control.html` | `design-demos/D1-torre-de-control.png` |
| D2 · Dossier | `design-demos/D2-dossier.html` | `design-demos/D2-dossier.png` |
| D3 · Cartel | `design-demos/D3-cartel.html` | `design-demos/D3-cartel.png` |

Ronda previa (exploración sobre el Dashboard, con la variante clara ya descartada):
`design-demos/A-sala-blanca.html` · `B-torre-de-tiempos.html` · `C-relato.html`

Spec común de entrada: `design-demos/SPEC.md`
Auditoría de origen: informe de 15 problemas (sesión del 3/9/2026).

---

## 9. Lo que todavía NO está decidido

Para que la siguiente fase no lo dé por supuesto:

- Los umbrales de §4 (propuestos, sin confirmar).
- Orden de ataque del rediseño (se recomienda empezar por lo crítico de móvil: cabecera solapada,
  navegación que oculta 6 de 10 secciones, dashboard de 5 pantallas de scroll).
- Si las tipografías se cargan desde Google Fonts o se empaquetan, dado que el juego se distribuye
  como un único HTML sin dependencias.
- Valores finales de los tokens (los tableros usan valores de trabajo, no definitivos).
