# Compute Tool Modernization Procedure

This guide is the required handoff procedure for modernizing ScopedLabs Compute tools into the planning pipeline. Use it before changing tool UI, renderer output, export behavior, or shell routing.

## Prime Rule

Do not start by inventing UI.

Start by finding the accepted completed source in the repo, identify the actual shared owner function/file, then wire the target tool into that pattern.

## 1. Read The Map And Guardrails First

Before touching code, inspect:

- `docs/scopedlabs-module-map.md`
- `docs/scopedlabs-pattern-promotion-ledger.md`
- the target tool's existing audit scripts
- the closest completed reference tool audit
- the target tool page and script
- the shared Compute owner files

The agent must identify:

- accepted reference tool
- shared owner files
- protected non-goals
- cache-bust pattern
- expected downstream route
- export/report owner
- active workflow owner

## 2. Upgrade Inputs First

The first implementation step is to upgrade the tool from a one-off calculator into a planning-pipeline step.

The tool result should expose:

- normalized planning inputs
- enriched result payload
- workload/planner context
- status/risk
- recommended downstream route
- ledger/export-ready payload
- assistant-ready result data

The planner page is the command center. Each tool is a pipeline station. The Summary page is the master assistant.


## Planner-Owned Routing Matrix

The Compute Workload Planner is the command center. Its Planning Path dropdown and Branch Starters define the intended route before the user enters downstream tools.

The planner should own the route decision. Individual tools should ask the shared planner/shell state for the next required step instead of hardcoding a local Continue target.

Current Planning Path values:

| Planning Path Value | Planner Label | Default Branches | Route Intent |
| --- | --- | --- | --- |
| `standard-server` | Standard Server - start at CPU Sizing | none by default | Core sizing path, then Summary |
| `vm-host` | VM Host / Consolidation - flag VM Density | VM Density | CPU/RAM context, VM Density, then Summary |
| `database` | Database / Transactional - flag storage IOPS | Storage IOPS / Throughput | CPU/RAM context, storage IOPS/Throughput, then Summary |
| `storage-heavy` | Storage-heavy workload - flag IOPS and throughput | Storage IOPS / Throughput | Storage path, then Summary, with CPU/RAM context only when required |
| `gpu-ai` | GPU / AI / acceleration - open GPU branch | GPU VRAM | GPU branch, then Summary, with prerequisites only when required |
| `backup-recovery` | Backup / Recovery validation - flag backup and RAID | RAID Rebuild, Backup Window | Protection branch, then Summary |
| `power-constrained` | Power / thermal constrained - flag infrastructure review | Power / Thermal | Infrastructure branch, then Summary |
| `network-constrained` | Network constrained - flag NIC bonding review | NIC Bonding | Network branch, then Summary |

Branch Starters can add supporting checks on top of the selected Planning Path. The selected path and branch flags together form the route matrix.

Modernized tools must preserve and honor this planner route. Do not force every workload through the full core chain when the planner selected a specialty destination.

Before changing routing, inspect:

- `tools/compute/workload-planner/index.html`
- `tools/compute/workload-planner/script.js`
- `assets/scopedlabs-compute-plan-state.js`
- `assets/scopedlabs-compute-planner-adapter.js`
- `assets/scopedlabs-compute-shell-contract.js`
- the target tool script and audit

Future improvement target: promote the route matrix into one shared resolver so each Compute tool can ask for the next required tool from active workload state and completed checkpoints.

## 3. Identify The Correct Completed Reference

Use the module map, then inspect the actual source.

Current Compute references:

- Planning/workflow context: Storage IOPS and `ScopedLabsComputePlanState.buildWorkloadDisplayContext()`
- Output rhythm: Storage Throughput
- Active Workflow card: shared shell contract
- Capacity SVG/chips/markers: `assets/scopedlabs-compute-capacity-visuals.js`
- Summary/references/actions/schedule: `assets/scopedlabs-compute-assistant-contract.js`
- Back/Continue routing: `assets/scopedlabs-compute-shell-contract.js`
- Export metadata/report shell: Storage Throughput pattern

Do not copy from screenshots. Verify the source function/file.

## 4. Promote Through Shared Owners

Do not build final UI as page-local workaround code when a shared owner exists.

Typical ownership:

- `assets/scopedlabs-compute-shell-contract.js`: workflow cards, routing, shell cleanup, flow actions
- `assets/scopedlabs-compute-assistant-contract.js`: result summary, references, recommended actions, decision schedule
- `assets/scopedlabs-compute-capacity-visuals.js`: planning/capacity SVGs, chart markers, footer chips
- `tools/compute/<tool>/index.html`: mounts, shared asset loading, cache-busts, export config
- `tools/compute/<tool>/script.js`: calculation, normalization, shared renderer calls, export payload
- `scripts/audit-<tool>-*.js`: guardrails
- `docs/scopedlabs-module-map.md`: ownership record

## 5. Use Standard Output Rhythm

Modern Compute tools should follow this visible rhythm unless the module map documents an exception:

1. Active Workflow
2. Planning Inputs
3. Result Summary
4. Capacity or Planning Visual
5. Recommendation References
6. Assistant Recommended Actions
7. Decision Schedule
8. Export
9. Continue

Avoid duplicate workflow cards, duplicate KB cards, visible debug Flow Context, or local fallback UI as final output.

## 6. Wire Shared Renderers Once

Tool scripts should call shared owners directly:

- `window.ScopedLabsComputeCapacityVisuals`
- `window.ScopedLabsComputeAssistant`
- `window.ScopedLabsComputeShellContract`
- `window.ScopedLabsComputePlanState`

Avoid:

- frozen namespace extension bugs
- ad hoc workflow titles
- local-only final renderers
- hidden result state that export cannot see
- duplicate cards from page and shell rendering the same section

## 7. Add Guardrails Before Polish

The audit should prove:

- shared assets are loaded
- cache-busts are current
- section order is correct
- shared owner owns each section
- duplicate local UI is removed
- route is correct
- export includes modern sections
- workflow context comes from shared plan state
- chart markers match references when applicable
- docs/module map is updated
- protected non-goals are preserved

## 8. Patch In One Focused Pass

Preferred sequence:

1. inspect reference tool
2. inspect target tool
3. inspect shared module owner
4. patch target and shared owners
5. patch audit
6. patch module map
7. run checks
8. fix only failing guardrails
9. commit after green

The goal is not trial and error. The goal is source-owner verification, then one focused implementation.

## 9. Minimum Closeout

Run targeted checks from repo root:

```powershell
node --check assets/scopedlabs-compute-shell-contract.js
node --check assets/scopedlabs-compute-assistant-contract.js
node --check assets/scopedlabs-compute-capacity-visuals.js
node --check tools/compute/<tool>/script.js
node --check scripts/audit-<tool>-*.js
node .\scripts\audit-<tool>-*.js
node .\scripts\run-<tool>-closeout*.js
git status --short
```

Only broaden testing when the change touches shared behavior used by multiple tools.

## 10. Update The Module Map Every Time

Every modernization lane must add or update a compact ownership entry in `docs/scopedlabs-module-map.md`.

Include:

- target tool
- accepted reference source
- active workflow owner
- assistant/output owner
- visual owner
- export owner
- route owner
- audit owner
- non-goals

## 11. Commit Only After Green

Commit only when:

- audit passes
- closeout passes
- module map is updated
- live cache-busts are included
- `git status --short` contains only intended files

## Operating Philosophy

The planner page is the command center. Each tool has its own assistant. The Summary page is the master assistant. Shared modules own reusable behavior. Tool scripts own tool-specific calculation, normalization, and payload handoff.

Modernize by promoting the tool into the planning pipeline, not by styling around old calculator behavior.
