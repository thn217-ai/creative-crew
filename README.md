# Creative Crew

**ONE BRIEF.**  
**FIVE GOOGLE ADK SPECIALISTS.**
**ONE STRUCTURED PRE-PRODUCTION PACKAGE.**

Creative Crew is a filmmaker-facing web application built for the Google Cloud
Agentic Cinema Hackathon. Its current release turns a raw filmmaking brief into
a structured, validated pre-production package using five real Google ADK
agents backed by Gemini.

> **Release scope:** the working application produces creative direction, a
> script, textual visual direction, a production plan and shot list, creative
> QA, and a final package summary. It does not generate images or storyboards,
> run an autonomous correction loop, export files, or provide a sophisticated
> revision workflow.

## 1. Problem

Early pre-production often starts with an expressive but unstructured brief.
Filmmakers need a coherent creative direction before writing, visual
development, and production planning can begin.

## 2. Product

Creative Crew gives a filmmaker one place to submit a brief, run a bounded
five-stage AI crew workflow, review its pre-production package, and reopen saved
projects and their persisted packages.

## 3. Core workflow

1. A filmmaker enters a brief of at least 20 characters.
2. The Express API validates the request and creates a durable project/run.
3. The server sequentially runs Creative Director, Writer, Art Director,
   Production Planner, and Creative QA Google ADK `LlmAgent` stages through
   `InMemoryRunner`.
4. Each Gemini 3.6 Flash stage receives structured handoffs from prior stages.
5. The server deterministically assembles workflow milestones and one final
   package, then strictly validates it with Zod before persistence.
6. The React application renders the package and its Google attribution.
7. Saved projects and their persisted packages can be reopened later.

Failures remain failures: the application does not substitute fixture content
or report a treatment as approved when Gemini or persistence fails.

## 4. Features

- Public guest workspace with signed, HTTP-only browser ownership
- Five-stage real Google ADK and Gemini generation
- Strict server-validated structured package output
- PostgreSQL project, run, and JSONB treatment/package persistence
- Optional Clerk account access
- Explicit claiming of browser projects into an account
- Account-scoped project access across sessions
- Read-only persisted package viewer for each project
- Loading, timeout, billing, gateway, and retry states
- Privacy-safe, non-blocking analytics events
- Contract, API, UI, ownership, and regression tests

## 5. Architecture

The repository is a pnpm workspace:

- `artifacts/creative-crew` — React/Vite web application
- `artifacts/api-server` — Express API and server-only Google runtime
- `lib/api-spec` — OpenAPI contract
- `lib/api-zod` — generated runtime schemas
- `lib/api-client-react` — generated React Query client
- `lib/db` — PostgreSQL schema and migrations

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full data and runtime
flow.

## 6. Agent responsibilities

One deterministic server orchestrator invokes five sequential bounded
specialists: **Creative Director**, **Writer**, **Art Director**,
**Production Planner**, and **Creative QA**. Their structured handoffs produce
creative direction and overview, script scenes, textual visual direction,
production plan and shot list, QA report, workflow milestones, and final
package summary. The application—not Gemini—deterministically assembles the
workflow-stage list and final persisted package.

## 7. Structured project state

PostgreSQL stores project ownership, the original brief, private ADK session
metadata, generation state, and validated JSONB treatment/package data. Strict
Zod validation occurs before persistence. Public API responses omit provider
session data, owner-scoped queries prevent cross-owner reads, and old
treatment-only records remain readable.

## 8. Google Cloud / Gemini integration

Gemini runs only on the API server. Judges can inspect:

- `artifacts/api-server/src/routes/creative-treatment.ts` — model selection,
  ADK agent creation, runner execution, timeout handling, and output validation
- `artifacts/api-server/package.json` — the `@google/adk` runtime dependency
- `docs/live-verification.md` — recorded real-runtime verification evidence

This release uses the Gemini Developer API with a server-side
`GOOGLE_API_KEY`. It does not require browser-side Google credentials.

## 9. Google ADK / agent architecture

`createTreatmentAgent()` constructs each ADK `LlmAgent` with its stage-specific
Zod output schema. `generateTreatment()` creates an ADK session and consumes
`runAsync()` events from an `InMemoryRunner` for each sequential stage. Each
handoff and the assembled final package are parsed and validated before
persistence or return.

## 10. Replit track / Replit Agent usage

The application was developed in Replit with Replit Agent. Replit manages the
workspace workflows, path-based artifact routing, PostgreSQL, Secrets, optional
Clerk authentication, release validation, and publishing configuration.
Collaborator-visible build decisions and milestones are preserved in
`replit.md`; `.replit` and artifact manifests preserve the executable workflow
and publishing configuration.

## 11. Technology stack

- TypeScript
- React 19, Vite, TanStack Query, React Hook Form
- Express 5
- Google Agent Development Kit for TypeScript
- Gemini 3.6 Flash
- PostgreSQL and Drizzle ORM
- Clerk authentication
- OpenAPI, Orval, and Zod
- Node.js test runner, Testing Library, and JSDOM
- pnpm workspaces on Replit

No OpenAI, Anthropic, Microsoft AI, or AWS AI provider is used at runtime.

## 12. Setup

Prerequisites:

- Node.js 24.13 or later
- pnpm
- PostgreSQL
- A Gemini API key with available quota/billing
- Clerk configuration if account routes are enabled

Install dependencies:

```bash
pnpm install
```

Apply the development database schema and generate API clients:

```bash
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-spec run codegen
```

## 13. Required environment variables

Configure these as Replit Secrets or equivalent server environment variables.
Never commit their values.

| Name | Used by | Purpose |
|---|---|---|
| `GOOGLE_API_KEY` | API server | Gemini access |
| `SESSION_SECRET` | API server | Signs guest-workspace cookies; keep stable |
| `CLERK_SECRET_KEY` | API server | Optional Clerk server verification |
| `CLERK_PUBLISHABLE_KEY` | API server | Clerk proxy/configuration |
| `VITE_CLERK_PUBLISHABLE_KEY` | Web build | Public Clerk SDK configuration |
| `DATABASE_URL` | Database/API | PostgreSQL connection |

The Clerk publishable key is intentionally public configuration. Secret keys,
session secrets, database credentials, and Google credentials remain
server-side.

## 14. Running locally

Run the API and web workflows in separate terminals:

```bash
pnpm --filter @workspace/api-server run dev
pnpm --filter @workspace/creative-crew run dev
```

Run the release gate:

```bash
pnpm run validate
```

The root build runs validation before building all workspace packages:

```bash
pnpm run build
```

## 15. Replit deployment

The workspace defines path-routed web and API artifacts and an autoscale
application deployment target. The exact production routing is not considered
verified until a successful public publish and smoke test. In Replit:

1. Add the required Secrets.
2. Confirm the production PostgreSQL schema before publishing.
3. Open Publishing and choose public visibility.
4. Optionally enable Replit Analytics under advanced settings.
5. Publish, then test the exact production URL returned by Replit.

Do not infer the production URL from development environment variables.

## 16. Example creative brief

> Create a cinematic launch film treatment for a new specialty coffee brand
> opening in Riyadh. The audience is culturally curious young professionals and
> design-conscious coffee lovers. Make the ritual of coffee feel contemporary,
> warm, and rooted in Riyadh without relying on clichés. Build toward the
> opening-night reveal with tactile sound, elegant natural light, and a
> confident sense of community.

## 17. Persisted package workflow

Each successful generation creates a new project with one persisted package.
The current interface can reopen it read-only, including overview, treatment,
script, visual direction, production plan, shot list, QA, milestones, and final
summary. Older treatment-only JSONB records remain readable. The API includes a
newest-first treatment-list response, but the supported product flow does not
ask Gemini to revise an earlier package.

## 18. Creative QA

Creative QA is the fifth Gemini stage. It returns PASS or NEEDS_REVISION plus
checks, issues, and corrections; it does not autonomously re-run or correct
earlier stages. Strict Zod validation and explicit failure handling remain
deterministic quality gates. QA status is not human editorial approval.

## 19. Privacy / analytics notes

Analytics are optional and non-blocking. Events use fixed allowlisted fields and
exclude emails, account/project IDs, briefs, treatment content, cookies,
credentials, and raw errors. Tracker failure cannot interrupt navigation,
claiming, or generation. See [docs/analytics.md](docs/analytics.md).

## 20. Known limitations

- No image or storyboard generation
- No autonomous correction loop, exports, or sophisticated revision workflow
- One generated package per project; no revision-instruction loop
- ADK execution is in-memory while durable run metadata lives in PostgreSQL
- Gemini Developer API path; no Vertex AI deployment in this release
- No production deployment has been verified or published
- Account access depends on correctly configured Clerk environments
- Analytics collect only after publishing with analytics enabled

## 21. Hackathon learnings

- Prove the real provider path before expanding agent count.
- Treat structured output as untrusted until server validation succeeds.
- Keep ownership and provider session data on the server.
- Persist failed attempts honestly instead of manufacturing fallback output.
- Make analytics optional, allowlisted, and unable to block product behavior.

## 22. License

Creative Crew is available under the [MIT License](LICENSE).