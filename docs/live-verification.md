# Live pre-production-package verification

## Verified runtime

The current five-stage runtime was verified on September 7, 2026 against the
running development artifacts:

- Web workspace: `/`
- API endpoint: `POST /api/creative-treatment`
- Agent runtime: five sequential Google ADK `LlmAgent` and `InMemoryRunner`
  stages (Creative Director, Writer, Art Director, Production Planner, Creative QA)
- Gemini model: `gemini-3.6-flash`

## Brief submitted

> Create a cinematic launch film treatment for a new specialty coffee brand
> opening in Riyadh. The audience is culturally curious young professionals and
> design-conscious coffee lovers. The film should make the ritual of coffee feel
> contemporary, warm, and unmistakably rooted in Riyadh without relying on
> clichés. Build toward the opening-night reveal, with tactile sound, elegant
> natural light, and a confident sense of community.

## Real acceptance result — September 7, 2026

The live endpoint returned **HTTP 201 in 45.8 seconds**. Five ADK logs confirmed
the `GEMINI_API` backend. The response was accepted by
`CreateCreativeTreatmentResponse` and contained a complete package:

- overview and creative treatment
- script with **6 scenes**
- textual visual direction
- production plan with **11 shots**
- Creative QA **PASS** with **8 checks**
- five workflow milestones and a final package summary
- `generatedBy: "google-adk-gemini"`

The owner-scoped persisted `GET` returned **HTTP 200** with one record and all
package fields. No fixture or mocked provider output was used.

## Failure evidence and scope

An earlier real attempt used a lower Production Planner token budget. Its output
was truncated/malformed; the request returned HTTP 502 and the run was
persisted as failed. No fallback content was substituted. The planner allowance
was stage-tuned, and the acceptance run above then passed.

This verifies the development brief-to-package path, not a public production
deployment. It does not verify image/storyboard generation, an autonomous
correction loop, exports, or a sophisticated revision workflow.