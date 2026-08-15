# syntax=docker/dockerfile:1
#
# Образ приложения MyDebate для развёртывания на своём сервере (VPS).
# Собирается из каталога web/ — см. docker-compose.yml в корне репозитория.
#
# Стадии:
#   deps     — только установка зависимостей (кэшируется, пока не менялся lock-файл)
#   builder  — сборка Next.js в standalone-режиме
#   migrator — Prisma CLI для `migrate deploy` (нужны devDeps, поэтому отдельная стадия)
#   runner   — итоговый образ: минимум файлов, непривилегированный пользователь
#
# Node 22 LTS: Next 16 требует >= 20.9, а Prisma 7 официально поддерживает 20/22.
# Берём Debian slim, а не Alpine — musl регулярно приносит сюрпризы с нативными
# модулями (sharp для оптимизации картинок), а выигрыш в размере тут копеечный.
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# --- Зависимости -----------------------------------------------------------
FROM base AS deps
# .npmrc обязателен: в нём legacy-peer-deps, без него npm ci спотыкается о
# конфликт nodemailer@9 с peer-диапазоном next-auth.
COPY package.json package-lock.json .npmrc ./
# Схема и конфиг Prisma нужны уже на этом шаге: postinstall дёргает
# `prisma generate`, а тот без schema.prisma падает.
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci

# --- Сборка ----------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# lib/prisma.ts создаёт клиент на уровне модуля и бросает исключение, если
# DATABASE_URL пуст, а `next build` импортирует модули маршрутов при анализе.
# Реального подключения при сборке не происходит (пул pg открывает соединение
# лениво, на первом запросе), поэтому подставляем заведомо нерабочую заглушку —
# настоящий адрес приходит через окружение уже в рантайме.
ENV DATABASE_URL="postgresql://build:build@127.0.0.1:5432/build"
RUN npm run build

# --- Миграции --------------------------------------------------------------
# Отдельная стадия поверх builder: у неё есть и Prisma CLI, и devDeps, и схема.
# Запускается разово (сервис `migrate` в compose), а не при каждом старте
# приложения — иначе несколько инстансов полезли бы мигрировать одновременно.
FROM builder AS migrator
CMD ["npx", "prisma", "migrate", "deploy"]

# --- Итоговый образ --------------------------------------------------------
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
# 0.0.0.0, а не localhost: иначе процесс слушает только внутри контейнера и
# Caddy до него не достучится.
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# standalone кладёт server.js и только реально используемые модули — весь
# node_modules в образ не едет.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
# Статику Next в standalone не копирует специально: её принято раздавать CDN.
# У нас CDN нет, поэтому кладём рядом — сервер отдаст сам.
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Точка монтирования тома с загруженными обложками. Каталог создаём заранее и
# сразу с нужным владельцем: том наследует права существующего каталога при
# первом монтировании, иначе процесс под nextjs не сможет туда писать.
RUN mkdir -p /app/public/uploads/tournaments \
  && chown -R nextjs:nodejs /app/public/uploads

# Чеки об оплате — вне public: всё, что лежит в public на момент старта
# сервера, Next отдаёт статикой в обход проверки прав
# (app/uploads/receipts/[filename]/route.ts). Каталог тоже монтируется томом.
RUN mkdir -p /app/data/receipts && chown -R nextjs:nodejs /app/data

USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
