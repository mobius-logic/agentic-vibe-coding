# Agentic Vibe Coding

A template repository for running a **multi-agent GitHub Copilot coding team** in VS Code
and GitHub Codespaces. Specialized AI agents collaborate across Git branches — team leads
plan and delegate, developers write code, testers validate, and reviewers gatekeep quality.

## Quick Start

### In VS Code (Local)
1. Clone this repo into your project (copy the `.github/` and `.devcontainer/` folders)
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
```

## Orchestrator Runbook (What YOU Do)

You are the human orchestrator. Agents write code — you control branching, merging, and phasing.

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
| 1 | Open **Codespace A** (or local VS Code) — paste `@infra-lead` prompt |
| 2 | Open **Codespace B** — paste `@backend-lead` prompt |
| 3 | Wait for each agent to finish |
| 4 | Review the output (skim files, check agent's completion summary) |
| 5 | Push the branches (see below) |
| 6 | Create PRs on GitHub |
| 7 | Merge the independent workstream first (infra), then rebase and merge the dependent one (backend) |

**Pushing a branch after an agent finishes:**
```bash
# Check what the agent committed
git status
git log --oneline -5

# Push the feature branch
git push origin feature/infra/project-setup
```

**Creating a PR on GitHub:**
1. Go to github.com → your repo → **Pull Requests** → **New pull request**
2. Set base: `main`, compare: `feature/infra/project-setup`
3. Title: `feat(infra): project scaffolding`
4. Create and merge

**Rebasing a dependent branch after merging its dependency:**
```bash
# In the backend Codespace/terminal
git fetch origin
git rebase origin/main
# Fix any conflicts if prompted, then:
git push origin feature/backend/simulation-core --force-with-lease
```

### Phase 2: Dependent Workstream (e.g. Frontend)

| Step | You Do |
|------|--------|
| 1 | Ensure Phase 1 PRs are merged to `main` |
| 2 | Open a Codespace or local VS Code |
| 3 | Pull latest: `git checkout main && git pull` |
| 4 | Paste the `@frontend-lead` prompt |
| 5 | Wait, review, push, create PR |
| 6 | Don't merge yet — go to Phase 3 |

### Phase 3: Review + Final Merge

| Step | You Do |
|------|--------|
| 1 | Paste the `@code-reviewer` prompt targeting the open PR branch |
| 2 | Review the agent's findings |
| 3 | If fixes needed: tell the relevant `@<lead>` to fix them |
| 4 | Once clean: merge the final PR on GitHub |
| 5 | Pull `main` and run the app |

### Single-Machine Alternative (No Codespaces)

Run agents sequentially in one VS Code instance:
```
@infra-lead → wait → push → PR → merge → git pull
@backend-lead → wait → push → PR → merge → git pull
@frontend-lead → wait → push → PR → merge → git pull
@code-reviewer → review
```

## Decision Cheat Sheet

| Situation | What to do |
|-----------|-----------|
| Agent says "done" | Check `git log`, skim files, then `git push origin <branch>` |
| Agent made a mistake | Tell it what's wrong in the same chat session |
| Tests fail | Tell the agent "tests are failing, fix them" |
| Agent asks a question | Answer it — you're the product owner |
| Need to restart a Codespace | Branch is already pushed; open new Codespace, `git checkout <branch>` |
| Merge conflict | `git fetch origin && git rebase origin/main` on the conflicting branch |
| Want to skip Codespaces | Run one agent at a time locally (sequential) |
| Agent's work log is wrong | Check `.agent-logs/` for the agent's memory file |

## Agent Memory Logs

Each agent writes a dated summary log to `.agent-logs/<agent-name>-log.md` tracking:
- Tasks completed with timestamps
- Files created/modified
- Fixes applied and lessons learned
- Git commit IDs for traceability

These logs persist across sessions so agents can review their prior work and avoid repeating mistakes. See `.agent-logs/` after any agent run.

## Customization

- Edit `.github/agents/*.agent.md` to tune agent behavior for your tech stack
- Edit `.github/copilot-instructions.md` for your project's conventions
- Add `.github/instructions/*.instructions.md` for language/framework-specific rules
- See [AGENTIC-TEAM-SETUP-GUIDE.md](AGENTIC-TEAM-SETUP-GUIDE.md) for the full guide

## License

MIT
