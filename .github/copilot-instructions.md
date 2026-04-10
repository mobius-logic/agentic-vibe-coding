# Project Standards

## Architect-First Protocol (MANDATORY)

This project uses a multi-agent workflow. **All non-trivial changes MUST go through the proper agent workflow.** If you are a Copilot agent (including the default agent mode) receiving a request to implement features, fix bugs, refactor code, or make architectural changes:

1. **Check `.plans/` for an approved plan** that covers the requested change. If one exists, follow it.
2. **If no approved plan exists**, do NOT proceed with implementation. Instead:
   - Inform the user that this project requires changes to be routed through `@architect` first for design/planning, or through the appropriate team lead (`@backend-lead`, `@frontend-lead`, `@infra-lead`) for scoped feature work.
   - Suggest: _"This project follows an architect-first workflow. Please invoke `@architect` to design this change, or `@<lead>` to plan and delegate it — so the work is properly planned, tracked, and logged."_
3. **Exceptions** (small changes that may proceed without a plan):
   - Typo fixes in documentation
   - Single-line bug fixes with obvious correctness
   - Updating dependencies / lockfiles
   - Changes explicitly requested by a team lead agent as part of an active plan

**Why**: Direct edits bypass the planning, branching, testing, logging, and review protocols that this template enforces. Unplanned changes create drift from the architectural design and are not tracked in `.agent-logs/`.

## Repository
- Main branch: `main` (protected)
- Feature branches: `feature/<area>/<short-description>`
- Bug fix branches: `fix/<area>/<short-description>`

## Branching Workflow
- Always create a feature branch before making changes
- Never commit directly to `main`
- Write descriptive commit messages: `<type>(<scope>): <description>`
- Types: feat, fix, docs, test, refactor, chore

## Planning Workflow
- For new projects, start with `@architect` to design the system architecture before tasking leads
- The architect iteratively interviews the human, produces architecture documents, and decomposes into workstream briefs
- **Only `@architect` may create or edit files in `.plans/`** — team leads and all other agents treat `.plans/` as read-only
- Team leads MUST read the relevant `.plans/` file to understand the architectural context before executing
- Team leads MUST present execution plans to the human user for approval before starting work
- Team leads log their approved execution details and session summaries in `.agent-logs/`, NOT in `.plans/`
- Approved plans and architecture documents are saved to `.plans/` with date-timestamped filenames
- All agents must reference the relevant plan/architecture file in their work and logs
- Plans are immutable after approval — they serve as the source of truth

## Code Quality
- All code must have tests before merge
- Run the project's test command before considering work complete
- Follow existing patterns in the codebase
- No commented-out code in commits

## Documentation
- Team leads MUST invoke @docs-writer after implementation to update project documentation
- `README.md` contains project-specific documentation (features, setup, usage)
- `TEMPLATE-GUIDE.md` contains template usage instructions — do not overwrite
- Architecture documents in `.plans/` serve as canonical design references
- **Only `@architect` may create or edit files in `.plans/`** — team leads and all other agents treat `.plans/` as read-only
- Agent logs in `.agent-logs/` must include plan references and full timestamps

## Agent Monitor Dashboard
- An optional web-based dashboard is available at `dashboard/`
- Launch with `node dashboard/start.js` (opens at http://127.0.0.1:4820)
- The dashboard reads `.agent-logs/`, `.plans/`, `.agent-events/`, and git branch data
- Agents may write structured events to `.agent-events/events.jsonl` using `dashboard/lib/log-event.js`
- The dashboard is purely additive — it does not affect existing agent behavior

## Strict Delegation Protocol (MANDATORY)
**Protocol Reference**: `.plans/2026-04-09-180237-strict-delegation-protocol.md`

All lead agents (backend-lead, frontend-lead, infra-lead) MUST follow the **7-Gate Mandatory Execution Sequence** when executing work. No gate may be skipped.

| Gate | Required Action | Cannot Proceed Until |
|------|----------------|---------------------|
| 0 | Plan Approval | Human approves execution plan |
| 1 | Branch Creation | Feature branch exists |
| 2 | Implementation | `@developer` returns completion report |
| 3 | Testing | `@tester` returns verdict "ALL PASS" |
| 4 | Code Review | `@code-reviewer` returns verdict "APPROVE" |
| 5 | Documentation | `@docs-writer` returns completion report |
| 6 | Pre-Commit Checklist | All 6 checkboxes verified TRUE |
| 7 | Commit & Report | Session log written, events emitted |

### Delegation Rules
- Leads MUST pass a **Delegation Payload** (plan ref, branch, task, acceptance criteria) to every subagent
- Subagents MUST return a **Completion Report** with structured fields including "Log Written: yes/no"
- Leads MUST verify each subagent's "Log Written" field is "yes" before proceeding
- If `@tester` reports failures → loop back to `@developer`, then re-test
- If `@code-reviewer` requests changes → loop back to `@developer`, re-test, re-review
- NEVER skip `@tester`, `@code-reviewer`, or `@docs-writer` — all three are mandatory
- All agents MUST write session logs to `.agent-logs/` and emit dashboard events

## Collaboration
- Each workstream operates on its own feature branch
- Use pull requests for integration to `main`
- Agents must document non-obvious decisions in code comments
