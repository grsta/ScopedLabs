# Access Control Status Chip Contract V1

Date: 2026-06-11  
Category: Access Control  
Status: Contract draft / audit-backed / no live UI migration yet

## Purpose

This contract defines how Access Control decision/status chips should be standardized before page-local status CSS is removed or migrated.

The goal is to avoid tool-by-tool guessing. A tool should only be migrated after the shared contract, audit evidence, and visual/state behavior agree.

## Core Rule

Contract first.  
Audit second.  
Shared module third.  
Migration fourth.  
Main-gate promotion last.

No page-local status chip CSS should be removed simply because a selector name looks repeated.

## Included in V1

The V1 contract may cover small visible decision/status chips used to communicate state near a decision panel, result card, or assistant-style summary.

Examples of included chip states:

- safe
- healthy
- watch
- risk
- authority
- complete

The contract may include shared aliases for similar state names, but aliases must be explicit and audited.

## Excluded From V1

These are not part of the V1 cleanup lane:

- Export popup status controls such as `.export-status` and `#exportStatus`
- Hidden result cards
- `#results`
- `[data-result-ledger]`
- Carry-forward ledger state
- JavaScript that reads or writes result handoff payloads
- Scope Planner special-path status behavior
- Full local status/legend systems such as Fail Safe / Fail Secure until separately contracted
- Visual-only chips until inspected and approved

## Tier Future-Proofing

This contract must not hard-code a two-tier-only future.

Current live behavior may be Free/Pro-oriented, but shared modules, audits, and naming should leave room for a future Gold tier.

Gold behavior is a placeholder only until explicitly defined.

Tier-safe requirements:

- Do not rewrite auth or checkout flow.
- Do not change current Pro behavior.
- Do not introduce Gold-only behavior without a separate product decision.
- Keep tier-related selectors, CTAs, and audit buckets centralized where possible.
- Prefer generic tier hooks over page-specific tier hacks.

Suggested future audit buckets:

- `TIER_HOOK_REVIEW`
- `GOLD_READY_PLACEHOLDER`
- `PRO_BEHAVIOR_PRESERVED`
- `AUTH_CHECKOUT_UNTOUCHED`

## Required Audit Buckets

Status chip audits should classify tools into clear buckets before migration.

Required buckets:

- `CONTRACT_READY`
- `LOCAL_ALIAS_NEEDED`
- `PAGE_NAMED_KEEP`
- `EXPORT_STATUS_KEEP`
- `COMPLEX_STATUS_SYSTEM_KEEP`
- `VISUAL_CHIP_REVIEW`
- `SPECIAL_PATH_SKIP`
- `TIER_HOOK_REVIEW`
- `GOLD_READY_PLACEHOLDER`

## Current Access Control Evidence

Current status rendering map identifies:

- Visible decision/status review tools:
  - access-level-sizing
  - credential-format
  - fail-safe-fail-secure
  - lock-power-budget
  - panel-capacity
  - reader-type-selector

- Export-control-only tools:
  - anti-passback-zones
  - door-cable-length
  - door-count-planner
  - elevator-reader-count
  - special-locking-scope

- Special path:
  - scope-planner

Current shared coverage evidence shows no safe bulk status CSS removal yet.

Reader Type inspection showed local and shared chip styles are materially different:

- Local Reader Type chip is green/pill-style by default.
- Shared Reader Type chip is amber/rectangular by default.
- Local has `.is-watch`.
- Shared has `.is-safe` and `.is-healthy`.

Therefore Reader Type should be treated as an intentional local status style until the shared contract chooses the final standard.

## Migration Order

Recommended migration order:

1. Contract and audit only.
2. Define shared chip shape and state aliases.
3. Add shared status chip aliases in Access Control polish.
4. Migrate small decision chips first:
   - reader-type-selector
   - panel-capacity
   - access-level-sizing
   - credential-format
5. Inspect visual-chip variant:
   - lock-power-budget
6. Separately contract complex local status systems:
   - fail-safe-fail-secure
7. Only after exact shared coverage is proven, remove page-local CSS in guarded batches.

## Safety Rules

Do not touch:

- Hidden result cards
- Result ledgers
- Carry-forward JavaScript
- Export route adapters
- Snapshot behavior
- Auth flow
- Checkout flow
- Pipeline behavior
- Knowledge Base behavior
- Scope Planner special path

## Main Gate Promotion Rule

This contract should not be added to the Access Control main gates until:

- It produces low-noise audit output.
- It distinguishes export controls from visible decision chips.
- It separates page-named/local systems from shared chip candidates.
- It accounts for future Gold tier hooks without requiring Gold behavior.
- It fails only on true regressions, not review findings.
