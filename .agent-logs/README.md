# Agent Memory Logs

This directory contains session logs written by each agent. Agents append to their log file
at the end of every session to track completed tasks, fixes, commit IDs, plan references,
and lessons learned.

## Log Ordering

Entries are ordered **oldest on top, newest at bottom** (chronological append-only).
Agents must never overwrite, delete, or reorder previous entries.

## Log Format

Each entry includes:
- **Timestamp**: Full `YYYY-MM-DD HH:MM:SS` date-time
- **Plan reference**: Path to the `.plans/` file being worked on (or "N/A")
- **Branch**: The git branch
- **Commit**: Short commit hash
- **Tasks/files/fixes**: What was done
- **Subagents invoked** (for team leads): Which subagents were called
- **Lessons learned**: Patterns to follow or avoid

## Files

| File | Agent |
|------|-------|
| `backend-lead-log.md` | Backend Team Lead |
| `frontend-lead-log.md` | Frontend Team Lead |
| `infra-lead-log.md` | Infrastructure Team Lead |
| `developer-log.md` | Developer (subagent) |
| `tester-log.md` | Tester (subagent) |
| `code-reviewer-log.md` | Code Reviewer |
| `docs-writer-log.md` | Documentation Writer |

These files are committed to the repo so agents can read their history in future sessions.
