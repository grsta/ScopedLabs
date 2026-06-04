(() => {
  "use strict";

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
      status: core.activeScope.requiresAuthorityReview ? "AUTHORITY REVIEW" : core.status,
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

  function render(rows) {
    if (!els.results) return;

    els.results.innerHTML = rows.map((r) => `
      <div class="result-row">
        <span class="result-label">${escapeHtml(r.label)}</span>
        <span class="result-value">${escapeHtml(r.value)}</span>
      </div>
    `).join("");
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
      meta: getReportMeta()
    };
  }

  function buildReportHTML(payload) {
    const scopeRows = (payload.scopeContext || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td>${escapeHtml(item.value)}</td>
      </tr>
    `).join("");

    const inputRows = (payload.inputs || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td>${escapeHtml(item.value)}</td>
      </tr>
    `).join("");

    const outputRows = (payload.outputs || []).map((item) => `
      <tr>
        <td>${escapeHtml(item.label)}</td>
        <td>${escapeHtml(item.value)}</td>
      </tr>
    `).join("");

    const assumptions = (payload.assumptions || []).map((item) => `
      <li>${escapeHtml(item)}</li>
    `).join("");

    const projectDetails = [
      payload.meta?.projectName ? `<div><strong>Project:</strong> ${escapeHtml(payload.meta.projectName)}</div>` : "",
      payload.meta?.clientName ? `<div><strong>Client:</strong> ${escapeHtml(payload.meta.clientName)}</div>` : "",
      payload.meta?.preparedBy ? `<div><strong>Prepared By:</strong> ${escapeHtml(payload.meta.preparedBy)}</div>` : ""
    ].filter(Boolean).join("");

    const notesBlock = payload.meta?.customNotes
      ? `
      <section class="section">
        <h2>Custom Notes</h2>
        <div class="body-copy">${escapeHtml(payload.meta.customNotes).replace(/\n/g, "<br>")}</div>
      </section>`
      : "";

    const title = escapeHtml(payload.meta?.reportTitle || payload.tool || "ScopedLabs Report");

    const metaHtml = `
      <div><strong>Category:</strong> ${escapeHtml(payload.category || "")}</div>
      <div><strong>Tool:</strong> ${escapeHtml(payload.tool || "")}</div>
      <div><strong>Generated:</strong> ${escapeHtml(formatDateTime(payload.generatedAt || ""))}</div>
      <div><strong>Report ID:</strong> ${escapeHtml(payload.reportId || "")}</div>
    `;

    const bodyHtml = `
      <section class="section">
        <h2>Executive Summary</h2>
        <div class="summary">
          ${escapeHtml(payload.summary || "")}
          <div class="project-details">${projectDetails}</div>
        </div>
      </section>

      <section class="section">
        <h2>Active Scope Context</h2>
        <table class="report-table report-section-table">
          <tbody>${scopeRows || '<tr><td colspan="2">No active access scope was attached to this report.</td></tr>'}</tbody>
        </table>
      </section>

      <section class="section">
        <div class="report-grid">
          <div>
            <h2>Inputs</h2>
            <table class="report-table">
              <thead>
                <tr><th>Input</th><th>Value</th></tr>
              </thead>
              <tbody>${inputRows}</tbody>
            </table>
          </div>

          <div>
            <h2>Calculated Outputs</h2>
            <table class="report-table">
              <thead>
                <tr><th>Output</th><th>Value</th></tr>
              </thead>
              <tbody>${outputRows}</tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="section">
        <h2>Engineering Interpretation</h2>
        <div class="body-copy">${escapeHtml(payload.interpretation || "")}</div>
      </section>

      ${notesBlock}

      <section class="section">
        <h2>Assumptions</h2>
        <div class="body-copy">
          <ul class="assumptions">${assumptions}</ul>
        </div>
      </section>

      <section class="section">
        <h2>Disclaimer</h2>
        <div class="body-copy">
          ScopedLabs outputs are planning aids only and do not replace formal engineering review, code compliance review, AHJ review, site-specific validation, or manufacturer documentation.
        </div>
      </section>
    `;

    if (
      window.ScopedLabsAccessControlReportShell &&
      typeof window.ScopedLabsAccessControlReportShell.build === "function"
    ) {
      return window.ScopedLabsAccessControlReportShell.build({
        title,
        status: escapeHtml(payload.status || ""),
        metaHtml,
        bodyHtml
      });
    }

    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${title} ? ScopedLabs</title></head><body>${bodyHtml}</body></html>`;
  }


  function openReportWindow(payload) {
    try {
      const html = buildReportHTML(payload);
      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const win = window.open(url, "_blank");

      if (!win) return false;

      setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 10000);

      return true;
    } catch (err) {
      console.error("Export report open failed:", err);
      return false;
    }
  }

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

  function renderLocalAssistant(core) {
    const assistant = window.ScopedLabsLocalAssistant;
    const adapters = window.ScopedLabsAccessControlToolAssistantAdapters;
    const adapter = adapters && typeof adapters.getAdapter === "function" ? adapters.getAdapter(STEP) : null;

    if (!assistant || !adapter || !els.localAssistantMount || typeof adapter.buildModel !== "function") {
      return false;
    }

    return assistant.mount(els.localAssistantMount, adapter.buildModel(core));
  }

  function clearAnalysis() {
    if (window.ScopedLabsAnalyzer && els.analysis) {
      ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    } else if (els.analysis) {
      els.analysis.innerHTML = "";
      els.analysis.style.display = "none";
    }
  }

  function clearResults(message = "Run the evaluation to see results.") {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">${escapeHtml(message)}</div>`;
    }

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

    if (activeScope && activeScope.requiresAuthorityReview && status !== "RISK") {
      status = "AUTHORITY REVIEW";
      flags.push("Scope marked for authority review");
      actions.push("Carry this opening into Summary as an authority-review item.");
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

  function getStatusForRecommendation(recommendation, confidence, activeScope) {
    if (activeScope && activeScope.requiresAuthorityReview) return "AUTHORITY REVIEW";
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
    const baseStatus = getStatusForRecommendation(recommendation, baseConfidence, activeScope);
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

    render([
      { label: "Recommendation", value: recommendation },
      { label: "Status", value: status },
      { label: "Confidence", value: confidence },
      { label: "Why", value: rationale },
      { label: "Decision Flags", value: decision.flags.length ? decision.flags.join(" | ") : "No special flags" },
      { label: "Required Action", value: decision.actions.join(" ") },
      { label: "Score Meaning", value: scoreMeaning },
      { label: "Primary Risk", value: risk },
      { label: "Score", value: String(score) },
      { label: "Engineering Interpretation", value: interpretation },
      { label: "Actionable Guidance", value: guidance }
    ]);

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
      outputs: getRenderedRows()
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
      activeScope
    });

    renderActiveScopeContext();
    renderLocalAssistant(assistantPayload);
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
    applyToolShellModules();
    renderActiveScopeContext();

    window.addEventListener("scopedlabs:access-control-scope-updated", renderActiveScopeContext);

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