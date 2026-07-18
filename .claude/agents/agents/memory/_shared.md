# Shared memory — MyDebate multi-agent system

Cross-agent conventions and decisions that every agent must respect. Keep entries short and high-signal. Add a line here only when a decision affects more than one agent.

## Stack (fixed)
- Next.js 15 (App Router) + React + TypeScript
- API: Route Handlers + Server Actions (no separate backend server)
- DB: PostgreSQL + Prisma
- Auth: NextAuth (email+password + Google OAuth)
- Styling: Tailwind CSS
- File uploads: UploadThing or S3 (covers/logos/avatars)

## Enums (source of truth — mirror in Prisma)
- Role: `USER | ORGANIZER | ADMIN` (Guest = unauthenticated)
- Tournament format: `DEBATES | MUN`
- Tournament type: `ONLINE | OFFLINE`
- Tournament status: `DRAFT | PENDING | PUBLISHED | HIDDEN | DELETED`

## Cross-agent contracts (fill in as built)
- Auth helpers: _(auth agent records signatures here, e.g. `getCurrentUser()`, `requireRole(role)`)_
- Shared types location: _(TBD)_
- Backend routes/actions the frontend calls: _(backend agent records here)_
- Design tokens / shared UI primitives: _(frontend agent records here)_

## Key spec rules everyone must honor
- Guests cannot view the tournaments catalog (auth-gated).
- Public queries return only `PUBLISHED` tournaments.
- Post-publish, only description + info sections are organizer-editable; date/price/venue change only via support.
- After a user's first approved tournament, their role auto-becomes ORGANIZER.
- Registration closes when `now > registrationDeadline`.
- Exact user-facing messages are in the spec — copy them verbatim.
