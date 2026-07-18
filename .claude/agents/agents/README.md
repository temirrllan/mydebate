# MyDebate — multi-agent system

Six specialized sub-agents, each with its **own tools** and its **own file-based memory**. Invoke one with the Agent tool (`subagent_type: "<name>"`). The main assistant acts as orchestrator: it splits work, hands each slice to the right agent, and lets agents coordinate through shared memory.

## Agents

| Agent | Role | Tools |
|---|---|---|
| `mydebate-database` | Prisma schema, models, relations, migrations, seed | Read, Write, Edit, Glob, Grep, Bash |
| `mydebate-auth` | NextAuth, Google OAuth, sessions, RBAC, guards | Read, Write, Edit, Glob, Grep, Bash |
| `mydebate-backend` | Route Handlers / Server Actions, business logic | Read, Write, Edit, Glob, Grep, Bash |
| `mydebate-frontend` | App Router pages, React components, Tailwind, UX | Read, Write, Edit, Glob, Grep, Bash |
| `mydebate-reviewer` | Code review + spec compliance (read-only) | Read, Glob, Grep, Bash |
| `mydebate-qa` | End-to-end verification of flows (read-only) | Read, Glob, Grep, Bash |

## Memory (how continuity works)
Sub-agents start each run with a blank slate, so their memory lives in files under `memory/`:
- `memory/_shared.md` — cross-agent conventions and contracts everyone reads first.
- `memory/<agent-name>.md` — each agent's private log of decisions, state, and conventions.

Every agent's system prompt tells it to **read** its memory + `_shared.md` at the start and **append durable facts** at the end. That's what makes this a *system* rather than six isolated agents — the database agent's field names, the auth agent's helper signatures, and the backend's route contracts all surface in `_shared.md` for the others.

## Typical pipeline
1. `mydebate-database` — schema + migrations
2. `mydebate-auth` — auth + role guards
3. `mydebate-backend` — endpoints/actions on top of the schema
4. `mydebate-frontend` — pages/components calling those actions
5. `mydebate-reviewer` — audit the diff against the spec
6. `mydebate-qa` — drive the running app to confirm the flow

Source of truth for all behavior: `MyDebate.docx` (PRD) and the mockups in `maket/`.
