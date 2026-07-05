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
