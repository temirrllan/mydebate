# Memory — mydebate-auth

Private working memory for the mydebate-auth agent. Read this at the start of every run; append durable facts (decisions + why, current state, conventions) after finishing. Keep it current — correct or delete outdated entries. One concise entry per fact.

## Log

### Stack / packages added (Этап 2)
- Installed `next-auth@5.0.0-beta.31` (Auth.js v5) and `server-only@0.0.1`. `zod@4.4.3` and `bcryptjs` were already present (installed by DB agent). No Google provider installed/configured — deliberately deferred (task says "заглушён").
- `.env` now also has `AUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_URL` (values are dev-only, not secret-sensitive since local; `.env*` already gitignored — verified, nothing committed). Commented-out placeholders for `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` left for whoever wires up Google later.

### NextAuth v5 config (`web/auth.ts`)
- `export const { handlers, auth, signIn, signOut } = NextAuth({...})`. Session strategy: **JWT** (not database) — required for Credentials-only setup. `pages.signIn = "/login"`.
- Single provider: `Credentials` (id defaults to `"credentials"`). `authorize()`: re-validates input with `loginSchema` (never trusts client), looks up user by lowercased email, rejects if `!user.passwordHash` (OAuth-only account) or `user.isBlocked`, then `bcrypt.compare`. Returns `{ id, email, name, image, role }` on success.
- Callbacks: `jwt` copies `user.id`/`user.role` into the token on sign-in; `session` copies `token.id`/`token.role` onto `session.user`. Types extended in `web/types/next-auth.d.ts` (`Session.user.id/role`, `JWT.id/role`, `User.role?`).
- Route handler: `web/app/api/auth/[...nextauth]/route.ts` does `export const { GET, POST } = handlers;` (NOT `export { GET, POST } from "@/auth"` — auth.ts exports `handlers`, not `GET`/`POST` directly).
- **Known NextAuth v5 gotcha** (worth remembering for anyone touching auth.ts): the App Router `signIn()` server action, even called with `redirect: false`, still **throws** an `AuthError` (e.g. `CredentialsSignin`) on failed credentials — it does NOT return an `{ error }` object like the v4 client API. Correct pattern (used in `lib/actions/auth.ts`):
  ```ts
  try {
    await signIn("credentials", { email, password, redirect: false });
  } catch (error) {
    if (error instanceof AuthError) return { message: "Неверный Email или пароль." };
    throw error; // rethrow anything else (incl. NEXT_REDIRECT digests from elsewhere)
  }
  redirect(callbackUrl); // only reached on success, called OUTSIDE the try/catch
  ```
  Verified end-to-end via raw HTTP against `/api/auth/callback/credentials` (see Verification section).

### Session/role helpers (`web/lib/auth/session.ts`) — cross-agent contract
- `getCurrentUser(): Promise<CurrentUser | null>` — reads `auth()`, then **re-queries Prisma** by id (not just trusting the JWT) so a stale JWT can't bypass a since-added `isBlocked` or role change; returns `null` if session missing OR user now blocked. `CurrentUser = { id, email, firstName, lastName, role, isBlocked, image }`.
- `requireUser(callbackUrl?: string): Promise<CurrentUser>` — redirects to `/login?callbackUrl=...` if guest.
- `requireRole(role: string | string[], callbackUrl?: string): Promise<CurrentUser>` — redirects to `/login` if guest, to `/403` if authenticated but wrong role.
- `requireAdmin(callbackUrl?: string): Promise<CurrentUser>` — shorthand for `requireRole(Role.ADMIN, ...)`.
- All four are `import "server-only"` — Server Components/Actions/Route Handlers only, never import from a Client Component. (Learned the hard way: `server-only` throws unconditionally when required outside Next's actual server build graph, e.g. from a bare `tsx` script — can't unit-test files that import it standalone; had to test the underlying Prisma logic separately instead. See Verification section.)
- These are the canonical helpers — reuse everywhere, don't re-implement session checks elsewhere. Recorded signature in `_shared.md` too.

### Role escalation helper (`web/lib/auth/roles.ts`)
- `maybePromoteToOrganizer(userId: string): Promise<void>` — promotes `USER` → `ORGANIZER` once the user has ≥1 `Tournament` with `status = PUBLISHED`. No-ops if user is already `ORGANIZER`/`ADMIN`, or has zero published tournaments. Logs the promotion via `console.log` (spec §11).
- **NOT wired to anything yet** — the moderation "approve tournament" action doesn't exist in the codebase yet (that's Этап 3+, tournaments/moderation agent's job). Whoever builds the admin approve-tournament action MUST call `maybePromoteToOrganizer(tournament.organizerId)` immediately after setting `Tournament.status = PUBLISHED`, and not before. Documented prominently in the file's header comment too — flag this to the tournaments/backend agent.

### Validation (`web/lib/validations/auth.ts`)
- Zod v4 API used throughout (`z.email({ error: "..." })`, `.regex(re, { error: "..." })` — v4 uses `error` option, not `message`, though `message` still works for some methods; stuck to `error` for consistency with zod v4 idioms). Confirmed via `node -e` smoke tests that `z.string().trim().toLowerCase().pipe(z.email())` behaves as expected (trims + lowercases + validates in one schema — used for all email fields).
- `passwordSchema`: min 8, needs a letter (`[a-zA-Z]`) and a digit (`[0-9]`) — matches the "Регистрация.png" mockup checklist exactly (mockup does NOT require a special character, unlike the Next.js docs' generic example — don't copy that regex from the docs verbatim).
- `passwordRequirements` (array of `{ label, test }`) exported alongside — reused by both register and reset-password forms for the live checklist UI, single source of truth so the client-side indicator can never drift from the server schema.
- `registerSchema`/`resetPasswordSchema` both use `.refine` for password===confirmPassword (error attached to `confirmPassword` field path).

### Server Actions (`web/lib/actions/auth.ts`) — all in one `"use server"` file
- `registerUser(prevState, formData)`, `loginUser(...)`, `requestPasswordReset(...)`, `resetPassword(...)`, `logoutUser()` — all designed for `useActionState` (React 19) except `logoutUser` (zero-arg, bound directly to a `<form action={logoutUser}>`).
- `ActionState = { message?, fieldErrors?: Record<string,string[]>, success? } | undefined`.
- Password reset "email" is a **console.log stub** (spec explicitly allows this for Этап 2 — no SMTP configured): logs `${AUTH_URL}/reset-password?token=...` to the server console. Always returns the same neutral message regardless of whether the email exists (`"Если такой email существует, мы отправили ссылку для сброса пароля."`) to avoid account enumeration; existing reset tokens for a user are deleted before creating a new one (only the latest link is valid). Token: `crypto.randomBytes(32).toString("hex")`, `expiresAt = now + 1h`, stored in `PasswordResetToken`.
- `resetPassword` re-checks token existence + `expiresAt > now` server-side (also re-checked in `app/reset-password/page.tsx` before even rendering the form, so an expired/garbage token shows an "invalid link" state instead of a broken form) — updates `passwordHash` and deletes all reset tokens for that user in one `prisma.$transaction`, then redirects to `/login?reset=success`.
- "Remember me" checkbox on the login form is **UI-only** — NextAuth JWT session `maxAge` is not currently varied by it (default ~30 days for all sessions regardless of checkbox state). Flagged as a known simplification, not a bug; would need a custom cookie/session-duration strategy to implement properly.

### Route protection — `web/proxy.ts` (Next 16 renamed file, not `middleware.ts`)
- Uses the NextAuth v5 "wrapper" pattern: `export default auth((req) => { ... })`, reading `req.auth` (the session) — this is an **optimistic, JWT-only check** (no DB query), consistent with Next's own authentication guide guidance for Proxy/Middleware-level auth checks.
- Next 16 proxy runs on **Node.js runtime by default** (confirmed via `node_modules/next/dist/docs/.../file-conventions/proxy.md` line 223: "Proxy defaults to using the Node.js runtime... Setting the `runtime` config option in Proxy will throw an error.") — this is why it's safe to import the full `auth.ts` (which pulls in Prisma + the `better-sqlite3` native driver adapter) directly in `proxy.ts` without any Edge-runtime incompatibility. This would NOT have worked pre-16 (old Edge-only Middleware).
- Route lists (exact strings, keep in sync with any new top-level pages other agents add):
  - `PUBLIC_PATHS` (exact match, no ownership of subpaths besides those below): `/`, `/about`, `/contacts`, `/help`, `/rules`, `/privacy`, `/terms`, `/login`, `/register`, `/forgot-password`, `/reset-password`, `/403`.
  - `AUTH_REQUIRED_PREFIXES` (prefix match incl. subpaths): `/tournaments`, `/profile`, `/favorites`, `/notifications` — guest → 307 redirect to `/login?callbackUrl=<original path+query>`.
  - `ADMIN_ONLY_PREFIXES` (prefix match): `/admin` — guest → `/login?callbackUrl=...`; authenticated non-admin → `/403`.
  - Anything NOT matching the above (e.g. future pages another agent adds without registering them here) currently falls through as **public** — i.e. the default is permissive, not restrictive. If Этап 3+ adds new protected sections (e.g. `/organizer`), **update `AUTH_REQUIRED_PREFIXES`/`ADMIN_ONLY_PREFIXES` in `proxy.ts`**, don't assume anything is protected by default.
  - `matcher` excludes `/api/auth/*`, `_next/static`, `_next/image`, `favicon.ico`, and common image extensions.
- `/403` page created (`app/403/page.tsx`) as the "authenticated but wrong role" destination — distinct from the guest destination (`/login`). Matches the 401-vs-403 distinction requested in the task (401 semantically = "redirect to /login", 403 semantically = "redirect to /403"); Route Handlers built by other agents should still return literal HTTP 401/403 status codes directly, proxy.ts only does page-level redirects since it can't cleanly return raw status codes for full page navigations.

### Pages built (functional, not just static mockup copies)
- `/login` (`app/login/page.tsx` + `login-form.tsx`), `/register` (`app/register/page.tsx` + `register-form.tsx`), `/forgot-password`, `/reset-password` (reads `token` searchParam server-side, checks validity *before* rendering — shows "invalid/expired link" state instead of a form if bad), `/403`, `/profile` (minimal but real protected page using `requireUser`, shows name/email/role badge + logout button — full profile UI is Этап 3's job, this is just enough to prove the auth flow end-to-end).
- Shared UI: `components/auth/auth-layout.tsx` (two-column layout matching maket/Логин.png + Регистрация.png — benefits list + illustration placeholder, single-column on mobile), `password-input.tsx` (show/hide toggle), `field-error.tsx`, `google-button.tsx` (disabled, styled Google "G" logo inline SVG — OAuth not wired), `divider.tsx` ("или" separator).
- **Deviation from maket/Регистрация.png**: the mockup shows one combined "Имя и фамилия" field; built two separate `firstName`/`lastName` inputs instead, because the task's field list explicitly requires `firstName`/`lastName` as separate required fields matching the `User` model. Noted inline in `register-form.tsx` too.
- All forms use `useActionState` (React 19) bound to the Server Actions above; real-time client-side validation (email format, password-match, live password-requirements checklist) layered on top of server validation, never a replacement for it.

### Verification performed this run (dev server on port 3000, stopped afterward)
- `npm run build` — clean Turbopack build + TypeScript check, no errors.
- Guest redirect tests via curl: `/profile`, `/tournaments`, `/tournaments/create`, `/favorites`, `/notifications`, `/admin` → all `307` to `/login?callbackUrl=...`; `/`, `/login`, `/register`, `/forgot-password` → `200` (unauthenticated, unblocked).
- Real HTTP NextAuth credentials flow (via `/api/auth/csrf` + `/api/auth/callback/credentials`, no browser needed): `admin@mydebate.kz` / `password123` → session cookie set, session JSON shows `role: "ADMIN"`; wrong password → `302` to `/login?error=CredentialsSignin`; temporarily set `sanzhar@mydebate.kz`.`isBlocked = true` → login correctly rejected too (reverted after test).
- Role-based proxy checks with a real USER session (`sanzhar@mydebate.kz`): `/admin` → `307` to `/403`; `/profile` → `200`; `/tournaments` → `404` (page doesn't exist yet, but NOT blocked — proves the "authenticated, page missing" case isn't confused with the auth gate).
- Registration/reset-password core logic verified via a temporary `tsx` script (deleted after use — files that import `"server-only"` can't be run this way, see gotcha above, so `lib/actions/auth.ts` — which doesn't import it — was tested directly): created a user through the exact same steps `registerUser` performs (schema parse → uniqueness check → bcrypt hash → `prisma.user.create`), then ran the real `requestPasswordReset`/`resetPassword` actions against that user — token created, password changed, token deleted after use, new password verified with `bcrypt.compare`. Test user cleaned up afterward.
- Did not/could not test the register/login pages' actual `<form>`-driven Server Action submission via curl (React Server Action POSTs need a build-generated encrypted action reference + `Next-Action` header that isn't feasible to reconstruct by hand); relied on the HTTP-level NextAuth credentials test (identical `authorize()` code path) plus the direct-script test above for confidence. A real browser click-through was not performed (no browser tooling available in this environment) — flagging this as the one gap in verification coverage.

### Deviations / things future agents should know
- Navbar (`components/layout/navbar.tsx`, built in Этап 0) always shows guest-style "Войти"/"Регистрация"/"Создать турнир" links regardless of auth state — not updated in this Этап 2 pass (out of scope; it's a Этап 3/frontend concern to make it session-aware). Functionally harmless since `/tournaments/create` is still gated by `proxy.ts`.
- `/tournaments`, `/favorites`, `/notifications`, `/admin` pages do not exist yet (404) — only their *route protection* was built in this Этап. Building the actual pages is other agents' work.

### Bugfix: resubmitting /login or /register while already authenticated wiped the session (QA report, fixed)
- **Root cause**: `loginUser`/`registerUser` in `web/lib/actions/auth.ts` unconditionally called `signIn("credentials", {redirect:false})`, even if the caller already had a valid `authjs.session-token` cookie. Re-running the Credentials sign-in flow on top of an existing session ended up destroying the cookie (guest home page after submit, no error shown) instead of refreshing it — and neither `app/login/page.tsx` nor `app/register/page.tsx` had a guard to keep an already-authenticated visitor off those forms in the first place.
- **Fix, two layers** (both required — first is the primary defense, second is defense-in-depth):
  1. `app/login/page.tsx` and `app/register/page.tsx` (both Server Components) now call `getCurrentUser()` at the top and `redirect(callbackUrl)` (default `/profile`, or the parsed+validated `?callbackUrl=` searchParam if present and starts with `/`) before rendering the form — an authenticated visitor never even sees the form, so the resubmit path can't be reached via the UI.
  2. `loginUser`/`registerUser` in `web/lib/actions/auth.ts` now call `await auth()` as the very first statement and, if a session already exists, `redirect()` immediately (login → the same `safeCallbackUrl` it would use on success; register → `/profile`) **without ever calling `signIn()`**. This covers the case of a stale/pre-rendered form page or a direct Server Action invocation bypassing the page guard.
- **Verified via raw HTTP** (dev server on :3000, no browser): logged in as `sanzhar@mydebate.kz`/`password123` via `/api/auth/callback/credentials`, then `GET /login` and `GET /register` with that session cookie both returned `307` to `/profile` and the `authjs.session-token` cookie was unchanged/still valid afterward (`/api/auth/session` kept returning the correct user). Confirmed regressions are clean: guest `GET /login`/`/register` still `200`; wrong password still `302` to `/login?error=CredentialsSignin` with `session: null`; correct password from a fresh (no prior session) cookie jar still logs in successfully. Did not re-verify via an actual browser click-through (same tooling gap noted in the original Verification section above).
- Files touched: `web/app/login/page.tsx`, `web/app/register/page.tsx`, `web/lib/actions/auth.ts` (only `loginUser`/`registerUser` — `requestPasswordReset`/`resetPassword`/`logoutUser` untouched, not affected by this bug class since they don't call `signIn()`).
