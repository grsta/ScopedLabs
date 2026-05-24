# Physical Security Tool Shell V1 Contract

_Last updated: 2026-05-23_  
_Passphrase: SCOPEDLABS-PS-SHELL-CONTRACT-0523_

## Purpose

Tool Shell V1 defines the reusable page structure for Physical Security tools without changing engineering math, IDs, auth/gating, checkout, pipeline behavior, export behavior, snapshot behavior, or Knowledge Base behavior.

The current Physical Security category passed the role-aware shell audit:

```text
Tools audited: 11
Role-complete tools: 11/11
High-priority role shell gaps: 0
Watch role shell gaps: 0
```

The Graphics / Export Visual Contract also passed for the five renderer tools:

```text
Renderer tools: 5/11
Full graphics path tools: 5/11
Library-contract-ready renderer tools: 5/5
High-risk issues: 0
Watch issues: 0
```

## Core Rule

Tool Shell V1 organizes existing structure. It must not silently change calculations or behavior.

Preserve:

- Existing formulas and engineering math
- Existing element IDs
- Auth and Pro gating
- Checkout flow
- Pipeline carry-over behavior
- Area state behavior
- Export behavior
- Snapshot behavior
- Knowledge Base behavior
- Script order
- Existing successful tool-specific assistant behavior

## Required Shell Segments

Most Physical Security tool pages should resolve into this shell rhythm:

1. Page identity
2. Role-specific intent/context
3. Design Pipeline block
4. Flow note or start context
5. Knowledge Base card
6. Active Area banner/context
7. Planning Inputs
8. Results
9. Primary visual / assistant slot
10. Documentation & Export
11. Back + Continue row

## Required IDs To Preserve

The shell must preserve these IDs wherever already used:

```text
pipeline
flow-note
toolCard
results
continue
next-step-row
exportReport
saveSnapshot
exportStatus
reportTitle
projectName
clientName
preparedBy
customNotes
```

Do not rename these unless a separate compatibility layer is created first.

## Role Model

Physical Security tools are not all the same role.

### Pipeline Entry

Current tool:

- Area / Zone Planner

Entry tools do not require upstream carry-over wording because they start the pipeline.

Required entry shell behavior:

- Start-here / area setup context
- Area or zone creation inputs
- Active area ledger/progress
- Continue into the first downstream tool
- Pro locked fallback preserved

Area Planner's `Active Area Setup` section counts as valid planning inputs.

### Pipeline Step

Current tools:

- Scene Illumination
- Mounting Height
- Field of View
- Coverage Area
- Camera Spacing
- Blind Spot Check
- Pixel Density
- Lens Selection

Pipeline steps should show:

- Active area context
- Flow/carry-over context
- Planning inputs
- Results
- Export/snapshot controls
- Back + Continue rhythm

### Optional Validation

Current tools:

- Face Recognition Range
- License Plate Capture Range

Optional validation tools are specialist validation branches. They should not be treated as mandatory mainline pipeline steps.

They should show:

- Specialist validation context
- Active area context
- Planning inputs
- Results
- Export/snapshot controls
- Back + Continue rhythm where applicable

## Graphics / Report Visual Contract

The current contracted renderer tools are:

- Coverage Area
- Field of View
- Pixel Density
- Camera Spacing
- Blind Spot Check

These tools load:

```text
physical-security-graphics-016-report-visual-contract
```

Report-owned SVGs should declare:

```html
data-report-visual-owner="physical-security-graphics"
data-report-renderer="<renderer-key>"
data-suppress-legacy-chart-export="true"
```

The current renderer keys are:

```text
coverage-footprint-plan
fov-geometry-plan
pixel-density-detail-plan
camera-layout-iso
scenario-pressure-line
```

## Tool Shell Extraction Direction

The first extraction should be conservative.

Preferred extraction order:

1. Audit and document the current shell contract.
2. Extract read-only helpers or small shared renderers.
3. Apply to one low-risk proof tool.
4. Verify no IDs, behavior, auth, export, snapshot, KB, or pipeline flow changed.
5. Expand only after proof.

Do not mass-refactor all Physical Security pages in one pass.

## Accepted Current State

The following are accepted and should not be re-chased without a separate reason:

- Coverage Area CAD visual
- Field of View CAD visual
- Pixel Density CAD visual
- Camera Spacing graphics contract
- Blind Spot graphics contract
- Physical Security report visual attributes
- Role-aware Tool Shell V1 audit pass

## Known Notes

Area Planner is a pipeline-entry tool and should not be forced to show upstream carry-over language.

The Area Planner locked fallback should use:

```html
&#128274; Locked
```

not a raw emoji or corrupted `?? Locked` text.

## Next Recommended Engineering Step

Begin Tool Shell V1 extraction with a small reusable shell helper or metadata/schema layer. The first implementation should preserve the current HTML behavior and only reduce repeated shell logic after source inspection.
