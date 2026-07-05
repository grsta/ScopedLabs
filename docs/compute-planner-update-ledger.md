# Compute Planner Update Ledger

Purpose: track Compute tools that will need planner, guided-flow, summary, or carry-forward updates after the remaining Compute tools are modernized. Planner code should stay frozen until this ledger is complete enough for one deliberate planner-routing lane.

## Planner strategy

- Do not update Compute Planner after every individual tool.
- Modernize remaining Compute tools first.
- Record route/carry-forward needs here during each tool lane.
- Run one final planner/guided-flow update after tool contracts are proven.
- Preserve standalone tool behavior unless the user starts Guided Flow.

## Tool ledger

| Tool | Shell status | Downstream route needed | Carry-forward fields | Planner LED/state impact | Summary eligibility | Export/snapshot status | Notes |
|---|---|---|---|---|---|---|---|
| CPU Sizing | Accepted / locked | CPU ? RAM | CPU workload, vCPU, utilization, growth/reserve | Existing guided route proven | Yes | Accepted | Do not reopen unless real bug |
| RAM Sizing | Accepted / locked | RAM ? GPU or Summary depending workload | RAM demand, installed/usable RAM, reserve | Existing guided route proven | Yes | Accepted | Do not reopen unless real bug |
| GPU VRAM | Mostly proven / visual accepted pending final closeout state check | GPU ? Summary or next applicable workload | GPU VRAM demand, installed/usable VRAM, workload pattern | Guided RAM/GPU route proven | Yes when applicable | Needs final state verification | Verify before planner lane |
| Storage IOPS | Accepted / locked | Storage IOPS ? Storage Throughput | Required IOPS, available IOPS, utilization, latency target, block size, status | Needs final planner wiring later | Yes after Throughput pair is ready | Accepted custom export | Locked 2026-07-05 |
| Storage Throughput | Next tool | Storage Throughput ? VM Density or Summary TBD | TBD | TBD | TBD | TBD | Build from Storage IOPS/RAM shell |
| VM Density | Pending | TBD | TBD | TBD | TBD | TBD | Inspect before patching |
| Power / Thermal | Pending | TBD | TBD | TBD | TBD | TBD | Inspect before patching |
| Backup Window | Pending specialty path | TBD | TBD | TBD | Optional/specialty | TBD | Likely not core guided requirement |
| NIC Bonding | Pending specialty path | TBD | TBD | TBD | Optional/specialty | TBD | Likely optional branch |
| RAID Rebuild Time | Pending specialty path | TBD | TBD | TBD | Optional/specialty | TBD | Related to storage resiliency |

## Final planner lane checklist

- Confirm all modernized tools expose stable payload/carry-forward fields.
- Confirm each tool has clear next route or optional-branch behavior.
- Confirm Summary only appears when applicable required path is complete.
- Confirm direct tool visits remain standalone.
- Confirm Guided Flow resumes pending selected workload instead of jumping to Summary too early.
- Add/update planner audits only after route map is stable.

## Planner contract map

Use this section during each Compute tool modernization lane. Do not wait until the final planner lane to discover routing, state, or carry-forward gaps.

Each tool should define:

- Tool role: core path, optional branch, specialty branch, or summary-only helper.
- Upstream dependency: previous tool result required for guided flow, if any.
- Standalone behavior: what happens when the tool is opened directly.
- Guided-flow behavior: when the planner may route into this tool.
- Downstream route: next tool or Summary route after a valid result.
- Planner-visible status: the authoritative status field the planner LED should trust.
- Carry-forward fields: exact field names future tools and Summary can consume.
- Invalidation targets: downstream tools that should reset if this result changes.
- Summary eligibility: whether this tool blocks Summary or contributes optionally.
- Export/snapshot readiness: whether the report payload is final enough for documentation.
- Closeout runner: the command that proves the tool before commit.

### Contract records

| Tool | Role | Upstream dependency | Guided-flow route | Downstream route | Planner-visible status | Required carry-forward fields | Summary rule | Closeout runner |
|---|---|---|---|---|---|---|---|---|
| Storage IOPS | Core storage path | None or planner workload | Route when storage path is selected | Storage Throughput | status | requiredIops, availableIops, utilizationPct, latencyTarget, blockSizeKb, dominantConstraint | Contributes after valid result; storage pair complete after Throughput | node .\\scripts\\run-compute-storage-iops-closeout-v1.js |
| Storage Throughput | Core storage path | Storage IOPS in guided flow; standalone allowed | Route after Storage IOPS when storage path is selected | VM Density or Summary TBD | status | requiredThroughputMBps, availableThroughputMBps, utilizationPct, headroomMBps, deficitMBps, datasetTB, transferWindowHours, transportPath, mediaTier, workloadType, dominantConstraint | TBD after upgraded tool contract is proven | TBD |
| VM Density | Core/compute placement path TBD | CPU, RAM, storage context TBD | TBD | TBD | TBD | TBD | TBD | TBD |
| Power / Thermal | Core infrastructure check TBD | CPU/RAM/GPU/VM density TBD | TBD | Summary or specialty TBD | TBD | TBD | TBD | TBD |
| Backup Window | Optional specialty branch | Storage Throughput or backup workload context TBD | Only route when selected or risk indicates need | Summary | status | TBD | Optional contributor | TBD |
| NIC Bonding | Optional specialty branch | Network/throughput context TBD | Only route when selected or transport bottleneck indicates need | Summary | status | TBD | Optional contributor | TBD |
| RAID Rebuild Time | Optional specialty branch | Storage/RAID context TBD | Only route when selected or resiliency risk indicates need | Summary | status | TBD | Optional contributor | TBD |

## Planner lane guardrail

The final Compute planner lane should use this map as the source of truth. Do not reopen each tool to infer routing unless the ledger is missing a required contract field.

## Agent handoff rule

Future agents should treat this ledger as the source of truth for Compute planner and guided-flow routing work.

Rules:
- Check this ledger before modifying Compute Planner, guided-flow routing, Summary eligibility, or planner LEDs.
- Do not infer routing from memory or from a single tool page when the ledger has a recorded contract.
- During each remaining Compute tool modernization lane, update that tool's contract row before closeout.
- Planner routing should stay frozen until the remaining Compute tools are modernized and this ledger is complete enough for one deliberate planner lane.
- If a tool contract is missing required carry-forward fields, inspect the tool first instead of guessing.
