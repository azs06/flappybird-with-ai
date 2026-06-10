#!/usr/bin/env bash
# Assembles the full Cloudflare Pages site into dist/:
#   /                -> generated gallery page (generate-index.js)
#   /<model>/...     -> every 2D implementation, copied as-is
#   /archive/...     -> pre-reorganization builds
#   /3d-version/...  -> the 3D mini-site (built by 3d-version/build.sh)
set -euo pipefail
cd "$(dirname "$0")"

node generate-index.js

rm -rf dist
mkdir -p dist
cp index.html _headers dist/

for entry in */; do
  name="${entry%/}"
  case "$name" in
    node_modules|dist|3d-version|logs) continue ;;
  esac
  rsync -a \
    --exclude '.DS_Store' \
    --exclude 'node_modules' \
    --exclude '.git' \
    "$name/" "dist/$name/"
done

# The 3D mini-site has its own build step (Vite app needs a relative base)
(cd 3d-version && bash build.sh)
mkdir -p dist/3d-version
cp -R 3d-version/dist/. dist/3d-version/
rm -f dist/3d-version/_headers # only the root _headers applies on Pages

find dist -name '.DS_Store' -delete
echo "── dist/ assembled:"
find dist -maxdepth 1 -mindepth 1 | sort
echo "── $(find dist -type f | wc -l | tr -d ' ') files total"
