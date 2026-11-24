#!/usr/bin/env bash
# qa.sh — comprobaciones de calidad de Dota Career Sim (solo lectura).
# Uso: bash tools/qa.sh [--quick]   (--quick salta los tests lentos: tournament, finance, progression, baseline)
# Requisitos: node, cmp, git (Git Bash en Windows ya trae grep, sed, wc).
# qa.sh nunca copia archivos ni hace push, commit, merge o deploy.
cd "$(dirname "$0")/.." || exit 2
QUICK=0; [ "$1" = "--quick" ] && QUICK=1
MONO=cursor-merge/latest-cursor2.html
LOGOS=logos/DLTV_Top35_2026-11-23
TMO=""; command -v timeout >/dev/null 2>&1 && TMO="timeout 600"
ROWS=""; FAILS=0
row() { ROWS="$ROWS$1 | $2 | $3
"; [ "$2" = FAIL ] && FAILS=$((FAILS+1)); }

# a) Las dos copias del monolito deben ser idénticas (GitHub Pages sirve index.html raíz; los tests leen dist/).
for f in dist/index.html index.html; do
  if cmp -s "$MONO" "$f"; then row "cmp $f" PASS "idéntico al monolito"
  else row "cmp $f" FAIL "regenera con: cp $MONO dist/index.html && cp $MONO index.html"; fi
done

# b) Tests en Node: PASS solo con exit 0 Y una línea que empiece por «OK:».
for t in tools/*-test.js; do
  n=$(basename "$t" -test.js)
  if [ $QUICK = 1 ]; then case $n in tournament|finance|progression|baseline) row "test $n" SKIP "--quick"; continue;; esac; fi
  out=$($TMO node "$t" 2>&1); rc=$?
  ok=$(printf '%s\n' "$out" | grep -m1 '^OK:' | cut -c1-110)
  if [ $rc -eq 0 ] && [ -n "$ok" ]; then row "test $n" PASS "$ok"
  else err=$(printf '%s\n' "$out" | grep -v '^\[i18n' | grep -m1 -E 'FALLO|Error' | cut -c1-110); row "test $n" FAIL "exit $rc: ${err:-sin línea OK:}"; fi
done

# c) Ningún <script src> a un CDN de código (fuentes de Google y banderas flagcdn sí están permitidas).
cdn=$(grep -Eo '<script[^>]*src=[^>]*(unpkg|jsdelivr|cdnjs)[^>]*>' "$MONO" | head -3)
if [ -z "$cdn" ]; then row "script CDN" PASS "ninguno"; else row "script CDN" FAIL "$cdn"; fi

# d) Logos del catálogo: el monolito construye las rutas por concatenación, así que se valida la carpeta.
nfiles=$(ls "$LOGOS/logos" 2>/dev/null | wc -l | tr -d ' ')
narch=$(grep -c '"archivo"' "$LOGOS/equipos.json" 2>/dev/null)
miss=""
for a in $(grep -o '"archivo": *"[^"]*"' "$LOGOS/equipos.json" 2>/dev/null | sed 's/.*"\([^"]*\)"$/\1/'); do [ -f "$LOGOS/$a" ] || miss="$miss $a"; done
if [ "$nfiles" = 35 ] && [ "$narch" = 35 ] && [ -z "$miss" ]; then row logos PASS "35 archivos y 35 en equipos.json"
else row logos FAIL "archivos=$nfiles catálogo=$narch faltan:${miss:- ninguno}"; fi

# e) Publicación: solo informativo. Nada se sube sin un «sí» explícito del usuario.
row "origin/main publicado" INFO "$(git rev-parse --short origin/main 2>/dev/null || echo desconocido)"
row "commits locales sin subir" INFO "$(git rev-list --count origin/main..HEAD 2>/dev/null || echo '?')"
row "archivos con cambios" INFO "$(git status --porcelain | wc -l | tr -d ' ')"

# f) Tabla final
echo "CHECK | ESTADO | DETALLE"
printf '%s' "$ROWS"
echo "qa.sh nunca hace push, commit, merge ni deploy."
if [ $FAILS -eq 0 ]; then echo "RESULTADO: PASS"; exit 0; fi
echo "RESULTADO: FAIL ($FAILS)"; exit 1
