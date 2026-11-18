# ---------------------------------------------------------------------------
# ЛР №19: тот же оптимизированный образ из ЛР №18 (multistage build),
# который собирается в CI и пушится в Docker Hub.
# ---------------------------------------------------------------------------

# ---------------------------- этап 1: сборка -------------------------------
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build \
 && npm prune --omit=dev

# ------------------------- этап 2: production ------------------------------
FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production
WORKDIR /app

COPY package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

# Каталог под SQLite: в облаке файл живёт в контейнере и теряется при рестарте.
# Для реального деплоя подключите управляемую БД (PostgreSQL) через DATABASE_URL.
RUN mkdir -p /app/data && chown node:node /app/data

USER node

# Порт в облаке приходит через PORT (Render/Railway/Heroku), 3000 — значение по умолчанию
EXPOSE 3000
CMD ["node", "dist/main.js"]
