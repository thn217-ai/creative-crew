---
name: GitHub release publishing
description: How to publish this repository when the GitHub connector cannot authenticate the Git transport.
---

Use Replit's Git pane for a full repository push when connector OAuth is the
only available GitHub authorization.

**Why:** The connector safely proxies GitHub REST requests but does not expose
its OAuth token to Git credential storage. Direct HTTPS push therefore fails,
and trying to upload hundreds of repository files through Git Data endpoints
can trigger GitHub secondary write limits.

**How to apply:** Use the connector for repository existence, visibility, and
metadata checks. Use Replit's Git integration to authorize and push the actual
branch and history. Keep an incomplete repository private until the full tree
is present and verified.