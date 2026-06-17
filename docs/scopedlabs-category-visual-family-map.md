# ScopedLabs Category Visual Family Map

Status: active planning map
Purpose: decide which shared visual families each category needs before wiring tool shells.

---

## Core principle

ScopedLabs uses one universal shell contract, but category-specific visual families.

A visual family is reusable when multiple tools can share the same renderer with different data, labels, thresholds, units, or markers.

A new tool does not automatically require a new module.

A new module is needed only when the tool introduces a reusable visual family that does not already exist.

---

## Compute

Current planning direction:

Compute tools are moving from basic calculators toward infrastructure planning tools.

Expected visual families:

### compute-capacity-envelope

Purpose:
- Show how close a plan is to the capacity edge.
- Used for CPU/RAM style resource sizing.
- Should support dynamic analytical graph output.
- Should use accepted CPU-style proof markers and engineering chart frame.

Known consumers:
- CPU Sizing: reference/accepted style.
- RAM Sizing: should consume same family with GB labels.

Shared module target:
- assets/scopedlabs-compute-capacity-visuals.js

Needed renderer direction:
- Shared base capacity-envelope engine.
- CPU adapter.
- RAM adapter.
- Export-safe SVG route.

### compute-iops-latency

Purpose:
- Show storage performance pressure, IOPS, latency, throughput, and reserve.

Likely consumers:
- Storage IOPS and future storage tools.

Status:
- Needed family, not yet proven in this map.

### compute-throughput-envelope

Purpose:
- Show bandwidth/throughput pressure across networking or server/storage paths.

Likely consumers:
- Network or compute throughput tools.

Status:
- Candidate family.

### compute-resource-icon-diagram

Purpose:
- Show rack/resource allocation, nodes, memory tiers, drives, or simple infrastructure blocks.

Likely consumers:
- Tools where an icon-based planning diagram is clearer than an analytical curve.

Status:
- Candidate family.

---

## Physical Security

Current planning direction:

Physical Security already has strong CAD/plan-view visual foundations.

Expected visual families:

### physical-security-cad-layout

Purpose:
- Camera layout, FOV, coverage, spacing, blind spots, target zones.

Existing shared module:
- assets/physical-security-graphics.js

Known behavior:
- CAD style with thin lines, camera markers, cones, target/coverage geometry.

### physical-security-zone-rollup

Purpose:
- Summary and category-level visual rollups.

Known host:
- tools/physical-security/summary/

Status:
- Summary is permanent category master/report host.

---

## Access Control

Current planning direction:

Access Control has reusable visual and assistant proof foundations.

Expected visual families:

### access-control-planning-diagrams

Purpose:
- Door, panel, lock, elevator, anti-passback, cable/power visuals.

Existing shared module:
- assets/access-control-planning-visuals.js

### access-control-assistant-proof

Purpose:
- A / Entered Conditions.
- B / Assistant Recommendation.
- Plain *1/*2/*3 marker references.
- Assistant Recommended Actions.
- Export Recommendation References.

Existing reference:
- Fail-Safe vs Fail-Secure.

Existing shared modules:
- assets/access-control-planning-visuals.js
- assets/access-control-tool-assistant-adapters.js
- assets/access-control-output-shell.js

### access-control-scope-map

Purpose:
- Scope planning and branch behavior.

Special path:
- Scope Planner remains special path with dedicated print/copy summary behavior.

---

## Future categories

For each category, add:

- Category purpose.
- Existing shared modules.
- Required visual families.
- Tools that consume each family.
- Tools needing a new family.
- Summary/master host behavior.
- Export/report requirements.
- Assistant requirements.
- Pipeline/carry-forward requirements.

---

## Decision rule

Before modernizing a tool, answer:

1. Does this tool fit an existing visual family?
2. Does it need a new reusable visual family?
3. Does it need no visual, with an audited exemption?
4. Which assistant/export/snapshot/pipeline modules does it need?
5. Is it core pipeline, optional branch, summary, or special path?

Only then wire the shell and modules.

## Category Page Shell Families

Every category should be treated as a planning system, not only a collection of tool pages.

Each category should define three shell levels:

1. Category Planner / Command Page
2. Individual Tool Pages
3. Category Summary / Report Page

These pages should use shared/reusable modules instead of page-local one-offs.

---

### category-planner-command-shell

Purpose:
- Act as the category control center.
- Start or resume the planning workflow.
- Show the core path.
- Show optional specialty branches.
- Show active planning state.
- Show completed or pending tools.
- Route users to the next correct tool.
- Explain what the category is planning.

Future shared module targets:
- assets/scopedlabs-category-planner-shell.js
- assets/scopedlabs-category-progress-state.js
- assets/scopedlabs-category-workflow-router.js

Category adapter examples:
- assets/compute-category-planner.js
- assets/physical-security-category-planner.js
- assets/access-control-category-planner.js

---

### category-summary-report-shell

Purpose:
- Act as the category rollup and report host.
- Read completed tool outputs.
- Read assumptions, risks, and recommendation references.
- Present final category-level guidance.
- Host the category master assistant.
- Own final category export/report behavior.
- Prepare cross-category handoff data.

Future shared module targets:
- assets/scopedlabs-category-summary-shell.js
- assets/scopedlabs-category-rollup-state.js
- assets/scopedlabs-category-report-export.js
- assets/scopedlabs-category-master-assistant.js

Category adapter examples:
- assets/compute-category-summary.js
- assets/physical-security-category-summary.js
- assets/access-control-category-summary.js

---

## Assistant Hierarchy

ScopedLabs assistants should be layered.

### Local tool assistant

Role:
- Local specialist for one tool.
- Reads that tool's inputs and outputs.
- Produces local guidance, assumptions, risks, missing-input notes, and recommendation references.
- Publishes structured summary-ready data upward.

### Category master assistant

Role:
- Lives on the category summary page.
- Oversees the local tool assistants in that category.
- Reads completed tool outputs and assistant notes.
- Detects conflicts, gaps, missing assumptions, and unresolved risks.
- Produces category-level synthesis.
- Builds final category report guidance.
- Prepares cross-category handoff data.

### Future site / cross-category assistant

Role:
- Reads category summaries.
- Coordinates cross-category dependencies.
- Detects conflicts between categories.
- Supports future higher-tier planning workflows.

---

## Assistant Future-Proofing Rule

Assistant modules must be extensible capability contracts, not dead-end page scripts.

Assistant contracts should support future slots for:

- Added planner inputs.
- Added domain checks.
- Added reasoning modules.
- Added recommendation references.
- Added assumptions and risks.
- Added export/report sections.
- Summary publishing.
- Conflict detection.
- Cross-category handoff.
- Future higher-tier/site-wide assistant behavior.

Assistant output should be structured so other modules can consume it later.

---

## Assistant Current-Knowledge Guardrail

Future assistants may support current-knowledge or web lookup capability, but only through a controlled connector and only inside the current planning scope.

Local tool assistants may only request current knowledge directly relevant to the current tool.

Category master assistants may only request current knowledge directly relevant to the current category summary.

Future cross-category assistants may only request current knowledge for explicit cross-category conflicts or handoff needs.

Every current-knowledge lookup should include:

- Declared scope.
- Reason for lookup.
- Source or citation.
- Source date or freshness note.
- Confidence or uncertainty note.
- User-visible assumption/risk note when needed.

Assistants must not browse broadly or research unrelated products, categories, or general web topics.

---

## Extensible Capability Contract Rule

When adding modules to tool pages, planner/command pages, or summary/master assistant pages, the contract should leave slots for future capabilities.

Use capability flags, adapter slots, and named PASS/WATCH/SKIP states instead of hard-coded one-off assumptions.

Example capability groups:

- shell
- flowActions
- localAssistant
- masterAssistantPublisher
- categoryMasterAssistant
- visualFamilies
- exportPayload
- snapshotPayload
- pipelineCarryForward
- userNotes
- reportMetadata
- currentKnowledgeLookup
- crossCategoryHandoff

A module can be planned as future without blocking the current closeout, but it must be named with a clear WATCH reason.

## Audit Review Gate For Visuals And Icons

The visual family map should be used during the read-only audit and discussion phase.

Do not use the audit to immediately rewrite tool pages.

For each tool, the review should answer:

1. Does the tool need a visual?
2. Does it fit an existing visual family?
3. Does it need a new reusable visual family?
4. Does it need a shared icon from an existing library?
5. Does a new icon need to be created and added to a shared library?
6. Is there a justified no-visual/no-icon exemption?

The result should be documented before shell/module wiring.

Visual and icon work should follow this order:

1. Identify visual/icon need.
2. Decide shared family or shared library placement.
3. Add/promote shared renderer or icon if needed.
4. Update docs/scopedlabs-module-map.md when a real shared module path is added or changed.
5. Run module map audit when required.
6. Wire the tool to the selected shared visual/icon module.
7. Run category/tool audits.
8. Live review.
9. Commit and lock.

This prevents one-off page graphics and prevents tools from being revisited repeatedly for visual modernization.

## Layout Rhythm And Visual Consistency

Visual family decisions should support consistent page rhythm.

A tool may use a different visual family when the planning purpose requires it, but the surrounding page layout should still follow the category/tool shell pattern.

Examples:

- Compute CPU/RAM may use a capacity-envelope analytical chart.
- Compute storage may use an IOPS/latency curve.
- Compute rack/resource tools may use icon diagrams.
- Physical Security may use CAD camera layouts.
- Access Control may use door/panel/lock diagrams.

Different visual families are allowed.

Unrelated one-off page layouts are not.

The visual review should decide:

1. Which shared visual family the tool needs.
2. Whether new icons are needed in a shared library.
3. Where the visual sits in the standard tool shell.
4. Whether the visual also needs export/report support.
5. Whether the summary/master assistant needs to consume the visual output.

A visual module should fit the shell, not force every tool page into a new layout.
