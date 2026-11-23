# cursor-merge/ — histórico, no editar

Instantáneas del monolito guardadas a mano durante el trabajo con Cursor,
antes de que el proyecto tuviera control de versiones. Se conservan porque
son el único registro de estados intermedios.

| Archivo | Qué es | Estado |
|---|---|---|
| **`latest-cursor2.html`** | **Fuente de verdad del juego.** Aquí se edita. | **ACTIVO** |
| `latest-cursor.html` | Snapshot del 30 ago 2026, antes del rediseño V2 | histórico |
| `broken-inbox.html` | Snapshot con la bandeja rota, guardado para diagnóstico | histórico |
| `live-current.html` · `live-index-2.html` | Copia de lo que estaba publicado el 29 ago (idénticos entre sí) | histórico |
| `live-index.html` | Publicado anterior, 29 ago | histórico |
| `index.html` | Versión temprana del 29 ago (1,5 MB) | histórico |
| `zip-check/` | Contenido descomprimido del zip de i18n que envió Cursor | histórico |

Todos salvo `latest-cursor2.html` están congelados. Editar cualquiera de
ellos no tiene ningún efecto sobre el juego.

Ahora que el proyecto está en git, estas copias son redundantes: el
histórico lo lleva git. Se pueden borrar cuando haya confianza en el
repositorio; hasta entonces no molestan (~14 MB).

Ver `ARCHITECTURE.md`.
