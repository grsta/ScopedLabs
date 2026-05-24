# ScopedLabs Category Modernizer V1

The ScopedLabs Category Modernizer is a modular, registry-driven audit and standardization runner for category tool pages.

It exists to prevent one-off patch chasing. The long-term goal is to let ScopedLabs standardize tool pages, shared engine wiring, labels, export behavior, Knowledge Base wiring, graphics contracts, cache-bust hygiene, and diagnostics through a reusable category-level system.

Current implementation file:

```text
scripts/modernize-category-tools-v1.js
```

Current baseline category:

```text
physical-security
```

Protected page:

```text
lens-selection
```

Lens Selection remains protected because it is the current gold-standard assistant/page experience. The Modernizer may audit around it, but it should not rewrite it unless explicitly scoped later.

---

## Current Runner Version

```text
scopedlabs-category-modernizer-015-diagnostics-visible-text-safe
```

The runner now supports filtered output so audits remain usable as the module count grows.

### Summary-only mode

```powershell
node .\scripts\modernize-category-tools-v1.js --category physical-security --dry-run --summary-only
```

### Single-module mode

```powershell
node .\scripts\modernize-category-tools-v1.js --category physical-security --dry-run --summary-only --module kb-card
node .\scripts\modernize-category-tools-v1.js --category physical-security --dry-run --summary-only --module diagnostics
```

### Full table mode

```powershell
node .\scripts\modernize-category-tools-v1.js --category physical-security --dry-run
```

Use full table mode only when reviewing module details because the output is now large.

---

## Current Module Stack

The Modernizer currently has 10 modules.

| Module | Current version | Current behavior |
|---|---:|---|
| ToolShellModule | tool-shell-module-001 | Audit/no-op |
| BackContinueModule | back-continue-module-001 | Safe planner/apply-capable, but no-op on already-proofed Physical Security tools |
| BadgeCleanupModule | badge-cleanup-module-001-audit-only | Audit/no-op |
| LabelStandardModule | label-standard-module-001-audit-only | Audit/no-op |
| ExportShellModule | export-shell-module-002-role-aware-audit-only | Audit/no-op |
| GraphicsContractModule | graphics-contract-module-001-audit-only | Audit/no-op |
| KbCardModule | kb-card-module-002-registry-aware-audit-only | Audit/no-op |
| ScriptOrderModule | script-order-module-002-kb-safe-audit-only | Audit/no-op |
| CacheBustModule | cache-bust-module-001-audit-only | Audit/no-op |
| DiagnosticsModule | diagnostics-module-002-visible-text-safe-audit-only | Audit/no-op |

Most modules are intentionally audit/no-op right now. This phase is about proving the contract before letting the system rewrite pages.

---

## Expected Physical Security Baseline

After the DiagnosticsModule V2 update, the expected Physical Security summary is:

```text
Module results: 110
SAFE: 100
WATCH: 0
SKIP: 10
FAIL: 0
Pending safe patches: 0
Applied patches: 0
```

Single-module checks should report:

```text
Module results: 11
SAFE: 10
WATCH: 0
SKIP: 1
FAIL: 0
```

The one skipped tool is:

```text
lens-selection
```

---

## Companion Audits

The Modernizer should continue to be checked with the existing permanent Physical Security audits.

```powershell
node .\scripts\audit-category-modernizer-v1.js --category physical-security
node .\scripts\audit-physical-security-shell-v1.js
node .\scripts\audit-physical-security-back-continue-shell.js
```

Expected companion audit state:

```text
Category Modernizer audit:
SAFE: 10
WATCH: 0
SKIP: 1
FAIL: 0
Back + Continue proofed: 10/10 active tools

Physical Security Shell audit:
Clean registry-driven tools: 11/11
Tool Shell opt-in tools: 11/11
Watch issues: 0

Back + Continue Shell audit:
Tools with Back + Continue shell proof call: 10/11
Watch issues: 0
```

---

## Module Responsibilities

### ToolShellModule

Checks:

- category registry script connected
- Tool Shell helper connected
- script order between registry, shell helper, and local script
- required IDs based on tool role
- protected pages skipped

This module is audit/no-op.

---

### BackContinueModule

Checks and can safely normalize the Back + Continue row pattern.

Physical Security proof state:

```text
10 of 11 tools proofed
Lens Selection intentionally skipped
```

The helper-owned row pattern is already active on the following tools:

```text
area-planner
scene-illumination
mounting-height
field-of-view
camera-coverage-area
camera-spacing
blind-spot-check
pixel-density
face-recognition-range
license-plate-range
```

Do not force Lens Selection into this pattern yet.

---

### BadgeCleanupModule

Inventories decorative or legacy badge text such as:

```text
Pro Tier
Free Tier
Design Flow
Part of a Design Flow
Documentation & Export
Knowledge Base
```

Current behavior is audit/no-op. It should not remove badges until a later apply-safe rule is explicitly designed.

---

### LabelStandardModule

Inventories page wording and section labels, including:

- page title
- H1
- remaining Calculator wording
- Planning Inputs label
- Results label
- Export label
- Best for line
- subhead presence

Current behavior is audit/no-op.

---

### ExportShellModule

Audits export/snapshot/report wiring.

Checks include:

- export.js connected
- export config present
- exportReport button
- saveSnapshot button
- exportStatus
- report metadata fields
- assistant export shell where applicable

This module is role-aware. Area Planner is treated as valid with its alternate area-summary print/copy pattern rather than requiring the normal export card.

---

### GraphicsContractModule

Audits expected graphics engine/category graphics wiring.

Physical Security graphics renderer proof set:

```text
camera-coverage-area: coverage-footprint-plan
field-of-view: fov-geometry-plan
pixel-density: pixel-density-detail-plan
camera-spacing: camera-layout-iso, scenario-pressure-line
blind-spot-check: camera-layout-iso
```

Checks include:

- scopedlabs-graphics.js
- physical-security-graphics.js
- graphics script order
- expected renderer references
- report visual contract signals

Current behavior is audit/no-op.

---

### KbCardModule

Audits Knowledge Base/help wiring.

This module is registry-aware. It accepts KB keys from the category registry instead of requiring every page to inline the KB key.

Checks include:

- help.js connected
- expected registry KB key present
- KB card/trigger signal or registry-managed KB mode
- old Knowledge Base pill inventory

Current behavior is audit/no-op.

---

### ScriptOrderModule

Audits shared engine script order.

Checks include:

- tool-flow before local script
- catalog before local script
- pipelines before local script
- pipeline before local script
- registry before Tool Shell
- Tool Shell before local script
- export before local script when export buttons exist
- graphics order where graphics are used

This module is KB-safe. It tracks help.js connection but does not require help.js to load before the local script because the current KB engine pattern does not require that ordering.

Current behavior is audit/no-op.

---

### CacheBustModule

Audits cache-bust query hygiene.

Checks include:

- local script has ?v=
- shared assets have ?v=
- registry script has ?v=
- Tool Shell has ?v=
- graphics library scripts have ?v= where applicable
- help.js has ?v=
- critical unversioned assets

Current behavior is audit/no-op.

---

### DiagnosticsModule

Audits factory diagnostic signals and obvious broken visible UI artifacts.

Checks include:

- registry script
- Tool Shell script
- local script
- required IDs
- Tool Shell diagnostics availability
- graphics/report visual contract signals for graphics tools
- visible broken artifacts such as Status: undefined, visible undefined, visible NaN, or visible null

This module is visible-text safe. It strips script/style/tag content before checking for broken UI text, so normal JavaScript usage like `safeNumber(v, NaN)` and words such as `maintenance` or `dominant` do not trigger false warnings.

Current behavior is audit/no-op.

---

## Protected Page Rules

Current protected pages:

```text
physical-security/lens-selection
```

Protected pages should return SKIP for Modernizer modules.

Reason:

```text
protected/gold-standard
```

Lens Selection remains frozen as the assistant visual and interaction gold standard until a shared factory can reproduce it with no loss.

---

## Apply Mode Caution

The runner supports apply mode:

```powershell
node .\scripts\modernize-category-tools-v1.js --category physical-security --apply
```

But apply mode should remain tightly controlled.

Current rule:

```text
Do not use --apply broadly.
Use dry-run first.
Use --module for one module at a time.
Review the planned patch count before applying.
Protected pages stay skipped.
```

Most current modules are audit/no-op and should not write page files.

---

## Safe Workflow

Use this workflow before any Modernizer change:

```powershell
git status --short
git ls-files --others --exclude-standard

node .\scripts\modernize-category-tools-v1.js --category physical-security --dry-run --summary-only
node .\scripts\modernize-category-tools-v1.js --category physical-security --dry-run --summary-only --module diagnostics

node .\scripts\audit-category-modernizer-v1.js --category physical-security
node .\scripts\audit-physical-security-shell-v1.js
node .\scripts\audit-physical-security-back-continue-shell.js
```

After a doc/script-only update:

```powershell
git status --short
git ls-files --others --exclude-standard
git add .\docs\scopedlabs-category-modernizer-v1.md
git commit -m "Update Category Modernizer V1 documentation"
git push
git status --short
```

---

## Next Recommended Enhancements

Useful next improvements:

1. Add JSON output mode.
2. Add module manifest output.
3. Add category comparison mode.
4. Add audit-only run against the next category.
5. Add InputFieldModule audit/no-op.
6. Add AssistantShellModule audit/no-op.
7. Add a protected-page config section instead of hardcoded protected tools.
8. Add safer patch plans that print exact files and actions before writing.

Do not start mass-modernizing another category until the runner can clearly show:

```text
category
module
classification
action
file
reason
patch count
protected skips
```

---

## Durable Constraints

The Modernizer must preserve:

- existing math
- formulas
- IDs
- class names
- auth/gating
- checkout
- pipeline behavior
- export behavior
- snapshot behavior
- Knowledge Base behavior
- script order unless explicitly scoped
- Lens Selection frozen behavior

The Modernizer should make category upgrades safer, not hide risky rewrites behind a generic command.
