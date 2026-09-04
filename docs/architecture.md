# Creative Crew architecture

## Milestone 1 runtime

```text
React/Vite web app
  -> POST /api/creative-treatment
  -> Express validation
  -> Google ADK LlmAgent + InMemoryRunner
  -> Gemini 3.6 Flash
  -> ADK output schema
  -> server validation
  -> structured treatment in the workspace
```

The browser never receives Google credentials. The API creates an ephemeral ADK
session for each brief, runs one bounded Creative Director agent, validates its
structured response, and returns a clear failure instead of substitute content.

## Why this shape

- Milestone 1 proves the complete runtime path before adding more agents.
- Google ADK is used in executable server code, not only named in documentation.
- The workflow is deterministic at the application layer; later specialists will
  run through explicit dependencies rather than open-ended agent conversation.
- Session persistence and a database are intentionally deferred until Milestone 2.

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

1. Milestone 1: real brief -> ADK -> Gemini -> validated treatment -> UI.
2. Milestone 2: structured project state and session persistence.
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