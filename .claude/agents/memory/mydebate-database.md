# Memory — mydebate-database

Private working memory for the mydebate-database agent. Read this at the start of every run; append durable facts (decisions + why, current state, conventions) after finishing. Keep it current — correct or delete outdated entries. One concise entry per fact.

## Log

### Stack reality (overrides `_shared.md` for now)
- Current dev DB is **SQLite** (`web/.env` → `DATABASE_URL="file:./dev.db"`, resolved by `web/prisma.config.ts` via `dotenv/config`), NOT Postgres. `_shared.md` says Postgres — that's the target for later migration, not the current state. Note this discrepancy for other agents if it matters to them.
- Prisma **7**, generator `provider = "prisma-client"`, `output = "../generated/prisma"`. This generator does **not** emit an `index.ts`/`package.json` in the output dir — bare `import ... from "@/generated/prisma"` FAILS to resolve (Node/TS can't find an entry point). Always import the explicit file: `import { PrismaClient } from "@/generated/prisma/client"`. Documented in `web/lib/prisma.ts` header comment.
- SQLite does not support Prisma native `enum {}` blocks or scalar list fields (`String[]`). All "enums" in `prisma/schema.prisma` are `String` fields with comments listing allowed values; mirrored as TS `as const` objects + union types in `web/lib/enums.ts` (source of truth for app code: `Role`, `Level`, `TournamentFormat`, `LocationType`, `TournamentStatus`, `RegistrationType`, `RegistrationStatus`, `NotificationType`, `SupportTicketStatus`).
- `languages` (on `User` and `Tournament`) stored as comma-separated string, e.g. `"Русский,English"`. Use `parseLanguages`/`formatLanguages` helpers from `web/lib/enums.ts` — don't hand-roll split/join elsewhere.

### Prisma 7 runtime requires a driver adapter (important, non-obvious)
- Because `schema.prisma`'s `datasource db { provider = "sqlite" }` has **no `url = env(...)`** (URL lives only in `prisma.config.ts`, used by CLI/migrate), the generated `PrismaClient` at **runtime** has no implicit way to find the DB — passing nothing throws `PrismaClientInitializationError: needs to be constructed with a non-empty, valid PrismaClientOptions`. There is no `datasourceUrl` shorthand option in Prisma 7's client types.
- Fix: construct the client with an explicit driver adapter. Installed `@prisma/adapter-better-sqlite3` (pulls in `better-sqlite3` native binary, prebuilt install worked fine, no `npm approve-scripts` needed since prebuild-install succeeded). Usage: `new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }) })`. The adapter itself strips a leading `file:` prefix from the URL before opening the file, so `DATABASE_URL="file:./dev.db"` works as-is.
- This lives in `web/lib/prisma.ts` (`createPrismaClient()` helper) as the singleton; `prisma/seed.ts` imports that same singleton instead of constructing its own client.
- `dev.db` is created at the **web root** (`web/dev.db`), not `web/prisma/dev.db` — cwd-relative to wherever `next dev` / `prisma` CLI / `tsx` are invoked from (web/). Had to add `/dev.db` and `/dev.db-journal` to `web/.gitignore` (the scaffolded gitignore only had `/prisma/*.db`, which didn't match).

### Seed script (Prisma 7 config-based, not package.json)
- Prisma 7 seed config lives in `prisma.config.ts` → `migrations.seed: "tsx prisma/seed.ts"` (NOT `package.json` `"prisma": {"seed": ...}` — that mechanism is gone). Run via `npx prisma db seed` (also wired as `npm run db:seed`).
- `tsx prisma/seed.ts` run standalone does **not** auto-load `.env` (unlike Next.js dev/build, which loads it automatically) — `prisma/seed.ts` has `import "dotenv/config";` as its first import. Without it, `DATABASE_URL` is undefined and client construction throws.
- Installed `bcryptjs` (+ `@types/bcryptjs`) for hashing seed passwords, and `tsx` as a dev dependency (neither was present in the Этап 0 scaffold).
- Seed is idempotent: `deleteMany()` in FK-safe child-to-parent order at the top (Notification → SupportTicket → Favorite → Registration → TournamentSection → Tournament → PasswordResetToken → Session → Account → VerificationToken → User), then recreates everything. Verified by running seed twice — identical counts both times.
- Demo password for all 3 seed users: **`password123`** (bcrypt-hashed into `passwordHash`).
- Demo users: `admin@mydebate.kz` (ADMIN), `organizer@mydebate.kz` (ORGANIZER, "Ерлан Сапаров", city Астана), `sanzhar@mydebate.kz` (USER, "Санжар Тулегенов" — Астана, Nazarbayev University, level INTERMEDIATE, languages "Русский,English", major "Международные отношения", per the mock/spec).
- 11 tournaments seeded: 10 `PUBLISHED` (mix of upcoming/open registration, upcoming/deadline-passed, and past/historical) + 1 `PENDING` (Debate Academy Cup, Караганда — for admin moderation flow testing). Cities used: Астана, Алматы, Шымкент, Караганда (+ one ONLINE with no city — Online Debate Challenge). ArysMUN 2.0 has 6 `TournamentSection` rows (UNHRC, Security Council, WHO, UNEP, DISEC, ECOSOC). A few `Registration`/`Favorite`/`Notification` rows and 1 `SupportTicket` exist for the participant user.
- "Today" in the seeded data's timeline is **2026-07-05** (per task spec) — upcoming/past splits are anchored to that date, not to `new Date()` at seed-run time. If the real system clock drifts far from 2026, some "upcoming" tournaments may need re-dating.

### Models (current schema, `web/prisma/schema.prisma`)
User, Account, Session, VerificationToken, PasswordResetToken (NextAuth-ready, Этап 2 will wire `@auth/prisma-adapter`), Tournament, TournamentSection, Registration, Favorite, Notification, SupportTicket. Field names and cascade rules follow the Этап 1 task spec exactly (`organizerId` cascades delete tournaments with the organizer; Registration/Favorite have `@@unique([userId, tournamentId])`; TournamentSection cascades with its tournament). Indexes added on: User.role, User.city; Tournament.status/city/format/locationType/startDate/registrationDeadline/organizerId; Registration.userId/tournamentId/status; Favorite.userId/tournamentId; Notification.userId/isRead; SupportTicket.userId/status.

### Migration history
- `20260704200732_init` — initial schema, all models above. Applied clean via `prisma migrate dev --name init`.

### Verification results (this run)
- `npx prisma validate` — OK.
- `npx prisma migrate dev --name init` — OK, `dev.db` created, generator ran automatically.
- `npx prisma generate` — OK (re-ran explicitly, no changes).
- `npx prisma db seed` — OK, ran twice for idempotency check, identical counts both times (users 3, tournaments 11, tournamentSections 6, registrations 3, favorites 2, notifications 2, supportTickets 1).
- `npm run build` — OK, Turbopack build + typecheck clean, no errors.

### Deviations from the task prompt
- Task prompt said import as `@/generated/prisma` (no `/client` suffix) — that does not resolve with this Prisma 7 generator output (no index/package.json emitted). Used `@/generated/prisma/client` everywhere instead; documented in code comments so future agents don't "fix" it back.
- Task prompt implied plain `new PrismaClient()` would work once `DATABASE_URL` is set. It does not — Prisma 7 with a url-less `datasource` block requires an explicit driver adapter at runtime. Added `@prisma/adapter-better-sqlite3` and wired it into the `lib/prisma.ts` singleton and seed script.
