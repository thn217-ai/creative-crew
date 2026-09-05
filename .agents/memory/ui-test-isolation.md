---
name: UI test isolation
description: Why client interaction checks must not share an already-initialized server-rendering runtime.
---

Keep browser-mode interaction tests and static/server-rendering tests isolated
when extending the treatment regression suite.

**Why:** React DOM and query libraries select browser capabilities during module
initialization, not when a component is mounted. Installing a DOM after importing
them can leave cached server-mode behavior in a seemingly client-side test.
Static markup checks alone cannot expose broken event handling or retry requests.

**How to apply:** Initialize the test browser environment before client libraries
are evaluated. Preserve process isolation between static and DOM suites if the
test runner is changed; do not rely on adding browser globals midway through a
shared, already-loaded module graph.