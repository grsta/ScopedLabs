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
