#!/usr/bin/env bash
# One-time setup on a fresh machine: submodule, Bun, dependencies, Playwright Chromium.
set -euo pipefail
cd "$(dirname "$0")/.."
git submodule update --init
command -v bun >/dev/null || [ -x "$HOME/.bun/bin/bun" ] || curl -fsSL https://bun.sh/install | bash
BUN="$(command -v bun || echo "$HOME/.bun/bin/bun")"
"$BUN" install
(cd react-app && "$BUN" install)
npx playwright install chromium
