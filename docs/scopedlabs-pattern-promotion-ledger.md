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

## Approved local exceptions

None.
