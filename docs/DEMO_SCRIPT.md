# Creative Crew demo script

Target duration: **2:45–3:00**

Use a clean browser session and the verified Riyadh coffee brief below. Start
with both the app and this repository ready so no time is lost navigating.

## 0:00–0:20 — Problem and thesis

**Say**

“Filmmaking starts with a brief, but production needs a clear creative
direction. Creative Crew turns one raw brief into a structured pre-production
package through five real Google ADK specialists powered by Gemini.”

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

“The API has created a durable project and now deterministically runs Creative
Director, Writer, Art Director, Production Planner, and Creative QA through
`InMemoryRunner`. Each Gemini 3.6 Flash stage gets a structured handoff. There
is no fixture fallback—if a stage fails, the app reports a failure and preserves
the brief for retry.”

**Show**

The live progress state. Do not cut away to a pre-generated result.

## 1:20–1:55 — Walk through the package

After the live result appears, show:

- workflow milestones and project overview
- title, logline, creative direction, and guardrails
- script scenes and textual visual direction
- production plan and shot list
- Creative QA checks and final package summary
- `google-adk-gemini` attribution

**Say**

“The server strictly validates each structured handoff and the assembled final
package before persistence or display. QA is not a human review and does not
autonomously correct the package.”

## 1:55–2:15 — Show persistence

Select the generated project in the saved-project list and reopen its persisted
package.

**Say**

“Projects and validated packages persist in PostgreSQL and can be reopened.
Older treatment-only records remain readable. Each project currently has one
package; this release does not pretend to have a revision-prompt loop.”

## 2:15–2:40 — Establish architecture and safeguards

Open:

`artifacts/api-server/src/routes/creative-treatment.ts`

Point to:

- five sequential `LlmAgent` / `InMemoryRunner` stages
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
validated package. It does not generate images or storyboards, autonomously
correct output, export files, offer sophisticated revisions, or have a verified
production deployment.”

## Recording safety checklist

- Use only a real live generation.
- Do not claim image/storyboard generation, autonomous correction, exports,
  sophisticated revisions, or a public production URL.
- Do not expose Replit Secrets, cookies, IDs, database credentials, or account
  details on screen.
- If Gemini fails during recording, show the honest error briefly and retry; do
  not substitute a fixture.
- Keep the final recording at or below three minutes.