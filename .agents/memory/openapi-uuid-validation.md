---
name: OpenAPI UUID validation
description: Why API UUID fields currently use explicit patterns instead of the OpenAPI UUID format.
---

Use an explicit UUID regex pattern in the OpenAPI specification rather than
`format: uuid` until the generated schema package and its resolved Zod runtime
are version-aligned.

**Why:** The current Orval generator emits the Zod 4-only `zod.uuid()` helper
for `format: uuid`, while the generated schema package resolves a Zod 3 runtime.
Code generation succeeds but the required library typecheck then fails.

**How to apply:** For new UUID response fields and path parameters, copy the
existing strict UUID pattern from the API spec. Revisit this only after verifying
that codegen and the full workspace typecheck both resolve Zod 4.