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
.plans/               # Approved plan documents
scripts/              # Sync tooling (template updates)
.gitattributes        # Merge strategies for template inheritance
```

## License

MIT
