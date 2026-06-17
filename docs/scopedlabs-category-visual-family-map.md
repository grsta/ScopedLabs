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
