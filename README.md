# DOTA 2 CAREER SIMULATOR — V1

Simulador de carrera profesional ambientado en el ecosistema competitivo de Dota 2.
Creas a un aspirante de 16 años y lo llevas hasta su retirada: entrenas, compites,
recibes ofertas, cambias de equipo, ganas y pierdes, y al final descubres qué legado
dejaste. **Ninguna trayectoria está garantizada.**

No es una web de estadísticas ni un clon de otro juego. El núcleo es:

> crear jugador → desarrollar carrera → decidir → competir → progresar → recibir
> ofertas → cambiar de equipo → ganar o perder → construir una trayectoria →
> retirarse → descubrir el legado.

---

## Cómo jugar

**Opción 1 — sin nada instalado:** abre `dist/index.html` con doble clic. El juego no
usa build, ni dependencias, ni servidor. (El `index.html` de la raíz es una versión
modular congelada, no lo que se juega: ver `ARCHITECTURE.md`.)

**Opción 2 — servido por HTTP** (útil si tu navegador restringe `localStorage` en `file://`):

```bash
powershell -ExecutionPolicy Bypass -File tools\serve.ps1
```

Y abre `http://localhost:8765/`.

La partida se guarda sola en `localStorage` después de cada acción.

---

## Cómo funciona la simulación

### Azar controlado, no arbitrario
Nunca hay «azar puro → resultado». El generador solo produce números; las
probabilidades las fija el contexto: habilidad, potencial, edad, forma,
equipo, sinergia, rival, moral, decisiones, reputación y oportunidad. Un equipo
inferior siempre puede ganar un mapa (la probabilidad está acotada entre 10% y 90%),
pero el superior tiene ventaja real.

### Determinismo y semilla
Cada carrera genera una semilla propia. El generador **no guarda estado interno**: cada
valor se deriva de `(semilla, cursor)`, y el cursor se persiste con la partida después
de cada acción. Consecuencia: recargar la página reproduce exactamente lo que ya pasó,
y **no se puede refrescar para volver a tirar los dados**. Verificado: restaurar un
guardado y volver a avanzar produce una temporada byte a byte idéntica.

### Potencial oculto y realización
Al crear al jugador se sortea un potencial interno (distribución sesgada hacia abajo:
la mayoría no tiene techo de Tier 1) que **nunca se muestra**. El usuario solo recibe
opiniones de scouting con ruido, y ese ruido se reduce según avanza la carrera.

Además, el potencial es solo un máximo teórico: un factor oculto de **realización**
decide cuánto de ese techo llega a materializarse, modulado por moral, mentalidad y
calidad del entorno. Tener potencial generacional no garantiza nada, y un breakout
puede elevar el techo por encima de lo previsto.

### Desarrollo
No existe «+1 por temporada». El crecimiento de cada atributo nace de la distancia al
techo, la ventana de edad, el rendimiento, el entrenamiento elegido, la moral, el nivel
de los compañeros, el volumen de mapas y el azar. De ahí salen crecimientos rápidos,
estancamientos, breakouts, malas temporadas, regresiones, primes y declives. Las manos
(mecánicas, hero pool) se van antes que la cabeza (game sense, liderazgo, teamplay).

### Estadísticas por posición
Las cinco posiciones generan **líneas estadísticas distintas** y se evalúan con
**criterios distintos**. Un Hard Support puede firmar una temporada excepcional con 3
kills por mapa; un Carry con muchas kills, mal farm y muchas muertes, no. Los pesos
del rating (`ratingSpec`) nunca se muestran al usuario.

La valoración general tampoco es una media: cada rol pondera los ocho atributos de
forma diferente (`weights`).

### Integridad de datos
Se guardan **sumas por mapa** y los promedios se calculan al vuelo, de modo que
victorias + derrotas siempre cuadran con los mapas jugados. Si el jugador cambia de
posición a lo largo de su carrera, cada estadística se promedia solo sobre los mapas en
los que existía. Las estadísticas históricas nunca se sobrescriben y los cambios de
equipo a mitad de temporada conservan el total anual con su desglose por etapa.

### Progresión y dificultad
Los Tier 1/2/3 son **niveles internos del juego**, no una clasificación oficial. El
catálogo mezcla nombres de organizaciones reales y ficticias; ratings, tiers y
plantillas los genera el juego. No hay snapshot con fecha ni fuente de datos reales
(`DCS.data.TEAM_SNAPSHOT.asOf === null`, `sources: []`). Cada equipo guarda
`tierHistory[año]` (aditivo, no altera la simulación).

Parámetros que gobiernan la progresión (comentario junto a `VALUE_BANDS`):
- `rollPotential`: el que más decide llegar a T1 (fija el techo). Ajuste del 23 nov 2026:
  umbrales 0,32/0,64/0,86/0,965 → 0,30/0,58/0,80/0,95; el 80 % sigue sin techo de T1
  (antes 86 %) y el 20 % saca potencial ≥ 85 (antes 14 %).
- `VALUE_BANDS`: valor mínimo por tier (T1 52-78, T2 38-63, T3 20-45).
- `eliteGate`: T1 de élite exige value ≥ 70 y forma ≥ 55, o reputación ≥ 82 y forma ≥ 48.
- `generateOffers`: interés T1 ×0,18 con < 2 años pro y value < 65; ×1,55 con ≥ 2 años pro.
- `ensureSafetyOffers`: red de seguridad en Tier 3 tras 2-3 temporadas sin equipo.
- `evolveWorld`: ascenso si calidad > media del tier +7 (p 0,52), descenso si < media −9
  (p 0,42); disolución anual con riesgo base 0,05.

Medición de referencia (120 carreras, semillas `PROG-i`, tras el ajuste de
`rollPotential`): llega a T2 el 54,2 %, a T1 el 16,7 %; años hasta T1 mediana 11
(p10 7, p90 18); 33 % de temporadas sin equipo; títulos mediana 2 / p90 8 / máx 33;
TI en 4 carreras (máx 6). Antes del ajuste: T2 55 %, T1 13,3 %, años a T1 mediana 11.
Con 60 carreras `BAL`: TI por temporada en T1 13 %, títulos por carrera 4,22, GOAT 2/60.
Para repetirla: `node tools/progression-test.js`.

---

## Interfaz

Oscura, competitiva, con identidad propia. La regla es que **el color signifique
algo**: no hay tonos decorativos.

- **Tiers**: Tier 1 ámbar, Tier 2 azul, Tier 3 acero. Se reconocen sin leer.
- **Posiciones**: cada una tiene su color (pos 1 ámbar, pos 2 oro, pos 3 turquesa,
  pos 4 azul, pos 5 violeta), así que sabes de qué rol habla una tabla de un vistazo.
- **Rendimiento**: el rating usa seis bandas con relleno propio (élite dorado, gran
  temporada ámbar, buena turquesa, correcta azul, gris discreta, mala roja).
- **Resultados**: victorias en verde, derrotas en rojo, premios y títulos en oro.

### Qué se puede tocar

| Interacción | Dónde |
|---|---|
| Desplegar un torneo y ver **serie a serie** con las fichas W/L de cada mapa | Temporada, Equipo, Carrera |
| **Mapa de la carrera**: rating y valoración año a año, franja de tier, estrellas en los TI; cada año es pulsable | Carrera › Trayectoria |
| **Barras contra el baremo del rol**: dónde caen tus números entre un jugador flojo y uno de élite en tu posición | Cierre de temporada, Perfil, Temporada |
| **Anillo de rating** y desglose de desarrollo con el cambio de cada atributo | Cierre de temporada |
| Pestañas por pantalla (Atributos / Evolución / Estadísticas, Resumen / Estadísticas / Torneos, Trayectoria / Totales / Equipos) | Perfil, Temporada, Carrera |
| **Barra espaciadora** para avanzar, teclas **1-7** para saltar de pantalla, **1/2** para elegir en una decisión | Toda la app |
| Indicador de fase de la temporada siempre visible, y marcadores clave en la cabecera | Barra inferior y superior |

Los números suben al aparecer y los resultados se revelan en cascada; ganar un título
de prestigio o The International lanza una celebración a pantalla completa. Todo
respeta `prefers-reduced-motion`, y el valor final se escribe en el HTML antes de
animar: si el navegador pausa las animaciones, el dato sigue siendo correcto.

---

## Arquitectura

Sin build, sin dependencias, sin framework. Todo el juego —motor, datos, interfaz,
estilos e i18n— vive en un único archivo autocontenido, `dist/index.html`, con más de
40 bloques `<script>` colgando de un único namespace `DCS`. Se edita en
`cursor-merge/latest-cursor2.html` y se publica copiándolo tal cual a `dist/index.html`
(sin build). El detalle completo, qué archivos son legacy y por qué, está en
`ARCHITECTURE.md` — léelo antes de tocar código.

Reglas que sigue el código:

- La UI **nunca** toca el motor: pasa siempre por `DCS.game`.
- Los datos no contienen lógica de simulación; el motor no contiene HTML.
- El estado completo de una partida es serializable a JSON.

### Preparado para ampliar (sin implementar en V1)

Equipos y jugadores reales, héroes y hero pool real, draft, parches, base de datos,
usuarios, rankings, logros, sharing, multijugador y narrativa por IA. La separación de
capas está pensada para eso: por ejemplo, sustituir el dataset de mundo por uno real no
obliga a tocar el motor.

---

## Catálogo de equipos

El mundo tiene **solo 35 equipos**: los del ranking DLTV del **23/11/2026**
(<https://dltv.org/ranking>), sin equipos ficticios. Nombres, logos y orden inicial vienen
de DLTV; la nota local de países y regiones está en
`logos/DLTV_Top35_2026-11-23/DLTV_Top35_paises_regiones_2026-11-23.md`. Los logos son
propiedad de sus titulares y se usan sin fines comerciales. Ratings, tiers y plantillas
los genera el juego (Tier 1 puestos 1-16, Tier 2 17-26, Tier 3 27-35; el rating sigue
el orden del ranking dentro de la banda de cada tier del catálogo anterior, T1 1519-1059,
T2 1074-1015 y T3 1046-1000, para conservar la escala de fuerza) y no reflejan jugadores ni datos actuales.

Cada equipo de `DCS.data.TEAMS` guarda:

- `country`: país de la organización (código ISO) o `null` si es internacional o sin país único.
- `displayRegion`: texto de la región tal como aparece en la nota (p. ej. «Europa»).
- `competitiveRegion`: región competitiva real o `null` si no está confirmada.
- `region`: región de **simulación**, la que usa el motor (circuito, clasificatorios).
- `regionStatus`: `confirmed`, `provisional` o `unconfirmed`.

Pendientes de confirmar: DO KONCA, CyberHero e Inner Circle son `provisional`.
Froglings, PlayTime y Astra Invicta son europeos sin subregión confirmada
(`competitiveRegion: null`, `unconfirmed`); por **decisión de simulación** usan `weu`,
así juegan los abiertos y el circuito WEU y no quedan sin clasificatorio.

Regiones con pocos equipos: Norteamérica tiene 1 (GamerLegion) y Sudamérica 2 (Amaru
Gaming, Pibbles Corp). Sus torneos completan el campo con equipos reales de otras
regiones; nunca se inventan rivales.

Logos: se sirven directamente desde `logos/DLTV_Top35_2026-11-23/logos/` (archivo
`<rank 2 dígitos>-<nombre>`), sin copias ni base64 de equipos; si falta un logo se pintan
las iniciales. Para itch.io, sube esa carpeta (con la misma ruta) junto al `index.html`.

Cómo actualizar el catálogo: sustituye la carpeta `logos/DLTV_Top35_2026-11-23/` y edita
la lista `TEAMS` del bloque DATA / TEAMS de `cursor-merge/latest-cursor2.html`; actualiza
también la nota de la fuente y `DCS.data.TEAM_SNAPSHOT`.

Partidas guardadas (`migrateCatalogDltv`, idempotente): los equipos que siguen reciben
nombre, región, logo y datos del catálogo conservando roster, contratos y `tierHistory`;
los retirados salen del mundo sin convertirse en otro equipo; si el jugador estaba en uno,
pasa a agente libre con su progreso, dinero, historia y trofeos, y su torneo en curso se
descarta; las ofertas de retirados se eliminan. Historial, palmarés y ranking guardan los
nombres pasados (sin el id, se muestran las iniciales).

---

## Tests

Antes de publicar: `node tools/finance-test.js`, `node tools/trophy-test.js`,
`node tools/tournament-test.js` y `node tools/teams-test.js`. Los tres cargan `dist/index.html` (el artefacto real,
vía `tools/load-dist.js`) y simulan cientos de carreras completas comprobando
contabilidad, sala de trofeos e invariantes del motor de torneos. `tools/balance.html`
es un test de balance más antiguo que corre sobre `src/`, congelado desde el 31 de
agosto: sus cifras ya no describen el juego publicado (ver `ARCHITECTURE.md`).

Resultado de la última pasada de balance sobre `src/` (600 carreras, histórico):

| Desenlace | % |
|---|---|
| Candidato a GOAT | 0,8 |
| Leyenda de Dota | 5,7 |
| Superestrella | 5,0 |
| Campeón | 4,7 |
| Estrella internacional | 3,3 |
| Veterano respetado | 11,2 |
| Journeyman | 11,7 |
| Profesional regional | 18,5 |
| Jugador de Tier 3 | 25,5 |
| Carrera corta / Promesa que nunca explotó | 13,7 |

Otros indicadores: 21,3% llega alguna vez a Tier 1 · 13,2% disputa The International ·
**0,8% lo gana** · 6,3% alcanza un rating de 90+ · edad media de retirada 32,9 ·
0 problemas de integridad de datos.

Es decir: la banda alta es el 20% de las carreras, la media el 41% y la baja el 39%.
Una carrera extraordinaria se siente especial porque no ocurre casi nunca.

---

## Validaciones comprobadas

- Victorias + derrotas = mapas jugados, en temporada, etapa y carrera.
- No hay estadísticas negativas ni ratings fuera de 0-100.
- El histórico anual no se sobrescribe y se puede abrir cualquier año.
- Los cambios de equipo conservan las estadísticas y muestran el desglose.
- No se puede jugar después de los 38: la carrera termina obligatoriamente.
- Retirarse cierra la carrera; avanzar después no hace nada.
- Guardar y cargar mantiene semilla, cursor, mundo, historial y estado.
- Refrescar no permite rerollear: mismo guardado ⇒ misma temporada.
- Cada posición genera estadísticas propias y se evalúa con criterios propios.
- Las ofertas se corresponden con el nivel real del jugador; Tier 1 no es accesible al
  empezar; ganar The International es excepcional.
- Una mala carrera sigue siendo jugable hasta el final.
- El desglose serie a serie cuadra siempre con los totales del torneo: número de
  series, mapas ganados y perdidos y longitud de cada resultado (comprobado sobre
  todos los torneos de 600 carreras).
- No se puede cerrar el año dejando ofertas sin responder.
- Un equipo con más derrotas que victorias en la fase de grupos nunca pasa a
  playoffs, sea cual sea el formato del torneo (comprobado sobre 120 carreras y
  más de 5.500 registros de torneo en `tools/tournament-test.js`).
