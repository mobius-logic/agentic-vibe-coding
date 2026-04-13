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
