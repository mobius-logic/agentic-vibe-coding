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

## Customization

- Edit `.github/agents/*.agent.md` to tune agent behavior for your tech stack
- Edit `.github/copilot-instructions.md` for your project's conventions
- Add `.github/instructions/*.instructions.md` for language/framework-specific rules
- See [AGENTIC-TEAM-SETUP-GUIDE.md](AGENTIC-TEAM-SETUP-GUIDE.md) for the full guide

## License

MIT
