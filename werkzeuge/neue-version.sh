#!/usr/bin/env bash
# Hängt an alle lokalen CSS- und JS-Links in den HTML-Seiten eine neue Versionsnummer (?v=JahrMonatTagStundeMinute).
# Dadurch laden Browser nach einem Update garantiert die neuen Dateien statt alter aus dem Cache.
# Vor jedem Commit/Push ausführen:   ./werkzeuge/neue-version.sh
set -euo pipefail
cd "$(dirname "$0")/.."
v=$(date +%Y%m%d%H%M)
for f in *.html; do
  # href="css/....css" oder src="js/....js", mit oder ohne bestehendes ?v=...
  sed -i -E "s#((href|src)=\"(css|js)/[^\"?]+\.(css|js))(\?v=[0-9]+)?\"#\1?v=${v}\"#g" "$f"
done
echo "Version ${v} gesetzt in: $(ls *.html | tr '\n' ' ')"
