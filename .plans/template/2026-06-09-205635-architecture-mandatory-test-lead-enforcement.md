# Architecture: Mandatory Test-Lead Enforcement & Plan-Compliance Testing

- **Date**: 2026-06-09 20:56:35
- **Architect**: architect
- **Status**: approved
- **Feature Fingerprint**: mandatory-test-lead-enforcement

## Feature Fingerprint

- **Canonical Name**: mandatory-test-lead-enforcement
- **Aliases**: test enforcement, mandatory testing, plan-compliance tests, test-lead hard gate
- **Category**: template infrastructure

## Project Summary

The current template allows leads to bypass plan-based testing via a soft fallback at Gate 2.5. The architect only "reminds" about test-lead invocation rather than mandating it. This results in tests being written based on developer code rather than the architect's plan — defeating the purpose of plan-compliance validation. This change:

1. Makes test-lead invocation a HARD REQUIREMENT by the architect before any workstream delegation
2. Removes the soft fallback at Gate 2.5 — test specs MUST exist
3. Reframes the tester agent's mission as "plan-compliance validation" — tests verify code matches the plan
4. Strengthens Gate 3 and Gate 6 to block commits without plan-based test specs
5. Establishes a clear branching/invocation strategy for test-spec integration

## Architecture Style

Template infrastructure change — modifies agent behavior definitions, gated workflow, and project-wide instructions.

## Problem Analysis

### Current State (Broken)
`
Architect saves plan → "reminds" human about test-lead → delegates to leads
Leads start working → Gate 2.5: "Do test specs exist? No? → FALLBACK: use developer suggestions"
Tester writes tests based on developer code → tests pass → but code may not match plan
`

### Issues
1. **Architect doesn't mandate test-lead** — it's advisory ("remind the human")
2. **Gate 2.5 fallback defeats the purpose** — "proceed using developer's Suggested Tests" means tests validate implementation, not plan
3. **Tester reads code first** — current instructions say "read the plan, read the test spec, AND the implementation code" without priority ordering
4. **No hard blocker** — leads can complete all 7 gates without test specs ever existing

### Desired State (Fixed)
`
Architect saves plan → MUST invoke test-lead (hard requirement) → test-lead produces specs
THEN architect delegates to leads (test specs already exist in .test-specs/)
Leads at Gate 2.5: specs MUST exist → no fallback, BLOCK if missing
Tester at Gate 3: writes tests FROM SPEC → validates code matches plan → tests must pass
`

## Design

### Change 1: Architect — Mandatory Test-Lead Invocation

**File**: .github/agents/architect.agent.md

The current "Test Planning" section after Phase 5 says "remind the human (or invoke directly if delegating)". This must become a hard gate.

**New behavior**: Add a **Phase 5.5: Mandatory Test-Lead Invocation** between workstream decomposition (Phase 5) and delegation (Phase 6):

`markdown
### Phase 5.5: Test-Lead Invocation (MANDATORY — Cannot Skip)

After producing workstream briefs and BEFORE delegating to any lead, you MUST ensure test specifications exist:

1. **If delegating automatically (Phase 6)**: You MUST invoke @test-lead FIRST, before invoking any workstream lead. Wait for test-lead to complete and confirm specs were written to .test-specs/.
2. **If manual delegation**: You MUST instruct the human to invoke @test-lead FIRST, before pasting briefs to any lead. State clearly: "Test-lead MUST run first. Leads will BLOCK at Gate 2.5 if test specs don't exist."

The test-lead invocation payload:
`
## Test Lead Invocation (MANDATORY)
- **Architecture Plan**: <path to .plans/project/ architecture file>
- **Workstream Plans**: <all workstream briefs>
- **Task**: Produce test specifications for ALL workstreams. Tests must verify plan compliance — that code implements what the architecture specifies.
- **Output**: One test spec per workstream in .test-specs/project/
- **CRITICAL**: These specs define acceptance tests. Workstream leads CANNOT proceed past Gate 2.5 without them.
`

**HARD RULE**: The architect MUST NOT delegate to workstream leads until test-lead has been invoked (or the human has been given explicit blocking instructions). The Launch Plan MUST include test-lead as a prerequisite for all workstream waves.
`

**Launch Plan change**: Add test-lead as "Wave 0" in every Launch Plan:
`markdown
### Wave 0 — Test Specification (MANDATORY prerequisite for all waves)
- **Agent**: @test-lead
- **Input**: Architecture plan + all workstream briefs
- **Output**: Test specs in .test-specs/project/
- **Sync point**: ALL workstream waves are blocked until Wave 0 completes
`

### Change 2: Lead Agents — Remove Fallback, Hard Block at Gate 2.5

**Files**: ackend-lead.agent.md, rontend-lead.agent.md, infra-lead.agent.md

**Current Gate 2.5** (soft):
`
- Verify that test-lead specs exist
- Fallback: If test-lead has not produced specs yet, proceed using developer's "Suggested Tests"
`

**New Gate 2.5** (hard blocker):
`markdown
#### GATE 2.5: Test Spec Readiness (HARD BLOCKER — No Fallback)
- Check .test-specs/project/ (or .test-specs/template/) for a test spec covering this workstream
- Read the test spec to confirm it covers the implemented features
- **Gate check**: Test spec file exists AND covers this workstream's acceptance criteria
- 🛑 **If test specs do NOT exist**:
  1. Emit event: 
ode dashboard/lib/emit-event.js <lead> blocked --detail "Test specs missing — cannot proceed past Gate 2.5" --workstream <workstream>
  2. Inform the human: "BLOCKED: Test specifications from @test-lead do not exist for this workstream. I cannot proceed to Gate 3 (Testing). Please invoke @test-lead with the architecture plan to produce test specs, then tell me to continue."
  3. STOP and WAIT for human confirmation that test specs now exist
  4. Re-check .test-specs/ before proceeding
- ❌ **NO FALLBACK**: Do NOT proceed with developer's suggested tests. The purpose of plan-based testing is to verify code matches the plan, not to verify code works as the developer intended.
`

**Gate 3 update** — strengthen tester delegation:
`markdown
#### GATE 3: Testing (MANDATORY — Plan Compliance Validation)
- Invoke @tester with the Delegation Payload INCLUDING:
  - **Test Specs Reference** (REQUIRED, not optional): .test-specs/<context>/<date>-<workstream>-test-spec.md
  - **Primary Directive**: "Write tests that verify the implementation matches the architect's plan. The test spec defines WHAT the code must do. Your tests validate plan compliance."
  - **Acceptance Criteria**: ALL test cases from the test spec must be implemented and pass
- The tester's PRIMARY input is the test spec (what the plan requires)
- The tester's SECONDARY input is the implementation code (how to hook into it)
- Developer's "Suggested Tests" are informational only — they do NOT replace spec-based tests
- **Gate check**: Tester verdict is "ALL PASS" AND tester confirms all spec test cases were implemented
- 🛑 If tests fail: This means the developer's code DEVIATES from the plan. Loop to Gate 2 — developer must fix the code to match the plan (not the other way around)
`

**Gate 6 update** — remove optional language:
`markdown
#### GATE 6: Pre-Commit Checklist
- [ ] Test specs from @test-lead EXIST (REQUIRED — no fallback)
- [ ] ALL test cases from test spec are implemented by @tester
- [ ] All tests PASS (verdict: ALL PASS)
`

### Change 3: Tester Agent — Plan-Compliance Mission

**File**: .github/agents/tester.agent.md

Reframe the tester's primary mission. Current instructions treat test-lead specs and developer code as co-equal inputs. New instructions make the spec PRIMARY and the code SECONDARY.

**New opening section**:
`markdown
## Primary Mission: Plan-Compliance Validation

Your job is to verify that the developer's implementation MATCHES what the architect planned. You are NOT testing that the code "works" — you are testing that it does what the plan SAYS it should do.

- **Test specs** (from @test-lead) tell you WHAT to test — the expected behaviors from the plan
- **Implementation code** tells you HOW to test — the functions, endpoints, and interfaces to hook into
- If tests fail, it means the DEVELOPER deviated from the plan — not that your tests are wrong
`

**Updated workflow**:
`markdown
## Approach (STRICT ORDER)
1. Read the **Delegation Payload** and the referenced .plans/project/ file
2. Read the **test-lead's test specification** (FIRST — this defines WHAT to test)
3. Write test stubs/outlines based PURELY on the spec (before reading implementation)
4. THEN read the implementation code to understand HOW to wire the tests to actual code
5. Complete the test implementations — every test case from the spec MUST be covered
6. Run the test suite
7. Report results — explicitly state which spec test cases pass/fail
`

**New "Completion Report" requirement**:
`markdown
## Completion Report (MANDATORY fields)

### Plan Compliance Summary
| Spec Test Case | Implemented | Result |
|---------------|-------------|--------|
| <from spec>   | Yes/No      | Pass/Fail |

- **Spec Coverage**: X of Y test cases from spec implemented
- **All Spec Cases Covered**: Yes/No (must be "Yes" to pass Gate 3)
- **Verdict**: ALL PASS / FAILURES FOUND
- **Plan Deviation Notes**: <any cases where code behavior doesn't match spec expectations>
`

**Remove the fallback language**:
`markdown
> ~~Note: The test-lead specs are your PRIMARY input. Developer's "Suggested Tests" are SECONDARY.~~
> ~~If no test spec exists, fall back to developer's suggestions and the plan.~~

> **HARD RULE**: Test specs MUST exist. If no test spec is provided in the Delegation Payload, REFUSE to proceed and report back: "Cannot write plan-compliance tests without a test specification. Test-lead specs are required."
`

### Change 4: Branching & Merging Strategy

**The branching strategy for test integration**:

`
main
├── .test-specs/project/<date>-<workstream>-test-spec.md  ← written by test-lead (on main or committed early)
│
├── feature/backend/<name>   ← developer writes code here
│   └── tests/               ← tester writes plan-compliance tests HERE (same branch)
│
├── feature/frontend/<name>  ← developer writes code here
│   └── tests/               ← tester writes plan-compliance tests HERE (same branch)
│
└── feature/infra/<name>     ← developer writes code here
    └── tests/               ← tester writes plan-compliance tests HERE (same branch)
`

**Key points**:
1. Test specs (.test-specs/) are committed to main (or a shared location) BEFORE feature branches start
2. Each tester writes tests on the SAME feature branch as the developer — tests must be co-located with the code they validate
3. Tests must PASS on the feature branch before it can be merged to main
4. The merge to main is blocked until Gate 6 is fully satisfied (all tests pass, all spec cases covered)

**Why test specs go on main first**:
- Test-lead runs BEFORE development starts (Wave 0)
- Specs are plan-derived artifacts (like the architecture doc) — they belong in a shared location
- All feature branches can read specs from .test-specs/ without cross-branch dependencies
- If test-lead runs in a separate session, its output is committed to main directly (it's a spec doc, not code)

**Alternative for parallel execution** (when test-lead runs alongside Wave 1):
- Test-lead commits specs to a 	est-specs/<workstream> branch
- Leads at Gate 2.5 pull/merge from the test-specs branch
- OR: test-lead output is shared via .test-specs/ on main before leads start (preferred)

### Change 5: copilot-instructions.md — Strengthen Requirements

**File**: .github/copilot-instructions.md

Update the "Test-Lead Invocation (Mandatory)" section:

`markdown
### Test-Lead Invocation (MANDATORY — Hard Requirement)
- The @test-lead MUST be invoked BEFORE any workstream lead begins work
- The architect MUST invoke test-lead as "Wave 0" — a prerequisite for all workstream waves
- Test-lead produces specs to .test-specs/project/ that define plan-compliance test cases
- Leads CANNOT proceed past Gate 2.5 without test specs — there is NO fallback
- If test-lead has not been invoked, leads MUST BLOCK and request human action
- Tests written by @tester MUST cover ALL test cases defined in the spec
- Tests MUST PASS before any branch can be committed (Gate 6 hard requirement)
- Test failures mean the DEVELOPER code deviates from the plan — developer must fix code, not tester adjusting tests
`

Update the Strict Delegation Protocol table:

`markdown
| Gate | Required Action | Cannot Proceed Until |
|------|----------------|---------------------|
| 0 | Plan Approval | Human approves execution plan |
| 1 | Branch Creation | Feature branch exists |
| 2 | Implementation | @developer returns completion report |
| 2.5 | Test Spec Readiness | Test-lead specs EXIST for this workstream (NO FALLBACK) |
| 3 | Testing (Plan Compliance) | @tester returns "ALL PASS" AND all spec cases covered |
| 4 | Code Review | @code-reviewer returns "APPROVE" |
| 5 | Documentation | @docs-writer returns completion report |
| 6 | Pre-Commit Checklist | All checkboxes TRUE (test specs required, not optional) |
| 7 | Commit & Report | Session log written, events emitted |
`

### Change 6: TEMPLATE-GUIDE.md — Update Documentation

Update the "Test Planning Workflow" section to reflect the mandatory nature and remove "parallel with development" language (since test-lead is now Wave 0, BEFORE development).

## Expected Output Manifest

| File | Changes |
|------|---------|
| .github/agents/architect.agent.md | Add Phase 5.5 (mandatory test-lead invocation), update Phase 6 delegation to include test-lead as prerequisite |
| .github/agents/backend-lead.agent.md | Harden Gate 2.5 (remove fallback), strengthen Gate 3 (plan compliance), update Gate 6 checklist |
| .github/agents/frontend-lead.agent.md | Same as backend-lead |
| .github/agents/infra-lead.agent.md | Same as backend-lead |
| .github/agents/tester.agent.md | Add "Plan-Compliance Validation" mission, strict ordering (spec first), new completion report format, refuse without spec |
| .github/copilot-instructions.md | Strengthen test-lead section, update gate table, remove fallback language |
| TEMPLATE-GUIDE.md | Update test planning workflow documentation |

## Reproducibility Notes

- All changes are to markdown agent definition files — no runtime code changes
- The changes are backward-compatible with existing .test-specs/ directory structure
- No new dependencies or tools required
- The test-lead agent definition already exists — only behavioral strengthening needed
- All three lead agents share identical Gate 2.5/3/6 patterns — changes should be consistent across all three

## Approval
- Approved by: human user
- Approved at: 2026-06-09 20:56:35
