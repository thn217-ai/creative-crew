# Live creative-treatment verification

## Verified runtime

The Milestone 1 runtime was verified on September 5, 2026 against the running
development artifacts:

- Web workspace: `/`
- API endpoint: `POST /api/creative-treatment`
- Agent runtime: Google ADK `LlmAgent` and `InMemoryRunner`
- Gemini model: `gemini-3.6-flash`

## Brief submitted

> Create a cinematic launch film treatment for a new specialty coffee brand
> opening in Riyadh. The audience is culturally curious young professionals and
> design-conscious coffee lovers. The film should make the ritual of coffee feel
> contemporary, warm, and unmistakably rooted in Riyadh without relying on
> clichés. Build toward the opening-night reveal, with tactile sound, elegant
> natural light, and a confident sense of community.

## API result

The live endpoint returned HTTP 200 with a response accepted by
`CreateCreativeTreatmentResponse`. The generated treatment included every
required field:

- `title`
- `logline`
- `centralIdea`
- `emotionalDirection`
- `tone`
- `narrativeApproach`
- `visualPrinciples`
- `audiencePromise`
- `guardrails`
- `generatedBy: "google-adk-gemini"`

One verified title was **The Geometry of Warmth**. A second request submitted
through the browser produced **Suhail: Modern Rituals of Riyadh**, confirming the
UI used a live generation rather than a stored fixture.

## Browser verification

A fresh browser session entered the exact brief in `input-brief` and clicked
`button-submit`. The workspace progressed through its processing state and
rendered `TREATMENT APPROVED` with non-empty content for every required treatment
section and the exact `google-adk-gemini` attribution.

The browser-observed API request completed in approximately 8.6 seconds. No
browser console errors, API error messages, or rendering failures were observed.

## Final log check

The API log recorded both verification requests as HTTP 200:

- Direct API verification: approximately 9.0 seconds
- Browser submission: approximately 8.6 seconds

Both requests logged an outbound ADK request using `gemini-3.6-flash` and the
Gemini API backend. The final browser console contained only the normal Vite
connection messages.

## Final release verification — September 7, 2026

After the treatment-history and privacy-safe analytics work was merged, the
real development endpoint was tested again with the Riyadh coffee brief.

- `POST /api/creative-treatment` returned HTTP 201.
- The returned treatment had non-empty values for every required scalar and
  list field.
- Attribution was exactly `google-adk-gemini`.
- The owner-scoped treatment-list request returned HTTP 200 with one persisted
  treatment for the newly generated project.
- No fixture or mocked provider output was used for this check.

This check verifies the implemented brief-to-treatment path. It does not verify
separate screenplay, storyboard, shot-list, production-plan, specialist-agent,
or creative-QA stages because those stages are not implemented.