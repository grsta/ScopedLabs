# ScopedLabs Module Map

Last generated: 2026-06-16T03:21:32.550Z

This file maps where the shared engines, category modules, special tool routes, and audit gates live. Keep it updated whenever a shared module, export route, category shell, or special-case tool path is added.

## Rules

- Treat `assets/export.js` as the global shared export engine.
- Do not patch global files for one tool unless the change is intended for every tool that uses that engine.
- Put per-tool export logic in that tool when the category does not have an output shell route.
- Keep cache-bust versions intentional and consistent within an update.
- Add or update an audit when this map changes.

## Global shared engines

- `assets/export.js`
- `assets/scopedlabs-assistant-export.js`
- `assets/scopedlabs-report-metadata.js`
- `assets/scopedlabs-tool-shell.js`
- `assets/scopedlabs-local-assistant.js`
- `assets/scopedlabs-user-tool-notes.js`
- `assets/help.js`
- `assets/tool-flow.js`
- `assets/catalog.js`
- `assets/pipelines.js`
- `assets/pipeline-state.js`
- `assets/pipeline.js`
- `assets/analyzer.js`

## Compute modules

- `assets/scopedlabs-compute-assistant-contract.js`
- `assets/scopedlabs-compute-plan-state.js`
- `assets/scopedlabs-compute-planner-adapter.js`
- `assets/scopedlabs-compute-result-visuals.css`
- `assets/scopedlabs-compute-capacity-visuals.js`
- `assets/scopedlabs-compute-shell-contract.js`

### Compute tool routes

- `tools/compute/backup-window`
- `tools/compute/cpu-sizing`
- `tools/compute/gpu-vram`
- `tools/compute/nic-bonding`
- `tools/compute/power-thermal`
- `tools/compute/raid-rebuild-time`
- `tools/compute/ram-sizing`
- `tools/compute/storage-iops`
- `tools/compute/storage-throughput`
- `tools/compute/vm-density`
- `tools/compute/workload-planner`

### Compute shared capacity visuals

- `assets/scopedlabs-compute-capacity-visuals.js` owns shared Compute capacity-envelope SVG renderers.
- `tools/compute/ram-sizing/` consumes the shared RAM Capacity Envelope renderer through `window.ScopedLabsComputeCapacityVisuals.renderRamCapacityEnvelope`.
- Do not add page-local one-off capacity SVG/table stacks when a shared Compute visual renderer can be used or promoted.

### Compute special export routes

- `tools/compute/cpu-sizing/index.html` owns the CPU export config.
- `tools/compute/cpu-sizing/script.js` owns `window.ScopedLabsComputeCpuExport.buildPayload`.
- CPU Sizing uses `customPayloadBuilder: "ScopedLabsComputeCpuExport.buildPayload"`.
- CPU export should carry the CPU Capacity Envelope chart, Recommendation References, and CPU Capacity Decision Schedule through the custom payload route.

## Access Control modules

- `assets/access-control-area-state.js`
- `assets/access-control-category-guidance-renderer.css`
- `assets/access-control-category-guidance-renderer.js`
- `assets/access-control-category-guidance.js`
- `assets/access-control-category-knowledge.js`
- `assets/access-control-category-nav.js`
- `assets/access-control-decision-schedule.js`
- `assets/access-control-guidance-memory.js`
- `assets/access-control-output-shell.js`
- `assets/access-control-planning-visuals.js`
- `assets/access-control-report-summary.js`
- `assets/access-control-scope-state.js`
- `assets/access-control-source-policy.js`
- `assets/access-control-tool-assistant-adapters.js`
- `assets/access-control-tool-polish.js`
- `assets/access-control-tool-registry.js`
- `assets/access-control-user-tool-notes.js`

### Access Control tool routes

- `tools/access-control/access-level-sizing`
- `tools/access-control/anti-passback-zones`
- `tools/access-control/credential-format`
- `tools/access-control/door-cable-length`
- `tools/access-control/door-count-planner`
- `tools/access-control/elevator-reader-count`
- `tools/access-control/fail-safe-fail-secure`
- `tools/access-control/lock-power-budget`
- `tools/access-control/panel-capacity`
- `tools/access-control/reader-type-selector`
- `tools/access-control/scope-planner`
- `tools/access-control/special-locking-scope`
- `tools/access-control/summary`

### Access Control special export routes

- Fail-Safe / Fail-Secure is the accepted Assistant Proof Pattern reference.
- Fail-Safe uses an output-shell style export route where available.
- Scope Planner remains a special path.
- Access Level Sizing remains the Access Control Pro export/report baseline.

## Physical Security modules

- `assets/physical-security-area-state.js`
- `assets/physical-security-category-guidance-renderer.css`
- `assets/physical-security-category-guidance-renderer.js`
- `assets/physical-security-category-guidance.js`
- `assets/physical-security-category-knowledge.js`
- `assets/physical-security-graphics-library.js`
- `assets/physical-security-graphics.js`
- `assets/physical-security-guidance-event-bridge.js`
- `assets/physical-security-guidance-memory.js`
- `assets/physical-security-guidance-registry.js`
- `assets/physical-security-local-assistant.js`
- `assets/physical-security-report-summary.js`
- `assets/physical-security-source-policy.js`
- `assets/physical-security-tool-assistant-adapters.js`
- `assets/physical-security-tool-registry.js`
- `assets/physical-security-ui-kit.js`

### Physical Security tool routes

- `tools/physical-security/area-planner`
- `tools/physical-security/blind-spot-check`
- `tools/physical-security/camera-coverage-area`
- `tools/physical-security/camera-spacing`
- `tools/physical-security/face-recognition-range`
- `tools/physical-security/field-of-view`
- `tools/physical-security/lens-selection`
- `tools/physical-security/license-plate-range`
- `tools/physical-security/mounting-height`
- `tools/physical-security/pixel-density`
- `tools/physical-security/scene-illumination`
- `tools/physical-security/summary`

### Physical Security notes

- Lens Selection is protected gold-standard behavior unless explicitly reopened.
- Category graphics and guidance bridges should stay shared/factory-style.

## Audit and verification scripts

- `scripts/audit-access-control-access-level-output-contract-v1.js`
- `scripts/audit-access-control-access-level-v2-summary-carryover-v1.js`
- `scripts/audit-access-control-adapter-warning-map-0610.js`
- `scripts/audit-access-control-anti-passback-module-v1.js`
- `scripts/audit-access-control-assistant-capability-v1.js`
- `scripts/audit-access-control-assistant-proof-pattern-contract-v1.js`
- `scripts/audit-access-control-assistant-readiness-v1.js`
- `scripts/audit-access-control-cache-bust-map-0610.js`
- `scripts/audit-access-control-cad-icon-contract-v1.js`
- `scripts/audit-access-control-category-card-integrity-0612.js`
- `scripts/audit-access-control-category-completion-map-v1.js`
- `scripts/audit-access-control-category-export-print-closeout-v1.js`
- `scripts/audit-access-control-category-readiness-checkpoint-0611.js`
- `scripts/audit-access-control-closeout-gate-v1.js`
- `scripts/audit-access-control-elevator-reader-module-v1.js`
- `scripts/audit-access-control-evidence-suite-0611.js`
- `scripts/audit-access-control-export-card-polish-v1.js`
- `scripts/audit-access-control-export-ownership-v1.js`
- `scripts/audit-access-control-export-popup-visual-binding-v1.js`
- `scripts/audit-access-control-export-print-parity-closeout-v1.js`
- `scripts/audit-access-control-export-print-ux-depth-v1.js`
- `scripts/audit-access-control-export-report-parked-state-0611.js`
- `scripts/audit-access-control-export-report-safe-fix-readiness-0611.js`
- `scripts/audit-access-control-export-report-system-rollup-0611.js`
- `scripts/audit-access-control-export-visual-fidelity-v1.js`
- `scripts/audit-access-control-factory-debt-v1.js`
- `scripts/audit-access-control-fail-safe-assistant-proof-v1.js`
- `scripts/audit-access-control-fail-safe-complex-status-0611.js`
- `scripts/audit-access-control-fail-safe-decision-model-v1.js`
- `scripts/audit-access-control-fail-safe-factory-closeout-v1.js`
- `scripts/audit-access-control-fail-safe-final-shell-polish-v1.js`
- `scripts/audit-access-control-fail-safe-module-closeout-v1.js`
- `scripts/audit-access-control-fail-safe-output-contract-v1.js`
- `scripts/audit-access-control-fail-safe-parked-state-0611.js`
- `scripts/audit-access-control-fail-safe-polish-v1.js`
- `scripts/audit-access-control-fail-safe-readiness-0611.js`
- `scripts/audit-access-control-fail-safe-scope-foundation-v1.js`
- `scripts/audit-access-control-fail-safe-shell-modules-v1.js`
- `scripts/audit-access-control-guided-flow-terminal-0613.js`
- `scripts/audit-access-control-library-icon-usage-0610.js`
- `scripts/audit-access-control-local-pill-chip-cleanup-0611.js`
- `scripts/audit-access-control-lock-power-assistant-output-shell-v1.js`
- `scripts/audit-access-control-lock-power-cad-rail-v1.js`
- `scripts/audit-access-control-lock-power-parked-state-0611.js`
- `scripts/audit-access-control-lock-power-scope-hydration-v1.js`
- `scripts/audit-access-control-lock-power-shell-modules-probe-v1.js`
- `scripts/audit-access-control-lock-power-status-pill-path-0611.js`
- `scripts/audit-access-control-lock-power-supply-rail-v1.js`
- `scripts/audit-access-control-lock-power-visual-chip-0611.js`
- `scripts/audit-access-control-lock-power-visual-chip-readiness-0611.js`
- `scripts/audit-access-control-main-gates-0610.js`
- `scripts/audit-access-control-metadata-active-scope-label-0613.js`
- `scripts/audit-access-control-metadata-category-scope-key-0613.js`
- `scripts/audit-access-control-modern-visual-contract-v1.js`
- `scripts/audit-access-control-module-seatbelts-v1.js`
- `scripts/audit-access-control-opening-page-link-coverage-0612.js`
- `scripts/audit-access-control-output-shell-contract-v1.js`
- `scripts/audit-access-control-output-shell-module-v1.js`
- `scripts/audit-access-control-page-chrome-pill-polish-v1.js`
- `scripts/audit-access-control-page-local-evidence-0610.js`
- `scripts/audit-access-control-panel-capacity-output-contract-v1.js`
- `scripts/audit-access-control-panel-capacity-shell-modules-v1.js`
- `scripts/audit-access-control-payload-contract-v1.js`
- `scripts/audit-access-control-pipeline-specialty-branches-v1.js`
- `scripts/audit-access-control-preview-print-mode-map-0610.js`
- `scripts/audit-access-control-reader-type-assistant-capability-v1.js`
- `scripts/audit-access-control-reader-type-factory-contract-v1.js`
- `scripts/audit-access-control-reader-type-output-contract-v1.js`
- `scripts/audit-access-control-reader-type-status-diff-0611.js`
- `scripts/audit-access-control-report-metadata-render-repair-0613.js`
- `scripts/audit-access-control-report-metadata-scope-contract-0613.js`
- `scripts/audit-access-control-scope-delete-and-planner-metadata-0613.js`
- `scripts/audit-access-control-scope-delete-nonblocking-0613.js`
- `scripts/audit-access-control-scope-metadata-notes-breakage-0613.js`
- `scripts/audit-access-control-scope-planner-area-match-v1.js`
- `scripts/audit-access-control-scope-planner-area-pattern-v1.js`
- `scripts/audit-access-control-scope-planner-auth-unlock-v1.js`
- `scripts/audit-access-control-scope-planner-branch-summary-v1.js`
- `scripts/audit-access-control-scope-planner-cleanup-v1.js`
- `scripts/audit-access-control-scope-planner-gating-v1.js`
- `scripts/audit-access-control-scope-planner-metadata-card-0613.js`
- `scripts/audit-access-control-scope-planner-print-fit-v1.js`
- `scripts/audit-access-control-scope-planner-print-summary-v1.js`
- `scripts/audit-access-control-scoped-report-metadata-0613.js`
- `scripts/audit-access-control-shared-result-style-parity-0610.js`
- `scripts/audit-access-control-small-chip-alias-0611.js`
- `scripts/audit-access-control-small-chip-style-bodies-0611.js`
- `scripts/audit-access-control-special-locking-module-v1.js`
- `scripts/audit-access-control-status-chip-contract-0611.js`
- `scripts/audit-access-control-status-chip-evidence-0610.js`
- `scripts/audit-access-control-status-chip-migration-state-0611.js`
- `scripts/audit-access-control-status-rendering-map-0611.js`
- `scripts/audit-access-control-status-shared-coverage-0611.js`
- `scripts/audit-access-control-status-system-rollup-0611.js`
- `scripts/audit-access-control-style-reuse-map-0610.js`
- `scripts/audit-access-control-style-selector-map-0610.js`
- `scripts/audit-access-control-summary-all-scopes-metadata-route-0613d.js`
- `scripts/audit-access-control-summary-all-scopes-metadata-suppression-0613.js`
- `scripts/audit-access-control-summary-assistant-tool-notes-label-0614.js`
- `scripts/audit-access-control-summary-cleanup-map-0613.js`
- `scripts/audit-access-control-summary-compact-scope-view-0613.js`
- `scripts/audit-access-control-summary-dedupe-scoped-records-0613.js`
- `scripts/audit-access-control-summary-export-column-widths-0613.js`
- `scripts/audit-access-control-summary-export-metadata-route-0613.js`
- `scripts/audit-access-control-summary-export-table-contract-0613.js`
- `scripts/audit-access-control-summary-generated-tone-0613.js`
- `scripts/audit-access-control-summary-master-assistant-readiness-0612.js`
- `scripts/audit-access-control-summary-multi-scope-kpi-0613.js`
- `scripts/audit-access-control-summary-page-proof-0612.js`
- `scripts/audit-access-control-summary-per-scope-metadata-export-0613.js`
- `scripts/audit-access-control-summary-per-scope-metadata-export-ready-0613.js`
- `scripts/audit-access-control-summary-public-access-0613.js`
- `scripts/audit-access-control-summary-report-table-0613.js`
- `scripts/audit-access-control-summary-scope-metadata-body-0613.js`
- `scripts/audit-access-control-summary-scope-report-rows-0613.js`
- `scripts/audit-access-control-summary-scope-root-filter-0613.js`
- `scripts/audit-access-control-summary-scope-view-mode-0613.js`
- `scripts/audit-access-control-summary-strict-scope-root-0613.js`
- `scripts/audit-access-control-summary-tool-notes-dedupe-0613.js`
- `scripts/audit-access-control-summary-tool-notes-duplicate-source-0613.js`
- `scripts/audit-access-control-summary-ui-polish-0612.js`
- `scripts/audit-access-control-summary-ui-polish-proof-0612.js`
- `scripts/audit-access-control-summary-user-notes-card-layout-0614.js`
- `scripts/audit-access-control-summary-visual-cleanup-0613.js`
- `scripts/audit-access-control-tool-factory-contract-v1.js`
- `scripts/audit-access-control-user-tool-notes-contract-0614.js`
- `scripts/audit-access-control-user-tool-notes-contract-ready-0614.js`
- `scripts/audit-access-control-user-tool-notes-page-map-0614.js`
- `scripts/audit-access-control-user-tool-notes-placement-0614.js`
- `scripts/audit-access-control-visual-export-batch-classifier-0610.js`
- `scripts/audit-access-control-visual-fit-seatbelts-v1.js`
- `scripts/audit-access-level-complete-pipeline-direct-summary-0613.js`
- `scripts/audit-access-level-complete-pipeline-summary-0613.js`
- `scripts/audit-access-level-hidden-generated-flow-ui-0614.js`
- `scripts/audit-access-level-summary-carryover-0613.js`
- `scripts/audit-access-level-summary-carryover-ready-0613.js`
- `scripts/audit-access-level-summary-publisher-scope-record-0613.js`
- `scripts/audit-account-snapshot-extra-table-layout-v1.js`
- `scripts/audit-area-planner-button-scroll-v1.js`
- `scripts/audit-area-planner-summary-report-v1.js`
- `scripts/audit-area-planner-summary-ui-polish-v1.js`
- `scripts/audit-assistant-lifecycle-contract-v1.js`
- `scripts/audit-auth-magic-link-session-restore-v1.js`
- `scripts/audit-blind-spot-check-local-assistant-proof-v1.js`
- `scripts/audit-blind-spot-guidance-adapter-v1.js`
- `scripts/audit-blind-spot-guidance-event-bridge-proof-v1.js`
- `scripts/audit-camera-coverage-area-dori-feasibility-risk-v1.js`
- `scripts/audit-camera-coverage-area-guidance-adapter-v1.js`
- `scripts/audit-camera-coverage-area-guidance-event-bridge-proof-v1.js`
- `scripts/audit-camera-coverage-area-local-assistant-proof-v1.js`
- `scripts/audit-camera-spacing-assistant-master-host-v1.js`
- `scripts/audit-camera-spacing-category-guidance-renderer-proof-v1.js`
- `scripts/audit-camera-spacing-guidance-adapter-v1.js`
- `scripts/audit-camera-spacing-guidance-event-bridge-proof-v1.js`
- `scripts/audit-category-landing-cleanup-v1.js`
- `scripts/audit-category-modernizer-v1.js`
- `scripts/audit-compute-cpu-assistant-payload-decision-v1.js`
- `scripts/audit-compute-cpu-assistant-proof-references-v1.js`
- `scripts/audit-compute-cpu-capacity-envelope-visual-v1.js`
- `scripts/audit-compute-cpu-export-print-proof-parity-v1.js`
- `scripts/audit-compute-cpu-failsafe-static-card-v1.js`
- `scripts/audit-compute-cpu-input-clear-race-v1.js`
- `scripts/audit-compute-cpu-result-standard-v1.js`
- `scripts/audit-compute-cpu-static-summary-polish-v1.js`
- `scripts/audit-compute-cpu-status-authority-v1.js`
- `scripts/audit-compute-cpu-v2-capacity-factors-v1.js`
- `scripts/audit-face-recognition-guidance-adapter-v1.js`
- `scripts/audit-face-recognition-guidance-event-bridge-proof-v1.js`
- `scripts/audit-face-recognition-range-local-assistant-proof-v1.js`
- `scripts/audit-field-of-view-guidance-adapter-v1.js`
- `scripts/audit-field-of-view-guidance-event-bridge-proof-v1.js`
- `scripts/audit-field-of-view-local-assistant-proof-v1.js`
- `scripts/audit-guidance-adapter-factory-foundation-v1.js`
- `scripts/audit-guides-hub-polish-v1.js`
- `scripts/audit-homepage-product-story-v1.js`
- `scripts/audit-landing-card-button-polish-v2.js`
- `scripts/audit-landing-page-chrome-polish-v1.js`
- `scripts/audit-license-plate-active-area-distance-v1.js`
- `scripts/audit-license-plate-guidance-adapter-v1.js`
- `scripts/audit-license-plate-guidance-event-bridge-proof-v1.js`
- `scripts/audit-license-plate-range-local-assistant-proof-v1.js`
- `scripts/audit-mounting-height-guidance-adapter-v1.js`
- `scripts/audit-mounting-height-guidance-event-bridge-proof-v1.js`
- `scripts/audit-mounting-height-local-assistant-proof-v1.js`
- `scripts/audit-network-throughput-guide-polish-v1.js`
- `scripts/audit-physical-security-area-detail-save-contract-v1.js`
- `scripts/audit-physical-security-area-planner-foundation-v1.js`
- `scripts/audit-physical-security-area-planner-reset-confirm-clear-v1.js`
- `scripts/audit-physical-security-area-planner-route-intent-v1.js`
- `scripts/audit-physical-security-area-planner-summary-link-v1.js`
- `scripts/audit-physical-security-assistant-library-modules-v1.js`
- `scripts/audit-physical-security-assistant-shell-v1.js`
- `scripts/audit-physical-security-back-continue-shell.js`
- `scripts/audit-physical-security-button-polish-v1.js`
- `scripts/audit-physical-security-category-completion-changelog-v1.js`
- `scripts/audit-physical-security-category-guidance-foundation-v1.js`
- `scripts/audit-physical-security-category-guidance-live-v1.js`
- `scripts/audit-physical-security-category-guidance-renderer-v1.js`
- `scripts/audit-physical-security-category-guidance-script-wiring-v1.js`
- `scripts/audit-physical-security-category-guidance-web-ready-v1.js`
- `scripts/audit-physical-security-core-optional-flow-v1.js`
- `scripts/audit-physical-security-export-visuals-v1.js`
- `scripts/audit-physical-security-guidance-adapters-v1.js`
- `scripts/audit-physical-security-guidance-event-bridge-v1.js`
- `scripts/audit-physical-security-guidance-memory-proof-v1.js`
- `scripts/audit-physical-security-guide-polish-v1.js`
- `scripts/audit-physical-security-icon-inventory-v1.js`
- `scripts/audit-physical-security-input-presets-v1.js`
- `scripts/audit-physical-security-knowledge-web-ready-v1.js`
- `scripts/audit-physical-security-landing-cleanup-v1.js`
- `scripts/audit-physical-security-lens-collapsible-export-v1.js`
- `scripts/audit-physical-security-lens-duplicate-export-cleanup-v1.js`
- `scripts/audit-physical-security-lens-export-graphics-v1.js`
- `scripts/audit-physical-security-lens-final-ui-polish-v1.js`
- `scripts/audit-physical-security-lens-module-alignment-v1.js`
- `scripts/audit-physical-security-lens-report-polish-v1.js`
- `scripts/audit-physical-security-lens-runtime-kb-card-v1.js`
- `scripts/audit-physical-security-lens-summary-continue-v1.js`
- `scripts/audit-physical-security-lens-summary-cta-persistent-state-v1.js`
- `scripts/audit-physical-security-lens-summary-cta-source-v1.js`
- `scripts/audit-physical-security-lens-summary-cta-state-v1.js`
- `scripts/audit-physical-security-lens-ui-cleanup-v1.js`
- `scripts/audit-physical-security-local-assistant-rollout-status-v1.js`
- `scripts/audit-physical-security-master-owned-category-knowledge-v1.js`
- `scripts/audit-physical-security-optional-branch-return-v1.js`
- `scripts/audit-physical-security-report-summary-proof-v1.js`
- `scripts/audit-physical-security-shell-v1.js`
- `scripts/audit-physical-security-source-integrity-v1.js`
- `scripts/audit-physical-security-summary-action-next-steps-v1.js`
- `scripts/audit-physical-security-summary-area-rollup-first-v1.js`
- `scripts/audit-physical-security-summary-area-selector-rail-v1.js`
- `scripts/audit-physical-security-summary-area-step-caption-v1.js`
- `scripts/audit-physical-security-summary-area-step-header-cell-v1.js`
- `scripts/audit-physical-security-summary-area-step-header-row-v1.js`
- `scripts/audit-physical-security-summary-area-step-headings-v1.js`
- `scripts/audit-physical-security-summary-area-zone-heading-polish-v1.js`
- `scripts/audit-physical-security-summary-carryover-display-v1.js`
- `scripts/audit-physical-security-summary-continue-actions-cleanup-v1.js`
- `scripts/audit-physical-security-summary-detail-labels-v1.js`
- `scripts/audit-physical-security-summary-dori-dedupe-v1.js`
- `scripts/audit-physical-security-summary-dori-wording-v1.js`
- `scripts/audit-physical-security-summary-export-area-zone-sections-v1.js`
- `scripts/audit-physical-security-summary-export-unblocked-v1.js`
- `scripts/audit-physical-security-summary-footer-gap-v1.js`
- `scripts/audit-physical-security-summary-footer-lift-v1.js`
- `scripts/audit-physical-security-summary-footer-placement-v1.js`
- `scripts/audit-physical-security-summary-hide-exact-rollup-section-v1.js`
- `scripts/audit-physical-security-summary-hide-report-status-pill-v1.js`
- `scripts/audit-physical-security-summary-hide-security-rollup-card-v1.js`
- `scripts/audit-physical-security-summary-live-area-step-heading-hide-v1.js`
- `scripts/audit-physical-security-summary-master-copy-polish-v1.js`
- `scripts/audit-physical-security-summary-master-draft-queue-v1.js`
- `scripts/audit-physical-security-summary-master-pill-cleanup-v1.js`
- `scripts/audit-physical-security-summary-master-polish-v1.js`
- `scripts/audit-physical-security-summary-page-flow-polish-v1.js`
- `scripts/audit-physical-security-summary-page-polish-v1.js`
- `scripts/audit-physical-security-summary-pipeline-nav-v1.js`
- `scripts/audit-physical-security-summary-pipeline-width-v1.js`
- `scripts/audit-physical-security-summary-print-header-fix-v1.js`
- `scripts/audit-physical-security-summary-priority-interpretation-v1.js`
- `scripts/audit-physical-security-summary-priority-scope-v1.js`
- `scripts/audit-physical-security-summary-proof-v1.js`
- `scripts/audit-physical-security-summary-readiness-pill-cleanup-v1.js`
- `scripts/audit-physical-security-summary-remove-hero-ring-v1.js`
- `scripts/audit-physical-security-summary-report-carryover-values-v1.js`
- `scripts/audit-physical-security-summary-report-dedupe-v1.js`
- `scripts/audit-physical-security-summary-report-ledger-fallback-v1.js`
- `scripts/audit-physical-security-summary-report-status-text-v1.js`
- `scripts/audit-physical-security-summary-report-table-polish-v1.js`
- `scripts/audit-physical-security-summary-report-table-title-v1.js`
- `scripts/audit-physical-security-summary-scope-pill-cleanup-v1.js`
- `scripts/audit-physical-security-summary-scoped-counts-v1.js`
- `scripts/audit-physical-security-summary-scoped-link-summary-text-v1.js`
- `scripts/audit-physical-security-summary-scoped-tool-links-v1.js`
- `scripts/audit-physical-security-summary-selected-rollup-detail-labels-v1.js`
- `scripts/audit-physical-security-summary-selected-scope-guidance-v1.js`
- `scripts/audit-physical-security-summary-single-report-render-v1.js`
- `scripts/audit-physical-security-summary-status-text-polish-v1.js`
- `scripts/audit-physical-security-summary-tool-notes-actions-v1.js`
- `scripts/audit-physical-security-summary-tool-notes-menu-flow-v1.js`
- `scripts/audit-physical-security-summary-tool-notes-menu-glyph-v1.js`
- `scripts/audit-physical-security-summary-tool-notes-menu-overlay-v1.js`
- `scripts/audit-physical-security-summary-tool-notes-menu-v1.js`
- `scripts/audit-physical-security-summary-tool-notes-rollup-v1.js`
- `scripts/audit-physical-security-summary-tool-notes-wrap-v1.js`
- `scripts/audit-physical-security-summary-top-priority-text-v1.js`
- `scripts/audit-physical-security-summary-top-priority-wording-v1.js`
- `scripts/audit-physical-security-summary-watch-risk-description-v1.js`
- `scripts/audit-physical-security-user-guidance-contract-v1.js`
- `scripts/audit-pixel-density-guidance-adapter-v1.js`
- `scripts/audit-pixel-density-guidance-event-bridge-proof-v1.js`
- `scripts/audit-pixel-density-local-assistant-proof-v1.js`
- `scripts/audit-poe-budget-guide-polish-v1.js`
- `scripts/audit-scene-illumination-guidance-adapter-v1.js`
- `scripts/audit-scene-illumination-guidance-event-bridge-proof-v1.js`
- `scripts/audit-scene-illumination-local-assistant-proof-v1.js`
- `scripts/audit-scopedlabs-cad-icons-v1.js`
- `scripts/audit-shared-export-report-text-wrap-v1.js`
- `scripts/audit-shared-export-tool-notes-column-widths-v1.js`
- `scripts/audit-status-legend-standard-v1.js`
- `scripts/audit-supabase-config.js`
- `scripts/audit-tools-landing-cleanup-v1.js`
- `scripts/audit-tools-landing-cta-centered-v1.js`
- `scripts/audit-tools-landing-no-breadcrumb-pills-v1.js`
- `scripts/audit-tools-opening-page-link-coverage-0612.js`
- `scripts/audit-tools-opening-page-readiness-0612.js`
- `scripts/audit-tools-opening-page-safe-fix-targets-0612.js`
- `scripts/audit-tools-opening-pages-0612.js`
- `scripts/audit-tools-opening-pages-evidence-suite-0612.js`
- `scripts/verify-access-control-0611.js`

## Current known special-route lessons

- Global exporter: `assets/export.js`.
- Shared assistant export helpers: `assets/scopedlabs-assistant-export.js`.
- CPU export route: per-tool custom payload builder.
- Fail-Safe export route: Access Control output-shell/export getter pattern.
- Generic `[data-export-section]` cloning is useful, but not enough for every chart/proof export.

## Compute active upgrade planning

- `scripts/audit-compute-ram-planning-upgrade-v1.js` tracks RAM Sizing readiness to move from simple calculator behavior toward a CPU-style planning tool.
- RAM Sizing current target: `RAM Capacity Envelope`.
- RAM Sizing should be upgraded before broad shell rollout.
- Expected future RAM route: `ScopedLabsComputeRamExport.buildPayload` only after the RAM visual/proof model exists.

## Tool Planning Profile Audit

Status: ACTIVE

Implemented audit:
- `scripts/audit-scopedlabs-tool-planning-profile-v1.js`

Purpose:
- Reusable read-only inventory audit for category/tool planning profiles.
- Scans category planner pages, summary pages, and tool pages.
- Detects inputs, actions, loaded scripts/modules, visual signals, assistant signals, export/snapshot/pipeline signals, Back/Continue flow signals, local SVG/visual signals, and named WATCH items.
- May write category planning profile drafts under `docs/tool-planning-profiles/`.
- Does not rewrite tool pages.

Guardrail:
- Audit output is a discovery/profile draft only.
- Do not wire modules or rewrite pages until the category/tool planning profile and data contract are reviewed and approved.

## Tool Engineering Readiness Audit

Script:
- scripts/audit-scopedlabs-tool-engineering-readiness-v1.js

Purpose:
- Read-only gate between planning/data-contract documentation and tool implementation.
- Confirms whether a tool has enough documented planning direction to allow engineering-capability work.
- Reports PASS, WATCH, FAIL, and optional strict failure behavior.

Expected use:
- Run after the category planning profile and tool data contract review.
- Run before modifying tool calculations, visuals, assistants, export payloads, snapshot behavior, or pipeline behavior.

Example:
- node .\scripts\audit-scopedlabs-tool-engineering-readiness-v1.js --category compute --tools cpu-sizing,ram-sizing,storage-iops,storage-throughput

### Compute capacity-envelope shared contract audit

- `scripts/audit-compute-capacity-envelope-shared-contract-v1.js` proves CPU/RAM shared capacity-envelope adoption.
- `assets/scopedlabs-compute-capacity-visuals.js` exposes CPU and RAM adapter exports:
  - `buildCapacityEnvelopeSvg`
  - `buildCpuCapacityEnvelopeSvg`
  - `renderCpuCapacityEnvelope`
  - `buildRamCapacityEnvelopeSvg`
  - `renderRamCapacityEnvelope`
  - `clear`
- CPU Sizing delegates the CPU Capacity Envelope SVG builder to the shared module while preserving `window.ScopedLabsComputeCpuExport.buildPayload`.
- RAM Sizing continues to consume the shared RAM renderer and keeps `capacityEnvelope` in the flow payload.

### Compute capacity-envelope live-review correction 004

- `assets/scopedlabs-compute-capacity-visuals.js` version `scopedlabs-compute-capacity-visuals-004-ram-envelope-layout` keeps CPU as the accepted reference and tightens the RAM adapter layout.
- Live-review correction scope: RAM SVG layout spacing, label placement, shorter status chip, CPU-style chart rhythm, and matching cache-bust/audit version.
- Non-goals: CPU math, RAM math, export.js, snapshot behavior, pipeline keys, Continue routes, auth, checkout, and Knowledge Base behavior.

### Compute capacity-envelope RAM declutter legend 006

- `assets/scopedlabs-compute-capacity-visuals.js` version `scopedlabs-compute-capacity-visuals-006-ram-declutter-legend` removes RAM footer clutter while preserving a single color-coded reference legend.
- RAM marker detail is moved to SVG hover titles on the marker points.
- Non-goals: CPU math, RAM math, CPU visual behavior, export.js, snapshot behavior, pipeline keys, Continue routes, auth, checkout, Knowledge Base behavior, and page layout order.

### Compute capacity-envelope RAM clean card 007

- `assets/scopedlabs-compute-capacity-visuals.js` version `scopedlabs-compute-capacity-visuals-007-ram-clean-card` removes the RAM SVG's extra rounded background layer.
- RAM chart cleanup removes the redundant vertical GB axis label and replaces problematic separator glyphs with plain hyphens.
- Non-goals: CPU math, RAM math, CPU visual behavior, export.js, snapshot behavior, pipeline keys, Continue routes, auth, checkout, Knowledge Base behavior, and page layout order.

### Compute capacity-envelope clean family 008

- `assets/scopedlabs-compute-capacity-visuals.js` version `scopedlabs-compute-capacity-visuals-008-cpu-ram-clean-family` aligns CPU and RAM adapters to the same clean capacity-envelope family rhythm.
- CPU adapter now uses the same clean module-level pattern as RAM: short status chip, zone labels on chart, marker hover titles, and a single color-coded reference legend.
- Non-goals: CPU math, RAM math, export.js, snapshot behavior, pipeline keys, Continue routes, auth, checkout, Knowledge Base behavior, and page layout order.

### Compute capacity-envelope CPU cores axis label 009

- `assets/scopedlabs-compute-capacity-visuals.js` version `scopedlabs-compute-capacity-visuals-009-cpu-cores-axis-label` adds a compact `cores` left-axis label to the CPU Capacity Envelope adapter.
- `cores` is used instead of `CPU` to avoid implying the tick values represent physical CPU count.
- RAM keeps its `GB` unit treatment.
- Non-goals: CPU math, RAM math, export.js, snapshot behavior, pipeline keys, Continue routes, auth, checkout, Knowledge Base behavior, and page layout order.

### Compute workload carryover contract audit

- `scripts/audit-compute-workload-carryover-contract-v1.js` protects the CPU/RAM workload carryover contract.
- `tools/compute/cpu-sizing/index.html` and `tools/compute/ram-sizing/index.html` must expose the same canonical `workload` option values.
- `tools/compute/ram-sizing/script.js` hydrates the RAM workload selector from CPU pipeline context when a previous CPU result exists.
- Non-goals: visual module changes, CPU/RAM capacity math redesign, export.js changes, auth, checkout, Knowledge Base behavior, and page layout redesign.

### Compute planner carryover contract audit

- `scripts/audit-compute-planner-carryover-contract-v1.js` protects Compute Planner -> CPU -> RAM carryover.
- `tools/compute/cpu-sizing/script.js` hydrates CPU workload, workload pattern, target utilization, and growth reserve from the active Compute Workload Planner context.
- `tools/compute/ram-sizing/script.js` reads planner context from the upstream CPU result and carries planner/upstream CPU context forward without conflating RAM headroom with planner growth margin.
- Non-goals: visual module changes, CPU/RAM capacity-envelope chart changes, export.js changes, auth, checkout, Knowledge Base behavior, and page layout redesign.

### Compute planner Bursty demand carryover

- `tools/compute/cpu-sizing/script.js` maps Workload Planner Demand `Bursty` to CPU Workload Pattern `burstHeavy`.
- `scripts/audit-compute-planner-carryover-contract-v1.js` protects the Bursty -> Burst-heavy carryover alias.
- Non-goals: RAM behavior, visual modules, export.js, auth, checkout, Knowledge Base behavior, and page layout redesign.

### Compute CPU planner back route audit

- `scripts/audit-compute-cpu-back-route-v1.js` protects CPU Sizing back navigation.
- `tools/compute/cpu-sizing/index.html` should route Back to `/tools/compute/workload-planner/`, keep Continue pointed to RAM Sizing, and keep the back action inside the main CPU page flow.
- Non-goals: CPU math, RAM behavior, capacity-envelope visual module, export.js, auth, checkout, Knowledge Base behavior, and page redesign.

### Compute CPU planner flow actions audit

- `scripts/audit-compute-cpu-back-route-v1.js` protects CPU Sizing planner-style flow actions.
- `tools/compute/cpu-sizing/index.html` should render Back to Workload Planner and Continue to RAM Sizing in one `compute-flow-actions` row after Export Report.
- Back remains visible; Continue keeps `id="continue-wrap"` and `id="continue"` so existing show/hide and route logic still works.
- Non-goals: CPU math, RAM behavior, capacity-envelope visual module, export.js, auth, checkout, Knowledge Base behavior, and page redesign.

### Compute flow actions shell contract

- `assets/scopedlabs-compute-shell-contract.js` version `scopedlabs-compute-shell-contract-002-flow-actions` owns Compute Back/Continue flow-action styling and label normalization.
- `tools/compute/cpu-sizing/index.html` and `tools/compute/ram-sizing/index.html` use shell-owned `data-compute-flow-owner="compute-shell-contract"` action rows while preserving existing `continue-wrap` / `continue` IDs for page scripts.
- `scripts/audit-compute-flow-actions-shell-contract-v1.js` verifies shell ownership, duplicate-ID prevention, route targets, and safe arrow entity rendering.
- Non-goals: CPU math, RAM math, capacity-envelope visuals, export.js, auth, checkout, Knowledge Base behavior, and page redesign.

### Compute flow actions idempotent hotfix

- `assets/scopedlabs-compute-shell-contract.js` version `scopedlabs-compute-shell-contract-003-flow-actions-idempotent` prevents flow-action normalization from retriggering the shell MutationObserver continuously.
- CPU and RAM now load the idempotent shell contract version.
- `scripts/audit-compute-flow-actions-shell-contract-v1.js` checks the idempotent helper guards and debounced observer.

### Compute RAM flow action placement

- `tools/compute/ram-sizing/index.html` places the shell-owned Back/Continue row directly after the RAM Export Report section instead of below the main page card.
- `scripts/audit-compute-flow-actions-shell-contract-v1.js` protects RAM action-row placement, route targets, duplicate-ID prevention, and safe arrow rendering.
- Non-goals: RAM math, CPU math, capacity-envelope visuals, export.js, auth, checkout, Knowledge Base behavior, and broad page redesign.

### Compute shell-owned flow action placement

- `assets/scopedlabs-compute-shell-contract.js` version `scopedlabs-compute-shell-contract-004-flow-actions-placement` owns Compute Back/Continue row config, duplicate cleanup, row construction, and placement after Export Report.
- CPU and RAM index files load the shell version but do not own static `compute-flow-actions`, `continue-wrap`, or `continue` markup.
- `scripts/audit-compute-flow-actions-shell-contract-v1.js` verifies shell-owned route contracts, duplicate-ID removal, safe arrow entities, and idempotent observer behavior.
- Non-goals: CPU math, RAM math, capacity-envelope visuals, export.js, auth, checkout, Knowledge Base behavior, and broad page redesign.

### Compute flow actions static-safe shell hotfix

- `assets/scopedlabs-compute-shell-contract.js` version `scopedlabs-compute-shell-contract-005-flow-actions-static-safe` keeps Compute flow-action normalization shell-owned while preventing deletion of valid shell-owned rows.
- CPU and RAM keep one declarative `data-compute-flow-owner="compute-shell-contract"` row so critical Back/Continue navigation does not disappear if shell-created placement fails.
- `scripts/audit-compute-flow-actions-shell-contract-v1.js` verifies one row per page, correct routes, safe arrow entities, and static-safe shell behavior.
- Non-goals: CPU math, RAM math, capacity-envelope visuals, export.js, auth, checkout, Knowledge Base behavior, and broad page redesign.

### Compute CPU status guidance audit

- `scripts/audit-compute-cpu-status-guidance-v1.js` protects CPU Capacity Envelope status authority, compact status chip styling, and Recommended Actions live/export sections.
- `tools/compute/cpu-sizing/script.js` uses `computeCpuAuthoritativeExportStatus` so the export header follows `envelopeStatus` before generic status fallbacks.
- `tools/compute/cpu-sizing/index.html` adds the CPU Recommended Actions proof card and local compact status chip styling.
- Non-goals: CPU chart math, shared capacity visual geometry, RAM behavior, auth, checkout, Knowledge Base behavior, and broad page redesign.

### Compute CPU Recommended Actions export route

- `tools/compute/cpu-sizing/script.js` adds `buildComputeCpuRecommendedActionsExportSection(result)` to the CPU custom export payload.
- Recommended Actions export between Recommendation References and CPU Capacity Decision Schedule.
- `scripts/audit-compute-cpu-status-guidance-v1.js` protects the custom export payload route so live guidance is also report-visible.
- Non-goals: CPU chart math, shared capacity visual geometry, RAM behavior, auth, checkout, Knowledge Base behavior, and broad page redesign.

### Compute export proof stack order audit

- `scripts/audit-compute-export-proof-stack-order-v1.js` protects Compute custom export proof stack order.
- CPU required order: CPU Capacity Envelope, Recommendation References, Recommended Actions, CPU Capacity Decision Schedule.
- Future Compute tools with proof visuals/guidance should use the same custom payload pattern: visual first in `extraSections`, references/actions/schedule below it, and blank `chartImage` to avoid a duplicate bottom Planning Visual.
- Non-goals: global `assets/export.js` behavior, auth, checkout, Knowledge Base, snapshot behavior, and tool calculation math.

### Compute CPU status guidance audit final export order

- `scripts/audit-compute-cpu-status-guidance-v1.js` follows the final CPU export proof-stack order.
- Final CPU order: CPU Capacity Envelope, Recommendation References, Recommended Actions, CPU Capacity Decision Schedule.
- The audit no longer expects the older references/actions/schedule-only stack or the older guidance-export cache-bust token.

### ScopedLabs audit batch runner

- `scripts/run-scopedlabs-audit-batch-v1.js` runs selected audit scripts and prints a consolidated bottom summary.
- It reports which audit failed and repeats structured `[FAIL]` / `[WATCH]` items at the bottom so terminal search hits like `fail-safe` are not confused with actual audit failures.
- Default Compute closeout batch includes CPU status guidance, Compute export proof stack order, Compute flow actions shell, and module map audits.

### Compute CPU export table cell styling

- `tools/compute/cpu-sizing/script.js` now sends explicit report cell objects for CPU Recommended Actions and CPU Capacity Decision Schedule export tables.
- Action, Group, Metric, and Reason cells use normal report weight; the Decision Schedule Value column remains value-emphasized and status-color capable; Engineering Note remains emphasized for readability.
- `scripts/audit-compute-cpu-status-guidance-v1.js` protects this CPU export table cell contract.
- Non-goals: global `assets/export.js`, CPU math, visual geometry, auth, checkout, snapshots, Knowledge Base, and shell behavior.

### Compute export proof table helper

- `assets/scopedlabs-compute-export-proof-tables.js` owns shared Compute proof-table export cell helpers and width contracts.
- `tools/compute/cpu-sizing/script.js` consumes the shared helper for Recommended Actions and CPU Capacity Decision Schedule export tables.
- `scripts/audit-compute-export-proof-table-contract-v1.js` protects the shared helper and CPU consumption path.
- The audit batch runner includes the proof-table contract audit so future Compute tools cannot silently reintroduce cramped proof-table columns or local-only cell styling.
- Non-goals: global `assets/export.js`, CPU math, visual geometry, auth, checkout, snapshots, Knowledge Base, and shell behavior.
