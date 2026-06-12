# Access Control Export / Report System Contract V1

Date: 2026-06-11

## Purpose

This contract defines the Access Control export/report/snapshot ownership lane.

This lane is separate from:

- completed small square-chip migration
- parked Lock Power visual/status lane
- parked Fail Safe complex status lane
- Scope Planner special path

## Current Decision

Access Control export/report work is classified as:

```text
ACCESS_CONTROL_EXPORT_REPORT_SYSTEM_CONTRACT_NEEDED
SHARED_OUTPUT_SHELL_READY_OR_PARTIAL
PREVIEW_PRINT_MODE_SAFE_TO_AUDIT
ROUTE_OVERRIDE_KEEP_REVIEW
EXPORT_STATUS_KEEP_SEPARATE
REPORT_VISUAL_FACTORY_READY_TO_AUDIT
EXPORT_PAYLOAD_PROOF_GAP_REVIEW
SCOPE_PLANNER_SPECIAL_PATH_SKIPPED
NO_IMPLEMENTATION_PATCH_YET
```

This means:

- Do not patch export/report behavior yet.
- Do not remove route overrides until each tool-specific export adapter is classified.
- Do not merge export status controls into report content.
- Do not touch hidden result ledgers or carry-forward state.
- Do not touch Scope Planner with normal calculator export logic.
- Do not change auth, checkout, pipeline, snapshot, or Knowledge Base behavior.
- Future auto-fix should only target explicit `SAFE_FIX` buckets.

## In Scope

- Shared output shell ownership.
- Preview/print mode ownership.
- Route override adapters.
- Export status boundaries.
- Report visual factory ownership.
- Export/snapshot payload proof.
- Payload proof gaps.
- Scope Planner special-path skip.

## Out of Scope

- Status chip migration.
- Lock Power visual/status implementation.
- Fail Safe complex status implementation.
- Scope Planner rebuild.
- Product tier/auth/checkout logic.
- Calculation logic.
- Pipeline behavior.
- Knowledge Base behavior.
- Hidden result ledger or carry-forward rewrites.

## Required Audit

Use:

```powershell
node .\scripts\audit-access-control-export-report-system-rollup-0611.js
node .\scripts\audit-access-control-export-report-system-rollup-0611.js --details
```

Expected markers:

```text
SHARED_OUTPUT_SHELL_READY_OR_PARTIAL
PREVIEW_PRINT_MODE_SAFE_TO_AUDIT
ROUTE_OVERRIDE_KEEP_REVIEW
EXPORT_STATUS_KEEP_SEPARATE
REPORT_VISUAL_FACTORY_READY_TO_AUDIT
EXPORT_PAYLOAD_PROOF_GAP_REVIEW
SCOPE_PLANNER_SPECIAL_PATH_SKIPPED
NO_IMPLEMENTATION_PATCH_YET
OVERALL: PASS
```

## Future Buckets

Possible future states:

```text
EXPORT_REPORT_SYSTEM_DOCUMENTED
EXPORT_REPORT_SAFE_FIX_READY
EXPORT_REPORT_DRY_RUN_READY
EXPORT_REPORT_SAFE_FIX_APPLIED
SHARED_OUTPUT_SHELL_READY
SHARED_OUTPUT_SHELL_PARTIAL_REVIEW
ROUTE_OVERRIDE_KEEP_REVIEW
PREVIEW_PRINT_MODE_SAFE
REPORT_VISUAL_FACTORY_READY
REPORT_VISUAL_OWNER_SAFE
EXPORT_PAYLOAD_PROOF_GAP_REVIEW
EXPORT_STATUS_KEEP_SEPARATE
LEDGER_AND_CARRY_FORWARD_KEEP_SEPARATE
SCOPE_PLANNER_SPECIAL_PATH_SKIPPED
AUTH_CHECKOUT_PIPELINE_KB_UNTOUCHED
```

## Auto-Fix Rule

Auto-fix is allowed only when an audit classifies a target as `SAFE_FIX`.

Examples of likely safe future fixes:

- missing evidence markers
- known cache-bust mismatch
- known repeated shared shell marker
- proven duplicated generic export/report markup
- documentation rollup updates

Examples that must stay `KEEP_REVIEW`:

- route override adapters
- preview/print override behavior
- export status controls
- payload proof gaps
- report visual ownership
- hidden result ledgers
- carry-forward state
- Scope Planner special path

## Main-Gate Promotion Rule

Do not promote export/report checks into main gates until:

1. The contract is stable.
2. The rollup audit is stable.
3. Dry-run fixer exists for `SAFE_FIX` only.
4. Export/snapshot output is visually verified.
5. No calculations changed.
6. No auth, checkout, pipeline, hidden ledgers, carry-forward, or KB behavior changed.
7. Compact verifier remains clean.
