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

### Pattern promotion gate

- `docs/scopedlabs-pattern-promotion-ledger.md` records reusable-looking fixes before closeout.
- `scripts/audit-scopedlabs-pattern-promotion-v1.js` fails when a recurring fix is left as an unclassified page-local patch.
- Required classification: `SHARED_PATTERN`, `ADAPTER_CONSUMER`, or `APPROVED_LOCAL_EXCEPTION`.
- Blocking state: `BLOCKED_PROMOTION_REQUIRED`.
- Purpose: prevent assistant drift from known fixes into one-off tool patches.

### Category navigation and assistant contract promotions

- `docs/scopedlabs-pattern-promotion-ledger.md` now tracks `CATEGORY-PLANNER-SUMMARY-NAV-0618` and `TOOL-ASSISTANT-SUMMARY-CONTRACT-0618` as blocked promotion items.
- These entries prevent manual page-by-page Summary nav links or isolated Tool Assistant wiring from closing without a shared owner, adapter contract, or approved local exception.
- Planned audits: `scripts/audit-scopedlabs-planner-summary-nav-contract-v1.js` and `scripts/audit-scopedlabs-tool-assistant-contract-v1.js`.
- Non-goals: no tool page rewrites, no Summary page scaffolding, no assistant behavior changes in this step.

### Planner/summary nav contract audit

- `scripts/audit-scopedlabs-planner-summary-nav-contract-v1.js` enforces the `CATEGORY-PLANNER-SUMMARY-NAV-0618` promotion lane.
- It excludes `tools/index.html` from category detection by scanning only real category directories.
- Categories with existing Summary pages must expose Summary/rollup links from the category Planner page and tool pipeline navs.
- Categories without Summary pages must be explicitly treated as pending instead of silently failing or receiving broken links.
- Non-goals: no page rewrites and no Summary scaffolding in this audit step.
- Planner/Summary nav contract audit uses actual anchor `href` checks for Summary links and excludes `_factory` paths from category detection.

- `CATEGORY-PLANNER-SUMMARY-NAV-0618` is promoted as an adapter-consumer pattern: Physical Security uses `assets/pipelines.js` + `assets/pipeline.js`; Access Control uses `assets/access-control-category-nav.js`.

- `scripts/audit-scopedlabs-pattern-promotion-v1.js` classifies cache-bust-only Access Control nav consumer updates under `CATEGORY-PLANNER-SUMMARY-NAV-0618` when that ledger entry is `ADAPTER_CONSUMER`.

### Tool assistant to summary contract audit

- `TOOL-ASSISTANT-SUMMARY-CONTRACT-0618` is promoted as an adapter-consumer pattern.
- Shared owner: `assets/scopedlabs-tool-shell.js` for assistant diagnostics and shell expectations.
- Category adapter owners: `assets/access-control-tool-assistant-adapters.js`, `assets/access-control-report-summary.js`, `assets/physical-security-local-assistant.js`, `assets/physical-security-tool-assistant-adapters.js`, `assets/physical-security-guidance-event-bridge.js`, `assets/physical-security-category-guidance.js`, and `assets/scopedlabs-compute-assistant-contract.js`.
- Audit: `scripts/audit-scopedlabs-tool-assistant-contract-v1.js`.
- Non-goals: no tool page rewrites and no new assistant UI in this step.

### Compute RAM capacity visual reference label restore

- `assets/scopedlabs-compute-capacity-visuals.js` version `scopedlabs-compute-capacity-visuals-011-restore-ram-reference-labels` keeps RAM Capacity Envelope rendering in the shared Compute visual module.
- The visible bottom `*1 demand basis`, `*2 reserve pressure`, and `*3 downstream validation` labels are retained because they support chart reading, assistant/result references, export/report proof language, mobile users, keyboard users, and print/PDF readability.
- Existing marker hover/title behavior is left untouched.
- The RAM status chip uses a squared engineering shape, and `tools/compute/ram-sizing/index.html` only receives a cache-bust update for the shared visual module.
- Non-goals: no RAM math change, no RAM page-local SVG proof renderer, no export/snapshot/pipeline behavior change.

### Compute tool shell consumption matrix

- `scripts/audit-compute-tool-shell-consumption-v1.js` tracks which Compute tools consume the CPU-grade Compute tool shell/module stack.
- Current baseline: `cpu-sizing` is the READY gold consumer.
- Current next target: `ram-sizing` is PARTIAL_NEXT because it has the shared capacity visual, Compute shell contract, and analyzer source, but still needs CPU-grade shell modules, assistant mount, internal results ledger, assistant export, local assistant, Compute assistant contract, and user notes.
- `workload-planner` is classified as SPECIAL_PLANNER because it is a category planner/command page, not a normal calculator output shell.
- Remaining Compute calculators are LEGACY_PENDING and should not be patched one-off; each should be upgraded through the shared Compute shell/profile lane.
- This audit is a roadmap and anti-regression gate: READY regressions fail, partial/special/legacy states are reported as WATCH until their lanes are intentionally upgraded.

### Compute RAM shell and assistant upgrade

- `tools/compute/ram-sizing/index.html` is upgraded from PARTIAL_NEXT to READY for the CPU-grade Compute tool shell/module stack.
- RAM keeps the analyzer `results` and `analysis-copy` source inside `computeInternalResultsLedger` so source values remain available while the legacy visible Results card stays hidden.
- RAM consumes `assets/scopedlabs-tool-shell.js`, `assets/scopedlabs-compute-plan-state.js`, `assets/scopedlabs-assistant-export.js`, `assets/scopedlabs-local-assistant.js`, `assets/scopedlabs-compute-assistant-contract.js`, and `assets/scopedlabs-user-tool-notes.js`.
- `tools/compute/ram-sizing/script.js` renders the local assistant from the existing `ramCapacityEnvelope` payload, preserving RAM math, flow keys, export behavior, snapshot behavior, Continue route, and Knowledge Base behavior.
- `assets/scopedlabs-compute-assistant-contract.js` owns the RAM Sizing assistant model and `*1/*2/*3` Recommendation References.
- `scripts/audit-compute-tool-shell-consumption-v1.js` now treats `ram-sizing` as a READY required Compute shell consumer.
- `scripts/audit-scopedlabs-tool-assistant-contract-v1.js` verifies RAM assistant mount, script loading, shared assistant rendering, and shared RAM model ownership.

### Compute RAM assistant summary card hotfix

- `assets/scopedlabs-compute-assistant-contract.js` now routes `ram-sizing` to `renderComputeRamTopSummaryCard(data)` so the RAM live assistant uses the same compact result-summary card rhythm as CPU instead of the generic Local Assistant bullet-list renderer.
- `tools/compute/ram-sizing/index.html` cache-busts the shared Compute assistant contract to `compute-assistant-ram-summary-card-0620`.
- `scripts/audit-scopedlabs-tool-assistant-contract-v1.js` verifies RAM uses the custom Compute summary-card renderer.
- Non-goals: no RAM math change, no RAM visual change, no export/snapshot/pipeline/Knowledge Base behavior change.

### Compute assistant rendering contract

- `scripts/audit-compute-assistant-rendering-contract-v1.js` verifies runtime rendering dependencies for Compute assistant summary cards.
- `assets/scopedlabs-compute-result-visuals.css` owns the shared `.scopedlabs-result-summary-*` classes required by CPU/RAM assistant summary-card renderers.
- `tools/compute/ram-sizing/index.html` cache-busts the shared Compute result visual CSS to `scopedlabs-compute-result-visuals-0620-assistant-summary-card`.
- The audit requires RAM to route through `renderComputeRamTopSummaryCard(data)` before the generic Local Assistant fallback, preventing bullet-list fallback from being treated as READY.
- Non-goals: no RAM math change, no Capacity Envelope change, no export/snapshot/pipeline/Knowledge Base behavior change.

### Compute RAM proof layout

- `tools/compute/ram-sizing/index.html` now places `computeRamReferencesCard` below the RAM Capacity Envelope card.
- `assets/scopedlabs-compute-assistant-contract.js` keeps `renderComputeRamTopSummaryCard(data)` compact and moves detailed `*1/*2/*3` Recommendation References to `renderComputeRamRecommendationReferences(data)`.
- `tools/compute/ram-sizing/script.js` renders the references card from the existing `ramCapacityEnvelope` payload after the RAM visual and clears it during invalidation.
- `assets/scopedlabs-compute-result-visuals.css` restores the normal dark-green ScopedLabs panel styling for shared Compute assistant summary cards and owns the recommendation references card/table styles.
- `scripts/audit-compute-ram-proof-layout-v1.js` prevents detailed footnote rows from returning to the top assistant card and enforces visual-before-references proof stack order.
- Non-goals: no RAM math change, no RAM Capacity Envelope math change, no export/snapshot/pipeline/Knowledge Base behavior change.

### Compute reference marker tone contract

- `assets/scopedlabs-compute-capacity-visuals.js` remains the source of truth for chart footnote marker colors through `.legend-current`, `.legend-growth`, and `.legend-failover`.
- `assets/scopedlabs-compute-result-visuals.css` maps Recommendation References marker numbers to the exact same colors through `--compute-reference-marker-demand`, `--compute-reference-marker-reserve`, and `--compute-reference-marker-validation`.
- Recommendation References table marker cells use the same `*1`, `*2`, and `*3` visual tones as the chart footnotes: demand, reserve pressure, and downstream validation.
- `scripts/audit-compute-reference-marker-tone-v1.js` verifies the CSS marker variables match the chart footnote colors and that table marker-number selectors/classes exist.
- Non-goals: no RAM math change, no CPU/RAM chart geometry change, no export/snapshot/pipeline/Knowledge Base behavior change.

### Compute RAM recommended actions proof card

- `tools/compute/ram-sizing/index.html` now places `computeRamRecommendedActionsCard` below `computeRamReferencesCard` and above Export Report, matching the CPU proof stack rhythm.
- `assets/scopedlabs-compute-assistant-contract.js` owns `renderComputeRamRecommendedActions(data)` and exports it through `window.ScopedLabsComputeAssistant.renderRamRecommendedActions`.
- `tools/compute/ram-sizing/script.js` renders RAM Recommended Actions from the existing `ramCapacityEnvelope` payload after Recommendation References and clears the card during invalidation.
- `assets/scopedlabs-compute-result-visuals.css` owns shared `.compute-recommended-actions-*` card/list styles.
- `scripts/audit-compute-ram-proof-layout-v1.js` now enforces RAM order: Capacity Envelope, Recommendation References, Recommended Actions, then Export Report.
- Non-goals: no RAM math change, no Capacity Envelope change, no export/snapshot/pipeline/Knowledge Base behavior change.

### Compute RAM decision schedule proof card

- `tools/compute/ram-sizing/index.html` now places `computeRamDecisionScheduleCard` below Recommended Actions and above Export Report, matching the CPU proof stack rhythm.
- `assets/scopedlabs-compute-assistant-contract.js` owns `renderComputeRamDecisionSchedule(data)` and exports it through `window.ScopedLabsComputeAssistant.renderRamDecisionSchedule`.
- `tools/compute/ram-sizing/script.js` renders the RAM Decision Schedule from the existing `ramCapacityEnvelope` payload after Recommended Actions and clears the card during invalidation.
- `assets/scopedlabs-compute-result-visuals.css` owns shared `.compute-decision-schedule-*` card/table styles.
- `scripts/audit-compute-ram-proof-layout-v1.js` now enforces RAM order: Capacity Envelope, Recommendation References, Recommended Actions, Decision Schedule, then Export Report.
- Non-goals: no RAM math change, no Capacity Envelope change, no export/snapshot/pipeline/Knowledge Base behavior change.

### Compute RAM decision schedule status badge

- `assets/scopedlabs-compute-assistant-contract.js` now renders the RAM Decision Schedule `Status` value through `ramDecisionScheduleValueCell(row, status)`.
- The Status value uses the shared `scopedlabs-result-summary-status` class plus `ramDecisionStatusClass(status)`, matching the CPU decision schedule colored status badge pattern.
- `tools/compute/ram-sizing/index.html` cache-busts the shared Compute assistant contract to `compute-assistant-ram-decision-status-badge-0620`.
- `scripts/audit-compute-ram-proof-layout-v1.js` now checks the RAM Decision Schedule Status value renders through the colored badge contract.
- Non-goals: no RAM math change, no chart geometry change, no export/snapshot/pipeline/Knowledge Base behavior change.

### Compute RAM export proof parity

- `tools/compute/ram-sizing/index.html` now marks the RAM proof stack cards as export sections: RAM Capacity Envelope, Recommendation References, Recommended Actions, and RAM Capacity Decision Schedule.
- RAM follows the CPU export proof stack order: visual, references, actions, decision schedule, then Export Report.
- `assets/export.js` remains the shared export collector through `[data-export-section]`; no global export hack was added.
- `scripts/audit-compute-ram-export-parity-v1.js` verifies RAM export-aware proof sections, CPU baseline export sections, stack order, shared export collector presence, module-map documentation, and batch inclusion.
- Cache-bust checks in RAM proof/rendering audits now validate the active Compute RAM 0620 proof-stack version families instead of stale single-lane tokens.
- Non-goals: no RAM math change, no chart geometry change, no assistant content change, no snapshot/pipeline/Knowledge Base behavior change.

### Compute RAM export shell parity

- `tools/compute/ram-sizing/index.html` now uses the CPU-grade `compute-export-card` shell with the shared `reportMetadataMount` collapsed Report details UI.
- The legacy RAM `export-grid` fields and `Documentation & Export` pill are removed from the visible page shell; shared `assets/scopedlabs-report-metadata.js` owns report metadata rendering.
- RAM keeps the same `exportReport`, `saveSnapshot`, and `exportStatus` IDs so export/snapshot behavior remains intact.
- `scripts/audit-compute-ram-export-shell-parity-v1.js` verifies RAM export shell parity with CPU, report metadata mount consumption, legacy export-grid removal, button preservation, proof-stack placement, module-map documentation, and batch inclusion.
- Non-goals: no RAM math change, no proof card content change, no chart geometry change, no snapshot/pipeline/Knowledge Base behavior change.

### Compute RAM reset proof stack clearing

- `tools/compute/ram-sizing/script.js` now owns `clearRamCapacityVisual()` and calls it from `invalidate()` before the analyzer invalidation path.
- Reset already uses `invalidate()`, so RAM Reset now clears the Capacity Envelope visual/card along with Recommendation References, Recommended Actions, Decision Schedule, assistant output, flow state, and export readiness.
- `tools/compute/ram-sizing/index.html` cache-busts the RAM script to `compute-ram-reset-clears-proof-stack-0620`.
- `scripts/audit-compute-ram-proof-layout-v1.js` verifies RAM invalidation clears the visual mount/card and that Reset uses the shared invalidation path.
- Non-goals: no RAM math change, no chart geometry change, no assistant/export/snapshot/pipeline/Knowledge Base behavior change.

### Compute RAM top shell parity

- `tools/compute/ram-sizing/index.html` now matches the CPU-grade top shell rhythm: title, design pipeline, hidden flow note, active workload context card, then Planning Inputs.
- Legacy RAM top-shell clutter was removed: breadcrumbs, Free Tier pill, Part of a Design Flow card, and loose Best for line.
- `tools/compute/ram-sizing/script.js` now populates `computeWorkloadContextCard` from the existing CPU/planner carry-forward context instead of showing the old flow-note copy.
- `scripts/audit-compute-ram-top-shell-parity-v1.js` verifies RAM top-shell order, active workload card structure, Planning Inputs copy, script wiring, cache-bust, module-map documentation, and batch inclusion.
- Non-goals: no RAM math change, no chart/proof/export/snapshot/pipeline/Knowledge Base behavior change.

### Compute Planner/Summary pipeline nav

- `assets/pipelines.js` now includes Compute category endpoints in the shared `v1` lane: Planner at `/tools/compute/` and Summary at `/tools/compute/summary/`.
- Planner and Summary are marked with `categoryEndpoint` so the shared pipeline renderer can expose navigation without treating them as ordinary calculator completion steps.
- `assets/pipeline.js` adds `is-category-endpoint` and `data-category-endpoint` semantics and prevents category endpoints from being marked complete just because they are before the current calculator step.
- Compute tool pages that load the shared pipeline assets are cache-busted to `compute-planner-summary-nav-0620`.
- `scripts/audit-compute-planner-summary-pipeline-nav-v1.js` verifies endpoint presence, endpoint order, renderer semantics, tool page consumption, no page-local fake nav, module-map documentation, and batch inclusion.
- Non-goals: no Compute math change, no RAM/CPU proof/export/snapshot behavior change, no checkout/auth/Knowledge Base behavior change.

### Compute pipeline indexed progress fix

- `assets/pipelines.js` keeps Planner and Summary in the shared Compute `v1` lane, with Planner linked to `/tools/compute/workload-planner/` and Summary linked to `/tools/compute/summary/`.
- `assets/pipeline.js` now resolves rendered step state from `step.__slIndex` before falling back to `steps.indexOf(step)`, preserving original progress LEDs when grouped/cloned step objects are rendered.
- This fixes the regression where every Compute step appeared complete/current after adding Planner/Summary endpoints.
- The renderer preserves the original progress model: current page gets `is-current`, previous completed/past steps get `is-complete`, future steps get `is-future`, and Planner/Summary remain category endpoints.
- `scripts/audit-compute-planner-summary-pipeline-nav-v1.js` verifies endpoint URLs/order, indexed progress logic, category endpoint semantics, cache-busts, no fake page-local nav, module-map documentation, and batch inclusion.
- Non-goals: no current-only progress mode, no Compute math change, no RAM/CPU proof/export/snapshot behavior change, no checkout/auth/Knowledge Base behavior change.

### Compute Planner endpoint progress fix

- `assets/pipeline.js` now treats only the Summary endpoint as excluded from automatic past/completed progress.
- Planner remains a category endpoint link but participates in normal pipeline progress, so it glows as complete on CPU/RAM and downstream Compute tool pages.
- `assets/pipelines.js` keeps Planner linked to `/tools/compute/workload-planner/` and Summary linked to `/tools/compute/summary/`.
- Compute pages that load the shared pipeline assets are cache-busted to `compute-planner-progress-endpoint-0620`.
- `scripts/audit-compute-planner-summary-pipeline-nav-v1.js` verifies Planner endpoint progress participation, Summary endpoint semantics, stable indexed progress, endpoint URLs, and cache-busts.
- Non-goals: no current-only mode, no Compute math change, no RAM/CPU proof/export/snapshot behavior change.

### Compute RAM active workload context

- `tools/compute/ram-sizing/script.js` now reads active Compute workload context from `ScopedLabsComputePlanState` when available and from Compute workload plan storage keys as fallback.
- RAM shows the CPU-grade `computeWorkloadContextCard` from planner/workload context even when a CPU flow result is not present in session storage.
- When CPU carry-forward exists, RAM enriches the same card with CPU sizing context and carries that planner context into the RAM result payload.
- `tools/compute/ram-sizing/index.html` cache-busts the RAM script to `compute-ram-active-workload-context-0620`.
- `scripts/audit-compute-ram-top-shell-parity-v1.js` verifies active workload context reading and planner context carry-forward.
- Non-goals: no RAM math change, no chart/proof/export/snapshot/pipeline/Knowledge Base behavior change.

### Compute RAM active workload context initialization

- `tools/compute/ram-sizing/script.js` now initializes the RAM Active Workload card immediately after the context reader is defined, before later event wiring.
- This preserves the CPU-style top rhythm on RAM: pipeline, guide, Active Workload card, then Planning Inputs.
- `tools/compute/ram-sizing/index.html` cache-busts the RAM script to `compute-ram-active-workload-context-init-0620`.
- `scripts/audit-compute-ram-top-shell-parity-v1.js` verifies the immediate initialization path.
- Non-goals: no RAM math change, no chart/proof/export/snapshot/pipeline/Knowledge Base behavior change.

### Compute RAM shared workload display consumption

- `tools/compute/ram-sizing/script.js` now consumes `ScopedLabsComputePlanState.renderWorkloadDisplay()` for the Active Workload card, matching CPU's shared-module pattern.
- The large RAM-local active workload reader path was removed; `assets/scopedlabs-compute-plan-state.js` owns active workload display context and card rendering.
- RAM keeps only a small tool adapter: `toolLabel: "RAM Sizing"`, target card/title/copy/meta elements, and existing RAM-specific input hydration.
- `tools/compute/ram-sizing/index.html` cache-busts the RAM script to `compute-ram-shared-workload-display-0620`.
- `scripts/audit-compute-ram-top-shell-parity-v1.js` verifies shared module consumption and blocks RAM from re-owning a local active workload reader.
- Non-goals: no RAM math change, no chart/proof/export/snapshot/pipeline/Knowledge Base behavior change.

### Compute shell workload context card owner\n\n- `assets/scopedlabs-compute-shell-contract.js` now initializes the standard Compute Active Workload card slot by calling `ScopedLabsComputePlanState.renderWorkloadDisplay()`.\n- This moves Active Workload card rendering ownership into the shared Compute shell contract instead of relying on RAM-local page logic.\n- Compute pages that load the shell contract are cache-busted to `scopedlabs-compute-shell-contract-006-workload-context-card`.\n- `scripts/audit-compute-ram-top-shell-parity-v1.js` verifies shell ownership and RAM shell-version consumption.\n- Non-goals: no RAM math change, no chart/proof/export/snapshot/pipeline/Knowledge Base behavior change.

### Compute grouped pipeline nav

- `assets/pipelines.js` now models Compute like Access Control: Foundation / Core Compute Pipeline / Optional Specialty Zones.
- `Workload Planner` is isolated in the Foundation group; CPU, RAM, Storage IOPS, Storage Throughput, VM Density, and Summary are core; GPU VRAM, Power / Thermal, RAID Rebuild, and Backup Window are optional specialty.
- `assets/pipeline.js` now supports category-specific grouped labels/descriptions from step metadata, so Compute does not inherit Access-specific group names.
- Foundation progress can complete across groups, allowing Workload Planner to glow when the active tool is in the core Compute pipeline.
- Compute pages that consume the shared pipeline assets are cache-busted to `compute-grouped-pipeline-nav-0620`.
- `scripts/audit-compute-planner-summary-pipeline-nav-v1.js` verifies grouped Compute pipeline ownership and renderer support.
- Non-goals: no RAM math change, no active workload card behavior change, no export/snapshot/Knowledge Base behavior change.

### Compute dynamic workload planner nav

- `assets/scopedlabs-compute-plan-state.js` now owns a dynamic Compute workload planner nav renderer and dispatches `scopedlabs:compute:workload-plan-change` when workloads are saved, selected, removed, or reset.
- `assets/pipeline.js` delegates the Compute foundation group to the shared dynamic workload nav, so tool pages show saved workloads and the active workload instead of a static Foundation step.
- `assets/scopedlabs-category-planner-shell.js` supports a dynamic workload-planner nav mount, and `assets/scopedlabs-compute-planner-adapter.js` uses it for the planner page.
- Compute workload deletion now uses shared `State.removeWorkload(id)` so deleted workloads disappear from active navs and active context is cleaned or advanced.
- Compute pages are cache-busted to `compute-dynamic-workload-planner-nav-0620`; the plan-state module is cache-busted to `scopedlabs-compute-plan-state-006-dynamic-workload-nav`.
- Non-goals: no CPU/RAM math change, no export/snapshot/Knowledge Base behavior change.

### Compute workload planner nav link cleanup

- `assets/scopedlabs-compute-plan-state.js` now renders dynamic saved workload nav items without the extra `Active:` sentence under the Compute Workload Planner label.
- Saved workload nav items no longer render separator arrows between workloads.
- Only the actual active workload receives the current/glowing pipeline state; non-active saved workloads use future/muted state.
- Saved workload nav items link back to `/tools/compute/workload-planner/` and set that workload active before navigation.
- Compute pages are cache-busted to `scopedlabs-compute-plan-state-007-workload-nav-links`.
- Non-goals: no CPU/RAM math change, no export/snapshot/Knowledge Base behavior change.

### Compute active workload planner visual

- `assets/scopedlabs-compute-planner-adapter.js` now renders the main Workload Planner branch-map visual from the current active workload, while keeping the lower rollup metrics/tables aggregate across all saved workloads.
- The visual center count now reports the active workload branch count; workload count chips still show the total saved workload count.
- The planner adapter subscribes to `ScopedLabsComputePlanState.onPlanChange()` so save/select/delete/reset updates refresh the chart from shared plan state.
- `tools/compute/workload-planner/index.html` cache-busts the adapter to `scopedlabs-compute-planner-adapter-011-active-workload-visual`.
- `scripts/audit-compute-planner-summary-pipeline-nav-v1.js` verifies active-scoped chart rendering and shared plan-state re-render behavior.
- Non-goals: no CPU/RAM math change, no export/snapshot/Knowledge Base behavior change.

### Compute CPU capacity readable scale

- `assets/scopedlabs-compute-capacity-visuals.js` is the shared authority for CPU Capacity Envelope scale, Watch/Risk thresholds, and chart status.
- CPU Watch/Risk thresholds align to usable CPU capacity, not raw recommended logical-core count, so low target-utilization scenarios keep the chart zones and status chip in agreement.
- The CPU visual now uses an adaptive scale floor: small CPU plans can render on a small core range, while very large recommendations still render as above-scale callouts.
- `tools/compute/cpu-sizing/script.js` delegates CPU envelope threshold/status calculation to the shared module when available, keeping the CPU page as a consumer instead of a second authority.
- CPU/RAM pages load `scopedlabs-compute-capacity-visuals-015-adaptive-cpu-scale`; CPU loads `compute-cpu-unified-envelope-status-0620`.
- `scripts/audit-compute-cpu-capacity-envelope-scale-v1.js` runtime-tests both the small 2-core case and the 10% target / high-recommended-core case.
- Non-goals: no CPU sizing input math change, no RAM chart math change, no export/snapshot/Knowledge Base behavior change.

### ScopedLabs category module coverage audit

- `scripts/audit-scopedlabs-category-module-coverage-v1.js` is the reusable module coverage and compatibility audit for category tool modernization.
- The audit inventories each tool page/script, reads `docs/scopedlabs-module-map.md`, scans existing `assets/` and `scripts/` modules, then classifies each tool as `GOLD_REFERENCE`, `MODERN_READY`, `PARTIAL_MODERN`, `LEGACY_EXPORT_TOOL`, `SPECIAL_PATH_REVIEW`, `NEEDS_MODULE_REVIEW`, or `MISSING_FILE`.
- Compute uses `cpu-sizing` as the current gold reference because it has the accepted modern stack: plan-state, active workload context, shared shell, local assistant, export/report metadata, KB/help, flow controls, and `recordToolResult` ledger publishing.
- The audit does not auto-install modules. It reports current coverage and recommends compatible existing modules for missing capabilities.
- The audit is registered in `scripts/run-scopedlabs-audit-batch-v1.js` and should be run before broad category modernization patches.
- Initial supported category config: `compute`; other categories can be added as adapters/manifests without rewriting the audit engine.
### Compute workload ledger contract

- `scripts/audit-compute-workload-ledger-v1.js` verifies the Compute workload ledger publisher contract.
- Compute tool pages must load `assets/scopedlabs-compute-plan-state.js` before their local calculator script when they publish workload results.
- Compute tool scripts publish explicit calculator payloads through `ScopedLabsComputePlanState.recordToolResult()` using a local `saveComputeLedgerResult()` wrapper.
- `assets/scopedlabs-compute-planner-adapter.js` reads `plan.results` so Workload Planner can show completed checks, latest saved results, and the next action for each workload.
- This contract intentionally avoids generic DOM/MuationObserver scraping; ledger publishers must be explicit tool-result hooks.
### Compute workload planner branch-scoped ledger

- `assets/scopedlabs-compute-planner-adapter.js` must keep branch tables scoped to the branch being displayed.
- Core rows may show CPU/RAM progress and global next action, but storage, GPU, infrastructure, and recovery branch tables must not inherit unrelated CPU/RAM checks.
- `scripts/audit-compute-workload-ledger-v1.js` includes a behavior fixture for the case where CPU/RAM are complete, the GPU branch is flagged, and GPU VRAM has not run; expected GPU branch checks are `0` with a pending GPU VRAM action.
### Compute workload planner metadata placement

- `assets/scopedlabs-compute-planner-adapter.js` owns the Compute-specific placement rule that moves `computeWorkloadReportMetadataSection` after `scopeSummaryCard` after the shared category planner shell renders.
- `tools/compute/workload-planner/index.html` cache-busts the adapter with `scopedlabs-compute-planner-adapter-014-metadata-bottom`.
- `scripts/audit-compute-workload-planner-metadata-placement-v1.js` verifies the metadata section is moved below the workload summary/report actions instead of sitting between the workload ledger and summary.
### Compute guided-flow mode contract

- `assets/scopedlabs-compute-plan-state.js` owns the explicit guided-flow context key `scopedlabs:pipeline:compute:guided-flow`.
- Guided mode starts only when the Workload Planner `Start Guided Flow` action calls `ScopedLabsComputePlanState.startGuidedFlow()`.
- Direct tool visits remain standalone by default; guided routing, dynamic branch queues, return-to-core behavior, and stop logic must consume `getGuidedFlowContext()` defensively in later route-engine work.
- `assets/scopedlabs-compute-planner-adapter.js` changes the planner Continue CTA into `Start Guided Flow ? CPU Sizing`, saves the active workload, starts guided context, and then navigates to the first routed tool.
- `scripts/audit-compute-guided-flow-mode-v1.js` verifies the guided-flow key, API, planner entry action, cache bust, and module-map documentation.
### Compute guided route engine

- `assets/scopedlabs-compute-guided-route-engine.js` owns Compute guided-flow route decisions without forcing standalone tool pages into workflow mode.
- The route engine consumes explicit guided context, active workload branches, and workload-scoped completed ledger results.
- Base guided route is CPU Sizing then RAM Sizing. Storage, VM Density, GPU VRAM, Power & Thermal, NIC Bonding, RAID Rebuild, and Backup Window are included only when their planner branch is selected.
- The engine returns `standalone` when no guided context exists, `start` or `resume` when work remains, and `review-summary` only after all applicable selected/required checks are complete.
- `scripts/audit-compute-guided-route-engine-v1.js` proves standalone mode, start/resume behavior, mid-pipeline resume, branch queue order, specialty branch completion, and summary-only-after-applicable-work-complete behavior.
### Compute planner input contract

- `assets/scopedlabs-compute-planner-adapter.js` is the Compute proof for the global Planner Gate pattern.
- The planner collects broad route-driving context: workload identity, environment, planning path, workload type, demand pattern, operating window, criticality, target utilization, growth margin, redundancy goal, primary constraint, and notes.
- The planner owns broad branch intent only: VM density, storage/performance, GPU/acceleration, power/thermal, RAID, backup, and NIC bonding.
- Detailed calculator values remain inside individual standalone tools; the planner must not duplicate exact CPU, RAM, IOPS, throughput, VRAM, wattage, RAID, backup, or NIC calculation inputs.
- `scripts/audit-compute-planner-input-contract-v1.js` verifies the broad planner inputs, branch keys, path defaults, branch seeds, route-engine key alignment, and no detailed tool-input duplication.
### Compute planner route CTA

- `assets/scopedlabs-compute-planner-adapter.js` now consumes `assets/scopedlabs-compute-guided-route-engine.js` for the Workload Planner Continue CTA.
- The planner CTA remains a guided-flow entry action, but its destination and label are refreshed from the route decision when guided context exists.
- Direct tool visits remain standalone because the route engine returns standalone without explicit guided context.
- `scripts/audit-compute-planner-route-cta-v1.js` verifies script order, cache busting, route-engine consumption, guided-flow decision navigation, standalone guard preservation, and module-map registration.
### Compute guided route CTA arrow encoding

- `assets/scopedlabs-compute-guided-route-engine.js` and `assets/scopedlabs-compute-planner-adapter.js` must keep guided route CTA labels encoding-safe.
- Guided CTA arrow labels must use ASCII-safe Unicode escape handling in source and must not render corrupted `?` separators.
- `tools/compute/workload-planner/index.html` cache-busts both the planner adapter and route engine when guided CTA label behavior changes.
- `scripts/audit-compute-planner-route-cta-v1.js` guards against `Start Guided Flow ?`, `Resume Guided Flow ?`, `\\u2192?`, and `\\u2192 ?` label corruption.
- This is part of the ScopedLabs golden rule: do not introduce literal special glyphs or smart punctuation in code patches where encoding/cache can corrupt them.
### ScopedLabs audit quality rule

- Permanent audits should validate stable contracts and user-facing outcomes, not yesterday's exact cache-bust name or temporary patch wording.
- Exact cache-bust checks are allowed only when the exact value is itself the contract or when the audit is a temporary migration gate.
- Durable cache-bust checks should verify that a scoped, versioned script is present, for example `module-name-[0-9]{3}-meaningful-token`, rather than pinning one old token forever.
- UI text audits should guard bad outcomes such as corrupted question-mark separators, missing route-engine decisions, missing standalone guards, or missing module-map updates.
- JS/HTML/CSS patches should avoid literal special glyphs where encoding/cache can corrupt them. Use ASCII-safe escapes or entities, such as `\\u2192` in JS and `&rarr;` in HTML.
### Compute tool Continue route wiring

- `assets/scopedlabs-compute-shell-contract.js` owns guided Continue routing for Compute tool pages.
- CPU and RAM load `assets/scopedlabs-compute-guided-route-engine.js` before the shell contract so Continue can route through the guided engine when explicit guided context exists.
- Direct tool visits remain standalone and keep the default shell Continue destinations.
- Guided Continue routing must ignore stale/localStorage-only state unless the explicit guided context has `guidedFlow: true` and `routeMode: "compute-guided"`.
- `scripts/audit-compute-tool-continue-route-v1.js` guards the CPU/RAM proof and checks versioned cache-busts without pinning one exact old token.
### Compute planner multi-workload route

- `assets/scopedlabs-compute-planner-adapter.js` must not resolve the bottom planner CTA from only the active guided workload when other saved workloads still have applicable pending checks.
- The planner CTA scans saved workloads and prefers pending applicable work before showing `Review Compute Summary`.
- Alternate workload routes are marked with `data-compute-guided-route-workload-id` and `data-compute-guided-route-alt-workload` so the click starts guided flow for the routed workload.
- `scripts/audit-compute-planner-multi-workload-route-v1.js` guards against Summary winning while visible saved workload branches still require work.
### Compute guided pipeline LED state

- `assets/pipeline.js` owns the shared Design Pipeline LED renderer.
- In Compute guided mode, the renderer should use the Compute route engine and workload ledger to mark completed applicable tools, current tool, future selected work, skipped/not-applicable tools, and Summary.
- Completed Compute tools receive `is-complete`; current tool receives `is-current`; non-applicable tools receive `is-skipped` plus future/muted styling.
- Summary should not be marked complete simply because an optional branch page is current.
- `tools/compute/gpu-vram/index.html` loads the Compute guided route engine before `assets/pipeline.js` for the GPU branch proof.
- `scripts/audit-compute-guided-pipeline-led-state-v1.js` guards this shared renderer contract.
### Compute guided Continue plan read

- `assets/scopedlabs-compute-shell-contract.js` owns the shared Compute Back/Continue shell.
- In explicit Compute guided mode, the shell must resolve Continue through `assets/scopedlabs-compute-guided-route-engine.js` using the active workload plan from `assets/scopedlabs-compute-plan-state.js`.
- The shell reads current plan-state APIs including `load()` and current workload-plan storage keys before legacy fallbacks.
- CPU/RAM direct visits remain standalone; guided routing only applies when `guidedFlow: true` and `routeMode: compute-guided` are present.
- `scripts/audit-compute-guided-continue-plan-read-v1.js` guards the shared shell plan-read contract.
### Compute dynamic guided Continue CTA

- `assets/scopedlabs-compute-shell-contract.js` owns the Compute Back/Continue action row for CPU/RAM proof pages.
- In explicit guided mode, the Continue button label and target are resolved from `assets/scopedlabs-compute-guided-route-engine.js` and the active planner workload.
- Planner-selected paths dynamically update the normal Continue button, for example `Continue to RAM Sizing`, `Continue to GPU VRAM`, or `Review Compute Summary`.
- No separate guided action strip is used; standard/core and branch workflows use the same bottom Continue CTA pattern.
- Direct tool visits remain standalone and keep the static fallback behavior.
- `scripts/audit-compute-dynamic-continue-cta-v1.js` guards this shared dynamic CTA contract.
#### Compute dynamic Continue GPU proof

- `tools/compute/gpu-vram/index.html` consumes `assets/scopedlabs-compute-shell-contract.js` for the same dynamic guided Continue CTA pattern as CPU/RAM.
- The shared shell fallback for GPU routes to Compute Summary, while explicit guided mode can still resolve through the route engine.
- This keeps branch completion consistent without a separate guided action strip card.
#### Compute dynamic Continue single-owner row

- `assets/scopedlabs-compute-shell-contract.js` targets the shell-owned `.compute-flow-actions[data-compute-flow-owner="compute-shell-contract"]` row first.
- In explicit guided mode, duplicate legacy `#continue-wrap` / `#continue` controls are suppressed so users see one normal bottom Continue action.
- The same button dynamically resolves Standard Core to Compute Summary and branch paths to their next selected tool.
#### Compute dynamic Continue click guard

- `assets/scopedlabs-compute-shell-contract.js` captures guided Continue clicks before legacy page-level handlers can use stale static targets.
- The visible label, stored target, and actual click route all resolve from the active guided route decision.
- This prevents cases where RAM displays `Continue to GPU VRAM` but a legacy static handler sends the user to Storage IOPS.
### Compute planner workload-aware Start Guided Flow CTA

- `assets/scopedlabs-compute-planner-adapter.js` keeps the planner CTA visible as `Start Guided Flow`.
- If no Compute workloads are saved, clicking the CTA scrolls/focuses the Active Compute Workload Setup form instead of auto-saving defaults or opening CPU with no workload context.
- If workloads exist, clicking the CTA starts explicit Compute guided context and routes to the next incomplete core or selected specialty tool using the existing guided route resolver.
- The planner CTA refresh is event/timer driven and does not use a whole-page `MutationObserver` loop.
- `scripts/audit-compute-planner-start-cta-workload-aware-v1.js` guards this workload-aware start behavior.
#### Compute planner Start Guided Flow delegated click

- `assets/scopedlabs-compute-planner-adapter.js` uses one delegated capture click handler for the planner Start Guided Flow CTA.
- This avoids whole-page MutationObserver loops while still catching the CTA after the planner shell renders it.
- The handler routes saved workloads or scrolls/focuses Active Compute Workload Setup when no workloads exist.
#### Compute planner zero-workload guided start focus

- With zero saved workloads, `Start Guided Flow` now scrolls to and briefly highlights the Active Compute Workload Setup area.
- This keeps the CTA visible while preventing blank/default workload auto-save behavior.
#### Compute planner workload-aware guided start closeout

- `assets/scopedlabs-compute-planner-adapter.js` keeps the planner CTA label stable as `Start Guided Flow`.
- With zero saved workloads, the CTA does not auto-save default form state; it scrolls/focuses the Active Compute Workload Setup path.
- With saved workloads, the CTA starts explicit Compute guided context and routes to the next incomplete applicable core or selected specialty tool.
- `scripts/audit-compute-planner-start-cta-workload-aware-v1.js` guards the no-autosave, saved-ledger-only, no-MutationObserver, and guided-route behavior.
#### Compute planner rendered Start Guided Flow click selector

- `assets/scopedlabs-compute-planner-adapter.js` now catches the rendered `Start Guided Flow` CTA as a plain `a` or `button`, then filters by label/data state.
- This prevents zero-workload planner clicks from falling through to the default `#compute-workload-setup` anchor without running the workload-aware setup-focus handler.
- `scripts/audit-compute-planner-start-cta-workload-aware-v1.js` guards the rendered text-link selector contract.
#### Compute planner direct Start Guided Flow if-branch

- `assets/scopedlabs-compute-planner-adapter.js` stamps the rendered CTA with `data-compute-planner-start-guided-flow="true"` and binds that exact owner directly.
- The click path now uses an explicit `if (!workloads.length)` branch for zero saved workloads, then scrolls/focuses setup and returns.
- Saved workloads continue through the guided route engine to the next incomplete applicable tool.
- `scripts/audit-compute-planner-start-cta-workload-aware-v1.js` guards direct owner binding and explicit zero-workload branching.
#### Compute guided pipeline upstream completion

- `assets/pipeline.js` now marks applicable upstream Compute steps as complete when the current guided tool is downstream in the active workload route.
- This keeps GPU guided flow visuals aligned with the route: CPU and RAM show complete before GPU VRAM, while unrelated tools remain skipped or future.
- `scripts/audit-compute-guided-pipeline-led-state-v1.js` guards the upstream-completion inference.
#### Compute guided pipeline active workload fallback

- `assets/pipeline.js` now falls back to the active Compute workload context or single saved workload when the guided-flow id does not resolve directly in the plan ledger.
- Guided specialty pages also treat the current selected branch as applicable, so upstream CPU/RAM steps can render complete before GPU VRAM even when branch metadata is recovered from active context.
- `scripts/audit-compute-guided-pipeline-led-state-v1.js` guards the active-workload fallback and current-branch applicability behavior.
#### Compute RAM Capacity Envelope footer cleanup

- `assets/scopedlabs-compute-capacity-visuals.js` owns the shared CPU/RAM capacity envelope visuals.
- RAM no longer renders the old bottom `RAM planning checkpoints` footer row or the `*1/*2/*3` labels inside the SVG.
- Recommendation References remain below the visual where the explanatory `*1/*2/*3` details belong.
- `scripts/audit-compute-capacity-envelope-shared-contract-v1.js` guards the shared RAM footer cleanup.
#### Compute RAM Capacity Envelope capacity rail correction

- `assets/scopedlabs-compute-capacity-visuals.js` now treats installed RAM as a capacity rail/ceiling instead of plotting it as a demand-curve point.
- RAM status remains based on required demand versus installed capacity, so a low required value against an 8 GB tier correctly renders GOOD.
- `scripts/audit-compute-capacity-envelope-shared-contract-v1.js` guards against plotting installed RAM as a demand point again.
#### Compute RAM Capacity Envelope installed marker correction

- `assets/scopedlabs-compute-capacity-visuals.js` now shows Installed RAM as a third marker on the capacity rail without connecting it to the demand curve.
- This preserves the visual checkpoint while keeping the demand curve aligned with RAM status logic.
- `scripts/audit-compute-capacity-envelope-shared-contract-v1.js` guards that Installed remains a rail marker, not a demand-curve point.
#### Compute RAM downstream invalidation

- `assets/scopedlabs-compute-plan-state.js` owns `invalidateToolAndDownstream`, which clears saved result/completion ledger entries for a changed tool and downstream guided steps.
- `tools/compute/ram-sizing/script.js` calls this on RAM input invalidation so returning from GPU, changing RAM, recalculating, and continuing sends the user back through GPU with updated RAM context.
- `scripts/audit-compute-guided-continue-plan-read-v1.js` guards the RAM downstream invalidation contract.


## COMPUTE_GPU_VRAM_ENGINEERING_INPUTS_V1 ? 2026-06-21

Status: GPU-only proof lane.

Scope:
- Adds deeper GPU VRAM planning inputs before broader Compute shell rollout.
- Preserves existing GPU IDs and calculation controls.
- Adds installed VRAM, utilization target, display/OS reserve, precision mode, parallelism mode, replica count, growth reserve, KV/runtime cache reserve, checkpoint/workspace reserve, failover multiplier, and GPU sharing mode.
- Adds engineering summary and GPU VRAM Capacity Envelope output mounts.
- Does not upgrade backup-window, nic-bonding, power-thermal, raid-rebuild-time, storage-iops, storage-throughput, or vm-density in this lane.

Audit:
- scripts/audit-compute-gpu-vram-engineering-inputs-v1.js

Promotion note:
- This is an input-depth proof for GPU VRAM. The full shared Compute shell/module proof remains a follow-on lane.


## COMPUTE_GPU_VRAM_SHELL_PROOF_V1 ? 2026-06-21

Status: GPU-only shell proof lane.

Scope:
- Promotes GPU VRAM from engineering-input proof toward the shared Compute calculator shell.
- Adds shared shell tokens, assistant/export bridge assets, local assistant renderer mount, Compute assistant contract sections, recommendation references, recommended actions, decision schedule, user tool notes, report metadata mount, internal ledger, and Compute flow-action ownership.
- Preserves existing GPU inputs, IDs, math, auth, checkout, export, snapshot, Knowledge Base, guided route behavior, and existing GPU engineering-input proof.
- Does not patch backup-window, nic-bonding, power-thermal, raid-rebuild-time, storage-iops, storage-throughput, or vm-density in this lane.

Audit:
- scripts/audit-compute-gpu-vram-shell-proof-v1.js

Promotion note:
- If accepted in browser, this becomes the next Compute shell/profile proof source after CPU and RAM.



### COMPUTE_GPU_VRAM_LAYOUT_PARITY_V1

- Status: PROOF_GATE
- Owner: scripts/audit-compute-gpu-vram-layout-parity-v1.js
- Scope: GPU VRAM Compute calculator layout parity proof.
- Consumer: tools/compute/gpu-vram/index.html
- Contract: Enforces CPU/RAM-style section order, valid report metadata placement, valid export status placement, valid user tool notes placement, and compute visual card wrapper usage for GPU VRAM.
- Promotion path: If another Compute calculator needs the same structural repair, promote this into a reusable Compute calculator layout contract audit before broad rollout.


### COMPUTE_GPU_VRAM_TOP_CHROME_PARITY_V1

- Status: PROOF_GATE
- Owner: scripts/audit-compute-gpu-vram-top-chrome-parity-v1.js
- Scope: GPU VRAM Compute calculator top chrome parity proof.
- Consumer: tools/compute/gpu-vram/index.html
- Contract: Removes visible calculator-page breadcrumbs i
- Known breadcrumb owner: tools/compute/gpu-vram/index.html <main class="container page"> > div.crumbs containing Tools / Compute / GPU VRAM. The top chrome audit must fail if this exact owner returns.ncluding legacy class=crumbs blocks, top Pro Tier chip, Part of a Design Flow explainer card, and Best for line while preserving hidden flow-note and locked/auth card behavior.
- Promotion path: If the next Compute calculator needs the same top chrome cleanup, promote this behavior into a reusable ScopedLabs/Compute tool page chrome contract before broad rollout.


### COMPUTE_GPU_VRAM_INPUT_CARD_PARITY_V1

- Status: PROOF_GATE
- Owner: scripts/audit-compute-gpu-vram-input-card-parity-v1.js
- Scope: GPU VRAM Compute calculator input-card parity proof.
- Consumer: tools/compute/gpu-vram/index.html
- Contract: Removes the duplicate engineering-input eyebrow, promotes GPU VRAM engineering factors to the real h2 section title, preserves every GPU engineering input ID, and levels the engineering input grid against the accepted CPU/RAM Planning Inputs rhythm.
- Promotion path: If accepted in browser verification, promote this into a reusable Compute engineering input card contract before applying to the next Compute tool.


### COMPUTE_GPU_VRAM_LEGACY_RESULTS_LEDGER_PARITY_V1

- Status: PROOF_GATE
- Owner: scripts/audit-compute-gpu-vram-legacy-results-ledger-parity-v1.js
- Scope: GPU VRAM Compute calculator legacy results / ledger parity proof.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: Hides the legacy visible results and analysis-copy source blocks while preserving their DOM IDs, internal ledger payload, session/carryover data, and shell proof rendering path.
- Promotion path: If accepted in browser verification, promote this into a reusable Compute calculator hidden-results/ledger parity contract before applying to the next Compute tool.


### COMPUTE_GPU_VRAM_CAPACITY_ENVELOPE_PARITY_V1

- Status: PROOF_GATE
- Owner: scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js
- Scope: GPU VRAM Compute calculator capacity-envelope visual parity proof.
- Consumer: tools/compute/gpu-vram/script.js; tools/compute/gpu-vram/index.html
- Contract: Replaces the local GPU VRAM blue chart grammar with a CPU/RAM-style dark CAD capacity envelope, chart-linked *1/*2/*3 references, marker-ring dots, usable/installed rails, and preserved GPU math/status inputs.
- Promotion path: After browser acceptance, promote into assets/scopedlabs-compute-capacity-visuals.js as a GPU-specific build/render route rather than keeping the visual page-local.


### COMPUTE_GPU_VRAM_CAPACITY_ENVELOPE_POLISH_0622

- Status: PROOF_GATE_POLISH
- Owner: scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js
- Scope: GPU VRAM Capacity Envelope Lane 4 visual polish.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: Keeps the Lane 4 GPU VRAM capacity-envelope proof under permanent audit while allowing the live polish pass to remove remaining blue card/wrapper treatment, normalize the engineering result card to the green/dark Compute visual language, and center/smaller-size the *1/*2/*3 chart reference legend.
- Guardrail: Later GPU script cache-bust versions may advance within the GPU lane as long as the GPU-owned cache-bust remains present and the capacity envelope parity audit passes.


### COMPUTE_GPU_VRAM_CAPACITY_ENVELOPE_RAM_PARITY_0622

- Status: PROOF_GATE_POLISH
- Owner: scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js
- Scope: GPU VRAM capacity envelope RAM-parity correction.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: Removes the rejected inline chart legend, preserves the Recommendation References card below the chart, restores GOOD/WATCH/RISK band labels inside the color bands, and removes remaining blue edge treatment from the GPU engineering result and visual wrapper.


### COMPUTE_GPU_VRAM_CAPACITY_ENVELOPE_RAM_POLISH_0622B

- Status: PROOF_GATE_POLISH
- Owner: scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js
- Scope: GPU VRAM capacity envelope RAM-rhythm polish.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: Evicts the remaining blue chart/card edge and removes visible *1/*2/*3 labels from the SVG while preserving chart-linked marker data through data-ref/title and preserving the Recommendation References card below the chart.


### COMPUTE_GPU_VRAM_CAPACITY_ENVELOPE_CLARITY_0622C

- Status: PROOF_GATE_POLISH
- Owner: scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js
- Scope: GPU VRAM capacity envelope status-clarity polish.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: Keeps GPU status math unchanged while changing the right-side point into a green usable/capacity rail marker, labeling the risk/watch threshold lines, and removing the remaining blue chart-wrapper edge.


### COMPUTE_GPU_VRAM_CAPACITY_ENVELOPE_REQUIRED_STATUS_0622D

- Status: PROOF_GATE_POLISH
- Owner: scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js
- Scope: GPU VRAM capacity envelope status-point clarity.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: Keeps WATCH/RISK math unchanged but makes Required VRAM the final plotted workload/status point. Usable VRAM remains a horizontal capacity rail, not a plotted status marker, so the chart no longer appears to show the status point inside the risk zone.


### COMPUTE_GPU_VRAM_CAPACITY_ENVELOPE_REQUIRED_STATUS_AUDIT_0622E

- Status: PROOF_GATE_AUDIT_ALIGNMENT
- Owner: scripts/audit-compute-gpu-vram-capacity-envelope-parity-v1.js
- Scope: GPU VRAM capacity envelope required-status audit alignment.
- Consumer: tools/compute/gpu-vram/script.js; tools/compute/gpu-vram/index.html
- Contract: Updates the Lane 4 capacity-envelope audit so the accepted chart pattern is protected correctly: Demand and Required are plotted workload/status points, Usable VRAM is a horizontal capacity rail only, and *3 is handled through Recommendation References / capacity-rail context instead of a plotted workload marker.
- Guardrail: Any future audit change for this lane must update this module map in the same commit.


### COMPUTE_GPU_VRAM_PROOF_STACK_PARITY_0624A

- Status: PROOF_GATE
- Owner: scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js
- Scope: GPU VRAM Recommendation References / Recommended Actions / Decision Schedule proof-stack parity.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: Keeps the accepted GPU chart order and places the proof stack below it: Recommendation References, Recommended Actions, Decision Schedule, then User Tool Notes. Reference wording is aligned to the accepted GPU VRAM Capacity Envelope grammar: *1 demand basis, *2 required/status-driving point, *3 capacity rail context.
- Guardrail: Do not move User Tool Notes above the proof stack. Do not make usable VRAM a plotted workload/status point again.


### COMPUTE_GPU_VRAM_PROOF_STACK_EVENT_BRIDGE_0624F

- Status: PROOF_GATE_FIX
- Owner: scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js
- Scope: GPU VRAM proof-stack local event bridge.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: The active GPU engineering renderer dispatches a scoped plan-rendered event after writing the chart. The GPU shell proof bridge listens for that event and renders Recommendation References, Recommended Actions, and GPU VRAM Decision Schedule from the supplied plan.
- Guardrail: Avoid timer rehydrate workarounds and avoid direct cross-IIFE private function calls.


### COMPUTE_GPU_VRAM_PROOF_STACK_POLISH_0624G

- Status: PROOF_GATE_POLISH
- Owner: scripts/audit-compute-gpu-vram-proof-stack-polish-v1.js
- Scope: GPU VRAM proof-stack visual polish.
- Consumer: tools/compute/gpu-vram/index.html
- Contract: Recommendation References, Recommended Actions, and GPU VRAM Decision Schedule render as clean ScopedLabs proof cards below the GPU VRAM Capacity Envelope instead of raw table/list output.
- Guardrail: Keep the event bridge behavior intact; this lane is visual polish only.


### COMPUTE_GPU_VRAM_PROOF_STACK_RAM_RHYTHM_0624H

- Status: PROOF_GATE_POLISH
- Owner: scripts/audit-compute-gpu-vram-proof-stack-ram-rhythm-v1.js
- Scope: GPU VRAM proof-stack RAM-style card rhythm.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: GPU Recommended Actions uses stacked RAM-style action rows, and GPU VRAM Decision Schedule uses a RAM-style status summary plus structured Group / Metric / Value / Engineering Note table.
- Guardrail: Keep the event bridge behavior intact; this lane only changes proof-card presentation and script-rendered card HTML.


### COMPUTE_GPU_VRAM_PROOF_STACK_PARITY_VERSION_ALIGNMENT_0624H

- Status: PROOF_GATE_AUDIT_ALIGNMENT
- Owner: scripts/audit-compute-gpu-vram-proof-stack-parity-v1.js
- Scope: GPU VRAM proof-stack parity audit version alignment after RAM-rhythm polish.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: The parity audit should protect the event bridge behavior while allowing the current GPU script cache-bust version from the RAM-rhythm proof-card lane.
- Guardrail: Do not pin the parity audit to an older cache-bust token when a later proof-stack lane intentionally bumps the same local script.


### COMPUTE_GPU_VRAM_PROOF_STACK_TABLE_RESET_0624I

- Status: PROOF_GATE_POLISH
- Owner: scripts/audit-compute-gpu-vram-proof-stack-table-reset-v1.js
- Scope: GPU VRAM Decision Schedule table reset.
- Consumer: tools/compute/gpu-vram/index.html
- Contract: Restores RAM-style desktop table semantics for the GPU VRAM Decision Schedule after earlier proof-card grid styling forced rows/cells into block layout.
- Guardrail: Keep the mobile stacked fallback, but do not let desktop table rows render as two-column grid blocks.


### COMPUTE_GPU_VRAM_PROOF_STACK_REFERENCE_RHYTHM_0624J

- Status: PROOF_GATE_POLISH
- Owner: scripts/audit-compute-gpu-vram-proof-stack-reference-rhythm-v1.js
- Scope: GPU VRAM Recommendation References RAM-style table rhythm.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: GPU Recommendation References renders as a RAM-style Marker / Reference / Reason table with toned *1/*2/*3 markers.
- Guardrail: Do not let earlier two-column grid proof-card styling override the desktop reference table.


### COMPUTE_GPU_VRAM_EXPORT_PARITY_0624K

- Status: PROOF_GATE_EXPORT_PARITY
- Owner: scripts/audit-compute-gpu-vram-export-parity-v1.js
- Scope: GPU VRAM custom export/report payload parity.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: GPU VRAM exports use ScopedLabsComputeGpuVramExport.buildPayload to include the GPU VRAM Capacity Envelope SVG, Recommendation References, Recommended Actions, and GPU VRAM Decision Schedule.
- Guardrail: Do not rely only on default DOM scraping for GPU VRAM export parity.


### COMPUTE_GPU_VRAM_EXPORT_CARD_PLACEMENT_0624L

- Status: PROOF_GATE_LAYOUT_PARITY
- Owner: scripts/audit-compute-gpu-vram-export-card-placement-v1.js
- Scope: GPU VRAM Export Report card placement.
- Consumer: tools/compute/gpu-vram/index.html
- Contract: GPU VRAM Export Report, export status, and User Tool Notes sit inside the Planning Inputs card after Calculate/Reset, matching RAM rhythm.
- Guardrail: Do not let export status/User Tool Notes drift down beside the flow CTA/footer.


### COMPUTE_GPU_VRAM_EXPORT_DYNAMIC_PLACEMENT_0624M

- Status: PROOF_GATE_DYNAMIC_LAYOUT
- Owner: scripts/audit-compute-gpu-vram-export-dynamic-placement-v1.js
- Scope: GPU VRAM Export Report dynamic placement.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: Before calculation, Export Report sits under inputs after Calculate/Reset. After calculation, Export Report moves to the bottom of the rendered result/proof stack before the flow CTA, matching the accepted Compute tool rhythm.
- Guardrail: Do not permanently pin the Export Report card above the calculated results after a calculation has rendered.


### COMPUTE_GPU_VRAM_EXPORT_CARD_CTA_PLACEMENT_0624N

- Status: PROOF_GATE_LAYOUT_PARITY
- Owner: scripts/audit-compute-gpu-vram-export-card-cta-placement-v1.js
- Scope: GPU VRAM Review Compute Summary CTA placement inside Export Report card.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: The GPU VRAM Review Compute Summary CTA travels with the Export Report card and sits below User Tool Notes.
- Guardrail: Do not leave the final flow CTA alone below the export/report card near the footer.


### COMPUTE_GPU_VRAM_PROMOTION_CLOSEOUT_0627

- Status: ACCEPTED_COMPUTE_PROOF_BASELINE
- Owner: scripts/audit-compute-gpu-vram-promotion-closeout-v1.js
- Scope: GPU VRAM local proof promotion / closeout.
- Consumer: tools/compute/gpu-vram/index.html; tools/compute/gpu-vram/script.js
- Contract: GPU VRAM is accepted as a Compute proof baseline with the accepted Capacity Envelope, RAM-style Recommendation References / Recommended Actions / Decision Schedule, custom export payload, dynamic export placement, User Tool Notes, and Review Compute Summary CTA inside the export/report card.
- Guardrail: This is a closeout promotion, not a shared-module extraction. Preserve the accepted GPU page behavior until a deliberate shared Compute proof module lane is started.
- Verification: Run scripts/audit-compute-gpu-vram-promotion-closeout-v1.js plus the existing GPU proof/export placement audits before future GPU changes.


### COMPUTE_SUMMARY_ROUTE_HOST_0627

- Status: ROUTE_HOST
- Owner: tools/compute/summary/index.html
- Audit: scripts/audit-compute-summary-route-host-v1.js
- Scope: Compute guided-flow closeout route.
- Contract: /tools/compute/summary/ must exist so guided flow, planner complete-state routing, and GPU Review Compute Summary CTAs never land on a GitHub Pages 404.
- Guardrail: This is a route host only. Do not treat it as the final Compute Summary master assistant/report page until a dedicated Compute Summary build lane is started.


### COMPUTE_PLANNER_SUMMARY_CTA_LABEL_0627

- Status: ROUTE_LABEL_FIX
- Owner: tools/compute/workload-planner/index.html
- Audit: scripts/audit-compute-planner-summary-cta-label-v1.js
- Scope: Compute Workload Planner guided-flow CTA label.
- Contract: When the planner's active guided-flow CTA routes to /tools/compute/summary/, the visible button label should read Continue to Summary instead of Start Guided Flow.
- Guardrail: This is a label-state fix only. Do not rewrite guided-route ownership or pending-workload route selection.


### COMPUTE_GPU_VRAM_EXPORT_REFERENCE_WIDTHS_0627

- Status: EXPORT_REPORT_POLISH
- Owner: tools/compute/gpu-vram/script.js
- Shared helper: assets/scopedlabs-compute-export-proof-tables.js
- Audit: scripts/audit-compute-gpu-vram-export-reference-column-widths-v1.js
- Scope: GPU VRAM Recommendation References export table column widths.
- Contract: Export Recommendation References should use narrow Marker, compact Reference, and wide Reason columns using 12% / 23% / 65%, matching the Decision Schedule readability rhythm.
- Guardrail: This is export report column polish only. Do not change accepted GPU chart/status math, reference wording, dynamic export placement, guided routing, or Summary CTA behavior.

### COMPUTE_SUMMARY_DATA_CONTRACT_AUDIT_V1
- Type: audit gate
- File: `scripts/audit-compute-summary-data-contract-v1.js`
- Purpose: Verifies CPU, RAM, GPU, shared Compute plan state, and Summary route readiness before Compute Summary UI/assistant work.
- Expected baseline: PASS with WATCH items for RAM custom export payload parity and Summary plan-state consumption until those lanes are implemented.
\n### COMPUTE_SUMMARY_PLAN_STATE_ROLLUP_0628\n- Type: summary foundation / audit update\n- Files:\n  - `tools/compute/summary/index.html`\n  - `scripts/audit-compute-summary-data-contract-v1.js`\n- Purpose: Makes the Compute Summary route consume `ScopedLabsComputePlanState`, render a plan-state-backed rollup foundation, and expose a Summary Assistant foundation mount without reopening accepted CPU/RAM/GPU tool visuals.\n- Audit: `scripts/audit-compute-summary-data-contract-v1.js`\n- Notes: RAM custom export payload parity remains a tracked WATCH until a focused RAM export parity lane is needed.\n\n### COMPUTE_SUMMARY_PHYSICAL_SECURITY_PARITY_0628\n- Type: summary page visual parity / audit gate\n- Files:\n  - `tools/compute/summary/index.html`\n  - `scripts/audit-compute-summary-physical-security-parity-v1.js`\n- Purpose: Aligns Compute Summary with the accepted Physical Security Summary page rhythm while preserving the live `ScopedLabsComputePlanState` rollup foundation.\n- Audit: `scripts/audit-compute-summary-physical-security-parity-v1.js`\n\n### COMPUTE_SUMMARY_PHYSICAL_SECURITY_TARGET_LAYOUT_0628\n- Type: summary page visual target / audit revision\n- Files:\n  - `tools/compute/summary/index.html`\n  - `scripts/audit-compute-summary-physical-security-parity-v1.js`\n- Purpose: Updates Compute Summary to follow the actual accepted Physical Security Summary composition: Design Flow, master rollup, Master Assistant panel, guidance rollup, Tool Notes, Final Report Export, and Continue Planning.\n- Audit: `scripts/audit-compute-summary-physical-security-parity-v1.js`\n- Notes: Preserves live `ScopedLabsComputePlanState` rollup, route-host CTAs, and Summary Assistant foundation marker.\n\n### COMPUTE_SUMMARY_PRODUCT_COPY_0628\n- Type: summary page copy polish / audit revision\n- Files:\n  - `tools/compute/summary/index.html`\n  - `scripts/audit-compute-summary-physical-security-parity-v1.js`\n- Purpose: Removes visible route-proof wording from Compute Summary and keeps route proof tied to the `data-compute-summary-route-host` marker instead of user-facing copy.
- Audit: `scripts/audit-compute-summary-physical-security-parity-v1.js`\n\n### COMPUTE_SUMMARY_ROUTE_HOST_MARKER_ONLY_0628\n- Type: route-host audit polish\n- Files:\n  - `scripts/audit-compute-summary-route-host-v1.js`\n  - `tools/compute/summary/index.html`\n- Purpose: Keeps Compute Summary route-host proof tied to `data-compute-summary-route-host` instead of visible developer copy.\n- Audit: `scripts/audit-compute-summary-route-host-v1.js`\n\n### COMPUTE_PLANNER_SUMMARY_ACCESS_0628\n- Type: planner navigation access / audit gate\n- Files:\n  - `tools/compute/workload-planner/index.html`\n  - `scripts/audit-compute-planner-summary-access-v1.js`\n- Purpose: Keeps Start Guided Flow available while adding an explicit Review Compute Summary route and making rendered Summary pipeline labels clickable.\n- Audit: `scripts/audit-compute-planner-summary-access-v1.js`\n- Notes: This is a safe access repair for planner-to-summary navigation. Long-term owner should move into the Compute planner shell/module when Summary polish is modularized.\n

### COMPUTE_SUMMARY_MODULE_OWNERSHIP_0703

- Scope: Compute Summary page-owned proof promoted to module-owned assets.
- HTML host: `tools/compute/summary/index.html`
- CSS module: `assets/scopedlabs-compute-summary.css`
- JS module: `assets/scopedlabs-compute-summary.js`
- Audit: `scripts/audit-compute-summary-module-ownership-v1.js`
- Preserves: plan-state rollup, report metadata, export/report/snapshot, tool notes rollup/export sync, Summary Tool Notes, report table width tuning, and Physical Security-style Summary rhythm.

### COMPUTE_SUMMARY_CLEAR_SUMMARY_TOOL_NOTES_0703

- Scope: Compute Summary module adds a clear control for locally saved Summary Tool Notes.
- HTML host: `tools/compute/summary/index.html`
- CSS owner: `assets/scopedlabs-compute-summary.css`
- JS owner: `assets/scopedlabs-compute-summary.js`
- Audit: `scripts/audit-compute-summary-module-ownership-v1.js`
- Behavior: clears `scopedlabs.compute.summary.toolNotes.v1` from browser localStorage, empties the editable Summary Tool Notes textarea, updates status copy, and triggers note sync events.

### ACCOUNT_SNAPSHOT_OBJECT_CELL_NORMALIZER_0703

- Scope: Account saved snapshot renderer now flattens structured table cells into readable text instead of browser-default `[object Object]`.
- HTML host: `account/index.html`
- JS owner: `assets/account.js`
- Audit: `scripts/audit-account-snapshot-extra-table-layout-v1.js`
- Preserves: account auth, entitlements, saved snapshot list/detail view, and existing snapshot table layout.

### ACCOUNT_SNAPSHOT_WIDE_REPORT_TABLE_LAYOUT_0703

- Scope: Account saved snapshot detail tables use full-card width and column presets for Compute Summary report sections.
- HTML host: `account/index.html`
- JS owner: `assets/account.js`
- Audit: `scripts/audit-account-snapshot-wide-report-table-layout-v1.js`
- Preserves: auth, entitlements, snapshot list/detail rendering, object-cell normalization, and existing saved snapshot data.

### ACCOUNT_SNAPSHOT_DETAIL_CSS_TABLE_LAYOUT_0703

- Scope: Account saved snapshot detail tables use CSS-only full-card layout to avoid View Snapshot render loops.
- HTML host: `account/index.html`
- JS owner: `assets/account.js`
- Audit: `scripts/audit-account-snapshot-wide-report-table-layout-v1.js`
- Preserves: account auth, entitlements, saved snapshot list/delete behavior, object-cell normalization, and existing snapshot data.

- ACCOUNT_SNAPSHOT_REPORT_COLUMN_LAYOUT_0703: Account snapshot detail tables reserve wider report/detail columns and preserve text spacing when object/HTML table cells are flattened. Owners: `account/index.html`, `assets/account.js`, `scripts/audit-account-snapshot-wide-report-table-layout-v1.js`.

- ACCOUNT_SNAPSHOT_AUDIT_CONTRACT_REFRESH_0703: Account snapshot audits now verify the CSS-owned report column layout and object/text normalizer contract instead of the removed JS-owned wide-table enhancer. Owners: `scripts/audit-account-snapshot-extra-table-layout-v1.js`, `scripts/audit-account-snapshot-wide-report-table-layout-v1.js`.

- ACCOUNT_SNAPSHOT_STABLE_CONTROLLER_RESTORE_0703: Restores the Account page controller to the last known working snapshot/auth UI behavior while keeping the CSS-owned report column layout and fresh cache-bust token. Owners: `assets/account.js`, `account/index.html`, `scripts/audit-account-snapshot-extra-table-layout-v1.js`, `scripts/audit-account-snapshot-wide-report-table-layout-v1.js`.

- COMPUTE_STORAGE_IOPS_PLANNING_SHELL_0704: Storage IOPS upgraded from legacy/light estimator to planning-grade Compute shell coverage with platform IOPS, burst, growth, latency, media tier, assistant proof stack, export-visible references, and summary-ready ledger payload. Owners: `tools/compute/storage-iops/index.html`, `tools/compute/storage-iops/script.js`, `scripts/audit-compute-storage-iops-planning-shell-v1.js`
- `scripts/audit-compute-storage-iops-visible-flow-context-v1.js`.

- COMPUTE_STORAGE_IOPS_FULL_SHELL_PARITY_0704: Storage IOPS full Compute shell parity pass after the planning-grade upgrade. Adds shared Compute result CSS, report metadata mount, tool shell, guided route engine, assistant export, capacity visuals, shell contract, local assistant, user tool notes, Recommendation References, Assistant Recommended Actions, and decision schedule sections while preserving the upgraded IOPS calculation/payload. Owners: `tools/compute/storage-iops/index.html`, `tools/compute/storage-iops/script.js`, `scripts/audit-compute-storage-iops-planning-shell-v1.js`.

- COMPUTE_STORAGE_IOPS_RAM_SHELL_TEMPLATE_0704: Storage IOPS rebuilt around the accepted RAM shell template rather than incrementally patching the legacy page forward. Enforces RAM-shell structural anchors, hidden internal results ledger, active workload context, local assistant mount, proof stack card, Recommendation References, Assistant Recommended Actions, decision schedule, export/report metadata, and shell-owned flow actions while preserving Storage IOPS calculation, payload, export, snapshot, and downstream ledger behavior. Owners: `tools/compute/storage-iops/index.html`, `tools/compute/storage-iops/script.js`, `scripts/audit-compute-storage-iops-planning-shell-v1.js`.

- COMPUTE_STORAGE_IOPS_VISUAL_MODULE_0704: Storage IOPS now consumes the shared Compute capacity visual module with a dedicated Storage IOPS Capacity Envelope renderer and RAM-shell visual mount. Also fixes Compute shell-contract route ownership so Storage IOPS continues to Storage Throughput, and upgrades the Storage IOPS audit to require the shared visual renderer, chart mount, RAM-shell section order, correct route, and preserved IOPS calculation/payload. Owners: `assets/scopedlabs-compute-capacity-visuals.js`, `assets/scopedlabs-compute-shell-contract.js`, `tools/compute/storage-iops/index.html`, `tools/compute/storage-iops/script.js`, `scripts/audit-compute-storage-iops-planning-shell-v1.js`.

- COMPUTE_SHELL_HIDE_GENERATED_FLOW_CONTEXT_0704: Compute shell contract now suppresses generated flow-context/debug carryover UI such as `#flow-note` and runtime Flow Context blocks while preserving upstream context in state, ledger, export, and downstream payloads. The shell contract now applies to all Compute pages with `data-compute-tool-shell`, not only the original `0614` token, so future RAM-shell-template tools inherit the cleanup automatically. Owners: `assets/scopedlabs-compute-shell-contract.js`, `tools/compute/storage-iops/index.html`, `scripts/audit-compute-storage-iops-planning-shell-v1.js`.

- COMPUTE_SHELL_FLOW_CONTEXT_OBSERVER_0704: Compute shell contract now installs a CSS guard and MutationObserver to keep generated `#flow-note`, `.flow-note`, and runtime Flow Context carryover/debug UI hidden even when page scripts rewrite it after load. Upstream flow context remains preserved in state, ledger, export, and downstream payloads; only the generated visible UI is suppressed. Owners: `assets/scopedlabs-compute-shell-contract.js`, `tools/compute/storage-iops/index.html`, `scripts/audit-compute-storage-iops-planning-shell-v1.js`.

- COMPUTE_STORAGE_IOPS_HIDE_VISIBLE_FLOW_CONTEXT_0704: Storage IOPS suppresses the page-local generated Flow Context block at source while preserving upstream RAM context in state, calculation logic, ledger/export/snapshot payloads, and downstream routing. The shared Compute shell guard remains the future safety net; this page-local patch prevents Storage IOPS from rewriting the debug/carryover text visibly after shell cleanup. Owners: `tools/compute/storage-iops/script.js`, `tools/compute/storage-iops/index.html`, `scripts/audit-compute-storage-iops-planning-shell-v1.js`.

- COMPUTE_STORAGE_IOPS_VISIBLE_FLOW_CONTEXT_AUDIT_0704: Adds a dedicated page-level audit for Storage IOPS visible Flow Context suppression. The audit verifies the `#flow-note` anchor stays hidden, the page CSS guard exists, `refreshFlowNote()` suppresses visible generated carryover/debug text at source, and Storage IOPS still preserves workload context, ledger payload, export, and snapshot behavior. Owners: `scripts/audit-compute-storage-iops-visible-flow-context-v1.js`, `tools/compute/storage-iops/index.html`, `tools/compute/storage-iops/script.js`.\n\n- `scripts/audit-compute-storage-iops-chart-layout-v1.js`\n\n\n- COMPUTE_STORAGE_IOPS_CHART_LAYOUT_AUDIT_0704: Adds a dedicated Storage IOPS chart/layout audit before visual polish. The audit verifies the shared Storage IOPS capacity visual mount, renderer export, renderer call, RAM-shell section order, flow action routing, visible Flow Context suppression, and known CTA parity gaps. Owners: `scripts/audit-compute-storage-iops-chart-layout-v1.js`, `tools/compute/storage-iops/index.html`, `tools/compute/storage-iops/script.js`, `assets/scopedlabs-compute-capacity-visuals.js`.\n

- `docs/scopedlabs-category-branch-boundaries.json`
- `scripts/audit-scopedlabs-category-branch-boundaries-v1.js`

- SCOPEDLABS_CATEGORY_BRANCH_BOUNDARY_CONTRACT_0704: Adds a tier-aware category branch boundary manifest and audit. Standard category planners/tools may route only to same-category core or optional tools; cross-category dependencies are carry-only until future Gold-tier/Site Summary/Site Assistant surfaces own cross-category coordination. Storage IOPS is the first Compute proof target and may recommend only Compute-owned branches such as RAID Rebuild and Backup Window while continuing core flow to Storage Throughput. Owners: `docs/scopedlabs-category-branch-boundaries.json`, `scripts/audit-scopedlabs-category-branch-boundaries-v1.js`.

- COMPUTE_STORAGE_IOPS_RESULT_SUMMARY_CARD_0704: Storage IOPS now renders a visible post-calculate result summary card before the capacity envelope chart. The hidden `#results` ledger remains internal; the visible summary card owns status, required IOPS, available IOPS, utilization, reserve pressure, recommendation, confidence, and carry-forward copy before the chart/proof/reference stack. Owners: `tools/compute/storage-iops/index.html`, `tools/compute/storage-iops/script.js`, `scripts/audit-compute-storage-iops-chart-layout-v1.js`.

- COMPUTE_STORAGE_IOPS_RESULT_RAM_PARITY_0704: Storage IOPS result summary now follows the RAM result-card pattern instead of a custom metric-card layout. The visible post-calculate card uses the same title/status, recommendation/confidence, decision-flags/primary-risk, and carry-forward structure so users do not relearn a new layout per Compute tool. Owners: `tools/compute/storage-iops/index.html`, `tools/compute/storage-iops/script.js`, `scripts/audit-compute-storage-iops-chart-layout-v1.js`.

- COMPUTE_RESULT_CARD_CONTRACT_0704: Promotes the accepted RAM/Storage Compute result-card layout into the shared Compute shell contract. Tools can now render the standard title/status, recommendation/confidence, decision-flags/primary-risk, and carry-forward card through `ScopedLabsComputeShellContract.renderComputeResultCard` and clear it through `clearComputeResultCard`. Storage IOPS is the first consumer. Owners: `assets/scopedlabs-compute-shell-contract.js`, `tools/compute/storage-iops/script.js`, `tools/compute/storage-iops/index.html`, `scripts/audit-compute-storage-iops-chart-layout-v1.js`.

- COMPUTE_STORAGE_IOPS_ICON_ENVELOPE_0705: Upgrades the shared Storage IOPS capacity envelope visual inside `assets/scopedlabs-compute-capacity-visuals.js` with a plain title/status-badge layout, horizontal platform capacity bands, dynamic headroom/deficit bracket, and inline SVG footer chips for storage tier, workload pattern, RAID penalty, latency target, and block size. This uses the existing Compute visual module and keeps Storage IOPS consuming the shared renderer. Owners: `assets/scopedlabs-compute-capacity-visuals.js`, `tools/compute/storage-iops/index.html`, `scripts/audit-compute-storage-iops-chart-layout-v1.js`.

- COMPUTE_STORAGE_IOPS_ICON_ENVELOPE_POLISH_0705: Polishes the shared Storage IOPS capacity envelope after visual review. The chart removes the extra inner layer, enlarges the plot area, raises point labels away from dots, centers inline-icon footer chips beneath the chart, stacks the deficit/headroom label, and strengthens watch/risk band contrast while keeping the existing shared Compute visual module. Owners: `assets/scopedlabs-compute-capacity-visuals.js`, `tools/compute/storage-iops/index.html`, `scripts/audit-compute-storage-iops-chart-layout-v1.js`.

- COMPUTE_STORAGE_IOPS_TITLE_RISK_POLISH_0705: Final Storage IOPS capacity envelope polish centers the chart title/subtitle, keeps the IOPS axis label, and reuses the CPU capacity envelope risk color family for Storage IOPS risk/status/deficit styling. Owners: `assets/scopedlabs-compute-capacity-visuals.js`, `tools/compute/storage-iops/index.html`, `scripts/audit-compute-storage-iops-chart-layout-v1.js`.

- COMPUTE_STORAGE_IOPS_CAPACITY_ENVELOPE_LOCKED_PROMOTED_0705: Locks and promotes the accepted Storage IOPS Capacity Envelope as the shared-module-owned Storage IOPS visual. Accepted state includes centered title/subtitle, status badge only, CPU-family risk coloring, horizontal capacity bands, dynamic headroom/deficit bracket, base/burst/required callouts, and inline SVG footer chips for storage, workload, RAID, latency, and block size. Owner remains `assets/scopedlabs-compute-capacity-visuals.js`; Storage IOPS consumes it through the shared renderer.

- COMPUTE_STORAGE_IOPS_DEFICIT_LABEL_STACK_FIX_0705: Fixes the accepted Storage IOPS Capacity Envelope deficit/headroom annotation so the right-side bracket label renders as stacked SVG tspans rather than a cramped single-line string. Also updates stale cache-bust audit checks after the visual was locked/promoted. Owners: `assets/scopedlabs-compute-capacity-visuals.js`, `scripts/audit-compute-storage-iops-chart-layout-v1.js`.

- COMPUTE_STORAGE_IOPS_RAM_REFERENCE_FLOW_0705: Aligns Storage IOPS post-chart flow with the accepted RAM section rhythm. The visible order is now chart, Recommendation References, Recommended Actions, Decision Schedule, with the A/B/C proof stack suppressed from the visible main flow. Storage IOPS references use chart-matched markers `*1` Burst demand, `*2` Required IOPS, and `*3` Platform / latency validation. Owners: `tools/compute/storage-iops/index.html`, `tools/compute/storage-iops/script.js`, `assets/scopedlabs-compute-capacity-visuals.js`, `scripts/audit-compute-storage-iops-chart-layout-v1.js`.

- COMPUTE_STORAGE_IOPS_RAM_REFERENCE_FLOW_AUDIT_REPAIR_0705: Repairs Storage IOPS chart/layout and planning-shell audits after the accepted RAM-style post-chart flow. Current accepted flow is chart, Recommendation References, Recommended Actions, Decision Schedule, with the old A/B/C proof stack suppressed from the visible main flow and retained after schedule for export/internal proof continuity. Owners: `scripts/audit-compute-storage-iops-chart-layout-v1.js`, `scripts/audit-compute-storage-iops-planning-shell-v1.js`.

- COMPUTE_STORAGE_IOPS_RAM_REFERENCE_FLOW_PLANNING_AUDIT_0705: Updates the Storage IOPS planning shell audit to lock the accepted RAM-style post-chart order: visual, Recommendation References, Recommended Actions, Decision Schedule, hidden proof stack, report metadata, flow actions. Owners: `scripts/audit-compute-storage-iops-planning-shell-v1.js`.

- COMPUTE_STORAGE_IOPS_RAM_SECTION_CONTRACT_0705: Aligns Storage IOPS Recommendation References, Recommended Actions, and Decision Schedule with the accepted RAM shared Compute section contract. Storage IOPS now renders `compute-recommendation-references-table`, `compute-recommended-actions-list`, `compute-recommended-action`, `compute-decision-schedule-status`, and `compute-decision-schedule-table` instead of local `storage-iops-*` section rows. Owners: `tools/compute/storage-iops/index.html`, `tools/compute/storage-iops/script.js`, `scripts/audit-compute-storage-iops-chart-layout-v1.js`, `scripts/audit-compute-storage-iops-planning-shell-v1.js`.
