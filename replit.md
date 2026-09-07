# Creative Crew

A Google ADK and Gemini-powered pre-production workspace that turns one filmmaker brief into a structured pre-production package.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run test` — run the API and Creative Crew package regression checks (approved output, loading, provider errors, and recovery)
- `pnpm run validate` — release gate: full typecheck + package regression checks
- `pnpm run build` — run the release gate, then build all packages
- UI checks mount the real page and API hooks in an isolated test DOM with controlled HTTP responses and guest identity. They need no credentials, database, browser download, or live Gemini calls.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required secret: `GOOGLE_API_KEY` — server-side Gemini access
- Required secret: `SESSION_SECRET` — retain it to preserve access to unclaimed browser projects
- Authentication: Replit-managed Clerk provisions `CLERK_SECRET_KEY`, `CLERK_PUBLISHABLE_KEY`, and `VITE_CLERK_PUBLISHABLE_KEY`; do not copy secret values into code

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/creative-crew` — React/Vite filmmaker workspace
- `artifacts/api-server` — server-only Google ADK/Gemini runtime
- `lib/api-spec/openapi.yaml` — API contract source of truth
- `docs/ARCHITECTURE.md` — implemented architecture, security boundaries, and release scope

## Architecture decisions

- The deterministic server orchestrator runs five sequential ADK/Gemini stages:
  Creative Director, Writer, Art Director, Production Planner, and Creative QA.
- Use structured handoffs between stages; the server assembles workflow stages
  and one final package deterministically.
- Keep Google credentials server-only and return explicit failures without mock output.
- Use ADK output schemas plus strict server Zod validation for every stage and
  before JSONB package persistence; old treatment-only records remain readable.
- Signed-in accounts see only their own projects. Guests see only unclaimed projects belonging to their signed browser cookie.
- Claiming browser projects requires an explicit signed-in confirmation. The account then owns the project and its persisted treatment; signing out does not restore guest access.
- All browser API authentication is cookie-based. Never add browser bearer-token handling or accept user IDs from request bodies or headers.

## Product

The current release accepts a film brief, runs five real Google ADK specialists
backed by Gemini, and presents a validated package: overview, treatment, script,
textual visual direction, production plan, shot list, QA, milestones, and final
summary. Projects and validated packages persist in PostgreSQL. Filmmakers can
sign in to reopen their account library on another device and claim existing
guest projects. The current generation flow creates one package per project.
It has no image/storyboard generation, autonomous correction loop, exports, or
sophisticated revision workflow; no production deployment is verified yet.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
