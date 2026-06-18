# compute Tool Planning Profile

Status: READ_ONLY_AUDIT_DRAFT
Generated: 2026-06-18
Audit script: `scripts/audit-scopedlabs-tool-planning-profile-v1.js`

---

## Category System Inventory

- Category: `compute`
- Planner / command page: `tools/compute/index.html`
- Summary / master assistant page: NOT DETECTED
- Tool-like pages detected: 11

This profile is read-only discovery output. Do not rewrite tool pages from this profile alone.

Required next step: review planner inputs, data contracts, visual families, shared icons, assistant/export/snapshot/pipeline modules, and category summary/master assistant needs before implementation.

---

## Category-Level Decisions To Review

- Planner / command shell needed: REVIEW
- Summary / master assistant shell needed: REVIEW
- Category visual families needed: REVIEW
- Category shared icon library needs: REVIEW
- Local assistant pattern: REVIEW
- Summary/master assistant publish contract: REVIEW
- Export/report family needs: REVIEW
- Snapshot/carry-forward needs: REVIEW
- Cross-category handoff needs: REVIEW

---

## Pages

### _category_index

- Mode: CATEGORY_PLANNER_COMMAND_PAGE
- File: `tools/compute/index.html`
- Title: Compute • ScopedLabs
- H1: Compute
- Feature scan: inputs=no | results=no | visual=no | assistant=no | export=yes | snapshot=yes | pipeline=yes | flow=no | kb=yes
- Watch items: None

#### Current detected inputs

- None detected

#### Current detected actions/buttons

- Read the Guide ? /guides/compute-planning/
- Start Guided Flow ? /tools/compute/workload-planner/

#### Loaded scripts

- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
- /assets/auth.js?v=auth-magiclink-session-restore-0527
- /assets/app.js?v=compute-cat-0385

#### Planning review fields

- Current purpose: REVIEW
- Missing planner inputs: REVIEW
- Data contract needed: REVIEW
- Visual family decision: REVIEW
- Shared icon/graphics needs: REVIEW
- Local assistant needs: REVIEW
- Export/report needs: REVIEW
- Snapshot needs: REVIEW
- Pipeline/carry-forward needs: REVIEW
- Summary/master assistant publish needs: REVIEW
- Proposed module wiring: REVIEW
- Closeout status: READ_ONLY_AUDIT_DRAFT

### backup-window

- Mode: TOOL_PAGE
- File: `tools/compute/backup-window/index.html`
- Title: Backup Window Estimator • ScopedLabs
- H1: Backup Window Estimator
- Feature scan: inputs=yes | results=yes | visual=yes | assistant=no | export=yes | snapshot=yes | pipeline=yes | flow=yes | kb=yes
- Watch items: WATCH_ASSISTANT_NOT_DETECTED

#### Current detected inputs

- dataTb
- changePct
- type
- mbps
- savingsPct
- overheadPct
- reportTitle
- projectName
- clientName
- preparedBy
- customNotes

#### Current detected actions/buttons

- calc ? Calculate
- reset ? Reset
- exportReport ? Open Export Report
- saveSnapshot ? Save Snapshot
- Back to Compute ? /tools/compute/
- Unlock Pro ? /upgrade/?category=compute#checkout
- Return to Compute → ? /tools/compute/

#### Loaded scripts

- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
- https://cdn.jsdelivr.net/npm/chart.js
- /assets/auth.js?v=auth-magiclink-session-restore-0527
- /assets/app.js?v=compute-backup-0424
- /assets/tool-flow.js?v=compute-backup-0424
- /assets/catalog.js?v=compute-backup-0424
- /assets/pipelines.js?v=compute-backup-0424
- /assets/pipeline-state.js?v=compute-backup-0424
- /assets/pipeline.js?v=compute-backup-0424
- /assets/analyzer.js?v=compute-backup-0424
- /assets/export.js?v=shared-export-025-tool-notes-column-widths
- ./script.js?v=compute-export-001
- /assets/help.js?v=help-026

#### Planning review fields

- Current purpose: REVIEW
- Missing planner inputs: REVIEW
- Data contract needed: REVIEW
- Visual family decision: REVIEW
- Shared icon/graphics needs: REVIEW
- Local assistant needs: REVIEW
- Export/report needs: REVIEW
- Snapshot needs: REVIEW
- Pipeline/carry-forward needs: REVIEW
- Summary/master assistant publish needs: REVIEW
- Proposed module wiring: REVIEW
- Closeout status: READ_ONLY_AUDIT_DRAFT

### cpu-sizing

- Mode: TOOL_PAGE
- File: `tools/compute/cpu-sizing/index.html`
- Title: CPU Sizing Estimator • ScopedLabs
- H1: CPU Sizing Estimator
- Feature scan: inputs=yes | results=yes | visual=yes | assistant=yes | export=yes | snapshot=yes | pipeline=yes | flow=yes | kb=yes
- Watch items: None

#### Current detected inputs

- workload
- concurrency
- cpuPerWorker
- peak
- targetUtil
- smt
- workloadPattern
- growthReserve
- platformOverhead
- osReserve
- coreEfficiency
- sustainedDerate
- failoverMultiplier

#### Current detected actions/buttons

- calc ? Calculate
- reset ? Reset
- exportReport ? Open Export Report
- saveSnapshot ? Save Snapshot
- Back to Compute ? /tools/compute/
- Continue → RAM Sizing ? /tools/compute/ram-sizing/

#### Loaded scripts

- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
- https://cdn.jsdelivr.net/npm/chart.js
- /assets/auth.js?v=auth-magiclink-session-restore-0527
- /assets/app.js?v=compute-export-001
- /assets/tool-flow.js?v=compute-export-001
- /assets/catalog.js?v=compute-export-001
- /assets/pipelines.js?v=compute-export-001
- /assets/pipeline-state.js?v=compute-export-001
- /assets/pipeline.js?v=compute-export-001
- /assets/analyzer.js?v=compute-export-001
- /assets/export.js?v=shared-export-025-tool-notes-column-widths
- /assets/scopedlabs-report-metadata.js?v=scopedlabs-report-metadata-008-access-control-category-scope-key
- /assets/scopedlabs-tool-shell.js?v=scopedlabs-tool-shell-009-print-diagnostics
- /assets/scopedlabs-compute-plan-state.js?v=scopedlabs-compute-plan-state-005-active-title
- /assets/scopedlabs-assistant-export.js?v=scopedlabs-assistant-export-002
- ./script.js?v=compute-cpu-export-payload-0616ad
- /assets/help.js?v=help-026
- /assets/scopedlabs-compute-shell-contract.js?v=scopedlabs-compute-shell-contract-001
- /assets/scopedlabs-local-assistant.js?v=scopedlabs-local-assistant-009-rich-card-shell
- /assets/scopedlabs-compute-assistant-contract.js?v=compute-assistant-reference-order-0616
- /assets/scopedlabs-user-tool-notes.js?v=scopedlabs-user-tool-notes-001-compute-proof

#### Planning review fields

- Current purpose: REVIEW
- Missing planner inputs: REVIEW
- Data contract needed: REVIEW
- Visual family decision: REVIEW
- Shared icon/graphics needs: REVIEW
- Local assistant needs: REVIEW
- Export/report needs: REVIEW
- Snapshot needs: REVIEW
- Pipeline/carry-forward needs: REVIEW
- Summary/master assistant publish needs: REVIEW
- Proposed module wiring: REVIEW
- Closeout status: READ_ONLY_AUDIT_DRAFT

### gpu-vram

- Mode: TOOL_PAGE
- File: `tools/compute/gpu-vram/index.html`
- Title: GPU VRAM Estimator • ScopedLabs
- H1: GPU VRAM Estimator
- Feature scan: inputs=yes | results=yes | visual=yes | assistant=no | export=yes | snapshot=yes | pipeline=yes | flow=yes | kb=yes
- Watch items: WATCH_ASSISTANT_NOT_DETECTED

#### Current detected inputs

- gpuMode
- reportTitle
- projectName
- clientName
- preparedBy
- customNotes
- modelGb
- batch
- perSampleMb
- jobs
- overhead

#### Current detected actions/buttons

- exportReport ? Open Export Report
- saveSnapshot ? Save Snapshot
- calc ? Calculate
- reset ? Reset
- Back to Compute ? /tools/compute/
- Unlock Pro ? /upgrade/?category=compute#checkout
- Continue → Power & Thermal ? /tools/compute/power-thermal/

#### Loaded scripts

- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
- https://cdn.jsdelivr.net/npm/chart.js
- /assets/auth.js?v=auth-magiclink-session-restore-0527
- /assets/app.js?v=compute-gpu-0424
- /assets/tool-flow.js?v=compute-gpu-0424
- /assets/catalog.js?v=compute-gpu-0424
- /assets/pipelines.js?v=compute-gpu-0424
- /assets/pipeline-state.js?v=compute-gpu-0424
- /assets/pipeline.js?v=compute-gpu-0424
- /assets/analyzer.js?v=compute-gpu-0424
- /assets/export.js?v=shared-export-025-tool-notes-column-widths
- ./script.js?v=compute-export-001
- /assets/help.js?v=help-026

#### Planning review fields

- Current purpose: REVIEW
- Missing planner inputs: REVIEW
- Data contract needed: REVIEW
- Visual family decision: REVIEW
- Shared icon/graphics needs: REVIEW
- Local assistant needs: REVIEW
- Export/report needs: REVIEW
- Snapshot needs: REVIEW
- Pipeline/carry-forward needs: REVIEW
- Summary/master assistant publish needs: REVIEW
- Proposed module wiring: REVIEW
- Closeout status: READ_ONLY_AUDIT_DRAFT

### nic-bonding

- Mode: TOOL_PAGE
- File: `tools/compute/nic-bonding/index.html`
- Title: NIC Bonding Planner * ScopedLabs
- H1: NIC Bonding Planner
- Feature scan: inputs=yes | results=yes | visual=yes | assistant=no | export=yes | snapshot=yes | pipeline=yes | flow=yes | kb=yes
- Watch items: WATCH_ASSISTANT_NOT_DETECTED

#### Current detected inputs

- links
- speed
- mode
- hash
- flows
- util
- reportTitle
- projectName
- clientName
- preparedBy
- customNotes

#### Current detected actions/buttons

- calc ? Calculate
- reset ? Reset
- exportReport ? Open Export Report
- saveSnapshot ? Save Snapshot
- Back to Compute ? /tools/compute/
- Unlock Pro ? /upgrade/

#### Loaded scripts

- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
- https://cdn.jsdelivr.net/npm/chart.js
- /assets/auth.js?v=auth-magiclink-session-restore-0527
- /assets/app.js?v=0408
- /assets/analyzer.js?v=compute-nic-standalone-006
- /assets/export.js?v=shared-export-025-tool-notes-column-widths
- ./script.js?v=compute-export-001
- /assets/help.js?v=help-026

#### Planning review fields

- Current purpose: REVIEW
- Missing planner inputs: REVIEW
- Data contract needed: REVIEW
- Visual family decision: REVIEW
- Shared icon/graphics needs: REVIEW
- Local assistant needs: REVIEW
- Export/report needs: REVIEW
- Snapshot needs: REVIEW
- Pipeline/carry-forward needs: REVIEW
- Summary/master assistant publish needs: REVIEW
- Proposed module wiring: REVIEW
- Closeout status: READ_ONLY_AUDIT_DRAFT

### power-thermal

- Mode: TOOL_PAGE
- File: `tools/compute/power-thermal/index.html`
- Title: Compute Power & Thermal • ScopedLabs
- H1: Compute Power & Thermal
- Feature scan: inputs=yes | results=yes | visual=yes | assistant=no | export=yes | snapshot=yes | pipeline=yes | flow=yes | kb=yes
- Watch items: WATCH_ASSISTANT_NOT_DETECTED

#### Current detected inputs

- nodes
- watts
- peak
- overhead
- reportTitle
- projectName
- clientName
- preparedBy
- customNotes

#### Current detected actions/buttons

- calc ? Calculate
- reset ? Reset
- exportReport ? Open Export Report
- saveSnapshot ? Save Snapshot
- Back to Compute ? /tools/compute/
- Unlock Pro ? /upgrade/?category=compute#checkout
- Continue → RAID Rebuild ? /tools/compute/raid-rebuild-time/

#### Loaded scripts

- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
- https://cdn.jsdelivr.net/npm/chart.js
- /assets/auth.js?v=auth-magiclink-session-restore-0527
- /assets/app.js?v=compute-power-0424
- /assets/tool-flow.js?v=compute-power-0424
- /assets/catalog.js?v=compute-power-0424
- /assets/pipelines.js?v=compute-power-0424
- /assets/pipeline-state.js?v=compute-power-0424
- /assets/pipeline.js?v=compute-power-0424
- /assets/analyzer.js?v=compute-power-0424
- /assets/export.js?v=shared-export-025-tool-notes-column-widths
- ./script.js?v=compute-export-001
- /assets/help.js?v=help-026

#### Planning review fields

- Current purpose: REVIEW
- Missing planner inputs: REVIEW
- Data contract needed: REVIEW
- Visual family decision: REVIEW
- Shared icon/graphics needs: REVIEW
- Local assistant needs: REVIEW
- Export/report needs: REVIEW
- Snapshot needs: REVIEW
- Pipeline/carry-forward needs: REVIEW
- Summary/master assistant publish needs: REVIEW
- Proposed module wiring: REVIEW
- Closeout status: READ_ONLY_AUDIT_DRAFT

### raid-rebuild-time

- Mode: TOOL_PAGE
- File: `tools/compute/raid-rebuild-time/index.html`
- Title: RAID Rebuild Time • ScopedLabs
- H1: RAID Rebuild Time
- Feature scan: inputs=yes | results=yes | visual=yes | assistant=no | export=yes | snapshot=yes | pipeline=yes | flow=yes | kb=yes
- Watch items: WATCH_ASSISTANT_NOT_DETECTED

#### Current detected inputs

- driveTb
- mbps
- load
- raid
- verify
- reportTitle
- projectName
- clientName
- preparedBy
- customNotes

#### Current detected actions/buttons

- calc ? Calculate
- reset ? Reset
- exportReport ? Open Export Report
- saveSnapshot ? Save Snapshot
- Back to Compute ? /tools/compute/
- Unlock Pro ? /upgrade/?category=compute#checkout
- Continue → Backup Window ? /tools/compute/backup-window/

#### Loaded scripts

- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
- https://cdn.jsdelivr.net/npm/chart.js
- /assets/auth.js?v=auth-magiclink-session-restore-0527
- /assets/app.js?v=compute-raid-0424
- /assets/tool-flow.js?v=compute-raid-0424
- /assets/catalog.js?v=compute-raid-0424
- /assets/pipelines.js?v=compute-raid-0424
- /assets/pipeline-state.js?v=compute-raid-0424
- /assets/pipeline.js?v=compute-raid-0424
- /assets/analyzer.js?v=compute-raid-0424
- /assets/export.js?v=shared-export-025-tool-notes-column-widths
- ./script.js?v=compute-export-001
- /assets/help.js?v=help-026

#### Planning review fields

- Current purpose: REVIEW
- Missing planner inputs: REVIEW
- Data contract needed: REVIEW
- Visual family decision: REVIEW
- Shared icon/graphics needs: REVIEW
- Local assistant needs: REVIEW
- Export/report needs: REVIEW
- Snapshot needs: REVIEW
- Pipeline/carry-forward needs: REVIEW
- Summary/master assistant publish needs: REVIEW
- Proposed module wiring: REVIEW
- Closeout status: READ_ONLY_AUDIT_DRAFT

### ram-sizing

- Mode: TOOL_PAGE
- File: `tools/compute/ram-sizing/index.html`
- Title: RAM Sizing Estimator • ScopedLabs
- H1: RAM Sizing Estimator
- Feature scan: inputs=yes | results=yes | visual=yes | assistant=yes | export=yes | snapshot=yes | pipeline=yes | flow=yes | kb=yes
- Watch items: None

#### Current detected inputs

- workload
- concurrency
- perProc
- osGb
- headroom
- reportTitle
- projectName
- clientName
- preparedBy
- customNotes

#### Current detected actions/buttons

- calc ? Calculate
- reset ? Reset
- exportReport ? Open Export Report
- saveSnapshot ? Save Snapshot
- continue ? Continue ? Storage IOPS
- Back to Compute ? /tools/compute/

#### Loaded scripts

- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
- https://cdn.jsdelivr.net/npm/chart.js
- /assets/auth.js?v=auth-magiclink-session-restore-0527
- /assets/app.js?v=0420
- /assets/tool-flow.js?v=ram-pipeline-020
- /assets/catalog.js?v=ram-pipeline-020
- /assets/pipelines.js?v=ram-pipeline-020
- /assets/pipeline-state.js?v=ram-pipeline-020
- /assets/pipeline.js?v=ram-pipeline-020
- /assets/analyzer.js?v=ram-pipeline-020
- /assets/export.js?v=shared-export-025-tool-notes-column-widths
- /assets/scopedlabs-compute-capacity-visuals.js?v=scopedlabs-compute-capacity-visuals-002-ram-shell
- ./script.js?v=compute-ram-shell-capacity-0617b
- /assets/help.js?v=help-026

#### Planning review fields

- Current purpose: REVIEW
- Missing planner inputs: REVIEW
- Data contract needed: REVIEW
- Visual family decision: REVIEW
- Shared icon/graphics needs: REVIEW
- Local assistant needs: REVIEW
- Export/report needs: REVIEW
- Snapshot needs: REVIEW
- Pipeline/carry-forward needs: REVIEW
- Summary/master assistant publish needs: REVIEW
- Proposed module wiring: REVIEW
- Closeout status: READ_ONLY_AUDIT_DRAFT

### storage-iops

- Mode: TOOL_PAGE
- File: `tools/compute/storage-iops/index.html`
- Title: Storage IOPS Estimator • ScopedLabs
- H1: Storage IOPS Estimator
- Feature scan: inputs=yes | results=yes | visual=yes | assistant=no | export=yes | snapshot=yes | pipeline=yes | flow=yes | kb=yes
- Watch items: WATCH_ASSISTANT_NOT_DETECTED

#### Current detected inputs

- tps
- reads
- writes
- penalty
- headroom
- reportTitle
- projectName
- clientName
- preparedBy
- customNotes

#### Current detected actions/buttons

- calc ? Calculate
- reset ? Reset
- exportReport ? Open Export Report
- saveSnapshot ? Save Snapshot
- continue ? Continue → Storage Throughput

#### Loaded scripts

- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
- https://cdn.jsdelivr.net/npm/chart.js
- /assets/auth.js?v=auth-magiclink-session-restore-0527
- /assets/app.js?v=0403
- /assets/tool-flow.js?v=compute-iops-005
- /assets/catalog.js?v=compute-iops-005
- /assets/pipelines.js?v=compute-iops-005
- /assets/pipeline-state.js?v=compute-iops-005
- /assets/pipeline.js?v=compute-iops-005
- /assets/analyzer.js?v=compute-iops-005
- /assets/export.js?v=shared-export-025-tool-notes-column-widths
- ./script.js?v=compute-export-001
- /assets/help.js?v=help-026

#### Planning review fields

- Current purpose: REVIEW
- Missing planner inputs: REVIEW
- Data contract needed: REVIEW
- Visual family decision: REVIEW
- Shared icon/graphics needs: REVIEW
- Local assistant needs: REVIEW
- Export/report needs: REVIEW
- Snapshot needs: REVIEW
- Pipeline/carry-forward needs: REVIEW
- Summary/master assistant publish needs: REVIEW
- Proposed module wiring: REVIEW
- Closeout status: READ_ONLY_AUDIT_DRAFT

### storage-throughput

- Mode: TOOL_PAGE
- File: `tools/compute/storage-throughput/index.html`
- Title: Storage Throughput Estimator • ScopedLabs
- H1: Storage Throughput Estimator
- Feature scan: inputs=yes | results=yes | visual=yes | assistant=no | export=yes | snapshot=yes | pipeline=yes | flow=yes | kb=yes
- Watch items: WATCH_ASSISTANT_NOT_DETECTED

#### Current detected inputs

- iops
- kb
- readPct
- writePct
- overhead
- reportTitle
- projectName
- clientName
- preparedBy
- customNotes

#### Current detected actions/buttons

- calc ? Calculate
- reset ? Reset
- exportReport ? Open Export Report
- saveSnapshot ? Save Snapshot
- continue ? Continue → VM Density
- Back to Compute ? /tools/compute/
- Unlock Pro ? /upgrade/

#### Loaded scripts

- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
- https://cdn.jsdelivr.net/npm/chart.js
- /assets/auth.js?v=auth-magiclink-session-restore-0527
- /assets/app.js?v=0403
- /assets/tool-flow.js?v=compute-throughput-004
- /assets/catalog.js?v=compute-throughput-004
- /assets/pipelines.js?v=compute-throughput-004
- /assets/pipeline-state.js?v=compute-throughput-004
- /assets/pipeline.js?v=compute-throughput-004
- /assets/analyzer.js?v=compute-throughput-004
- /assets/export.js?v=shared-export-025-tool-notes-column-widths
- ./script.js?v=compute-export-001
- /assets/help.js?v=help-026

#### Planning review fields

- Current purpose: REVIEW
- Missing planner inputs: REVIEW
- Data contract needed: REVIEW
- Visual family decision: REVIEW
- Shared icon/graphics needs: REVIEW
- Local assistant needs: REVIEW
- Export/report needs: REVIEW
- Snapshot needs: REVIEW
- Pipeline/carry-forward needs: REVIEW
- Summary/master assistant publish needs: REVIEW
- Proposed module wiring: REVIEW
- Closeout status: READ_ONLY_AUDIT_DRAFT

### vm-density

- Mode: TOOL_PAGE
- File: `tools/compute/vm-density/index.html`
- Title: VM Density Estimator • ScopedLabs
- H1: VM Density Estimator
- Feature scan: inputs=yes | results=yes | visual=yes | assistant=no | export=yes | snapshot=yes | pipeline=yes | flow=yes | kb=yes
- Watch items: WATCH_ASSISTANT_NOT_DETECTED

#### Current detected inputs

- hostCores
- hostRam
- reserve
- vmCpu
- vmRam
- cpuOver
- ramOver
- spare
- reportTitle
- projectName
- clientName
- preparedBy
- customNotes

#### Current detected actions/buttons

- calc ? Calculate
- reset ? Reset
- exportReport ? Open Export Report
- saveSnapshot ? Save Snapshot
- continue ? Continue → GPU / Power
- Back to Compute ? /tools/compute/
- Unlock Pro ? /upgrade/

#### Loaded scripts

- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
- https://cdn.jsdelivr.net/npm/chart.js
- /assets/auth.js?v=auth-magiclink-session-restore-0527
- /assets/app.js?v=0404
- /assets/tool-flow.js?v=compute-vm-005
- /assets/catalog.js?v=compute-vm-005
- /assets/pipelines.js?v=compute-vm-005
- /assets/pipeline-state.js?v=compute-vm-005
- /assets/pipeline.js?v=compute-vm-005
- /assets/analyzer.js?v=compute-vm-005
- /assets/export.js?v=shared-export-025-tool-notes-column-widths
- ./script.js?v=compute-export-002
- /assets/help.js?v=help-026

#### Planning review fields

- Current purpose: REVIEW
- Missing planner inputs: REVIEW
- Data contract needed: REVIEW
- Visual family decision: REVIEW
- Shared icon/graphics needs: REVIEW
- Local assistant needs: REVIEW
- Export/report needs: REVIEW
- Snapshot needs: REVIEW
- Pipeline/carry-forward needs: REVIEW
- Summary/master assistant publish needs: REVIEW
- Proposed module wiring: REVIEW
- Closeout status: READ_ONLY_AUDIT_DRAFT

### workload-planner

- Mode: CANDIDATE_SPECIAL_OR_PLANNER_PATH
- File: `tools/compute/workload-planner/index.html`
- Title: Compute Workload Planner | ScopedLabs
- H1: Not detected
- Feature scan: inputs=no | results=no | visual=no | assistant=no | export=yes | snapshot=no | pipeline=yes | flow=no | kb=yes
- Watch items: None

#### Current detected inputs

- None detected

#### Current detected actions/buttons

- None detected

#### Loaded scripts

- https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
- /assets/auth.js?v=auth-magiclink-session-restore-0527
- /assets/app.js?v=category-planner-shell-001
- /assets/tool-flow.js?v=category-planner-shell-001
- /assets/catalog.js?v=category-planner-shell-001
- /assets/pipelines.js?v=category-planner-shell-001
- /assets/pipeline-state.js?v=category-planner-shell-001
- /assets/pipeline.js?v=category-planner-shell-001
- /assets/scopedlabs-compute-plan-state.js?v=scopedlabs-compute-plan-state-005-active-title
- /assets/scopedlabs-tool-shell.js?v=scopedlabs-tool-shell-009-print-diagnostics
- /assets/scopedlabs-compute-shell-contract.js?v=scopedlabs-compute-shell-contract-001
- /assets/scopedlabs-category-planner-shell.js?v=scopedlabs-category-planner-shell-013-summary-cta-count-parity
- /assets/scopedlabs-compute-planner-adapter.js?v=scopedlabs-compute-planner-adapter-009-status-table-parity
- ./script.js?v=compute-workload-planner-shell-001

#### Planning review fields

- Current purpose: REVIEW
- Missing planner inputs: REVIEW
- Data contract needed: REVIEW
- Visual family decision: REVIEW
- Shared icon/graphics needs: REVIEW
- Local assistant needs: REVIEW
- Export/report needs: REVIEW
- Snapshot needs: REVIEW
- Pipeline/carry-forward needs: REVIEW
- Summary/master assistant publish needs: REVIEW
- Proposed module wiring: REVIEW
- Closeout status: READ_ONLY_AUDIT_DRAFT

---

## Named Watch Summary

- WATCH_ASSISTANT_NOT_DETECTED: 8

## Lock Status

This category is not locked by this audit. This profile must be reviewed and refined before tool/page modernization.

## Human-Reviewed Compute Direction

Status: REVIEW_BASELINE

This section converts the read-only audit output into the first human-readable Compute planning direction.

No tool pages should be modified from this section alone. This is the review baseline for deciding tool data contracts, visual families, icons, assistants, export/report behavior, snapshot behavior, pipeline carry-forward, and summary/master assistant needs.

---

## Compute Category Architecture Direction

The Compute category should be treated as a full planning system.

Expected category structure:

- `/tools/compute/`
  - Planner / command page.
  - Starts or resumes the Compute planning workflow.
  - Shows core path and optional/specialty branches.
  - Should eventually show category planning state and next-step guidance.

- `/tools/compute/summary/`
  - Future summary / master assistant / report page.
  - Should oversee completed Compute tools.
  - Should synthesize CPU, RAM, storage, network, GPU, density, backup, RAID, and power/thermal findings.
  - Should produce category-level recommendations, assumptions, risks, conflicts/gaps, export/report sections, and cross-category handoff data.

Current audit note:
- Compute planner/command page exists.
- Compute summary/master assistant page is not yet present and should be planned before final category closeout.

---

## Compute Visual Family Direction

Compute should not use one-off page visuals for related planning concepts.

Likely Compute visual families:

### compute-capacity-envelope

Purpose:
- Show how close resource sizing is to a capacity edge.
- Analytical chart style.
- Should use accepted CPU-style proof rhythm when promoted into the shared family.

Known tools:
- CPU Sizing: accepted/reference style.
- RAM Sizing: proof consumer needing shared visual family alignment.

### compute-iops-latency

Purpose:
- Show storage performance pressure, IOPS, latency, rebuild timing, and reserve.

Likely tools:
- Storage IOPS.
- RAID Rebuild Time.
- Backup Window when storage/time pressure is relevant.

### compute-throughput-envelope

Purpose:
- Show bandwidth, throughput pressure, redundancy, and bottleneck risk.

Likely tools:
- Storage Throughput.
- NIC Bonding.

### compute-resource-density

Purpose:
- Show VM/resource density, consolidation pressure, GPU memory pressure, or node allocation.

Likely tools:
- VM Density.
- GPU VRAM.
- Power/Thermal when resource envelope context is needed.

### compute-icon-library

Purpose:
- Shared Compute icon primitives for visual modules.

Candidate icons:
- CPU/core.
- RAM/memory.
- Disk/array.
- NIC/network path.
- GPU.
- Thermal/power.
- VM/node.
- Backup window/time.
- RAID/rebuild.
- Throughput/bottleneck.
- Reserve/headroom.

Icon decisions must be documented before implementation. Do not create page-local icons when they may belong in the shared Compute icon library.

---

## Compute Tool Grouping From Audit

### CPU Sizing

Current audit status:
- PASS.
- Current reference-style Compute tool.
- Has inputs, results, visual, assistant, export, snapshot, pipeline, flow, and Knowledge Base signals.

Planning direction:
- Treat as the Compute capacity-envelope visual reference.
- Review data contract before moving renderer into shared family.
- Do not redesign casually.

Needed review:
- Data contract.
- Shared capacity visual promotion path.
- Summary/master assistant publish fields.
- Export/report payload status.

### RAM Sizing

Current audit status:
- PASS.
- Has inputs, results, visual, assistant, export, snapshot, pipeline, flow, and Knowledge Base signals.

Planning direction:
- Treat as first proof consumer of the Compute capacity-envelope family.
- Do not patch RAM page-local visuals to imitate CPU.
- Align through shared Compute capacity visual module after data contract review.

Needed review:
- Data contract.
- RAM-specific planner inputs.
- Capacity-envelope payload.
- Summary/master assistant publish fields.
- Export/report payload status.

### Storage IOPS

Current audit status:
- WATCH_ASSISTANT_NOT_DETECTED.

Planning direction:
- Likely needs compute-iops-latency visual family.
- Needs local assistant planning.
- Needs data contract before module wiring.

### Storage Throughput

Current audit status:
- WATCH_ASSISTANT_NOT_DETECTED.

Planning direction:
- Likely needs compute-throughput-envelope visual family.
- Needs local assistant planning.
- Needs data contract before module wiring.

### NIC Bonding

Current audit status:
- WATCH_ASSISTANT_NOT_DETECTED.

Planning direction:
- Likely belongs to compute-throughput-envelope or redundancy/bottleneck visual family.
- Needs local assistant planning.
- Needs data contract before module wiring.

### RAID Rebuild Time

Current audit status:
- WATCH_ASSISTANT_NOT_DETECTED.

Planning direction:
- Likely needs storage risk/time visual family.
- May share with compute-iops-latency or backup/time family.
- Needs local assistant planning.
- Needs data contract before module wiring.

### Backup Window

Current audit status:
- WATCH_ASSISTANT_NOT_DETECTED.

Planning direction:
- Likely needs backup/time/risk visual family.
- May share storage/time pressure visuals with RAID Rebuild Time.
- Needs local assistant planning.
- Needs data contract before module wiring.

### VM Density

Current audit status:
- WATCH_ASSISTANT_NOT_DETECTED.

Planning direction:
- Likely needs compute-resource-density visual family.
- Needs local assistant planning.
- Needs data contract before module wiring.

### GPU VRAM

Current audit status:
- WATCH_ASSISTANT_NOT_DETECTED.

Planning direction:
- Likely needs memory/resource pressure visual family.
- May share pieces with compute-resource-density or capacity-envelope depending on planner goal.
- Needs local assistant planning.
- Needs data contract before module wiring.

### Power Thermal

Current audit status:
- WATCH_ASSISTANT_NOT_DETECTED.

Planning direction:
- Likely needs power/thermal envelope or icon-based visual family.
- Needs local assistant planning.
- Needs data contract before module wiring.

### Workload Planner

Current audit status:
- PASS as CANDIDATE_SPECIAL_OR_PLANNER_PATH.
- No calculator inputs/results detected by the audit.

Planning direction:
- Review as a possible Compute planner helper or special path.
- Do not force into normal calculator tool shell without review.
- May belong closer to the Compute planner/command workflow.

---

## Compute Closeout Rule

Do not modify Compute tool pages until the relevant tool's planning profile and data contract are reviewed.

Required sequence:

1. Read current tool.
2. Review or update this profile.
3. Define data contract.
4. Decide planner inputs.
5. Decide visual family and icon needs.
6. Decide assistant/export/snapshot/pipeline/summary publish needs.
7. Approve module plan.
8. Implement.
9. Audit.
10. Live review.
11. Lock.

## CPU/RAM Capacity Envelope Data Contract Review

Status: REVIEW_BASELINE

This section documents the read-only inspection of CPU Sizing, RAM Sizing, and the current shared Compute capacity visual module.

No tool page changes are approved by this section alone.

---

## Read-Only Inspection Summary

### CPU Sizing

CPU Sizing is the accepted Compute capacity-envelope reference.

Current detected behavior:
- Owns page-local CPU capacity visual builder:
  - `buildComputeCpuVisualSvg(result)`
  - `renderComputeCpuVisual(result)`
- Owns page-local proof/reference sections:
  - `buildComputeCpuRecommendationReferences(result)`
  - `renderComputeCpuProofSections(result)`
  - `buildComputeCpuDecisionScheduleHtml(result)`
  - `buildComputeCpuRecommendationReferencesHtml(references)`
- Owns custom export payload route:
  - `buildComputeCpuExportPayload(context)`
  - `window.ScopedLabsComputeCpuExport.buildPayload`
- Writes CPU result into the Compute flow/workload state.
- Renders local assistant/status card behavior.
- Shows Continue only after a valid result.

Planning meaning:
- CPU has the accepted visual/proof/export behavior, but the visual engine is still page-local.
- CPU should be treated as the reference for promoting the shared `compute-capacity-envelope` visual family.
- CPU should not be redesigned during promotion.

### RAM Sizing

RAM Sizing is the first proof consumer of the shared Compute capacity visual module.

Current detected behavior:
- Loads and calls:
  - `window.ScopedLabsComputeCapacityVisuals.renderRamCapacityEnvelope(...)`
  - `window.ScopedLabsComputeCapacityVisuals.clear(...)`
- Builds a local `ramCapacityEnvelope` object.
- Writes `capacityEnvelope: ramCapacityEnvelope` into the Compute flow payload.
- Shows Continue only after a valid result.
- Does not currently show the same full custom export/proof route that CPU owns.

Planning meaning:
- RAM is already consuming the shared module.
- RAM should not receive a page-local visual clone of CPU.
- RAM should align with CPU only through the shared Compute capacity visual family.

### Shared Compute Capacity Visual Module

Current module:
- `assets/scopedlabs-compute-capacity-visuals.js`

Current detected status:
- Version is currently RAM-envelope oriented.
- Exposes:
  - `buildRamCapacityEnvelopeSvg`
  - `renderRamCapacityEnvelope`
  - `clear`
- Does not yet expose a shared base capacity-envelope renderer.
- Does not yet expose a CPU adapter.
- Does not yet own CPU's accepted visual/proof/export-safe behavior.

Planning meaning:
- The shared module exists, but it is not yet the final shared CPU/RAM capacity-envelope engine.
- The next implementation should promote CPU's accepted style and proof rhythm into the shared module, then adapt CPU and RAM through that shared engine.

---

## Proposed Shared Capacity-Envelope Contract

Future shared module direction:

`assets/scopedlabs-compute-capacity-visuals.js` should evolve from a RAM-only renderer into a reusable Compute capacity-envelope family.

Expected future exports:

- `buildCapacityEnvelopeSvg(config)`
  - Shared base renderer.
  - Owns frame, grid, axis, status chip, marker rhythm, references, export-safe SVG behavior.
- `buildCpuCapacityEnvelopeSvg(result)`
  - CPU adapter using CPU units and fields.
- `renderCpuCapacityEnvelope(options)`
  - CPU DOM renderer.
- `buildRamCapacityEnvelopeSvg(result)`
  - RAM adapter using GB units and RAM fields.
- `renderRamCapacityEnvelope(options)`
  - RAM DOM renderer.
- `clear(options)`
  - Shared clear/hide behavior.

The shared family should preserve the accepted CPU visual language:
- Dark engineering/CAD graph surface.
- Readable axes and numeric labels.
- Rectangular engineering status chip.
- Plain centered `*1/*2/*3` references.
- CPU-approved marker colors:
  - `*1 = #38d9ff`
  - `*2 = #a78bfa`
  - `*3 = #f59e0b`
- Export-safe SVG output.
- Recommendation reference support.
- Summary/master assistant payload support.

---

## CPU Capacity Data Contract Candidate

CPU capacity-envelope payload should include:

### Inputs

- Workload type.
- Planning path.
- Concurrency / worker count.
- CPU per worker.
- Peak multiplier.
- Target utilization.
- Growth reserve.
- Platform overhead.
- OS reserve.
- Failover multiplier.

### Outputs

- Base CPU demand.
- Adjusted effective demand.
- Required cores.
- Recommended logical cores.
- Recommended physical cores.
- Usable capacity.
- Watch threshold.
- Risk threshold.
- Final envelope demand.
- Primary constraint.
- Analyzer status.
- Envelope status.
- Status authority.

### Assistant / proof fields

- Local recommendation.
- Confidence/status label.
- Recommendation references.
- Decision schedule rows.
- Downstream validation note.
- Summary-ready assumption notes.
- Summary-ready risk notes.
- Summary/master assistant publish payload.

### Export fields

- Export status.
- Export summary.
- Engineering interpretation.
- Input rows.
- Output rows.
- Chart image.
- Recommendation reference section.
- Decision schedule section.

---

## RAM Capacity Data Contract Candidate

RAM capacity-envelope payload should include:

### Inputs

- Workload type.
- Planning path.
- Concurrency / process count.
- Memory per process.
- Workload adjustment factor.
- OS/base overhead.
- Reserve/cache allocation.
- Growth reserve.
- Failover/redundancy mode if applicable.
- CPU coupling/alignment status.

### Outputs

- Process memory.
- Adjusted workload memory.
- OS/base overhead.
- Reserve/cache allocation.
- Demand RAM.
- Required RAM.
- Recommended/installed RAM tier.
- Headroom.
- Reserve ratio.
- Pressure/status.
- Analyzer status.
- Capacity-envelope status.
- Status authority.

### Assistant / proof fields

- Local recommendation.
- Assumptions used.
- Risk flags.
- CPU/RAM alignment note.
- Recommendation references.
- Missing-input warnings.
- Summary-ready notes.
- Summary/master assistant publish payload.

### Export fields

- Export status.
- Export summary.
- Engineering interpretation.
- Input rows.
- Output rows.
- Chart image from shared capacity module.
- Recommendation reference section.
- Decision/proof section if needed.

---

## Implementation Gate

Do not implement yet until this data contract is reviewed and accepted.

After approval, the implementation lane should be:

1. Promote CPU's accepted capacity-envelope visual style into `assets/scopedlabs-compute-capacity-visuals.js`.
2. Add a shared base renderer plus CPU/RAM adapters.
3. Keep CPU visual output visually unchanged.
4. Keep RAM consuming the shared module.
5. Add audit checks proving CPU/RAM use the shared capacity-envelope family.
6. Only then review export payload parity and summary/master assistant publishing.

## Storage IOPS / Storage Throughput Data Contract Review

Status: REVIEW_BASELINE

This section documents the read-only inspection of Storage IOPS and Storage Throughput.

No tool page changes are approved by this section alone.

---

## Read-Only Inspection Summary

### Storage IOPS

Current detected behavior:
- Pipeline step: `storage-iops`.
- Previous step: `ram-sizing`.
- Reads RAM flow context from session storage.
- Invalidates downstream Compute steps when inputs change.
- Uses `ScopedLabsAnalyzer.renderOutput(...)`.
- Writes flow data through `ScopedLabsAnalyzer.writeFlow(...)`.
- Shows Continue only after a valid result.
- Continue target: `/tools/compute/storage-throughput/`.
- Has Documentation & Export card.
- Has Save Snapshot button.
- Loads shared export module.
- No local assistant module detected.
- No dedicated shared Storage IOPS visual module detected.
- No custom export payload route detected.

Current calculation/output concepts:
- Read IOPS.
- Base write IOPS.
- Penalized write IOPS.
- Subtotal IOPS.
- Reserve/headroom IOPS.
- Estimated required IOPS.
- Storage pressure.
- Primary constraint.
- RAID penalty.
- Analyzer status.

Planning meaning:
- Storage IOPS is a functional pipeline calculator.
- It should not be treated as broken.
- It needs a data contract before adding assistant, shared visual, richer export, or summary/master assistant publishing.
- It likely belongs to a future `compute-iops-latency` visual family.

### Storage Throughput

Current detected behavior:
- Pipeline step: `storage-throughput`.
- Previous step: `storage-iops`.
- Reads Storage IOPS flow context from session storage.
- Invalidates downstream Compute steps when inputs change.
- Uses `ScopedLabsAnalyzer.renderOutput(...)`.
- Writes flow data through `ScopedLabsAnalyzer.writeFlow(...)`.
- Shows Continue only after a valid result.
- Continue target: `/tools/compute/vm-density/`.
- Has Documentation & Export card.
- Has Save Snapshot button.
- Loads shared export module.
- No local assistant module detected.
- No dedicated shared Storage Throughput visual module detected.
- No custom export payload route detected.

Current calculation/output concepts:
- Read throughput.
- Write throughput.
- Base throughput.
- Estimated required throughput.
- Read/write mix.
- Average I/O size.
- Throughput class.
- Workload pattern.
- IOPS/throughput cross-check.
- Analyzer status.

Planning meaning:
- Storage Throughput is a functional pipeline calculator.
- It should not be treated as broken.
- It needs a data contract before adding assistant, shared visual, richer export, or summary/master assistant publishing.
- It likely belongs to a future `compute-throughput-envelope` visual family.
- It also needs to preserve the existing IOPS cross-check behavior.

---

## Proposed Storage IOPS Data Contract Candidate

### Inputs

- Transaction rate.
- Read operations per transaction.
- Write operations per transaction.
- RAID/write penalty.
- Reserve/headroom percentage.
- Upstream RAM context.
- Workload type / planning path when available.
- Storage tier or media type if added later.
- Latency target if added later.
- Controller/cache assumption if added later.

### Outputs

- Read IOPS.
- Base write IOPS.
- Penalized write IOPS.
- Subtotal IOPS.
- Reserve/headroom IOPS.
- Estimated required IOPS.
- Storage pressure.
- Primary constraint.
- RAID penalty.
- Analyzer status.
- Future IOPS/latency envelope status.
- Status authority.

### Assistant / proof fields

- Local recommendation.
- Write amplification warning.
- Burst/headroom warning.
- RAID penalty explanation.
- Latency/media validation note.
- Upstream RAM context note.
- Downstream throughput validation note.
- Summary-ready assumption notes.
- Summary-ready risk notes.
- Summary/master assistant publish payload.

### Export fields

- Export status.
- Export summary.
- Engineering interpretation.
- Input rows.
- Output rows.
- Chart image or shared visual image.
- Storage IOPS decision/proof section.
- Recommendation references if added.

---

## Proposed Storage Throughput Data Contract Candidate

### Inputs

- IOPS.
- Average I/O size.
- Read/write mix.
- Protocol/filesystem overhead.
- Upstream Storage IOPS context.
- Workload type / planning path when available.
- Storage path type if added later.
- Network/storage transport limit if added later.
- Backup/transfer window context if added later.

### Outputs

- Read throughput.
- Write throughput.
- Base throughput.
- Estimated required throughput.
- Read/write mix.
- Average I/O size.
- Throughput class.
- Workload pattern.
- IOPS/throughput cross-check.
- Analyzer status.
- Future throughput-envelope status.
- Status authority.

### Assistant / proof fields

- Local recommendation.
- Sequential transfer warning.
- Protocol/transport overhead warning.
- Bottleneck explanation.
- IOPS/throughput alignment note.
- Downstream VM density validation note.
- Summary-ready assumption notes.
- Summary-ready risk notes.
- Summary/master assistant publish payload.

### Export fields

- Export status.
- Export summary.
- Engineering interpretation.
- Input rows.
- Output rows.
- Chart image or shared visual image.
- Storage throughput decision/proof section.
- Recommendation references if added.

---

## Visual Family Direction

Storage IOPS and Storage Throughput should not receive one-off page-local visuals.

Recommended future visual families:

### compute-iops-latency

Likely owner for:
- Storage IOPS.
- RAID Rebuild Time if rebuild pressure is expressed through random I/O or write-amplification risk.
- Backup Window if storage performance pressure affects completion time.

Visual purpose:
- Show required IOPS, reserve/headroom, write penalty, latency/media risk, and capacity pressure.

### compute-throughput-envelope

Likely owner for:
- Storage Throughput.
- NIC Bonding when network/storage path throughput needs to be compared.
- Backup Window when transfer window pressure is the main constraint.

Visual purpose:
- Show required MB/s or Gbps, reserve/headroom, protocol overhead, sequential transfer pressure, and bottleneck risk.

---

## Implementation Gate

Do not implement yet until these data contracts are reviewed and accepted.

After approval, the implementation lane should be:

1. Decide whether Storage IOPS and Storage Throughput share one storage-performance visual module or two separate visual families.
2. Define the shared module export names.
3. Preserve current formulas and pipeline order.
4. Add local assistant contracts.
5. Add richer summary/master assistant publish payloads.
6. Add audit checks proving assistant, visual, export, snapshot, and flow contracts.
7. Then wire implementation one tool at a time.
