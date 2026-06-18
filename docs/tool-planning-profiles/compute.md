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
