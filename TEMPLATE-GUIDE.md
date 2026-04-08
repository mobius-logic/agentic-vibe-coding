# Agentic Vibe Coding — Template Guide

> **This file documents how to use this template repository.** It is intentionally separate
> from `README.md` so that when you customize your project, `README.md` can be updated with
> your project-specific content without losing the template usage instructions.

## What Is This Template?

A template repository for running a **multi-agent GitHub Copilot coding team** in VS Code
and GitHub Codespaces. Specialized AI agents collaborate across Git branches — team leads
plan and delegate, developers write code, testers validate, reviewers gatekeep quality,
and docs writers keep documentation current.

## Architecture Overview

This guide sets up a **multi-agent coding team** where specialized GitHub Copilot agents
collaborate across Git branches to produce a working product. Each agent has a defined role
(team lead, developer, tester, reviewer) with restricted tools and focused instructions.

```
┌─────────────────────────────────────────────────────────┐
│                   ORCHESTRATOR (You)                    │
│            Uses /plan-sprint prompt to kick off         │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Team Lead│  │ Team Lead│  │ Team Lead│  .agent.md    │
│  │ (Backend)│  │(Frontend)│  │  (Infra) │  files        │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       │             │             │                     │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐               │
│  │Developer │  │Developer │  │Developer │  subagents    │
│  │  Agent   │  │  Agent   │  │  Agent   │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘               │
│       │             │             │                     │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐               │
│  │  Tester  │  │  Tester  │  │  Tester  │  subagents    │
│  │  Agent   │  │  Agent   │  │  Agent   │               │
│  └──────────┘  └──────────┘  └──────────┘               │
│                                                         │
│  ┌──────────┐  ┌──────────┐                             │
│  │Code      │  │  Docs    │  cross-cutting agents       │
│  │Reviewer  │  │  Writer  │                             │
│  └──────────┘  └──────────┘                             │
└─────────────────────────────────────────────────────────┘
```
## Quick Start

### In VS Code (Local)
1. Clone or fork this repo as the base for your new project
2. Open VS Code with GitHub Copilot Chat installed
3. Open Copilot Chat and select an agent from the agent picker:
   - `@backend-lead` — Plans and delegates backend work
   - `@frontend-lead` — Plans and delegates frontend/UI work
   - `@infra-lead` — Plans and delegates infrastructure/DevOps work
   - `@code-reviewer` — Reviews code changes on a branch
4. Or use a slash command:
   - `/plan-sprint` — Break a feature into assigned workstreams
   - `/implement-feature` — Direct a lead to implement something
   - `/run-tests` — Run tests on a branch
   - `/review-and-merge` — Get a code review

### In GitHub Codespaces (Parallel Agents)
1. Push this repo to GitHub
2. Open **Code** → **Codespaces** → **Create codespace**
3. The devcontainer auto-installs Copilot and configures the environment
4. Open multiple Codespaces for parallel workstreams on different branches

## Agent Team

| Agent | Role | You invoke? | Tools |
|-------|------|:-----------:|-------|
| `@backend-lead` | Plans backend work, creates branches, delegates | Yes | All + subagents |
| `@frontend-lead` | Plans frontend work, creates branches, delegates | Yes | All + subagents |
| `@infra-lead` | Plans infra/DevOps work, delegates | Yes | All + subagents |
| `@code-reviewer` | Reviews diffs, flags issues | Yes | Read-only |
| `@developer` | Writes code per spec (subagent only) | No | Read, edit, search, execute |
| `@tester` | Writes/runs tests (subagent only) | No | Read, edit, search, execute |
| `@docs-writer` | Writes documentation (subagent only) | No | Read, search, edit |

## Planning Workflow (Human-in-the-Loop)

All team leads follow a **two-phase workflow**:

### Phase 1: Plan Approval
1. You describe a feature to a team lead (e.g., `@backend-lead "Add JWT authentication"`)
2. The lead analyzes the request and presents a **draft plan** with tasks, files, and branches
3. The lead asks you to **approve, modify, or reject** the plan
4. You iterate until the plan is right
5. The approved plan is saved to `.plans/<date>-<time>-<name>.md` for reference

### Phase 2: Execution
6. The lead creates a feature branch and delegates to subagents
7. Each subagent receives the **plan reference** so they understand context
8. After coding → testing → docs → review, the lead reports completion

### Referencing Plans
- All approved plans live in `.plans/` with date-timestamps
- Agent logs reference which plan they worked on
- You can share plan file paths when communicating with agents across sessions

## Repository Structure

```
.github/
├── agents/           # Agent role definitions
├── prompts/          # Slash command workflows
├── instructions/     # File-type coding standards
├── hooks/            # Safety gates (blocks dangerous commands)
└── copilot-instructions.md  # Project-wide standards
.devcontainer/
└── devcontainer.json # Codespaces environment
.agent-logs/          # Agent session logs (auto-generated)
.plans/               # Approved plan documents (auto-generated)
```

## Orchestrator Runbook (What YOU Do)

You are the human orchestrator. Agents write code — you control planning approval, branching, merging, and phasing.

### Initial Setup (Once)

```bash
# Push repo to GitHub
git add -A
git commit -m "chore: initial agentic team scaffold"
git push origin main
```

Then protect `main` on GitHub: **Settings → Branches → Add rule → Require PR reviews**.

### Phase 1: Parallel Workstreams (e.g. Infra + Backend)

| Step | You Do |
|------|--------|
| 1 | Open **Codespace A** (or local VS Code) — invoke `@infra-lead` with your request |
| 2 | **Review and approve the plan** the lead presents to you |
| 3 | Open **Codespace B** — invoke `@backend-lead` with your request |
| 4 | **Review and approve the plan** |
| 5 | Wait for each agent to finish executing the approved plans |
| 6 | Review the output (skim files, check agent's completion summary) |
| 7 | Push the branches, create PRs on GitHub |
| 8 | Merge independent workstream first, then rebase and merge dependent ones |

**Pushing a branch after an agent finishes:**
```bash
git status
git log --oneline -5
git push origin feature/infra/project-setup
```

**Rebasing a dependent branch after merging its dependency:**
```bash
git fetch origin
git rebase origin/main
git push origin feature/backend/simulation-core --force-with-lease
```

### Phase 2: Dependent Workstream (e.g. Frontend)

| Step | You Do |
|------|--------|
| 1 | Ensure Phase 1 PRs are merged to `main` |
| 2 | Pull latest: `git checkout main && git pull` |
| 3 | Invoke `@frontend-lead` — **approve its plan** |
| 4 | Wait, review, push, create PR |

### Phase 3: Review + Final Merge

| Step | You Do |
|------|--------|
| 1 | Invoke `@code-reviewer` targeting the open PR branch |
| 2 | Review the agent's findings |
| 3 | If fixes needed: tell the relevant `@<lead>` to fix them |
| 4 | Once clean: merge the final PR on GitHub |

### Single-Machine Alternative (No Codespaces)

Run agents sequentially:
```
@infra-lead → approve plan → wait → push → PR → merge → git pull
@backend-lead → approve plan → wait → push → PR → merge → git pull
@frontend-lead → approve plan → wait → push → PR → merge → git pull
@code-reviewer → review
```

## Decision Cheat Sheet

| Situation | What to do |
|-----------|-----------|
| Agent presents a plan | Review it carefully, suggest changes, then approve |
| Agent says "done" | Check `git log`, skim files, then `git push origin <branch>` |
| Agent made a mistake | Tell it what's wrong in the same chat session |
| Tests fail | Tell the agent "tests are failing, fix them" |
| Agent asks a question | Answer it — you're the product owner |
| Need to reference prior work | Check `.plans/` for approved plans, `.agent-logs/` for session logs |
| Merge conflict | `git fetch origin && git rebase origin/main` on the conflicting branch |
| Agent's work log is wrong | Check `.agent-logs/` for the agent's memory file |

## Agent Memory Logs

Each agent writes a dated summary log to `.agent-logs/<agent-name>-log.md` tracking:
- Plan reference (which `.plans/` file they worked on)
- Tasks completed with timestamps
- Files created/modified
- Fixes applied and lessons learned
- Git commit IDs for traceability
- Subagents invoked (for team leads)

Logs are ordered **oldest on top, newest at bottom**. They persist across sessions so agents can review their prior work and avoid repeating mistakes.

## Plans Directory

Approved plans are saved to `.plans/` with date-timestamped filenames:
```
.plans/
├── 2026-04-08-143022-jwt-auth.md
├── 2026-04-09-091500-user-dashboard.md
└── README.md
```

These provide a traceable record of what was planned and approved, and are referenced by agents throughout execution.

## Customization

- Edit `.github/agents/*.agent.md` to tune agent behavior for your tech stack
- Edit `.github/copilot-instructions.md` for your project's conventions
- Add `.github/instructions/*.instructions.md` for language/framework-specific rules
- See [AGENTIC-TEAM-SETUP-GUIDE.md](AGENTIC-TEAM-SETUP-GUIDE.md) for the full setup guide

## Adapting This Template for Your Project

1. Fork/clone this repo
2. Update `README.md` with **your** project's name, description, and usage instructions
3. Keep `TEMPLATE-GUIDE.md` as a reference for how the agentic workflow operates
4. Customize agent definitions in `.github/agents/` for your tech stack
5. Start invoking agents — they will update `README.md` with project-specific docs as they build

## License

MIT
