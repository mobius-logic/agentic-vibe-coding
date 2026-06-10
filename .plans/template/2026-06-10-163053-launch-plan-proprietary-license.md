# Launch Plan: Proprietary License Labeling
- **Date**: 2026-06-10 16:30:53
- **Architecture Reference**: .plans/project/2026-06-10-163053-architecture-proprietary-license.md
- **Feature Fingerprint**: proprietary-license-labeling
- **Execution Mode**: sequential
- **Available Slots**: 1
- **Total Workstreams**: 1
- **Total Waves**: 2

## Dependency Graph

```
test-lead → infra
```

## Execution Schedule

### Wave 0 — Test Specifications (MANDATORY prerequisite)
- **Agent**: @test-lead
- **Input**: Architecture plan (license labeling)
- **Output**: Test specs in `.test-specs/project/` for license validation
- **Sync point**: Wave 1 BLOCKED until Wave 0 completes

### Wave 1 — License Labeling
- **Parallel slots used**: 1
- **Workstreams**:
  - infra → @infra-lead [session #1]
- **Sync point**: Merge to main after completion

## Sequential Fallback Order
1. infra (license labeling) → @infra-lead

## Delegation Payloads

### Payload: Test Lead → @test-lead
```
## Test Lead Invocation (MANDATORY — Wave 0)
- **Architecture Plan**: .plans/project/2026-06-10-163053-architecture-proprietary-license.md
- **Task**: Produce test specifications for the license labeling workstream. Tests must validate:
  1. LICENSE file exists at repo root with correct proprietary text
  2. THIRD-PARTY-NOTICES.md exists with correct content
  3. All .py files have copyright header as first non-shebang line
  4. All .ps1 files have copyright header at line 1
  5. All .sh files have copyright header after shebang line
  6. All .yml workflow files have copyright header at line 1
  7. No .json files are modified (no comment syntax)
  8. No .md documentation files have headers added
  9. No .agent.md / .instructions.md / .prompt.md frontmatter is broken
  10. Shell scripts retain shebang as line 1
- **Output**: `.test-specs/project/2026-06-10-infra-license-test-spec.md`
- **CRITICAL**: These specs are REQUIRED by @infra-lead. Lead CANNOT proceed past Gate 2.5 without them.
```

### Payload: License Labeling → @infra-lead
```
## Architect Handshake
- **Architecture Plan**: .plans/project/2026-06-10-163053-architecture-proprietary-license.md
- **Launch Plan**: .plans/project/2026-06-10-163053-launch-plan-proprietary-license.md
- **Execution Mode**: sequential
- **Workstream Brief**: See below
- **Delegation Protocol**: .plans/template/2026-04-09-180237-strict-delegation-protocol.md
- **Required Acknowledgment**: Lead MUST confirm:
  1. It has read the architecture plan
  2. It has read the delegation protocol
  3. It will follow the 7-Gate mandatory sequence
  4. It will present its execution plan to the human before starting
  5. It acknowledges its execution mode and wave assignment

---
## Workstream: License Labeling — @infra-lead
**Architecture Reference**: `.plans/project/2026-06-10-163053-architecture-proprietary-license.md`
**Launch Plan Reference**: `.plans/project/2026-06-10-163053-launch-plan-proprietary-license.md`

### Execution Context
- **Mode**: sequential
- **Wave**: 1 of 1 (after Wave 0 test specs)
- **Parallel peers**: none
- **Prerequisites**: Wave 0 (test-lead) must complete first
- **Codespace/Session**: sequential — single session
- **Sync point**: Merge to main after completion

### Context
The agentic-vibe-coding template needs a proprietary license from Mobius Logic, Inc. A code audit confirmed zero inherited open-source obligations. All source code is original. This workstream adds the LICENSE file, copyright headers, and third-party notices.

### Scope
- Create LICENSE file (proprietary, all rights reserved)
- Create THIRD-PARTY-NOTICES.md (attribution for referenced components)
- Add copyright headers to all .py, .ps1, .sh, .yml source files
- Validate no behavioral changes

### Tasks
1. Create branch `chore/infra/proprietary-license`
2. Create `LICENSE` file with Mobius Logic proprietary text (exact text in architecture plan)
3. Create `THIRD-PARTY-NOTICES.md` with attribution text (exact text in architecture plan)
4. Add copyright headers to: `_edit_script.py`, `scripts/init-project.ps1`, `scripts/sync-template.ps1`, `scripts/init-project.sh` (after shebang), `scripts/sync-template.sh` (after shebang), `.github/workflows/mirror-to-azdo.yml`, `.github/workflows/sync-template.yml`, `pipelines/azdo/sync-template.yml`
5. Verify no JSON, markdown, or frontmatter files are modified

### Technical Decisions (from architecture)
- Header format per language specified in architecture plan
- Shell scripts: header goes AFTER shebang line
- JSON files: no headers (no comment syntax)
- .agent.md/.instructions.md/.prompt.md: no headers (frontmatter would break)

### Dependencies
- Depends on: Wave 0 test specs
- Depended on by: None

### Interfaces
N/A — no API contracts or shared types.

### Out of Scope
- Modifying any application logic
- Adding headers to JSON or markdown files
- Changing YAML frontmatter in agent definition files
```

## Reproducibility Checksum
- **Plan Version**: 1
- **Prior Instances**: none
