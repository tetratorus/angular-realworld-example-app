#!/usr/bin/env bash
# Start the mock API (:3000), Angular (:4200) and React (:5173) in the background. Logs in /tmp/conduit-*.log
set -euo pipefail
cd "$(dirname "$0")/.."
up() { curl -sf "$1" >/dev/null 2>&1; }
up http://localhost:3000/health || (nohup node mock-api/server.mjs >/tmp/conduit-api.log 2>&1 &)
up http://localhost:4200 || (nohup npx ng serve --port 4200 >/tmp/conduit-angular.log 2>&1 &)
up http://localhost:5173 || (cd react-app && nohup npx vite --port 5173 --strictPort >/tmp/conduit-react.log 2>&1 &)
for u in http://localhost:3000/health http://localhost:4200 http://localhost:5173; do
  for i in $(seq 1 120); do up "$u" && break; sleep 1; done
  up "$u" && echo "up: $u" || { echo "NOT UP: $u"; exit 1; }
done
