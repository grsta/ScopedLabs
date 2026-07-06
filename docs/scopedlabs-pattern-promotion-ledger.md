# ScopedLabs Pattern Promotion Ledger

This ledger prevents recurring fixes from staying trapped as page-local patches.

Before closeout, every reusable-looking fix must be classified as one of:

- **SHARED_PATTERN** ? promoted to a shared module/helper/factory/auditable contract.
- **ADAPTER_CONSUMER** ? tool-specific adapter consuming a shared module/helper/factory.
- **APPROVED_LOCAL_EXCEPTION** ? intentionally local, with a reason, owner path, audit, and revisit trigger.
- **BLOCKED_PROMOTION_REQUIRED** ? not closeout-ready.

## Promotion decision template

```text
Pattern:
Status:
Problem found:
Scope:
Shared owner:
First consumer:
Required future consumers:
Audit:
Drift guard:
Approved local exception:
Revisit trigger:
Notes:
```

## Active promotion decisions

### COMPUTE-EXPORT-PROOF-TABLES-0618

Pattern: Compute export proof table cell styling and width layout  
Status: SHARED_PATTERN  
Problem found: CPU export proof tables needed repeated cell styling, value coloring, Engineering Note emphasis, and column-width behavior. This is reusable Compute proof-table behavior, not a CPU-only visual preference.  
Scope: Compute tools with Recommended Actions, Decision Schedule, proof/export tables, or status-colored report values.  
Shared owner: assets/scopedlabs-compute-export-proof-tables.js  
First consumer: tools/compute/cpu-sizing/  
Required future consumers: tools/compute/ram-sizing/ and future Compute tools with proof export tables  
Audit: scripts/audit-compute-export-proof-table-contract-v1.js  
Drift guard: scripts/audit-scopedlabs-pattern-promotion-v1.js  
Approved local exception: none  
Revisit trigger: Before RAM proof export wiring and before any future Compute tool adds proof/export tables  
Notes: Promotion completed. CPU consumes the shared Compute proof-table helper; future Compute proof/export tables should use the same shared helper or record an approved local exception.

### CATEGORY-PLANNER-SUMMARY-NAV-0618

Pattern: Category planner and summary navigation contract  
Status: ADAPTER_CONSUMER  
Problem found: Tool pipeline navs expose Planner/category links but did not consistently expose Summary/rollup links. Some categories have Summary pages; many are pending Summary pages.  
Scope: All category pages and all tool pipeline navs.  
Shared owner: assets/pipeline.js  
First consumers: tools/access-control/ and tools/physical-security/ because both already have summary pages  
Required future consumers: tools/compute/, tools/network/, tools/power/, tools/thermal/, tools/wireless/, tools/infrastructure/, tools/performance/, tools/video-storage/ once Summary pages exist  
Audit: scripts/audit-scopedlabs-planner-summary-nav-contract-v1.js  
Drift guard: scripts/audit-scopedlabs-pattern-promotion-v1.js  
Approved local exception: none  
Revisit trigger: Before adding planner/summary links to any individual tool page, and before Compute Summary scaffolding  
Notes: Physical Security consumes the global pipeline registry/renderer assets/pipelines.js plus assets/pipeline.js. Access Control consumes its category-nav adapter assets/access-control-category-nav.js and now exposes Summary through that shared adapter. Categories without Summary pages remain explicitly pending instead of receiving broken links.

### TOOL-ASSISTANT-SUMMARY-CONTRACT-0618

Pattern: Tool assistant to category summary contract  
Status: ADAPTER_CONSUMER  
Problem found: Tool assistants exist in category/tool lanes, but the build did not enforce that each local assistant belongs to a shared contract and can publish summary/master-assistant-ready guidance.  
Scope: All calculator/tool pages with local assistant behavior, export/report guidance, pipeline state, or category carryover.  
Shared owner: assets/scopedlabs-tool-shell.js  
First consumers: Access Control, Physical Security, Compute CPU/RAM  
Required future consumers: all category tool pages  
Audit: scripts/audit-scopedlabs-tool-assistant-contract-v1.js  
Drift guard: scripts/audit-scopedlabs-pattern-promotion-v1.js  
Approved local exception: none  
Revisit trigger: Before wiring any new category Summary page, local Tool Assistant, or assistant-to-export/report closeout  
Notes: Shared Tool Shell owns assistant diagnostics and the category adapters own category-specific assistant behavior. Access Control uses assets/access-control-tool-assistant-adapters.js plus assets/access-control-report-summary.js. Physical Security uses assets/physical-security-local-assistant.js, assets/physical-security-tool-assistant-adapters.js, assets/physical-security-guidance-event-bridge.js, and assets/physical-security-category-guidance.js. Compute uses assets/scopedlabs-compute-assistant-contract.js while its Summary page remains pending. RAM Sizing now consumes the shared Compute assistant contract through the CPU-grade Compute tool shell stack and renders from the existing RAM capacity payload.

## Approved local exceptions

None.

### COMPUTE-GPU-VRAM-SHELL-PROOF-LOCAL-0621

Status: APPROVED_LOCAL_EXCEPTION

Approved local exception: GPU VRAM shell bridge is approved as a tool-local proof because it renders VRAM-specific assistant, references, actions, decision schedule, and ledger output from GPU-specific calculation factors.

Changed path:
- tools/compute/gpu-vram/script.js

Reason:
- GPU VRAM is the current Compute proof target for shell/module consumption after CPU and RAM.
- The GPU VRAM shell bridge is intentionally tool-local in this lane because it renders GPU-specific planning outputs from VRAM-specific calculation factors, including precision mode, parallelism mode, replica count, cache reserve, workspace reserve, sharing mode, installed VRAM, usable VRAM, and capacity pressure.
- The shared shell/module assets remain the preferred owner for generic shell behavior; this local bridge is limited to GPU-specific assistant, references, recommended actions, decision schedule, and ledger rendering.

Revisit trigger:
- Revisit this local exception when the next non-CPU/RAM Compute calculator shell proof starts.
- Revisit this local exception if another Compute tool needs the same assistant, recommendation references, recommended actions, decision schedule, or ledger bridge structure.
- If the same structure is reused outside GPU VRAM, promote the generic rendering behavior into a shared Compute assistant/output adapter and leave only tool-specific calculation copy in the page script.

Audit:
- scripts/audit-compute-gpu-vram-shell-proof-v1.js



### COMPUTE-GPU-VRAM-LAYOUT-PARITY-LOCAL-0622

Status: APPROVED_LOCAL_EXCEPTION

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js

Approved local exception: GPU VRAM is the current Compute proof target for calculator layout parity and visual wrapper show/hide parity. This repair is approved locally because it removes malformed GPU-specific export/report fragments and aligns GPU section order to the accepted CPU/RAM calculator layout before a shared Compute calculator layout contract is promoted.

Revisit trigger: Revisit when the next non-CPU/RAM Compute calculator layout repair starts, or if another calculator needs the same section-order/report-metadata/user-notes/visual-wrapper repair.

Audit:
- scripts/audit-compute-gpu-vram-layout-parity-v1.js


### COMPUTE-GPU-VRAM-TOP-CHROME-PARITY-LOCAL-0622

Status: APPROVED_LOCAL_EXCEPTION

Changed path:
- tools/compute/gpu-vram/index.html

Approved local exception: GPU VRAM is the current Compute proof target for top chrome parity against the accepted CPU/RAM calculator rhythm. This local repair removes visible GPU-only top chrome clutter while preserving hidden shell anchors and auth/checkout behavior.

Revisit trigger: Revisit when the next non-CPU/RAM Compute calculator top chrome cleanup starts, or if another calculator needs the same breadcrumb, tier chip, design-flow card, or best-for-line suppression.

Audit:
- scripts/audit-compute-gpu-vram-top-chrome-parity-v1.js


### COMPUTE-GPU-VRAM-INPUT-CARD-PARITY-LOCAL-0622

Status: APPROVED_LOCAL_EXCEPTION

Changed path:
- tools/compute/gpu-vram/index.html

Approved local exception: GPU VRAM is the current Compute proof target for input-card parity against the accepted CPU/RAM calculator rhythm. This local repair removes duplicate input-section labeling and levels the engineering input grid while preserving calculation input IDs and downstream planning data.

Revisit trigger: Revisit when the next non-CPU/RAM Compute calculator needs an engineering factors input block, or when this pattern is promoted into a reusable Compute engineering input card contract.

Audit:
- scripts/audit-compute-gpu-vram-input-card-parity-v1.js


### COMPUTE-GPU-VRAM-LEGACY-RESULTS-LEDGER-PARITY-LOCAL-0622

Status: APPROVED_LOCAL_EXCEPTION

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js

Approved local exception: GPU VRAM is the current Compute proof target for legacy results and internal ledger parity. This local repair hides the old visible result/analysis source blocks while preserving calculation values, internal ledger payload, session flow data, carryover publishing, and shell proof rendering.

Revisit trigger: Revisit when the next non-CPU/RAM Compute calculator still exposes legacy visible results outside the modern assistant/visual stack, or when this pattern is promoted into a reusable Compute calculator hidden-results/ledger contract.

Audit:
- scripts/audit-compute-gpu-vram-legacy-results-ledger-parity-v1.js


### COMPUTE-GPU-VRAM-CAPACITY-ENVELOPE-PARITY-LOCAL-0622

Status: APPROVED_LOCAL_PROOF

Changed path:
- tools/compute/gpu-vram/script.js
- tools/compute/gpu-vram/index.html

Approved local proof: GPU VRAM is the current Compute proof target for capacity-envelope visual parity. This local proof keeps GPU math/status untouched while replacing the old blue SVG chart grammar with a CPU/RAM-style dark CAD capacity envelope, marker-ring dots, chart-linked *1/*2/*3 references, and usable/installed rail labels.

Revisit trigger: Promote into assets/scopedlabs-compute-capacity-visuals.js after live visual acceptance by adding buildGpuCapacityEnvelopeSvg/renderGpuCapacityEnvelope and routing GPU type explicitly instead of relying on the current CPU/RAM-only shared visual module.

Audit:
- scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js


### COMPUTE-GPU-VRAM-CAPACITY-ENVELOPE-POLISH-0622

Status: APPROVED_LOCAL_PROOF_POLISH

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js

Approved local proof polish: Lane 4 GPU VRAM Capacity Envelope polish removes remaining blue visual treatment, normalizes the GPU engineering result and chart wrapper to the green/dark Compute card language, and separates/centers the smaller *1/*2/*3 chart reference legend.

Revisit trigger: Promote accepted GPU envelope behavior into assets/scopedlabs-compute-capacity-visuals.js after live visual acceptance.

Audit:
- scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js


### COMPUTE-GPU-VRAM-CAPACITY-ENVELOPE-RAM-PARITY-0622

Status: APPROVED_LOCAL_PROOF_POLISH

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js

Approved local proof polish: GPU VRAM chart is corrected to match accepted RAM rhythm by removing the inline chart legend row, keeping Recommendation References below the chart, restoring GOOD/WATCH/RISK band labels inside the chart, and removing remaining blue edge treatment.

Revisit trigger: Promote accepted GPU envelope behavior into assets/scopedlabs-compute-capacity-visuals.js after live acceptance.

Audit:
- scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js


### COMPUTE-GPU-VRAM-CAPACITY-ENVELOPE-RAM-POLISH-0622B

Status: APPROVED_LOCAL_PROOF_POLISH

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js

Approved local proof polish: Removes visible chart footnote labels and evicts the remaining blue chart/card edge while preserving marker linkage and the Recommendation References card below the GPU chart.

Revisit trigger: Promote accepted GPU envelope behavior into assets/scopedlabs-compute-capacity-visuals.js after live acceptance.

Audit:
- scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js


### COMPUTE-GPU-VRAM-CAPACITY-ENVELOPE-CLARITY-0622C

Status: APPROVED_LOCAL_PROOF_POLISH

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js

Approved local proof polish: Keeps WATCH/RISK math untouched while making the GPU chart clearer: the right-side rail is now a green capacity/usable rail marker, threshold lines are labeled, and the remaining blue chart edge is evicted.

Revisit trigger: Promote accepted GPU envelope behavior into assets/scopedlabs-compute-capacity-visuals.js after live acceptance.

Audit:
- scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js


### COMPUTE-GPU-VRAM-CAPACITY-ENVELOPE-REQUIRED-STATUS-0622D

Status: APPROVED_LOCAL_PROOF_POLISH

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js

Approved local proof polish: Required VRAM is now the final plotted workload/status point. Usable VRAM is a horizontal capacity rail only, preserving the correct WATCH/RISK math while removing the misleading visual impression that the status point is in the risk zone.

Audit:
- scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js


### COMPUTE-GPU-VRAM-CAPACITY-ENVELOPE-REQUIRED-STATUS-AUDIT-0622E

Status: APPROVED_LOCAL_PROOF_AUDIT_ALIGNMENT

Changed path:
- scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js
- docs/scopedlabs-module-map.md

Approved audit alignment: The GPU VRAM capacity-envelope audit now matches the accepted visual behavior. Demand and Required remain the plotted workload/status points. Usable VRAM is a horizontal capacity rail only. *3 is preserved through Recommendation References / capacity-rail context, not as a plotted workload marker.

Audit:
- scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js


### COMPUTE-GPU-VRAM-PROOF-STACK-PARITY-0624A

Status: LOCAL_PROOF_GATE

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Proof target: GPU VRAM Recommendation References / Recommended Actions / Decision Schedule parity with RAM-style proof rhythm.

Contract:
- Recommendation References sits below the GPU VRAM Capacity Envelope.
- Recommended Actions follows Recommendation References.
- GPU VRAM Decision Schedule follows Recommended Actions.
- User Tool Notes remains below the proof stack.
- *1 explains demand basis.
- *2 explains Required as the status-driving point.
- *3 explains usable/installed VRAM as capacity rail context, not as a plotted workload marker.

Audit:
- scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js


### COMPUTE-GPU-VRAM-PROOF-STACK-EVENT-BRIDGE-0624F

Status: LOCAL_PROOF_GATE_FIX

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Fix: GPU VRAM now uses a local proof-stack event bridge. renderGpuEngineeringPlan() dispatches the active plan after chart render, and the shell proof bridge listens to populate Recommendation References, Recommended Actions, and GPU VRAM Decision Schedule.

Audit:
- scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js


### COMPUTE-GPU-VRAM-PROOF-STACK-POLISH-0624G

Status: LOCAL_PROOF_POLISH

Changed path:
- tools/compute/gpu-vram/index.html
- scripts/audit-compute-gpu-vram-proof-stack-polish-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Polish: GPU VRAM proof stack now uses structured proof-card styling for Recommendation References, Recommended Actions, and GPU VRAM Decision Schedule.

Audit:
- scripts/audit-compute-gpu-vram-proof-stack-polish-v1.js


### COMPUTE-GPU-VRAM-PROOF-STACK-RAM-RHYTHM-0624H

Status: LOCAL_PROOF_POLISH

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-proof-stack-ram-rhythm-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Polish: GPU VRAM Recommended Actions and GPU VRAM Decision Schedule now follow RAM's accepted proof-card rhythm: stacked action rows and a structured decision schedule with status summary and table.

Audit:
- scripts/audit-compute-gpu-vram-proof-stack-ram-rhythm-v1.js


### COMPUTE-GPU-VRAM-PROOF-STACK-PARITY-VERSION-ALIGNMENT-0624H

Status: LOCAL_PROOF_AUDIT_ALIGNMENT

Changed path:
- scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Audit alignment: The GPU proof-stack parity audit now accepts the current RAM-rhythm script version while still checking that the event bridge wiring remains present.

Audit:
- scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js


### COMPUTE-GPU-VRAM-PROOF-STACK-TABLE-RESET-0624I

Status: LOCAL_PROOF_POLISH

Changed path:
- tools/compute/gpu-vram/index.html
- scripts/audit-compute-gpu-vram-proof-stack-table-reset-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Polish: GPU VRAM Decision Schedule now resets the earlier proof-card grid styling and renders as a RAM-style desktop decision table with Group / Metric / Value / Engineering Note columns.

Audit:
- scripts/audit-compute-gpu-vram-proof-stack-table-reset-v1.js


### COMPUTE-GPU-VRAM-PROOF-STACK-REFERENCE-RHYTHM-0624J

Status: LOCAL_PROOF_POLISH

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-proof-stack-reference-rhythm-v1.js
- scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js
- scripts/audit-compute-gpu-vram-proof-stack-ram-rhythm-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Polish: GPU VRAM Recommendation References now follows RAM's accepted Marker / Reference / Reason table rhythm.

Audit:
- scripts/audit-compute-gpu-vram-proof-stack-reference-rhythm-v1.js


### COMPUTE-GPU-VRAM-EXPORT-PARITY-0624K

Status: LOCAL_EXPORT_PARITY

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-export-parity-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Export parity: GPU VRAM now exposes a custom export payload builder that carries the capacity envelope SVG, recommendation references, recommended actions, and decision schedule into the generated report.

Audit:
- scripts/audit-compute-gpu-vram-export-parity-v1.js


### COMPUTE-GPU-VRAM-EXPORT-CARD-PLACEMENT-0624L

Status: LOCAL_LAYOUT_PARITY

Changed path:
- tools/compute/gpu-vram/index.html
- scripts/audit-compute-gpu-vram-export-card-placement-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Layout parity: GPU VRAM Export Report card now sits in the Planning Inputs card after Calculate/Reset, matching RAM's accepted export card placement.

Audit:
- scripts/audit-compute-gpu-vram-export-card-placement-v1.js


### COMPUTE-GPU-VRAM-EXPORT-DYNAMIC-PLACEMENT-0624M

Status: LOCAL_DYNAMIC_LAYOUT_PARITY

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-export-dynamic-placement-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Layout parity: GPU VRAM Export Report starts under inputs before calculation and moves below the rendered proof stack after calculation, matching the accepted Compute export rhythm.

Audit:
- scripts/audit-compute-gpu-vram-export-dynamic-placement-v1.js


### COMPUTE-GPU-VRAM-EXPORT-CARD-CTA-PLACEMENT-0624N

Status: LOCAL_LAYOUT_PARITY

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-export-card-cta-placement-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Layout parity: GPU VRAM Review Compute Summary CTA now sits inside the Export Report card below User Tool Notes so the final action travels with the export/report block.

Audit:
- scripts/audit-compute-gpu-vram-export-card-cta-placement-v1.js


### COMPUTE-GPU-VRAM-PROMOTION-CLOSEOUT-0627

Status: ACCEPTED_COMPUTE_PROOF_BASELINE

Changed path:
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-promotion-closeout-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Accepted baseline:
- GPU VRAM Capacity Envelope is accepted with Demand basis and Required/status-driving point as the plotted markers, and usable/installed VRAM as capacity rails.
- Recommendation References, Recommended Actions, and GPU VRAM Decision Schedule follow RAM's accepted proof-card rhythm.
- GPU VRAM exports use a custom payload builder and carry chart, references, actions, decision schedule, metadata, and User Tool Notes.
- Export Report uses dynamic placement: under inputs before calculation, below the rendered proof/result stack after calculation.
- Review Compute Summary CTA sits inside the Export Report card below User Tool Notes.

Promotion decision:
- Keep this as an accepted local Compute proof baseline for now.
- Do not extract into shared modules until another Compute tool needs the same full GPU/RAM-style proof/export/dynamic-placement behavior.

Audit:
- scripts/audit-compute-gpu-vram-promotion-closeout-v1.js


### COMPUTE-GPU-VRAM-EXPORT-REFERENCE-WIDTHS-0627

Status: ACCEPTED_EXPORT_REPORT_POLISH

Changed path:
- assets/scopedlabs-compute-export-proof-tables.js
- tools/compute/gpu-vram/index.html
- tools/compute/gpu-vram/script.js
- scripts/audit-compute-gpu-vram-export-reference-column-widths-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Decision:
- GPU VRAM export Recommendation References should match the Decision Schedule readability rhythm.
- Marker column is narrow, Reference is compact, and Reason receives the wide text column.
- Accepted width split: 12% / 23% / 65%.

Guardrail:
- This is visual/export readability polish only. Preserve accepted GPU VRAM Capacity Envelope behavior and proof/export route contracts.

Audit:
- scripts/audit-compute-gpu-vram-export-reference-column-widths-v1.js

### COMPUTE-SUMMARY-DATA-CONTRACT-AUDIT-V1
- Date: 2026-06-27
- Status: Accepted audit foundation
- Scope: Compute CPU/RAM/GPU Summary readiness
- Notes: Confirms CPU/RAM/GPU share Compute plan-state ownership. Tracks RAM custom export payload parity and Summary plan-state consumption as WATCH items instead of reopening accepted tool visuals.

### COMPUTE_SUMMARY_MODULE_OWNERSHIP_0703

Accepted Compute Summary page-owned proof promoted to reusable module-owned baseline. The Summary page now consumes `assets/scopedlabs-compute-summary.css` and `assets/scopedlabs-compute-summary.js`, with export config intentionally kept inline before shared report/export assets. Guarded by `scripts/audit-compute-summary-module-ownership-v1.js`.

### COMPUTE_SUMMARY_CLEAR_SUMMARY_TOOL_NOTES_0703

Compute Summary module-owned proof now includes an explicit clear control for Summary Tool Notes. This keeps persistent local-browser notes editable and removable from the Summary page without affecting per-tool notes.

## COMPUTE_STORAGE_IOPS_CAPACITY_ENVELOPE_LOCKED_PROMOTED_0705

- Status: Accepted and promoted.
- Pattern type: Shared Compute capacity visual, Storage IOPS-specific renderer.
- Owner: `assets/scopedlabs-compute-capacity-visuals.js`.
- First consumer: `tools/compute/storage-iops/`.
- Locked behavior: centered title/subtitle, status badge only, CPU-family risk color, horizontal capacity bands, dynamic headroom/deficit bracket, base/burst/required callouts, and inline SVG footer chips for storage tier, workload pattern, RAID penalty, latency target, and block size.
- Guardrail: future Compute tools may reuse the shared visual contract style, but must not create a new chart layout unless explicitly approved.

## Compute Quiet Closeout Runner Pattern ? Promoted 2026-07-05

Source proof: Storage IOPS closeout runner.

Accepted behavior:
- Use a single quiet runner command for each modernized Compute tool lane.
- Runner output should show overall PASS/FAIL, pass/fail counts, failed sections, passed sections, and git status.
- Keep full audit detail available in the underlying audit scripts, but make the closeout runner paste-friendly for long chats.
- Include syntax checks, visual/layout audit, planning shell audit, module map audit when applicable, and git status.
- Treat the runner as the final checkpoint before commit/push.
- Prefer creating the runner early in a tool lane so every later patch has the same verification command.

Current proof command:

```powershell
node .\scripts\run-compute-storage-iops-closeout-v1.js
```

Promotion rule:
- Future Compute tool modernization lanes should get a tool-specific closeout runner once the first accepted shell/visual/export structure is in place.
- The runner should not replace detailed audits; it should wrap them in a concise pass/fail summary.

- COMPUTE_CAPACITY_ZONE_BAND_CONTRACT_0705: Promoted visible GOOD/WATCH/RISK plot bands into the shared Compute Capacity Visuals module. Future capacity-envelope charts should reuse `buildCapacityZoneBands(plot, yGood, yWatch)` plus `computeCapacityZoneBandStyles()` before drawing grid/curve/markers, preserving readable background bands without per-tool duplication.

- COMPUTE_CAPACITY_INLINE_ICON_LIBRARY_0705: Promoted accepted Storage IOPS inline footer icon shapes into the shared Compute Capacity Visuals module. Future capacity-envelope footers should call `buildCapacityFooterStat(...)` with an icon key instead of embedding one-off SVG chip markup in each tool.

- COMPUTE_CAPACITY_GUIDE_LINE_CONTRACT_0705: Promoted full-height checkpoint guide lines and white dashed ceiling/threshold styling into the shared Compute Capacity Visuals module. Future capacity-envelope charts should call `buildCapacityCheckpointGuides(plot, checkpoints)` and `computeCapacityGuideLineStyles()` instead of one-off per-tool guide-line styling.

### COMPUTE-STORAGE-THROUGHPUT-PLANNER-ROUTING-0706

Status: PROMOTED_SHARED_CONTRACT

Changed path:
- assets/scopedlabs-compute-shell-contract.js
- tools/compute/storage-throughput/index.html
- tools/compute/storage-throughput/script.js
- scripts/audit-compute-storage-throughput-export-payload-v1.js
- scripts/audit-compute-storage-throughput-shell-parity-v1.js
- scripts/audit-compute-storage-throughput-top-chrome-cleanup-v1.js
- scripts/audit-compute-storage-throughput-promotion-closeout-v1.js
- scripts/run-compute-storage-throughput-promotion-closeout-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Decision:
- Storage Throughput is promoted as a planner-routing-aware Compute tool, not just a visual shell page.
- The shell owns KB pill cleanup, Active Workflow placement below the KB guide, generated Flow Context suppression, hidden result-summary behavior, and explicit Storage Throughput -> VM Density flow routing.
- The local calculator payload now exposes planner-assistant hints for future decisions: continue to VM Density, revisit Storage IOPS, branch to NIC Bonding, branch to Backup Window, or stop at Summary when storage work is complete.

Guardrail:
- Preserve the accepted Storage Throughput capacity visual, shared assistant status card, KB guide content, export/report/snapshot behavior, auth/checkout, and existing script order.

### COMPUTE-STORAGE-IOPS-PLANNER-ROUTING-0706

Status: PROMOTED_SHARED_CONTRACT

Changed path:
- tools/compute/storage-iops/index.html
- tools/compute/storage-iops/script.js
- scripts/audit-compute-storage-iops-planner-routing-closeout-v1.js
- scripts/run-compute-storage-iops-planner-routing-closeout-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Decision:
- Storage IOPS now publishes planner-routing fields so the Compute Planner assistant can choose direct continuation, revalidation, specialty branches, or Summary stop logic.
- Storage IOPS keeps the existing shared shell route into Storage Throughput.
- Storage IOPS branch hints now explicitly cover Storage Throughput, RAID Rebuild Time, Backup Window, and Summary.

Guardrail:
- Preserve accepted Storage IOPS capacity visual, shared assistant card, KB guide content, export/report/snapshot behavior, auth/checkout, and existing shell route ownership.

### COMPUTE-RAM-PLANNER-ROUTING-0706

Status: PROMOTED_SHARED_CONTRACT

Changed path:
- tools/compute/ram-sizing/index.html
- tools/compute/ram-sizing/script.js
- scripts/audit-compute-ram-planner-routing-closeout-v1.js
- scripts/run-compute-ram-planner-routing-closeout-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Decision:
- RAM Sizing now publishes planner-routing fields so the Compute Planner assistant can choose direct Storage IOPS continuation, GPU VRAM specialty branch, planner review, or Summary stop logic.
- RAM keeps existing shared shell/guided route behavior and shared visual/assistant ownership.

Guardrail:
- Preserve accepted RAM capacity visual, shared assistant card, KB guide content, export/report/snapshot behavior, auth/checkout, and existing shell route ownership.

### COMPUTE-CPU-PLANNER-ROUTING-0706

Status: PROMOTED_SHARED_CONTRACT

Changed path:
- tools/compute/cpu-sizing/index.html
- tools/compute/cpu-sizing/script.js
- scripts/audit-compute-cpu-planner-routing-closeout-v1.js
- scripts/run-compute-cpu-planner-routing-closeout-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Decision:
- CPU Sizing now publishes planner-routing fields through `cpuPipelineResult` so the Compute Planner assistant can choose direct RAM continuation, planner review, CPU-only Summary stop logic, and downstream branch awareness for storage, GPU, and VM density.
- CPU keeps existing shared shell route behavior and shared visual/assistant ownership.

Guardrail:
- Preserve accepted CPU capacity visual, shared assistant card, KB guide content, export/report/snapshot behavior, auth/checkout, and existing shell route ownership.

### COMPUTE-VM-DENSITY-TOOL-UPGRADE-0706

Status: TOOL_INTELLIGENCE_PROMOTED_BEFORE_FULL_SHELL

Changed path:
- tools/compute/vm-density/index.html
- tools/compute/vm-density/script.js
- assets/scopedlabs-compute-capacity-visuals.js
- assets/scopedlabs-compute-assistant-contract.js
- scripts/audit-compute-vm-density-tool-upgrade-v1.js
- scripts/run-compute-vm-density-tool-upgrade-v1.js
- docs/scopedlabs-module-map.md
- docs/scopedlabs-pattern-promotion-ledger.md

Decision:
- VM Density now publishes an enriched `vmDensityResult` instead of a minimal result object.
- VM Density exposes planner-routing fields and Compute-only specialty branches.
- Cross-category concerns are held as future Gold-tier handoff notes.
- Shared Compute visual and assistant contracts now own VM Density rendering hooks.

Guardrail:
- This is the tool upgrade foundation. A later shell-promotion lane may align the page more closely to the Storage Throughput visual shell after this payload/assistant/visual contract is proven.
