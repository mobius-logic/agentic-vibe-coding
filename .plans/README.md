# Approved Plans

This directory stores **approved architecture and plan documents** created exclusively by the `@architect` agent after human approval.

> **Only `@architect` may create or edit files in this directory.** Team leads and all other agents
> treat `.plans/` as **read-only**. Team leads log their execution details in `.agent-logs/` instead.

## Naming Convention

Files are named with a date-timestamp and short description:
```
<YYYY-MM-DD>-<HHMMSS>-<short-name>.md
```

Examples:
- `2026-04-08-143022-architecture-task-app.md`
- `2026-04-09-091500-user-dashboard.md`

## How Plans Are Created

1. A human user invokes `@architect` to design or plan a change
2. The architect interviews the human and produces an architecture/plan document
3. The human reviews and approves (or requests changes)
4. The approved plan is saved here with a date-timestamp
5. Team leads read the relevant plan to understand scope and context
6. All subagents receive the plan file path as a reference during execution

## How Plans Are Referenced

- Agent memory logs in `.agent-logs/` include a **Plan** field linking to the relevant plan file
- When communicating with agents about ongoing work, share the plan file path for context
- Plans are never modified after approval — they serve as an immutable record

## Plan Format

```markdown
# Plan: <Feature Name>
- **Date**: <YYYY-MM-DD HH:MM:SS>
- **Lead**: <agent name>
- **Branch**: feature/<area>/<name>
- **Status**: approved

## Tasks
1. <task with acceptance criteria>
2. <task with acceptance criteria>

## Dependencies
- <dependency or "None">

## Files to Create/Modify
- <file paths>

## Approval
- Approved by: human user
- Approved at: <timestamp>
```
