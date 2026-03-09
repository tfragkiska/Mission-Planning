# ── Stage 1: Install dependencies ────────────────────────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache openssl

WORKDIR /app

# Copy workspace root and package files
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

RUN npm ci

# ── Stage 2: Build ───────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/server/node_modules ./server/node_modules
COPY --from=deps /app/client/node_modules ./client/node_modules

# Copy all source files
COPY . .

# Generate Prisma client
RUN npx -w server prisma generate

# Build client (vite build)
RUN npm run build -w client

# Build server (tsc)
RUN npm run build -w server

# ── Stage 3: Production image ────────────────────────────────────────
FROM node:20-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV NODE_ENV=production

# Copy workspace root package files
COPY package.json package-lock.json ./
COPY server/package.json ./server/
COPY client/package.json ./client/

# Install production dependencies only
RUN npm ci --omit=dev

# Copy Prisma schema and generated client
COPY --from=build /app/server/prisma ./server/prisma
COPY --from=build /app/server/node_modules/.prisma ./server/node_modules/.prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma

# Copy built server
COPY --from=build /app/server/dist ./server/dist

# Copy built client assets
COPY --from=build /app/client/dist ./client/dist

EXPOSE 3000

CMD ["node", "server/dist/app.js"]
