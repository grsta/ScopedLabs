# Access Control Fail Safe / Fail Secure Complex Status Contract V1

Date: 2026-06-11

## Purpose

This contract keeps the Fail Safe / Fail Secure status system separate from the completed Access Control small square-chip migration and separate from the parked Lock Power visual/status lane.

Fail Safe is a complex status system because it can include:

- lock behavior state
- power-loss behavior
- fire alarm / emergency release context
- egress and life-safety context
- diagram / legend / state visuals
- export status controls
- hidden result ledger / carry-forward state

## Current Decision

Fail Safe is classified as:

```text
FAIL_SAFE_COMPLEX_STATUS_CONTRACT_NEEDED
KEEP_FAIL_SAFE_LOCAL_UNTIL_CONTRACTED
DIAGRAM_AND_LEGEND_REVIEW_BEFORE_SHARED_HELPER
```

This means:

- Do not treat Fail Safe as a small square-chip cleanup target.
- Do not merge it into Lock Power visual-chip work.
- Do not remove local status, legend, diagram, or result styles without a dedicated audit.
- Do not change calculations or decision logic as part of visual cleanup.
- Do not touch export status controls unless the export route is separately audited.
- Do not touch hidden result ledgers, carry-forward state, auth, checkout, pipeline, snapshot, or Knowledge Base behavior.

## Boundaries

### In scope

- Audit Fail Safe status classes and local status rendering.
- Audit diagram, legend, and state visual selectors.
- Audit export status boundaries.
- Audit hidden result ledger / carry-forward boundaries.
- Decide later whether a dedicated shared helper is needed.

### Out of scope

- Completed small square-chip migration.
- Parked Lock Power visual/status lane.
- Scope Planner special path.
- Product tier/auth/checkout behavior.
- Calculation formula changes.
- Pipeline order changes.
- Knowledge Base behavior changes.

## Required Audit

Use:

```powershell
node .\scripts\audit-access-control-fail-safe-complex-status-0611.js
node .\scripts\audit-access-control-fail-safe-complex-status-0611.js --details
```

Expected decision markers:

```text
FAIL_SAFE_COMPLEX_STATUS_CONTRACT_NEEDED
KEEP_FAIL_SAFE_LOCAL_UNTIL_CONTRACTED
DIAGRAM_AND_LEGEND_REVIEW_BEFORE_SHARED_HELPER
OVERALL: PASS
```

A WATCH state is acceptable while the status/diagram/legend ownership is documented and intentionally deferred.

## Future Buckets

Possible future states:

```text
FAIL_SAFE_COMPLEX_STATUS_CONTRACT_NEEDED
FAIL_SAFE_COMPLEX_STATUS_DOCUMENTED
FAIL_SAFE_STATUS_PATH_LOCAL_REVIEW
FAIL_SAFE_DIAGRAM_LEGEND_LOCAL_REVIEW
FAIL_SAFE_SHARED_STATUS_HELPER_READY
FAIL_SAFE_SHARED_STATUS_HELPER_MIGRATED
FAIL_SAFE_EXPORT_STATUS_KEEP_SEPARATE
FAIL_SAFE_LEDGER_AND_CARRY_FORWARD_KEEP_SEPARATE
FAIL_SAFE_AUTH_CHECKOUT_PIPELINE_KB_UNTOUCHED
```

## Main-Gate Promotion Rule

Do not promote Fail Safe complex status checks into main gates until:

1. The contract is stable.
2. Status, legend, and diagram ownership are understood.
3. A shared helper decision is complete.
4. Export/snapshot output is visually verified.
5. No calculations are changed.
6. No auth, checkout, pipeline, ledgers, carry-forward, or Knowledge Base behavior changed.


## Parked-State Checkpoint

Date: 2026-06-11

Fail Safe / Fail Secure is parked cleanly for now.

Current state:

```text
FAIL_SAFE_STATUS_PATH_LOCAL_REVIEW
FAIL_SAFE_DIAGRAM_LEGEND_LOCAL_REVIEW
FAIL_SAFE_SHARED_HELPER_NOT_READY
FAIL_SAFE_NO_IMPLEMENTATION_PATCH_YET
FAIL_SAFE_COMPLEX_LOCAL_OWNERSHIP_REVIEW
```

This means:

- The status/recommendation path remains local and intentionally under review.
- Diagram, legend, and state visuals remain local and intentionally under review.
- A shared helper is not ready yet.
- No implementation patch is needed yet.
- Export status controls remain separate.
- Hidden result ledgers and carry-forward state remain untouched.
- Auth, checkout, pipeline, export, snapshot, and Knowledge Base behavior remain untouched.
- The completed small square-chip migration remains separate.
- The parked Lock Power visual/status lane remains separate.
