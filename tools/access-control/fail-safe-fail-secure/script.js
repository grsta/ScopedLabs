(() => {
  "use strict";

  // access-control-fail-safe-assistant-proof-contract-021

  const CATEGORY = "access-control";
  const CATEGORY_LABEL = "Access Control";
  const STEP = "fail-safe-fail-secure";
  const TOOL_LABEL = "Fail-Safe vs Fail-Secure";
  const LANE = "v1";
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:fail-safe-fail-secure";

  const FLOW_KEYS = {
    "fail-safe-fail-secure": "scopedlabs:pipeline:access-control:fail-safe-fail-secure",
    "reader-type-selector": "scopedlabs:pipeline:access-control:reader-type-selector",
    "lock-power-budget": "scopedlabs:pipeline:access-control:lock-power-budget",
    "panel-capacity": "scopedlabs:pipeline:access-control:panel-capacity",
    "access-level-sizing": "scopedlabs:pipeline:access-control:access-level-sizing"
  };

  const $ = (id) => document.getElementById(id);

  const els = {
    doorType: $("doorType"),
    life: $("life"),
    powerLoss: $("powerLoss"),
    fire: $("fire"),
    threat: $("threat"),
    hardwareType: $("hardwareType"),
    fireRated: $("fireRated"),
    egressControlled: $("egressControlled"),
    releaseEvent: $("releaseEvent"),
    standbyPower: $("standbyPower"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    statusCard: $("failSafeStatusCard"),
    statusTitle: $("failSafeStatusTitle"),
    statusSubtitle: $("failSafeStatusSubtitle"),
    statusText: $("failSafeStatusText"),
    statusRecommendation: $("failSafeStatusRecommendation"),
    statusConfidence: $("failSafeStatusConfidence"),
    statusFlags: $("failSafeStatusFlags"),
    statusRisk: $("failSafeStatusRisk"),
    statusAction: $("failSafeStatusAction"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    activeScopeCard: $("activeAccessScopeCard"),
    activeScopeTitle: $("activeAccessScopeTitle"),
    activeScopeDescription: $("activeAccessScopeDescription"),
    activeScopeMeta: $("activeAccessScopeMeta"),
    nextStepRow: $("next-step-row"),
    continueBtn: $("continue"),
    reportTitle: $("reportTitle"),
    projectName: $("projectName"),
    clientName: $("clientName"),
    preparedBy: $("preparedBy"),
    customNotes: $("customNotes"),
    exportReport: $("exportReport"),
    saveSnapshot: $("saveSnapshot"),
    exportStatus: $("exportStatus"),
    decisionCard: $("failSafeDecisionCard"),
    chartWrap: $("chartWrap"),
    failSafeStateVisual: $("failSafeStateVisual"),
    failSafeDecisionSchedule: $("failSafeDecisionSchedule"),
    localAssistantMount: $("accessControlLocalAssistantMount")
  };

  let currentReport = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatDateTime(isoString) {
    try {
      return new Date(isoString).toLocaleString();
    } catch {
      return String(isoString || "");
    }
  }

  function makeReportId(prefix = "SL-REPORT") {
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    return `${prefix}-${stamp}`;
  }

  function normalizeSlug(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  // access-control-fail-safe-assistant-proof-contract-021
  function outputShell() {
    return window.ScopedLabsAccessControlOutputShell || null;
  }

  function findRowValue(rows, label) {
    const target = String(label || "").trim().toLowerCase();
    const row = Array.isArray(rows)
      ? rows.find((item) => String(item?.label || "").trim().toLowerCase() === target)
      : null;

    return row ? row.value : "";
  }

  function failSafeStatusChip(status) {
    const clean = String(status || "WATCH").toUpperCase();
    const tone = clean.includes("RISK") ? "is-risk" : clean.includes("AUTHORITY") || clean.includes("WATCH") ? "is-watch" : "is-healthy";
    return '<span class="fail-safe-status-chip ' + tone + '">' + escapeHtml(clean) + '</span>';
  }

  function failSafeScheduleRow(group, metric, value, note) {
    return '<tr><td>' + escapeHtml(group) + '</td><td>' + escapeHtml(metric) + '</td><td>' + value + '</td><td>' + escapeHtml(note) + '</td></tr>';
  }

  function buildFailSafeDecisionScheduleHtml(rows = []) {
    const recommendation = findRowValue(rows, "Recommendation") || "Decision pending";
    const status = findRowValue(rows, "Status") || "WATCH";
    const confidence = findRowValue(rows, "Confidence") || "Pending";
    const rationale = findRowValue(rows, "Why") || "Decision rationale pending.";
    const flags = findRowValue(rows, "Decision Flags") || "No special flags";
    const requiredAction = findRowValue(rows, "Required Action") || "Document this decision before continuing.";
    const scoreMeaning = findRowValue(rows, "Score Meaning") || "Score interpretation pending.";
    const risk = findRowValue(rows, "Primary Risk") || "Risk basis pending.";
    const score = findRowValue(rows, "Score") || "0";
    const interpretation = findRowValue(rows, "Engineering Interpretation") || "Engineering interpretation pending.";
    const guidance = findRowValue(rows, "Actionable Guidance") || "Verify the fail-state decision before final hardware selection.";

    const tableRows = [
      failSafeScheduleRow("Decision", "Recommendation", escapeHtml(recommendation), "Primary fail-state behavior for the selected opening."),
      failSafeScheduleRow("Decision", "Status", failSafeStatusChip(status), "Readiness of this result before it is carried forward."),
      failSafeScheduleRow("Decision", "Confidence", escapeHtml(confidence), "Confidence based on score and active scope context."),
      failSafeScheduleRow("Reason", "Why", escapeHtml(rationale), "Main reason the recommendation moved in this direction."),
      failSafeScheduleRow("Risk", "Primary Risk", escapeHtml(risk), "Risk to account for in hardware, power, egress, or security planning."),
      failSafeScheduleRow("Flags", "Decision Flags", escapeHtml(flags), "Special release, fire-rated, or review conditions to verify."),
      failSafeScheduleRow("Score", "Meaning / Score", escapeHtml(scoreMeaning + " / " + score), "Model pressure behind the fail-state recommendation."),
      failSafeScheduleRow("Action", "Required Action", escapeHtml(requiredAction), "Action to complete before moving to reader type."),
      failSafeScheduleRow("Guidance", "Actionable Guidance", escapeHtml(guidance), "Practical follow-through for design coordination.")
    ];

    return [
      '<div class="fail-safe-decision-hero">',
      '<div><strong>' + escapeHtml(recommendation) + '</strong><span>' + escapeHtml(rationale) + '</span></div>',
      '<div>' + failSafeStatusChip(status) + '<span>Confidence: ' + escapeHtml(confidence) + '</span></div>',
      '</div>',
      '<table class="fail-safe-summary-table" data-fail-safe-summary-table="true"><thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead><tbody>',
      tableRows.join(""),
      '</tbody></table>',
      '<p class="mini-note"><strong>Engineering Interpretation:</strong> ' + escapeHtml(interpretation) + '</p>'
    ].join("");
  }


  function planningVisuals() {
    return window.ScopedLabsAccessControlPlanningVisuals || null;
  }

  function rowValue(rows, label) {
    const target = String(label || "").trim().toLowerCase();
    const row = Array.isArray(rows)
      ? rows.find((item) => String(item?.label || "").trim().toLowerCase() === target)
      : null;
    return row ? row.value : "";
  }

  function currentOutputValue(label) {
    return currentReport ? rowValue(currentReport.outputs || [], label) : "";
  }

  function currentInputValue(label) {
    return currentReport ? rowValue(currentReport.inputs || [], label) : "";
  }

  function buildFailSafeVisualMetrics(options = {}) {
    const rows = options.outputs || [];
    const inputs = options.inputs || {};

    return {
      status: options.status || rowValue(rows, "Status") || currentOutputValue("Status") || currentReport?.status || "WATCH",
      recommendation: options.recommendation || rowValue(rows, "Recommendation") || currentOutputValue("Recommendation") || "CONDITIONAL",
      confidence: options.confidence || rowValue(rows, "Confidence") || currentOutputValue("Confidence") || "Pending",
      score: options.score != null ? options.score : (rowValue(rows, "Score") || currentOutputValue("Score") || "Pending"),
      risk: options.risk || rowValue(rows, "Primary Risk") || currentOutputValue("Primary Risk") || "Decision risk pending",
      rationale: options.rationale || rowValue(rows, "Why") || currentOutputValue("Why") || "Recommendation rationale pending",
      requiredAction: options.requiredAction || rowValue(rows, "Required Action") || currentOutputValue("Required Action") || "Required action pending",
      doorTypeLabel: inputs.doorTypeLabel || currentInputValue("Door Type") || labelFromSelect(els.doorType),
      powerLossLabel: inputs.powerLossLabel || currentInputValue("Power Reliability") || labelFromSelect(els.powerLoss),
      fireLabel: inputs.fireLabel || currentInputValue("Fire Alarm Integration") || labelFromSelect(els.fire),
      hardwareTypeLabel: inputs.hardwareTypeLabel || currentInputValue("Hardware Type") || labelFromSelect(els.hardwareType),
      egressControlledLabel: inputs.egressControlledLabel || currentInputValue("Egress Controlled by Access System") || labelFromSelect(els.egressControlled),
      releaseEventLabel: inputs.releaseEventLabel || currentInputValue("Required Release Event") || labelFromSelect(els.releaseEvent),
      standbyPowerLabel: inputs.standbyPowerLabel || currentInputValue("Standby Power Expectation") || labelFromSelect(els.standbyPower),
      references: options.references || currentReport?.recommendationReferences || []
    };
  }

  function renderFailSafeStateVisual(metrics = {}) {
    const visuals = planningVisuals();
    if (!els.failSafeStateVisual || !visuals) return false;

    if (typeof visuals.renderFailSafeState === "function") {
      const rendered = visuals.renderFailSafeState({
        card: els.decisionCard,
        wrap: els.chartWrap,
        target: els.failSafeStateVisual,
        metrics
      });

      if (rendered) return true;
    }

    if (typeof visuals.buildFailSafeStateDiagramSvg === "function") {
      const svg = visuals.buildFailSafeStateDiagramSvg({
        ...metrics,
        exportMode: false
      });

      if (svg) {
        els.failSafeStateVisual.innerHTML = svg;
        if (els.chartWrap) els.chartWrap.hidden = false;
        if (els.decisionCard) els.decisionCard.hidden = false;
        return true;
      }
    }

    return false;
  }

  function clearFailSafeStateVisual() {
    const visuals = planningVisuals();
    if (visuals && typeof visuals.hide === "function") {
      return visuals.hide({
        card: els.decisionCard,
        wrap: els.chartWrap,
        target: els.failSafeStateVisual
      });
    }
    if (els.failSafeStateVisual) els.failSafeStateVisual.innerHTML = "";
    return true;
  }

  function renderFailSafeDecisionSchedule(rows) {
    const html = buildFailSafeDecisionScheduleHtml(rows);
    const shell = outputShell();

    if (shell && typeof shell.showVisual === "function") {
      return shell.showVisual({
        card: els.decisionCard,
        wrap: els.chartWrap,
        target: els.failSafeDecisionSchedule,
        html
      });
    }

    if (els.failSafeDecisionSchedule) els.failSafeDecisionSchedule.innerHTML = html;
    if (els.chartWrap) els.chartWrap.hidden = false;
    if (els.decisionCard) els.decisionCard.hidden = false;
    return true;
  }

  function clearFailSafeDecisionSchedule() {
    const shell = outputShell();

    if (shell && typeof shell.hideVisual === "function") {
      return shell.hideVisual({
        card: els.decisionCard,
        wrap: els.chartWrap,
        target: els.failSafeDecisionSchedule
      });
    }

    if (els.failSafeDecisionSchedule) els.failSafeDecisionSchedule.innerHTML = "";
    if (els.chartWrap) els.chartWrap.hidden = true;
    if (els.decisionCard) els.decisionCard.hidden = true;
    return true;
  }

  function svgDataUri(svg) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(String(svg || ""));
  }

  function buildFailSafeExportSvg() {
    if (!currentReport) return "";

    const outputValue = (label) => {
      const target = String(label || "").trim().toLowerCase();
      const row = (currentReport.outputs || []).find((item) => String(item?.label || "").trim().toLowerCase() === target);
      return row ? row.value : "";
    };

    const recommendation = outputValue("Recommendation") || "Fail-state decision";
    const status = outputValue("Status") || currentReport.status || "WATCH";
    const confidence = outputValue("Confidence") || "Pending";
    const risk = outputValue("Primary Risk") || "Risk basis pending";
    const color = String(status).toUpperCase().includes("RISK") ? "#b42318" : String(status).toUpperCase().includes("WATCH") || String(status).toUpperCase().includes("AUTHORITY") ? "#b7791f" : "#1f9d57";

    return '<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="360" viewBox="0 0 1100 360"><rect width="1100" height="360" rx="22" fill="#ffffff"/><rect x="36" y="34" width="1028" height="292" rx="18" fill="#f8fbf8" stroke="#b8cabe"/><text x="70" y="78" fill="#101715" font-size="24" font-weight="800" font-family="Inter,Arial,sans-serif">Fail-State Decision Schedule</text><rect x="870" y="54" width="150" height="38" rx="10" fill="#ffffff" stroke="' + color + '"/><text x="892" y="79" fill="' + color + '" font-size="14" font-weight="800" font-family="Inter,Arial,sans-serif">' + escapeHtml(status) + '</text><text x="70" y="138" fill="#1f9d57" font-size="20" font-weight="800" font-family="Inter,Arial,sans-serif">' + escapeHtml(recommendation) + '</text><text x="70" y="180" fill="#54615d" font-size="16" font-family="Inter,Arial,sans-serif">Confidence: ' + escapeHtml(confidence) + '</text><text x="70" y="222" fill="#54615d" font-size="16" font-family="Inter,Arial,sans-serif">Primary Risk: ' + escapeHtml(risk) + '</text><path d="M70 258 H1016" stroke="#dce8e1"/><text x="70" y="292" fill="#54615d" font-size="14" font-family="Inter,Arial,sans-serif">Verify release behavior, AHJ/code requirements, egress control, and standby power before final hardware selection.</text></svg>';
  }

  function getFailSafeVisualSvg() {
    const visuals = planningVisuals();

    if (visuals && typeof visuals.buildFailSafeStateDiagramSvg === "function") {
      const svgHtml = visuals.buildFailSafeStateDiagramSvg({
        ...buildFailSafeVisualMetrics({ references: currentReport?.recommendationReferences || [] }),
        exportMode: false
      });
      const match = String(svgHtml || "").match(/<svg[\s\S]*?<\/svg>/i);
      if (match) return match[0];
    }

    return buildFailSafeExportSvg();
  }

  function getFailSafeVisibleVisualHtml() {
    const diagram = els.failSafeStateVisual ? els.failSafeStateVisual.innerHTML : "";
    const schedule = els.failSafeDecisionSchedule ? els.failSafeDecisionSchedule.innerHTML : "";

    return [
      diagram ? '<div class="fail-safe-export-state-visual" data-export-visual="fail-safe-state-diagram">' + diagram + '</div>' : "",
      schedule ? '<div class="fail-safe-export-decision-schedule" data-export-visual="fail-safe-decision-schedule">' + schedule + '</div>' : ""
    ].filter(Boolean).join("");
  }

  function getFailSafeVisualImage() {
    const svg = getFailSafeVisualSvg();
    return svg ? svgDataUri(svg) : "";
  }

  function getExportChartImage() {
    return getFailSafeVisualImage();
  }

  function attachOutputShellExport() {
    const shell = outputShell();
    if (!shell || typeof shell.register !== "function") return false;

    shell.register(STEP, {
      getChartImage: getFailSafeVisualImage,
      getExportChartImage,
      getVisualHtml: getFailSafeVisibleVisualHtml
    });

    if (typeof shell.attachExportGetter === "function") {
      shell.attachExportGetter(STEP, window.ScopedLabsExportConfig);
    }

    return true;
  }

  function hasStoredAuth() {
    try {
      const keys = Object.keys(localStorage);

      for (const key of keys) {
        if (!key.startsWith("sb-")) continue;

        const rawText = localStorage.getItem(key);
        if (!rawText) continue;

        const raw = JSON.parse(rawText);

        if (
          raw?.access_token ||
          raw?.currentSession?.access_token ||
          raw?.session?.access_token ||
          raw?.user?.aud === "authenticated" ||
          (Array.isArray(raw) && raw.some((item) => item?.access_token))
        ) {
          return true;
        }
      }
    } catch {}

    return false;
  }

  function valueContainsCategory(value, category) {
    const target = normalizeSlug(category);

    if (value == null) return false;

    if (typeof value === "string") {
      return normalizeSlug(value).includes(target);
    }

    if (Array.isArray(value)) {
      return value.some((item) => valueContainsCategory(item, target));
    }

    if (typeof value === "object") {
      return Object.entries(value).some(([key, val]) => {
        const k = normalizeSlug(key);

        if (k === target && (val === true || val === "true" || val === 1 || val === "1")) {
          return true;
        }

        if (
          ["category", "category_slug", "categorySlug", "slug", "id", "name"].includes(key) &&
          normalizeSlug(val) === target
        ) {
          return true;
        }

        return valueContainsCategory(val, target);
      });
    }

    return false;
  }

  function getUnlockedCategories() {
    const found = new Set();

    try {
      const direct = localStorage.getItem("sl_unlocked_categories");

      if (direct) {
        try {
          const parsed = JSON.parse(direct);

          if (Array.isArray(parsed)) {
            parsed.forEach((item) => {
              if (typeof item === "string") found.add(normalizeSlug(item));
              else if (item?.category) found.add(normalizeSlug(item.category));
              else if (item?.category_slug) found.add(normalizeSlug(item.category_slug));
              else if (item?.slug) found.add(normalizeSlug(item.slug));
            });
          } else if (typeof parsed === "object" && parsed) {
            Object.entries(parsed).forEach(([key, value]) => {
              if (value === true || value === "true" || value === 1 || value === "1") {
                found.add(normalizeSlug(key));
              }

              if (typeof value === "string") {
                found.add(normalizeSlug(value));
              }
            });
          }
        } catch {
          direct
            .split(",")
            .map((x) => normalizeSlug(x))
            .filter(Boolean)
            .forEach((x) => found.add(x));
        }
      }

      Object.keys(localStorage).forEach((key) => {
        const lowerKey = normalizeSlug(key);

        if (
          !lowerKey.includes("unlock") &&
          !lowerKey.includes("entitlement") &&
          !lowerKey.includes("category")
        ) {
          return;
        }

        const raw = localStorage.getItem(key);
        if (!raw) return;

        if (normalizeSlug(raw).includes(CATEGORY)) {
          found.add(CATEGORY);
        }

        try {
          const parsed = JSON.parse(raw);
          if (valueContainsCategory(parsed, CATEGORY)) {
            found.add(CATEGORY);
          }
        } catch {}
      });
    } catch {}

    return Array.from(found).filter(Boolean);
  }

  function hasExportAccess() {
    return hasStoredAuth() && getUnlockedCategories().includes(CATEGORY);
  }

  function setExportEnabled(enabled) {
    if (els.exportReport) els.exportReport.disabled = !enabled;
    if (els.saveSnapshot) els.saveSnapshot.disabled = !enabled;
    if (window.ScopedLabsExport) {
      if (enabled && typeof window.ScopedLabsExport.refresh === "function") {
        window.ScopedLabsExport.refresh();
      } else if (!enabled && typeof window.ScopedLabsExport.invalidate === "function") {
        window.ScopedLabsExport.invalidate("Inputs changed. Run the calculator again to refresh export.");
      }
    }
  }

  function setExportStatus(message = "") {
    if (els.exportStatus) els.exportStatus.textContent = message;
  }

  function updateExportControls(message) {
    const unlocked = hasExportAccess();
    const ready = !!currentReport;

    setExportEnabled(unlocked && ready);

    if (message !== undefined) {
      setExportStatus(message);
      return;
    }

    if (!unlocked) {
      setExportStatus("Export is available with Access Control category unlock.");
      return;
    }

    if (!ready) {
      setExportStatus("Run the evaluation to enable export.");
      return;
    }

    setExportStatus("Evaluation ready. Open Export Report or Save Snapshot.");
  }

  function getReportMeta() {
    return {
      reportTitle: (els.reportTitle?.value || "").trim() || "Fail-Safe vs Fail-Secure Assessment",
      projectName: (els.projectName?.value || "").trim(),
      clientName: (els.clientName?.value || "").trim(),
      preparedBy: (els.preparedBy?.value || "").trim(),
      customNotes: (els.customNotes?.value || "").trim()
    };
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function accessScopeState() {
    return window.ScopedLabsAccessControlScopeState || null;
  }

  function getActiveAccessScope() {
    const api = accessScopeState();
    if (!api || typeof api.getActiveScope !== "function") return null;
    return api.getActiveScope();
  }

  function readAccessScopeLedger() {
    const api = accessScopeState();
    if (!api || typeof api.readLedger !== "function") return null;
    return api.readLedger();
  }

  function writeAccessScopeLedger(ledger) {
    const api = accessScopeState();
    if (!api || typeof api.writeLedger !== "function") return null;
    return api.writeLedger(ledger);
  }

  function renderActiveScopeContext() {
    const scope = getActiveAccessScope();

    if (!els.activeScopeCard) return;

    if (!scope) {
      els.activeScopeCard.hidden = false;
      if (els.activeScopeTitle) els.activeScopeTitle.textContent = "No active access scope selected";
      if (els.activeScopeDescription) {
        els.activeScopeDescription.textContent = "Create or select an access scope before using this tool so the result can be tied to the right door or zone.";
      }
      if (els.activeScopeMeta) {
        els.activeScopeMeta.innerHTML = [
          '<div><strong>Next Step</strong><span>Open Access Scope Planner</span></div>',
          '<div><strong>Result Save</strong><span>Tool result will not be tied to a scope yet.</span></div>'
        ].join("");
      }
      return;
    }

    els.activeScopeCard.hidden = false;

    if (els.activeScopeTitle) {
      els.activeScopeTitle.textContent = scope.name || "Active Access Scope";
    }

    if (els.activeScopeDescription) {
      els.activeScopeDescription.textContent = titleCase(scope.scopeType) + " | " + titleCase(scope.doorFunction) + " | " + titleCase(scope.planningPath);
    }

    const statusText = scope.requiresAuthorityReview ? "Authority Review" : titleCase(scope.status || "Planning");
    const statusClass = scope.requiresAuthorityReview ? "access-status-authority-text" : "access-status-complete-text";

    if (els.activeScopeMeta) {
      els.activeScopeMeta.innerHTML = [
        '<div><strong>Opening</strong><span>' + escapeHtml(titleCase(scope.openingType)) + '</span></div>',
        '<div><strong>Egress</strong><span>' + escapeHtml(titleCase(scope.egressRole)) + '</span></div>',
        '<div><strong>Fire Release</strong><span>' + escapeHtml(titleCase(scope.fireRelease)) + '</span></div>',
        '<div><strong>Status</strong><span class="' + statusClass + '">' + escapeHtml(statusText) + '</span></div>',
        '<div><strong>Power Intent</strong><span>' + escapeHtml(titleCase(scope.powerLossIntent)) + '</span></div>',
        '<div><strong>Lock Intent</strong><span>' + escapeHtml(titleCase(scope.lockIntent)) + '</span></div>',
        '<div><strong>Threat</strong><span>' + escapeHtml(titleCase(scope.threatLevel)) + '</span></div>',
        '<div><strong>Reader</strong><span>' + escapeHtml(titleCase(scope.readerIntent)) + '</span></div>'
      ].join("");
    }
  }

  function scopeContextForReport(scope) {
    if (!scope) return [];
    return [
      { label: "Active Scope", value: scope.name || "Active Access Scope" },
      { label: "Scope Type", value: titleCase(scope.scopeType) },
      { label: "Opening Type", value: titleCase(scope.openingType) },
      { label: "Door / Zone Function", value: titleCase(scope.doorFunction) },
      { label: "Egress Role", value: titleCase(scope.egressRole) },
      { label: "Free Egress", value: titleCase(scope.freeEgress) },
      { label: "Fire Release", value: titleCase(scope.fireRelease) },
      { label: "Power-Loss Intent", value: titleCase(scope.powerLossIntent) },
      { label: "Lock Intent", value: titleCase(scope.lockIntent) },
      { label: "Authority Review", value: scope.requiresAuthorityReview ? "Yes" : "No" }
    ];
  }

  function publishFailSafeResultToScopeLedger(core) {
    const ledger = readAccessScopeLedger();
    if (!ledger || !Array.isArray(ledger.scopes) || !core.activeScope) return null;

    const scopeIndex = ledger.scopes.findIndex((scope) => scope.id === core.activeScope.id);
    if (scopeIndex < 0) return null;

    const scope = ledger.scopes[scopeIndex];
    const completedTools = scope.completedTools && typeof scope.completedTools === "object" ? scope.completedTools : {};

    completedTools[STEP] = {
      status: core.status,
      recommendation: core.recommendation,
      confidence: core.confidence,
      score: core.score,
      summary: core.summary,
      inputs: core.inputs || {},
      decisionFlags: core.decisionFlags || [],
      requiredActions: core.requiredActions || [],
      powerLossIntent: core.recommendation === "FAIL-SAFE" ? "fail-safe" : (core.recommendation === "FAIL-SECURE" ? "fail-secure" : "conditional"),
      updatedAt: new Date().toISOString()
    };

    ledger.scopes[scopeIndex] = {
      ...scope,
      completedTools,
      powerLossIntent: completedTools[STEP].powerLossIntent,
      failStateStatus: core.status,
      failStateDecisionFlags: core.decisionFlags || [],
      status: core.status,
      scopeReviewStatus: core.activeScope.requiresAuthorityReview ? "AUTHORITY REVIEW" : "NONE",
      updatedAt: new Date().toISOString()
    };

    return writeAccessScopeLedger(ledger);
  }

  function assumptionsForTool() {
    return [
      "This model is a planning aid for early door behavior review and does not replace code compliance review.",
      "Life safety, egress requirements, AHJ direction, and adopted codes must override calculator output where applicable.",
      "Fail-secure behavior must still preserve safe egress through compliant hardware and door function.",
      "Final hardware selection should be validated against the lock type, fire alarm interface, power supply design, and site operating policy."
    ];
  }

  function showContinue() {
    if (els.nextStepRow) els.nextStepRow.style.display = "flex";
    if (els.continueBtn) els.continueBtn.disabled = false;
  }

  function hideContinue() {
    if (els.nextStepRow) els.nextStepRow.style.display = "none";
    if (els.continueBtn) els.continueBtn.disabled = true;
  }

  function normalizeStatusClass(status) {
    const normalized = String(status || "").toLowerCase().replace(/\s+/g, "-");
    if (normalized.includes("authority")) return "authority";
    if (normalized.includes("risk")) return "risk";
    if (normalized.includes("watch")) return "watch";
    if (normalized.includes("complete")) return "complete";
    return "watch";
  }

  function clearVisibleDecisionStatus() {
    if (els.statusCard) els.statusCard.hidden = true;
  }


  function buildFailSafeRecommendationReferences(core = {}) {
    const recommendation = String(core.recommendation || "CONDITIONAL").toUpperCase();
    const status = String(core.status || "WATCH").toUpperCase();
    const inputs = core.inputs || {};
    const flags = Array.isArray(core.decisionFlags) ? core.decisionFlags : [];
    const actions = Array.isArray(core.requiredActions) ? core.requiredActions : [];
    const releaseContext = [inputs.fireLabel, inputs.releaseEventLabel].filter(Boolean).join(" / ") || "Release behavior not documented";
    const egressContext = [inputs.egressControlledLabel, inputs.standbyPowerLabel].filter(Boolean).join(" / ") || "Egress/standby power not documented";

    return [
      {
        id: "*1",
        label: "Recommendation basis",
        reason: core.rationale || ("Recommended " + recommendation + " from the selected fail-state conditions."),
        tone: status.includes("RISK") ? "risk" : status.includes("SAFE") || status.includes("COMPLETE") ? "safe" : "watch"
      },
      {
        id: "*2",
        label: "Release path",
        reason: "Fire/release input: " + releaseContext + ". Verify the release path matches the intended hardware behavior.",
        tone: releaseContext.toLowerCase().includes("none") ? "watch" : "safe"
      },
      {
        id: "*3",
        label: "Egress / review",
        reason: (actions[0] || core.risk || "Confirm egress, standby power, and authority-review requirements before final selection.") + (flags.length ? " Flags: " + flags.join(" | ") + "." : ""),
        tone: status.includes("RISK") ? "risk" : "watch"
      }
    ];
  }

  function renderVisibleDecisionStatus(core) {
    if (!els.statusCard) return;

    const statusClass = normalizeStatusClass(core.status);
    els.statusCard.hidden = false;

    if (els.statusTitle) {
      els.statusTitle.textContent = core.recommendation || "Decision Pending";
    }

    if (els.statusSubtitle) {
      els.statusSubtitle.textContent = core.rationale || "Review the required action before continuing.";
    }

    if (els.statusText) {
      els.statusText.textContent = core.status || "WATCH";
      els.statusText.className = "access-fail-safe-status-text " + statusClass;
    }

    if (els.statusRecommendation) els.statusRecommendation.textContent = core.recommendation || "?";
    if (els.statusConfidence) els.statusConfidence.textContent = core.confidence || "?";
    if (els.statusFlags) els.statusFlags.textContent = core.flags && core.flags.length ? core.flags.join(" | ") : "No special flags";
    if (els.statusRisk) els.statusRisk.textContent = core.risk || "?";
    if (els.statusAction) els.statusAction.textContent = core.actions && core.actions.length ? core.actions.join(" ") : "Carry this result into the next Access Control design step.";
  }

  function render(rows, options = {}) {
    if (!els.results) return;

    els.results.innerHTML = rows.map((r) => [
      '<div class="result-row" data-result-label="' + escapeHtml(r.label) + '" data-result-value="' + escapeHtml(r.value) + '">',
      '<span class="result-label">' + escapeHtml(r.label) + '</span>',
      '<span class="result-value">' + escapeHtml(r.value) + '</span>',
      '</div>'
    ].join("")).join("");

    renderFailSafeStateVisual(buildFailSafeVisualMetrics({
      outputs: rows,
      inputs: options.inputs || {},
      references: options.references || [],
      rationale: options.rationale || "",
      requiredAction: options.requiredAction || ""
    }));
    renderFailSafeDecisionSchedule(rows);
  }

  function getRenderedRows() {
    if (!els.results) return [];

    return Array.from(els.results.querySelectorAll(".result-row"))
      .map((row) => {
        const label = row.querySelector(".result-label")?.textContent?.trim() || "";
        const value = row.querySelector(".result-value")?.textContent?.trim() || "";
        return { label, value };
      })
      .filter((item) => item.label || item.value);
  }

  function readSnapshots(key) {
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function writeSnapshots(key, items) {
    localStorage.setItem(key, JSON.stringify(items));
  }

  function saveSnapshot(key, payload, limit = 25) {
    const existing = readSnapshots(key);
    existing.unshift({
      ...payload,
      savedAt: new Date().toISOString()
    });

    const trimmed = existing.slice(0, limit);
    writeSnapshots(key, trimmed);
    return trimmed.length;
  }

  function buildReportPayload(core) {
    return {
      reportId: makeReportId("SL-ACC-FS"),
      generatedAt: new Date().toISOString(),
      category: CATEGORY_LABEL,
      categorySlug: CATEGORY,
      tool: TOOL_LABEL,
      toolSlug: STEP,
      status: core.status,
      summary: core.summary,
      interpretation: core.interpretation,
      scopeContext: scopeContextForReport(core.activeScope),
      inputs: [
        { label: "Door Type", value: core.inputs.doorTypeLabel },
        { label: "Life Safety Priority", value: core.inputs.lifeLabel },
        { label: "Power Reliability", value: core.inputs.powerLossLabel },
        { label: "Fire Alarm Integration", value: core.inputs.fireLabel },
        { label: "Threat Level", value: core.inputs.threatLabel },
        { label: "Hardware Type", value: core.inputs.hardwareTypeLabel },
        { label: "Fire-Rated Opening", value: core.inputs.fireRatedLabel },
        { label: "Egress Controlled by Access System", value: core.inputs.egressControlledLabel },
        { label: "Required Release Event", value: core.inputs.releaseEventLabel },
        { label: "Standby Power Expectation", value: core.inputs.standbyPowerLabel }
      ],
      outputs: core.outputs,
      assumptions: assumptionsForTool(),
      recommendationReferences: core.recommendationReferences || [],
      meta: getReportMeta()
    };
  }

    function getSharedExportPayload() {
    if (!currentReport) return null;

    const outputValue = (label) => {
      const row = (currentReport.outputs || []).find((item) => {
        return item && String(item.label || "").trim().toLowerCase() === String(label || "").trim().toLowerCase();
      });

      return row ? row.value : "";
    };

    const scopeValue = (label) => {
      const row = (currentReport.scopeContext || []).find((item) => {
        return item && String(item.label || "").trim().toLowerCase() === String(label || "").trim().toLowerCase();
      });

      return row ? row.value : "";
    };

    const toneForStatus = (value) => {
      const text = String(value || "").toLowerCase();
      if (text.includes("risk")) return "risk";
      if (text.includes("authority")) return "authority";
      if (text.includes("watch")) return "watch";
      if (text.includes("complete")) return "complete";
      return "";
    };

    const cell = (text, tone = "") => {
      return { text: text || "", tone };
    };

    const textSection = (title, text, description) => {
      const value = String(text || "").trim();
      if (!value) return null;
      return {
        title,
        description: description || "",
        text: value
      };
    };

    const compactSentence = (value, fallback) => {
      const text = String(value || fallback || "").trim();
      if (!text) return "";
      return text
        .replace(/\s+/g, " ")
        .replace(/\.$/, "");
    };

    const decisionStatus = outputValue("Status") || currentReport.status || "";
    const recommendation = outputValue("Recommendation") || "";
    const confidence = outputValue("Confidence") || "";
    const score = outputValue("Score") || "";
    const primaryRisk = outputValue("Primary Risk") || "";
    const requiredAction = outputValue("Required Action") || "";
    const scoreMeaning = outputValue("Score Meaning") || "";
    const decisionFlags = outputValue("Decision Flags") || "";

    const activeScopeName = scopeValue("Active Scope") || "No active scope attached";
    const scopeType = scopeValue("Scope Type") || "Not documented";
    const openingType = scopeValue("Opening Type") || "Not documented";
    const doorFunction = scopeValue("Door / Zone Function") || "Not documented";

    const statusTone = toneForStatus(decisionStatus);
    const hasActiveScope = activeScopeName !== "No active scope attached";

    function getAssistantProofReferenceExportSection() {
      const outputShell = window.ScopedLabsAccessControlOutputShell;
      if (outputShell && typeof outputShell.buildAssistantProofReferencesSection === "function") {
        return outputShell.buildAssistantProofReferencesSection(currentReport.recommendationReferences || [], {
          title: "Recommendation References",
          description: "Reference markers shown in the Assistant Recommendation visual. These explain why a change, review, or validation step is recommended.",
          tableClass: "extra-export-table--planner extra-export-table--decision"
        });
      }

      return {
        title: "Recommendation References",
        description: "Reference markers shown in the Assistant Recommendation visual. These explain why a change, review, or validation step is recommended.",
        tableClass: "extra-export-table--planner extra-export-table--decision",
        tables: [
          {
            headers: ["Marker", "Reference", "Reason"],
            rows: (currentReport.recommendationReferences || []).map((item) => [item.id || "", item.label || "", item.reason || ""])
          }
        ]
      };
    }

    const keySavedResult = [
      recommendation || "",
      decisionStatus || "",
      confidence ? "Confidence: " + confidence : ""
    ].filter(Boolean).join(" | ");

    const scopeNextAction = requiredAction
      ? compactSentence(requiredAction)
      : "Continue to Reader Type after this decision is documented";

    const extraSections = [
      {
        title: "Executive Summary",
        text: currentReport.summary || ""
      },
      {
        title: "Active Scope Context",
        description: "Access Control scope attached to this fail-state decision. This keeps the result tied to the correct door or zone.",
        countLabel: hasActiveScope ? "1 ITEM" : "0 ITEMS",
        countTone: "muted",
        tableClass: "extra-export-table--planner extra-export-table--access-scope",
        tables: [
          {
            headers: ["Scope / Door", "Selected", "Status", "Checks", "Key Saved Result", "Next Action"],
            rows: [[
              activeScopeName + "\n" + scopeType + " | " + openingType + " | " + doorFunction,
              cell(hasActiveScope ? "Active Scope" : "Not Attached", hasActiveScope ? "active" : "muted"),
              cell(decisionStatus || "Pending", statusTone || "muted"),
              "1",
              keySavedResult || "No saved result",
              scopeNextAction
            ]]
          }
        ]
      },
      {
        title: "Inputs",
        description: "Decision inputs used for this fail-safe / fail-secure assessment.",
        tableClass: "extra-export-table--kv",
        tables: [
          {
            headers: ["Input", "Value"],
            rows: (currentReport.inputs || []).map((item) => [item.label, item.value])
          }
        ]
      },
      getAssistantProofReferenceExportSection(),
      {
        title: "Decision Summary",
        description: "Short decision facts only. Longer engineering guidance is separated below for readability.",
        tableClass: "extra-export-table--planner extra-export-table--decision",
        tables: [
          {
            headers: ["Recommendation", "Status", "Confidence", "Score", "Primary Risk"],
            rows: [[
              recommendation || "Pending",
              cell(decisionStatus || "Pending", statusTone || "muted"),
              confidence || "Not calculated",
              score || "Not calculated",
              primaryRisk || "No primary risk documented"
            ]]
          }
        ]
      }
    ];

    [
      textSection("Required Action", requiredAction, "Immediate action required before treating this decision as complete."),
      textSection("Engineering Interpretation", outputValue("Engineering Interpretation") || currentReport.interpretation, "Engineering explanation for the selected fail-state direction."),
      textSection("Actionable Guidance", outputValue("Actionable Guidance"), "Recommended next steps for reader selection, lock power, and panel planning."),
      textSection("Decision Flags", decisionFlags, "Review flags carried forward into the Access Control summary."),
      textSection("Score Meaning", scoreMeaning, "How the score should be interpreted for this door or zone.")
    ].filter(Boolean).forEach((section) => extraSections.push(section));

    return {
      ...currentReport,
      meta: getReportMeta(),
      summary: "",
      inputs: [],
      outputs: [],
      interpretation: "",
      extraSections,
      stackReportSections: true
    };
  }

  window.ScopedLabsAccessControlFailSafeExport = Object.freeze({
    getPayload: getSharedExportPayload
  });

function savePipelineResult(payload) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      data: payload
    });
  }

  function invalidatePipelineResult() {
    try {
      Object.values(FLOW_KEYS).forEach((key) => {
        sessionStorage.removeItem(key);
      });
    } catch {}

    hideContinue();
  }

  function clearLocalAssistant() {
    if (window.ScopedLabsLocalAssistant && els.localAssistantMount) {
      window.ScopedLabsLocalAssistant.clear(els.localAssistantMount);
      return;
    }

    if (els.localAssistantMount) {
      els.localAssistantMount.innerHTML = "";
      els.localAssistantMount.hidden = true;
    }
  }


  function markerToneClass(tone) {
    const text = String(tone || "watch").toLowerCase();
    if (text.includes("risk")) return "risk";
    if (text.includes("safe") || text.includes("complete")) return "safe";
    if (text.includes("authority")) return "authority";
    return "watch";
  }

  function decorateFailSafeAssistantMarkers(references = []) {
    if (!els.localAssistantMount) return;

    const toneById = new Map((Array.isArray(references) ? references : []).map((item) => {
      return [String(item?.id || "").trim(), markerToneClass(item?.tone)];
    }));

    const markerPattern = /(\*[123])/g;
    const walker = document.createTreeWalker(els.localAssistantMount, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!markerPattern.test(node.nodeValue || "")) return NodeFilter.FILTER_REJECT;
        markerPattern.lastIndex = 0;
        if (node.parentElement && node.parentElement.closest(".access-fail-safe-ref-marker")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);

    nodes.forEach((node) => {
      const text = node.nodeValue || "";
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      text.replace(markerPattern, (match, _marker, offset) => {
        if (offset > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, offset)));
        const span = document.createElement("span");
        span.className = "access-fail-safe-ref-marker " + (toneById.get(match) || "watch");
        span.textContent = match;
        fragment.appendChild(span);
        lastIndex = offset + match.length;
        return match;
      });
      if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      node.parentNode.replaceChild(fragment, node);
    });
  }

  function renderLocalAssistant(core) {
    const assistant = window.ScopedLabsLocalAssistant;
    const adapters = window.ScopedLabsAccessControlToolAssistantAdapters;
    const adapter = adapters && typeof adapters.getAdapter === "function" ? adapters.getAdapter(STEP) : null;

    if (!assistant || !adapter || !els.localAssistantMount || typeof adapter.buildModel !== "function") {
      return false;
    }

    const mounted = assistant.mount(els.localAssistantMount, adapter.buildModel(core));
    window.requestAnimationFrame(() => decorateFailSafeAssistantMarkers(core.recommendationReferences || []));
    return mounted;
  }

  function clearAnalysis() {
    if (window.ScopedLabsAnalyzer && els.analysis) {
      ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    } else if (els.analysis) {
      els.analysis.innerHTML = "";
      els.analysis.style.display = "none";
    }
  }

  function buildFailSafeExportPayload() {
    const cfg = window.ScopedLabsExportConfig || {};
    const chartImage = getFailSafeVisualImage();

    return Object.assign({
      category: cfg.categoryLabel || "Access Control",
      categorySlug: cfg.categorySlug || "access-control",
      tool: cfg.toolLabel || "Fail-Safe vs Fail-Secure",
      toolSlug: cfg.toolSlug || "fail-safe-fail-secure",
      assumptions: Array.isArray(cfg.assumptions) ? cfg.assumptions : [],
      printLowInkChart: true,
      meta: {}
    }, currentReport || {}, {
      chartImage,
      printLowInkChart: true,
      meta: Object.assign({}, (currentReport && currentReport.meta) || {})
    });
  }

  function openFailSafeLocalExportReport(event) {
    if (!currentReport) return false;

    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    if (!window.ScopedLabsExport || typeof window.ScopedLabsExport.openReportWindow !== "function") {
      if (typeof setExportStatus === "function") {
        setExportStatus("Export engine is still loading. Try again in a moment.");
      }
      return false;
    }

    const payload = buildFailSafeExportPayload();

    if (!payload.chartImage && typeof setExportStatus === "function") {
      setExportStatus("Report opened, but the Fail Safe visual was not available for export.");
    }

    const opened = window.ScopedLabsExport.openReportWindow(payload);

    if (typeof setExportStatus === "function") {
      setExportStatus(opened ? "Export report opened in a new tab." : "Popup blocked or export failed.");
    }

    return opened;
  }

  function bindFailSafeLocalExportOverride() {
    if (!els.exportReport || els.exportReport.dataset.failSafeLocalExportBound) return;
    els.exportReport.dataset.failSafeLocalExportBound = "true";
    els.exportReport.addEventListener("click", openFailSafeLocalExportReport, true);
  }

  function clearResults(message = "Run the evaluation to see results.") {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">${escapeHtml(message)}</div>`;
    }

    clearFailSafeStateVisual();
    clearFailSafeDecisionSchedule();
    clearVisibleDecisionStatus();
    clearLocalAssistant();
    clearAnalysis();
    hideContinue();
  }

  function invalidate() {
    currentReport = null;
    invalidatePipelineResult();
    clearResults("Inputs changed. Press Evaluate to refresh results.");
    updateExportControls();
    renderActiveScopeContext();
  }

  function getConfidence(score) {
    const abs = Math.abs(score);
    if (abs >= 4) return "HIGH";
    if (abs >= 2) return "MEDIUM";
    return "LOW";
  }

  function getScoreMeaning(score) {
    if (score >= 3) return "Strong bias toward life safety behavior.";
    if (score >= 1) return "Moderate lean toward life safety.";
    if (score <= -3) return "Strong bias toward security retention.";
    if (score <= -1) return "Moderate lean toward security.";
    return "Balanced conditions — requires design judgment.";
  }

  function labelFromSelect(selectEl) {
    if (!selectEl) return "";
    return selectEl.options[selectEl.selectedIndex]?.textContent?.trim() || selectEl.value || "";
  }

  function buildInterpretation(recommendation) {
    if (recommendation === "FAIL-SAFE") {
      return "This door leans toward fail-safe behavior because egress reliability and release behavior matter more than retaining the secured state through power loss. That is especially true when the door type or fire/alarm conditions increase life-safety sensitivity.";
    }

    if (recommendation === "FAIL-SECURE") {
      return "This door leans toward fail-secure behavior because the security consequence of releasing during outage is higher than the benefit of automatic unlock. That usually happens on perimeter or critical doors where threat pressure and asset protection outweigh convenience.";
    }

    return "The door conditions are balanced enough that neither fail-safe nor fail-secure wins cleanly on logic alone. This is where code requirements, occupancy, emergency egress, and actual operational use should drive the final hardware choice.";
  }

  function buildGuidance(recommendation) {
    if (recommendation === "FAIL-SAFE") {
      return "Confirm that the lock hardware, release path, and fire-alarm behavior all support safe egress under loss-of-power conditions before moving into reader and power design.";
    }

    if (recommendation === "FAIL-SECURE") {
      return "Verify egress method and code treatment carefully. A fail-secure choice is only acceptable if safe exit remains intact under the door’s actual use case and authority requirements.";
    }

    return "Do not finalize lock type yet. Escalate this door for code review and operational review before choosing reader placement or power assumptions.";
  }

  function valueFromSelect(selectEl) {
    return selectEl ? selectEl.value : "";
  }

  // access-control-fail-safe-assistant-proof-contract-021
  function setSelectValue(selectEl, value) {
    if (!selectEl || value === undefined || value === null) return false;

    const normalized = String(value).trim();
    if (!normalized) return false;

    const option = Array.from(selectEl.options || []).find((item) => item.value === normalized);
    if (!option) return false;

    selectEl.value = normalized;
    return true;
  }

  function mapScopeDoorType(scope) {
    const scopeType = String(scope?.scopeType || "").toLowerCase();
    const openingType = String(scope?.openingType || "").toLowerCase();
    const locationType = String(scope?.locationType || "").toLowerCase();
    const doorFunction = String(scope?.doorFunction || "").toLowerCase();

    if (
      openingType.includes("stairwell") ||
      openingType.includes("exit") ||
      doorFunction.includes("stairwell")
    ) {
      return "stairwell";
    }

    if (
      doorFunction.includes("it") ||
      doorFunction.includes("server") ||
      scopeType.includes("high-security-room")
    ) {
      return "it";
    }

    if (
      locationType.includes("exterior") ||
      locationType.includes("perimeter") ||
      locationType.includes("parking") ||
      openingType.includes("gate") ||
      openingType.includes("turnstile") ||
      scopeType.includes("exterior-entry")
    ) {
      return "perimeter";
    }

    return "interior";
  }

  function mapScopeLifePriority(scope) {
    const planningPath = String(scope?.planningPath || "").toLowerCase();
    const egressRole = String(scope?.egressRole || "").toLowerCase();
    const freeEgress = String(scope?.freeEgress || "").toLowerCase();
    const fireRelease = String(scope?.fireRelease || "").toLowerCase();

    if (
      planningPath.includes("egress") ||
      egressRole.includes("required") ||
      egressRole.includes("exit") ||
      egressRole.includes("stairwell") ||
      egressRole.includes("corridor") ||
      freeEgress === "no" ||
      fireRelease === "yes"
    ) {
      return "high";
    }

    if (egressRole.includes("not-egress")) {
      return "med";
    }

    return "high";
  }

  function mapScopeThreat(scope) {
    const threat = String(scope?.threatLevel || "").toLowerCase();

    if (threat === "high" || threat === "critical") return "high";
    if (threat === "medium" || threat === "med") return "med";
    return "low";
  }

  function mapScopeHardwareType(scope) {
    const lockIntent = String(scope?.lockIntent || "").toLowerCase();

    if (lockIntent === "electric-strike") return "electric-strike";
    if (lockIntent === "maglock") return "maglock";
    if (lockIntent === "electrified-lockset") return "electrified-lockset";
    if (lockIntent === "electrified-panic") return "electrified-panic-trim";
    if (lockIntent === "motorized-latch") return "electric-latch-retraction";
    if (lockIntent === "delayed-egress") return "delayed-egress";
    if (lockIntent === "gate-lock") return "special-locking";

    return "unknown";
  }

  function mapScopeFireRated(scope) {
    const fireRated = String(scope?.fireRated || "").toLowerCase();

    if (fireRated === "yes") return "yes";
    if (fireRated === "no") return "no";

    return "unknown";
  }

  function mapScopeEgressControlled(scope) {
    const lockIntent = String(scope?.lockIntent || "").toLowerCase();
    const freeEgress = String(scope?.freeEgress || "").toLowerCase();
    const egressRole = String(scope?.egressRole || "").toLowerCase();

    if (
      lockIntent === "maglock" ||
      lockIntent === "delayed-egress" ||
      lockIntent === "special-locking" ||
      freeEgress === "no"
    ) {
      return "yes";
    }

    if (freeEgress === "yes") {
      return "no";
    }

    if (egressRole.includes("not-egress")) {
      return "no";
    }

    return "unknown";
  }

  function mapScopeReleaseEvent(scope) {
    const fireRelease = String(scope?.fireRelease || "").toLowerCase();
    const powerLossIntent = String(scope?.powerLossIntent || "").toLowerCase();

    if (fireRelease === "yes") return "fire-alarm";
    if (powerLossIntent === "fail-safe") return "power-loss";
    if (fireRelease === "no") return "none";

    return "unknown";
  }

  function applyActiveScopeToInputs() {
    const activeScope = getActiveAccessScope();
    if (!activeScope) return false;

    setSelectValue(els.doorType, mapScopeDoorType(activeScope));
    setSelectValue(els.life, mapScopeLifePriority(activeScope));
    setSelectValue(els.powerLoss, "normal");
    setSelectValue(els.fire, String(activeScope.fireRelease || "").toLowerCase() === "yes" ? "yes" : "no");
    setSelectValue(els.threat, mapScopeThreat(activeScope));
    setSelectValue(els.hardwareType, mapScopeHardwareType(activeScope));
    setSelectValue(els.fireRated, mapScopeFireRated(activeScope));
    setSelectValue(els.egressControlled, mapScopeEgressControlled(activeScope));
    setSelectValue(els.releaseEvent, mapScopeReleaseEvent(activeScope));

    return true;
  }


  function buildFailSafeDecisionModel(base, model) {
    const actions = [];
    const flags = [];

    let recommendation = base.recommendation;
    let rationale = base.rationale;
    let risk = base.risk;
    let status = base.status;
    let confidence = base.confidence;
    const score = base.score;

    const hardware = model.hardwareType;
    const fireRated = model.fireRated;
    const egressControlled = model.egressControlled;
    const releaseEvent = model.releaseEvent;
    const standbyPower = model.standbyPower;
    const activeScope = model.activeScope;

    if (hardware === "maglock") {
      recommendation = "FAIL-SAFE";
      status = "AUTHORITY REVIEW";
      confidence = "MEDIUM";
      rationale = "Maglock arrangements normally release when power is removed, so the planning direction is fail-safe, but the egress release sequence must be documented and reviewed.";
      risk = "Improper release sequence or missing listed release controls can create an egress/code conflict.";
      flags.push("Maglock release arrangement");
      actions.push("Document sensor/request-to-exit, fire alarm, power-loss, and manual release behavior before continuing.");
    }

    if (hardware === "delayed-egress" || hardware === "special-locking") {
      recommendation = "CONDITIONAL";
      status = "AUTHORITY REVIEW";
      confidence = "LOW";
      rationale = "This is a special locking condition. It should not be treated as a normal fail-safe/fail-secure hardware choice.";
      risk = "Special locking may require code-specific features, signage, timing, release logic, and AHJ approval.";
      flags.push("Special locking condition");
      actions.push("Route this opening to the Special Locking / High-Security branch and confirm AHJ/code requirements.");
    }

    if (egressControlled === "yes" && (releaseEvent === "unknown" || releaseEvent === "none")) {
      recommendation = "CONDITIONAL";
      status = "RISK";
      confidence = "LOW";
      rationale = "The access system appears to affect egress, but the required release event is not documented.";
      risk = "Egress may not release under required emergency or power-loss conditions.";
      flags.push("Egress release not documented");
      actions.push("Define required release events before choosing reader, lock power, or panel capacity assumptions.");
    }

    if (fireRated === "yes" && hardware === "electric-strike" && recommendation === "FAIL-SAFE") {
      recommendation = "FAIL-SECURE";
      status = status === "RISK" ? "RISK" : "AUTHORITY REVIEW";
      confidence = "MEDIUM";
      rationale = "A fire-rated opening with an electric strike should be reviewed for positive latching/listing. The planning direction should not assume a fail-safe strike.";
      risk = "A fail-safe strike assumption can conflict with fire-door latching/listing expectations.";
      flags.push("Fire-rated electric strike review");
      actions.push("Confirm listed fire-rated electric strike behavior and positive-latching requirements before finalizing hardware.");
    }

    if (fireRated === "yes" && releaseEvent === "none") {
      status = status === "RISK" ? "RISK" : "WATCH";
      flags.push("Fire-rated opening without documented release event");
      actions.push("Confirm whether fire alarm or fire-protection release is required for this opening.");
    }

    if ([hardware, fireRated, egressControlled, releaseEvent, standbyPower].includes("unknown")) {
      if (status === "COMPLETE") status = "WATCH";
      flags.push("Incomplete hardware/release assumptions");
      actions.push("Replace unknown values before treating the fail-state decision as complete.");
    }

    if (standbyPower === "none" && recommendation === "FAIL-SECURE" && egressControlled === "yes") {
      status = "RISK";
      flags.push("Fail-secure egress with no standby power");
      actions.push("Confirm free mechanical egress or provide listed release/backup-power strategy before continuing.");
    }

    if (activeScope && activeScope.requiresAuthorityReview) {
      flags.push("Scope marked for authority review");
      actions.push("Carry this opening into Summary as an authority-review item. This scope review flag is separate from the local fail-state decision status.");
    }

    if (!actions.length) {
      actions.push("Carry this validated fail-state assumption into reader type and lock-power design.");
    }

    return {
      recommendation,
      rationale,
      risk,
      status,
      confidence,
      score,
      flags,
      actions
    };
  }

  function getStatusForRecommendation(recommendation, confidence) {
    if (recommendation === "CONDITIONAL") return "WATCH";
    if (confidence === "LOW") return "WATCH";
    return "COMPLETE";
  }


  function calculate() {
    const doorType = els.doorType.value;
    const life = els.life.value;
    const powerLoss = els.powerLoss.value;
    const fire = els.fire.value;
    const threat = els.threat.value;
    const hardwareType = valueFromSelect(els.hardwareType);
    const fireRated = valueFromSelect(els.fireRated);
    const egressControlled = valueFromSelect(els.egressControlled);
    const releaseEvent = valueFromSelect(els.releaseEvent);
    const standbyPower = valueFromSelect(els.standbyPower);
    const activeScope = getActiveAccessScope();

    let score = 0;

    if (doorType === "stairwell") score += 3;
    if (doorType === "interior") score += 1;
    if (doorType === "perimeter") score -= 1;
    if (doorType === "it") score -= 3;

    if (life === "high") score += 3;
    if (life === "med") score += 1;
    if (life === "low") score -= 2;

    if (powerLoss === "frequent") score += 2;
    if (powerLoss === "rare") score -= 1;

    if (fire === "yes") score += 1;

    if (threat === "high") score -= 3;
    if (threat === "med") score -= 1;

    if (hardwareType === "maglock") score += 2;
    if (hardwareType === "electric-strike" && fireRated === "yes") score -= 2;
    if (hardwareType === "electrified-panic-trim" || hardwareType === "electric-latch-retraction") score += 1;
    if (egressControlled === "yes") score += 2;
    if (releaseEvent === "power-loss" || releaseEvent === "fire-alarm" || releaseEvent === "sprinkler" || releaseEvent === "multiple") score += 1;
    if (standbyPower === "ups-generator") score -= 1;

    let recommendation;
    let rationale;
    let risk;

    if (score >= 2) {
      recommendation = "FAIL-SAFE";
      rationale = "Life safety, release behavior, or egress reliability outweigh the need to stay locked during power loss.";
      risk = "Exposure during outage or release conditions.";
    } else if (score <= -2) {
      recommendation = "FAIL-SECURE";
      rationale = "Security retention outweighs automatic release behavior under the stated assumptions.";
      risk = "Improper egress if not designed correctly.";
    } else {
      recommendation = "CONDITIONAL";
      rationale = "Balanced inputs require code-driven and operational decision.";
      risk = "Inconsistent behavior across doors.";
    }

    const baseConfidence = getConfidence(score);
    const baseStatus = getStatusForRecommendation(recommendation, baseConfidence);
    const decision = buildFailSafeDecisionModel({
      recommendation,
      rationale,
      risk,
      confidence: baseConfidence,
      status: baseStatus,
      score
    }, {
      hardwareType,
      fireRated,
      egressControlled,
      releaseEvent,
      standbyPower,
      activeScope
    });

    recommendation = decision.recommendation;
    rationale = decision.rationale;
    risk = decision.risk;

    const confidence = decision.confidence;
    const status = decision.status;
    const scoreMeaning = getScoreMeaning(score);
    const interpretation = buildInterpretation(recommendation);
    const guidance = buildGuidance(recommendation) + " " + decision.actions[0];

    const modelInputs = {
      doorTypeLabel: labelFromSelect(els.doorType),
      lifeLabel: labelFromSelect(els.life),
      powerLossLabel: labelFromSelect(els.powerLoss),
      fireLabel: labelFromSelect(els.fire),
      threatLabel: labelFromSelect(els.threat),
      hardwareTypeLabel: labelFromSelect(els.hardwareType),
      fireRatedLabel: labelFromSelect(els.fireRated),
      egressControlledLabel: labelFromSelect(els.egressControlled),
      releaseEventLabel: labelFromSelect(els.releaseEvent),
      standbyPowerLabel: labelFromSelect(els.standbyPower)
    };

    renderVisibleDecisionStatus({
      status,
      recommendation,
      confidence,
      rationale,
      risk,
      flags: decision.flags,
      actions: decision.actions
    });

    const recommendationReferences = buildFailSafeRecommendationReferences({
      status,
      recommendation,
      confidence,
      score,
      rationale,
      risk,
      decisionFlags: decision.flags,
      requiredActions: decision.actions,
      inputs: modelInputs
    });

    render([
      { label: "Recommendation", value: recommendation },
      { label: "Status", value: status },
      { label: "Scope Review Flag", value: activeScope && activeScope.requiresAuthorityReview ? "AUTHORITY REVIEW" : "No carried scope review" },
      { label: "Confidence", value: confidence },
      { label: "Why", value: rationale },
      { label: "Decision Flags", value: decision.flags.length ? decision.flags.join(" | ") : "No special flags" },
      { label: "Required Action", value: decision.actions.join(" ") },
      { label: "Score Meaning", value: scoreMeaning },
      { label: "Primary Risk", value: risk },
      { label: "Score", value: String(score) },
      { label: "Engineering Interpretation", value: interpretation },
      { label: "Actionable Guidance", value: guidance }
    ], {
      inputs: modelInputs,
      references: recommendationReferences,
      rationale,
      requiredAction: decision.actions[0] || ""
    });

    savePipelineResult({
      recommendation,
      score,
      confidence,
      status,
      doorType,
      life,
      powerLoss,
      fire,
      threat,
      hardwareType,
      fireRated,
      egressControlled,
      releaseEvent,
      standbyPower,
      decisionFlags: decision.flags,
      requiredActions: decision.actions,
      recommendationReferences,
      activeScope: activeScope ? {
        id: activeScope.id,
        name: activeScope.name,
        scopeType: activeScope.scopeType,
        planningPath: activeScope.planningPath,
        requiresAuthorityReview: activeScope.requiresAuthorityReview
      } : null
    });

    showContinue();

    const assistantPayload = {
      status,
      recommendation,
      confidence,
      score,
      rationale,
      scoreMeaning,
      risk,
      interpretation,
      guidance,
      decisionFlags: decision.flags,
      requiredActions: decision.actions,
      recommendationReferences,
      assistantProofPattern: "access-control-assistant-proof-visual-pattern",
      activeScope,
      inputs: modelInputs
    };

    currentReport = buildReportPayload({
      status,
      recommendation,
      confidence,
      score,
      activeScope,
      summary: recommendation + " is the current planning recommendation with " + confidence.toLowerCase() + " confidence. " + rationale,
      interpretation,
      inputs: modelInputs,
      outputs: getRenderedRows(),
      recommendationReferences,
      assistantProofPattern: "access-control-assistant-proof-visual-pattern"
    });

    publishFailSafeResultToScopeLedger({
      status,
      recommendation,
      confidence,
      score,
      summary: currentReport.summary,
      inputs: modelInputs,
      decisionFlags: decision.flags,
      requiredActions: decision.actions,
      recommendationReferences,
      activeScope
    });

    renderActiveScopeContext();
    renderLocalAssistant(assistantPayload);
    attachOutputShellExport();
    bindFailSafeLocalExportOverride();
    updateExportControls();
  }


  function resetAll() {
    els.doorType.value = "interior";
    els.life.value = "high";
    els.powerLoss.value = "normal";
    els.fire.value = "yes";
    els.threat.value = "low";
    if (els.hardwareType) els.hardwareType.value = "unknown";
    if (els.fireRated) els.fireRated.value = "unknown";
    if (els.egressControlled) els.egressControlled.value = "unknown";
    if (els.releaseEvent) els.releaseEvent.value = "unknown";
    if (els.standbyPower) els.standbyPower.value = "unknown";

    applyActiveScopeToInputs();

    currentReport = null;
    invalidatePipelineResult();
    clearResults("Run the evaluation to see results.");
    updateExportControls();
  }

  function bindEvents() {
    if (els.calc) {
      els.calc.addEventListener("click", calculate);
    }

    if (els.reset) {
      els.reset.addEventListener("click", resetAll);
    }

    [
      els.doorType,
      els.life,
      els.powerLoss,
      els.fire,
      els.threat,
      els.hardwareType,
      els.fireRated,
      els.egressControlled,
      els.releaseEvent,
      els.standbyPower
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("change", invalidate);
      el.addEventListener("input", invalidate);
    });

    if (els.continueBtn) {
      els.continueBtn.addEventListener("click", () => {
        window.location.href = "/tools/access-control/reader-type-selector/";
      });
    }

    [
      els.reportTitle,
      els.projectName,
      els.clientName,
      els.preparedBy,
      els.customNotes
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", () => {
        if (!currentReport) return;
        updateExportControls("Export details updated.");
      });
    });
  }

  function applyToolShellModules() {
    if (
      window.ScopedLabsToolShell &&
      typeof window.ScopedLabsToolShell.applyBackContinueShell === "function"
    ) {
      window.ScopedLabsToolShell.applyBackContinueShell({
        rowId: "accessControlFlowActions"
      });
    }
  }

  function init() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    resetAll();
    attachOutputShellExport();
    bindFailSafeLocalExportOverride();
    applyToolShellModules();
    renderActiveScopeContext();

    window.addEventListener("scopedlabs:access-control-scope-updated", () => {
      renderActiveScopeContext();
      if (!currentReport) applyActiveScopeToInputs();
    });

    setTimeout(() => {
      updateExportControls();
    }, 500);

    setTimeout(() => {
      updateExportControls();
    }, 1200);
  }

  bindEvents();
  init();
})();