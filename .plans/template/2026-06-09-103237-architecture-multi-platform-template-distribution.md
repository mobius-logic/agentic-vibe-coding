# Architecture: Multi-Platform Template Distribution

- **Date**: 2026-06-09 10:32:37
- **Architect**: architect
- **Status**: approved
- **Feature Fingerprint**: multi-platform-template-distribution

## Feature Fingerprint

- **Canonical Name**: multi-platform-template-distribution
- **Aliases**: azure-devops-template, azdo-sync, gitlab-template, template-mirroring, cross-platform-template
- **Category**: infrastructure

## Project Summary

Extend the template distribution system so that projects created from this template can live
on ANY Git hosting platform (Azure DevOps, GitLab, Bitbucket, etc.) while maintaining the
same human-initiated sync mechanism that GitHub child repos already enjoy. The design uses
a **platform adapter pattern**: core sync logic remains platform-agnostic (Git-native), with
per-platform adapters handling mirroring, repo creation, CI/CD automation, and authentication.

GitHub remains the canonical source of truth. Platforms are treated as "mirror destinations"
that receive template updates via CI/CD, and "child repo hosts" where users create projects.

## Architecture Style

**Modular / Plugin-based** — Each Git hosting platform is a pluggable adapter with:
- A mirror pipeline (pushes template to that platform)
- An init script (creates repos on that platform)
- A CI/CD sync pipeline (platform-native automation for child repos)
- Auth helpers (credential detection for that platform)

## Architecture Style Justification

The platform adapter pattern is chosen because:
1. Each platform has unique APIs, auth mechanisms, and CI/CD systems
2. Adding a new platform should not require changing existing adapters
3. The core sync logic (git merge + .gitattributes) is already platform-agnostic
4. Adapters can be developed and tested independently

## System Topology

```
+----------------------------------------------+
|   GitHub (Canonical Template Repo)           |
|   github.com/mobius-logic/                   |
|        agentic-vibe-coding                   |
+-------+------------------+-------------------+
        |                  |
   "Use this template"    | mirror-to-destinations.yml
        |                  | (dispatches to platform adapters)
        v                  |
+----------------+         +-----+------------------+
| GitHub Child   |         |     |                  |
| Repos          |         v     v                  v
|                |    +--------+ +--------+    +--------+
| upstream=GitHub|    | Azure  | | GitLab | ...| Future |
+----------------+    | DevOps | | Mirror |    |Platform|
                      | Mirror | |        |    |        |
                      +----+---+ +--------+    +--------+
                           |
              init-project --platform azdo
                           |
                           v
                   +-----------------+
                   | Azure DevOps    |
                   | Child Repos     |
                   | upstream = ADO  |
                   | mirror URL      |
                   +-----------------+
```

## Application Layers

### Core Layer (Platform-Agnostic — Already Exists)

- scripts/sync-template.ps1 — Human-initiated pull from upstream (works with any Git URL)
- scripts/sync-template.sh — Bash equivalent
- .gitattributes — Merge protection rules (Git-native, works everywhere)
- .github/copilot-instructions.md + agents — VS Code + Copilot workflow (unchanged)

### Platform Adapters Layer (New)

Each adapter lives in a dedicated directory structure:

| Adapter | Mirror Pipeline | Init Script | CI/CD Sync | Auth Helper |
|---------|----------------|-------------|------------|-------------|
| **Azure DevOps** | .github/workflows/mirror-to-azdo.yml | scripts/init-project.ps1 --platform azdo | pipelines/azdo/sync-template.yml | Built into sync scripts |
| **GitLab** (future) | .github/workflows/mirror-to-gitlab.yml | scripts/init-project.ps1 --platform gitlab | .gitlab-ci/sync-template.yml | Built into sync scripts |
| **Bitbucket** (future) | .github/workflows/mirror-to-bitbucket.yml | scripts/init-project.ps1 --platform bitbucket | pipelines/bitbucket/sync-template.yml | Built into sync scripts |

### Configuration Layer (New)

A configuration file (scripts/platforms.json) defines registered platform destinations:

```json
{
  "platforms": {
    "azdo": {
      "displayName": "Azure DevOps",
      "mirrorUrl": "https://dev.azure.com/mobiuslogic/ML%20Templates/_git/agentic-vibe-coding",
      "orgUrl": "https://dev.azure.com/mobiuslogic",
      "defaultProject": "ML Templates",
      "enabled": true
    },
    "gitlab": {
      "displayName": "GitLab",
      "mirrorUrl": "",
      "enabled": false
    }
  },
  "defaults": {
    "upstreamBranch": "main",
    "syncScheduleCron": "0 9 * * 1"
  }
}
```

## Infrastructure Components

### GitHub → Azure DevOps Mirror (.github/workflows/mirror-to-azdo.yml)

- **Trigger**: Push to main branch
- **Action**: Force-push main to Azure DevOps mirror repo
- **Auth**: PAT stored in GitHub Secrets (AZDO_MIRROR_PAT)
- **Mirror repo**: https://dev.azure.com/mobiuslogic/ML%20Templates/_git/agentic-vibe-coding
- **Behavior**: One-way sync only. Azure DevOps mirror is read-only.

### Azure DevOps Mirror Repo

- **Location**: dev.azure.com/mobiuslogic/ML Templates/_git/agentic-vibe-coding
- **Purpose**: Serves as the stable "upstream" for Azure DevOps child repos
- **Access**: Branch policies set to prevent direct pushes (only the mirror service can push)
- **Why not use GitHub URL directly?**: Avoids cross-platform auth complexity for
  Azure DevOps users; the mirror is in the same org, so System.AccessToken works in pipelines

### Init Script (scripts/init-project.ps1 / init-project.sh)

A unified init script with platform dispatch:

```
scripts/init-project.ps1 -Platform azdo -ProjectName "my-app" [-AzDoProject "MyProject"]
scripts/init-project.sh --platform azdo --name my-app [--azdo-project MyProject]
```

Behavior:
1. Validates prerequisites (z CLI logged in, repo doesn't already exist)
2. Creates the repo via platform API (z repos create)
3. Clones the mirror repo, strips .git, reinitializes (clean history like "Use this template")
4. Pushes to the new repo
5. Configures upstream remote pointing to the mirror
6. Configures merge.ours.driver true
7. Copies platform-specific CI/CD sync pipeline if requested
8. Removes template context (.plans/template/, .agent-logs/template/)
9. Prints success message with next steps

### Azure Pipelines Sync (pipelines/azdo/sync-template.yml)

Azure Pipelines equivalent of .github/workflows/sync-template.yml:
- **Trigger**: Manual (Run pipeline button) + optional schedule
- **Source**: Fetches from Azure DevOps mirror repo (same org)
- **Action**: Creates a PR with template updates in the child repo
- **Auth**: System.AccessToken (no extra secrets needed for same-org repos)
- **Protection**: .gitattributes merge=ours keeps project files safe (same as GitHub)

### Updated Sync Scripts (minor additions)

The existing sync-template.ps1 / .sh get:
- Azure DevOps auth detection: checks for SYSTEM_ACCESSTOKEN (pipeline) or z CLI
- Credential helper configuration for Azure DevOps URLs
- No behavioral changes — just auth awareness

## Cross-Cutting Concerns

### Authentication Matrix

| Context | Auth Method | Secret Location |
|---------|------------|-----------------|
| GitHub Actions → Azure DevOps mirror push | PAT (read/write to mirror repo) | GitHub Secrets: AZDO_MIRROR_PAT |
| Azure Pipelines → fetch from mirror repo | System.AccessToken (built-in) | Automatic (same org) |
| Developer local sync | Git Credential Manager / z CLI | User's credential store |
| Init script creating repos | z CLI login | User session |

### Security

- PAT for mirror push has minimal scope: Code (Read & Write) on the mirror repo only
- Azure DevOps mirror repo has branch policies preventing unauthorized pushes
- Child repos inherit no elevated permissions
- No secrets stored in repo — all in platform secret stores

### Testing Strategy

- Unit tests for init script logic (mocking API calls)
- Integration test: create repo → sync → verify protection works
- E2E: manual validation that full flow works (mirror → init → sync)

### Error Handling

- Init script validates prerequisites before making changes
- Mirror workflow fails gracefully if Azure DevOps is unreachable (GitHub Actions retry)
- Sync pipeline creates PR even on conflicts (human resolves)

## Repository Structure (New/Changed Files)

```
scripts/
  init-project.ps1              # NEW — unified init script with --platform flag
  init-project.sh               # NEW — bash equivalent
  platforms.json                 # NEW — platform configuration
  sync-template.ps1             # MODIFIED — add Azure DevOps auth detection
  sync-template.sh              # MODIFIED — add Azure DevOps auth detection

.github/workflows/
  sync-template.yml             # EXISTING — unchanged
  mirror-to-azdo.yml            # NEW — mirror template to Azure DevOps

pipelines/
  azdo/
    sync-template.yml           # NEW — Azure Pipelines sync for child repos
    README.md                   # NEW — setup instructions

TEMPLATE-GUIDE.md               # MODIFIED — add Azure DevOps section
```

## Naming Conventions

- **Branches**: eature/infra/azdo-template-distribution
- **Files**: kebab-case for scripts, SCREAMING for env vars
- **Azure DevOps URLs**: https://dev.azure.com/{org}/{project}/_git/{repo}
- **Secrets**: AZDO_MIRROR_PAT, AZDO_ORG_URL
- **Pipeline variables**: PascalCase in Azure Pipelines YAML

## Interface Contracts

### Mirror Workflow Contract

Input: Push to main on GitHub
Output: Azure DevOps mirror repo main branch is identical to GitHub main
Guarantee: Mirror is eventual-consistent (within minutes of push)

### Init Script Contract

Input: --platform azdo --name <repo-name> [--azdo-project <project>]
Output:
- New Azure DevOps repo at dev.azure.com/mobiuslogic/{project}/_git/{name}
- Repo contains clean template copy (no upstream history)
- upstream remote configured to mirror URL
- merge.ours.driver configured
- Template context removed
Exit codes: 0 = success, 1 = error (with message)

### Sync Pipeline Contract (Azure Pipelines)

Input: Manual trigger or schedule
Output: PR created in child repo with template updates (or "up to date" message)
Protection: .plans/project/, .agent-logs/project/, README.md never overwritten

## Configuration Blueprint

### GitHub Secrets (Template Repo)

| Secret | Value | Purpose |
|--------|-------|---------|
| AZDO_MIRROR_PAT | Azure DevOps PAT with Code R/W | Mirror push authentication |

### Azure DevOps Mirror Repo Setup

| Setting | Value |
|---------|-------|
| Organization | mobiuslogic |
| Project | ML Templates |
| Repo name | gentic-vibe-coding |
| Branch policy on main | No direct pushes (only service identity) |

### platforms.json Defaults

```json
{
  "platforms": {
    "azdo": {
      "displayName": "Azure DevOps",
      "mirrorUrl": "https://dev.azure.com/mobiuslogic/ML%20Templates/_git/agentic-vibe-coding",
      "orgUrl": "https://dev.azure.com/mobiuslogic",
      "defaultProject": "ML Templates",
      "enabled": true
    }
  },
  "defaults": {
    "upstreamBranch": "main",
    "syncScheduleCron": "0 9 * * 1"
  }
}
```

## Test Specifications

### Unit Test Requirements

- init-project.ps1: Validates parameters, rejects invalid platform names
- init-project.ps1: Detects missing z CLI and exits with helpful message
- sync-template changes: Azure DevOps URL detection works correctly
- platforms.json: Schema validation

### Integration Test Requirements

- Mirror workflow: Push to main → verify Azure DevOps mirror updated
- Init script: Create repo → verify content matches template
- Sync pipeline: Trigger → verify PR created with correct changes
- File protection: Sync does not overwrite .plans/project/, README.md

### End-to-End Test Requirements

1. Push template change to GitHub
2. Verify mirror updates in Azure DevOps
3. Run init-project to create new Azure DevOps repo
4. Make project-specific changes in child repo
5. Trigger sync from child repo
6. Verify template changes merged, project files untouched

## Expected Output Manifest

| Workstream | Files Created | Exports / Endpoints | Tests |
|------------|--------------|---------------------|-------|
| infra | .github/workflows/mirror-to-azdo.yml, pipelines/azdo/sync-template.yml, pipelines/azdo/README.md, scripts/init-project.ps1, scripts/init-project.sh, scripts/platforms.json | CLI commands, pipeline triggers | scripts/tests/init-project.tests.ps1, pipeline dry-run |
| infra | Updated scripts/sync-template.ps1, scripts/sync-template.sh | Same CLI interface (backward-compatible) | Existing tests still pass |
| docs | Updated TEMPLATE-GUIDE.md | New "Azure DevOps" and "Multi-Platform" sections | N/A |

## Reproducibility Notes

- Azure DevOps REST API v7.0 used for repo creation
- z CLI minimum version: 2.50+
- Git Credential Manager handles Azure DevOps auth transparently on Windows
- The mirror workflow uses ctions/checkout@v4 and raw git commands
- Platform adapters are designed for independent addition — adding GitLab requires:
  1. New entry in platforms.json
  2. New mirror workflow (.github/workflows/mirror-to-gitlab.yml)
  3. New init-project platform case
  4. New CI/CD sync pipeline
  5. No changes to existing adapters or core logic

## Future Platform Extension Guide

To add a new platform (e.g., GitLab):
1. Add entry to scripts/platforms.json with enabled: true
2. Create .github/workflows/mirror-to-<platform>.yml
3. Add platform case to scripts/init-project.ps1 and .sh
4. Create platform CI/CD sync pipeline in pipelines/<platform>/
5. Update TEMPLATE-GUIDE.md with platform-specific instructions
6. Store any required secrets in GitHub Secrets

## Approval

- Approved by: human user
- Approved at: 2026-06-09 10:32:37
- Approval note: Extensibility requirement — treat platforms as pluggable adapters
