#!/bin/bash
# Empaqueta toda la app en un unico index.html autocontenido,
# listo para GitHub Pages. Lee el orden de scripts directamente
# de index.html para no desincronizarse nunca.
set -e
cd "$(dirname "$0")/.."
mkdir -p dist

OUT=dist/index.html
: > "$OUT"

echo '<title>Dota Career Sim</title>' >> "$OUT"
echo '<meta name="description" content="Simulador de carrera profesional de Dota 2: crea un jugador de 16 anos y descubre hasta donde llega.">' >> "$OUT"
echo '<style>' >> "$OUT"
cat styles/main.css >> "$OUT"
echo '</style>' >> "$OUT"
echo '<div id="root"></div>' >> "$OUT"

# Incrusta los logos de equipo como data URI (DCS.assetsInline) para que
# el index.html final sea autosuficiente: un solo archivo, sin carpeta
# assets/ que se pueda olvidar al subirlo.
if [ -d assets/teams ]; then
  echo "<script>window.DCS = window.DCS || {}; DCS.assetsInline = {" >> "$OUT"
  first=1
  for f in assets/teams/*.png; do
    [ -e "$f" ] || continue
    id=$(basename "$f" .png)
    b64=$(base64 -w0 "$f")
    [ "$first" -eq 1 ] || echo "," >> "$OUT"
    printf '"%s":"data:image/png;base64,%s"' "$id" "$b64" >> "$OUT"
    first=0
  done
  echo "}; </script>" >> "$OUT"
  echo "  logos incrustados: $(ls assets/teams/*.png 2>/dev/null | wc -l)"
fi

grep -o 'src="[^"]*\.js"' index.html | sed 's/src="//;s/"$//' | while read -r f; do
  echo "<script>" >> "$OUT"
  cat "$f" >> "$OUT"
  echo "</script>" >> "$OUT"
done

echo "OK -> $OUT ($(wc -c < "$OUT") bytes)"
