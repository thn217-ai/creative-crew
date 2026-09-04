# Creative Crew

A Google ADK and Gemini-powered pre-production workspace that turns one filmmaker brief into a coherent production-ready package.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required secret: `GOOGLE_API_KEY` — server-side Gemini access

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
- Add project persistence only when Milestone 2 begins.

## Product

Milestone 1 accepts a film brief, runs a real Google ADK Creative Director backed by Gemini, and presents the validated creative treatment.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
