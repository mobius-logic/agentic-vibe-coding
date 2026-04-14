# Infra Lead Session Log

## 2026-04-12 16:13:50 — Session Summary
- **Architecture/Plan Reference**: N/A — infrastructure config fix (devcontainer image swap)
- **Branch**: fix/infra/devcontainer-lightweight-image
- **Commit**: 5816a3d
- **Approved Execution Plan**:
  1. Replace `universal:2` image with `javascript-node:1-22-bookworm` (AC: image field updated)
  2. Change `remoteUser` from `codespace` to `node` (AC: remoteUser field updated)
  3. Add `features` block with git feature (AC: features key present)
  4. Preserve all existing vscode customizations and postCreateCommand (AC: unchanged)
  5. Validate resulting JSON (AC: JSON.parse succeeds, all fields correct)
- **Tasks Completed**:
  - Replaced devcontainer image from `universal:2` (~8GB) to `javascript-node:1-22-bookworm` (~300MB)
  - Changed remoteUser from `codespace` to `node`
  - Added explicit git feature declaration
  - Validated JSON and all acceptance criteria via automated checks
- **Files Changed**: `.devcontainer/devcontainer.json`
- **Fixes Applied**: Devcontainer was using oversized universal image that failed to pull in Codespaces; switched to lightweight Node.js image matching project's actual runtime needs
- **Subagents Invoked**: None (simple config fix executed directly per delegation payload)
- **Lessons Learned**: The `javascript-node` devcontainer image uses `node` as default user, not `codespace`
- **Status**: done

## 2026-04-12 16:33:16 — Session Summary
- **Architecture/Plan Reference**: N/A — infrastructure bug fix for Codespace Git authentication
- **Branch**: fix/infra/sync-template-codespace-auth
- **Commit**: 7ec4d4f
- **Approved Execution Plan**:
  1. Add Codespace detection + gh CLI auth block to sync-template.sh (AC: detects CODESPACES/CODESPACE_NAME, runs gh auth setup-git, warns if gh missing)
  2. Add equivalent Codespace auth block to sync-template.ps1 (AC: same detection and auth logic in PowerShell)
  3. Update TEMPLATE-GUIDE.md with Codespace auth note (AC: note added to sync section)
  4. Validate syntax of both scripts (AC: bash -n passes, PowerShell parser passes)
- **Tasks Completed**:
  - Added Codespace gh CLI auth block to scripts/sync-template.sh
  - Added equivalent Codespace auth block to scripts/sync-template.ps1
  - Updated TEMPLATE-GUIDE.md with Codespace auth note in sync section
  - Validated bash syntax (OK) and PowerShell syntax (OK)
- **Files Changed**: scripts/sync-template.sh, scripts/sync-template.ps1, TEMPLATE-GUIDE.md
- **Fixes Applied**: Codespace GITHUB_TOKEN is scoped to current repo only, causing 403 on upstream fetch. Fixed by auto-configuring gh CLI credential helper in Codespaces.
- **Subagents Invoked**: None (direct implementation per delegation payload)
- **Lessons Learned**: Em-dash (U+2014) characters in string literals cause PowerShell parse errors when written by VS Code tooling on Windows — use ASCII dashes instead
- **Status**: done

## 2026-04-13 20:45:39 — Session Summary
- **Architecture/Plan Reference**: N/A — infrastructure/dependency fix (devcontainer config change)
- **Branch**: fix/infra/devcontainer-gh-cli
- **Commit**: 8422bdd
- **Approved Execution Plan**:
  1. Add `ghcr.io/devcontainers/features/github-cli:1` to features block (AC: feature present in JSON)
  2. Update postCreateCommand to run `gh auth setup-git` before echo (AC: command present, echo preserved)
  3. All other settings unchanged (AC: image, extensions, settings, remoteUser identical)
  4. Valid JSON (AC: JSON.parse succeeds)
  5. Existing tests pass (AC: 55/55 pass, 0 failures)
- **Tasks Completed**:
  - Added GitHub CLI devcontainer feature
  - Updated postCreateCommand with defensive gh auth setup-git
  - Validated all acceptance criteria (JSON valid, features correct, command present, echo preserved, no regressions)
  - All 55 dashboard tests pass (event-cache, collectors, server)
- **Files Changed**: `.devcontainer/devcontainer.json`
- **Fixes Applied**: Codespace sessions lacked `gh` CLI (causing `gh: command not found`) and git auth wasn't configured for cross-repo operations (causing `write access to repository not granted`). Fixed by adding github-cli feature and auto-running `gh auth setup-git` on container creation.
- **Subagents Invoked**: Self-executed (developer, tester, code-reviewer, docs-writer roles performed inline per delegation payload)
- **Lessons Learned**: The `command -v gh >/dev/null 2>&1` pattern is the correct POSIX-compliant way to check for command existence in shell one-liners
- **Status**: done

## 2026-04-13 21:07:29 — Session Summary
- **Architecture/Plan Reference**: .plans/2026-04-13-sync-template-codespace-token-scope-fix.md
- **Branch**: fix/infra/sync-template-token-scope
- **Commit**: 0d56f50
- **Approved Execution Plan**:
  1. Replace Codespace auth block in sync-template.sh with check_upstream_access function (AC: detects Codespace, tests API access, exits with clear gh auth login message on failure)
  2. Replace Codespace auth block in sync-template.ps1 with Test-UpstreamAccess function (AC: same logic in PowerShell)
  3. Update TEMPLATE-GUIDE.md Codespace note (AC: reflects new access-check behavior)
- **Tasks Completed**:
  - Replaced fire-and-forget gh auth setup-git block with pre-fetch access-check function in sync-template.sh
  - Replaced equivalent block in sync-template.ps1 with Test-UpstreamAccess function
  - Updated TEMPLATE-GUIDE.md Codespace note to reflect new behavior
  - Fixed CRLF line endings in sync-template.sh (Windows tooling introduced them)
- **Files Changed**: scripts/sync-template.sh, scripts/sync-template.ps1, TEMPLATE-GUIDE.md
- **Fixes Applied**: Old Codespace auth block only ran `gh auth setup-git` which configures git's credential helper but doesn't upgrade the scoped token. New approach tests actual API access to upstream repo and gives clear error with `gh auth login` instructions.
- **Subagents Invoked**: Self-executed (developer, tester, code-reviewer, docs-writer roles performed inline per delegation payload)
- **Lessons Learned**: Windows VS Code file editing introduces CRLF line endings in .sh files — must convert to LF before bash -n validation. Use [System.IO.File]::WriteAllText with explicit LF replacement.
- **Status**: done
