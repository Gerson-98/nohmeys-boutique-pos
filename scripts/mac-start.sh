#!/bin/bash
# Arranca la app de Nohemy's Boutique en la Mac y abre el navegador.
# Se ejecuta automáticamente al encender la Mac (ver launchd) o manualmente con: ./scripts/mac-start.sh

set -e
cd "$(dirname "$0")/.."

PORT=3000

# Espera a que PostgreSQL local esté listo (hasta 30s)
for i in $(seq 1 30); do
  if pg_isready -q 2>/dev/null; then break; fi
  sleep 1
done

# Arranca el servidor Next.js en segundo plano
npm run start -- -p $PORT &
SERVER_PID=$!

# Espera a que el servidor responda antes de abrir el navegador
for i in $(seq 1 30); do
  if curl -s "http://localhost:$PORT" >/dev/null 2>&1; then break; fi
  sleep 1
done

open "http://localhost:$PORT"

wait $SERVER_PID
