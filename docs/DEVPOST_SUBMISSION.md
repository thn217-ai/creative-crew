# Devpost submission draft

## Project name

Creative Crew

## One-line description

One filmmaking brief becomes a structured, persistent creative treatment
through a real Google ADK Creative Director powered by Gemini.

## Problem

Filmmakers begin with raw, expressive briefs, but pre-production needs a clear
creative direction that downstream writers, visual teams, and producers can
use. Converting intent into a coherent treatment is slow and easy to fragment.

## What Creative Crew does

Creative Crew accepts one filmmaking brief, runs a bounded AI
creative-director workflow, validates the result, and presents a structured
treatment covering concept, narrative, emotion, visual direction, audience
promise, and guardrails. Projects and their generated treatments persist for
later review.

## How it works

The React application sends a validated brief to an Express API. The server
creates a durable project, runs a Google ADK `LlmAgent` through
`InMemoryRunner`, and sends the brief to Gemini 3.6 Flash. The JSON result must
pass a Zod schema before PostgreSQL persistence and display. Provider failures
remain visible as failures; no fake treatment is substituted.

## Technologies used

TypeScript, React, Vite, Express, Google ADK, Gemini 3.6 Flash, PostgreSQL,
Drizzle ORM, Clerk, OpenAPI, Orval, Zod, TanStack Query, Testing Library, and
Replit.

## Google Cloud / Gemini usage

Gemini provides the treatment's creative intelligence. The API key remains
server-side, execution has a bounded timeout, and generated output is validated
before use. The current release uses the Gemini Developer API rather than
Vertex AI.

## Google ADK / agent usage

Google ADK is executable runtime infrastructure, not a documentation label.
The server creates an ADK `LlmAgent`, creates an ADK session, and consumes
`runner.runAsync()` events from `InMemoryRunner`. Inspect
`artifacts/api-server/src/routes/creative-treatment.ts`.

## Replit usage

Creative Crew was developed with Replit Agent in a pnpm monorepo. Replit hosts
the development workflows, PostgreSQL, Secrets, optional managed Clerk
configuration, artifact routing, release validation, and publishing setup.

## Key features

- Real Google ADK + Gemini treatment generation
- Strict structured-output validation
- Guest and optional account-backed workspaces
- Explicit browser-project claiming
- Persistent projects and read-only treatment reopening
- Honest loading, provider-error, timeout, and retry states
- Owner-scoped API access
- Privacy-safe, non-blocking analytics
- Automated release validation

## Challenges encountered

- Preserving creative specificity inside a strict machine-validated schema
- Keeping provider and ADK session details private
- Supporting anonymous work without losing the path to an account
- Handling account switches without crossing ownership boundaries
- Proving that UI success reflects a real provider response
- Keeping analytics useful without sending creative or personal content

## What we learned

The most reliable agentic product path was to prove one real bounded agent
end-to-end before expanding orchestration. Deterministic ownership, persistence,
timeouts, and validation make generated intelligence trustworthy enough to use
in a production-facing workflow.

## Known limitations

- The current runtime has one Creative Director agent.
- Output is a structured treatment, not a screenplay, storyboard, shot list, or
  assembled production package.
- Each generated project has one treatment; there is no revision-instruction
  loop.
- “Treatment approved” indicates schema validation, not human editorial review.
- The current provider path uses the Gemini Developer API, not Vertex AI.

## Hosted application URL

`[ADD VERIFIED PUBLIC REPLIT URL AFTER PUBLISHING]`

## GitHub repository URL

`[ADD PUBLIC GITHUB REPOSITORY URL AFTER SECURITY REVIEW AND PUSH]`