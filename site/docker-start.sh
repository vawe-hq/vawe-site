#!/bin/sh
# The container runs only the marketing site. /docs is served by the separate docs app, which the
# site proxies to at DOCS_ORIGIN (site/lib/docs-origin.mjs).
set -e

PORT="${PORT:-3000}"

# Without DATABASE_URL this does nothing. With it, a database that cannot be reached or migrated stops
# the start, so the host keeps the previous container.
node site/db/migrate.mjs

# The pages were built without a database; one visit each makes them read it now, not on a visitor's first hit after the cache window.
(sleep 8; for p in /marketplace /jobs /hire; do wget -q -O /dev/null "http://127.0.0.1:$PORT$p" || true; done) &

exec env PORT="$PORT" HOSTNAME=0.0.0.0 node site/server.js
