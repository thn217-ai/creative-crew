---
name: Structured stage token budgets
description: Reliability guidance for the staged Gemini pre-production workflow.
---

Give the production-planning stage more output-token headroom than the lighter
creative-direction stages, and keep schema validation as the success boundary.

**Why:** A real planner run reached the provider successfully but exhausted the
smaller output allowance while producing its shot list, leaving malformed JSON.
The request failed safely; a stage-specific larger allowance produced a valid
complete package on the next real run.

**How to apply:** When expanding a structured stage, size its output allowance
for the largest expected arrays rather than copying a global default. Never
persist or return a truncated stage as successful, and do not log raw output.