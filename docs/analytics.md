# Account adoption analytics

These optional custom events measure whether filmmakers enter the account flow,
whether the app observes a completed authentication transition, and whether
browser-project claims complete. They do not identify individual filmmakers.

| Description | Event name | Properties |
| --- | --- | --- |
| A filmmaker clicks Sign In or Create Account in the workspace header | `account_entry_clicked` | `entry`: `sign_in` or `sign_up`; `location`: `workspace_header` |
| The loaded Clerk state changes from signed out to signed in during the current app session | `authentication_completed` | None |
| The claim endpoint returns success | `project_claim_succeeded` | `claimed_project_count`: the confirmed nonnegative integer from the server |
| The claim request fails, including a network failure | `project_claim_failed` | None |

A successful response with a count of zero means no projects were transferred.
Filter successes to `claimed_project_count > 0` when measuring saves rather
than successful requests. Retries are separate requests and can each produce
an outcome; list/workspace refetches and rerenders never produce outcomes.

`authentication_completed` is emitted only after the app has first confirmed a
signed-out state and then observes a signed-in state. It is not emitted for an
initially authenticated page load, rerender, refetch, or reload. The event
measures successful authentication, not necessarily new account creation:
either sign-in or sign-up can produce it. Because it has no identity or durable
browser identifier, event counts cannot be interpreted as unique users.

## Privacy and resilience

- The shared wrapper constructs an allowlisted payload rather than forwarding
  arbitrary objects. No emails, account/project IDs, briefs, treatments, raw
  errors, cookies, credentials, or free-form user content are sent in custom events.
- It does nothing without the injected tracker, including development and
  server-side rendering. Synchronous exceptions and asynchronous rejections
  are ignored; navigation and application requests never wait for analytics.
- No tracker script, website ID, analytics URL, or analytics environment
  variable is configured in application code.

## Activation and verification

Enable analytics in Publishing settings and publish or republish the app.
Replit injects its tracker into supported published web apps; it is not
expected in the development preview.

The root `pnpm run validate` gate runs wrapper and mounted-page checks with
controlled state transitions, HTTP responses, and local tracker spies. They
verify payload privacy, authentication duplicate prevention, post-response
timing, no duplicates on refetch, failure/retry outcomes, and uninterrupted
navigation, authentication state updates, claiming, and generation with a
missing or broken tracker. These automated checks do not claim delivery to
published analytics.