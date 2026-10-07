#!/bin/bash
# Espera a que PostgreSQL esté listo (hasta 30s)
for i in $(seq 1 30); do
  /opt/homebrew/bin/psql -U "$USER" -d boutique_pos -c "SELECT 1" > /dev/null 2>&1 && break
  sleep 1
done

cd /Users/ezequielmeneses/Documents/Point-of-sales-Nextjs
exec /opt/homebrew/bin/node node_modules/.bin/next start -p 3000
