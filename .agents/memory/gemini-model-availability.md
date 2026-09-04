---
name: Gemini model availability
description: Runtime evidence about Gemini Developer API model availability for this project.
---

Use `gemini-3.6-flash` for the Google ADK Gemini Developer API path unless a
fresh runtime check proves a newer supported model is required.

**Why:** On 2026-09-04, the live API rejected `gemini-2.5-flash` for new users
and explicitly directed new projects to `gemini-3.6-flash`.

**How to apply:** Preserve the configured 3.6 model when extending the ADK
workflow. If Google later rejects it, trust the live provider response and
update the model plus architecture documentation together.