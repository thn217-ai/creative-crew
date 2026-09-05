# Creative Crew architecture

## Milestone 2 runtime

```text
React/Vite web app
  -> GET /api/creative-projects or /api/creative-projects/:projectId
  -> POST /api/creative-treatment
  -> Express validation
  -> PostgreSQL project + ADK session record
  -> Google ADK LlmAgent + InMemoryRunner
  -> Gemini 3.6 Flash
  -> ADK output schema
  -> server validation
  -> persisted treatment revision
  -> refresh-safe project workspace
```

The browser never receives Google credentials or internal ADK session identifiers.
Each browser workspace receives a signed, HTTP-only identifier cookie; every
project lookup is owner-scoped and cross-workspace identifiers return not found.
The API persists the submitted brief and an ADK session record before generation,
runs one bounded Creative Director agent, and stores only output that passes the
server treatment schema. Failed attempts remain visible as projects without a
treatment, rather than receiving substitute content.

Project history is loaded newest-first when the workspace opens. A project detail
endpoint lets the browser reopen the latest validated treatment after refresh.
The treatment-history endpoint returns validated revisions newest-first without
including provider session data.
The current one-shot ADK runner remains in memory during execution, while its
session identity and completion state are durable in PostgreSQL for later
workflow expansion.

## Why this shape

- Milestone 1 proved the complete runtime path before adding more agents.
- Milestone 2 establishes projects as the durable boundary for briefs, ADK runs,
  and validated treatment revisions.
- Google ADK is used in executable server code, not only named in documentation.
- The workflow is deterministic at the application layer; later specialists will
  run through explicit dependencies rather than open-ended agent conversation.
- Provider session metadata is private API state and is never serialized to the
  browser.

## Required configuration

- Replit Secret: `GOOGLE_API_KEY`
- Runtime: Node.js 24.13 or later
- Google package: `@google/adk`
- An active Gemini API project with available billing credits or quota

## Google Cloud services

For the Milestone 1 Gemini Developer API path, create the key in Google AI Studio
and ensure the Gemini API is available for that key. No browser-side Google setup
is required.

For a future Vertex AI production path, enable the Vertex AI API, configure a
Google Cloud project and location, and use Application Default Credentials or a
server-side Vertex API key. That migration is not required to prove Milestone 1.

## Verified implementation plan

1. Milestone 1: real brief -> ADK -> Gemini -> validated treatment -> UI. Complete.
2. Milestone 2: structured project state and session persistence. Complete.
3. Milestone 3: deterministic specialist workflow and Creative QA.
4. Milestone 4: complete production workspace and activity feed.
5. Milestone 5: dependency-aware creative revision.
6. Milestone 6: optional Google-generated storyboard frames.

## Sources reviewed

- Google ADK TypeScript quickstart: <https://google.github.io/adk-docs/get-started/typescript/>
- Google ADK sequential agents: <https://google.github.io/adk-docs/agents/workflow-agents/sequential-agents/>
- Gemini API keys: <https://ai.google.dev/gemini-api/docs/api-key>
- Gemini structured output: <https://ai.google.dev/gemini-api/docs/structured-output>
- Replit publishing: <https://docs.replit.com/features/publishing/overview>
- Replit Secrets: <https://docs.replit.com/core-concepts/project-editor/app-setup/secrets>