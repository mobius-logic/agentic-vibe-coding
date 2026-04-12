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
(architect, team lead, developer, tester, reviewer) with restricted tools and focused instructions.

```
┌─────────────────────────────────────────────────────────┐
│                   ORCHESTRATOR (You)                    │
│          Uses @architect to design the system           │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │                   ARCHITECT                       │  │
│  │   Interviews you → Designs architecture → Produces│  │
│  │   workstream briefs for each team lead            │  │
│  └────┬─────────────┬─────────────┬──────────────────┘  │
│       │             │             │                     |
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
1. Create a new repo using **"Use this template"** on GitHub (see [Template Inheritance](#template-inheritance)), then clone it locally
2. Open VS Code with GitHub Copilot Chat installed
3. Open Copilot Chat and select an agent from the agent picker:
   - `@architect` — **Start here for new projects.** Designs system architecture through iterative discussion
   - `@backend-lead` — Plans and delegates backend work
   - `@frontend-lead` — Plans and delegates frontend/UI work
   - `@infra-lead` — Plans and delegates infrastructure/DevOps work
   - `@code-reviewer` — Reviews code changes on a branch
4. Or use a slash command:
   - `/design-architecture` — Iteratively design a system architecture for a new project
   - `/plan-sprint` — Break a feature into assigned workstreams
   - `/implement-feature` — Direct a lead to implement something
   - `/run-tests` — Run tests on a branch
   - `/review-and-merge` — Get a code review

### In GitHub Codespaces (Parallel Agents)
1. Create a new repo using **"Use this template"** on GitHub
2. Open **Code** → **Codespaces** → **Create codespace**
3. The devcontainer auto-installs Copilot and configures the environment
4. Open multiple Codespaces for parallel workstreams on different branches

## Agent Team

| Agent | Role | You invoke? | Tools |
|-------|------|:-----------:|-------|
| `@architect` | Interviews you, designs system architecture, decomposes into workstream briefs | Yes | Read, search, web, todo, askQuestions + lead subagents |
| `@backend-lead` | Plans backend work, creates branches, delegates | Yes | All + subagents |
| `@frontend-lead` | Plans frontend work, creates branches, delegates | Yes | All + subagents |
| `@infra-lead` | Plans infra/DevOps work, delegates | Yes | All + subagents |
| `@code-reviewer` | Reviews diffs, flags issues | Yes | Read-only |
| `@developer` | Writes code per spec (subagent only) | No | Read, edit, search, execute |
| `@tester` | Writes/runs tests (subagent only) | No | Read, edit, search, execute |
| `@docs-writer` | Writes documentation (subagent only) | No | Read, search, edit |

## Planning Workflow (Human-in-the-Loop)

### Recommended: Start with the Architect

For new projects, **start with `@architect`** rather than going directly to team leads.
The architect-first workflow ensures a coherent system design before any code is written.

> **Important: `.plans/` is architect-only.** Only `@architect` creates or edits files in `.plans/`.
> Team leads read plans from `.plans/` for context, but log their execution details in `.agent-logs/`.
> **Architect-first protocol:** All non-trivial changes must go through `@architect`
> (for design/planning) or the appropriate team lead (for scoped work). If you prompt Copilot
> directly without invoking an agent, it will remind you to route through the proper workflow.
> This ensures all changes are planned, tracked, and logged.

#### Architect Workflow
1. You describe your project/application to `@architect` (e.g., `@architect "I want to build a task management SaaS app"`)
2. The architect **interviews you** in iterative rounds — scope, users, tech preferences, scale, security
3. After each round, the architect summarizes what was learned and confirms with you
4. The architect produces a **System Architecture Document** covering all layers (frontend, backend, data, infra)
5. You **approve, revise, or reject** the architecture
6. The approved architecture is saved to `.plans/<date>-<time>-architecture-<name>.md`
7. The architect **decomposes the architecture into workstream task briefs** — one per team lead
8. You choose:
   - **Manual delegation**: Copy-paste each task brief into a separate Copilot Chat session or Codespace
   - **Automated delegation**: Tell the architect to invoke the team leads directly

#### Direct Team Lead Workflow (Skip Architect)

For smaller features or when you already know the architecture, you can go directly to team leads:

1. You describe a feature to a team lead (e.g., `@backend-lead "Add JWT authentication"`)
2. The lead reads the relevant `.plans/` file (if one exists) for architectural context
3. The lead analyzes the request and presents a **draft execution plan** with tasks, files, and branches
4. The lead asks you to **approve, modify, or reject** the plan
5. You iterate until the plan is right
6. The lead logs the approved execution details in `.agent-logs/` (NOT in `.plans/`)

### Execution Phase (Same for Both Workflows)
6. The lead creates a feature branch and delegates to subagents
7. Each subagent receives the **plan reference** so they understand context
8. After coding → testing → docs → review, the lead reports completion

### Referencing Plans and Architecture Documents
- All approved architectures and plans live in `.plans/` with date-timestamps
- **Only `@architect` creates or edits files in `.plans/`** — all other agents treat `.plans/` as read-only
- Team leads log their approved execution details and session summaries in `.agent-logs/`
- Architecture documents are prefixed with `architecture-` for easy identification
- Agent logs reference which plan/architecture they worked on
- You can share plan file paths when communicating with agents across sessions
- Team leads should reference the architecture document when making implementation decisions

## Repository Structure

```
.github/
├── agents/           # Agent role definitions
├── prompts/          # Slash command workflows
├── instructions/     # File-type coding standards
├── hooks/            # Safety gates (blocks dangerous commands)
├── workflows/        # CI/CD and template sync automation
└── copilot-instructions.md  # Project-wide standards
.devcontainer/
└── devcontainer.json # Codespaces environment
.agent-logs/          # Agent session logs (auto-generated)
.agent-events/        # Structured agent event logs (JSONL, auto-generated)
.plans/               # Approved plan documents (auto-generated)
dashboard/            # Agent Monitor Dashboard (web UI)
scripts/
├── sync-template.sh  # Bash sync script (Linux/macOS/Codespaces)
└── sync-template.ps1 # PowerShell sync script (Windows)
.gitattributes        # Merge strategies for template inheritance
```

## Orchestrator Runbook (What YOU Do)

You are the human orchestrator. Agents write code — you control architecture approval, planning approval, branching, merging, and phasing.

### Initial Setup (Once)

1. **Create your project repo** from the template:
   - On GitHub, navigate to your org's `agentic-vibe-coding` template repo
   - Click **"Use this template" → "Create a new repository"**
   - Choose your org, name the repo, and set visibility

2. **Clone and connect to the upstream template** for future updates:
   ```bash
   git clone https://github.com/YOUR_ORG/my-new-project.git
   cd my-new-project

   # Connect to template for ongoing updates (bash/macOS/Linux)
   ./scripts/sync-template.sh https://github.com/mobius-logic/agentic-vibe-coding.git

   # Or on Windows PowerShell
   .\scripts\sync-template.ps1 -TemplateUrl "https://github.com/mobius-logic/agentic-vibe-coding.git"
   ```

3. **Protect `main`** on GitHub: **Settings → Branches → Add rule → Require PR reviews**.

### Phase 0: Architecture Design (Recommended for New Projects)

| Step | You Do |
|------|--------|
| 1 | Open Copilot Chat and invoke `@architect` with your project description |
| 2 | Answer the architect's interview questions (scope, users, tech, scale, security) |
| 3 | Review the proposed **System Architecture Document** |
| 4 | Request changes or **approve** the architecture |
| 5 | Review the **workstream task briefs** the architect produces |
| 6 | Choose: copy-paste briefs to separate sessions, or tell the architect to delegate |

### Phase 1: Parallel Workstreams (e.g. Infra + Backend)

| Step | You Do |
|------|--------|
| 1 | Open **Codespace A** (or local VS Code) — invoke `@infra-lead` with the architect's task brief (or your own request) |
| 2 | **Review and approve the plan** the lead presents to you |
| 3 | Open **Codespace B** — invoke `@backend-lead` with the architect's task brief |
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
@architect → interview → approve architecture → get workstream briefs
@infra-lead → paste brief → approve plan → wait → push → PR → merge → git pull
@backend-lead → paste brief → approve plan → wait → push → PR → merge → git pull
@frontend-lead → paste brief → approve plan → wait → push → PR → merge → git pull
@code-reviewer → review
```

## Decision Cheat Sheet

| Situation | What to do |
|-----------|-----------|
| Starting a new project | Use `@architect` to design the architecture first |
| Architect presents architecture | Review carefully, ask questions, then approve |
| Architect produces workstream briefs | Copy each brief to a separate session or tell architect to delegate |
| Agent presents a plan | Review it carefully, suggest changes, then approve |
| Agent says "done" | Check `git log`, skim files, then `git push origin <branch>` |
| Agent made a mistake | Tell it what's wrong in the same chat session |
| Tests fail | Tell the agent "tests are failing, fix them" |
| Agent asks a question | Answer it — you're the product owner |
| Need to reference prior work | Check `.plans/` for architecture docs and approved plans, `.agent-logs/` for session logs |
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

## Agent Monitor Dashboard

An optional web-based dashboard that gives you real-time visibility into agent activity — which agents are active, what branches they're working on, task progress, and a live event timeline.

### Quick Start

```bash
# From your project root
node dashboard/start.js

# Or open the browser automatically
node dashboard/start.js --open

# Custom port
node dashboard/start.js --port 8080
```

The dashboard opens at **http://127.0.0.1:4820** and auto-refreshes every 3 seconds.

### What It Shows

| Panel | Description |
|-------|-------------|
| **Summary Bar** | Active agent count, branch count, task completion, event count |
| **Agent Cards** | Each agent with status (active/working/completed/idle), current branch, task progress bar |
| **Branch Status** | All feature/fix branches with their status, last commit, and date |
| **Plans** | Plans from `.plans/` with task completion progress |
| **Event Timeline** | Chronological feed of all agent events |

### How It Works

The dashboard reads data from three sources — all already part of the template:

1. **`.agent-logs/*.md`** — Human-readable session logs (existing)
2. **`.plans/*.md`** — Approved plan documents (existing)
3. **Git branches** — Local and remote branch data (existing)
4. **`.agent-events/events.jsonl`** — Structured machine-readable events (new, optional)

The dashboard **works without any events being emitted** — it still shows git branches, plans, and agent logs. The event stream adds richer real-time data.

### Agent Event Format

Agents can optionally write structured events to `.agent-events/events.jsonl` (one JSON object per line):

```json
{
  "ts": "2026-04-09T14:30:22Z",
  "agent": "backend-lead",
  "event": "task-completed",
  "branch": "feature/backend/auth",
  "plan": ".plans/2026-04-09-auth.md",
  "task": "Implement JWT middleware",
  "taskIndex": 1,
  "taskTotal": 5,
  "status": "in-progress"
}
```

**Event types**: `spawned`, `plan-loaded`, `task-started`, `task-completed`, `branch-created`, `branch-pushed`, `subagent-invoked`, `session-complete`, `error`

### Programmatic Event Logging

For agents or scripts running in a Node.js context:

```javascript
const { logAgentEvent } = require('./dashboard/lib/log-event.js');

logAgentEvent({
  agent: 'backend-lead',
  event: 'task-completed',
  branch: 'feature/backend/auth',
  task: 'Implement JWT middleware',
  taskIndex: 1,
  taskTotal: 5,
});
```

### Dashboard Architecture

```
Browser (localhost:4820)
  ↕  polling GET /api/*
Dashboard Server (Node.js, zero dependencies)
  ↕  reads
.agent-logs/  .plans/  .agent-events/  git branches
```

The server is a zero-dependency Node.js HTTP application. No npm install required.

### Backward Compatibility

- The dashboard is **purely additive** — no existing files change behavior
- Existing projects without `dashboard/` are unaffected
- The dashboard handles missing `.agent-events/` gracefully
- Agent event logging is **optional** — agents still write their markdown logs as before
- `.agent-events/` is protected by `.gitattributes` (`merge=ours`) during template sync

## Customization

- Edit `.github/agents/*.agent.md` to tune agent behavior for your tech stack
- Edit `.github/copilot-instructions.md` for your project's conventions
- Add `.github/instructions/*.instructions.md` for language/framework-specific rules
- See [AGENTIC-TEAM-SETUP-GUIDE.md](AGENTIC-TEAM-SETUP-GUIDE.md) for the full setup guide

## Adapting This Template for Your Project

1. Use **"Use this template"** on GitHub to create a new repo (see [Template Inheritance](#template-inheritance) below)
2. Update `README.md` with **your** project's name, description, and usage instructions
3. Keep `TEMPLATE-GUIDE.md` as a reference for how the agentic workflow operates
4. Customize agent definitions in `.github/agents/` for your tech stack
5. Start invoking agents — they will update `README.md` with project-specific docs as they build

---

## Template Inheritance

This repo is designed to be a **living template**: child projects created from it can
continuously pull in improvements to agents, hooks, prompts, and tooling — without
overwriting their project-specific plans, logs, or documentation.

### How It Works

```
┌──────────────────────────────┐
│   Template Repo (upstream)   │  ← Org maintains agents, 
|                              |     hooks, prompts
│  github.com/mobius-logic/    │
│       agentic-vibe-coding    │
└──────────┬───────────────────┘
           │  one-way sync (pull only)
           ▼
┌──────────────────────────────┐
│   Child Project Repo         │  ← Team's project code + 
|                              |      plans + logs
│  github.com/ORG/my-project   │
└──────────────────────────────┘
```

| What syncs (from template) | What is protected (project-specific) |
|---|---|
| `.github/agents/` | `.plans/` |
| `.github/hooks/` | `.agent-logs/` |
| `.github/prompts/` | `.agent-events/` |
| `.github/instructions/` | `README.md` |
| `.github/copilot-instructions.md` | All project source code |
| `.devcontainer/` | |
| `dashboard/` | |
| `TEMPLATE-GUIDE.md` | |
| `scripts/` | |

### One-Time Setup (Org Admin)

1. **Mark this repo as a GitHub Template**:
   - Go to **Settings → General** on the template repo
   - Check **"Template repository"**
   - This enables the **"Use this template"** button for your org

2. **Set repo visibility** to Internal (org-wide) or Public as needed

### Creating a New Project from the Template

1. On GitHub, navigate to the template repo
2. Click **"Use this template" → "Create a new repository"**
3. Choose your org, name the repo, set visibility
4. Clone the new repo locally

> **Why "Use this template" instead of Fork?**
> Template repos create a **clean copy** with no fork relationship — no accidental
> PRs back to the template, clean commit history, and the child repo is fully independent.

### Connecting to the Upstream Template

After creating from the template, connect the child repo so it can pull future updates:

**Bash / Git Bash / macOS / Linux / Codespaces:**
```bash
# First run — supply the template URL
./scripts/sync-template.sh https://github.com/mobius-logic/agentic-vibe-coding.git

# Subsequent runs — URL is remembered
./scripts/sync-template.sh
```

**PowerShell (Windows):**
```powershell
# First run — supply the template URL
.\scripts\sync-template.ps1 -TemplateUrl "https://github.com/mobius-logic/agentic-vibe-coding.git"

# Subsequent runs — URL is remembered
.\scripts\sync-template.ps1
```

The sync script:
1. Adds or verifies the `upstream` remote
2. Configures the `ours` merge driver to protect project-specific files
3. Fetches and merges the latest template changes
4. Leaves `.plans/`, `.agent-logs/`, and `README.md` untouched

> **Codespace note:** Both scripts auto-detect GitHub Codespaces and configure the
> `gh` CLI as the Git credential helper. This is needed because the default
> Codespace `GITHUB_TOKEN` is scoped to the current repo and cannot fetch from the
> upstream template. The `gh` CLI (pre-installed in Codespaces) provides the user's
> full GitHub permissions.

### Automated Sync via GitHub Actions (Optional)

For hands-off updates, enable the included workflow in your child repo:

1. Edit `.github/workflows/sync-template.yml`
2. Set the `TEMPLATE_REPO` variable to your org's template URL:
   ```yaml
   env:
     TEMPLATE_REPO: "https://github.com/mobius-logic/agentic-vibe-coding.git"
   ```
3. The workflow runs **weekly on Mondays at 09:00 UTC** (configurable via cron)
4. When updates are found, it creates a **pull request** for your team to review
5. You can also trigger it manually via **Actions → Sync Template Updates → Run workflow**

The PR includes a checklist and shows exactly what changed. Project-specific files
are automatically protected.

### How File Protection Works

The `.gitattributes` file uses Git's merge driver system:

```gitattributes
.plans/**        merge=ours
.agent-logs/**   merge=ours
README.md        merge=ours
```

When `merge=ours` is configured (`git config merge.ours.driver true` — the sync scripts
do this automatically), Git keeps **your local version** of these paths during any merge
from upstream, even if the template has different content in those paths.

### Workflow Summary

```
Org Admin (once):
  Template repo → Settings → ✅ Template repository

New Project:
  "Use this template" → clone → ./scripts/sync-template.sh <URL>

Ongoing Updates (choose one):
  Manual:    ./scripts/sync-template.sh
  Automated: GitHub Actions creates PRs weekly
```

### FAQ

**Q: What if I customized an agent file and the template also changed it?**
A: You'll get a normal merge conflict. Git will show both versions and you choose
which changes to keep. The sync script warns you when this happens.

**Q: Can a child repo push changes back to the template?**
A: No. The `upstream` remote is read-only by design (created via HTTPS clone URL).
There is no fork relationship, so GitHub won't suggest PRs back to the template.

**Q: What if I never want automated syncing?**
A: Delete `.github/workflows/sync-template.yml` from your child repo. You can always
run the sync script manually when you want updates.

**Q: Can I sync only specific paths (e.g., just agents)?**
A: The merge-based approach syncs everything the template changed. If you need more
granular control, you can `git merge --no-commit` then selectively `git checkout HEAD -- <path>`
to revert specific files before committing.

