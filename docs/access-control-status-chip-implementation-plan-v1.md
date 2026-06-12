# Access Control Status Chip Implementation Plan V1

Date: 2026-06-11  
Category: Access Control  
Status: Planning / no live UI changes

## Purpose

This plan turns the Access Control Status Chip Contract V1 into a safe implementation path.

The goal is to make status chips consistent through a shared contract/module approach, without breaking export controls, carry-forward ledgers, auth, checkout, pipeline behavior, or future Gold tier expansion.

## Current Checkpoint

Current committed ecosystem:

- Main gates runner: `scripts/audit-access-control-main-gates-0610.js`
- Evidence suite runner: `scripts/audit-access-control-evidence-suite-0611.js`
- Contract doc: `docs/access-control-status-chip-contract-v1.md`
- Contract audit: `scripts/audit-access-control-status-chip-contract-0611.js`
- Status rendering map: `scripts/audit-access-control-status-rendering-map-0611.js`
- Status shared coverage audit: `scripts/audit-access-control-status-shared-coverage-0611.js`
- Reader Type status diff audit: `scripts/audit-access-control-reader-type-status-diff-0611.js`

Current expected command pair:

```powershell
node .\scripts\audit-access-control-main-gates-0610.js --summary-only
node .\scripts\audit-access-control-evidence-suite-0611.js
```

## Contract Buckets

The current contract audit classifies tools as:

- `LOCAL_ALIAS_NEEDED`
  - access-level-sizing
  - credential-format
  - panel-capacity
  - reader-type-selector

- `VISUAL_CHIP_REVIEW`
  - lock-power-budget

- `COMPLEX_STATUS_SYSTEM_KEEP`
  - fail-safe-fail-secure

- `EXPORT_STATUS_KEEP`
  - anti-passback-zones
  - door-cable-length
  - door-count-planner
  - elevator-reader-count
  - special-locking-scope

- `SPECIAL_PATH_SKIP`
  - scope-planner

## V1 Implementation Boundary

V1 should only target small decision/status chips.

V1 must not touch:

- `.export-status`
- `#exportStatus`
- hidden result cards
- `#results`
- `[data-result-ledger]`
- result carry-forward state
- export route adapters
- snapshot behavior
- auth flow
- checkout flow
- pipeline behavior
- Knowledge Base behavior
- Scope Planner
- Fail Safe full status/legend system
- Lock Power visual chip until inspected

## Shared Status Chip Standard

### Locked Visual Decision — Squared Engineering Chips

The V1 visual target is a squared / rectangular engineering status chip.

This is an intentional design direction. Older pill-shaped local status chips are legacy styling and should not be preserved as the future shared standard.

Reader Type is the closest current reference for the shared squared direction. Panel Capacity, Access Level, and Credential Format still contain older pill-style local chip CSS and should migrate toward the shared squared contract.

Rules:

- Do not preserve pill radius as the V1 target.
- Do not remove local chip CSS until shared square aliases are proven.
- Do not touch export status controls.
- Do not touch hidden result ledgers or carry-forward state.
- Do not touch auth, checkout, pipeline, Knowledge Base, snapshot, or export route behavior.
- Preserve hero placement behavior for Access Level and Credential Format.
- Leave Gold tier behavior inactive; only keep future-ready audit hooks.

The shared module should provide one consistent small-chip contract.

Recommended base class:

```css
.access-control-status-chip
```

Recommended state aliases:

```css
.is-safe
.is-healthy
.is-watch
.is-risk
.is-authority
.is-complete
```

Recommended page alias strategy:

```css
.reader-type-status-chip
.panel-capacity-status-chip
.access-level-status-chip
.credential-format-status-chip
```

These page aliases may map into the shared visual standard only after the exact final chip shape/state appearance is chosen.

## State Meaning

Recommended state meanings:

- `safe` / `healthy`: acceptable, usable, or recommended condition
- `watch`: valid but needs attention, review, or caution
- `risk`: warning, unsuitable, overloaded, or likely issue
- `authority`: authority/jurisdiction/AHJ-driven status
- `complete`: completed or resolved status

Aliases must be explicit. Do not assume `healthy` and `safe` are always identical unless the tool logic supports it.

## Gold Tier Future-Proofing

V1 must leave room for Gold without enabling Gold behavior yet.

Rules:

- Do not hard-code Free/Pro-only assumptions.
- Do not change Pro behavior.
- Do not add Gold-only UX or access behavior until product rules are defined.
- Keep tier hooks centralized in shared modules or audits.
- Add audit visibility for future tier hooks without making them fail today.

Future audit buckets may include:

- `GOLD_READY_PLACEHOLDER`
- `TIER_HOOK_REVIEW`
- `PRO_BEHAVIOR_PRESERVED`
- `AUTH_CHECKOUT_UNTOUCHED`

## Migration Order

### Phase 1 — Planning and proof

Status: current phase.

Actions:

1. Keep main gates passing.
2. Keep evidence suite passing.
3. Document the implementation plan.
4. Create a small-chip alias audit before patching shared polish.

### Phase 2 — Shared alias audit

Create an audit that checks whether each `LOCAL_ALIAS_NEEDED` tool has:

- a visible decision chip selector
- state selectors
- export status separated
- no carry-forward or ledger involvement
- no complex status system
- tier behavior untouched

Expected output should classify each candidate as:

- `ALIAS_READY`
- `ALIAS_BODY_DIFF_REVIEW`
- `STATE_ALIAS_MISSING`
- `LOCAL_KEEP_REVIEW`
- `EXPORT_STATUS_KEEP`
- `SPECIAL_PATH_SKIP`

### Phase 3 — Shared polish alias patch

Only after Phase 2 is clean, add shared aliases to:

```text
assets/access-control-tool-polish.js
```

The patch should:

- bump the shared polish cache version
- update page cache-bust references
- avoid JS behavior changes
- avoid export/status popup controls
- avoid hidden ledger/carry-forward behavior

### Phase 4 — Candidate migration

Migrate small chips in this order:

1. reader-type-selector
2. panel-capacity
3. access-level-sizing
4. credential-format

Each migration must run:

```powershell
node .\scripts\audit-access-control-main-gates-0610.js --summary-only
node .\scripts\audit-access-control-evidence-suite-0611.js
```

### Phase 5 — Deferred systems

Do not include in V1 small-chip migration:

- lock-power-budget: visual chip needs separate review
- fail-safe-fail-secure: complex status system needs its own contract
- scope-planner: special path
- export-only tools: export controls stay separate

## Success Criteria

V1 succeeds when:

- small decision chips use shared aliases
- page-local chip CSS is reduced only after parity proves coverage
- export controls remain untouched
- carry-forward ledgers remain untouched
- main gates pass
- evidence suite passes
- Pro behavior is preserved
- Gold readiness is documented but inactive

## Commit Discipline

For each implementation phase:

1. Run main gates.
2. Run evidence suite.
3. Inspect git diff.
4. Remove temporary scripts.
5. Commit only durable docs/scripts/assets/page changes.
6. Push.


## Status Chip Migration Completion Checkpoint

Date: 2026-06-11

The V1 small status-chip migration has been completed for:

- reader-type-selector
- panel-capacity
- access-level-sizing
- credential-format

Completion state:

- Shared squared status-chip aliases are live in `assets/access-control-tool-polish.js`.
- Old local pill-style chip CSS has been removed from the four small-chip candidate tools.
- Access Level and Credential Format hero placement rules are preserved.
- Export status controls remain excluded from this migration.
- Fail Safe remains deferred as a complex status/legend system.
- Lock Power remains deferred as a visual chip review.
- Scope Planner remains a special path.
- Auth, checkout, pipeline, export, snapshot, Knowledge Base, ledgers, and carry-forward behavior remain untouched.

Evidence language should now use `SHARED_SQUARE_CHIP_MIGRATED` / `LOCAL_PILL_CSS_REMOVED` for the four completed small-chip tools instead of pending cleanup language.
