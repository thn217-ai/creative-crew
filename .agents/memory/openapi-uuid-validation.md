---
name: OpenAPI runtime compatibility
description: Why Orval version detection is unsafe across this workspace's mixed Zod versions.
---

Do not assume successful OpenAPI generation implies its schemas match their
runtime. In a mixed-version workspace, target the generated package's Zod
version rather than the server's.

**Why:** Auto-detection emitted Zod 4-only helpers for both UUIDs and integers
while the generated schema library resolved Zod 3. A UUID regex workaround hid
the initial symptom, but a later integer field exposed the underlying mismatch.

**How to apply:** When updating Orval or Zod, verify the generated library's
runtime compatibility independently of the API server. Keep library typechecking
as part of codegen; do not weaken API contracts just to avoid incompatible helpers.