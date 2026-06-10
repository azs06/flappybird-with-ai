#!/usr/bin/env bash
# Assembles the combined Cloudflare Pages site into dist/:
#   /                       -> landing page linking the three games
#   /claude-fable-5/        -> PAPERWING (static files from claude-fable-5/3d)
#   /gemini-3.5-flash-high/ -> Cyber Flight (static files)
#   /gpt-5.5-xhigh/         -> Vite build, rebuilt with a relative base so
#                              assets resolve under the subdirectory
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

find dist -name '.DS_Store' -delete
echo "Built dist/:"
find dist -maxdepth 2 -type d
