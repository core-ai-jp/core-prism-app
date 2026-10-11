# Token-efficient agent workflow

This document supplements `AGENTS.md`; its security, knowledge provenance, and project-specific requirements take precedence.

## Default workflow
1. State the requested outcome and identify the smallest relevant file set. Inspect paths and short summaries before reading full files.
2. Read existing `AGENTS.md` and task-relevant `CLAUDE.md` instructions. Consult private `core-knowledge` only when organization-wide decisions are necessary; use the relevant index and decision records, not an indiscriminate full-vault dump. Record the source revision and any unavailable context.
3. Reuse the current task's verified findings; do not repeatedly fetch unchanged files. Prefer diffs and targeted line ranges on follow-up work.
4. Make minimal changes. Avoid unrelated refactors, bulk formatting, dependency upgrades, and generated output unless explicitly required.
5. Run the narrowest safe validation first; expand to the repository-required checks for code changes. Inspect CI targets before invoking anything that might touch production.
6. Report files changed, tests run, unresolved risks, and the next action in a concise handoff.

## Cost and execution controls
- No autonomous retry loops. After one failed attempt, diagnose the cause before retrying; stop and report if permission or external access is blocked.
- Avoid unnecessary parallel agents and repeated full-repository scans. Use heavier models or browser automation only when the task requires them.
- Never claim a quantified token saving without measured before/after usage data.
- Do not weaken authentication, authorization, privacy, tests, or security controls to save tokens.
- Follow the current owner approval boundary: confirm immediately before money-related execution and production changes to user-visible appearance. Keep external communication, credentials, destructive actions, and permissions within the explicit task and runtime permissions.
- Do not copy private knowledge or customer data into this public repository.
## Structured handoffs and Jev
Use compact JSON only for agent-to-agent handoffs, with only relevant task, state, decision, file, check, and blocker fields; JSON does not guarantee token savings. Jev may batch low-risk classification/routing if already installed and authenticated and expected total cost is lower than the work saved. Do not use Jev for writing, summaries, extraction, complex reasoning, or calculations; do not install it or configure paid credentials automatically.

- Match model and reasoning effort to task difficulty; use the lightest reliable option for routine work and escalate only when complexity, uncertainty, or risk needs it.
