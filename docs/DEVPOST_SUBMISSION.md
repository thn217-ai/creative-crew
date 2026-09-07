# Devpost submission draft

## Project name

Creative Crew

## One-line description

One filmmaking brief becomes a structured, persistent pre-production package
through five real Google ADK specialists powered by Gemini.

## Problem

Filmmakers begin with raw, expressive briefs, but pre-production needs a clear
creative direction that downstream writers, visual teams, and producers can
use. Converting intent into a coherent treatment is slow and easy to fragment.

## What Creative Crew does

Creative Crew accepts one filmmaking brief, runs a bounded five-stage AI crew
workflow, validates the result, and presents creative direction, script,
textual visual direction, production plan, shot list, QA, milestones, and final
summary. Projects and their generated packages persist for later review.

## How it works

The React application sends a validated brief to an Express API. The server
creates a durable project, then deterministically invokes Creative Director,
Writer, Art Director, Production Planner, and Creative QA Google ADK
`LlmAgent`/`InMemoryRunner` stages on Gemini 3.6 Flash. Structured handoffs
feed each stage. The server assembles milestones and one package; strict Zod
validation precedes PostgreSQL JSONB persistence and display. Provider failures
remain visible as failures; no fake package is substituted.

## Technologies used

TypeScript, React, Vite, Express, Google ADK, Gemini 3.6 Flash, PostgreSQL,
Drizzle ORM, Clerk, OpenAPI, Orval, Zod, TanStack Query, Testing Library, and
Replit.

## Google Cloud / Gemini usage

Gemini provides the specialists' creative intelligence. The API key remains
server-side, execution has a bounded timeout, and generated output is validated
before use. The current release uses the Gemini Developer API rather than
Vertex AI.

## Google ADK / agent usage

Google ADK is executable runtime infrastructure, not a documentation label.
The server creates five sequential ADK `LlmAgent` stages, stage sessions, and
consumes `runner.runAsync()` events from `InMemoryRunner`. Inspect
`artifacts/api-server/src/routes/creative-treatment.ts`.

## Replit usage

Creative Crew was developed with Replit Agent in a pnpm monorepo. Replit hosts
the development workflows, PostgreSQL, Secrets, optional managed Clerk
configuration, artifact routing, release validation, and publishing setup.

## Key features

- Five-stage real Google ADK + Gemini package generation
- Strict stage and final-package structured-output validation
- Guest and optional account-backed workspaces
- Explicit browser-project claiming
- Persistent projects and read-only package reopening; older treatment-only
  records remain readable
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

Structured handoffs let specialists build on approved context while the server
retains deterministic ownership, persistence, timeout, assembly, and validation
boundaries. A first real attempt failed honestly when the Production Planner
output was truncated/malformed at a lower token budget (HTTP 502 and persisted
failed run); stage-tuning that allowance led to the next real successful run.

## Known limitations

- No image or storyboard generation, autonomous correction loop, exports, or
  sophisticated revision workflow.
- Each generated project has one package; there is no revision-instruction loop.
- QA is generated QA, not human editorial approval.
- The current provider path uses the Gemini Developer API, not Vertex AI.
- No production deployment has been verified or published.

## Hosted application URL

`[ADD VERIFIED PUBLIC REPLIT URL AFTER PUBLISHING]`

## GitHub repository URL

`[ADD PUBLIC GITHUB REPOSITORY URL AFTER SECURITY REVIEW AND PUSH]`