# ─────────────────────────────────────────
# Nohemy's Boutique POS — Dockerfile
# Base: node:18-alpine (Alpine 3.18+ = OpenSSL 3.x)
# ─────────────────────────────────────────
FROM node:18-alpine

# Instalar OpenSSL 3 y dependencias nativas que Prisma necesita para detectar la versión
RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

# Copiar manifiestos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias (postinstall corre prisma generate pero aún sin código)
RUN npm ci --ignore-scripts

# Copiar todo el código fuente
COPY . .

# Forzar a Prisma que genere el engine para Alpine + OpenSSL 3
ENV PRISMA_CLI_BINARY_TARGETS=linux-musl-openssl-3.0.x

# Generar Prisma client con el engine correcto
RUN npx prisma generate

# Build de Next.js
RUN npm run build

# ── Runtime ──
ENV NODE_ENV=production

# Forzar uso del engine correcto en runtime (evita auto-detección fallida)
ENV PRISMA_QUERY_ENGINE_LIBRARY=/app/node_modules/.prisma/client/libquery_engine-linux-musl-openssl-3.0.x.so.node

# Render usa el puerto 10000 por defecto
ENV PORT=10000
EXPOSE 10000

# Arrancar Next.js en el puerto correcto
CMD ["npm", "start"]
