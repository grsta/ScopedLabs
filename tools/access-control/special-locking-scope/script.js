(() => {
  const CATEGORY = "access-control";
  const CATEGORY_LABEL = "Access Control";
  const TOOL = "special-locking-scope";
  const TOOL_LABEL = "Special Locking / High-Security Scope";
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:special-locking-scope";

  const $ = (id) => document.getElementById(id);

  let currentReport = null;
  let lastMetrics = null;

  const els = {
    openingCount: $("openingCount"),
    lockingType: $("lockingType"),
    egressImpact: $("egressImpact"),
    releaseLogic: $("releaseLogic"),
    authorityReview: $("authorityReview"),
    overridePlan: $("overridePlan"),
    results: $("results"),
    calc: $("calc"),
    reset: $("reset"),
    chart: $("chart"),
    chartWrap: $("chartWrap"),
    visualCard: $("specialLockingVisualCard"),
    scheduleCard: $("specialLockingScheduleCard"),
    schedule: $("specialLockingSchedule"),
    localAssistantMount: $("accessControlLocalAssistantMount"),
    flowActions: $("accessControlFlowActions"),
    reportActions: $("specialLockingReportActions"),
    reportTitle: $("reportTitle"),
    projectName: $("projectName"),
    clientName: $("clientName"),
    preparedBy: $("preparedBy"),
    customNotes: $("customNotes"),
    exportReport: $("exportReport"),
    saveSnapshot: $("saveSnapshot"),
    exportStatus: $("exportStatus")
  };

  function n(id) {
    const el = $(id);
    const value = el ? Number(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(value) ? value : 0;
  }

  function clamp(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.max(min, Math.min(max, num));
  }

  function selectedText(el) {
    return el && el.options ? el.options[el.selectedIndex]?.text || el.value : "";
  }

  function normalizeSlug(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function row(label, value) {
    return '<div class="result-row"><span class="result-label">' + escapeHtml(label) + '</span><span class="result-value">' + escapeHtml(value) + '</span></div>';
  }

  function render(rows) {
    if (!els.results) return;
    els.results.innerHTML = rows.join("");
  }

  function setExportStatus(message = "") {
    if (els.exportStatus) els.exportStatus.textContent = message;
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

  function hasStoredAuth() {
    try {
      return Object.keys(localStorage).some((key) => {
        if (!key.startsWith("sb-")) return false;
        const rawText = localStorage.getItem(key);
        if (!rawText) return false;
        const raw = JSON.parse(rawText);
        return Boolean(raw?.access_token || raw?.currentSession?.access_token || raw?.session?.access_token || raw?.user?.aud === "authenticated");
      });
    } catch {
      return false;
    }
  }

  function valueContainsCategory(value, category) {
    const target = normalizeSlug(category);
    if (value == null) return false;

    if (typeof value === "string") return normalizeSlug(value).includes(target);

    if (Array.isArray(value)) {
      return value.some((item) => valueContainsCategory(item, target));
    }

    if (typeof value === "object") {
      return Object.entries(value).some(([key, val]) => {
        const k = normalizeSlug(key);
        if (k === target && (val === true || val === "true" || val === 1 || val === "1")) return true;
        if (["category", "category_slug", "categorySlug", "slug", "id", "name"].includes(key) && normalizeSlug(val) === target) return true;
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
          } else if (parsed && typeof parsed === "object") {
            Object.entries(parsed).forEach(([key, value]) => {
              if (value === true || value === "true" || value === 1 || value === "1") found.add(normalizeSlug(key));
              if (typeof value === "string") found.add(normalizeSlug(value));
            });
          }
        } catch {
          direct.split(",").map(normalizeSlug).filter(Boolean).forEach((x) => found.add(x));
        }
      }

      Object.keys(localStorage).forEach((key) => {
        const lowerKey = normalizeSlug(key);
        if (!lowerKey.includes("unlock") && !lowerKey.includes("entitlement") && !lowerKey.includes("category")) return;

        const raw = localStorage.getItem(key);
        if (!raw) return;

        if (normalizeSlug(raw).includes(CATEGORY)) found.add(CATEGORY);

        try {
          if (valueContainsCategory(JSON.parse(raw), CATEGORY)) found.add(CATEGORY);
        } catch {}
      });
    } catch {}

    return Array.from(found);
  }

  function hasExportAccess() {
    return hasStoredAuth() && getUnlockedCategories().includes(CATEGORY);
  }

  function updateExportControls(message) {
    const ready = !!currentReport;
    const unlocked = hasExportAccess();

    setExportEnabled(ready && unlocked);

    if (message !== undefined) {
      setExportStatus(message);
      return;
    }

    if (!unlocked) {
      setExportStatus("Export is available with Access Control category unlock.");
      return;
    }

    if (!ready) {
      setExportStatus("Run the calculator to enable export.");
      return;
    }

    setExportStatus("Calculation ready. Open Export Report or Save Snapshot.");
  }

  function collectVisibleResults() {
    if (!els.results) return [];
    return Array.from(els.results.querySelectorAll(".result-row")).map((rowEl) => {
      const label = rowEl.querySelector(".result-label")?.textContent?.trim() || "";
      const value = rowEl.querySelector(".result-value")?.textContent?.trim() || "";
      return { label, value };
    }).filter((item) => item.label && item.value);
  }

  function getReportMeta() {
    return {
      reportTitle: (els.reportTitle?.value || "").trim() || "Special Locking / High-Security Scope Assessment",
      projectName: (els.projectName?.value || "").trim(),
      clientName: (els.clientName?.value || "").trim(),
      preparedBy: (els.preparedBy?.value || "").trim(),
      customNotes: (els.customNotes?.value || "").trim()
    };
  }

  function makeReportId(prefix = "SL-ACC-SL") {
    const stamp = new Date().toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
    return prefix + "-" + stamp;
  }

  function getStatusFromResults(outputs) {
    const status = (outputs.find((item) => item.label === "Authority Status")?.value || "").toUpperCase();
    if (status === "RISK") return "RISK";
    if (status === "WATCH") return "WATCH";
    return "HEALTHY";
  }

  function getSummaryFromResults(outputs) {
    const openings = outputs.find((item) => item.label === "Flagged Openings")?.value || "N/A";
    const status = outputs.find((item) => item.label === "Authority Status")?.value || "unknown";
    const score = outputs.find((item) => item.label === "Risk Score")?.value || "N/A";
    return "Special locking scope flags " + openings + " opening(s) with " + status + " authority-review status and a risk score of " + score + ".";
  }

  function getInterpretationFromResults(outputs) {
    return outputs.find((item) => item.label === "Engineering Interpretation")?.value || "";
  }

  function getAssumptions() {
    return [
      "Special locking review is based on opening count, locking condition, egress impact, release logic, authority review status, and override planning.",
      "This output is a planning aid for identifying coordination and authority-review pressure.",
      "Final legality, release behavior, signage, emergency operation, and inspection acceptance must be validated with the AHJ, project code team, and selected hardware/platform."
    ];
  }

  function planningVisuals() {
    return window.ScopedLabsAccessControlPlanningVisuals || null;
  }

  function outputShell() {
    return window.ScopedLabsAccessControlOutputShell || null;
  }

  function attachOutputShellExport() {
    const shell = outputShell();

    if (shell && typeof shell.register === "function") {
      shell.register(TOOL, { getChartImage: getExportChartImage });
    }

    if (shell && typeof shell.attachExportGetter === "function") {
      shell.attachExportGetter(TOOL, window.ScopedLabsExportConfig);
      return true;
    }

    if (window.ScopedLabsExportConfig) {
      window.ScopedLabsExportConfig.getChartImage = getExportChartImage;
      return true;
    }

    return false;
  }

  function placeSpecialLockingReportActions() {
    const mount = document.getElementById("reportMetadataMount");
    const actions = els.reportActions;
    if (!mount || !actions) return false;

    const details = mount.querySelector(".sl-report-meta") || mount.querySelector("details") || mount;
    if (actions.parentElement !== details) details.appendChild(actions);
    return true;
  }

  function applyShellModules() {
    const shell = window.ScopedLabsToolShell;
    if (shell && typeof shell.applyBackContinueShell === "function") {
      shell.applyBackContinueShell({ rowId: "accessControlFlowActions" });
    }
  }

  function clearOutputVisual() {
    const shell = outputShell();

    if (shell && typeof shell.hideVisual === "function") {
      return shell.hideVisual({ card: els.visualCard, wrap: els.chartWrap, target: els.chart });
    }

    if (els.chart) els.chart.innerHTML = "";
    if (els.chartWrap) els.chartWrap.hidden = true;
    if (els.visualCard) els.visualCard.hidden = true;
    return true;
  }

  function renderOutputVisual(metrics) {
    const visuals = planningVisuals();

    if (visuals && typeof visuals.renderSpecialLocking === "function") {
      return visuals.renderSpecialLocking({
        card: els.visualCard,
        wrap: els.chartWrap,
        target: els.chart,
        metrics
      });
    }

    return false;
  }

  function getSpecialLockingVisualImage(metrics, options = {}) {
    const visuals = planningVisuals();
    if (!metrics || !visuals || typeof visuals.buildSpecialLockingSvg !== "function") return "";

    const svg = visuals.buildSpecialLockingSvg(metrics, Object.assign({ exportMode: true }, options));
    if (typeof visuals.svgToDataUri === "function") return visuals.svgToDataUri(svg);

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  }

  function getChartImage() {
    const shell = outputShell();
    if (shell && typeof shell.getChartImage === "function") {
      const image = shell.getChartImage(TOOL);
      if (image) return image;
    }

    return getExportChartImage();
  }

  function getExportChartImage() {
    return getSpecialLockingVisualImage(lastMetrics);
  }

  function clearSpecialLockingSchedule() {
    if (els.schedule) els.schedule.innerHTML = "";
    if (els.scheduleCard) els.scheduleCard.hidden = true;
  }

  function renderSpecialLockingSchedule(metrics) {
    const schedule = window.ScopedLabsAccessControlDecisionSchedule;
    if (!schedule || typeof schedule.render !== "function" || !els.schedule) return false;

    const rows = [
      { group: "Scope", metric: "Flagged Openings", value: metrics.openingCount, note: "Openings requiring special locking or high-security review." },
      { group: "Scope", metric: "Locking Condition", value: metrics.lockingTypeLabel, note: "Selected locking or security condition." },
      { group: "Life Safety", metric: "Egress Impact", value: metrics.egressImpactLabel, note: "Whether the condition affects the egress path." },
      { group: "Life Safety", metric: "Release Logic", value: metrics.releaseLogicLabel, note: "Fire alarm, emergency release, or power-loss release coordination status." },
      { group: "Authority", metric: "Authority Review", value: metrics.authorityReviewLabel, note: "AHJ/code review expectation." },
      { group: "Operations", metric: "Override Plan", value: metrics.overridePlanLabel, note: metrics.guidance },
      { group: "Pressure", metric: "Risk Score", value: metrics.riskScore, note: metrics.interpretation }
    ];

    schedule.render({
      card: els.scheduleCard,
      wrap: els.schedule,
      target: els.schedule,
      title: "Special Locking Decision Schedule",
      summary: "Specialty-branch schedule for special locking, egress impact, release coordination, and authority-review pressure.",
      status: metrics.status,
      statusDetail: metrics.riskScore + " risk score",
      interpretation: metrics.interpretation,
      exportTableTitle: "Special Locking Decision Schedule",
      tableDataAttr: 'data-special-locking-summary="true" data-access-control-decision-schedule="true"',
      rows
    });

    if (els.scheduleCard) els.scheduleCard.hidden = false;
    return true;
  }

  function clearLocalAssistant() {
    if (window.ScopedLabsLocalAssistant && els.localAssistantMount) {
      window.ScopedLabsLocalAssistant.clear(els.localAssistantMount);
      return true;
    }

    if (els.localAssistantMount) {
      els.localAssistantMount.innerHTML = "";
      els.localAssistantMount.hidden = true;
    }

    return false;
  }

  function renderLocalAssistant(metrics) {
    const assistant = window.ScopedLabsLocalAssistant;
    const adapters = window.ScopedLabsAccessControlToolAssistantAdapters;
    const adapter = adapters && typeof adapters.getAdapter === "function" ? adapters.getAdapter(TOOL) : null;

    if (!assistant || !adapter || !els.localAssistantMount || typeof adapter.buildModel !== "function") return false;

    return assistant.mount(els.localAssistantMount, adapter.buildModel(metrics));
  }

  function publishSpecialLockingSummaryContribution(metrics) {
    if (!metrics) return false;

    try {
      const key = "scopedlabs:access-control:summary-contributions:v1";
      const raw = localStorage.getItem(key);
      const ledger = raw ? JSON.parse(raw) : {};
      const tools = ledger && typeof ledger === "object" && ledger.tools && typeof ledger.tools === "object" ? ledger.tools : {};

      tools[TOOL] = {
        category: CATEGORY,
        toolSlug: TOOL,
        toolLabel: TOOL_LABEL,
        contributionType: "specialty-branch",
        summaryGroup: "Specialty / What-if Branches",
        status: metrics.status,
        summary: getSummaryFromResults(collectVisibleResults()),
        interpretation: metrics.interpretation,
        updatedAt: new Date().toISOString(),
        metrics: {
          openingCount: metrics.openingCount,
          lockingType: metrics.lockingTypeLabel,
          egressImpact: metrics.egressImpactLabel,
          releaseLogic: metrics.releaseLogicLabel,
          authorityReview: metrics.authorityReviewLabel,
          overridePlan: metrics.overridePlanLabel,
          riskScore: metrics.riskScore
        }
      };

      localStorage.setItem(key, JSON.stringify({ ...ledger, category: CATEGORY, tools }));
      return true;
    } catch {
      return false;
    }
  }

  function buildCurrentReportPayload() {
    const outputs = collectVisibleResults();
    if (!outputs.length) return null;

    return {
      reportId: makeReportId(),
      generatedAt: new Date().toISOString(),
      category: CATEGORY_LABEL,
      categorySlug: CATEGORY,
      tool: TOOL_LABEL,
      toolSlug: TOOL,
      status: getStatusFromResults(outputs),
      summary: getSummaryFromResults(outputs),
      interpretation: getInterpretationFromResults(outputs),
      inputs: [
        { label: "Special Locking Openings", value: String(els.openingCount?.value || "") },
        { label: "Locking / Security Condition", value: selectedText(els.lockingType) },
        { label: "Egress Path Impact", value: selectedText(els.egressImpact) },
        { label: "Fire Alarm / Emergency Release", value: selectedText(els.releaseLogic) },
        { label: "Authority Review Status", value: selectedText(els.authorityReview) },
        { label: "Monitoring / Override Plan", value: selectedText(els.overridePlan) }
      ],
      outputs,
      assumptions: getAssumptions(),
      chartImage: getExportChartImage(),
      meta: getReportMeta()
    };
  }

  function riskWeights(values) {
    let score = 0;

    score += clamp(values.openingCount, 0, 20) * 3;

    const lockingWeights = {
      "maglock": 18,
      "delayed-egress": 32,
      "controlled-egress": 42,
      "security-interlock": 52,
      "high-security-room": 36
    };

    score += lockingWeights[values.lockingType] || 20;

    if (values.egressImpact === "yes") score += 22;
    else if (values.egressImpact === "unknown") score += 16;

    if (values.releaseLogic === "needed") score += 20;
    else if (values.releaseLogic === "not-applicable") score += 6;

    if (values.authorityReview === "required") score += 22;
    else if (values.authorityReview === "likely") score += 12;

    if (values.overridePlan === "missing") score += 20;
    else if (values.overridePlan === "partial") score += 10;

    return Math.round(clamp(score, 0, 100));
  }

  function classify(score) {
    if (score >= 75) return "RISK";
    if (score >= 45) return "WATCH";
    return "HEALTHY";
  }

  function guidanceFor(status, values) {
    if (status === "RISK") {
      return "Treat this as an authority-review item before procurement. Confirm code path, release sequence, signage, manual override, fire interface, and owner operating procedure.";
    }

    if (status === "WATCH") {
      return "Coordinate release behavior and operating procedure before final design. The condition may be acceptable, but it should be documented and reviewed.";
    }

    return "Current inputs suggest manageable special-locking pressure. Keep release behavior and override procedure documented in the design record.";
  }

  function interpretationFor(status, values) {
    const pieces = [];

    if (values.egressImpact === "yes") pieces.push("egress path impact");
    if (values.releaseLogic === "needed") pieces.push("release sequence coordination");
    if (values.authorityReview === "required") pieces.push("AHJ/code review");
    if (values.overridePlan !== "documented") pieces.push("operator override procedure");

    const drivers = pieces.length ? pieces.join(", ") : "no major unresolved authority drivers";

    return "Primary review drivers: " + drivers + ". Special locking must be coordinated as a life-safety and operations item, not only as an access-control hardware choice.";
  }

  function calc() {
    const values = {
      openingCount: Math.max(0, Math.round(n("openingCount"))),
      lockingType: els.lockingType?.value || "maglock",
      egressImpact: els.egressImpact?.value || "yes",
      releaseLogic: els.releaseLogic?.value || "needed",
      authorityReview: els.authorityReview?.value || "required",
      overridePlan: els.overridePlan?.value || "partial"
    };

    const riskScore = riskWeights(values);
    const status = classify(riskScore);
    const guidance = guidanceFor(status, values);
    const interpretation = interpretationFor(status, values);

    const metrics = {
      ...values,
      lockingTypeLabel: selectedText(els.lockingType),
      egressImpactLabel: selectedText(els.egressImpact),
      releaseLogicLabel: selectedText(els.releaseLogic),
      authorityReviewLabel: selectedText(els.authorityReview),
      overridePlanLabel: selectedText(els.overridePlan),
      riskScore,
      status,
      authorityLevel: status,
      guidance,
      interpretation
    };

    lastMetrics = metrics;

    render([
      row("Flagged Openings", metrics.openingCount),
      row("Authority Status", status),
      row("Risk Score", riskScore),
      row("Locking Condition", metrics.lockingTypeLabel),
      row("Egress Impact", metrics.egressImpactLabel),
      row("Release Logic", metrics.releaseLogicLabel),
      row("Authority Review", metrics.authorityReviewLabel),
      row("Override Plan", metrics.overridePlanLabel),
      row("Engineering Interpretation", interpretation),
      row("Recommended Action", guidance)
    ]);

    renderOutputVisual(metrics);
    renderSpecialLockingSchedule(metrics);
    renderLocalAssistant(metrics);
    publishSpecialLockingSummaryContribution(metrics);

    currentReport = buildCurrentReportPayload();

    if (window.ScopedLabsExportConfig && typeof window.ScopedLabsExportConfig === "object") {
      window.ScopedLabsExportConfig.getCurrentPayload = () => currentReport;
      window.ScopedLabsExportConfig.buildPayload = () => currentReport;
    }

    updateExportControls();
  }

  function reset() {
    if (els.openingCount) els.openingCount.value = "2";
    if (els.lockingType) els.lockingType.value = "maglock";
    if (els.egressImpact) els.egressImpact.value = "yes";
    if (els.releaseLogic) els.releaseLogic.value = "needed";
    if (els.authorityReview) els.authorityReview.value = "required";
    if (els.overridePlan) els.overridePlan.value = "partial";

    lastMetrics = null;
    currentReport = null;

    render(['<div class="muted">Run calculation.</div>']);
    clearOutputVisual();
    clearSpecialLockingSchedule();
    clearLocalAssistant();
    updateExportControls();
  }

  function saveSnapshot() {
    if (!currentReport) return;

    try {
      const raw = localStorage.getItem(REPORT_SAVE_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const snapshots = Array.isArray(list) ? list : [];
      snapshots.unshift({ ...currentReport, savedAt: new Date().toISOString() });
      localStorage.setItem(REPORT_SAVE_KEY, JSON.stringify(snapshots.slice(0, 25)));
      setExportStatus("Snapshot saved locally.");
    } catch {
      setExportStatus("Snapshot could not be saved in this browser.");
    }
  }

  function handleInputChange() {
    currentReport = null;
    updateExportControls("Inputs changed. Run the calculator again.");
  }

  placeSpecialLockingReportActions();
  applyShellModules();
  attachOutputShellExport();
  reset();

  [els.openingCount, els.lockingType, els.egressImpact, els.releaseLogic, els.authorityReview, els.overridePlan].forEach((el) => {
    if (el) el.addEventListener("input", handleInputChange);
    if (el) el.addEventListener("change", handleInputChange);
  });

  if (els.calc) els.calc.addEventListener("click", calc);
  if (els.reset) els.reset.addEventListener("click", reset);
  if (els.saveSnapshot) els.saveSnapshot.addEventListener("click", saveSnapshot);

  [els.reportTitle, els.projectName, els.clientName, els.preparedBy, els.customNotes].forEach((el) => {
    if (el) el.addEventListener("input", () => {
      if (!currentReport) return;
      currentReport = buildCurrentReportPayload();
      updateExportControls("Report details updated.");
    });
  });

  window.ScopedLabsSpecialLockingScope = Object.freeze({
    calc,
    reset,
    getChartImage,
    getExportChartImage,
    getCurrentReport: () => currentReport
  });
})();
