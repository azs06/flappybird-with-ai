#!/usr/bin/env bash
# Assembles the combined Cloudflare Pages site into dist/:
#   /                       -> landing page linking the games
#   /claude-fable-5/        -> PAPERWING (static files from claude-fable-5/3d)
#   /gemini-3.5-flash-high/ -> Cyber Flight (static files)
#   /gpt-5.5-xhigh/         -> Vite build, rebuilt with a relative base so
#                              assets resolve under the subdirectory
#   /claude-sonnet-5/       -> PRISM (static files)
#   /grok-4.5/<variant>/    -> SPARK: vanilla (static) + amp, native, pi (Vite)
set -euo pipefail
cd "$(dirname "$0")"

rm -rf dist
mkdir -p dist

cp index.html _headers dist/

mkdir -p dist/claude-fable-5
cp -R claude-fable-5/3d/. dist/claude-fable-5/
rm -f dist/claude-fable-5/_headers dist/claude-fable-5/README.md

mkdir -p dist/gemini-3.5-flash-high
cp gemini-3.5-flash-high/*.html gemini-3.5-flash-high/*.css gemini-3.5-flash-high/*.js dist/gemini-3.5-flash-high/

(cd gpt-5.5-xhigh && npm run build -- --base=./)
mkdir -p dist/gpt-5.5-xhigh
cp -R gpt-5.5-xhigh/dist/. dist/gpt-5.5-xhigh/

mkdir -p dist/claude-sonnet-5/js
cp claude-sonnet-5/index.html claude-sonnet-5/style.css dist/claude-sonnet-5/
cp claude-sonnet-5/js/*.js dist/claude-sonnet-5/js/

# grok-4.5 has one build per harness: vanilla is static, the rest are Vite apps
mkdir -p dist/grok-4.5/vanilla/js
cp grok-4.5/vanilla/index.html grok-4.5/vanilla/style.css dist/grok-4.5/vanilla/
cp grok-4.5/vanilla/js/*.js dist/grok-4.5/vanilla/js/
for variant in amp native pi; do
  (cd "grok-4.5/$variant" && { [ -d node_modules ] || npm ci; } && npm run build -- --base=./)
  mkdir -p "dist/grok-4.5/$variant"
  cp -R "grok-4.5/$variant/dist/." "dist/grok-4.5/$variant/"
done

find dist -name '.DS_Store' -delete
echo "Built dist/:"
find dist -maxdepth 2 -type d
