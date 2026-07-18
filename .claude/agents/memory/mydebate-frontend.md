# Memory — mydebate-frontend

Private working memory for the mydebate-frontend agent. Read this at the start of every run; append durable facts (decisions + why, current state, conventions) after finishing. Keep it current — correct or delete outdated entries. One concise entry per fact.

## Log

### Этап 3 — публичные страницы (done)
Fixed the guest-only navbar bug and built all 5 public pages (Главная, О нас,
Помощь, Правила, Контакты) + `/privacy` + `/terms` stubs. `npm run build`
green (zero TS errors), `npm run lint` clean (only pre-existing seed.ts
warnings, unrelated).

**Session-aware Navbar (bug fix):**
- `web/app/layout.tsx` is now `async`, calls `await getCurrentUser()` (from
  `lib/auth/session.ts` — NOT raw `auth()`, to reuse the single source of
  truth that also re-checks `isBlocked`/role in DB) and passes `user` to
  `<Navbar user={user} />`.
- `web/components/layout/navbar.tsx`: now takes `{ user: CurrentUser | null }`
  prop (type imported from `@/lib/auth/session`). Guest branch unchanged
  (Войти/Регистрация). Logged-in branch: outline "Создать турнир" (always
  shown, both guest+user) → optional ghost "Админ-панель" link (`/admin`,
  only if `role === Role.ADMIN`, page doesn't exist yet — that's fine/expected)
  → ghost link to `/profile` showing a small `Avatar` (initials chip or
  `next/image` if `user.image` set) + first name → `<form action={logoutUser}>`
  with an outline submit button "Выйти" (`logoutUser` from
  `lib/actions/auth.ts`, already existed, does `signOut({redirectTo:"/"})`).
  Mirrored in both desktop bar and mobile burger menu. Active-link logic and
  burger toggle untouched.

**New reusable UI primitives** (all under `web/components/ui/`, follow same
`cn()` + Tailwind-token conventions as existing Button/Badge/Card):
- `empty-state.tsx` → `EmptyState({ icon?, title, description?, action?, className? })` — dashed-border box, used for "Пока нет опубликованных турниров." on the homepage when the upcoming-tournaments query returns `[]`, and for FAQ "Ничего не найдено" empty search results.
- `illustration-panel.tsx` → `IllustrationPanel({ icon: LucideIcon, variant: "light"|"dark", className?, iconClassName? })` — gradient + dot-grid decorative placeholder (no real image assets exist in mockups) with a centered rounded icon box. `variant="dark"` = navy→brand gradient (Home hero); `variant="light"` = brand-50→white (About/Help/Rules/Contacts heroes). Reuse this instead of building new placeholders.
- `breadcrumbs.tsx` → `Breadcrumbs({ items: {label, href?}[], className? })` — "Главная / Текущая страница" pattern (Rules, Contacts, Privacy, Terms).
- `feature-card.tsx` → `FeatureCard({ icon: LucideIcon, title, description, className? })` — icon-in-rounded-square + title + text, used in Home "Преимущества платформы" (4) and About "Наша миссия" (4).
- `cta-banner.tsx` → `CtaBanner({ icon: LucideIcon, title, description, children, className? })` — navy full-width block w/ dot-grid decoration + icon chip + heading/subtext + action buttons as `children`. Used in Home final CTA (1 button) and About final CTA (2 buttons).
- `components/contact-card.tsx` (top-level, not `ui/`, since it's domain-ish but reused across 2 pages) → `ContactCard({ icon, label, value, action })` — icon typed as `React.ComponentType<{size?, className?}>` (NOT `LucideIcon`) specifically so it also accepts the hand-rolled `InstagramIcon`/`TikTokIcon` from `components/icons/social.tsx` (those don't share lucide's prop shape). Used identically on `/help` and `/contacts` (Телефон/Email/Instagram/TikTok, 4 cards each).
- `components/tournaments/tournament-card.tsx` → `TournamentCard({ tournament, favoriteSlot? })`. `tournament: TournamentCardData = { id, title, city, startDate, registrationDeadline, format, level }` (Date fields accept `Date | string`, safe for both Prisma objects and any future JSON-serialized props). Renders cover gradient + open/closed registration badge (`isRegistrationOpen(registrationDeadline)`), MapPin/Calendar row, format+level chips, "Подробнее →" button to `/tournaments/[id]`. **`favoriteSlot` is an intentionally-unused extension point** (renders top-right over the cover) for the Этап 4 agent to drop in a ❤️ favorite-toggle client component without having to touch this file — don't rebuild the card, just pass `favoriteSlot={<FavoriteButton .../>}`.
- `lib/format.ts` → `FORMAT_LABEL`/`LEVEL_LABEL` (enum→display-string maps, e.g. `DEBATES`→"Дебаты", `MUN`→"MUN", `BEGINNER`→"Beginner"/"Intermediate"/"Advanced" — matches the mockup's English level chips exactly), `formatDateRu(date)` ("11 мая 2024" via `Intl.DateTimeFormat("ru-RU", {day,month:"long",year})`), `isRegistrationOpen(deadline)`. Reuse these — don't reimplement date/label formatting on the catalog or detail pages in Этап 4.

**FAQ (Помощь page) — Context pattern for state shared across distant sections:**
Search input lives in the Hero block, the filtered accordion lives in a
separate section lower on the page — solved with a `FaqProvider` (client,
`components/help/faq-provider.tsx`, exposes `useFaqQuery()`) wrapping from
Hero through the FAQ section in `app/help/page.tsx`; `FaqSearchInput` and
`FaqAccordion` (both client, `components/help/`) each consume the context
independently. `components/help/faq-data.ts` holds the 7 FAQ items (plain
data, no "use client"). Accordion: single-open (`openId` state), first item
open by default, `aria-expanded`/`aria-controls`/`role="region"` wired.
**If Этап 4 needs FAQ-like accordions elsewhere, this Provider pattern (not
prop drilling) is the established approach for state shared between two
non-adjacent JSX subtrees composed from a Server Component page.**

**Data source for Home "Ближайшие турниры":** direct `prisma.tournament.findMany({ where: { status: TournamentStatus.PUBLISHED, startDate: { gte: new Date() } }, orderBy: { startDate: "asc" }, take: 3 })` in `app/page.tsx` (Server Component, no client fetch) — this is a public "showcase" query on an otherwise auth-gated model; kept minimal `select` (id/title/city/startDate/registrationDeadline/format/level) matching `TournamentCardData`.

**Pages built:** `/` (rewritten, 6 blocks), `/about`, `/help`, `/rules`, `/contacts` (new — footer already linked here since Этап 0 but page 404'd before now), `/privacy`, `/terms` (simple stub pages, styled consistently, not in the task's 5-page priority but required since footer links to them and they're in `proxy.ts` PUBLIC_PATHS already).

**Deviation from task wording:** task said "get user via `await auth()`"; used `getCurrentUser()` from `lib/auth/session.ts` instead (existing project convention per `_shared.md` — "Centralize the session→role helper... reuse everywhere"; also gives richer fields firstName/lastName/image needed for the Navbar avatar, and re-checks `isBlocked` in DB unlike raw `auth()`/JWT).

**Not done / left for later stages:** ❤️ favorite-toggle on `TournamentCard` (extension point exists, see `favoriteSlot` above); `/admin` page (Navbar links to it for ADMIN role, page doesn't exist yet — expected per task); Tabs/ProgressBar/Spinner primitives (not needed by any Этап 3 page, still not built — build when Этап 4 needs them, don't scaffold speculatively).

### Этап 4 — каталог / деталь турнира / регистрация / профиль (done)
Built the auth-gated catalog, tournament detail, registration form, and full
profile dashboard on top of the backend agent's `lib/tournaments/queries.ts`,
`lib/actions/{registrations,favorites,notifications}.ts`,
`lib/profile/queries.ts` (didn't touch their logic, only called it — except
one required fix, see "Bug fix" below). `npm run build` and `npm run lint`
both green (zero errors; only pre-existing unrelated `seed.ts` warnings).
Verified end-to-end at runtime against the already-running dev server (real
login via NextAuth credentials over curl, real seeded data) — catalog
filters/search/pagination/empty-state, detail hero + already-registered
badge, register form open/already-registered/closed states, and all 6 profile
tabs all confirmed rendering real data with zero server errors.

**Bug fix required in a backend-agent file (`lib/actions/registrations.ts`):**
this Next.js/Turbopack version enforces "`use server` files may only export
async functions" **only once the module is actually pulled into a client
bundle** — which happens as soon as a client component (`register-form.tsx`)
imports `registerForTournament` for `useActionState`, exactly as the backend
agent's own memory doc says to do. The co-located `export const
REGISTRATION_SUCCESS_MESSAGE = "..."` in that same file then broke the
**entire build** (not just a lint warning — Turbopack hard-fails and every
named export of the file, including the async functions, becomes
"doesn't exist"). Fix: moved the constant (text unchanged) to
`lib/format.ts` (already the shared display-strings module) and
`lib/actions/registrations.ts` now `import`s it from there instead of
defining/exporting it — re-exporting it from the action file was tried too
and hits the exact same rule, so the single source of truth had to move to a
plain (non-`"use server"`) module. `GENERIC_ERROR` in the same file was never
exported so needed no change. Flagged inline in both files. **Any other
`"use server"` file must not co-export non-function constants if any of its
functions are ever bound into a client `useActionState` call** — audit
`lib/actions/*.ts` if this pattern comes up again.

**New reusable UI primitives** (`web/components/ui/`):
- `select.tsx` → `Select` — styled `<select>` matching `Input`'s look
  (border/focus ring), `invalid`/`wrapperClassName` props. Used by catalog
  filters and the registration form's experience-level/language dropdowns.
- `pagination.tsx` → `Pagination({ page, totalPages, buildHref: (page) => string, className? })`
  — plain `<Link>`-based (no client JS needed), numbered pages + prev/next
  arrows + `…` ellipsis collapsing (keeps first, last, and a ±1 window around
  current). Caller builds the href per page (usually rebuilding
  `URLSearchParams` from current filters). Returns `null` if `totalPages <= 1`.

**New domain components** (`web/components/tournaments/`):
- `favorite-button.tsx` → `FavoriteButton({ tournamentId, initialFavorited?, className? })`
  — client, optimistic ❤️ toggle calling `toggleFavorite` (from
  `lib/actions/favorites.ts`), reverts on `{ok:false}`. Fills the
  `TournamentCard`'s `favoriteSlot` extension point everywhere a card is
  rendered (catalog, detail hero, profile favorites tab) — always pass
  `initialFavorited` from a one-shot `getFavoriteTournamentIds(userId)` call
  in the Server Component page, never fetch it per-card.
- `filters-bar.tsx` → `FiltersBar({ cities: string[] })` — client, the
  catalog's live filter panel (search + Формат/Тип/Город/Дата/Уровень selects
  + sort + reset). Writes to URL query via `router.replace` (no full reload);
  debounces the search input (400ms) before touching the URL so typing
  doesn't spam navigations. **State-sync gotcha**: syncing the local `search`
  input from `searchParams` (needed for the reset button / direct links) is
  done by comparing-and-setting during render (React's documented
  "adjusting state when a prop changes" pattern), NOT inside a `useEffect` —
  this project's ESLint config (`react-hooks/set-state-in-effect`) hard-fails
  the build on synchronous `setState` in an effect body. Reuse this render-time-sync
  pattern instead of `useEffect` if you need to mirror external state into
  local state elsewhere.

**Pages built:**
- `/tournaments` (`app/tournaments/page.tsx` + `loading.tsx`) — Server
  Component reads `await searchParams` (`search/format/locationType/city/level/date/sort/page`),
  calls `listTournaments(...)` + `getAvailableCities()` (wrapped in try/catch
  → `loadError` state renders "Не удалось загрузить данные." rather than
  crashing), renders `FiltersBar`, a `Найдено N турниров` counter (Russian
  pluralization helper `pluralizeTournament` inlined in the page), the
  `TournamentCard` grid (each wrapped in `.animate-fade-in` with a small
  staggered `animationDelay`, capped at index 8 so late items don't have a
  silly-long delay) with `FavoriteButton` in `favoriteSlot`, `Pagination`,
  and a `CtaBanner` ("Не нашли подходящий турнир?" → Создать
  турнир/Связаться с нами). `EmptyState` for zero results.
- `/tournaments/[id]` (`page.tsx` + `not-found.tsx` + `loading.tsx`) — `await params`,
  `getTournamentDetail(id)` → `notFound()` if null. Navy hero (badge, title,
  date/city/type, format+level chips, ❤️, register CTA — swapped for the
  user's own `REG_STATUS_LABEL` badge if `getMyRegistrations(user.id)`
  contains this tournament, since there's no dedicated
  "get my registration for tournament X" query — reused the existing
  granular one instead of asking backend for a new one). Body: description
  card, sections grid (heading "Комитеты" if `format === MUN` else "Разделы
  турнира", section entirely omitted if `sections.length === 0`), sidebar
  (Детали турнира / Ключевые даты / Организатор cards), final `CtaBanner`.
  Social icons for organizer instagram/telegram reuse
  `components/icons/social.tsx` (`InstagramIcon`/`TelegramIcon`) — lucide-react
  in this project's version (1.23.x) ships **no brand/social icons at all**
  (confirmed via `Object.keys(require('lucide-react'))`), don't try
  `Instagram`/`Send` from `lucide-react` directly, it 404s the build.
- `/tournaments/[id]/register` (`page.tsx` + `register-form.tsx`) —
  `requireUser(callbackUrl)`, `getTournamentDetail` (`notFound()` if null),
  then **one of three states** instead of always showing the form: dedline
  passed → `EmptyState` "Регистрация завершена."; already registered
  (checked via `getMyRegistrations`) → `EmptyState` "Вы уже зарегистрированы…";
  else the real form + a sidebar summary card (cover gradient, date/city/format,
  dедлайн/стоимость, info note) — deliberately **no payment/receipt step**
  per task instructions (matches `lib/validations/registration.ts` field-for-field:
  fullName/gradeOrCourse/schoolOrUniversity/phone/contactEmail,
  teamName/teammateNames/experienceLevel/preferredLanguage/additionalInfo
  with a live `0/500` counter, single `agree` checkbox). `preferredLanguage`
  select options come from `parseLanguages(tournament.languages)` (falls back
  to the three standard languages if the tournament didn't set any). On
  `state.success`, the form itself swaps to an inline success card showing
  `state.message` (server-provided text, exact spec string) with buttons to
  `/profile?tab=applications` and back to the tournament — no redirect, so
  the user can still read the confirmation text.
- `/profile` (**full rewrite** of the Этап 2 stub) — tabs via `?tab=overview|tournaments|applications|favorites|notifications|settings`
  (`ProfileSidebar` renders the 6 links + unread-count badge + a
  `<form action={logoutUser}>` "Выйти" button, all real `<Link>`s so
  bookmarkable/shareable). `getProfileDashboard(user.id)` covers
  overview/tournaments/favorites/notifications tabs in one call;
  `applications` tab additionally calls `getMyRegistrations(user.id)` (needs
  ALL registrations, not just upcoming/past) plus a `CancelRegistrationButton`
  (client, confirm-then-call `cancelRegistration`, only rendered for
  future-dated tournaments). `notifications` tab uses `NotificationsPanel`
  (client, optimistic mark-read/mark-all-read calling
  `markNotificationRead`/`markAllNotificationsRead`). **Extra direct-prisma
  read** in the page itself (same precedent as the Home page's direct
  `prisma.tournament.findMany` for data not covered by a shared query
  function): `prisma.user.findUnique({select:{phone,city,bio,school,major,experience,level,languages}})`
  — `CurrentUser`/`getCurrentUser()` deliberately only returns a minimal
  session-shaped subset (id/email/firstName/lastName/role/isBlocked/image),
  but the `User` model actually has all these extra profile fields already in
  the schema; reading them directly in the page (not modifying
  `lib/auth/session.ts`, which is a shared cross-cutting helper) populates
  the navy `ProfileHeader` (phone/city/bio) and the overview tab's "О себе"
  card (level/languages/experience/school/major) faithfully from real data
  instead of hardcoding mockup placeholders. `settings` tab is intentionally
  a read-only summary + "редактирование появится позже" note — no
  update-profile Server Action exists yet in the backend contract, building
  a fake form would be dishonest UX.
- New `components/profile/` files: `profile-header.tsx` (`ProfileHeader`,
  navy card + 3-stat row), `profile-sidebar.tsx` (`ProfileSidebar`,
  exports `ProfileTab` type — reuse this union instead of redefining tab ids
  elsewhere), `registration-row.tsx` (`RegistrationRow({registration, action?})`
  — shared list row for upcoming/past/applications, `action` slot holds the
  cancel button when applicable), `cancel-registration-button.tsx`,
  `notifications-panel.tsx`.

**`lib/format.ts` additions:** `LOCATION_TYPE_LABEL` (ONLINE/OFFLINE →
Онлайн/Офлайн), `REG_STATUS_LABEL` + `REG_STATUS_TONE` (RegistrationStatus →
Russian label + matching `Badge` tone: PENDING→orange, ACCEPTED→blue,
CONFIRMED→green, WAITLIST→gray), `formatPrice(price)` (`"5 000 ₸"` /
`"Бесплатно"` if falsy), and `REGISTRATION_SUCCESS_MESSAGE` (see "Bug fix"
above for why it lives here and not in `lib/actions/registrations.ts`).

**`app/globals.css` addition:** `.animate-fade-in` keyframe utility (opacity+translateY,
0.4s ease-out, respects `prefers-reduced-motion`) — the light card-appear
animation spec §8 asks for; reuse instead of adding another animation utility.

**Not done / deviations:** tournament-create wizard (`/tournaments/create`,
3-step, linked from Navbar/CTAs but page doesn't exist yet — out of scope for
this task, someone else's job); organizer "Мои турниры" management section
and all `/admin` pages — out of scope; "Настройки" tab has no working
edit/password-change/avatar-upload (no backing Server Action yet — flagged
inline, don't build fake forms); no dedicated "get my registration status for
one tournament" query exists, reused `getMyRegistrations` (returns ALL,
filtered client-side by tournament id) — fine for the current seeded data
volume, but flag to backend agent if a user's registration list ever grows
large enough that this becomes a real N+1-ish concern (it's a single query
either way, just returns more rows than needed).

### Этап 5 — мастер создания турнира + "Мои турниры" в профиле (done)
Built `/tournaments/create` (3-step wizard) on top of the backend agent's
`lib/actions/tournaments.ts` (`createTournament`), `lib/validations/tournament.ts`
(`step1Schema`/`step2Schema`/`step3Schema`), and the image-upload Route Handler
(`POST /api/uploads/tournament-image`) — didn't touch any of those, only
called them. Also wired `listMyTournaments` into `/profile?tab=tournaments`.
`npm run build` and `npm run lint` both green (zero errors, only pre-existing
unrelated `seed.ts` warnings). Verified end-to-end against the running dev
server: guest → 307 to `/login?callbackUrl=/tournaments/create` (proxy.ts's
existing `/tournaments` prefix already covers it, no proxy change needed);
logged-in organizer → 200, page renders all 3 step labels; `/profile?tab=tournaments`
renders real seeded organizer tournaments with correct status badges
(PENDING→"На модерации" orange, PUBLISHED→"Опубликован" green).

**New reusable UI primitive:** `components/ui/progress-bar.tsx` → `ProgressBar({ steps: {label, description?}[], currentStep })`
— numbered circles (done=check icon+filled, active=filled+ring, upcoming=outline),
connecting line between steps, labels hidden below `sm:` breakpoint in favor of
a "Шаг X из N: Label" text line. Generic, not tournament-specific — reuse for
any future multi-step flow instead of rebuilding.

**Wizard architecture** (`components/tournaments/create-wizard.tsx`, client,
mounted from `app/tournaments/create/page.tsx` which just does `requireUser()`
+ header + breadcrumbs): **deliberately does NOT rely on native `<form>` FormData
harvesting across steps** — all field values live in one `useState<WizardValues>`
object on the wizard (type + `INITIAL_WIZARD_VALUES` in
`components/tournaments/create/types.ts`) so switching steps never loses data
even though only the current step's inputs are mounted in the DOM. The `<form
onSubmit>` handler inspects `step`: on 1/2 it zod-validates that step's slice of
`values` (`step1Schema`/`step2Schema`) and either shows `FieldError`s (via
`.flatten().fieldErrors`) or advances `step`; on 3 it validates `step3Schema`
then manually builds a `FormData` (scalars via `fd.set`, `languages` via
repeated `fd.append`, `sections` JSON-stringified into `sectionsJson` per the
backend contract) and calls the `useActionState`-returned `formAction(fd)`
directly as a function (not via the `<form action>` prop) — confirmed valid
per `node_modules/next/dist/docs/.../server-actions.md`: Server Actions can be
"invoked from ... a client-side transition", which is exactly what
`useActionState`'s dispatcher already wraps internally. **Server→client error
sync uses the same render-time reference-compare pattern as `filters-bar.tsx`**
(not `useEffect`, this project's lint hard-fails on synchronous setState in an
effect body): if `state !== handledState` (a mirror state var), merge
`state.fieldErrors` into local `errors` and jump `step` to `getStepForField(firstErrorKey)`
(a small lookup table in `types.ts` mapping each field name to its owning step
1/2/3) — this only matters when server validation catches something the
client's per-step zod schemas didn't (defense in depth, should be rare).
Success screen (`state.success`) replaces the whole wizard with a thank-you
`Card` (same shape as `register-form.tsx`'s), text from `state.message`
(server-provided, exact spec string) plus a static sentence about moderation,
links to `/profile?tab=tournaments` and `/tournaments`.

**Sub-components** (`components/tournaments/create/`, none needs a `"use
client"` directive of their own — only the wizard entry file does, per Next's
module-boundary rule, sub-imports of an already-client module don't need to
redeclare it):
- `types.ts` — `WizardValues`/`WizardSection`/`INITIAL_WIZARD_VALUES`/
  `LANGUAGE_OPTIONS` (fixed 3-language set, same as the register form's
  fallback: Казакша/Русский/English — there's no language-list query, this is
  hardcoded on both forms) / `FieldErrors` / `WizardUpdate` (generic
  `<K extends keyof WizardValues>(key,value)=>void` setter type, passed down to
  every step) / `getStepForField`.
- `step1-basic-info.tsx` — title, format/locationType as button-toggle chip
  pairs (not native radios, for visual parity with the mockup style already
  used elsewhere — `aria-pressed` for a11y), level select, languages as
  toggle chips, city/address/venue **entirely hidden (not just optional) when
  locationType===ONLINE** per task instruction, 3 date inputs, price.
- `step2-content.tsx` — description textarea with a live `N/50 минимум`
  counter (green once past threshold), renders two `ImageUploadField`s
  (cover=wide, logo=square) side by side, renders `SectionsEditor`.
- `image-upload-field.tsx` (also generically reusable, not wizard-specific
  despite living under `create/`) — `ImageUploadField({label, value, onChange,
  required?, shape: "wide"|"square", hint?, errors?})`. Uploads on file
  pick (`fetch("/api/uploads/tournament-image", {method:"POST", body: fd})`),
  local `uploading`/`error` state, preview via `next/image fill` once
  `value` (the returned `/uploads/tournaments/xxx.jpg` path) is set — **works
  with zero `next.config` changes** since it's a same-origin `/public` path,
  not a remote URL, so no `images.remotePatterns` entry needed. X button
  clears `value` back to `""`.
- `sections-editor.tsx` — add/remove up to 20 `{title, description}` entries.
  **Note on server-error mapping**: zod's `.flatten()` only buckets
  `fieldErrors` by `path[0]`, so a nested issue like `sections.3.title` collapses
  into `fieldErrors.sections` as a flat message array with no way to recover
  which index/field — this component's `errors` prop is therefore `string[]`
  (shown once below the list), **not** per-row; don't try to build per-index
  error mapping from a flattened zod error elsewhere in the codebase either,
  same limitation applies.
- `step3-contacts.tsx` — registrationType as two selectable cards (not
  radios), `externalUrl` field conditionally rendered only when
  `registrationType === EXTERNAL`, email/instagram/telegram. Uses
  `InstagramIcon`/`TelegramIcon` from `components/icons/social.tsx` (per the
  established lucide-react-has-no-brand-icons rule) for the two social inputs'
  leading icons.

**"Мои турниры" in profile — resolved the Этап 4 "not yet wired" flag:**
`app/profile/page.tsx`'s existing `tournaments` tab (label "Мои турниры" in
`ProfileSidebar`, unchanged) previously only showed the user's own
*registrations* (participant view) — **kept that section** (relabeled its
heading to "Турниры, в которых вы участвуете" for clarity) and **added a new
section above it**, "Турниры, которые вы организуете", fetching
`listMyTournaments(user.id)` (only queried when `tab==="tournaments"`, same
lazy-fetch precedent as `myApplications`) and rendering each via the new
`components/profile/my-tournament-row.tsx` (`MyTournamentRow`). Shown for
**every** user, not gated on `role===ORGANIZER` — per the backend contract
comment in `lib/actions/tournaments.ts`, `createTournament` accepts "any
authenticated role", so a plain USER can already have organized tournaments
pending moderation. Empty state prompts "Создать турнир" (icon `Trophy`);
non-empty always shows a "+ Создать турнир" button in the section header too.
`MyTournamentRow` only makes the row a `<Link>` to `/tournaments/[id]` when
`status === PUBLISHED` (the only status `getTournamentDetail` will actually
return — PENDING/HIDDEN/DRAFT have no viewable detail page today, so those
rows render as plain non-clickable content plus the status badge and, for a
moderation-rejected one, the `rejectionReason` text inline).

**`lib/format.ts` additions:** `TOURNAMENT_STATUS_LABEL`/`TOURNAMENT_STATUS_TONE`
(DRAFT/PENDING/PUBLISHED/HIDDEN/DELETED → label+`Badge` tone) plus
`getTournamentStatusDisplay(status, rejectionReason?)` — **use this helper, not
the raw label map**, because `TournamentStatus` (`lib/enums.ts`) has **no
`REJECTED` value**: moderation rejection is represented as `HIDDEN` +
`Tournament.rejectionReason` set, and the helper special-cases that
combination to show "Отклонён"/red instead of the generic "Скрыт"/gray HIDDEN
label — this distinction is not obvious from the schema alone, flag it to
whoever builds the Этап 6 admin moderation UI too (same status field, same
special-case needed there).

**Not done / left for Этап 6:** admin moderation queue (`/admin/moderation`,
already linked from a notification `link` field per the backend agent's
notes, page doesn't exist); no way for an organizer to edit a tournament
post-creation (spec says only description+sections should be editable
post-publish, but no edit UI or backing action exists yet — `MyTournamentRow`
has no edit button, intentionally, don't add one without a real action to
call).

### Этап 6 — админ-панель (done)
Built all of `/admin*` on top of the backend agent's `lib/admin/queries.ts`
(read-only, no auth check of its own) and `lib/actions/admin.ts` (every fn
`requireAdmin()`s itself server-side already) — didn't touch either file,
only called them. `npm run build` and `npm run lint` both green (zero errors,
only pre-existing unrelated `seed.ts` warnings). Verified end-to-end against
the running dev server via real NextAuth credentials login over curl (admin
seed user): all 5 routes return 200 and render real seeded data (dashboard
counts, 2 PENDING tournaments in the default moderation queue vs. 12 total
with `?status=ALL`, 4 users with correct `currentAdminId` wired for the
self/admin action-disabling, 4 organizer stat cards, the single seeded OPEN
support ticket).

**Defense in depth, matches the task's explicit ask:** `app/admin/layout.tsx`
calls `requireAdmin()` (redirects non-admin/guest before any child renders) —
**and** every one of the 5 page files (`app/admin/{page,moderation/page,
users/page,organizers/page,support/page}.tsx`) *also* calls `requireAdmin()`
itself, even though the layout already covers them; this was a specific task
instruction ("вызывай requireAdmin() в layout/страницах"), not just
belt-and-suspenders by default elsewhere in the codebase — don't remove the
per-page calls as "redundant" if refactoring later. `proxy.ts` already had
`/admin` in `ADMIN_ONLY_PREFIXES` since Этап 2 (first line of defense, JWT-only).

**New reusable primitives** (`web/components/admin/`, admin-scoped, not
`ui/` — narrower usefulness, precedent already set by `components/profile/`
and `components/tournaments/` being domain-scoped instead of generic):
- `admin-nav.tsx` → `AdminNav` (client, `usePathname`) — the 5-section top
  nav rendered by the layout (Обзор/Модерация/Пользователи/Организаторы/Обращения),
  underline-active-tab style (not sidebar — deliberate: admin section list is
  short/flat, a horizontal tab bar scrolls on mobile with `overflow-x-auto`
  instead of needing a hamburger/drawer).
- `stat-card.tsx` → `StatCard({icon, label, value, href?, tone?, accent?})` —
  dashboard counter card, optionally a `Link` (whole card clickable), `accent`
  adds a 2px colored border for "needs attention" metrics (pending
  moderation, open tickets). Reuse for any future dashboard-style counter,
  not tournament/admin-specific in shape.
- `admin-search-bar.tsx` → **two** exports, `AdminSearchInput({placeholder,
  paramKey?, className?})` (debounced 400ms URL-query search, same
  render-time-sync-not-useEffect pattern as `filters-bar.tsx`) and
  `AdminFilterSelect({paramKey, value, options, wrapperClassName?, label?})`
  (single select writing one URL param, resets `page`). Deliberately **not**
  one combined component like `FiltersBar` — admin pages each need a
  different single extra filter (status/role/status), so the two pieces
  compose independently side by side; this is the generalized version of the
  catalog's `filters-bar.tsx` pattern, reused across moderation/users/support
  filter bars instead of writing 3 near-identical debounce+URL-sync blocks.
- `moderation-table.tsx` → `ModerationTable({items, activeStatus})` (client)
  — the `/admin/moderation` row list (Card-per-tournament, not a real
  `<table>`, matches `MyTournamentRow`'s responsive-by-default approach).
  Same optimistic-local-state pattern as `NotificationsPanel`: holds its own
  `useState(items)` copy, action results patch that state directly (no
  `router.refresh()` anywhere in this codebase, this follows the existing
  convention). **Caller must mount with `key={status}-{search}-{page}`** (in
  `app/admin/moderation/page.tsx`) so a URL filter change remounts the table
  with fresh server props instead of trying to reconcile/diff local state
  against a completely different filtered dataset — this is the chosen
  alternative to the render-time-sync trick for a *list* (not a single
  input value). Reject requires a reason (inline expanding textarea per row,
  not a modal per the task's no-`window.confirm`-alikes instruction); delete
  uses the established inline-confirm ("Точно удалить?" button swap) pattern
  from `CancelRegistrationButton`.
- `user-row.tsx` → `UserRow({user, currentAdminId})` (client) — same
  optimistic pattern, disables Block/Delete (with a `title` tooltip + a
  visible caption line) when `user.id === currentAdminId` or
  `user.role === ADMIN`, mirroring (not replacing) the server-side refusal in
  `setUserBlocked`/`deleteUser`.
- `ticket-card.tsx` → `TicketCard({ticket})` (client) — support ticket card,
  inline expanding response textarea (`respondToTicket`) and inline-confirm
  close (`closeTicket`); response text renders in a highlighted panel once
  set, actions row hidden entirely once `status === CLOSED`.

**Pages built** (`app/admin/`): `layout.tsx` (requireAdmin + `AdminNav` +
"Админ-панель" heading, wraps all children in `Container`), `page.tsx`
(dashboard: 2 accent `StatCard`s for pending-moderation/open-tickets, then
users/organizers/tournaments-total/registrations-total, then
published/hidden), `moderation/page.tsx` (`status` query defaults to
`PENDING` when absent — **the sentinel `"ALL"` is used for "show every
status" instead of an empty string**, because an *absent* `status` param
already has a different meaning here — default-to-PENDING — unlike every
other filter in the codebase where absent-and-empty are the same "no
filter"; don't copy the empty-string convention from `filters-bar.tsx` if
adding a new filter select where "unset" and "explicit all" need to be
distinguishable), `users/page.tsx`, `organizers/page.tsx` (server-only, no
client component needed, no actions — just `listOrganizers()` rendered as stat
cards with a "Смотреть турниры →" link into `/admin/moderation?status=ALL&search=<email>`),
`support/page.tsx`. Each of the 4 list pages (`moderation`/`users`/`organizers`/`support`)
also got a matching `loading.tsx` skeleton (`animate-pulse` div blocks, same
convention as `app/tournaments/loading.tsx` — no dedicated `Spinner`
primitive exists in the codebase, this project always uses skeleton
placeholders for `loading.tsx` instead, don't build a spinner unless a page
genuinely needs an inline (not full-page) pending indicator).

**Navbar admin link:** already existed from Этап 3 (`ShieldCheck` icon,
ghost button, `/admin`, `role === Role.ADMIN` gate) — verified present in
both desktop and mobile menus, no change needed, task's "check and add if
missing" resolved to "already done."

**Not done / deviations:** no dedicated `Spinner` UI primitive (see above,
not this codebase's convention — flagged in the task prompt as a suggested
primitive but skeletons are the established pattern, building a redundant
spinner would fragment the convention); `AdminFilterSelect`'s `label` prop
maps to `aria-label` on the underlying `Select` (no visible `<label>`
element next to admin filter selects, unlike the catalog's `FiltersBar` which
has visible labels above each field) — acceptable for an internal admin tool
per this task's scope, flag if a future accessibility pass wants visible
labels added.

### Этап 7 — контакты-форма поддержки, редактирование турнира, участники (done)
Built UI for 3 backend-agent-delivered pieces (`lib/actions/support.ts`
`createSupportTicket`, `lib/tournaments/queries.ts`
`getTournamentForEdit`/`listTournamentParticipants`, `lib/actions/tournaments.ts`
`editTournament`) — didn't touch any of those, only called them. `npm run
build` and `npm run lint` both green (zero errors, only pre-existing
unrelated `seed.ts` warnings). Verified end-to-end against the running dev
server via real NextAuth credentials login over curl: guest → `/contacts`
200 with all 4 form fields present; guest → `/tournaments/[id]/edit` and
`/participants` both 307-redirect to `/login?callbackUrl=...` (covered by
the existing `/tournaments` prefix in `proxy.ts`, no proxy change needed);
organizer (owner) → both routes 200 with real seeded data (2 real
participants incl. contact email rendered on the participants page); a
different logged-in non-owner user → both routes render "Турнир не найден"
(the shared `not-found.tsx` boundary correctly bubbles up from the nested
`edit`/`participants` segments — confirmed access control works even though
dev-mode Next 16 quirk always reports HTTP 200 for `notFound()`, same
pre-existing behavior already present on `/tournaments/[id]` itself, not a
regression).

**Feature 1 — support/contact form** (`web/components/support/contact-form.tsx`
→ `ContactForm({ defaultName?, defaultEmail? })`, client, `useActionState(createSupportTicket)`,
same shape as `register-form.tsx`/`create-wizard.tsx`'s success-card pattern):
mounted into `app/contacts/page.tsx` (now `async`, calls `getCurrentUser()`
— page stays PUBLIC, this call is only for prefilling name/email, not an
auth gate) in a new section between the 4 `ContactCard`s and the "О проекте"
section. Fields: name (optional), email (required), subject, message
(textarea with live `N/20 минимум` counter, same visual pattern as the
create-wizard's description counter). `SUPPORT_TICKET_SUCCESS_MESSAGE` is
NOT imported client-side (see the established `"use server"`-file-only-exports-async-functions
rule in `_shared.md`) — success text always comes from `state.message`.

**Feature 2 — edit tournament** (`app/tournaments/[id]/edit/page.tsx` +
`web/components/tournaments/edit-form.tsx` → `EditTournamentForm({ tournament: TournamentEditData })`):
page does `requireUser` + `getTournamentForEdit(id, user.id)` → `notFound()`
if null (owner-only, backend already collapses "not found" vs "not owner").
Form **reuses** `ImageUploadField`/`SectionsEditor` from
`components/tournaments/create/` (imported directly by relative path, not
re-exported) plus `step2Schema` from `lib/validations/tournament.ts` for
client-side validation — same manual-FormData-on-submit pattern as the
create-wizard's step 3 (`e.preventDefault()` + build `FormData` +
`startTransition(() => formAction(fd))`) because `SectionsEditor`/`ImageUploadField`
are controlled components, not native form fields. A read-only info `Card`
up top shows format/dates/location/price with a note + link to `/contacts`
("даты/цену/место меняйте через поддержку" per task instruction) — these
fields are never read from FormData by `editTournament` itself, so this UI
doesn't even attempt to submit them. Success screen conditionally shows a
"Смотреть турнир" button only if `tournament.status === PUBLISHED` (editing
a PENDING/HIDDEN tournament has no public detail page to link to).

**Feature 3 — participants list** (`app/tournaments/[id]/participants/page.tsx` +
`web/components/tournaments/participant-card.tsx` → `ParticipantCard({ participant: TournamentParticipant })`,
plain server component, no client JS needed): page does `requireUser` +
`listTournamentParticipants(id, user.id)` → `notFound()` if null (owner-only).
Header shows tournament title + Russian-pluralized participant count
(`pluralizeParticipant`, same inline-helper pattern as
`my-tournament-row.tsx`'s `pluralizeParticipant` for "заявка/заявки/заявок" —
this one pluralizes "участник/участника/участников" instead, kept as a
separate local function since the two word forms differ). `EmptyState`
"Пока никто не зарегистрировался" when `participants.length === 0`. Each
card builds a `rows` array of `{icon, label, value}` and only pushes an
entry when the corresponding snapshot field is non-empty (spec: "не все
всегда заполнены — скрывай пустые") — falls back to
`participant.user.email`/full name from the `User` relation if the
form-snapshot `contactEmail`/`fullName` is null (old data or a UI that once
allowed skipping). Avatar uses the same bare `next/image` +
`user.image ?? initials` pattern already established in
`components/layout/navbar.tsx`'s `Avatar` — no `next.config.ts` remote-pattern
change needed since all image paths in this codebase are same-origin
`/uploads/...`.

### Этап 8 — 3 admin UI additions on top of already-built backend (done)
Wired UI for 3 backend pieces the orchestrator said were already implemented
(`getTournamentForEdit`/`editTournament` admin-bypass, `createTournament`
admin-auto-publish, `createUserByAdmin` in `lib/actions/admin.ts`) — didn't
touch any backend logic, only called it. `npm run build` and `npm run lint`
both green (zero errors, only pre-existing unrelated `seed.ts` warnings).

**Feature 1 — edit link in moderation queue:** `components/admin/moderation-table.tsx`
gained a ghost `Button asChild` → `<Link href={/tournaments/${t.id}/edit}>`
(icon `SquarePen`) in each non-deleted row's action group, next to
Одобрить/Отклонить/Скрыть/Удалить. No new page needed — `/tournaments/[id]/edit`
already renders for any requester because `getTournamentForEdit` now accepts
an admin bypass (per this task's backend note); this UI change is just
surfacing the existing route.

**Feature 2 — admin auto-publish banner:** `app/tournaments/create/page.tsx`
now captures `const user = await requireUser(...)` (was previously discarded)
and passes `isAdmin={user.role === Role.ADMIN}` into `CreateTournamentWizard`.
`components/tournaments/create-wizard.tsx` takes a new optional `isAdmin?: boolean`
prop and renders a `ShieldCheck`-icon brand-tinted info banner ("Вы создаёте
турнир как администратор — он будет опубликован сразу, без модерации.")
right below the `ProgressBar` card, above the step form — visible on all 3
steps since it lives in the persistent wrapper `div`, not inside a per-step
component. Success screen unchanged (already shows the server's exact
`state.message`, which the backend now varies for admins vs. regular users).

**Feature 3 — "Добавить пользователя" on /admin/users:** new
`components/admin/create-user-form.tsx` (`CreateUserForm`, client,
`useActionState(createUserByAdmin, undefined)`) — same controlled-inputs
pattern as `app/register/register-form.tsx` (values survive a validation
error, explicitly reset to `EMPTY_VALUES` only on `state.success`, via the
established render-time `state !== handledState` comparison, not `useEffect`).
Fields: firstName/lastName/email/phone(optional, `Input`s with leading
lucide icons)/password (`PasswordInput`)/role (`Select`, options
USER/ORGANIZER/ADMIN via `ROLE_LABEL`, default `Role.USER`). Every field has
`label htmlFor` + `id`, `FieldError` with matching `id` (`cu-<field>-error`
prefix to avoid clashing with any other form's ids on the same page) +
`aria-describedby`/`aria-invalid` on the input. `state.error` → `role="alert"`
rose banner; `state.success` → `role="status"` emerald banner showing
`state.message` (server-provided, includes name+role). List below refreshes
itself via the action's own `revalidatePath("/admin/users")`, no client
refetch needed. New `components/admin/create-user-toggle.tsx`
(`CreateUserToggle`, client) — a plain `Button` (`aria-expanded`/`aria-controls`)
toggling visibility of `CreateUserForm`, mounted above the search/filter bar
in `app/admin/users/page.tsx` (existing search/pagination untouched).

**Not done / deviations:** none — all 3 features matched the task spec
directly, no backend files touched.

**`components/profile/my-tournament-row.tsx` changes:** added a second row
(new `<div className="flex flex-wrap gap-2 sm:pl-24">`) below the existing
title+status row, two outline `Button asChild` links — "Редактировать" →
`/tournaments/[id]/edit` and "Участники (N)" → `/tournaments/[id]/participants`
(N = `tournament.registrationsCount`, already present on `MyTournamentItem`).
Shown unconditionally for every row this component renders — no extra status
check needed because `listMyTournaments` (the only caller) already filters
out `DELETED` tournaments at the query level, so every row reaching this
component is a valid edit/participants target regardless of status
(PENDING/PUBLISHED/HIDDEN all editable per spec, "no re-moderation" on edit).
