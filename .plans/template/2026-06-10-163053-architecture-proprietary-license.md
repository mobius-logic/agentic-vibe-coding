# Architecture: Proprietary License Labeling
- **Date**: 2026-06-10 16:30:53
- **Architect**: architect
- **Status**: approved
- **Feature Fingerprint**: proprietary-license-labeling

## Feature Fingerprint

- **Canonical Name**: proprietary-license-labeling
- **Aliases**: add license, copyright headers, license tagging, IP labeling
- **Category**: infrastructure

## Project Summary

Add Mobius Logic, Inc. proprietary license to all source files in the agentic-vibe-coding template. Analysis confirmed zero inherited open-source obligations — all code is original work; third-party components (devcontainer images, GitHub Actions, VS Code extensions) are referenced by URL/name but never bundled.

## Architecture Style

N/A — this is a metadata/licensing chore, not an application architecture change.

## Architecture Style Justification

This is a repository-level licensing change. No application components are being modified — only license headers and a LICENSE file are being added.

## License Analysis (Pre-Approval)

### Source Files (All Original — No Inherited License)

| File | Type |
|------|------|
| `_edit_script.py` | Python utility |
| `scripts/init-project.ps1` | PowerShell |
| `scripts/init-project.sh` | Bash |
| `scripts/sync-template.ps1` | PowerShell |
| `scripts/sync-template.sh` | Bash |
| `scripts/platforms.json` | JSON config |
| `.devcontainer/devcontainer.json` | JSON config |
| `.vscode/settings.json` | JSON config |
| `.github/hooks/safety-gates.json` | JSON config |
| `.github/workflows/mirror-to-azdo.yml` | GitHub Actions |
| `.github/workflows/sync-template.yml` | GitHub Actions |
| `pipelines/azdo/sync-template.yml` | Azure Pipelines |
| `.github/agents/*.agent.md` | Agent definitions |
| `.github/instructions/*.instructions.md` | Coding standards |
| `.github/prompts/*.prompt.md` | Prompt templates |
| `.github/copilot-instructions.md` | Project instructions |

### Third-Party Components (Referenced, Not Bundled — No Obligation)

| Component | License | Obligation |
|-----------|---------|------------|
| `mcr.microsoft.com/devcontainers/javascript-node` | MIT | None |
| `ghcr.io/devcontainers/features/git:1` | MIT | None |
| `ghcr.io/devcontainers/features/github-cli:1` | MIT | None |
| `actions/checkout@v4` | MIT | None |
| `actions/github-script@v7` | MIT | None |
| GitHub Copilot extensions | Proprietary (Microsoft) | None |

## Deliverables

### 1. LICENSE File (Repository Root)

Create `LICENSE` with the following content:

```
Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.

PROPRIETARY AND CONFIDENTIAL

This software and its documentation are the exclusive property of
Mobius Logic, Inc. Unauthorized copying, modification, distribution,
or use of this software, in whole or in part, via any medium, is
strictly prohibited without the prior written consent of Mobius Logic, Inc.

This software is provided "AS IS" without warranty of any kind, express
or implied, including but not limited to the warranties of merchantability,
fitness for a particular purpose, and noninfringement.

For licensing inquiries, contact: legal@mobiuslogic.com
```

### 2. Copyright Headers

Add to the TOP of each source file (before any existing content), using the appropriate comment syntax:

**Python files (`.py`)**:
```python
# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.
# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.
```

**Shell scripts (`.sh`)**:
```bash
# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.
# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.
```

(Insert AFTER the shebang `#!/usr/bin/env bash` line, before other content)

**PowerShell scripts (`.ps1`)**:
```powershell
# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.
# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.
```

**YAML files (`.yml`)**:
```yaml
# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.
# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.
```

**JSON files** — JSON does not support comments. Instead, no header is added to `.json` files. The top-level `LICENSE` file covers them.

**Markdown files (`.md`)** — Do NOT add headers to markdown files. They are documentation covered by the LICENSE file.

**Agent/Instruction/Prompt files (`.agent.md`, `.instructions.md`, `.prompt.md`)** — These have YAML frontmatter. Do NOT add license headers to these as it would break frontmatter parsing.

### 3. THIRD-PARTY-NOTICES.md (Optional, Recommended)

Create `THIRD-PARTY-NOTICES.md` in repository root:

```
# Third-Party Notices

This project references (but does not bundle) the following third-party
components. They are fetched at build/runtime and are NOT distributed
as part of this repository.

## Dev Container Base Image
- **Component**: mcr.microsoft.com/devcontainers/javascript-node
- **License**: MIT
- **Source**: https://github.com/devcontainers/images

## Dev Container Features
- **Component**: ghcr.io/devcontainers/features/git, github-cli
- **License**: MIT
- **Source**: https://github.com/devcontainers/features

## GitHub Actions
- **Component**: actions/checkout, actions/github-script
- **License**: MIT
- **Source**: https://github.com/actions
```

## Files to Modify

| File | Action |
|------|--------|
| `LICENSE` (new) | Create with proprietary text |
| `THIRD-PARTY-NOTICES.md` (new) | Create with attribution |
| `_edit_script.py` | Add copyright header at line 1 |
| `scripts/init-project.ps1` | Add copyright header at line 1 |
| `scripts/init-project.sh` | Add copyright header after shebang (line 2) |
| `scripts/sync-template.ps1` | Add copyright header at line 1 |
| `scripts/sync-template.sh` | Add copyright header after shebang (line 2) |
| `.github/workflows/mirror-to-azdo.yml` | Add copyright header at line 1 |
| `.github/workflows/sync-template.yml` | Add copyright header at line 1 |
| `pipelines/azdo/sync-template.yml` | Add copyright header at line 1 |

## Files NOT Modified (by design)

- `.json` files — no comment syntax
- `.md` files — documentation, covered by LICENSE
- `.agent.md` / `.instructions.md` / `.prompt.md` — YAML frontmatter would break
- `.gitattributes` / `.gitignore` — standard git config, covered by LICENSE

## Naming Conventions

- **Branch**: `chore/infra/proprietary-license`
- **Commit message**: `chore(license): add Mobius Logic proprietary license and headers`

## Acceptance Criteria

1. `LICENSE` file exists at repo root with correct Mobius Logic proprietary text
2. `THIRD-PARTY-NOTICES.md` exists at repo root with correct attributions
3. All `.py`, `.ps1`, `.sh`, `.yml` source files have copyright headers
4. Headers use correct comment syntax per language
5. Shell scripts retain their shebang as line 1 (header inserted after)
6. No JSON or markdown files are modified
7. No YAML frontmatter in agent/instruction/prompt files is broken
8. All existing functionality is preserved (no behavioral changes)

## Approval

- Approved by: human user
- Approved at: 2026-06-10 16:30:53
