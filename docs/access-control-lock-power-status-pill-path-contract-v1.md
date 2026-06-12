# Access Control Lock Power Status-Pill Path Contract V1

Date: 2026-06-11

## Purpose

This contract documents the generated Lock Power Budget status-pill path:

```text
status-pill ${statusClass}
```

This path is separate from the completed Access Control small square status-chip migration and separate from the Lock Power CAD rail visual.

## Current Decision

Lock Power currently remains:

```text
LOCK_POWER_STATUS_PILL_PATH_LOCAL_REVIEW
```

This means:

- The generated `status-pill ${statusClass}` path is acknowledged and tracked.
- It should not be folded into the completed small square-chip migration.
- It should not be removed just because local pill CSS was removed elsewhere.
- It may later become part of a dedicated `LockPowerVisualChipModule`, but only after inspection.
- Export status, ledgers, carry-forward state, auth, checkout, pipeline, export, snapshot, and Knowledge Base behavior must remain untouched.

## Known Related Pieces

The Lock Power lane currently includes:

```text
.access-lock-power-visual-chip
.access-lock-power-cad-rail
.access-lock-power-cad-rail-wrap
.status-pill ${statusClass}
.export-status
.access-lock-power-ledger-results
```

The visual chip is already rectangular / engineering-style. The CAD rail and ledger styles remain local. The generated status-pill path is the remaining review item.

## Required Audit

Use:

```powershell
node .\scripts\audit-access-control-lock-power-status-pill-path-0611.js
node .\scripts\audit-access-control-lock-power-status-pill-path-0611.js --details
```

Expected non-blocking outcome:

```text
OVERALL: PASS WITH WATCH
```

The WATCH state is acceptable while the path is documented and intentionally deferred.

## Future Buckets

Possible future states:

```text
LOCK_POWER_STATUS_PILL_PATH_LOCAL_REVIEW
LOCK_POWER_STATUS_PILL_PATH_DOCUMENTED
LOCK_POWER_STATUS_PILL_PATH_SHARED_HELPER_READY
LOCK_POWER_STATUS_PILL_PATH_MIGRATED
LOCK_POWER_VISUAL_CHIP_LOCAL_OWNERSHIP_PRESERVED
LOCK_POWER_EXPORT_STATUS_KEEP_SEPARATE
LOCK_POWER_LEDGER_KEEP_SEPARATE
FAIL_SAFE_COMPLEX_STATUS_UNTOUCHED
```

## Main-Gate Promotion Rule

Do not promote this path into main gates until:

1. The status-pill path is stable.
2. The visual/helper decision is complete.
3. The export/snapshot output is visually verified.
4. No calculations are changed.
5. No auth, checkout, pipeline, ledgers, carry-forward, or Knowledge Base behavior changed.


## Parked-State Checkpoint

Date: 2026-06-11

Lock Power is parked cleanly for now.

Current state:

```text
LOCK_POWER_VISUAL_CHIP_ALREADY_RECTANGULAR
LOCK_POWER_STATUS_PILL_PATH_DOCUMENTED_LOCAL_REVIEW
LOCK_POWER_NO_IMPLEMENTATION_REQUIRED_YET
LOCK_POWER_FUTURE_HELPER_OPTIONAL
```

This means:

- The visible Lock Power visual chip is already rectangular / engineering-style.
- The generated `status-pill ${statusClass}` path is documented and intentionally left local for review.
- No shared helper is required yet.
- A future `LockPowerVisualChipModule` remains optional, not mandatory.
- CAD rail visuals remain local.
- Export status controls remain separate.
- Hidden result ledgers and carry-forward state remain untouched.
- Fail Safe’s complex status system remains deferred and untouched.
