# Architecture: Remove Dashboard and Agent Events

- **Date**: 2026-06-10 10:51:59
- **Architect**: architect
- **Status**: approved
- **Feature Fingerprint**: remove-dashboard

## Feature Fingerprint
- **Canonical Name**: remove-dashboard
- **Aliases**: delete dashboard, remove agent monitor, cleanup dashboard
- **Category**: refactor (removal)

## Project Summary
Remove the Agent Monitor Dashboard and all associated event infrastructure from the project. The dashboard is not working as intended and is no longer needed.

## Scope of Removal

### Directories to DELETE entirely:
1. `dashboard/` — Entire dashboard application (server, UI, lib, tests)
2. `.agent-events/` — All event log JSONL files (keep .gitkeep if desired for the folder, or remove entirely)

### Template plans to DELETE (historical plans FOR the dashboard feature):
- `.plans/template/2026-04-09-agent-monitor-dashboard.md`
- `.plans/template/2026-04-10-dashboard-fixes-and-workflow-enforcement.md`
- `.plans/template/2026-04-11-dashboard-graph-liveness-and-parallel-workflows.md`
- `.plans/template/2026-04-16-233714-architecture-dashboard-v2.md`
- `.plans/template/2026-04-16-233714-launch-plan-dashboard-v2.md`
- `.plans/template/2026-04-17-000502-architecture-agent-event-schema-update.md`
- `.plans/template/2026-04-17-000502-launch-plan-agent-event-schema-update.md`
- `.plans/template/2026-04-17-002044-architecture-dashboard-bugfixes.md`
- `.plans/template/2026-04-20-171154-architecture-multi-workstream-events.md`
- `.plans/template/2026-04-20-171154-launch-plan-multi-workstream-events.md`

### Files to EDIT (remove dashboard/event sections):

1. **`.github/copilot-instructions.md`** — Remove:
   - "## Agent Monitor Dashboard" section and all sub-sections (Dashboard v2 Event Types, Multi-Workstream Event Protocol, Per-Workstream Event Files, Cross-Codespace Event Transport, The agent-events Orphan Branch, Continuous Monitoring)
   - References to dashboard events in the "Strict Delegation Protocol" section (e.g., "All agents MUST write session logs... and emit dashboard events", "push events to remote" steps, "All dashboard events emitted" checklist item)
   - The "Dashboard" row in the Subagent Unavailable Fallback section

2. **`.github/agents/architect.agent.md`** — Remove:
   - The execute tool allowance for `node dashboard/lib/emit-event.js` and `push-events.js` / `pull-events.js`
   - The `Emit:` line in fallback-mode detection
   - "#### Step 4: Emit Dashboard Event" section
   - The entire "## Agent Monitor Events (MANDATORY)" section
   - The entire "## Cross-Codespace Event Transport" section
   - References to `push-events.js` and `pull-events.js` throughout
   - References to `.agent-events/` throughout
   - Dashboard references in the Launch Plan template (`DASHBOARD_GIT_POLL`, event transport summary table, etc.)

3. **`.github/agents/backend-lead.agent.md`** — Remove:
   - All "Emit dashboard event" steps in the 7-Gate sequence (steps 8, 10, 12, 14, 17, 20, 22, 25, 27, 32, 33)
   - The "push events to remote" steps
   - "All dashboard events emitted" checklist item
   - The entire "## Agent Monitor Events (MANDATORY)" section
   - The `--workstream` instruction in delegation payload section
   - Emit lines in fallback-mode sections

4. **`.github/agents/frontend-lead.agent.md`** — Same removals as backend-lead

5. **`.github/agents/infra-lead.agent.md`** — Same removals as backend-lead

6. **`.github/agents/code-reviewer.agent.md`** — Remove:
   - The emit-event execute tool allowance
   - The "Workstream" field from delegation payload
   - The entire "## Agent Monitor Events (MANDATORY)" section

7. **`.github/agents/developer.agent.md`** — Remove:
   - The "Workstream" field from delegation payload
   - The entire "## Agent Monitor Events (MANDATORY)" section

8. **`.github/agents/tester.agent.md`** — Remove:
   - The "Workstream" field from delegation payload
   - The entire "## Agent Monitor Events (MANDATORY)" section

9. **`.github/agents/docs-writer.agent.md`** — Remove:
   - The "Workstream" field from delegation payload
   - The entire "## Agent Monitor Events (MANDATORY)" section

10. **`.github/agents/test-lead.agent.md`** — Remove:
    - The emit-event execute tool allowance
    - The entire "## Agent Monitor Events (MANDATORY)" section

11. **`TEMPLATE-GUIDE.md`** — Remove:
    - The entire "## Agent Monitor Dashboard" section (including all sub-sections: launch, data sources, event stream, architecture, REST API)
    - The `.agent-events/` line in directory structure
    - The `dashboard/` line in directory structure

12. **`README.md`** — Remove dashboard reference on line 4

13. **`pipelines/azdo/README.md`** — Remove `.agent-events/**` line

14. **`.plans/template/README.md`** — Remove "dashboard" from descriptions

15. **`.plans/README.md`** — Remove "dashboard" from the template row description

16. **`.agent-logs/README.md`** — Remove "dashboard" from descriptions

17. **`.agent-logs/template/README.md`** — Remove "dashboard" from descriptions

### Files to LEAVE ALONE (historical logs, not actively referenced):
- `.agent-logs/template/code-reviewer-log.md` — Historical log entries, keep for provenance
- `.agent-logs/template/` other logs — Historical, keep as-is
- `dashboard/.agent-logs/template/tester-log.md` — Will be deleted with `dashboard/`

## Acceptance Criteria
- [ ] `dashboard/` directory fully deleted
- [ ] `.agent-events/` directory fully deleted (or just the JSONL files, keeping .gitkeep)
- [ ] All 10 listed template plan files deleted
- [ ] No remaining references to `dashboard`, `emit-event`, `push-events`, `pull-events`, `agent-events`, or `Agent Monitor` in any active configuration file (agent definitions, copilot-instructions, TEMPLATE-GUIDE)
- [ ] The `agent-events` orphan git branch should be deleted if it exists
- [ ] Project still functions correctly (no broken references in remaining content)

## Approval
- Approved by: human user (requested directly)
- Approved at: 2026-06-10 10:51:59
