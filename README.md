# Agentic Vibe Coding

A multi-agent GitHub Copilot coding team template for VS Code and GitHub Codespaces.

> **Template documentation**: For full instructions on how this template works, agent roles,
> planning workflow, and orchestration runbook, see [TEMPLATE-GUIDE.md](TEMPLATE-GUIDE.md).
> This README is intended to be replaced with your project-specific documentation once you
> start building.

## Project Overview

_Replace this section with your project description._

## Getting Started

_Replace this section with your project's setup and installation instructions._

## Usage

_Replace this section with how to use your application._

## API Reference

_Replace this section with your API documentation (if applicable)._

### Agent Monitor Dashboard API

The dashboard server exposes the following REST API endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/agents` | GET | Returns array of agents with status (event-based, enriched with filesystem inference) |
| `/api/branches` | GET | Returns current branch and all branches |
| `/api/plans` | GET | Returns array of parsed plan documents |
| `/api/events` | GET | Returns recent events (supports `?limit=N` query param) |
| `/api/events` | GET | Uses EventCache for incremental reads instead of full file re-read |
| `/api/logs` | GET | Returns all agent logs |
| `/api/logs/:agent` | GET | Returns a specific agent's log |
| `/api/activity` | GET | Returns filesystem activity snapshot (5s TTL cache) |
| `/api/summary` | GET | Returns aggregate dashboard summary |
| `/api/graph` | GET | Returns `{ nodes, edges }` agent relationship graph |
| `/api/stream` | GET | Server-Sent Events (SSE) stream for real-time event push |

Start the dashboard: `node dashboard/start.js` (opens at http://127.0.0.1:4820)

### Agent Event Types

Agents emit structured events via `dashboard/lib/emit-event.js`. The following event types are recognized:

| Event | Purpose | Key Fields |
|-------|---------|------------|
| `spawned` | Agent session started (resets prior state, prunes completed agents from graph) | — |
| `session-start` | Architect-only: resets all dashboard state and starts a fresh session | `--plan` |
| `task-started` | Agent began a task | `--task`, `--taskIndex`, `--taskTotal` |
| `task-completed` | Agent finished a task | `--task`, `--status` |
| `session-complete` | Agent session ended | `--status` |
| `branch-created` | Agent created a git branch | `--branch` |
| `question-asked` | Agent asked the user a question | `--detail` |
| `heartbeat` | Signal that an agent is alive and describe current activity | `--detail`, `--phase` |

#### Heartbeat Events

Agents emit `heartbeat` events periodically (every 15–30s) while actively working. This lets dashboard-only users see real-time activity. Agents with no heartbeat for 60 seconds are downgraded from "working" to "active" status.

The `--phase` argument describes what the agent is currently doing:

| Phase | Meaning |
|-------|---------|
| `thinking` | Reasoning / planning |
| `coding` | Writing or editing code |
| `searching` | Reading files / searching codebase |
| `reviewing` | Reviewing code or docs |
| `waiting` | Waiting for subagent or user |
| `delegating` | Delegating work to a subagent |

#### Workstream Grouping

When multiple agents work in parallel (e.g. `backend-lead` and `frontend-lead` in separate Codespaces), the dashboard groups them into **workstreams**. Pass `--workstream <name>` on any event to explicitly set the workstream, or it will be inferred from the agent's position in the delegation graph.

#### emit-event.js CLI Usage

```
node dashboard/lib/emit-event.js <agent> <event> [options]
```

**Options:**

| Argument | Description |
|----------|-------------|
| `--task` | Task description |
| `--taskIndex` | Current task number (integer) |
| `--taskTotal` | Total tasks (integer) |
| `--branch` | Branch name |
| `--plan` | Plan file path |
| `--status` | Status string (e.g. `done`) |
| `--detail` | Human-readable detail (used by `heartbeat` and `question-asked`) |
| `--phase` | Agent activity phase (`thinking`, `coding`, `searching`, `reviewing`, `waiting`, `delegating`) |
| `--workstream` | Workstream label for parallel workflow grouping |

**Examples:**

```bash
# Agent spawned (resets previous session state)
node dashboard/lib/emit-event.js architect spawned

# Heartbeat with phase
node dashboard/lib/emit-event.js backend-lead heartbeat --detail "Implementing auth module" --phase coding

# Task started in a named workstream
node dashboard/lib/emit-event.js backend-lead task-started --task "Implement auth" --workstream backend
```

## Development

This project uses a multi-agent workflow powered by GitHub Copilot. To contribute:

1. Start with `@architect` to design the system architecture for a new project
2. The architect interviews you, produces an architecture document, and decomposes into workstream briefs
3. Hand the workstream briefs to team leads (`@backend-lead`, `@frontend-lead`, `@infra-lead`) — or let the architect delegate directly
4. Each lead presents a detailed plan for your approval, then delegates to subagents
5. Agents delegate to `@developer`, `@tester`, `@docs-writer`, and `@code-reviewer`
6. See [TEMPLATE-GUIDE.md](TEMPLATE-GUIDE.md) for the full workflow

### Agent Team

| Agent | Role | Invocable? |
|-------|------|:----------:|
| `@architect` | Designs system architecture, decomposes into workstreams | Yes |
| `@backend-lead` | Plans and delegates backend work | Yes |
| `@frontend-lead` | Plans and delegates frontend/UI work | Yes |
| `@infra-lead` | Plans and delegates infrastructure/DevOps work | Yes |
| `@code-reviewer` | Reviews code changes | Yes |
| `@developer` | Writes code per spec (subagent) | No |
| `@tester` | Writes/runs tests (subagent) | No |
| `@docs-writer` | Writes documentation (subagent) | No |

### Repository Structure

```
.github/
├── agents/           # Agent role definitions
├── prompts/          # Slash command workflows
├── instructions/     # File-type coding standards
├── hooks/            # Safety gates
├── workflows/        # CI/CD and template sync automation
└── copilot-instructions.md  # Project-wide standards
.devcontainer/        # Codespaces environment
.agent-logs/          # Agent session logs
.agent-events/        # Structured agent event logs (JSONL)
.plans/               # Approved plan documents
dashboard/            # Agent Monitor Dashboard (web UI)
scripts/              # Sync tooling (template updates)
.gitattributes        # Merge strategies for template inheritance
```

## License

MIT
