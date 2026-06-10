# Test Specification: Infrastructure — License Labeling
- **Date**: 2026-06-10 16:34:32
- **Architecture Plan**: .plans/project/2026-06-10-163053-architecture-proprietary-license.md
- **Workstream Plan**: .plans/project/2026-06-10-163053-launch-plan-proprietary-license.md (infra workstream)
- **Test Lead**: test-lead

## Unit Tests

### Module: LICENSE file
| Test Case | Input | Expected Output | Type |
|-----------|-------|-----------------|------|
| LICENSE exists | Check `LICENSE` at repo root | File exists | unit |
| LICENSE contains copyright holder | Read `LICENSE` content | Contains "Mobius Logic, Inc." | unit |
| LICENSE contains all-rights-reserved | Read `LICENSE` content | Contains "All rights reserved" | unit |
| LICENSE contains proprietary marker | Read `LICENSE` content | Contains "PROPRIETARY AND CONFIDENTIAL" | unit |
| LICENSE contains contact email | Read `LICENSE` content | Contains "legal@mobiuslogic.com" | unit |
| LICENSE contains year | Read `LICENSE` content | Contains "2026" | unit |

### Module: THIRD-PARTY-NOTICES.md
| Test Case | Input | Expected Output | Type |
|-----------|-------|-----------------|------|
| THIRD-PARTY-NOTICES.md exists | Check `THIRD-PARTY-NOTICES.md` at repo root | File exists | unit |
| Notices references devcontainer images | Read content | Contains "mcr.microsoft.com/devcontainers" | unit |
| Notices references devcontainer features | Read content | Contains "ghcr.io/devcontainers/features" | unit |
| Notices references GitHub Actions | Read content | Contains "actions/checkout" and "actions/github-script" | unit |
| Notices declares MIT license for components | Read content | Contains "MIT" | unit |

### Module: Python file headers
| Test Case | Input | Expected Output | Type |
|-----------|-------|-----------------|------|
| _edit_script.py has copyright header | Read line 1 of `_edit_script.py` | Line 1 == `# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.` | unit |
| _edit_script.py has confidential line | Read line 2 of `_edit_script.py` | Line 2 == `# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.` | unit |

### Module: PowerShell file headers
| Test Case | Input | Expected Output | Type |
|-----------|-------|-----------------|------|
| init-project.ps1 has copyright at line 1 | Read line 1 of `scripts/init-project.ps1` | Line 1 == `# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.` | unit |
| init-project.ps1 has confidential at line 2 | Read line 2 of `scripts/init-project.ps1` | Line 2 == `# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.` | unit |
| sync-template.ps1 has copyright at line 1 | Read line 1 of `scripts/sync-template.ps1` | Line 1 == `# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.` | unit |
| sync-template.ps1 has confidential at line 2 | Read line 2 of `scripts/sync-template.ps1` | Line 2 == `# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.` | unit |

### Module: Shell script headers
| Test Case | Input | Expected Output | Type |
|-----------|-------|-----------------|------|
| init-project.sh shebang preserved at line 1 | Read line 1 of `scripts/init-project.sh` | Line 1 == `#!/usr/bin/env bash` | unit |
| init-project.sh has copyright after shebang | Read line 2 of `scripts/init-project.sh` | Line 2 == `# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.` | unit |
| init-project.sh has confidential at line 3 | Read line 3 of `scripts/init-project.sh` | Line 3 == `# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.` | unit |
| sync-template.sh shebang preserved at line 1 | Read line 1 of `scripts/sync-template.sh` | Line 1 == `#!/usr/bin/env bash` | unit |
| sync-template.sh has copyright after shebang | Read line 2 of `scripts/sync-template.sh` | Line 2 == `# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.` | unit |
| sync-template.sh has confidential at line 3 | Read line 3 of `scripts/sync-template.sh` | Line 3 == `# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.` | unit |

### Module: YAML workflow file headers
| Test Case | Input | Expected Output | Type |
|-----------|-------|-----------------|------|
| mirror-to-azdo.yml has copyright at line 1 | Read line 1 of `.github/workflows/mirror-to-azdo.yml` | Line 1 == `# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.` | unit |
| mirror-to-azdo.yml has confidential at line 2 | Read line 2 of `.github/workflows/mirror-to-azdo.yml` | Line 2 == `# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.` | unit |
| sync-template.yml (GH) has copyright at line 1 | Read line 1 of `.github/workflows/sync-template.yml` | Line 1 == `# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.` | unit |
| sync-template.yml (GH) has confidential at line 2 | Read line 2 of `.github/workflows/sync-template.yml` | Line 2 == `# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.` | unit |
| sync-template.yml (AzDO) has copyright at line 1 | Read line 1 of `pipelines/azdo/sync-template.yml` | Line 1 == `# Copyright (c) 2026 Mobius Logic, Inc. All rights reserved.` | unit |
| sync-template.yml (AzDO) has confidential at line 2 | Read line 2 of `pipelines/azdo/sync-template.yml` | Line 2 == `# PROPRIETARY AND CONFIDENTIAL. Unauthorized copying prohibited.` | unit |

### Module: Files NOT modified (negative tests)
| Test Case | Input | Expected Output | Type |
|-----------|-------|-----------------|------|
| platforms.json has no copyright header | Read line 1 of `scripts/platforms.json` | Does NOT contain "Copyright" | unit |
| devcontainer.json has no copyright header | Read line 1 of `.devcontainer/devcontainer.json` | Does NOT contain "Copyright" | unit |
| settings.json has no copyright header | Read line 1 of `.vscode/settings.json` | Does NOT contain "Copyright" | unit |
| safety-gates.json has no copyright header | Read line 1 of `.github/hooks/safety-gates.json` | Does NOT contain "Copyright" | unit |
| README.md has no copyright header | Read line 1 of `README.md` | Does NOT contain "Copyright" | unit |
| TEMPLATE-GUIDE.md has no copyright header | Read line 1 of `TEMPLATE-GUIDE.md` | Does NOT contain "Copyright" | unit |
| AZURE-DEVOPS-GUIDE.md has no copyright header | Read line 1 of `AZURE-DEVOPS-GUIDE.md` | Does NOT contain "Copyright" | unit |
| pipelines/azdo/README.md has no copyright header | Read line 1 of `pipelines/azdo/README.md` | Does NOT contain "Copyright" | unit |

### Module: Agent/Instruction/Prompt frontmatter integrity
| Test Case | Input | Expected Output | Type |
|-----------|-------|-----------------|------|
| architect.agent.md frontmatter intact | Read line 1 of `.github/agents/architect.agent.md` | Line 1 == `---` (YAML frontmatter delimiter) | unit |
| backend-lead.agent.md frontmatter intact | Read line 1 of `.github/agents/backend-lead.agent.md` | Line 1 == `---` | unit |
| code-reviewer.agent.md frontmatter intact | Read line 1 of `.github/agents/code-reviewer.agent.md` | Line 1 == `---` | unit |
| developer.agent.md frontmatter intact | Read line 1 of `.github/agents/developer.agent.md` | Line 1 == `---` | unit |
| docs-writer.agent.md frontmatter intact | Read line 1 of `.github/agents/docs-writer.agent.md` | Line 1 == `---` | unit |
| frontend-lead.agent.md frontmatter intact | Read line 1 of `.github/agents/frontend-lead.agent.md` | Line 1 == `---` | unit |
| infra-lead.agent.md frontmatter intact | Read line 1 of `.github/agents/infra-lead.agent.md` | Line 1 == `---` | unit |
| test-lead.agent.md frontmatter intact | Read line 1 of `.github/agents/test-lead.agent.md` | Line 1 == `---` | unit |
| tester.agent.md frontmatter intact | Read line 1 of `.github/agents/tester.agent.md` | Line 1 == `---` | unit |
| python-style.instructions.md frontmatter intact | Read line 1 of `.github/instructions/python-style.instructions.md` | Line 1 == `---` | unit |
| testing.instructions.md frontmatter intact | Read line 1 of `.github/instructions/testing.instructions.md` | Line 1 == `---` | unit |
| typescript-style.instructions.md frontmatter intact | Read line 1 of `.github/instructions/typescript-style.instructions.md` | Line 1 == `---` | unit |
| implement-feature.prompt.md frontmatter intact | Read line 1 of `.github/prompts/implement-feature.prompt.md` | Line 1 == `---` | unit |
| design-architecture.prompt.md frontmatter intact | Read line 1 of `.github/prompts/design-architecture.prompt.md` | Line 1 == `---` | unit |
| plan-sprint.prompt.md frontmatter intact | Read line 1 of `.github/prompts/plan-sprint.prompt.md` | Line 1 == `---` | unit |
| review-and-merge.prompt.md frontmatter intact | Read line 1 of `.github/prompts/review-and-merge.prompt.md` | Line 1 == `---` | unit |
| run-tests.prompt.md frontmatter intact | Read line 1 of `.github/prompts/run-tests.prompt.md` | Line 1 == `---` | unit |

## Integration Tests

### Interface: Full-repo license consistency
| Test Case | Setup | Action | Expected | Type |
|-----------|-------|--------|----------|------|
| All .py files have headers | List all .py files in repo | Check each has copyright at line 1 | All .py files start with copyright comment | integration |
| All .ps1 files have headers | List all .ps1 files in repo | Check each has copyright at line 1 | All .ps1 files start with copyright comment | integration |
| All .sh files have headers after shebang | List all .sh files in repo | Check shebang at line 1, copyright at line 2 | All .sh files have shebang line 1, copyright line 2 | integration |
| All .yml files have headers | List all .yml files in repo | Check each has copyright at line 1 | All .yml files start with copyright comment | integration |
| No .json file has copyright header | List all .json files in repo | Check none contain "Copyright" in first 3 lines | Zero .json files have copyright text | integration |
| No .md documentation has copyright header | List doc .md files | Check none contain "Copyright" in first 3 lines | Zero doc .md files have copyright text | integration |
| No frontmatter file has license header | List .agent.md, .instructions.md, .prompt.md | Check line 1 is `---` for all | All frontmatter files unchanged | integration |

## Edge Cases & Error Scenarios

| Test Case | Scenario | Expected Behavior |
|-----------|----------|-------------------|
| Shell shebang not displaced | Shebang `#!/usr/bin/env bash` must remain line 1 after header insertion | shebang is still line 1; copyright is line 2 |
| Python file has no shebang | `_edit_script.py` is a Python file without shebang | Copyright header goes at absolute line 1 |
| Existing content preserved | After header insertion, all original file content remains unchanged | diff shows ONLY added lines at top (or after shebang for .sh) |
| No trailing whitespace in headers | Copyright header lines have no trailing spaces | Each header line matches exactly (no trailing whitespace) |
| Header is exactly two lines | Each file's header is exactly 2 comment lines | No extra blank lines between header and content |
| LICENSE file has no BOM | LICENSE file encoding | No UTF-8 BOM prefix bytes |
| THIRD-PARTY-NOTICES.md line endings | File uses consistent line endings | LF line endings (consistent with repo .gitattributes) |
| copilot-instructions.md not modified | `.github/copilot-instructions.md` is a markdown file | No copyright header added (treated as documentation) |

## Acceptance Criteria Verification

| Acceptance Criterion (from plan) | Test Case(s) |
|----------------------------------|--------------|
| 1. LICENSE file exists at repo root with correct Mobius Logic proprietary text | LICENSE exists, LICENSE contains copyright holder, LICENSE contains all-rights-reserved, LICENSE contains proprietary marker, LICENSE contains contact email, LICENSE contains year |
| 2. THIRD-PARTY-NOTICES.md exists at repo root with correct attributions | THIRD-PARTY-NOTICES.md exists, Notices references devcontainer images, Notices references devcontainer features, Notices references GitHub Actions, Notices declares MIT license |
| 3. All .py, .ps1, .sh, .yml source files have copyright headers | All per-file header tests (Python, PowerShell, Shell, YAML modules) + integration sweep tests |
| 4. Headers use correct comment syntax per language | Per-file exact line match tests verify `#` comment prefix |
| 5. Shell scripts retain their shebang as line 1 (header inserted after) | init-project.sh shebang preserved at line 1, sync-template.sh shebang preserved at line 1, Shell shebang not displaced |
| 6. No JSON or markdown files are modified | All "Files NOT modified" negative tests + No .json file has copyright header + No .md documentation has copyright header |
| 7. No YAML frontmatter in agent/instruction/prompt files is broken | All "Agent/Instruction/Prompt frontmatter integrity" tests + No frontmatter file has license header |
| 8. All existing functionality is preserved (no behavioral changes) | Existing content preserved edge case + integration sweep confirming only header additions |

## End-to-End Integration Tests

### Scenario: Complete license labeling applied to repository
- **Prerequisites**: Git repository with all source files present on the feature branch `chore/infra/proprietary-license`
- **Setup**:
  1. Checkout branch `chore/infra/proprietary-license`
  2. Confirm all expected source files exist (8 files to be modified + 2 new files)
- **Steps**:
  1. Verify `LICENSE` file created with exact proprietary text from architecture plan
  2. Verify `THIRD-PARTY-NOTICES.md` created with exact content from architecture plan
  3. For each .py file: verify copyright header at line 1, confidential at line 2, original content starts at line 3
  4. For each .ps1 file: verify copyright header at line 1, confidential at line 2, original content starts at line 3
  5. For each .sh file: verify shebang at line 1, copyright at line 2, confidential at line 3, original content starts at line 4
  6. For each .yml file: verify copyright at line 1, confidential at line 2, original content starts at line 3
  7. For each .json file: verify NO changes (git diff shows no modifications to .json files)
  8. For each .md documentation file: verify NO changes (git diff shows no modifications)
  9. For each .agent.md/.instructions.md/.prompt.md: verify line 1 is still `---`
  10. Run `git diff --stat` and confirm only the expected 10 files are touched (8 modified + 2 new)
- **Expected End State**:
  - Exactly 10 files in the diff: LICENSE (new), THIRD-PARTY-NOTICES.md (new), _edit_script.py, scripts/init-project.ps1, scripts/sync-template.ps1, scripts/init-project.sh, scripts/sync-template.sh, .github/workflows/mirror-to-azdo.yml, .github/workflows/sync-template.yml, pipelines/azdo/sync-template.yml
  - Zero .json files in the diff
  - Zero documentation .md files in the diff
  - Zero .agent.md/.instructions.md/.prompt.md files in the diff
  - All modified source files have exactly 2 added lines at the top (or after shebang for .sh)
- **Teardown**:
  1. No teardown needed (test is read-only inspection of branch state)
- **Execution**: Local
- **Timeout**: 60 seconds

### Scenario: Behavioral preservation — scripts still parse correctly
- **Prerequisites**: Branch `chore/infra/proprietary-license` checked out
- **Setup**:
  1. Ensure PowerShell and Bash are available
- **Steps**:
  1. Run `powershell -NoProfile -File scripts/init-project.ps1 -?` (or syntax check) — verify script parses without error
  2. Run `powershell -NoProfile -File scripts/sync-template.ps1 -?` (or syntax check) — verify script parses without error
  3. Run `bash -n scripts/init-project.sh` — verify shell script syntax is valid
  4. Run `bash -n scripts/sync-template.sh` — verify shell script syntax is valid
  5. Run `python -c "import ast; ast.parse(open('_edit_script.py').read())"` — verify Python syntax is valid
- **Expected End State**:
  - All syntax checks pass with exit code 0
  - No parse errors from adding comment headers
- **Teardown**:
  1. None
- **Execution**: Local
- **Timeout**: 30 seconds
