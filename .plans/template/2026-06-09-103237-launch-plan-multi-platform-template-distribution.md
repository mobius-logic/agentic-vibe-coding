# Launch Plan: Multi-Platform Template Distribution

- **Date**: 2026-06-09 10:32:37
- **Architecture Reference**: .plans/project/2026-06-09-103237-architecture-multi-platform-template-distribution.md
- **Feature Fingerprint**: multi-platform-template-distribution
- **Execution Mode**: sequential
- **Available Slots**: 1 (local VS Code)
- **Total Workstreams**: 1
- **Total Waves**: 1

## Dependency Graph

```
[infra] (no dependencies — standalone workstream)
```

## Execution Schedule

### Wave 1 — Infrastructure & Platform Adapters

- **Parallel slots used**: 1
- **Workstreams**:
  - infra → @infra-lead [session #1]
- **Sync point**: Merge to main after all gates pass

## Sequential Fallback Order

1. infra → @infra-lead

## Delegation Payloads

### Payload: Infrastructure → @infra-lead

```
## Architect Handshake
- **Architecture Plan**: .plans/project/2026-06-09-103237-architecture-multi-platform-template-distribution.md
- **Launch Plan**: .plans/project/2026-06-09-103237-launch-plan-multi-platform-template-distribution.md
- **Execution Mode**: sequential
- **Delegation Protocol**: .plans/template/2026-04-09-180237-strict-delegation-protocol.md
- **Required Acknowledgment**: Lead MUST confirm:
  1. It has read the architecture plan
  2. It has read the delegation protocol
  3. It will follow the 7-Gate mandatory sequence
  4. It will present its execution plan to the human before starting
  5. It acknowledges its execution mode and wave assignment

## Workstream: Infrastructure — @infra-lead
**Architecture Reference**: .plans/project/2026-06-09-103237-architecture-multi-platform-template-distribution.md
**Launch Plan Reference**: .plans/project/2026-06-09-103237-launch-plan-multi-platform-template-distribution.md

### Execution Context
- **Mode**: sequential
- **Wave**: 1 of 1
- **Parallel peers**: none
- **Prerequisites**: none
- **Codespace/Session**: sequential — single session in local VS Code
- **Sync point**: Merge to main after all gates pass

### Context

This template repo (agentic-vibe-coding) currently supports GitHub-only template inheritance.
Users create repos from this template on GitHub and sync updates via scripts/sync-template.ps1.
We are extending this to support Azure DevOps (and future platforms) as additional destinations.
GitHub remains the canonical source. A mirror pipeline keeps Azure DevOps in sync.
Azure DevOps users get their own init script and CI/CD sync pipeline.

### Scope

Create all infrastructure for multi-platform template distribution with Azure DevOps as the
first platform adapter. This includes:
- GitHub → Azure DevOps mirror pipeline
- Unified project init script (with --platform flag)
- Azure Pipelines sync pipeline for child repos
- Platform configuration file
- Minor auth-awareness updates to existing sync scripts
- Documentation updates to TEMPLATE-GUIDE.md

### Tasks

1. **Create scripts/platforms.json** — Platform configuration registry
   - Define azdo adapter with mirrorUrl, orgUrl, defaultProject
   - Include defaults section (upstreamBranch, syncScheduleCron)
   - Schema must be extensible for future platforms (gitlab, bitbucket)
   - Acceptance criteria: Valid JSON, matches schema in architecture doc

2. **Create .github/workflows/mirror-to-azdo.yml** — GitHub Actions mirror pipeline
   - Trigger on push to main
   - Checkout with full history (fetch-depth: 0)
   - Force-push main branch to Azure DevOps mirror repo
   - Use AZDO_MIRROR_PAT secret for auth
   - Mirror URL from platforms.json or hardcoded (simpler for now)
   - Acceptance criteria: Valid GitHub Actions YAML, correct trigger, correct auth

3. **Create pipelines/azdo/sync-template.yml** — Azure Pipelines sync for child repos
   - Manual trigger (no CI trigger)
   - Optional scheduled trigger (weekly Monday 09:00 UTC)
   - Fetch from Azure DevOps mirror repo (upstream)
   - Attempt merge with --no-edit --allow-unrelated-histories
   - If changes exist, create a PR via az repos pr create
   - Use System.AccessToken for auth
   - Respect .gitattributes merge=ours protections
   - Clean up template context (.plans/template/, .agent-logs/template/)
   - Acceptance criteria: Valid Azure Pipelines YAML, creates PR on changes

4. **Create pipelines/azdo/README.md** — Setup instructions for Azure Pipelines
   - How to add this pipeline to your Azure DevOps child repo
   - Prerequisites (repo setup, permissions)
   - Acceptance criteria: Clear, actionable instructions

5. **Create scripts/init-project.ps1** — Unified project init script (PowerShell)
   - Parameters: -Platform (required), -Name (required), -AzDoProject (optional)
   - Platform dispatch: azdo case (future: gitlab, bitbucket)
   - For azdo:
     a. Validate az CLI is logged in
     b. Create repo via az repos create
     c. Clone mirror repo to temp dir
     d. Remove .git, reinitialize (clean history)
     e. Push to new repo
     f. Configure upstream remote to mirror URL
     g. Configure merge.ours.driver true
     h. Remove template context (.plans/template/, .agent-logs/template/)
     i. Optionally copy pipelines/azdo/sync-template.yml
     j. Print next steps
   - Acceptance criteria: Creates functional Azure DevOps repo with template content

6. **Create scripts/init-project.sh** — Bash equivalent of init-project.ps1
   - Same logic, POSIX-compliant
   - Acceptance criteria: Parity with PowerShell version

7. **Update scripts/sync-template.ps1** — Add Azure DevOps auth awareness
   - Detect SYSTEM_ACCESSTOKEN env var (Azure Pipelines context)
   - If Azure DevOps URL detected, configure git credential helper for az
   - No behavioral changes to existing logic
   - Backward-compatible — existing GitHub usage unchanged
   - Acceptance criteria: Existing sync still works, Azure DevOps auth detected

8. **Update scripts/sync-template.sh** — Add Azure DevOps auth awareness (bash)
   - Same additions as PowerShell version
   - Acceptance criteria: Parity with PowerShell, backward-compatible

9. **Update TEMPLATE-GUIDE.md** — Add multi-platform documentation
   - New section: "Multi-Platform Support"
   - New section: "Azure DevOps Setup"
     - How to set up the mirror (one-time admin task)
     - How to create new projects (init-project script)
     - How to sync template updates (manual + pipeline)
   - New section: "Adding Future Platforms"
   - Update existing Template Inheritance diagram to show multi-platform
   - Acceptance criteria: Clear docs for Azure DevOps users, extensibility documented

### Technical Decisions (from architecture)

- **Language/Framework**: PowerShell + Bash for scripts, YAML for pipelines
- **Azure DevOps API**: az CLI (not raw REST) for simplicity
- **Auth**: PAT for mirror push (GitHub Secret), System.AccessToken for pipelines, az CLI for local
- **Mirror URL**: https://dev.azure.com/mobiuslogic/ML%20Templates/_git/agentic-vibe-coding
- **Org URL**: https://dev.azure.com/mobiuslogic
- **Platform config**: JSON file at scripts/platforms.json

### Dependencies

- Depends on: None (standalone workstream)
- Depended on by: None (this is the only workstream)

### Interfaces

- Init script reads platforms.json for mirror URLs and defaults
- Sync scripts detect platform from the upstream remote URL format
- Mirror workflow is independent (triggered by git push, no interface with other components)

### Out of Scope

- GitLab adapter implementation (future — only the extension point is designed)
- Bitbucket adapter implementation (future)
- Azure DevOps Boards, Artifacts, or Pipelines for application CI/CD
- Changes to the agent workflow or Copilot integration
- Azure DevOps branch policies automation (user sets these manually)
- Service connections or managed identities (PAT is sufficient for now)
```

## Reproducibility Checksum

- **Architecture Hash**: (computed at save time)
- **Plan Version**: 1
- **Prior Instances**: none
