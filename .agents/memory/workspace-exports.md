---
name: Safe workspace exports
description: Prevent hidden runtime configuration from leaking through downloadable or committed archives.
---

Build any source-code export from an explicit allowlist, never by recursively
archiving the workspace root.

**Why:** This environment stores runtime environment snapshots in hidden caches,
including nested workspace copies. A recursive ZIP can include those snapshots,
dependencies, and other runtime state even when Git correctly ignores the
original files. An archive does not inherit its contents' Git ignore rules.

**How to apply:** Include only intended application source and static assets.
Exclude caches, environment files, dependencies, VCS directories, and generated
runtime state. Inspect archive entry names without opening environment snapshots
before considering an export safe to commit or distribute.