# Access Control Lock Power Visual Chip Contract V1

Date: 2026-06-11

## Purpose

This contract keeps the Lock Power Budget visual chip/status treatment separate from the completed Access Control small square status-chip migration.

Lock Power is not part of the four migrated small-chip tools:

- reader-type-selector
- panel-capacity
- access-level-sizing
- credential-format

Lock Power remains a separate visual-chip lane because its status language is tied to power budget, supply/load state, rail/visual indicators, and tool-specific analysis.

## Current Decision

Lock Power Budget is classified as:

```text
LOCK_POWER_VISUAL_CHIP_CONTRACT_NEEDED
```

This means:

- Do not fold Lock Power into the generic small square-chip cleanup by default.
- Do not reuse the small-chip migration rules unless the Lock Power visual/status behavior is inspected separately.
- Do not touch Fail Safe’s complex status system as part of this lane.
- Do not touch export status controls.
- Do not touch hidden result ledgers, carry-forward state, auth, checkout, pipeline, export, snapshot, or Knowledge Base behavior.

## Boundaries

### In scope

- Audit Lock Power local visual/status selectors.
- Decide whether Lock Power needs a shared visual-chip helper.
- Preserve engineering-style rectangular/square chip direction if a shared helper is later built.
- Keep wording specific to power budget and rail/load conditions.

### Out of scope

- Fail Safe / Fail Secure complex status and diagram legend.
- Export status controls such as `#exportStatus` or `.export-status`.
- Scope Planner special path.
- The completed small square-chip migration lane.
- Any product tier/auth/checkout behavior.
- Any calculation formula changes.

## Required Audit

The audit for this lane is:

```powershell
node .\scripts\audit-access-control-lock-power-visual-chip-0611.js
node .\scripts\audit-access-control-lock-power-visual-chip-0611.js --details
```

Expected decision marker:

```text
LOCK_POWER_VISUAL_CHIP_CONTRACT_NEEDED
OVERALL: PASS
```

## Future Implementation Rule

If Lock Power gets a shared helper later, it should be created as a dedicated visual-chip/status module, not as a hidden edit inside the old small-chip migration work.

Possible future buckets:

```text
LOCK_POWER_VISUAL_CHIP_CONTRACT_NEEDED
LOCK_POWER_SHARED_VISUAL_CHIP_READY
LOCK_POWER_SHARED_VISUAL_CHIP_MIGRATED
LOCK_POWER_LOCAL_VISUAL_CSS_REMOVED
LOCK_POWER_EXPORT_STATUS_UNTOUCHED
LOCK_POWER_LEDGER_UNTOUCHED
```

## Main-Gate Promotion Rule

Do not promote Lock Power visual-chip checks into main gates until:

1. The contract is stable.
2. The visual chip/helper implementation exists.
3. Export/snapshot behavior is visually verified.
4. The compact verifier remains clean.
5. No auth, checkout, pipeline, ledgers, or Knowledge Base behavior changed.


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
