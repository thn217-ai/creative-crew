# Creative Crew

A Google ADK and Gemini-powered pre-production workspace that turns one filmmaker brief into a coherent production-ready package.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run test` — run the API and Creative Crew treatment regression checks
- `pnpm run validate` — release gate: full typecheck + treatment regression checks
- `pnpm run build` — run the release gate, then build all packages
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
- `docs/architecture.md` — milestone architecture and external requirements

## Architecture decisions

- Prove one complete ADK/Gemini path before adding the multi-agent workflow.
- Keep Google credentials server-only and return explicit failures without mock output.
- Use ADK output schemas plus server validation for every creative deliverable.
- Signed-in accounts see only their own projects. Guests see only unclaimed projects belonging to their signed browser cookie.
- Claiming browser projects requires an explicit signed-in confirmation. The account then owns the project and its treatment history; signing out does not restore guest access.
- All browser API authentication is cookie-based. Never add browser bearer-token handling or accept user IDs from request bodies or headers.

## Product

Milestone 1 accepts a film brief, runs a real Google ADK Creative Director backed by Gemini, and presents the validated creative treatment.
Projects and treatment history persist in PostgreSQL. Filmmakers can sign in to reopen their account library on another device and claim existing guest projects.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
