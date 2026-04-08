# Approved Plans

This directory stores **approved plan documents** created by team lead agents after human approval.

## Naming Convention

Files are named with a date-timestamp and short description:
```
<YYYY-MM-DD>-<HHMMSS>-<short-name>.md
```

Examples:
- `2026-04-08-143022-jwt-auth.md`
- `2026-04-09-091500-user-dashboard.md`

## How Plans Are Created

1. A human user invokes a team lead (e.g., `@backend-lead`)
2. The lead presents a draft plan with tasks, files, and branches
3. The human reviews and approves (or requests changes)
4. The approved plan is saved here with a date-timestamp
5. All subagents receive the plan file path as a reference during execution

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
