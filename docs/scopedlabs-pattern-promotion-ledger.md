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
Notes: Shared Tool Shell owns assistant diagnostics and the category adapters own category-specific assistant behavior. Access Control uses assets/access-control-tool-assistant-adapters.js plus assets/access-control-report-summary.js. Physical Security uses assets/physical-security-local-assistant.js, assets/physical-security-tool-assistant-adapters.js, assets/physical-security-guidance-event-bridge.js, and assets/physical-security-category-guidance.js. Compute uses assets/scopedlabs-compute-assistant-contract.js while its Summary page remains pending.

## Approved local exceptions

None.
