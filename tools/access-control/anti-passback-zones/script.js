(() => {
  const CATEGORY = "access-control";
  const CATEGORY_LABEL = "Access Control";
  const TOOL = "anti-passback-zones";
  const TOOL_LABEL = "Anti-Passback Zones";
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:anti-passback-zones";
  const ACCESS_CONTROL_SUMMARY_KEY = "scopedlabs:pipeline:access-control:summary";
  const SUMMARY_CARRYOVER_KEY = "scopedlabs:pipeline:access-control:summary:anti-passback-zones";

  const $ = (id) => document.getElementById(id);

  let chart = null;
  let currentReport = null;
  let lastMetrics = null;

  const els = {
    entrances: $("entrances"),
    interiorAreas: $("interiorAreas"),
    floors: $("floors"),
    strategy: $("strategy"),
    type: $("type"),
    results: $("results"),
    calc: $("calc"),
    reset: $("reset"),
    chart: $("chart"),
    chartWrap: $("chartWrap"),
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
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
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
    return `
      <div class="result-row">
        <span class="result-label">${escapeHtml(label)}</span>
        <span class="result-value">${escapeHtml(value)}</span>
      </div>
    `;
  }

  function render(rows) {
    if (!els.results) return;
    els.results.innerHTML = rows.join("");
  }

  function showOutputCard() {
    if (els.outputCard) els.outputCard.hidden = false;
  }

  function hideOutputCard() {
    if (els.outputCard) els.outputCard.hidden = true;
    if (els.outputSchedule) els.outputSchedule.innerHTML = "";
  }

  function clearOutputShell() {
    hideOutputCard();

    if (window.ScopedLabsAccessControlOutputShell && typeof window.ScopedLabsAccessControlOutputShell.hideVisual === "function") {
      window.ScopedLabsAccessControlOutputShell.hideVisual({ card: els.outputCard, target: els.outputSchedule });
    }

    if (window.ScopedLabsLocalAssistant && typeof window.ScopedLabsLocalAssistant.clear === "function") {
      window.ScopedLabsLocalAssistant.clear(els.localAssistantMount);
    } else if (els.localAssistantMount) {
      els.localAssistantMount.hidden = true;
      els.localAssistantMount.innerHTML = "";
    }

    if (els.continueWrap) els.continueWrap.hidden = true;
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
    if (document.body?.dataset?.tier === "pro") return true;
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
      setExportStatus("Run the calculator to enable export.");
      return;
    }

    setExportStatus("Calculation ready. Open Export Report or Save Snapshot.");
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

  function getReportMeta() {
    const metaApi = window.ScopedLabsReportMetadata;
    const values = metaApi && typeof metaApi.read === "function" ? metaApi.read(document) : {};

    return {
      reportTitle: (values.reportTitle || "").trim() || "Anti-Passback Zone Assessment",
      projectName: (values.projectName || "").trim(),
      clientName: (values.clientName || "").trim(),
      preparedBy: (values.preparedBy || "").trim(),
      customNotes: (values.customNotes || "").trim()
    };
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

  function saveSnapshotToStorage(key, payload, limit = 25) {
    const existing = readSnapshots(key);

    existing.unshift({
      ...payload,
      savedAt: new Date().toISOString()
    });

    const trimmed = existing.slice(0, limit);
    writeSnapshots(key, trimmed);

    return trimmed.length;
  }

  function collectVisibleResults() {
    if (!els.results) return [];

    const rows = Array.from(els.results.querySelectorAll(".result-row"));

    return rows.map((rowEl) => {
      const label = rowEl.querySelector(".result-label")?.textContent?.trim() || "";
      const value = rowEl.querySelector(".result-value")?.textContent?.trim() || "";
      return { label, value };
    }).filter((item) => item.label && item.value);
  }

  function getSummaryFromResults(outputs) {
    const zones = outputs.find((x) => x.label === "Recommended Zones")?.value || "";
    const risk = outputs.find((x) => x.label === "Operational Risk")?.value || "";
    const mode = outputs.find((x) => x.label === "Recommended Enforcement Mode")?.value || "";

    return `Recommended APB design returns ${zones || "N/A"} zones with ${risk || "unknown"} operational risk and a suggested enforcement mode of ${mode || "N/A"}.`;
  }

  function getInterpretationFromResults(outputs) {
    return outputs.find((x) => x.label === "Engineering Interpretation")?.value || "";
  }

  function getStatusFromResults(outputs) {
    const risk = (outputs.find((x) => x.label === "Operational Risk")?.value || "").toUpperCase();

    if (risk === "HIGH") return "RISK";
    if (risk === "MODERATE") return "WATCH";
    return "HEALTHY";
  }

  function getAssumptions() {
    return [
      "Recommended zones are derived from perimeter count, interior segmentation, floor count, strategy, and APB enforcement type.",
      "This export reflects the current on-screen tool results at the time the report was opened or saved.",
      "Outputs are planning aids and do not replace controller-specific configuration validation.",
      "APB behavior should be validated against the selected access-control platform, reader placement, door hardware, and operational exception policy."
    ];
  }

  function getChartImage() {
    return "";
  }

  function getOutputShellImage() {
    return "";
  }


  // access-control-anti-passback-output-contract-021
  function selectedLabel(el) {
    if (!el) return "";
    const option = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
    return option ? option.textContent.trim() : String(el.value || "");
  }

  function scheduleCell(value) {
    return escapeHtml(value == null || value === "" ? "—" : value);
  }

  function antiPassbackStatusFromRisk(risk) {
    const value = String(risk || "").toUpperCase();
    if (value === "HIGH") return "RISK";
    if (value === "MODERATE") return "WATCH";
    return "HEALTHY";
  }

  function antiPassbackStatusChip(status) {
    const value = antiPassbackStatusFromRisk(status || "WATCH");
    return '<span class="apb-status-chip" data-status="' + scheduleCell(value) + '">' + scheduleCell(value) + '</span>';
  }

  function antiPassbackScheduleRow(group, metric, value, note) {
    return '<tr><td>' + scheduleCell(group) + '</td><td>' + scheduleCell(metric) + '</td><td>' + value + '</td><td>' + scheduleCell(note) + '</td></tr>';
  }

  function buildAntiPassbackActions(metrics = {}) {
    const recommendedActions = [];
    const status = antiPassbackStatusFromRisk(metrics.operationalRisk);

    if (status === "RISK") {
      recommendedActions.push("Reduce hard anti-passback scope or segment enforcement so lockout risk stays manageable.");
    } else if (status === "WATCH") {
      recommendedActions.push("Document APB reset, exception, visitor, and tailgating procedures before deployment.");
    } else {
      recommendedActions.push("Keep APB focused on the current perimeter/interior structure and review after expansion.");
    }

    if (metrics.type === "hard" && metrics.strategy === "strict") {
      recommendedActions.push("Avoid global hard APB until operators can tolerate false lockouts and manual resets.");
    }

    if (Number(metrics.pairedEntrances || 0) > 8) {
      recommendedActions.push("Validate IN/OUT reader pairing and door naming before commissioning.");
    }

    if (Number(metrics.floorZones || 0) > 0) {
      recommendedActions.push("Confirm floor-to-floor movement rules so APB zones do not trap authorized users.");
    }

    if (Number(metrics.interiorZones || 0) > 4) {
      recommendedActions.push("Keep interior APB segmentation limited to areas with clear security value.");
    }

    return recommendedActions;
  }

  function antiPassbackSummary(metrics = {}) {
    const status = antiPassbackStatusFromRisk(metrics.operationalRisk);
    if (status === "RISK") return "Anti-passback enforcement is heavy enough to create lockout and administrative risk if deployed globally.";
    if (status === "WATCH") return "Anti-passback design is workable, but enforcement scope and exception procedures should be documented before deployment.";
    return "Anti-passback design is manageable for the current scope and can stay focused on practical perimeter control.";
  }

  function renderAntiPassbackSchedule(metrics = {}) {
    const status = antiPassbackStatusFromRisk(metrics.operationalRisk);
    const actions = Array.isArray(metrics.recommendedActions) ? metrics.recommendedActions.join(" ") : "Review APB enforcement before final handoff.";

    const html = [
      '<div class="apb-decision-hero">',
      '<div><strong>' + scheduleCell(metrics.operationalRisk || "LOW") + ' Operational Risk</strong><span>' + scheduleCell(metrics.assistantSummary || antiPassbackSummary(metrics)) + '</span></div>',
      '<div>' + antiPassbackStatusChip(status) + '<span>Recommended zones: ' + scheduleCell(metrics.recommendedZones) + '</span></div>',
      '</div>',
      '<table class="apb-summary-table" data-apb-summary-table="true" data-export-table-title="Anti-Passback Decision Schedule"><thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead><tbody>',
      antiPassbackScheduleRow("Zone Structure", "Recommended Zones", scheduleCell(metrics.recommendedZones), "Total APB zones recommended from perimeter, interior, floor, and strategy inputs."),
      antiPassbackScheduleRow("Zone Structure", "Perimeter Zones", scheduleCell(metrics.perimeterZones), "Baseline APB separation across the controlled perimeter."),
      antiPassbackScheduleRow("Zone Structure", "Interior Zones", scheduleCell(metrics.interiorZones), metrics.interiorZones > 0 ? "Interior segmentation adds control but increases reset and exception handling." : "No major interior APB segmentation is modeled."),
      antiPassbackScheduleRow("Zone Structure", "Floor Segments", scheduleCell(metrics.floorZones), metrics.floorZones > 0 ? "Floor segmentation requires clear movement rules between levels." : "Floor segmentation is not a major driver in this run."),
      antiPassbackScheduleRow("Enforcement", "Paired Entrances", scheduleCell(metrics.pairedEntrances), "Estimated IN/OUT reader pairs that must stay logically aligned."),
      antiPassbackScheduleRow("Enforcement", "Recommended Enforcement Mode", scheduleCell(metrics.recommendedEnforcementMode), metrics.type === "hard" ? "Hard APB can deny access; exception and reset procedures are required." : "Soft APB reduces lockout risk and is useful for alerting and investigation."),
      antiPassbackScheduleRow("Calculated Load", "Complexity Index", scheduleCell(metrics.complexityIndex), Number(metrics.complexityIndex || 0) >= 9 ? "Complexity is high enough to require careful commissioning and documentation." : "Complexity is manageable for planning-level APB scope."),
      antiPassbackScheduleRow("Calculated Load", "Enforcement Exposure", scheduleCell(metrics.enforcementExposure), Number(metrics.enforcementExposure || 0) >= 9 ? "Enforcement exposure is elevated; avoid unnecessary hard APB scope." : "Enforcement exposure is manageable for the selected APB type."),
      antiPassbackScheduleRow("Decision", "Operational Risk", scheduleCell(metrics.operationalRisk), "Risk combines APB strategy, complexity, and enforcement type."),
      antiPassbackScheduleRow("Action", "Recommended Actions", scheduleCell(actions), "Practical APB simplification path for summary review and final handoff."),
      antiPassbackScheduleRow("Decision", "Status", antiPassbackStatusChip(status), status === "RISK" ? "Simplify or stage enforcement before deployment." : status === "WATCH" ? "Proceed with documented reset and exception handling." : "APB structure is usable for the current planning scope."),
      '</tbody></table>'
    ].join("");

    if (window.ScopedLabsAccessControlOutputShell && typeof window.ScopedLabsAccessControlOutputShell.showVisual === "function") {
      window.ScopedLabsAccessControlOutputShell.showVisual({ card: els.outputCard, target: els.outputSchedule, html });
    } else {
      if (els.outputSchedule) els.outputSchedule.innerHTML = html;
      showOutputCard();
    }

    return html;
  }

  function attachOutputShellExport() {
    const shell = window.ScopedLabsAccessControlOutputShell;
    if (!shell) return false;

    if (typeof shell.register === "function") {
      shell.register(TOOL, {
        getChartImage: getChartImage,
        getVisualHtml: () => els.outputSchedule ? els.outputSchedule.innerHTML : ""
      });
    }

    if (typeof shell.attachExportGetter === "function") {
      shell.attachExportGetter(TOOL, window.ScopedLabsExportConfig);
    }

    return true;
  }

  function setupBackContinue() {
    if (window.ScopedLabsToolShell && typeof window.ScopedLabsToolShell.applyBackContinueShell === "function") {
      window.ScopedLabsToolShell.applyBackContinueShell({ rowId: "next-step-row" });
    }
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.hidden = false;
  }

  function renderLocalAssistant(metrics = {}) {
    const adaptersApi = window.ScopedLabsAccessControlToolAssistantAdapters;
    const assistant = window.ScopedLabsLocalAssistant;
    if (!assistant || !els.localAssistantMount) return false;

    let model = metrics;
    const adapter = adaptersApi && typeof adaptersApi.getAdapter === "function" ? adaptersApi.getAdapter(TOOL) : null;
    if (adapter && typeof adapter.buildModel === "function") {
      model = adapter.buildModel(metrics);
    }

    return assistant.mount(els.localAssistantMount, model);
  }

  function publishAntiPassbackSummaryCarryover(payload) {
    try {
      const carryover = {
        category: CATEGORY,
        step: TOOL,
        tool: TOOL_LABEL,
        generatedAt: new Date().toISOString(),
        antiPassbackStatus: payload.antiPassbackStatus,
        recommendedZones: payload.recommendedZones,
        perimeterZones: payload.perimeterZones,
        interiorZones: payload.interiorZones,
        floorZones: payload.floorZones,
        pairedEntrances: payload.pairedEntrances,
        complexityIndex: payload.complexityIndex,
        enforcementExposure: payload.enforcementExposure,
        operationalRisk: payload.operationalRisk,
        recommendedEnforcementMode: payload.recommendedEnforcementMode,
        zoneStrategy: payload.zoneStrategy,
        apbType: payload.apbType,
        assistantSummary: payload.assistantSummary,
        recommendedActions: Array.isArray(payload.recommendedActions) ? payload.recommendedActions : []
      };

      let summary = {};
      try {
        summary = JSON.parse(localStorage.getItem(ACCESS_CONTROL_SUMMARY_KEY) || "{}");
      } catch {
        summary = {};
      }

      summary.antiPassbackZones = carryover;
      localStorage.setItem(SUMMARY_CARRYOVER_KEY, JSON.stringify(carryover));
      localStorage.setItem(ACCESS_CONTROL_SUMMARY_KEY, JSON.stringify(summary));
      return carryover;
    } catch (error) {
      console.warn("Anti-Passback summary carryover publish failed", error);
      return null;
    }
  }

  function buildCurrentReportPayload() {
    const outputs = collectVisibleResults();

    if (!outputs.length) return null;

    return {
      reportId: makeReportId("SL-ACC-APB"),
      generatedAt: new Date().toISOString(),
      category: CATEGORY_LABEL,
      categorySlug: CATEGORY,
      tool: TOOL_LABEL,
      toolSlug: TOOL,
      status: getStatusFromResults(outputs),
      summary: getSummaryFromResults(outputs),
      interpretation: getInterpretationFromResults(outputs),
      inputs: [
        { label: "Entrances / Perimeter Doors", value: String(els.entrances.value) },
        { label: "Interior Controlled Areas", value: String(els.interiorAreas.value) },
        { label: "Floors / Levels", value: String(els.floors.value) },
        { label: "Zone Strategy", value: selectedLabel(els.strategy) || els.strategy.value },
        { label: "APB Type", value: selectedLabel(els.type) || els.type.value }
      ],
      outputs,
      assumptions: getAssumptions(),
      chartImage: "",
      meta: getReportMeta()
    };
  }



  function getStrategyFactor(strategy) {
    if (strategy === "minimal") return 0.65;
    if (strategy === "balanced") return 1.0;
    return 1.35;
  }

  function getTypeFactor(type) {
    return type === "hard" ? 1.25 : 0.75;
  }

  function getRecommendedZones(entrances, interior, floors, strategy) {
    let perimeterZones = 2;
    let interiorZones = 0;
    let floorZones = 0;

    if (strategy === "minimal") {
      perimeterZones = 2;
      interiorZones = Math.round(interior * 0.15);
      floorZones = 0;
    } else if (strategy === "balanced") {
      perimeterZones = 2;
      interiorZones = Math.round(interior * 0.6);
      floorZones = floors > 1 ? Math.round((floors - 1) * 0.5) : 0;
    } else {
      perimeterZones = 2;
      interiorZones = interior;
      floorZones = Math.max(0, floors - 1);
    }

    const total = Math.max(2, perimeterZones + interiorZones + floorZones);

    return {
      total,
      perimeterZones,
      interiorZones,
      floorZones
    };
  }

  function getOperationalRisk(complexityIndex, type, strategy) {
    if (type === "hard" && (strategy === "strict" || complexityIndex >= 14)) {
      return "HIGH";
    }

    if (complexityIndex >= 9) {
      return "MODERATE";
    }

    return "LOW";
  }

  function getModeRecommendation(type, strategy, complexityIndex) {
    if (type === "hard" && complexityIndex >= 12) {
      return "Consider SOFT APB or narrower enforcement scope";
    }

    if (strategy === "minimal") {
      return "Perimeter-focused APB is likely enough";
    }

    if (strategy === "balanced") {
      return "Balanced APB with key interior checkpoints is appropriate";
    }

    return "Strict APB only makes sense if operations can tolerate enforcement friction";
  }

  function getInterpretation({
    zones,
    pairedEntrances,
    operationalRisk
  }) {
    if (operationalRisk === "HIGH") {
      return `This anti-passback design is enforcement-heavy. With ${zones} recommended zones and ${pairedEntrances} paired perimeter transitions, hard APB can easily create nuisance lockouts if reads are missed or circulation paths are inconsistent. Keep APB scope tighter unless you have a strong threat model and reliable bidirectional read coverage.`;
    }

    if (operationalRisk === "MODERATE") {
      return "This design is workable, but it needs discipline. The zone count and transition structure are high enough that operator training, exception handling, and reader placement quality will determine whether APB improves control or just adds friction.";
    }

    return "This anti-passback design stays relatively manageable. The recommended zone structure is restrained enough that APB can add useful control without becoming an administrative burden, especially if exemptions and emergency paths are planned cleanly.";
  }



  function calc() {
    const entrances = Math.max(0, Math.floor(n("entrances")));
    const interior = Math.max(0, Math.floor(n("interiorAreas")));
    const floors = Math.max(1, Math.floor(n("floors")));
    const strategy = els.strategy.value;
    const type = els.type.value;

    const zoneBreakdown = getRecommendedZones(entrances, interior, floors, strategy);
    const pairedFactor = type === "hard" ? 1.0 : 0.6;
    const pairedEntrances = Math.round(entrances * pairedFactor);

    const complexityIndexRaw =
      (zoneBreakdown.total * getStrategyFactor(strategy) * 0.9) +
      (pairedEntrances * 0.45) +
      ((floors - 1) * 0.8) +
      (interior * 0.25) +
      (getTypeFactor(type) * 1.2);

    const complexityIndex = Number(clamp(complexityIndexRaw, 1, 18).toFixed(1));

    const enforcementExposure = Number(
      clamp((pairedEntrances * getTypeFactor(type)) + (zoneBreakdown.total * 0.35), 1, 18).toFixed(1)
    );

    const operationalRisk = getOperationalRisk(complexityIndex, type, strategy);
    const modeRecommendation = getModeRecommendation(type, strategy, complexityIndex);

    let recommendedType = type.toUpperCase();

    if (type === "hard" && operationalRisk === "HIGH") {
      recommendedType = "SOFT or SELECTIVE HARD";
    } else if (type === "soft" && strategy === "minimal") {
      recommendedType = "SOFT";
    }

    const interpretation = getInterpretation({
      zones: zoneBreakdown.total,
      pairedEntrances,
      operationalRisk
    });

    const metrics = {
      entrances,
      interior,
      floors,
      strategy,
      type,
      strategyLabel: selectedLabel(els.strategy),
      typeLabel: selectedLabel(els.type),
      recommendedZones: zoneBreakdown.total,
      perimeterZones: zoneBreakdown.perimeterZones,
      interiorZones: zoneBreakdown.interiorZones,
      floorZones: zoneBreakdown.floorZones,
      pairedEntrances,
      complexityIndex,
      enforcementExposure,
      operationalRisk,
      antiPassbackStatus: antiPassbackStatusFromRisk(operationalRisk),
      recommendedEnforcementMode: recommendedType,
      modeRecommendation,
      interpretation
    };

    metrics.recommendedActions = buildAntiPassbackActions(metrics);
    metrics.assistantSummary = antiPassbackSummary(metrics);

    render([
      row("Recommended Zones", zoneBreakdown.total),
      row("Perimeter Zones", zoneBreakdown.perimeterZones),
      row("Interior Zones", zoneBreakdown.interiorZones),
      row("Floor Segments", zoneBreakdown.floorZones),
      row("Suggested Paired Entrances (IN/OUT)", pairedEntrances),
      row("APB Complexity Index", complexityIndex),
      row("Enforcement Exposure", enforcementExposure),
      row("Operational Risk", operationalRisk),
      row("Recommended Enforcement Mode", recommendedType),
      row("Design Guidance", modeRecommendation),
      row("Recommended Actions", metrics.recommendedActions.join(" | ")),
      row("Engineering Interpretation", interpretation)
    ]);

    lastMetrics = metrics;
    renderAntiPassbackSchedule(metrics);
    renderLocalAssistant(metrics);
    showContinue();

    currentReport = buildCurrentReportPayload();
    publishAntiPassbackSummaryCarryover(metrics);
    attachOutputShellExport();
    updateExportControls();
  }

  function resetResults(message = "Enter values and press Calculate.") {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">${escapeHtml(message)}</div>`;
    }

    clearOutputShell();
    lastMetrics = null;
    currentReport = null;
    updateExportControls();
  }

  function invalidate() {
    resetResults("Inputs changed. Press Calculate to refresh results.");
  }

  function reset() {
    if (els.entrances) els.entrances.value = 6;
    if (els.interiorAreas) els.interiorAreas.value = 4;
    if (els.floors) els.floors.value = 2;
    if (els.strategy) els.strategy.value = "minimal";
    if (els.type) els.type.value = "soft";

    resetResults("Enter values and press Calculate.");
  }

  if (els.calc) {
    els.calc.addEventListener("click", calc);
  }

  if (els.reset) {
    els.reset.addEventListener("click", reset);
  }

  [
    els.entrances,
    els.interiorAreas,
    els.floors,
    els.strategy,
    els.type
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

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

  if (els.chart) {
    els.chart.style.width = "100%";
    els.chart.style.height = "340px";

    if (els.chart.parentElement) {
      els.chart.parentElement.style.minHeight = "340px";
    }
  }

  resetResults();
})();