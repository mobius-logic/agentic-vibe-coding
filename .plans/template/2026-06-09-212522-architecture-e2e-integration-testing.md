# Architecture: End-to-End Integration Testing Requirement

- **Date**: 2026-06-09 21:25:22
- **Architect**: architect
- **Status**: approved
- **Feature Fingerprint**: e2e-integration-testing-requirement

## Feature Fingerprint

- **Canonical Name**: e2e-integration-testing-requirement
- **Aliases**: integration testing, end-to-end tests, e2e tests, full stack tests, acceptance tests
- **Category**: template infrastructure

## Project Summary

The template's testing workflow currently has unit tests and "integration tests" at the API-contract level, but lacks a mandatory end-to-end integration testing phase that:
1. Installs all prerequisites and dependencies
2. Sets up the full runtime environment
3. Runs complete user-flow scenarios derived from the architect's plan
4. Validates that the entire feature works as a cohesive whole (not just individual modules)

This change adds a mandatory **Gate 3.5: Integration Testing** that runs after unit/component tests pass (Gate 3) and before code review (Gate 4). It also strengthens the test-lead's specs and tester's implementation to explicitly produce runnable integration test suites.

## Design

### Integration Testing Philosophy

1. **Prefer local execution** — integration tests should run on the developer's machine (or the Codespace) without requiring CI/CD infrastructure. Only fall back to CI pipelines if the tests require infrastructure that cannot be simulated locally (e.g., production database clusters, third-party webhooks).

2. **Plan-derived scenarios** — integration test cases come from the architect's plan (user flows, API workflows, data pipelines), NOT from implementation details. They validate the feature works end-to-end as the plan specifies.

3. **Self-contained setup** — each integration test suite must include setup/teardown steps that install prerequisites, seed data, start services, and clean up. No manual environment preparation should be required.

4. **Failed integration tests trigger lead revisit** — unlike unit test failures (which loop developer → tester), integration test failures are escalated to the lead with human-in-the-loop approval before re-entering the fix cycle.

### Change 1: Test-Lead — Add End-to-End Integration Test Section

**File**: .github/agents/test-lead.agent.md

Add to Phase 2 a new step and update the output format:

`markdown
### Phase 2 additions:
5. **End-to-End Integration Tests**: Define complete user-flow scenarios that exercise the full feature as specified in the architect's plan. For each scenario:
   - Prerequisites (services, databases, external dependencies)
   - Environment setup steps (install commands, config, seed data)
   - Step-by-step user actions (the complete flow from the plan)
   - Expected end state (database state, API responses, UI state, side effects)
   - Teardown steps
   - **Execution preference**: Local (preferred) or CI-required (justify why)
`

Add to the test spec output format a new section:

`markdown
## End-to-End Integration Tests

### Scenario: <user-flow-name-from-plan>
- **Prerequisites**: <services, databases, tools that must be running>
- **Setup**:
  1. <install command or setup step>
  2. <seed data or config>
  3. <start dependent services>
- **Steps**:
  1. <user action / API call / trigger>
  2. <next step in the flow>
  3. ...
- **Expected End State**:
  - <assertion about final state>
  - <assertion about side effects>
- **Teardown**:
  1. <cleanup step>
- **Execution**: Local / CI-required (reason: <why CI is needed if applicable>)
- **Timeout**: <max duration before test is considered failed>

### Scenario: <next-scenario>
...
`

### Change 2: Tester Agent — Integration Test Implementation

**File**: .github/agents/tester.agent.md

Add a new section after the approach steps covering integration test implementation:

`markdown
## Integration Test Implementation

When the test spec includes "End-to-End Integration Tests", you MUST implement them as runnable test suites:

### Local Execution (Preferred)
1. Create a dedicated integration test directory (e.g., 	ests/integration/ or 	est/e2e/)
2. Include a setup script or test fixture that:
   - Installs/verifies prerequisites (check for required tools, install packages)
   - Starts required services (use docker-compose, local servers, mocks)
   - Seeds test data
3. Implement each scenario as a test case that:
   - Follows the exact steps from the spec
   - Asserts the expected end state
   - Is idempotent (can run multiple times without side effects)
4. Include teardown that cleans up all resources

### CI Pipeline (Only When Local Is Not Feasible)
If a test requires infrastructure that cannot run locally (document WHY), create:
- A CI workflow file (.github/workflows/integration-tests.yml or equivalent)
- Clear documentation of what CI resources are needed
- The workflow must be triggerable both manually and on PR

### Integration Test Conventions
- Integration tests MUST be tagged/labeled so they can be run separately from unit tests
- Use a separate test command (e.g., 
pm run test:integration, pytest tests/integration/, go test -tags=integration ./...)
- Integration tests may have longer timeouts than unit tests
- Each test must be independent — no ordering dependencies between scenarios
`

### Change 3: Lead Agents — Add Gate 3.5 (Integration Testing)

**Files**: ackend-lead.agent.md, rontend-lead.agent.md, infra-lead.agent.md

Add a new gate between Gate 3 and Gate 4:

`markdown
#### GATE 3.5: Integration Testing — End-to-End Plan Validation (MANDATORY if spec includes e2e tests)
- Check the test spec for "End-to-End Integration Tests" section
- If the section exists (it should for any non-trivial feature):
  1. Invoke @tester with a SECOND delegation specifically for integration tests:
     - **Task**: "Implement and run end-to-end integration tests from the test spec. Install all prerequisites, set up the environment, run full user-flow scenarios, and validate the feature works as the architect planned."
     - **Test Specs Reference**: same spec file, but focus on the "End-to-End Integration Tests" section
     - **Primary Directive**: "These tests validate the COMPLETE feature works end-to-end as planned. Set up the full environment locally. If local execution is not possible for a scenario, create a CI workflow."
     - **Acceptance Criteria**: ALL e2e scenarios from the spec pass locally (or CI workflow created and documented for CI-required scenarios)
  2. **Read the tester's completion report** for integration tests
  3. **Gate check**: ALL integration test scenarios pass
  4. 🛑 **If integration tests fail**:
     - This indicates a systemic issue — not just a single module deviation
     - Emit event: 
ode dashboard/lib/emit-event.js <lead> integration-test-failure --detail "E2E scenario '<name>' failed: <brief reason>" --workstream <workstream>
     - **Report to human**: "Integration tests failed. Scenario '<name>' did not produce expected end state. This may require architectural revision or cross-module fixes."
     - **With human approval**: Loop back to GATE 2 with specific fix instructions for @developer. After fix, re-run GATE 3 (unit tests) AND GATE 3.5 (integration tests).
     - Do NOT skip integration re-validation after fixes.
- If no e2e section exists in the spec (trivial feature): Document in Gate 6 checklist that integration tests were not applicable and why.
`

Update Gate 6 checklist to include:
`markdown
- [ ] Integration tests pass (Gate 3.5) OR documented as not applicable with justification
`

### Change 4: copilot-instructions.md — Document Integration Testing

Add to the testing section:

`markdown
### Integration Testing (MANDATORY for Non-Trivial Features)
- Test-lead specs MUST include end-to-end integration test scenarios for any feature that spans multiple modules or has user-facing workflows
- Integration tests MUST be implementable and runnable locally (preferred) or via CI pipeline (justified)
- Integration tests validate the COMPLETE feature works as the architect planned — not just individual modules
- Failed integration tests are escalated to the lead with human-in-the-loop approval before re-entering the fix cycle
- Gate 3.5 is MANDATORY when the test spec includes e2e scenarios — cannot be skipped
- Integration test failures may indicate architectural issues — leads must assess whether the plan itself needs revision
`

### Change 5: TEMPLATE-GUIDE.md — Document Integration Testing

Update the testing workflow documentation to mention:
- Integration tests exist as a separate gate (3.5)
- They run locally by default
- Failed integration tests escalate to the lead + human

### Change 6: Architect Plan Template — Include Integration Scenarios

**File**: .github/agents/architect.agent.md

In the architecture document template (Phase 3), add to the "Test Specifications" section:

`markdown
### End-to-End Integration Test Scenarios
<Complete user flows that exercise the full feature across all components>
| Scenario | Components Involved | User Steps | Expected Outcome |
|----------|-------------------|------------|------------------|
| <name>   | <list>            | <steps>    | <outcome>        |
`

## Expected Output Manifest

| File | Changes |
|------|---------|
| .github/agents/test-lead.agent.md | Add e2e integration test section to Phase 2 and output format |
| .github/agents/tester.agent.md | Add "Integration Test Implementation" section with local/CI guidance |
| .github/agents/backend-lead.agent.md | Add Gate 3.5 (Integration Testing) |
| .github/agents/frontend-lead.agent.md | Add Gate 3.5 (Integration Testing) |
| .github/agents/infra-lead.agent.md | Add Gate 3.5 (Integration Testing) |
| .github/agents/architect.agent.md | Add e2e integration scenarios to architecture template |
| .github/copilot-instructions.md | Add Integration Testing section |
| TEMPLATE-GUIDE.md | Document integration testing workflow |

## Approval
- Approved by: human user
- Approved at: 2026-06-09 21:25:22
