# Прогресс MyDebate

#project

План: [[PLAN]] · Задачи: [[tasks]]

---

## 2026-07-05 — Старт проекта и Этап 0 (каркас)

#done

### Подготовка
- Прочитал ТЗ (`maket/MyDebate.docx`) и все 13 макетов из `maket/`.
- Согласовал с заказчиком ключевые решения:
  - Стек: **Next.js 16 + TypeScript + Tailwind v4 + Prisma 7 + SQLite + NextAuth** (email+пароль; Google OAuth пока заглушён).
  - Гость строго по ТЗ: НЕ видит каталог турниров → редирект на вход.
  - Регистрация на турнир — простая форма без шага оплаты (Kaspi отложен).
  - Порядок: сначала публичка + пользователь, затем модерация + админка.
  - Код в подпапке `web/`, заметки Obsidian остаются в корне.
- Составил и сохранил [[PLAN]] и [[tasks]].

### Этап 0 — каркас проекта (выполнен)
- Инициализировал Next.js 16 (App Router, TS, ESLint) в `web/`. Turbopack по умолчанию.
- Установил зависимости: `prisma`, `@prisma/client`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot`, `dotenv` (dev).
- **Дизайн-система** (`app/globals.css`, Tailwind v4 `@theme`): токены бренд-синего (`#2563EB`), navy-блоков, поверхностей, границ, радиусов. Шрифт Inter (латиница + кириллица).
- **Корневой layout**: ru-локаль, метаданные (title-шаблон), подключены Navbar + main + Footer.
- **UI-компоненты** (`components/ui/`): Button (primary/secondary/outline/ghost/dark, 3 размера, `asChild`), Badge (7 тонов), Card, Input (со стейтом ошибки), Container. Утилита `cn` в `lib/utils.ts`.
- **Каркас страницы** (`components/layout/`): Logo (SVG-марка «M» + текстовый знак), Navbar (адаптивный, бургер-меню, активные ссылки, действия гостя), Footer (бренд + Навигация + Поддержка + Контакты + копирайт).
- **Иконки соцсетей** (`components/icons/social.tsx`): Instagram/Telegram/Facebook/TikTok собственными SVG — lucide-react больше не поставляет брендовые логотипы.
- **Prisma 7 + SQLite**: `prisma init`, настроен `prisma.config.ts` (url из `.env` через dotenv), клиент генерится в `web/generated/prisma`, обновлён `.gitignore` (dev.db, generated).
- Главная — временная заглушка (полноценный лендинг в Этапе 3).

### Проверка
- `npm run build` — успешно, TypeScript чистый.
- Dev-сервер + скриншот главной: рендер совпадает со стилем макетов (навбар, палитра, кнопки, футер).

### Заметки на будущее (сохранены в память Claude)
- Next 16 breaking changes: async `params`/`searchParams`/`cookies`/`headers` (нужен `await`), `middleware.ts` → `proxy.ts`, Turbopack по умолчанию.
- Первая миграция БД перенесена в Этап 1 (делаем вместе с реальными моделями).

### Дальше
- **Этап 1 — модели данных** (агент `mydebate-database`): User, Tournament, TournamentSection, Registration, Favorite, Notification, SupportTicket + enum статусов/ролей, singleton Prisma-клиента, seed демо-турниров.

---

## 2026-07-05 — Этап 1 (слой данных)

#done

Выполнено агентом `mydebate-database`.

### Схема (`prisma/schema.prisma`)
- Модели: **User**, **Tournament**, **TournamentSection**, **Registration**, **Favorite**, **Notification**, **SupportTicket**.
- NextAuth-совместимые модели: **Account**, **Session**, **VerificationToken**, **PasswordResetToken** (для Этапа 2).
- Каскадные удаления, уникальные индексы `(userId, tournamentId)` на Registration/Favorite, индексы на фильтруемые поля (status, city, format, locationType, startDate, registrationDeadline и т.д.).

### Решения по SQLite
- SQLite не поддерживает нативные `enum` и `String[]`. Все «перечисления» — поля `String` с задокументированными значениями + TS-константы в **`lib/enums.ts`** (Role, Level, TournamentFormat, LocationType, TournamentStatus, RegistrationType, RegistrationStatus, NotificationType, SupportTicketStatus).
- `languages` — строка через запятую (`"Русский,English"`) + хелперы `parseLanguages`/`formatLanguages`.

### Инфраструктура
- Singleton **`lib/prisma.ts`** с driver-адаптером `@prisma/adapter-better-sqlite3`. Импорт клиента: `@/generated/prisma/client`.
- Миграция `init` применена, `dev.db` создан (в `web/`).
- Seed настроен в `prisma.config.ts` (`migrations.seed`), запуск `npm run db:seed`. Доп. зависимости: `bcryptjs`, `tsx`, `@prisma/adapter-better-sqlite3`.

### Seed-данные
- 3 пользователя: **admin@mydebate.kz** (ADMIN), организатор, участник (Санжар Тулегенов). Пароль у всех — **`password123`**.
- 11 турниров: 10 PUBLISHED (предстоящие с открытой регистрацией / с закрытой регистрацией / прошедшие) + 1 PENDING (на модерации). Города: Астана, Алматы, Шымкент, Караганда. У ArysMUN 2.0 — 6 комитетов (TournamentSection).
- Регистрации, избранное, уведомления, 1 обращение для участника.

### Проверки — все зелёные
- `prisma validate` / `migrate dev` / `db seed` (идемпотентный) / `npm run build`.
- Рантайм-чек через singleton: 3 юзера, 11 турниров (10 PUBLISHED, 1 PENDING), 4 города.

### Заметки в память
- Обновил `nextjs-16-gotchas`: путь импорта Prisma 7, обязательный driver-adapter, запуск seed/скриптов из `web/`.

### Дальше
- **Этап 2 — авторизация** (агент `mydebate-auth`): NextAuth (email+пароль, Google заглушён), регистрация с валидацией, хеш паролей, сессии, восстановление пароля, ролевые гейты + `proxy.ts` (гость → редирект на вход).

---

## 2026-07-05 — Этап 2 (авторизация)

#done

Выполнено агентом `mydebate-auth`.

### Реализовано
- **NextAuth v5 (Auth.js)** — `web/auth.ts` (`handlers/auth/signIn/signOut`), провайдер **Credentials** (email+пароль), стратегия **JWT** (в токене `id` + `role`), типы в `types/next-auth.d.ts`. Google OAuth **заглушён** (кнопка есть, но disabled). Route: `app/api/auth/[...nextauth]/route.ts`. `AUTH_SECRET` в `.env`.
- **Регистрация** — zod-схемы (`lib/validations/auth.ts`), Server Actions (`lib/actions/auth.ts`): `registerUser` (уникальность email, bcrypt-хэш, автологин → `/profile`), `loginUser`, `requestPasswordReset`, `resetPassword`, `logoutUser`.
- **Восстановление пароля** — токен в `PasswordResetToken` (1 час), «письмо» = заглушка (`console.log` ссылки), нейтральный ответ; страница `/reset-password?token=...`.
- **Хелперы доступа** — `lib/auth/session.ts`: `getCurrentUser/requireUser/requireRole/requireAdmin` (перепроверяют БД, не только JWT). `lib/auth/roles.ts`: `maybePromoteToOrganizer` (USER→ORGANIZER) — **пока не вызывается**, ждёт экшена модерации (Этап 6).
- **Гейты** — `web/proxy.ts` (Next 16: `proxy`, не `middleware`; Node-runtime). Публичные: `/`, `/about`, `/contacts`, `/help`, `/rules`, `/privacy`, `/terms`, `/login`, `/register`, `/forgot-password`, `/reset-password`. Требуют вход: `/tournaments*`, `/profile*`, `/favorites*`, `/notifications*` → `/login?callbackUrl=`. Только ADMIN: `/admin*` → `/403`.
- **Страницы** — `/login`, `/register`, `/forgot-password`, `/reset-password`, `/403`, мин. `/profile`. Общие компоненты в `components/auth/` (двухколоночный layout по макетам Логин.png/Регистрация.png). Живая валидация, состояния, доступность.
- Зависимости: `next-auth@5.0.0-beta.31`, `server-only`.

### Проверки
- `npm run build` — чисто (Turbopack + typecheck).
- Агент: curl-редиректы гостя (307), реальный NextAuth-флоу (admin вход → role ADMIN; неверный пароль → ошибка; blocked → отказ), гейт роли → /403, логика register/reset через временный скрипт.
- **Я проверил в браузере (Browser 2, Windows):** гость `/profile` → `/login?callbackUrl=/profile` ✅; страница входа совпадает с макетом ✅; вход/сессия (был активен `temabeka67@gmail.com`) ✅; выход ✅.

### ⚠️ Найден баг (записан в tasks.md)
- **Навбар не session-aware:** после входа остаётся гостевым (Войти/Регистрация), нет ссылки на Профиль/Выйти → пользователь «не видит» вход. По ТЗ 8.4 навбар должен меняться. Плановая задача **Этапа 3** (session-aware Navbar: Создать турнир / Профиль / Выйти).

### Тестовые учётки
- `admin@mydebate.kz` / `password123` (ADMIN) + организатор/участник. В браузере пользователя есть свой аккаунт `temabeka67@gmail.com`.

### Дальше
- **Этап 3 — публичные страницы** (агент `mydebate-frontend`): Главная (6 блоков), О нас, Помощь (FAQ), Правила, Контакты. **+ session-aware Navbar** (закрыть баг). Логин/Регистрация уже готовы (Этап 2).

---

## 2026-07-06 — Этап 3 (публичные страницы)

#done

Выполнено агентом `mydebate-frontend`, проверено агентом `mydebate-qa` (реальный браузер).

### 🐛 Баг Этапа 2 закрыт — session-aware Navbar
- `app/layout.tsx` теперь `async`, тянет пользователя через `getCurrentUser()` (`lib/auth/session.ts` — перепроверяет БД/isBlocked/роль), прокидывает в `<Navbar user={...} />`.
- Навбар меняется по сессии: гость → «Войти/Регистрация»; вошедший → «Создать турнир» + Профиль (имя+аватар) + «Выйти»; ADMIN → ещё «Админ-панель». И десктоп, и мобильный бургер.
- «Выйти» — через существующий server action `logoutUser` в `<form>`.
- Кнопка «Создать турнир» видна и гостю — **так в макете** (роут всё равно защищён `proxy.ts`).

### Страницы (по макетам)
- **Главная** (`app/page.tsx`, заменил заглушку) — 6 блоков: Hero, Ближайшие турниры (**реальные 3 турнира из БД**, PUBLISHED, ближайшие), О платформе, Преимущества (4), Как работает (3 шага), navy-CTA.
- **О нас** (`/about`), **Помощь** (`/help` — FAQ-аккордеон + живой поиск, client), **Правила** (`/rules` — 3 нумерованные секции), **Контакты** (`/contacts`).
- **Заглушки** `/privacy`, `/terms` — футер больше не ведёт в 404.

### Новые переиспользуемые компоненты
- `components/tournaments/tournament-card.tsx` (задел на Этап 4; есть слот `favoriteSlot` под избранное).
- UI: `empty-state`, `illustration-panel` (CSS-плейсхолдеры вместо иллюстраций из макетов — ассетов нет), `breadcrumbs`, `feature-card`, `cta-banner`, `contact-card`.
- `lib/format.ts` (русские даты), FAQ-модуль в `components/help/`.

### Проверки (QA, реальный headless-браузер)
- Навбар: гость/вошедший/админ/выход — на десктопе и мобиле, всё корректно. Старого бага нет.
- Все публичные страницы отдают 200 гостю; FAQ-аккордеон и поиск работают; консоль без ошибок; адаптив (390/800/1400) без поломок.
- Бонус: гейты доступа (`/tournaments`, `/profile`, `/admin` гостю → редирект на `/login`) работают.
- `npm run build` — зелёный, typecheck чистый.

### Известно (не баги, впереди по плану)
- `/tournaments` и `/admin` пока 404 — Этапы 4 и 6.
- ❤️ избранное на карточке не подключено (слот готов) — Этап 4.

### Дальше
- **Этап 4 — ядро пользователя** (`frontend + backend`): каталог «Все турниры» (поиск без перезагрузки, фильтры формат/тип/город/дата, пагинация, состояния), карточка турнира, регистрация на турнир, избранное, профиль с вкладками. Макеты: Все турниры, Страница турнира, Регистрация на турнир 1/2, Профиль.

---

## 2026-07-08 — Этап 4 (ядро пользователя)

#done

Реализовано агентами `mydebate-backend` → `mydebate-frontend`, проверено `mydebate-qa` (реальный браузер). Баги из QA закрыты вручную.

### Серверный слой (backend)
- **Запросы каталога** `lib/tournaments/queries.ts`: `listTournaments()` (поиск по title/city/организатору, фильтры формат/тип/город/уровень/дата, сортировка ближайшие/новые, пагинация → `{items,total,page,pageSize,totalPages}`), `getAvailableCities()`, `getTournamentDetail()` (только PUBLISHED, иначе null — не палит существование).
- **Экшены** (`"use server"`): `registerForTournament` (zod-валидация, проверки PUBLISHED + дедлайн + анти-дубль через `@@unique` и catch P2002, уведомление организатору, `REGISTRATION_SUCCESS_MESSAGE`), `cancelRegistration`, `toggleFavorite` + `getFavoriteTournamentIds`, `markNotificationRead`/`markAllNotificationsRead`.
- **Профиль** `lib/profile/queries.ts`: `getProfileDashboard()` (сводка) + точечные (upcoming/past registrations, favorites, notifications, unread count).
- **Схема**: в `Registration` добавлены nullable-поля формы (fullName, gradeOrCourse, schoolOrUniversity, phone, contactEmail, teamName, teammateNames, experienceLevel, preferredLanguage, additionalInfo). Миграция `20260707153408_registration_form_fields`.

### Фронтенд (страницы по макетам)
- **`/tournaments`** — каталог: `filters-bar.tsx` (client, дебаунс поиска 400мс, фильтры в URL-query, «Сбросить»), счётчик, сетка `TournamentCard` с ❤️ (`favorite-button.tsx`, оптимистично), пагинация (`pagination.tsx`), состояния loading/empty, CTA-баннер. + `components/ui/select.tsx`.
- **`/tournaments/[id]`** — деталь: navy-hero + статус, «О турнире», комитеты (скрыты, если нет), «Детали турнира», «Ключевые даты», организатор, кнопка регистрации (дизейбл при закрытом дедлайне, бейдж если уже зарегистрирован), `not-found.tsx`.
- **`/tournaments/[id]/register`** — форма БЕЗ шага оплаты (Kaspi отложен): личная информация + участие + согласие, `useActionState`, живая валидация, три состояния (форма / уже зарегистрирован / дедлайн прошёл), экран благодарности. Поля 1:1 с zod-схемой `lib/validations/registration.ts`.
- **`/profile`** — заменил заглушку: navy-шапка (аватар, роль, статы), боковое меню-вкладки через `?tab=`, компоненты в `components/profile/`. Вкладки: Предстоящие/Прошедшие (бейджи статуса), Мои заявки (+ отмена с подтверждением), Избранное, Уведомления (отметка прочитано), О себе, Настройки (заглушка редактирования). Пустые состояния везде.
- **`lib/format.ts`** дополнен: `LOCATION_TYPE_LABEL`, `REG_STATUS_LABEL`/`REG_STATUS_TONE`, `formatPrice`, `REGISTRATION_SUCCESS_MESSAGE`.

### ⚠️ Гочи Next 16 (записано)
- `"use server"`-файл НЕ может экспортировать `const`, если модуль тянется в клиентский бандл (через `useActionState`) — Turbopack падает. `REGISTRATION_SUCCESS_MESSAGE` вынесен в `lib/format.ts`.

### QA (реальный браузер) — 6 багов, 5 починены
- 🔴 **Крит.** — экран благодарности после успешной регистрации был недоступен: `revalidatePath` перерисовывал страницу, `alreadyRegistered` становился true и подменял success-карточку на «Вы уже зарегистрированы». **Фикс:** обработку «уже зарегистрирован» перенёс внутрь `register-form.tsx`, страница всегда рендерит форму при открытой регистрации → компонент не размонтируется, `state.success` остаётся главнее.
- Поиск не искал по городу → добавил `{ city: { contains } }` в OR.
- Телефон «притворялся» заполненным (placeholder = реальный номер) → сделал явной подсказкой «Например: …».
- Навбар ломался на планшете (~768–880px): десктоп-меню включалось с `md` без места → порог перенесён на `lg`, на планшете бургер.
- Сырая zod-ошибка на поле языка → нормализовал `formData.get("preferredLanguage") ?? ""`.
- Гейт доступа, каталог, фильтры, избранное, профиль, отмена заявки, адаптив (390/1400) — ✅ по QA.

### Осталось (не баги)
- Косметика на Этап 7: страница несуществующего турнира отдаёт HTTP 200 вместо 404 (UI верный; из-за стриминга `loading.tsx`).
- Вне Этапа 4: мастер создания турнира (Этап 5), «Мои турниры» для организатора, `/admin` (Этап 6), редактирование настроек профиля (нет экшена).

### Проверки
- `npm run build` + typecheck — зелёные (17 роутов). `npm run lint` — чисто (только старые warning в seed.ts).

### Дальше
- **Этап 5 — создание турнира** (`frontend + backend`): 3-шаговая форма с прогресс-баром (основная инфо → описание + обложка/логотип + динамические разделы → контакты + тип регистрации), отправка на модерацию (статус PENDING).

---

## 2026-07-10 — Этап 5 (создание турнира)

#done

Реализовано агентами `mydebate-backend` → `mydebate-frontend`, проверено `mydebate-qa` (реальный браузер). Схема НЕ менялась (миграции не потребовалось — модели Tournament/TournamentSection уже покрывали всё).

### Серверный слой (backend)
- **`lib/validations/tournament.ts`** — zod-схемы по шагам (`step1Schema`/`step2Schema`/`step3Schema`, чтобы фронт валидировал каждый шаг отдельно) + полная `createTournamentSchema` для сервера. Даты из `<input type="date">` парсятся строками "YYYY-MM-DD" → Date. Кросс-полевые правила: город обязателен для OFFLINE, `endDate` ≥ `startDate`, дедлайн ≤ дате начала и не в прошлом, `externalUrl` обязателен и валиден при EXTERNAL.
- **`lib/actions/tournaments.ts`** — `createTournament(prevState, formData)` (под `useActionState`): `requireUser` (любая роль), валидация, создание Tournament со `status: PENDING`, вложенные `sections` с order, уведомление автору (`TOURNAMENT_SUBMITTED`) + всем админам (`NEW_TOURNAMENT_PENDING`), `revalidatePath` /tournaments и /profile. Контракт FormData: скаляры по имени, `languages` через `getAll`, `sections` одной JSON-строкой `sectionsJson`, `coverImage`/`logoImage` — уже загруженные пути (не файлы).
- **`app/api/uploads/tournament-image/route.ts`** — загрузка обложки/логотипа отдельным Route Handler (НЕ Server Action: у экшенов лимит тела 1МБ, а нужно до 5МБ). Валидация типа (jpeg/png/webp) и размера (≤5МБ), сохранение в `public/uploads/tournaments/` со случайным именем, `getCurrentUser` → 401. `public/uploads` в .gitignore (кроме .gitkeep).
- **`lib/tournaments/queries.ts`** — добавлен `listMyTournaments(userId)` (турниры организатора + счётчик регистраций + статус).
- **`lib/enums.ts`** — новые типы уведомлений `TOURNAMENT_SUBMITTED`, `NEW_TOURNAMENT_PENDING`.

### Фронтенд
- **`app/tournaments/create/page.tsx`** — защищённый роут (`requireUser`), шапка, монтирует мастер.
- **`components/tournaments/create-wizard.tsx`** + под-шаги (`create/step1-basic-info.tsx`, `step2-content.tsx`, `step3-contacts.tsx`, `image-upload-field.tsx`, `sections-editor.tsx`, `types.ts`) и `components/ui/progress-bar.tsx`. Всё состояние полей — в одном объекте на мастере (данные переживают переключение шагов). Валидация текущего шага zod-схемой гейтит «Далее»; серверные `fieldErrors` перебрасывают на первый затронутый шаг. Экран благодарности по `state.success` в стиле `register-form.tsx`.
- **Профиль**: вкладка «Турниры, которые вы организуете» (`listMyTournaments`) со статус-бейджами над существующим списком участий. `lib/format.ts` — `TOURNAMENT_STATUS_LABEL`/`TOURNAMENT_STATUS_TONE`/`getTournamentStatusDisplay()` (конвенция HIDDEN + `rejectionReason` → «Отклонён», т.к. в статусах нет литерала REJECTED — флаг для Этапа 6).

### QA (реальный браузер) — всё ✅, 1 мелкий фикс
- Гейт гостя, валидация всех 3 шагов, полная успешная отправка (PENDING в БД, не виден в каталоге, виден в профиле, оба уведомления), реальная запись файлов в `public/uploads/tournaments/`, адаптив 390/1400px, консоль чистая.
- 🐛 React-warning: `useActionState`-диспетчер вызывался вне транзакции → **починил** обёрткой `startTransition(() => formAction(...))`. Пересборка зелёная.

### Проверки
- `npm run build` + typecheck + lint — зелёные (роут `/tournaments/create` в сборке).

### Дальше
- **Этап 6 — модерация + админка**: dashboard (счётчики), таблица турниров (одобрить/отклонить/скрыть/удалить), автосмена роли USER→ORGANIZER после 1-го одобрения (`maybePromoteToOrganizer` уже написан, ждёт вызова), пользователи (блокировка/удаление), организаторы, обращения (ответ/закрытие), внутренние уведомления. Конвенция «отклонён» = HIDDEN + `rejectionReason`.

---

## 2026-07-10 — Этап 6 (модерация + админ-панель)

#done

Реализовано агентами `mydebate-backend` → `mydebate-frontend`, проверено `mydebate-qa` (реальный браузер). Схема НЕ менялась (миграции не потребовалось — все поля уже были: Tournament.status/rejectionReason, User.isBlocked/role, SupportTicket.response/status).

### Серверный слой (backend)
- **`lib/admin/queries.ts`** (только чтение, `server-only`, auth проверяет вызывающая страница): `getAdminDashboardStats()`, `listTournamentsForModeration({status?,search?,page?})` (ВСЕ статусы, не только PUBLISHED), `getTournamentForModeration(id)`, `listUsersForAdmin({search?,role?,page?})`, `listOrganizers()` (ORGANIZER+ADMIN со статистикой по статусам), `listSupportTickets({status?,page?})`.
- **`lib/actions/admin.ts`** (`"use server"`, КАЖДЫЙ экшн начинается с `requireAdmin()`, логирование, `revalidateAdmin()` + публичные пути): `approveTournament` (PENDING/HIDDEN→PUBLISHED, очистка rejectionReason, **вызов `maybePromoteToOrganizer(organizerId)` сразу после** — первый живой вызов этого хелпера, уведомление TOURNAMENT_PUBLISHED), `rejectTournament(id,reason)` (→HIDDEN+rejectionReason, reason обязателен, уведомление с причиной), `hideTournament` (PUBLISHED→HIDDEN, rejectionReason не трогает), `deleteTournament` (мягко → DELETED), `setUserBlocked(userId,blocked)` и `deleteUser(userId)` (защита: нельзя себя/другого ADMIN; getCurrentUser и так перепроверяет isBlocked → блок вступает в силу немедленно), `respondToTicket(id,response)` (→ANSWERED + уведомление автору), `closeTicket(id)` (→CLOSED). Возврат `AdminActionResult = {ok:true}|{ok:false,error?,fieldErrors?}`.
- **`lib/validations/admin.ts`** — `rejectTournamentSchema`, `respondToTicketSchema`.
- **`lib/enums.ts`** — новые NotificationType: TOURNAMENT_HIDDEN, TOURNAMENT_DELETED, SUPPORT_TICKET_ANSWERED. **`lib/format.ts`** — ROLE_LABEL, SUPPORT_TICKET_STATUS_LABEL/TONE.

### Фронтенд — `app/admin/*`
- `layout.tsx` (`requireAdmin()` + `AdminNav` по 5 разделам, активный пункт) + по странице на раздел (каждая тоже вызывает requireAdmin). Разделы: Обзор (дашборд со StatCard, акцент на «на модерации»/«открытые обращения»), Модерация (`moderation-table.tsx` — очередь PENDING по умолчанию, фильтр статуса/поиск в URL-query, действия одобрить/отклонить-с-раскрывающимся-полем-причины/скрыть/удалить), Пользователи (`user-row.tsx` — блок/удаление, кнопки disabled для себя/ADMIN, прокинут currentAdminId), Организаторы (StatCard-статистика), Обращения (`ticket-card.tsx` — ответ/закрытие).
- Подтверждения деструктивных действий — инлайн «Точно?»/swap кнопки (как `CancelRegistrationButton`), НЕ нативный confirm (гоча браузера). Клиентские компоненты — оптимистичный локальный state (как NotificationsPanel/FavoriteButton), таблица ремонтируется через `key={status-search-page}` при смене фильтров.

### QA (реальный браузер) — всё ✅, 2 нита починены
- Гейт /admin для USER/ORGANIZER → /403, для гостя → /login. Дашборд-счётчики сверены с dev.db. Очередь модерации (фильтр+поиск как AND). **Критичный сценарий автоповышения роли: одобрение PENDING-турнира автора-USER → PUBLISHED + роль автора USER→ORGANIZER (проверено в dev.db) + уведомление + появление в каталоге.** Отклонение (пустая причина не принимается) → HIDDEN+причина, «Отклонён» в профиле автора. Скрытие/мягкое удаление убирают из каталога. Блокировка мгновенно выкидывает активную сессию, заблокированный при входе получает нейтральную ошибку (не палит блок). Ответ/закрытие обращений. Адаптив 390–1400 без overflow. Консоль чистая.
- 🐛 2 косметических: склонение «1 заявок»→«1 заявка» в moderation-table.tsx и подзаголовок /admin/organizers (говорил «с ролью Организатор», а запрос включает и ADMIN) — **оба починил**.
- После деструктивных тестов БД **пересеяна** (`npm run db:seed`) в чистое демо-состояние (3 юзера, 11 турниров, 1 обращение).

### Проверки
- `npm run build` + typecheck + lint — зелёные (роуты `/admin`, `/admin/moderation`, `/admin/users`, `/admin/organizers`, `/admin/support`).

### Дальше
- **Этап 7 — полировка** (`mydebate-qa` + `mydebate-reviewer`): все состояния интерфейса, анимации (появление карточек, hover, переходы), адаптив по всем брейкпоинтам, доступность (клавиатура, контраст, подписи), сквозной user-flow, код-ревью.
- Бэклог мелочей: несуществующий турнир отдаёт 200 вместо 404; редактирование настроек профиля (нет экшена); пользовательская форма создания обращения в поддержку (тикеты пока только из seed); edit турнира организатором.

---

## 2026-07-11 — Этап 7 (полировка + достройка фич) — MVP ГОТОВ

#done

Проведён код-ревью (`mydebate-reviewer`) + двойная сквозная QA (`mydebate-qa`), затем правки агентами `mydebate-auth`/`mydebate-backend`/`mydebate-frontend`, финальная QA-верификация. Схема не менялась, миграций нет.

### Ревью и QA — итог диагностики
- **Критичных дыр безопасности/доступа НЕТ** — requireAdmin на всех admin-экшенах, публичные queries отдают только PUBLISHED (не палят непубличное), проверки владельца в cancelRegistration/toggleFavorite/markNotificationRead, proxy-гейты согласованы, upload валидирует тип/размер/авторизацию, без path traversal.
- Найдено и исправлено: 1 крит-баг сессии + серия бизнес-логики/UX.

### Багфиксы
- 🔴 **Повторный вход/регистрация под активной сессией стирал сессию** (auth): `loginUser`/`registerUser` вызывали `signIn` поверх активной сессии → кука обнулялась. Фикс: гварды на страницах /login,/register (авторизованного редиректим на /profile/callbackUrl до рендера формы) + защита в экшенах (`await auth()` первым, redirect без signIn). Свежий флоу гостя не затронут.
- 🟡 **Дедлайн регистрации как UTC-полночь** (backend): `<input type=date>` → `new Date("YYYY-MM-DD")` = UTC 00:00, регистрация «закрывалась» в начале дня (в UTC+5 — до местной полуночи). Фикс: `isRegistrationOpen` в lib/format.ts сравнивает с концом дня (`setUTCHours(23,59,59,999)`). Все места вызывают этот единый хелпер — правка в одной точке.
- 🟡 **`registrationType=EXTERNAL` игнорировался** (frontend): всех вели во внутреннюю форму, externalUrl терялся. Фикс: CTA на app/tournaments/[id]/page.tsx ветвится (EXTERNAL → ссылка на externalUrl target=_blank; PLATFORM → внутренняя форма); внутренняя /register для EXTERNAL-турнира редиректит прочь.
- 🟡 Телефон в форме регистрации не преднаполнялся из профиля → пофикшено.
- 🔵 Мёртвый код `getTournamentForModeration` удалён; лишние префиксы `/favorites`,`/notifications` убраны из proxy.ts; `data-scroll-behavior="smooth"` на <html> (убрал dev-warning).

### Полировка (UI)
- Брендированные `app/not-found.tsx` (русская 404 вместо дефолтной англ.) и `app/error.tsx` (error boundary без стека). `loading.tsx`-скелетоны для /profile и /tournaments/create.
- Анимации: `.animate-fade-in` (@keyframes + `prefers-reduced-motion`) со стаггером — каталог, StatCard-дашборд/организаторы, строки таблицы модерации; hover-состояния карточек.
- Мобильный таб-бар админки (390px) получил fade-градиент-индикатор прокрутки.

### Достроены 3 отложенные фичи из ТЗ (по решению заказчика — «все 3»)
- **Форма обращений в поддержку** на /contacts: `lib/actions/support.ts::createSupportTicket` (+ validations/support.ts, NotificationType.NEW_SUPPORT_TICKET — уведомление админам), client `components/support/contact-form.tsx` с преднаполнением для авторизованного. Раздел «Обращения» в админке больше не пуст в проде.
- **Редактирование турнира организатором**: `getTournamentForEdit(id,userId)` (только владелец, иначе null) + `editTournament` (правит ТОЛЬКО description/обложку/логотип/разделы; даты/цена/место неизменны — read-only с отсылкой в поддержку; статус не трогается → без повторной модерации; PUBLISHED-турнир уведомляет участников об изменении). Роут app/tournaments/[id]/edit (переиспользует image-upload-field/sections-editor). Ссылка «Редактировать» в «Мои турниры».
- **Список участников для организатора**: `listTournamentParticipants(id,requesterId)` (только владелец, иначе null) + app/tournaments/[id]/participants (снимок полей заявки, пустые поля скрыты, EmptyState). Ссылка «Участники (N)» в «Мои турниры».

### Финальная QA (реальный браузер) — ноль регрессий
- Все 3 фичи ✅ (включая контроль доступа: не-владелец/гость на /edit и /participants → notFound/redirect — проверено). Все 6 багфиксов ✅ (сессия переживает повторный /login; дедлайн-сегодня открыт; EXTERNAL ведёт наружу; 404 брендированная; телефон преднаполнен; scroll-warning исчез). Консоль чистая, адаптив 390–1440 без overflow.
- БД пересеяна в чистое демо-состояние (3 юзера, 11 турниров, 1 обращение).

### Проверки
- `npm run build` + typecheck + lint — зелёные, 24 роута (новые: /tournaments/[id]/edit, /tournaments/[id]/participants, форма на /contacts).

### Итог: **MVP готов** — все этапы 0–7 закрыты.
Вне MVP (бэклог): Kaspi-оплата (отложено), Google OAuth (заглушён, нет креденшелов), глубокий аудит доступности (был спот-чек).

---

## 2026-07-11 — Глубокий аудит доступности + сквозная проверка + починка

#done #a11y

Закрыт бэклог-пункт «глубокий аудит доступности». Провёл параллельно: аудит кода/a11y (`mydebate-reviewer`) + сквозную проверку живого сайта (`mydebate-qa`, реальный прогон через Playwright), затем починку всех находок (`mydebate-frontend`), финальную верификацию сделал сам (build/lint/код/браузер).

### Сквозная проверка сайта (QA) — функционально всё PASS
- Гость, вход/выход, session-aware навбар, каталог (поиск/фильтры/пагинация/детали/404), регистрация на турнир (PLATFORM/EXTERNAL/дедлайн — серверная проверка подтверждена), избранное, профиль (7 вкладок), мастер создания → PENDING, контроль доступа edit/participants (владелец/чужой/гость), админка (модерация, автоповышение роли, блокировка, обращения). Консоль без ошибок, адаптив 390–1440, бургер.
- 🐛 **Найден новый баг (сред):** на `/register` после неудачной отправки поля Имя/Фамилия/Email молча очищались (пароли — сохранялись).

### Аудит доступности — находки (все исправлены)
- 🔴 `aria-describedby` нигде не связан с текстом ошибки → во всех формах (`FieldError` теперь принимает `id`).
- 🔴 Динамика не объявлялась скринридеру → `aria-live`/`role=status` (счётчик каталога, чеклист пароля, успех-экраны) + `role=alert` на инлайн-ошибках админки/отмены.
- 🔴 Группы кнопок-переключателей (Формат/Тип/Языки/Способ регистрации) без семантической группы → `role="group"` + `aria-labelledby`.
- 🟡 Кнопка «показать пароль» недостижима с клавиатуры (`tabIndex={-1}`) → убрано + `aria-pressed` + динамический `aria-label`.
- 🟡 Контраст `placeholder:text-muted/70` (~2.7:1) → `placeholder:text-muted` (проходит AA).
- 🟡 Focus не переходил на шаг мастера (+ `aria-live` «Шаг X»); бургер без Escape/focus → `aria-controls`+`Escape`+возврат фокуса; `aria-current` в шапке; skip-to-content (`#main`); `prefers-reduced-motion` → `animation: none` для spin/pulse; focus у инлайн-подтверждений.

### Продуктовая недоделка (закрыта)
- 🔴 **Обложка/логотип турнира загружались, но нигде не выводились** → выведены в `tournament-card.tsx` (обложка с fallback на градиент) и в hero страницы турнира (`coverImage`/`logoImage`).

### Баг из QA (починен)
- 🐛 Очистка полей `/register` → `firstName/lastName/email/phone` сделаны контролируемыми (React 19 автосбрасывал неконтролируемые поля после Server Action; controlled value перекрывает автосброс — как уже было у паролей). Значения переживают неудачную отправку.

### Верификация
- `npm run build` + `npm run lint` — зелёные (24 роута, 0 ошибок; только 6 старых warning в `seed.ts`).
- Браузер: главная, вход→профиль, каталог, деталь — рендерятся после правок, консоль чистая, вёрстка цела, skip-ссылка в DOM, aria-label избранного корректны.
- Grep-подтверждение всех a11y-добавлений в коде.

### Примечания
- Вход через браузерную автоматизацию не проходил (контролируемый React-инпут не обновлялся синтетическим вводом) — **это артефакт автоматизации, не баг сайта**: реальный пользователь и QA-агент логинятся штатно.
- `mydebate-frontend` упал из-за сетевой ошибки API ровно перед своим build/lint (все правки уже были на диске) — верификацию догнал вручную.
- БД после QA почти чистая (откат случайно затронутого турнира; лишними остались 1 закрытое обращение + пара уведомлений от тестовых флоу). Для идеального демо: `npm run db:seed`.

### Осталось (бэклог, вне текущей задачи)
- Kaspi-оплата (отложено), Google OAuth (нет креденшелов).
- Обложки в каталоге показывают fallback, пока организатор не загрузит картинку (feature готова).
- Точечные a11y-ниты (breadcrumbs как `ol/li`, dead-ссылки соцсетей в футере) — не блокеры.

---

## 2026-07-11 — Админ: ручная смена роли пользователя

#done #admin

Расширение админ-панели по запросу заказчика («усилить админа»). Схема НЕ менялась (роль — существующее поле `User.role`).

### Реализовано
- **`lib/actions/admin.ts` → `setUserRole(userId, role)`** — назначение роли (USER/ORGANIZER/ADMIN) вручную, в отличие от авто-повышения `maybePromoteToOrganizer`. Защиты: `requireAdmin`, **нельзя менять собственную роль** (иначе админ может понизить себя и потерять доступ), zod-валидация роли, «уже эта роль». Уведомляет пользователя (`ROLE_CHANGED`). `getCurrentUser` перечитывает роль из БД → вступает в силу немедленно.
- **`lib/enums.ts`** — новый `NotificationType.ROLE_CHANGED`. **`lib/validations/admin.ts`** — `setUserRoleSchema`.
- **`components/admin/user-row.tsx`** — селектор роли (оптимистичное обновление бейджа + откат при ошибке, задизейблен для своего аккаунта, `aria-label`), в стиле существующих блок/удаление.

### Проверка
- `npm run build` + `npm run lint` — зелёные (0 ошибок).
- Браузер (под `admin@mydebate.kz`): повышение Санжара USER→ORGANIZER (бейдж сменился, **записалось в БД**), откат ORGANIZER→USER (тоже записалось). Свой аккаунт админа — селектор/блок/удаление задизейблены. Консоль чистая.

### Примечание
- Уточнили: админ-панель существовала и раньше (модерация с удалением, блок/удаление юзеров, обращения, дашборд) — путаница была из-за того, что смотрели под организатором, а не под админом. Смена ролей — новое сверху.
- Возможные следующие усиления админа (обсуждается): редактировать/удалять любой турнир; создавать турнир сразу опубликованным; добавлять пользователей вручную.

---

## 2026-07-12 — Админ: ещё 3 усиления (edit-any / create-published / add-user)

#done #admin

По решению заказчика («да, все три») — доделаны три возможности из бэклога усилений админа. Бэкенд — вручную, UI — агентом `mydebate-frontend`. Схема НЕ менялась.

### 1. Редактирование любого турнира админом
- `lib/tournaments/queries.ts` → `getTournamentForEdit(id, userId, isAdmin=false)` — при `isAdmin` пропускает проверку владельца.
- `lib/actions/tournaments.ts` → `editTournament` — админ правит любой турнир (тот же ограниченный набор полей: описание/обложка/логотип/разделы; даты/цена/место неизменны). Для не-владельца-не-админа по-прежнему «не найдено» (не палим).
- `app/tournaments/[id]/edit/page.tsx` — прокидывает `isAdmin` (роль ADMIN).
- UI: `components/admin/moderation-table.tsx` — ссылка «Редактировать» (иконка `SquarePen`) в каждой строке очереди.

### 2. Создание турнира сразу опубликованным (админ, минуя модерацию)
- `lib/actions/tournaments.ts` → `createTournament` — если автор ADMIN, статус `PUBLISHED` (не `PENDING`), без уведомлений в очередь модерации, своё сообщение «создан и сразу опубликован».
- UI: `app/tournaments/create/page.tsx` прокидывает `isAdmin`; `components/tournaments/create-wizard.tsx` — инфо-баннер (`ShieldCheck`) «Вы создаёте турнир как администратор — он будет опубликован сразу, без модерации».

### 3. Добавление пользователя вручную из админки
- `lib/actions/admin.ts` → `createUserByAdmin(prevState, formData)` — `requireAdmin`, валидация (`createUserByAdminSchema`, переиспользует `email/passwordSchema` из validations/auth), уникальность email, bcrypt-хеш, выбор роли, БЕЗ автологина. Тип `CreateUserActionState`.
- `lib/validations/admin.ts` → `createUserByAdminSchema`.
- UI: `components/admin/create-user-form.tsx` (контролируемые инпуты, `PasswordInput`, `FieldError`+`aria-describedby`, `role=alert`/`role=status`, сброс при успехе) + `components/admin/create-user-toggle.tsx` (раскрытие, `aria-expanded/controls`), смонтировано в `app/admin/users/page.tsx`.

### Проверка (реальный браузер под admin@mydebate.kz)
- Фича 1: открыл редактирование чужого турнира «Debate Academy Cup» (владелец Ерлан Сапаров) → форма отдалась админу. ✅
- Фича 2: баннер виден в мастере на всех шагах. ✅
- Фича 3: создал «Тест Тестов / Организатор» → зелёный баннер успеха + строка в списке (потом удалил). ✅
- `npm run build` + `npm run lint` — зелёные (0 ошибок, только 6 старых warning в seed.ts). Консоль чистая. `requireAdmin`/`requireUser` на месте, чужие турниры не палятся не-админам.
- БД после тестов **пересеяна** в чистое демо (3 юзера, 11 турниров, 1 обращение).

---

## 2026-08-09 — Подготовка к деплою: шаг 1 (правки в коде)

#done #deploy

Полный план развёртывания — [[deploy]]. Здесь только то, что сделано в коде.

### Блокеры деплоя (каждый ронял бы прод)
- **Prisma Client не собрался бы на чистой машине.** `generated/prisma` в `.gitignore`, но `prisma generate` нигде не вызывался — на CI/Vercel сборка падала бы на `import "@/generated/prisma/client"`. В `package.json`: `build: "prisma generate && next build"` + `postinstall: "prisma generate"`.
- **Загрузка картинок писалась на локальный диск.** `app/api/uploads/tournament-image/route.ts` → `public/uploads/tournaments`; на Vercel ФС read-only (кроме `/tmp`) и эфемерна, обложки пропадали бы. Теперь двухрежимно: есть `BLOB_READ_WRITE_TOKEN` → Vercel Blob (абсолютный URL), нет → прежняя запись на диск (локалка и self-hosted с постоянным диском). Хост Blob (`*.public.blob.vercel-storage.com`) добавлен в `remotePatterns` (`next.config.ts`). Пакет `@vercel/blob@2.7.0`.
- **NextAuth за прокси.** `trustHost: true` в `auth.ts` — без него любой вход на проде падает с `UntrustedHost` (настоящий домен приходит в `X-Forwarded-Host`).
- **Конфликт peer-зависимостей.** `nodemailer@9` против `peerOptional ^7 || ^8` у next-auth: `npm ci` по lock-файлу проходил, но любой `npm install <пакет>` падал с ERESOLVE (на этом и споткнулась установка `@vercel/blob`). Закрыто через `web/.npmrc` (`legacy-peer-deps=true`), чтобы локалка, CI и Vercel вели себя одинаково. Версию nodemailer НЕ откатывал: её подняли ради закрытия уязвимости (коммит `e1f619f`), а next-auth тянет её только для неиспользуемого провайдера Nodemailer.

### 🐛 Найденный по дороге баг: подделка ссылки на обложку роняет каталог
`coverImage`/`logoImage` валидировались как произвольная строка ≤500 символов, хотя приходят из `formData` (то есть подделываются POST'ом в обход формы), сохраняются в БД и подставляются в `next/image`. А `next/image` бросает исключение на хосте, которого нет в `remotePatterns` — то есть чужой URL в этом поле уронил бы страницу турнира и каталог **для всех посетителей**, не только для автора.
- `lib/validations/tournament.ts` → `imageUrlSchema`: строгий whitelist ровно из двух форм, которые может вернуть наш загрузчик (локальный путь `/uploads/tournaments/<uuid>.<ext>` и URL Vercel Blob). Заодно отсекает `javascript:`/`data:` и обход каталога.
- `tests/image-url-validation.test.ts` — 9 кейсов на границу (валидные формы + чужой хост, `javascript:`, `data:`, `../`, `http` вместо `https`, хост-двойник `...vercel-storage.com.evil.com`, превышение длины).

### Попутно
- `prisma.config.ts` берёт `DIRECT_URL ?? DATABASE_URL` — миграции не проходят через pgbouncer в transaction-режиме, а рантайму нужен именно пулер.
- Появился `web/.env.example` со всеми переменными и пояснениями; в `.gitignore` добавлено исключение `!.env.example`.
- Удалены пустые папки-мусор в корне репозитория: `config`, `prefix`, `set`, `export PATH=~` (следы сорвавшейся `npm config set prefix`).

### Проверка
- `rm -rf .next generated && npm run build` — зелёный (Prisma Client сгенерировался с нуля).
- `npm run lint` — 0 ошибок. `npx tsc --noEmit` — 0 ошибок.
- `npm test` — 38 тестов в 5 файлах, все зелёные.
- Прод-развёртывания ещё НЕ было: база, домен, Blob-стор и переменные окружения — шаги 2–5 в [[deploy]].
