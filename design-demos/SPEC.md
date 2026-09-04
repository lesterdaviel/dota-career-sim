# Spec de diseño · Dashboard · Dota 2 Career Sim

Entrada única y común para las tres direcciones. Las tres usan este mismo contenido real
y el mismo tamaño de salida, de modo que la comparación sea de **diseño**, no de datos.

## 1. Qué es el producto

Un simulador de carrera profesional de Dota 2, jugable en navegador, sin backend. El jugador
crea un aspirante de 16 años y lo lleva hasta su retirada: entrena, compite, negocia contratos,
cambia de equipo, gana o no gana, y al final descubre qué legado deja. El eje emocional está en
el propio README del proyecto: **«Ninguna trayectoria está garantizada»**.

No es una web de estadísticas ni un clon de otro juego. Es una carrera vivida en primera persona,
contada con números.

## 2. Audiencia y escenario de uso

Aficionado a Dota 2 / esports que juega en sesiones cortas y repetidas: entra, lee su estado,
avanza una fase, lee el resultado, vuelve a decidir. El Dashboard es la **pantalla de aterrizaje
de cada sesión**: lo primero que ve al continuar la partida, muchas veces al día. Distancia de
lectura: 50-70 cm en escritorio; también se juega en móvil de pie.

Consecuencia de diseño: esta pantalla se ve cientos de veces. No admite adornos que se disfruten
una vez y molesten las siguientes, ni animaciones de entrada en cada bloque.

## 3. Contenido real que debe aparecer (nada de lorem)

Estado del jugador de la partida auditada:
- Identidad: **lester** (Lester Volkov) · Rusia · Inteligente · 20 años · POS 2 (Mid)
- Club: **Team Spirit** · Tier 1 · Europa del Este (usar el escudo real del juego)
- Temporada **6 · año 2030**, fase actual: **Mercado**
- Valoración **91** (techo alcanzado 94) · MMR **11 223** (máx 11 223) · Rating última temporada **93**
- Reputación **100** en el circuito · Earnings **3,11 M$** · Cash **3,11 M$**
- Forma **56** (normal) · Moral **100** (buena) · Años pro **5** · Títulos **29**
- Temporada 2030: **140 mapas**, **122-18**, winrate **87,1 %**, **62 series**, **6 torneos**
- Resultados recientes: *Eastern Europe League 2030* — campeón, 8.400 $, rating 87 ·
  *DreamLeague 2030* — campeón internacional, 45 K$, rating 90
- Bandeja: **41 sin leer**
- Acción siguiente: **Abrir el mercado** (acción primaria) / **Saltar al mercado** (secundaria)

## 4. Tono y temperatura visual

Competitivo, adulto, sin infantilismo gamer. Debe transmitir que lo que se mira **cuesta**: una
carrera que puede romperse. Palabras guía: rendimiento, techo, riesgo, oficio, legado.

Prohibido por auditoría: leerse como dashboard SaaS oscuro genérico. Es el problema nº 9 del
informe (dentro del juego no hay identidad Dota; `--radiant` y `--dire` están declarados y usados
cero veces).

## 5. Formato de salida (idéntico en las tres)

- HTML de un solo archivo, CSS propio, sin dependencias JS.
- Viewport de referencia **1440 × 900** (captura a ese tamaño).
- Solo el Dashboard. No hay que rediseñar el resto del juego en esta fase.
- Assets reales inyectados desde el juego (escudos de club en base64), nunca cuadros grises.

## 6. Restricciones heredadas del proyecto (no negociables)

- Reutilizar la **semántica de color existente**: Tier 1 ámbar / Tier 2 azul / Tier 3 acero;
  cinco colores de posición (pos 2 = oro); victorias verde, derrotas rojo, títulos oro.
  Se puede reinterpretar el tono, no el significado.
- Contraste: mantener AA (el sistema actual ya lo cumple, peor caso 4,87:1).
- `font-variant-numeric: tabular-nums` en todas las cifras: es un juego de estadísticas.
- Suelo de legibilidad: cuerpo ≥ 14 px, etiquetas ≥ 12 px. Ninguna dirección, ni la más
  silenciosa, baja de ahí.
- La arquitectura real del juego son componentes `c.card / c.btn / c.kpi / c.tile` sobre un único
  HTML: la dirección elegida tiene que poder expresarse **a través de esos componentes**, no
  exigir un framework nuevo.

## 7. Problemas de la auditoría que esta pantalla debe resolver

Elegido el Dashboard precisamente porque concentra cinco de los quince:
- **nº 3** — en móvil son 4.053 px (5 pantallas) porque los KPI colapsan a una columna.
- **nº 5** — sin escala tipográfica (28 tamaños px distintos).
- **nº 7** — jerarquía plana: todo es una tarjeta del mismo peso; 6 tiles idénticos.
- **nº 8** — 46 reglas ALL-CAPS con tracking, 36 de ellas a ≤ 11 px.
- **nº 9** — cero identidad Dota / esports dentro del juego.

## 8. Motivo visual (la forma sale de aquí, no de una librería de estilos)

El motivo es **el techo**.

En este juego cada número vive debajo de un límite que no se enseña: el potencial oculto se
sortea al crear al personaje y **nunca se muestra**; el jugador solo ve opiniones de scouting con
ruido. De ahí que la interfaz repita el patrón «valor actual / máx alcanzado»: VAL 91 · máx 94,
MMR 11 223 · máx 11 223.

Ningún dashboard genérico expresaría eso, porque ningún otro producto lo tiene: es la tesis del
juego convertida en dato. Las tres direcciones deben expresar ese techo de forma distinta —una
marca, una línea que no se alcanza, un hueco por encima de la cifra— en lugar de dibujar otra
barra de progreso más.

Segundo motivo disponible: la **fase de temporada como ciclo** (pretemporada → competición →
cierre → mercado → fin de año), que se repite cada año y apila años hasta la retirada.
