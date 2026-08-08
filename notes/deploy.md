# Деплой MyDebate

Дата составления: 2026-08-08. Связано: [[PLAN]], [[progress]], [[tasks]].
Тэги: #deploy #todo

Приложение живёт в `web/` — Next.js 16 (App Router), Prisma 7 + PostgreSQL, NextAuth v5 (Credentials + Google), nodemailer.

Рекомендуемая площадка: **Vercel + управляемый Postgres (Neon или Supabase) + Vercel Blob** для загруженных картинок. Проект — обычный Next.js без фоновых воркеров и без вебсокетов, так что VPS ничего не даёт, кроме обслуживания вручную (альтернатива всё же описана в конце).

---

## Шаг 1. Правки в коде — ✅ сделано 2026-08-08

Четыре вещи, каждая из которых ломала бы прод.

- [x] **Prisma Client не собирался бы на чистой машине.** `generated/prisma` в `.gitignore` (правильно), но `prisma generate` нигде не вызывался — на любом CI/Vercel сборка падала бы на `import "@/generated/prisma/client"`. Добавлено в `package.json`: `build: "prisma generate && next build"` + `postinstall: "prisma generate"`.
- [x] **Загрузка картинок писалась на локальный диск.** `app/api/uploads/tournament-image/route.ts` писал в `public/uploads/tournaments`; на Vercel ФС read-only (кроме `/tmp`) и эфемерна — обложки исчезали бы. Теперь: есть `BLOB_READ_WRITE_TOKEN` → Vercel Blob (абсолютный URL), нет → прежняя запись на диск (локальная разработка и self-hosted с постоянным диском). Хост Blob добавлен в `remotePatterns` (`next.config.ts`).
- [x] **NextAuth за прокси.** Добавлен `trustHost: true` в `auth.ts` — без него вход на проде падает с `UntrustedHost`, потому что настоящий домен приходит в `X-Forwarded-Host`.
- [x] **Конфликт peer-зависимостей.** `nodemailer@9` против `peerOptional ^7 || ^8` у next-auth: `npm ci` по существующему lock-файлу проходил, но любой `npm install <пакет>` падал с ERESOLVE. Закрыто через `.npmrc` (`legacy-peer-deps=true`) — версию nodemailer не трогали, её подняли ради закрытия уязвимости (коммит `e1f619f`).

Попутно:
- [x] `prisma.config.ts` берёт `DIRECT_URL ?? DATABASE_URL` — миграции не умеют ходить через pgbouncer в transaction-режиме.
- [x] Появился `.env.example` со всеми переменными и пояснениями (в `.gitignore` добавлено исключение `!.env.example`).
- [x] 🐛 **Баг:** `coverImage`/`logoImage` валидировались как произвольная строка ≤500 символов, а приходят из `formData` (подделываются POST'ом в обход формы) и подставляются в `next/image`. Чужой хост там → исключение при рендере, то есть падение страницы турнира и каталога **для всех посетителей**. Добавлен строгий whitelist (`imageUrlSchema` в `lib/validations/tournament.ts`) + тест `tests/image-url-validation.test.ts`.
- [x] Убраны пустые папки-мусор в корне репозитория: `config`, `prefix`, `set`, `export PATH=~` (следы сорвавшейся команды `npm config set prefix`).

Проверено: `rm -rf .next generated && npm run build` — зелёный, `npm run lint` — 0 ошибок, `npx tsc --noEmit` — 0 ошибок.

---

## Шаг 2. Инфраструктура

- [ ] **Postgres**: завести проект в Neon или Supabase (free tier достаточно для старта). Текущий `DATABASE_URL` смотрит на `localhost:5432/mydebate` — прод-базы ещё нет.
- [ ] **Домен**: купить и привязать. Стартовать можно на `*.vercel.app` и привязать домен позже.
- [ ] **Vercel Blob**: создать стор и подключить к проекту — `BLOB_READ_WRITE_TOKEN` подставится в окружение автоматически.
- [ ] **Google OAuth** (console.cloud.google.com → Credentials): добавить в Authorized redirect URIs `https://<домен>/api/auth/callback/google`, в Authorized JavaScript origins — сам домен. Иначе вход через Google отвечает `redirect_uri_mismatch`.
- [ ] **Почта**: Gmail App Password работает, но лимит ~500 писем/сутки и высокий шанс спам-папки. Для прода — Resend или Postmark; код менять не нужно, только SMTP-переменные (`lib/email/send.ts` читает их из окружения).

## Шаг 3. Переменные окружения

Полный список с пояснениями — в `web/.env.example`. На проде обязательны:

| Переменная | Значение |
| --- | --- |
| `DATABASE_URL` | **пулерное** соединение (Supabase — порт 6543, Neon — хост с `-pooler`). Прямое соединение на serverless быстро выест лимит коннектов |
| `DIRECT_URL` | прямое соединение — только для `prisma migrate deploy` и seed |
| `AUTH_SECRET` | **новый**, `openssl rand -base64 32`. Локальный не копировать |
| `AUTH_URL` | `https://<домен>` — от него зависят OAuth-callback'и и ссылки в письмах сброса пароля |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | из Google Cloud Console |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASSWORD` / `EMAIL_FROM` | почтовый провайдер |
| `BLOB_READ_WRITE_TOKEN` | подставляется Vercel'ом при подключении Blob-стора |

## Шаг 4. Деплой

- [ ] Импортировать репозиторий `temirrllan/mydebate` в Vercel, **Root Directory = `web`** (иначе сборка не найдёт приложение).
- [ ] Заполнить переменные окружения — Production и Preview раздельно.
- [ ] Первый деплой, смотреть build logs.

## Шаг 5. После деплоя

- [ ] Миграции: `DATABASE_URL=<DIRECT_URL> npx prisma migrate deploy`. В `prisma/migrations` пока одна — `20260726144307_init`. **`db push` на проде не использовать** — он не ведёт историю и умеет терять данные.
- [ ] Демо-данные — только если нужны: `npm run db:seed`. Перед этим проверить `prisma/seed.ts` на тестовые пароли, которым не место в проде.
- [ ] Завести администратора.
- [ ] Smoke-тест по ролям: регистрация → письмо → вход → вход через Google → создание турнира с обложкой (проверить, что картинка **осталась** после редеплоя) → модерация → заявка участника → уведомления. Ролевые гейты (`proxy.ts`) проверить в инкогнито.
- [ ] `npm run test:e2e` против прод-URL (Playwright уже настроен).

---

## Альтернатива: VPS + Docker

Если не хочется зависеть от Vercel: VPS (~5 $/мес), Docker Compose из Next (`output: "standalone"`), Postgres и Caddy для TLS, `public/uploads` на volume. Код правок почти не требует — загрузчик сам уходит в локальный режим, когда нет `BLOB_READ_WRITE_TOKEN`. Взамен на тебе TLS, бэкапы, обновления и мониторинг.
