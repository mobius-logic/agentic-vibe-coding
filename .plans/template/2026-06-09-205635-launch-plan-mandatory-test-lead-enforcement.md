# Launch Plan: Mandatory Test-Lead Enforcement & Plan-Compliance Testing

- **Date**: 2026-06-09 20:56:35
- **Architecture Reference**: .plans/template/2026-06-09-205635-architecture-mandatory-test-lead-enforcement.md
- **Feature Fingerprint**: mandatory-test-lead-enforcement
- **Execution Mode**: sequential
- **Available Slots**: 1 (local VS Code)
- **Total Workstreams**: 1
- **Total Waves**: 1

## Dependency Graph

All changes modify interconnected template infrastructure files (agent definitions, project-wide instructions, documentation). Single cohesive workstream.

`
[single workstream: template-infra] — no external dependencies
`

## Execution Schedule

### Wave 1 — Template Infrastructure: Test Enforcement

- **Parallel slots used**: 1
- **Workstreams**:
  - template-infra → @infra-lead [session #1]
- **Sync point**: All changes committed on feature branch, PR ready

## Sequential Fallback Order

1. template-infra → @infra-lead

## Delegation Payloads

### Payload: Template Infrastructure — Test Enforcement → @infra-lead

```
## Architect Handshake
- **Architecture Plan**: .plans/template/2026-06-09-205635-architecture-mandatory-test-lead-enforcement.md
- **Launch Plan**: .plans/template/2026-06-09-205635-launch-plan-mandatory-test-lead-enforcement.md
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
## Workstream: Template Infrastructure — Test Enforcement → @infra-lead
**Architecture Reference**: .plans/template/2026-06-09-205635-architecture-mandatory-test-lead-enforcement.md
**Launch Plan Reference**: .plans/template/2026-06-09-205635-launch-plan-mandatory-test-lead-enforcement.md

### Execution Context
- **Mode**: sequential
- **Wave**: 1 of 1
- **Parallel peers**: none
- **Prerequisites**: none
- **Codespace/Session**: sequential — single local VS Code session
- **Sync point**: All changes committed on feature branch

### Context
The template's testing workflow is broken — test-lead invocation is advisory, Gate 2.5 has a soft fallback that allows leads to skip plan-based testing, and the tester agent treats code and specs as co-equal inputs. This results in tests that validate implementation correctness rather than plan compliance. The fix makes test-lead invocation mandatory, removes all fallbacks, and reframes the tester as a plan-compliance validator.

### Scope
All changes to agent definitions (.github/agents/), copilot-instructions.md, and TEMPLATE-GUIDE.md.

### Tasks

#### Task 1: Modify architect.agent.md — Add Phase 5.5 (Mandatory Test-Lead Invocation)

Add a new "Phase 5.5: Test-Lead Invocation (MANDATORY — Cannot Skip)" section between the current "Test Planning" section and Phase 6. The new section must:
- State that the architect MUST invoke test-lead BEFORE delegating to any workstream lead
- In automatic delegation: invoke test-lead first, wait for completion
- In manual delegation: instruct human that test-lead MUST run first, leads will BLOCK without specs
- Include the test-lead invocation payload template
- Update Phase 6 to verify test specs exist before delegating to leads
- Update the Launch Plan template to include "Wave 0 — Test Specifications" as a mandatory prerequisite

Remove the existing "Test Planning (Parallel with Development)" section and replace it with the new mandatory Phase 5.5 that positions test-lead as Wave 0 (before development, not parallel to it).

**Acceptance Criteria**: 
- Phase 5.5 exists with MANDATORY language
- No "remind" or "optional" language remains for test-lead invocation
- Launch Plan template includes Wave 0 for test-lead
- Phase 6 includes a check that test specs exist before delegating

#### Task 2: Modify all three lead agents — Harden Gate 2.5 and Gate 3

In ackend-lead.agent.md, rontend-lead.agent.md, infra-lead.agent.md:

**Gate 2.5 changes** (remove ALL fallback language):
- Remove: "Fallback: If test-lead has not produced specs yet, proceed using developer's 'Suggested Tests' as fallback input for @tester"
- Replace with HARD BLOCK behavior:
  - If specs don't exist: emit locked event, inform human, STOP and WAIT
  - Explicit statement: "NO FALLBACK — do NOT proceed with developer's suggested tests"
  - Must re-check .test-specs/ before proceeding after human confirms

**Gate 3 changes** (plan-compliance framing):
- Add "Plan Compliance Validation" to the gate title
- Require Test Specs Reference as MANDATORY (not optional) in the tester delegation payload
- Add to delegation payload: "Primary Directive: Write tests that verify the implementation matches the architect's plan"
- Add: "If tests fail, developer code DEVIATES from the plan — loop to Gate 2 for developer fix"
- Gate check must include: tester confirms all spec test cases were implemented

**Gate 6 changes**:
- Change "Test specs exist from @test-lead (or fallback documented)" to "Test specs from @test-lead EXIST (REQUIRED — no fallback)"
- Add: "ALL test cases from test spec implemented by @tester"

**Also update the @tester delegation payload template** in each lead to include:
- **Test Specs Reference** (marked as REQUIRED)
- **Primary Directive**: "Write tests that verify plan compliance. Test spec defines WHAT code must do."

**Acceptance Criteria**: 
- No fallback language remains in any lead agent file
- Gate 2.5 blocks with explicit instructions when specs missing
- Gate 3 includes plan-compliance language
- Gate 6 has no optional/fallback wording for test specs

#### Task 3: Modify tester.agent.md — Plan-Compliance Mission

Restructure the tester agent to be explicitly a plan-compliance validator:

1. Add new section at top (after YAML frontmatter): "## Primary Mission: Plan-Compliance Validation"
   - "Your job is to verify that the developer's implementation MATCHES what the architect planned"
   - "You are NOT just testing that code works — you are testing that it does what the PLAN says it should do"
   - "Test specs tell you WHAT to test. Implementation code tells you HOW to hook into it."
   - "If tests fail, the DEVELOPER deviated from the plan — not that your tests are wrong"

2. Update the "Approach" section to enforce strict ordering:
   - Step 1: Read delegation payload and plan reference
   - Step 2: Read the test-lead's test specification (FIRST — this defines WHAT to test)
   - Step 3: Write test stubs/outlines based PURELY on the spec (before reading implementation)
   - Step 4: THEN read implementation code to understand HOW to wire tests to actual code
   - Step 5: Complete test implementations — EVERY test case from spec MUST be covered
   - Step 6: Run the test suite
   - Step 7: Report with plan-compliance summary

3. Add new "Plan Compliance Summary" to the completion report:
   `
   ### Plan Compliance Summary
   | Spec Test Case | Implemented | Result |
   |---------------|-------------|--------|
   | <from spec>   | Yes/No      | Pass/Fail |
   
   - **Spec Coverage**: X of Y test cases from spec implemented
   - **All Spec Cases Covered**: Yes/No
   - **Plan Deviation Notes**: <cases where code doesn't match spec>
   `

4. Add HARD RULE: "If no test spec is provided in the Delegation Payload, REFUSE to proceed. Report back: 'Cannot write plan-compliance tests without a test specification from @test-lead.'"

5. Remove the fallback note: "If no test spec exists, fall back to developer's suggestions and the plan."

**Acceptance Criteria**:
- "Plan-Compliance Validation" section exists at top
- Strict ordering enforced (spec first, code second)
- Completion report includes plan compliance table
- Hard refusal without test spec
- No fallback language remains

#### Task 4: Modify copilot-instructions.md — Strengthen Test Requirements

In .github/copilot-instructions.md:

1. Replace the "Test-Lead Invocation (Mandatory)" section with stronger language:
   - "MUST be invoked BEFORE any workstream lead begins work"
   - "Architect MUST invoke test-lead as Wave 0 — prerequisite for all workstream waves"
   - "Leads CANNOT proceed past Gate 2.5 without test specs — there is NO fallback"
   - "Test failures mean DEVELOPER code deviates from the plan"

2. Update the gate table:
   - Gate 2.5: Change description to "Test-lead specs EXIST for workstream (NO FALLBACK — leads BLOCK if missing)"
   - Gate 3: Change to "Testing (Plan Compliance) | @tester returns 'ALL PASS' AND all spec cases covered"

3. Remove any "(or fallback documented)" language from the delegation rules

4. Add to "Code Quality" section: "All test specs from @test-lead must have corresponding test implementations that pass before merge"

**Acceptance Criteria**:
- No "fallback" or "optional" language for test specs anywhere in the file
- Gate table updated
- Plan-compliance language present

#### Task 5: Modify TEMPLATE-GUIDE.md — Update Test Planning Documentation

In TEMPLATE-GUIDE.md:

1. Update the "Test Planning Workflow" section:
   - Change "Parallel with Development" to "Before Development (Wave 0)"
   - State that test-lead runs BEFORE workstream leads, not alongside them
   - Clarify that leads BLOCK at Gate 2.5 without specs

2. Update the "Planning Workflow" section:
   - After architect produces Launch Plan, add: "Architect invokes @test-lead (Wave 0) — this MUST complete before any workstream lead starts"

3. Update the "Decision Cheat Sheet":
   - Add: "Lead says 'BLOCKED at Gate 2.5'" → "Invoke @test-lead with the architecture plan and workstream briefs"
   - Update: "Leads present execution plans" → "Architect has already invoked @test-lead (Wave 0). Specs should exist."

4. Update the "Orchestrator Runbook" Phase 0:
   - After architect approval, add step: "Confirm @test-lead has been invoked and specs exist in .test-specs/"

**Acceptance Criteria**:
- No "parallel with development" language for test-lead (it's Wave 0, before development)
- Clear instruction that test-lead is a prerequisite
- Decision cheat sheet updated with blocked scenario

### Technical Decisions
- All changes are markdown-only (agent definitions and documentation)
- No new files created — only modifications to existing files
- The .test-specs/ directory structure already exists
- Changes must be consistent across all three lead agents (backend, frontend, infra)

### Dependencies
- Depends on: None
- Depended on by: None (this is template infrastructure)

### Interfaces
- Existing .test-specs/ directory structure is unchanged
- Existing test-lead agent definition is only strengthened, not restructured
- Dashboard event locked type should be emitted by leads (dashboard already handles unknown event types gracefully)

### Out of Scope
- Creating new event types in the dashboard
- Modifying the test-lead agent's test spec output format
- Changes to the developer agent
- Changes to the code-reviewer agent
- Changes to the docs-writer agent
```

## Reproducibility Checksum

- **Architecture Hash**: (first plan for this feature)
- **Plan Version**: 1
- **Prior Instances**: none
