# ---- deps ----
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# npm install avec fallback si le package-lock.json est absent ou pose un problème de résolution
RUN if [ -f package-lock.json ]; then npm ci --legacy-peer-deps; else npm install --legacy-peer-deps; fi

# ---- build ----
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL=postgresql://postgres:postgres@db:5432/app_db
RUN npm run build
# ---- runtime ----
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public* ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/drizzle.config.json* ./drizzle.config.json

# 💡 AJOUTER CETTE LIGNE : Copie du dossier src pour que Drizzle trouve schema.ts
COPY --from=builder /app/src ./src

EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
