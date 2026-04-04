# Agentic Coding Team with GitHub Copilot & VS Code

## Architecture Overview

This guide sets up a **multi-agent coding team** where specialized GitHub Copilot agents
collaborate across Git branches to produce a working product. Each agent has a defined role
(team lead, developer, tester, reviewer) with restricted tools and focused instructions.

```
┌─────────────────────────────────────────────────────────┐
│                   ORCHESTRATOR (You)                     │
│            Uses /plan-sprint prompt to kick off          │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │ Team Lead │  │ Team Lead │  │ Team Lead │  .agent.md  │
│  │ (Backend) │  │(Frontend)│  │  (Infra)  │  files      │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐              │
│  │Developer │  │Developer │  │Developer │  subagents    │
│  │  Agent   │  │  Agent   │  │  Agent   │               │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │              │              │                    │
│  ┌────┴─────┐  ┌────┴─────┐  ┌────┴─────┐              │
│  │  Tester  │  │  Tester  │  │  Tester  │  subagents    │
│  │  Agent   │  │  Agent   │  │  Agent   │               │
│  └──────────┘  └──────────┘  └──────────┘              │
│                                                         │
│  ┌──────────┐  ┌──────────┐                             │
│  │Code      │  │  Docs    │  cross-cutting agents       │
│  │Reviewer  │  │  Writer  │                             │
│  └──────────┘  └──────────┘                             │
└─────────────────────────────────────────────────────────┘
```

## How It Works

### Single VS Code Instance Workflow
1. You open a chat session and invoke a **Team Lead** agent (e.g., `@backend-lead`)
2. The team lead agent plans the work, creates a feature branch, and delegates coding tasks
3. The team lead invokes **Developer** subagents that write code on the branch
4. After code is written, the team lead invokes **Tester** subagents to write and run tests
5. The **Code Reviewer** agent reviews changes before merging
6. Repeat across multiple branches for parallel workstreams

### Multi-Codespace Workflow (True Parallelism)
For actual parallel execution, spin up multiple **GitHub Codespaces** — each running its own
VS Code instance with the same agent definitions, working on separate branches simultaneously.

---

## Step-by-Step Setup

### Prerequisites
- GitHub Copilot subscription (Business or Enterprise recommended for teams)
- VS Code with GitHub Copilot Chat extension
- Git repository on GitHub
- (Optional) GitHub Codespaces access

### Step 1: Repository Structure

Create the following structure in your repo's `.github/` folder:

```
.github/
├── agents/                    # Custom agent definitions
│   ├── backend-lead.agent.md
│   ├── frontend-lead.agent.md
│   ├── developer.agent.md
│   ├── tester.agent.md
│   ├── code-reviewer.agent.md
│   └── docs-writer.agent.md
├── prompts/                   # Orchestration prompts
│   ├── plan-sprint.prompt.md
│   ├── implement-feature.prompt.md
│   ├── run-tests.prompt.md
│   └── review-and-merge.prompt.md
├── instructions/              # File-specific guidelines
│   ├── python-style.instructions.md
│   ├── typescript-style.instructions.md
│   └── testing.instructions.md
├── hooks/                     # Quality gate enforcement
│   └── pre-commit-checks.json
├── copilot-instructions.md    # Project-wide standards
└── ...
```

### Step 2: Project-Wide Instructions

Your `.github/copilot-instructions.md` sets the baseline for ALL agents:

```markdown
# Project Standards

## Repository
- Main branch: `main` (protected)
- Feature branches: `feature/<area>/<short-description>`
- Bug fix branches: `fix/<area>/<short-description>`

## Branching Workflow
- Always create a feature branch before making changes
- Never commit directly to `main`
- Write descriptive commit messages: `<type>(<scope>): <description>`

## Code Quality
- All code must have tests before merge
- Run `npm test` (or equivalent) before considering work complete
- Follow existing patterns in the codebase

## Language Standards
- TypeScript: strict mode, no `any` types
- Python: type hints, PEP 8
- Use existing linter/formatter configs
```

### Step 3: Define Your Agent Team

Each `.agent.md` file defines a role. See `.github/agents/` in this repo for ready-to-use
definitions. Here's the design philosophy:

| Agent | Role | Tools | Invocable? | Subagent? |
|-------|------|-------|-----------|-----------|
| `backend-lead` | Plans backend work, manages branches, delegates | all | Yes | No |
| `frontend-lead` | Plans frontend work, manages branches, delegates | all | Yes | No |
| `developer` | Writes code on a given branch per spec | read, edit, search, execute | No | Yes |
| `tester` | Writes and runs tests, reports results | read, edit, search, execute | No | Yes |
| `code-reviewer` | Reviews diffs, flags issues, suggests fixes | read, search | Yes | Yes |
| `docs-writer` | Writes documentation from code | read, search, edit | No | Yes |

**Key design decisions:**
- **Team leads** are user-invocable (you talk to them directly)
- **Workers** (developer, tester, docs) are subagent-only (`user-invocable: false`)
- **Code reviewer** is both — you can invoke directly or a lead can delegate to it
- Tool restrictions enforce role boundaries (reviewer can't edit, developer can't invoke agents)

### Step 4: Branch-Based Workflow

The recommended workflow for each feature:

```
1. You: @backend-lead "Implement user authentication with JWT"

2. Backend Lead:
   - Creates branch: feature/backend/jwt-auth
   - Breaks work into tasks
   - Invokes @developer subagent: "Implement JWT middleware on feature/backend/jwt-auth"
   - Invokes @tester subagent: "Write tests for JWT auth on feature/backend/jwt-auth"
   - Invokes @code-reviewer subagent: "Review changes on feature/backend/jwt-auth"

3. You: @frontend-lead "Build login page that uses the JWT auth API"
   (This can happen in a SEPARATE chat session or Codespace, in parallel)
```

### Step 5: Using GitHub Codespaces for Parallel Agents

For true parallel execution across branches:

#### a) Create a `devcontainer.json` (included in this repo)
This ensures every Codespace has the same environment with Copilot pre-installed.

#### b) Workflow
1. Go to your repo on GitHub
2. Click **Code** → **Codespaces** → **Create codespace on main**
3. In the Codespace VS Code, the agent definitions from `.github/agents/` are immediately available
4. Open Copilot Chat, invoke `@backend-lead` and give it a task
5. **Open a SECOND Codespace** from the same repo
6. In that one, invoke `@frontend-lead` with a different task
7. Each Codespace works on its own branch independently
8. When both are done, create PRs and merge

#### c) Cost Management
- Use the smallest Codespace machine type that works (2-core for most agent work)
- Set idle timeout to 30 minutes
- Stop Codespaces when not actively using them
- Use prebuilds to speed up Codespace creation

### Step 6: Orchestration Prompts

Prompts (`.prompt.md` files) give you quick slash commands to kick off workflows:

- `/plan-sprint` — Break a large feature into tasks assigned to team leads
- `/implement-feature` — Direct a team lead to implement a specific feature
- `/run-tests` — Direct the tester agent to validate a branch
- `/review-and-merge` — Direct the code reviewer to review a branch

### Step 7: Quality Gates with Hooks

Hooks enforce standards deterministically. The included hook configuration:
- Blocks `execute` tool calls that would run `git push --force` or `rm -rf`
- Ensures tests pass before the agent considers work "done"

---

## Usage Patterns

### Pattern 1: Solo Orchestrator (Single VS Code)
You manually switch between agents in one VS Code window:
```
@backend-lead "Plan and implement the REST API for user management"
... wait for completion ...
@frontend-lead "Build the user management UI consuming the REST API"
... wait for completion ...
@code-reviewer "Review all changes on feature/* branches"
```

### Pattern 2: Parallel Codespaces
Open 2-4 Codespaces, each with a different agent focus:
- Codespace 1: `@backend-lead` on backend features
- Codespace 2: `@frontend-lead` on frontend features
- Codespace 3: `@backend-lead` on API integrations
- Codespace 4: Code review / testing across all branches

### Pattern 3: PR-Based Integration
1. Each agent workstream creates a PR when done
2. Use the `@code-reviewer` agent in a fresh session to review each PR
3. Use GitHub's built-in PR review features + Copilot code review
4. Merge PRs to `main` after approval

---

## Tips and Best Practices

1. **Start small**: Begin with 2 agents (one lead + code reviewer) and add more as you refine
2. **Be specific in delegation**: "Implement JWT auth middleware in `src/middleware/auth.ts`"
   is better than "add authentication"
3. **Use branch naming conventions**: The agents are instructed to use
   `feature/<area>/<description>` so you can track which agent created which branch
4. **Review agent output**: Always review code before merging to `main`
5. **Iterate on agent definitions**: Tune the `.agent.md` files based on what works
6. **Leverage existing CI/CD**: The agents create branches and commits; your existing
   GitHub Actions / CI pipelines handle the rest
7. **Use Copilot Code Review on PRs**: Enable Copilot as a reviewer on your repo settings
   for automated PR review in addition to the agent-based review

---

## File Reference

| File | Purpose |
|------|---------|
| `.github/copilot-instructions.md` | Project-wide standards for all agents |
| `.github/agents/*.agent.md` | Agent role definitions |
| `.github/prompts/*.prompt.md` | Orchestration slash commands |
| `.github/instructions/*.instructions.md` | File-type-specific guidelines |
| `.github/hooks/*.json` | Deterministic quality gates |
| `.devcontainer/devcontainer.json` | Codespaces environment config |

---

## Next Steps

All the files referenced above are included in this repository. You can:
1. Copy the `.github/` folder and `.devcontainer/` folder into your project repo
2. Customize the agent definitions for your specific tech stack
3. Update `copilot-instructions.md` with your project's conventions
4. Start using the agents in VS Code or Codespaces
