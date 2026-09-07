# Creative Crew demo script

Target duration: **2:45–3:00**

Use a clean browser session and the verified Riyadh coffee brief below. Start
with both the app and this repository ready so no time is lost navigating.

## 0:00–0:20 — Problem and thesis

**Say**

“Filmmaking starts with a brief, but production needs a clear creative
direction. Creative Crew turns one raw brief into one structured treatment
through a real Google ADK agent powered by Gemini.”

**Show**

The empty Creative Crew workspace.

## 0:20–0:40 — Enter one creative brief

Paste:

> Create a cinematic launch film treatment for a new specialty coffee brand
> opening in Riyadh. The audience is culturally curious young professionals and
> design-conscious coffee lovers. Make the ritual of coffee feel contemporary,
> warm, and rooted in Riyadh without relying on clichés. Build toward the
> opening-night reveal with tactile sound, elegant natural light, and a
> confident sense of community.

Click **Generate Treatment** once.

## 0:40–1:20 — Show live execution

**Say**

“The API has created a durable project and is now running a bounded Google ADK
Creative Director through `InMemoryRunner`. Gemini 3.6 Flash must return the
exact treatment schema. There is no fixture fallback—if the provider fails, the
app reports a failure and preserves the brief for retry.”

**Show**

The live progress state. Do not cut away to a pre-generated result.

## 1:20–1:55 — Walk through the treatment

After the live result appears, show:

- title and logline
- central idea and emotional direction
- tone and narrative approach
- visual principles
- audience promise and guardrails
- `google-adk-gemini` attribution

**Say**

“The server validates this structured response before it is persisted or shown.
‘Treatment approved’ means schema-approved—not a fake human review.”

## 1:55–2:15 — Show persistence

Select the generated project in the saved-project list and reopen its persisted
treatment.

**Say**

“Projects and validated treatments persist in PostgreSQL and can be reopened.
Each generated project currently has one treatment; this release does not
pretend to have a revision-prompt loop.”

## 2:15–2:40 — Establish architecture and safeguards

Open:

`artifacts/api-server/src/routes/creative-treatment.ts`

Point to:

- `LlmAgent`
- `InMemoryRunner`
- `gemini-3.6-flash`
- `runner.runAsync()`
- Zod validation

**Say**

“Generated intelligence comes from Gemini. Ownership, persistence, timeouts,
validation, and failure behavior are deterministic application logic. Google
credentials and private ADK session IDs never reach the browser.”

## 2:40–3:00 — Close accurately

**Say**

“Creative Crew proves the complete real path from filmmaker brief to a durable,
validated creative treatment. The next stages—specialist agents, screenplay,
shot planning, and creative QA—are intentionally outside this release.”

## Recording safety checklist

- Use only a real live generation.
- Do not claim separate writer, visual, production, or QA agents.
- Do not expose Replit Secrets, cookies, IDs, database credentials, or account
  details on screen.
- If Gemini fails during recording, show the honest error briefly and retry; do
  not substitute a fixture.
- Keep the final recording at or below three minutes.