# ScopedLabs Tool Modernization Master Plan

Status: active strategy
Owner context: ScopedLabs site build
Purpose: prevent repeated one-off tool modernization and preserve scope between chat sessions.

---

## Core decision

ScopedLabs should not modernize tools by repeatedly patching individual pages.

Before wiring more modules into tools, each category should be audited and mapped so every tool has a known planning profile, visual family, module need, and closeout target.

The goal is one real closeout visit per tool:

1. Understand what the tool currently does.
2. Decide what planner-level inputs are missing.
3. Decide what visual family the tool needs.
4. Decide which shared modules the tool should load.
5. Wire the shell and selected modules.
6. Run audits.
7. Live review.
8. Commit and lock, or mark special/skip with a reason.

---

## Why this exists

Many existing ScopedLabs tools began as basic calculators. The product direction has shifted toward engineering planning workflows.

That means many tools need to become beefier planners, not just numeric calculators.

The work should not be:

- Patch a result card.
- Patch a chart.
- Patch export.
- Come back later for assistant.
- Come back later for visual polish.
- Come back again for snapshot/pipeline.

That creates repeat visits and hidden debt.

The preferred work is:

- Audit and map the category first.
- Define the module and visual families.
- Then visit each tool once for a complete scoped upgrade.

---

## Universal shell vs category modules

ScopedLabs should have a universal shell contract, but not one universal visual.

The shell should handle:

- Standard tool layout contracts.
- Required mount checks.
- Back/Continue flow actions.
- Diagnostics.
- Module capability probes.
- Export/snapshot/pipeline safety checks.
- PASS/WATCH/FAIL reporting.

Category modules should handle domain-specific behavior:

- Visual families.
- Assistant reasoning.
- Export payload builders.
- Planning input rules.
- Summary/rollup behavior.
- Specialty branch behavior.

Tool contracts should declare what a specific tool uses.

---

## Visual family rule

Do not create one new module for every tool.

Create or promote one shared module per reusable visual family.

Examples:

- Compute capacity envelope charts.
- Compute IOPS/latency curves.
- Compute network throughput envelopes.
- Compute rack/resource icon diagrams.
- Physical Security CAD camera layouts.
- Physical Security coverage/target plan views.
- Access Control door/panel/lock diagrams.
- Access Control assistant proof visuals.
- Access Control scope/branch maps.

If a tool fits an existing visual family, it should consume that shared renderer with tool-specific data, labels, thresholds, and units.

If a tool needs a new visual family, promote that family into a shared module before completing the tool.

---

## Tool planning profile

Each tool should receive a planning profile before modernization.

Required profile fields:

- Category.
- Tool ID.
- Tool title.
- Current purpose.
- Current inputs.
- Current outputs.
- Current formulas or decision logic.
- Current visual behavior.
- Current export behavior.
- Current snapshot behavior.
- Current pipeline/carry-forward behavior.
- Current assistant behavior.
- Missing planner inputs.
- Missing domain factors.
- Required visual family.
- Required shared modules.
- Required export/report sections.
- Required assistant behavior.
- Required carry-forward fields.
- Status:
  - REFERENCE
  - READY_FOR_CLOSEOUT
  - NEEDS_PLANNER_INPUTS
  - NEEDS_VISUAL_FAMILY
  - NEEDS_EXPORT_ROUTE
  - NEEDS_ASSISTANT_CONTRACT
  - SPECIAL_PATH
  - LOCKED

---

## One-visit closeout rule

After the category map exists, each tool should be upgraded in one real visit.

A tool visit is complete only when one of these is true:

1. The tool is accepted and locked.
2. The tool is intentionally marked SPECIAL_PATH or SKIP with a written reason.
3. A reusable visual/module family is missing, so that family is promoted first and the tool remains explicitly marked NEEDS_VISUAL_FAMILY.

Do not leave tools with vague TODOs such as:

- polish later
- chart needs work
- export maybe later
- assistant later
- check this later

Use named WATCH items instead.

---

## Accepted watch reasons

Use named watch reasons so future agents know exactly what remains.

Examples:

- WATCH_EXPORT_ROUTE_MISSING
- WATCH_CUSTOM_PAYLOAD_MISSING
- WATCH_ASSISTANT_NOT_CONNECTED
- WATCH_USER_NOTES_NOT_CONNECTED
- WATCH_VISUAL_FAMILY_NEEDED
- WATCH_LOCAL_RENDERER_STILL_PRESENT
- WATCH_PIPELINE_CARRY_FORWARD_GAP
- WATCH_SNAPSHOT_PAYLOAD_GAP
- WATCH_INPUT_DEPTH_GAP
- SKIP_SPECIAL_PATH
- LOCKED_REFERENCE

---

## Category-first workflow

For each category:

1. Inventory every tool.
2. Record whether it is core pipeline, optional branch, summary, specialty, or special path.
3. Audit current inputs and outputs.
4. Identify missing planner inputs and domain factors.
5. Group tools into visual families.
6. Identify needed shared modules.
7. Identify assistant/export/snapshot/pipeline requirements.
8. Update category visual family map.
9. Update module map when shared modules/routes/audits are added.
10. Only then wire tools one by one.

---

## Immediate next lane

Stop RAM one-off visual patching.

Next work should create the audit and mapping foundation:

- docs/scopedlabs-category-visual-family-map.md
- docs/scopedlabs-tool-modernization-master-plan.md
- scripts/audit-scopedlabs-tool-planning-profile-v1.js

Then use Compute as the proof category:

- CPU Sizing = accepted reference for Compute capacity envelope.
- RAM Sizing = target proof consumer of shared Compute capacity envelope.
- Storage/IOPS = likely separate IOPS/latency visual family.
- Other Compute tools should be mapped before module wiring.

---

## Durable rule

The assistant should not ask the user to re-explain this strategy in future chats.

Future agents should read this document, the category visual family map, and docs/scopedlabs-module-map.md before starting more tool modernization.
