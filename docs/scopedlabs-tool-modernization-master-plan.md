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

## Category System Scope

The modernization scope includes more than individual tool pages.

Every category should be planned as a complete system:

1. Planner / Command Page
2. Tool Pages
3. Summary / Report Page
4. Category Master Assistant
5. Shared visual families
6. Shared export/snapshot/pipeline modules
7. Future cross-category handoff

---

## Category Planner / Command Page

The planner page is the command page for the category.

It should eventually provide:

- Category workflow overview.
- Start / continue planning.
- Core tool path.
- Optional specialty branches.
- Completed-tool state.
- Active assumptions.
- Current planning status.
- Recommended next step.
- Links into the correct tool pages.

Planner pages should use shared planner shell modules plus category adapters.

They should not become page-local one-off dashboards.

---

## Category Summary / Master Assistant Page

The summary page is the category rollup, final report host, and master assistant.

It should eventually provide:

- Completed tool output rollups.
- Local assistant note rollups.
- Assumptions and risks.
- Missing input warnings.
- Cross-tool conflict detection.
- Category-level recommendation synthesis.
- Recommendation references.
- Final category export/report.
- Cross-category handoff payloads.

The summary page should act like the category lead engineer.

Local tool assistants are specialists.

The summary/master assistant oversees those specialists and produces the category-level guidance.

---

## Shared Modules For Category Pages

Planner and summary pages need reusable modules too.

Candidate shared modules:

- assets/scopedlabs-category-planner-shell.js
- assets/scopedlabs-category-summary-shell.js
- assets/scopedlabs-category-progress-state.js
- assets/scopedlabs-category-workflow-router.js
- assets/scopedlabs-category-rollup-state.js
- assets/scopedlabs-category-master-assistant.js
- assets/scopedlabs-category-report-export.js

Candidate category adapters:

- assets/compute-category-planner.js
- assets/compute-category-summary.js
- assets/physical-security-category-planner.js
- assets/physical-security-category-summary.js
- assets/access-control-category-planner.js
- assets/access-control-category-summary.js

Do not add these paths to the module map as implemented modules until files actually exist.

When any shared module or category adapter is added, update docs/scopedlabs-module-map.md and run:

```powershell
node .\scripts\audit-scopedlabs-module-map-v1.js
```

---

## Future-Proofing Requirement

All new shell, tool, visual, export, snapshot, pipeline, assistant, planner, and summary modules should be designed as extensible capability contracts.

A module should support future additions without requiring a page rewrite.

Use:

- Capability flags.
- Adapter slots.
- Optional future fields.
- Structured payloads.
- Named WATCH reasons.
- Named SKIP/SPECIAL reasons.
- Versioned module contracts.

Avoid:

- Dead-end local page scripts.
- Hard-coded one-off assumptions.
- Hidden behavior that audits cannot detect.
- Broad assistants that cannot publish structured data upward.

---

## Assistant Knowledge Growth

Assistants should be able to grow over time through versioned knowledge updates.

Allowed future knowledge layers:

1. Built-in ScopedLabs rules and formulas.
2. Versioned ScopedLabs Knowledge Base content.
3. Category planning profiles and accepted design rules.
4. Optional current-knowledge lookup through a controlled connector.

This is not uncontrolled learning.

Assistant growth should be source-tracked, versioned, and auditable.

---

## Strict Assistant Lookup Scope

Any future current-knowledge or web lookup capability must be strictly scoped.

A local tool assistant may only search for current knowledge directly needed for that tool's planning decision.

A category master assistant may only search for current knowledge directly needed for that category summary.

A future cross-category assistant may only search for current knowledge needed to resolve explicit cross-category conflicts or handoff issues.

Every lookup must expose:

- Scope.
- Reason.
- Source.
- Freshness.
- Confidence.
- Assumptions or risks.

Assistants must not browse broadly.

## Read-Only Audit And Review Gate

The planning audit phase is read-only.

Do not rewrite pages directly from audit results.

The audit should first inventory and document what each category/tool currently does. After the audit, the user and assistant should review the category profile and decide what each tool actually needs before any shell/module wiring is applied.

Required order:

1. Read/audit the current category and tool pages.
2. Document current behavior.
3. Discuss what each tool should become as a planner.
4. Decide missing planner inputs.
5. Decide required visual family.
6. Decide required shared icons or graphics.
7. Decide required assistant/export/snapshot/pipeline modules.
8. Update the category planning profile.
9. Only then wire the selected shell/modules into the tool.
10. Run audits and live review.
11. Commit and lock, or mark WATCH/SKIP/SPECIAL with a named reason.

The audit is a planning discovery pass, not an automatic migration pass.

---

## Shared Icon And Graphics Review Gate

During category planning, each tool should be reviewed for icon and graphics needs.

For each tool, decide one of these:

- Existing shared icon works.
- Existing shared visual family works.
- New icon is needed in a shared category library.
- New visual family is needed.
- No visual/icon is needed, with documented reason.

Do not create page-local one-off icons when the icon may be reused by other tools.

Shared icons and graphics should be added to the appropriate category visual library or promoted into a shared visual family module.

Examples:

Compute candidate icons:
- server/node
- CPU/core
- memory/RAM
- storage disk/array
- network path
- throughput/bottleneck
- reserve/headroom

Physical Security candidate icons:
- camera
- target
- coverage cone
- blind spot/obstruction
- mounting pole/wall
- zone/area marker

Access Control candidate icons:
- door opening
- reader
- lock
- panel
- elevator
- credential/card
- anti-passback zone

Icon decisions should be documented in the category planning profile before implementation.

## Layout Consistency Guardrail

ScopedLabs categories may have different content, visuals, assistant modules, and planner requirements, but the page layout rhythm should remain consistent across the product.

Future modernization should not treat every page as a blank canvas.

Use consistent shells for:

1. Category Planner / Command Pages
2. Individual Tool Pages
3. Category Summary / Master Assistant Pages

---

### Category Planner / Command Pages

Planner pages should share the same general layout pattern:

- Category introduction.
- Planning workflow overview.
- Core path cards.
- Optional branch cards.
- Current planning state.
- Resume/continue guidance.
- Links into tool pages.
- Clear route to the category summary/report page.

Category-specific sections are allowed, but they should be implemented as modules inside the planner shell, not as unrelated one-off layouts.

---

### Tool Pages

Tool pages should share the same general rhythm:

- Tool intro / purpose.
- Inputs.
- Calculate/reset actions.
- Results.
- Visual/proof module when applicable.
- Local assistant guidance.
- Export/report/snapshot area when applicable.
- Back/Continue flow actions.
- Knowledge Base/help behavior.

Tool-specific sections are allowed when the planner requires them, such as:

- Extra planner inputs.
- Special warnings.
- Special validation sections.
- Specialty branch guidance.
- Tool-specific report notes.
- Different visual family.

These sections should still sit inside the shared tool shell rhythm.

---

### Category Summary / Master Assistant Pages

Summary pages should share the same general layout pattern:

- Category rollup.
- Completed tool outputs.
- Assumptions.
- Risks.
- Local assistant note rollups.
- Master assistant synthesis.
- Conflicts/gaps/missing input warnings.
- Recommendation references.
- Final report/export.
- Cross-category handoff.

Category-specific rollup sections are allowed, but the summary page should still behave as the category master assistant/report host.

---

## Consistency Rule

Small inconsistencies are allowed only when they are purposeful and documented.

Allowed:
- A category-specific module.
- A tool-specific planner section.
- A different shared visual family.
- A specialty branch card.
- A special warning or validation card.
- A summary/report section required by the category.

Not allowed:
- Redesigning each tool independently.
- Creating unrelated page rhythms for similar tools.
- Moving core shell sections without a reason.
- One-off visual/card layouts when a shared module should exist.
- Treating normal tools as special paths without documenting why.

---

## Special Path Rule

A page may break the standard shell only when it is intentionally marked SPECIAL_PATH or SKIP_SPECIAL_PATH with a written reason.

Examples:
- Dedicated summary/report host.
- Dedicated planner/command page.
- Legacy protected/gold-standard page.
- Tool with a unique print/copy/export path.
- Tool that does not use the standard calculator output shell.

Special paths must still be documented in the category planning profile and audits.
