(() => {
  const CATEGORY = "access-control";
  const STEP = "access-level-sizing";
  const LANE = "v1";
  const PREVIOUS_STEP = "panel-capacity";
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:access-level-sizing";
  const ACCESS_CONTROL_SUMMARY_KEY = "scopedlabs:pipeline:access-control:summary";
  const SUMMARY_CARRYOVER_KEY = "scopedlabs:pipeline:access-control:summary:access-level-sizing";

  const FLOW_KEYS = {
    "reader-type-selector": "scopedlabs:pipeline:access-control:reader-type-selector",
    "fail-safe-fail-secure": "scopedlabs:pipeline:access-control:fail-safe-fail-secure",
    "lock-power-budget": "scopedlabs:pipeline:access-control:lock-power-budget",
    "panel-capacity": "scopedlabs:pipeline:access-control:panel-capacity",
    "access-level-sizing": "scopedlabs:pipeline:access-control:access-level-sizing"
  };

  const $ = (id) => document.getElementById(id);

  let currentReport = null;

  const els = {
    roles: $("roles"),
    areas: $("areas"),
    schedules: $("schedules"),
    doorGroups: $("doorGroups"),
    complexity: $("complexity"),
    accessModelType: $("accessModelType"),
    turnoverPressure: $("turnoverPressure"),
    exceptionGroups: $("exceptionGroups"),
    restrictedZones: $("restrictedZones"),
    scheduleChangePressure: $("scheduleChangePressure"),
    adminGovernance: $("adminGovernance"),
    results: $("results"),
    analysis: $("analysis-copy"),
    scheduleCard: $("accessLevelScheduleCard"),
    chartWrap: $("chartWrap"),
    accessLevelSchedule: $("accessLevelSchedule"),
    flowNote: $("flow-note"),
    completeWrap: $("complete-wrap"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    calc: $("calc"),
    reset: $("reset"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard"),

    exportReport: $("exportReport"),
    saveSnapshot: $("saveSnapshot"),
    exportStatus: $("exportStatus"),
    localAssistantMount: $("accessControlLocalAssistantMount")
  };


  // access-control-access-level-output-contract-021
  function outputShell() {
    return window.ScopedLabsAccessControlOutputShell || null;
  }

  function readReportMetadata() {
    if (window.ScopedLabsReportMetadata && typeof window.ScopedLabsReportMetadata.read === "function") {
      return window.ScopedLabsReportMetadata.read(document);
    }

    return {};
  }

  function getMetricValue(label) {
    if (!currentReport || !Array.isArray(currentReport.outputs)) return "";
    const target = String(label || "").trim().toLowerCase();
    const row = currentReport.outputs.find((item) => String(item?.label || "").trim().toLowerCase() === target);
    return row ? String(row.value || "") : "";
  }

  function accessLevelStatusChip(status) {
    const clean = String(status || "WATCH").toUpperCase();
    const tone = clean.includes("RISK") ? "is-risk" : clean.includes("WATCH") ? "is-watch" : "is-healthy";
    return '<span class="access-level-status-chip ' + tone + '">' + escapeHtml(clean) + '</span>';
  }

  function scheduleCell(value) {
    return escapeHtml(value);
  }

  function accessLevelScheduleRow(group, metric, value, note) {
    return '<tr><td>' + scheduleCell(group) + '</td><td>' + scheduleCell(metric) + '</td><td>' + value + '</td><td>' + scheduleCell(note) + '</td></tr>';
  }


  // access-control-access-level-v2-summary-carryover-022
  function selectedLabel(el) {
    if (!el) return "";
    const option = el.options && el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null;
    return option ? option.textContent.trim() : String(el.value || "");
  }

  function getAccessModelPressure(value) {
    const accessModelPressure = value === "area-based" ? 1.04 : value === "hybrid" ? 1.12 : value === "exception-heavy" ? 1.26 : 1;
    return accessModelPressure;
  }

  function getTurnoverPressureFactor(value) {
    const turnoverPressureFactor = value === "high" ? 1.16 : value === "low" ? 0.96 : 1;
    return turnoverPressureFactor;
  }

  function getExceptionPressure(count) {
    const exceptionPressure = 1 + Math.min(10, Math.max(0, Number(count) || 0)) * 0.045;
    return exceptionPressure;
  }

  function getRestrictedZonePressure(value) {
    const restrictedZonePressure = value === "high" ? 1.2 : value === "moderate" ? 1.09 : 1;
    return restrictedZonePressure;
  }

  function getScheduleChangePressureFactor(value) {
    const scheduleChangePressureFactor = value === "frequent" ? 1.14 : value === "stable" ? 0.96 : 1;
    return scheduleChangePressureFactor;
  }

  function getGovernanceRelief(value) {
    const governanceRelief = value === "weak" ? 1.15 : value === "strong" ? 0.92 : 1;
    return governanceRelief;
  }

  function readAccessLevelV2Context() {
    return {
      accessModelType: els.accessModelType ? els.accessModelType.value : "role-based",
      accessModelTypeLabel: selectedLabel(els.accessModelType) || "Role-Based / Standard",
      turnoverPressure: els.turnoverPressure ? els.turnoverPressure.value : "normal",
      turnoverPressureLabel: selectedLabel(els.turnoverPressure) || "Normal",
      exceptionGroups: Math.max(0, num(els.exceptionGroups ? els.exceptionGroups.value : 0)),
      restrictedZones: els.restrictedZones ? els.restrictedZones.value : "low",
      restrictedZonesLabel: selectedLabel(els.restrictedZones) || "Low",
      scheduleChangePressure: els.scheduleChangePressure ? els.scheduleChangePressure.value : "normal",
      scheduleChangePressureLabel: selectedLabel(els.scheduleChangePressure) || "Normal",
      adminGovernance: els.adminGovernance ? els.adminGovernance.value : "standard",
      adminGovernanceLabel: selectedLabel(els.adminGovernance) || "Standard"
    };
  }

  function buildAccessLevelActions(metrics = {}) {
    const recommendedActions = [];

    if (metrics.status === "RISK") {
      recommendedActions.push("Reduce role-area combinations before the model becomes harder to audit or support.");
    } else if (metrics.status === "WATCH") {
      recommendedActions.push("Document naming, role ownership, and change-control rules before adding more access levels.");
    } else {
      recommendedActions.push("Keep the access-level naming structure consistent as the system grows.");
    }

    if (metrics.exceptionGroups > 2 || metrics.accessModelType === "exception-heavy") {
      recommendedActions.push("Convert repeated exception groups into governed roles instead of one-off access levels.");
    }

    if (metrics.restrictedZones === "high") {
      recommendedActions.push("Separate restricted-zone permissions from general employee access to reduce accidental over-assignment.");
    }

    if (metrics.scheduleChangePressure === "frequent" || metrics.schedules > 5) {
      recommendedActions.push("Consolidate schedules and use a small set of approved schedule templates.");
    }

    if (metrics.adminGovernance === "weak") {
      recommendedActions.push("Assign an owner for access-level naming, approval, and periodic review before handoff.");
    }

    if (!recommendedActions.length) {
      recommendedActions.push("Maintain current access-level structure and review after future area or role expansion.");
    }

    return recommendedActions;
  }

  function publishAccessLevelSummaryCarryover(payload) {
    try {
      const carryover = {
        category: CATEGORY,
        step: STEP,
        tool: "Access Level Sizing",
        generatedAt: new Date().toISOString(),
        accessLevelStatus: payload.status,
        totalAccessLevels: payload.totalAccessLevels,
        recommendedLimit: payload.recommendedLimit,
        overshoot: payload.overshoot,
        adminLoadIndex: payload.adminLoadIndex,
        scalingPressure: payload.scalingPressure,
        roles: payload.roles,
        areas: payload.areas,
        schedules: payload.schedules,
        groups: payload.groups,
        complexityProfile: payload.complexityProfile,
        accessModelType: payload.accessModelType,
        turnoverPressure: payload.turnoverPressure,
        exceptionGroups: payload.exceptionGroups,
        restrictedZones: payload.restrictedZones,
        scheduleChangePressure: payload.scheduleChangePressure,
        adminGovernance: payload.adminGovernance,
        assistantSummary: payload.assistantSummary,
        recommendedActions: Array.isArray(payload.recommendedActions) ? payload.recommendedActions : []
      };

      localStorage.setItem(SUMMARY_CARRYOVER_KEY, JSON.stringify(carryover));
      localStorage.setItem(ACCESS_CONTROL_SUMMARY_KEY, JSON.stringify({ accessLevelSizing: carryover }));
      return carryover;
    } catch (error) {
      console.warn("Access Level summary carryover publish failed", error);
      return null;
    }
  }


  // access-control-access-level-label-polish-023
  function accessModelNote(value) {
    if (value === "exception-heavy") return "Exception-heavy models create review debt quickly; repeated one-offs should become governed roles.";
    if (value === "hybrid") return "Hybrid role and area logic is workable when ownership and naming rules are documented.";
    if (value === "area-based") return "Area-based access can stay clean if zones are grouped consistently and not duplicated by role.";
    return "Role-based structure is the easiest model to govern when roles remain reusable and clearly named.";
  }

  function turnoverNote(value) {
    if (value === "high") return "High turnover increases add/remove workload and makes stale assignments more likely.";
    if (value === "low") return "Low turnover reduces day-to-day administration pressure.";
    return "Normal turnover is manageable if access reviews and naming rules stay consistent.";
  }

  function exceptionNote(count) {
    const n = Number(count) || 0;
    if (n <= 0) return "No exception groups are modeled; keep the standard role structure clean.";
    if (n <= 2) return "A small number of exceptions is manageable if each one has an owner and review date.";
    if (n <= 5) return "Exception groups are becoming a management driver; convert repeated exceptions into standard roles.";
    return "Exception count is high; simplify the model before exceptions become the real access structure.";
  }

  function restrictedZoneNote(value) {
    if (value === "high") return "Many sensitive areas need cleaner separation, stronger approval rules, and periodic review.";
    if (value === "moderate") return "Moderate restricted-zone pressure should be isolated from broad employee access.";
    return "Restricted-zone pressure is low; keep the model simple unless sensitive areas are added.";
  }

  function scheduleChangeNote(value, schedules) {
    const count = Number(schedules) || 0;
    if (value === "frequent") return "Frequent schedule changes can multiply access levels; use approved schedule templates.";
    if (value === "stable" && count <= 3) return "Schedule pressure is stable; avoid creating special schedules unless required.";
    if (count > 5) return "Schedule count is high enough to affect administration even without frequent changes.";
    return "Schedule pressure is normal; keep schedule names and reuse rules documented.";
  }

  function governanceNote(value) {
    if (value === "weak") return "Weak governance amplifies complexity; assign naming, approval, and review ownership.";
    if (value === "strong") return "Strong governance reduces complexity risk because changes are named, approved, and reviewed.";
    return "Standard governance is workable if naming and change-control rules are kept consistent.";
  }

  function accessStructureLoadNote(value) {
    const n = Number(value) || 0;
    if (n >= 10) return "Access structure load is high; simplify roles, areas, exceptions, or schedules before expansion.";
    if (n >= 6) return "Access structure load is moderate; watch growth and keep permission groups reusable.";
    return "Access structure load is manageable for the current role and area count.";
  }

  function adminMaintenanceLoadNote(value) {
    const n = Number(value) || 0;
    if (n >= 10) return "Maintenance load is high; daily administration will depend on clean ownership and review discipline.";
    if (n >= 6) return "Maintenance load is moderate; keep schedules, exceptions, and naming rules under control.";
    return "Maintenance load is manageable with normal access administration practices.";
  }

  function overshootNote(metrics = {}) {
    const overshoot = Number(metrics.overshoot) || 0;
    const remaining = Math.max(0, Number(metrics.recommendedLimit || 0) - Number(metrics.total || 0));

    if (overshoot > 0) return "Design exceeds the recommended limit; reduce complexity before final handoff.";
    return "Design remains " + remaining + " levels under the recommended limit.";
  }

  function buildAccessLevelScheduleHtml(metrics = {}) {
    const status = String(metrics.status || "WATCH").toUpperCase();
    const riskLabel = metrics.riskLabel || "Complexity pending";
    const threshold = metrics.thresholdMessage || "Run analysis to evaluate threshold pressure.";
    const actions = Array.isArray(metrics.recommendedActions) ? metrics.recommendedActions.join(" ") : "Review access-level structure before handoff.";

    const rows = [
      accessLevelScheduleRow("Structure", "Access Levels", scheduleCell(metrics.total), "Modeled permission structure after base and context factors."),
      accessLevelScheduleRow("Structure", "Role-Area Combinations", scheduleCell(metrics.combinations), "Base role-to-area matrix before schedules, groups, and context factors are applied."),
      accessLevelScheduleRow("Inputs", "Roles / Areas", scheduleCell(metrics.roles + " / " + metrics.areas), "Primary access model dimensions."),
      accessLevelScheduleRow("Inputs", "Schedules / Door Groups", scheduleCell(metrics.schedules + " / " + metrics.groups), scheduleChangeNote(metrics.scheduleChangePressure, metrics.schedules)),
      accessLevelScheduleRow("Context Factors", "Access Model", scheduleCell(metrics.accessModelTypeLabel), accessModelNote(metrics.accessModelType)),
      accessLevelScheduleRow("Context Factors", "Turnover", scheduleCell(metrics.turnoverPressureLabel), turnoverNote(metrics.turnoverPressure)),
      accessLevelScheduleRow("Context Factors", "Exceptions", scheduleCell(metrics.exceptionGroups), exceptionNote(metrics.exceptionGroups)),
      accessLevelScheduleRow("Context Factors", "Restricted Zones", scheduleCell(metrics.restrictedZonesLabel), restrictedZoneNote(metrics.restrictedZones)),
      accessLevelScheduleRow("Context Factors", "Governance", scheduleCell(metrics.adminGovernanceLabel), governanceNote(metrics.adminGovernance)),
      accessLevelScheduleRow("Calculated Load", "Access Structure Load", scheduleCell(Number(metrics.scalingPressure || 0).toFixed(1)), accessStructureLoadNote(metrics.scalingPressure)),
      accessLevelScheduleRow("Calculated Load", "Admin Maintenance Load", scheduleCell(Number(metrics.adminLoadIndex || 0).toFixed(1)), adminMaintenanceLoadNote(metrics.adminLoadIndex)),
      accessLevelScheduleRow("Limit", "Recommended Limit", scheduleCell(metrics.recommendedLimit), "Recommended access-level ceiling for the selected complexity profile."),
      accessLevelScheduleRow("Limit", "Overshoot", scheduleCell(metrics.overshoot), overshootNote(metrics)),
      accessLevelScheduleRow("Action", "Recommended Actions", scheduleCell(actions), "Practical simplification path for summary review and final handoff."),
      accessLevelScheduleRow("Decision", "Status", accessLevelStatusChip(status), status === "RISK" ? "Simplify access model before scale increases." : status === "WATCH" ? "Watch naming, grouping, schedule, and exception growth before expansion." : "Structure is usable for the final Access Control handoff.")
    ];

    return [
      '<div class="access-level-decision-hero">',
      '<div><strong>' + scheduleCell(riskLabel) + '</strong><span>' + scheduleCell(threshold) + '</span></div>',
      '<div>' + accessLevelStatusChip(status) + '<span>Recommended limit: ' + scheduleCell(metrics.recommendedLimit) + '</span></div>',
      '</div>',
      '<table class="access-level-summary-table" data-access-level-summary-table="true"><thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead><tbody>',
      rows.join(""),
      '</tbody></table>'
    ].join("");
  }

  function renderAccessLevelSchedule(metrics) {
    const html = buildAccessLevelScheduleHtml(metrics);
    const shell = outputShell();

    if (shell && typeof shell.showVisual === "function") {
      return shell.showVisual({
        card: els.scheduleCard,
        wrap: els.chartWrap,
        target: els.accessLevelSchedule,
        html
      });
    }

    if (els.accessLevelSchedule) els.accessLevelSchedule.innerHTML = html;
    if (els.chartWrap) els.chartWrap.hidden = false;
    if (els.scheduleCard) els.scheduleCard.hidden = false;
    return true;
  }

  function clearAccessLevelSchedule() {
    const shell = outputShell();

    if (shell && typeof shell.hideVisual === "function") {
      return shell.hideVisual({
        card: els.scheduleCard,
        wrap: els.chartWrap,
        target: els.accessLevelSchedule
      });
    }

    if (els.accessLevelSchedule) els.accessLevelSchedule.innerHTML = "";
    if (els.chartWrap) els.chartWrap.hidden = true;
    if (els.scheduleCard) els.scheduleCard.hidden = true;
    return true;
  }

  function svgDataUri(svg) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(String(svg || ""));
  }

  function buildAccessLevelVisualSvg() {
    if (!currentReport) return "";

    const status = String(currentReport.status || "WATCH").toUpperCase();
    const accessLevels = getMetricValue("Access Levels") || "0";
    const combinations = getMetricValue("Role-Area Combinations") || "0";
    const adminLoad = getMetricValue("Admin Maintenance Load") || "0";
    const limit = getMetricValue("Recommended Limit") || "0";
    const riskLabel = getMetricValue("Complexity") || "Complexity pending";
    const threshold = getMetricValue("Threshold Check") || "Threshold pending";
    const color = status.includes("RISK") ? "#b42318" : status.includes("WATCH") ? "#b7791f" : "#1f9d57";

    return '<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="360" viewBox="0 0 1100 360"><rect width="1100" height="360" rx="22" fill="#ffffff"/><rect x="36" y="34" width="1028" height="292" rx="18" fill="#f8fbf8" stroke="#b8cabe"/><text x="70" y="78" fill="#101715" font-size="24" font-weight="800" font-family="Inter,Arial,sans-serif">Access Level Complexity Schedule</text><rect x="870" y="54" width="150" height="38" rx="10" fill="#ffffff" stroke="' + color + '"/><text x="894" y="79" fill="' + color + '" font-size="14" font-weight="800" font-family="Inter,Arial,sans-serif">' + escapeHtml(status) + '</text><text x="70" y="134" fill="#1f9d57" font-size="20" font-weight="800" font-family="Inter,Arial,sans-serif">' + escapeHtml(riskLabel) + '</text><text x="70" y="178" fill="#54615d" font-size="16" font-family="Inter,Arial,sans-serif">Access Levels: ' + escapeHtml(accessLevels) + ' / Recommended Limit: ' + escapeHtml(limit) + '</text><text x="70" y="218" fill="#54615d" font-size="16" font-family="Inter,Arial,sans-serif">Role-Area Combinations: ' + escapeHtml(combinations) + ' / Admin Load Index: ' + escapeHtml(adminLoad) + '</text><path d="M70 254 H1016" stroke="#dce8e1"/><text x="70" y="290" fill="#54615d" font-size="14" font-family="Inter,Arial,sans-serif">' + escapeHtml(threshold) + '</text></svg>';
  }

  function getAccessLevelVisualImage() {
    const svg = buildAccessLevelVisualSvg();
    return svg ? svgDataUri(svg) : "";
  }

  function attachOutputShellExport() {
    const shell = outputShell();
    if (!shell || typeof shell.register !== "function") return false;

    shell.register(STEP, {
      getChartImage: getAccessLevelVisualImage,
      getVisualHtml: () => els.accessLevelSchedule ? els.accessLevelSchedule.innerHTML : ""
    });

    if (typeof shell.attachExportGetter === "function") {
      shell.attachExportGetter(STEP, window.ScopedLabsExportConfig);
    }

    return true;
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

  function applyShellModules() {
    const shell = window.ScopedLabsToolShell;
    if (shell && typeof shell.applyBackContinueShell === "function") {
      shell.applyBackContinueShell({ rowId: "accessControlFlowActions" });
    }
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

  function unlockCategoryPage() {
    const category = normalizeSlug(document.body?.dataset?.category || CATEGORY);
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }

  function row(label, value) {
    return `
      <div class="result-row">
        <span class="result-label">${escapeHtml(label)}</span>
        <span class="result-value">${escapeHtml(value)}</span>
      </div>
    `;
  }

  function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

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

  function assumptionsForTool() {
    return [
      "Role and area counts are assumed to represent the active access model, not future edge-case scenarios only.",
      "Schedule and door-group inputs are treated as meaningful contributors to ongoing administrative complexity.",
      "This evaluation models structural overhead and maintainability, not controller hardware limits or credential capacity.",
      "Outputs are planning aids and should be paired with site-specific operational policy and administrative practice."
    ];
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
      setExportStatus("Run analysis to enable export.");
      return;
    }

    setExportStatus("Analysis ready. Open Export Report or Save Snapshot.");
  }

  function getReportMeta() {
    const meta = readReportMetadata();

    return {
      reportTitle: (meta.reportTitle || "").trim() || "Access Level Sizing Assessment",
      projectName: (meta.projectName || "").trim(),
      clientName: (meta.clientName || "").trim(),
      preparedBy: (meta.preparedBy || "").trim(),
      customNotes: (meta.customNotes || "").trim()
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
      reportId: makeReportId("SL-ACC-ALS"),
      generatedAt: new Date().toISOString(),
      category: "Access Control",
      categorySlug: CATEGORY,
      tool: "Access Level Sizing",
      toolSlug: STEP,
      status: core.status,
      summary: core.summary,
      interpretation: core.interpretation,
      inputs: [
        { label: "User Roles", value: String(core.inputs.roles) },
        { label: "Areas", value: String(core.inputs.areas) },
        { label: "Schedules", value: String(core.inputs.schedules) },
        { label: "Door Groups", value: String(core.inputs.doorGroups) },
        { label: "Complexity", value: core.inputs.complexityLabel },
        { label: "Access Model Type", value: core.inputs.accessModelTypeLabel },
        { label: "Turnover Pressure", value: core.inputs.turnoverPressureLabel },
        { label: "Exception Groups", value: String(core.inputs.exceptionGroups) },
        { label: "Restricted Zones", value: core.inputs.restrictedZonesLabel },
        { label: "Schedule Change Pressure", value: core.inputs.scheduleChangePressureLabel },
        { label: "Admin Governance", value: core.inputs.adminGovernanceLabel }
      ],
      outputs: [
        { label: "Access Levels", value: String(core.outputs.total) },
        { label: "Role-Area Combinations", value: String(core.outputs.combinations) },
        { label: "Access Structure Load", value: core.outputs.scalingPressure.toFixed(1) },
        { label: "Admin Maintenance Load", value: core.outputs.adminLoadIndex.toFixed(1) },
        { label: "V2 Pressure Factor", value: core.outputs.v2PressureFactor.toFixed(2) },
        { label: "Recommended Limit", value: String(core.outputs.recommendedLimit) },
        { label: "Complexity", value: core.outputs.riskLabel },
        { label: "Threshold Check", value: core.outputs.thresholdMessage },
        { label: "Overshoot", value: String(core.outputs.overshoot) },
        { label: "Recommended Actions", value: (core.outputs.recommendedActions || []).join(" | ") }
      ],
      assumptions: assumptionsForTool(),
      chartImage: getAccessLevelVisualImage(),
      meta: getReportMeta()
    };
  }

  function buildReportHTML(payload) {
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
        </section>
      `
      : "";

    const chartBlock = payload.chartImage
      ? `
        <section class="section">
          <h2>Chart Snapshot</h2>
          <div class="chart-wrap">
            <img src="${payload.chartImage}" alt="Access Level Sizing chart">
          </div>
        </section>
      `
      : "";

    const statusClass = String(payload.status || "").toLowerCase();

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(payload.meta?.reportTitle || payload.tool || "ScopedLabs Report")} • ScopedLabs</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    :root{
      --ink:#101715;
      --muted:#52615c;
      --line:#d7e2db;
      --soft:#f5f8f6;
      --accent:#1d8f55;
      --accent-soft:#eaf7f0;
      --watch:#a66d00;
      --watch-soft:#fff6df;
      --risk:#b42318;
      --risk-soft:#fff0ee;
    }
    *{box-sizing:border-box}
    html,body{margin:0;padding:0;background:#eef2ef;color:var(--ink);font-family:Inter, Arial, sans-serif}
    body{padding:28px}
    .page{
      max-width:980px;
      margin:0 auto;
      background:#fff;
      border:1px solid var(--line);
      box-shadow:0 18px 50px rgba(0,0,0,.08);
    }
    .toolbar{
      display:flex;
      justify-content:flex-end;
      gap:10px;
      padding:14px 18px;
      border-bottom:1px solid var(--line);
      background:#fbfcfb;
    }
    .toolbar button{
      appearance:none;
      border:1px solid #c9d8cf;
      background:#fff;
      color:var(--ink);
      border-radius:999px;
      padding:10px 14px;
      font-weight:700;
      cursor:pointer;
    }
    .toolbar button:hover{background:#f3f7f5}
    .report{padding:28px 30px 32px}
    .brand-row{
      display:flex;
      align-items:center;
      gap:12px;
      margin-bottom:10px;
    }
    .brand-row img{
      width:28px;
      height:28px;
      display:block;
    }
    .brand-name{
      font-size:1.15rem;
      font-weight:800;
      letter-spacing:.02em;
    }
    .tagline{
      color:var(--muted);
      font-size:.95rem;
      margin-bottom:18px;
    }
    .report-head{
      display:flex;
      justify-content:space-between;
      gap:18px;
      align-items:flex-start;
      border-top:1px solid var(--line);
      border-bottom:1px solid var(--line);
      padding:18px 0;
      margin-bottom:22px;
    }
    .report-title{
      font-size:1.7rem;
      line-height:1.15;
      margin:0 0 6px;
    }
    .report-meta{
      color:var(--muted);
      font-size:.95rem;
      line-height:1.6;
    }
    .status-pill{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:8px 12px;
      border-radius:999px;
      font-size:.82rem;
      font-weight:800;
      letter-spacing:.06em;
      text-transform:uppercase;
      border:1px solid transparent;
      white-space:nowrap;
    }
    .status-pill.healthy{
      color:var(--accent);
      background:var(--accent-soft);
      border-color:#c9ead7;
    }
    .status-pill.watch{
      color:var(--watch);
      background:var(--watch-soft);
      border-color:#f2dfad;
    }
    .status-pill.risk{
      color:var(--risk);
      background:var(--risk-soft);
      border-color:#f3c6c1;
    }
    .section{margin-top:24px}
    .section h2{
      margin:0 0 10px;
      font-size:1rem;
      letter-spacing:.02em;
      text-transform:uppercase;
    }
    .summary,
    .body-copy{
      border:1px solid var(--line);
      background:#fafcfb;
      border-radius:14px;
      padding:16px 18px;
      line-height:1.65;
    }
    .project-details{
      display:grid;
      gap:6px;
      margin-top:10px;
      color:var(--muted);
      font-size:.95rem;
    }
    .grid{
      display:grid;
      grid-template-columns:repeat(2,minmax(0,1fr));
      gap:18px;
    }
    table{
      width:100%;
      border-collapse:collapse;
      border:1px solid var(--line);
      border-radius:14px;
      overflow:hidden;
      font-size:.95rem;
    }
    th,td{
      padding:11px 12px;
      border-bottom:1px solid var(--line);
      vertical-align:top;
    }
    th{
      text-align:left;
      background:#f7faf8;
      font-size:.82rem;
      text-transform:uppercase;
      letter-spacing:.06em;
    }
    tr:last-child td{border-bottom:none}
    td:first-child{
      width:42%;
      color:var(--muted);
    }
    td:last-child{
      font-weight:700;
      text-align:left;
    }
    .assumptions{
      margin:0;
      padding-left:18px;
      line-height:1.7;
    }
    .chart-wrap{
      border:1px solid var(--line);
      border-radius:14px;
      background:#fff;
      padding:18px;
      text-align:center;
    }
    .chart-wrap img{
      max-width:100%;
      height:auto;
      display:inline-block;
    }
    .foot{
      margin-top:26px;
      padding-top:16px;
      border-top:1px solid var(--line);
      color:var(--muted);
      font-size:.9rem;
      line-height:1.7;
    }
    @media (max-width: 760px){
      body{padding:14px}
      .report{padding:20px}
      .report-head{flex-direction:column}
      .grid{grid-template-columns:1fr}
    }
    @media print{
      body{background:#fff;padding:0}
      .page{max-width:none;border:none;box-shadow:none}
      .toolbar{display:none !important}
      .report{padding:0}
    }
  </style>
</head>
<body>
  <div class="page">
    <div class="toolbar">
      <button type="button" onclick="window.print()">Print / Save PDF</button>
      <button type="button" onclick="window.close()">Close</button>
    </div>

    <div class="report">
      <div class="brand-row">
        <img src="https://scopedlabs.com/assets/favicon/favicon-32x32.png?v=1" alt="">
        <div class="brand-name">ScopedLabs</div>
      </div>
      <div class="tagline">Engineering · Analysis · Tools</div>

      <div class="report-head">
        <div>
          <h1 class="report-title">${escapeHtml(payload.meta?.reportTitle || payload.tool || "ScopedLabs Report")}</h1>
          <div class="report-meta">
            <div><strong>Category:</strong> ${escapeHtml(payload.category || "")}</div>
            <div><strong>Tool:</strong> ${escapeHtml(payload.tool || "")}</div>
            <div><strong>Generated:</strong> ${escapeHtml(formatDateTime(payload.generatedAt || ""))}</div>
            <div><strong>Report ID:</strong> ${escapeHtml(payload.reportId || "")}</div>
          </div>
        </div>
        <div class="status-pill ${statusClass}">${escapeHtml(payload.status || "")}</div>
      </div>

      <section class="section">
        <h2>Executive Summary</h2>
        <div class="summary">
          ${escapeHtml(payload.summary || "")}
          <div class="project-details">${projectDetails}</div>
        </div>
      </section>

      <section class="section">
        <div class="grid">
          <div>
            <h2>Inputs</h2>
            <table>
              <thead>
                <tr><th>Input</th><th>Value</th></tr>
              </thead>
              <tbody>${inputRows}</tbody>
            </table>
          </div>

          <div>
            <h2>Calculated Outputs</h2>
            <table>
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

      ${chartBlock}
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
          ScopedLabs outputs are planning aids only and do not replace formal engineering review, code compliance review, site-specific validation, manufacturer documentation, or platform policy review.
        </div>
      </section>

      <div class="foot">
        ScopedLabs Pro export preview for internal and client-facing documentation workflows.
      </div>
    </div>
  </div>
</body>
</html>`;
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

  function invalidate(message = "Inputs changed. Press Analyze to refresh results.") {
    clearAccessLevelSchedule();
    clearLocalAssistant();
    currentReport = null;

    if (els.completeWrap) els.completeWrap.style.display = "none";

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      flowKey: FLOW_KEYS[STEP],
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: message
    });

    loadFlow();
    updateExportControls();
  }

  function resetAll() {
    if (els.roles) els.roles.value = 6;
    if (els.areas) els.areas.value = 8;
    if (els.schedules) els.schedules.value = 4;
    if (els.doorGroups) els.doorGroups.value = 0;
    if (els.complexity) els.complexity.value = "normal";
    if (els.accessModelType) els.accessModelType.value = "role-based";
    if (els.turnoverPressure) els.turnoverPressure.value = "normal";
    if (els.exceptionGroups) els.exceptionGroups.value = 0;
    if (els.restrictedZones) els.restrictedZones.value = "low";
    if (els.scheduleChangePressure) els.scheduleChangePressure.value = "normal";
    if (els.adminGovernance) els.adminGovernance.value = "standard";

    invalidate("Run analysis.");
  }

  function loadFlow() {
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);

    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    let parsed = null;

    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    const d = parsed.data || {};
    const panels = num(d.panels);
    const expansions = num(d.expansions);
    const readers = num(d.readers);
    const powerBudget = num(d.totalPowerW || d.powerW);
    const panelCapacity = num(d.panelCapacity);
    const utilization = num(d.utilizationPct);

    const lines = [];

    if (panels) lines.push(`Panels: <strong>${escapeHtml(panels)}</strong>`);
    if (expansions || expansions === 0) lines.push(`Expansions: <strong>${escapeHtml(expansions)}</strong>`);
    if (readers) lines.push(`Readers: <strong>${escapeHtml(readers)}</strong>`);
    if (panelCapacity) lines.push(`Panel Capacity: <strong>${escapeHtml(panelCapacity)}</strong> readers`);
    if (utilization) lines.push(`Utilization: <strong>${escapeHtml(utilization.toFixed(1))}%</strong>`);
    if (powerBudget) lines.push(`Estimated Controller Load: <strong>${escapeHtml(powerBudget.toFixed(1))} W</strong>`);

    if (!lines.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      ${lines.join(" | ")}
      <br><br>
      This final step evaluates whether the access structure itself will stay manageable or turn into long-term administrative overhead.
    `;
  }

  function getComplexityFactor(value) {
    if (value === "simple") return 0.8;
    if (value === "complex") return 1.3;
    return 1;
  }

  function getRecommendedLimit(complexity) {
    if (complexity === "simple") return 80;
    if (complexity === "complex") return 120;
    return 100;
  }

  function getRisk(total) {
    if (total > 150) {
      return {
        label: "High Complexity",
        status: "RISK",
        summary:
          "The modeled access structure is likely to become administratively heavy and difficult to maintain cleanly as the system grows.",
        insight:
          "Access levels are likely to become difficult to manage and prone to assignment errors. Role abstraction, door grouping, and schedule consolidation should be considered before deployment grows further."
      };
    }

    if (total > 80) {
      return {
        label: "Moderate Complexity",
        status: "WATCH",
        summary:
          "The modeled structure is still workable, but it is trending toward higher administrative overhead and should be watched before future expansion.",
        insight:
          "The structure is still workable, but administration will become more fragile over time unless naming, grouping, and permission inheritance are handled consistently."
      };
    }

    return {
      label: "Healthy",
      status: "HEALTHY",
      summary:
        "The current access structure appears likely to scale cleanly with manageable administrative overhead.",
      insight:
        "The structure should scale cleanly with minimal administrative overhead. Current complexity remains within a range that is typically manageable for day-to-day operations."
    };
  }



  function calc() {
    const roles = num(els.roles.value);
    const areas = num(els.areas.value);
    const schedules = num(els.schedules.value);
    const groups = num(els.doorGroups.value);
    const complexity = els.complexity.value;
    const v2 = readAccessLevelV2Context();

    if (roles <= 0 || areas <= 0 || schedules < 0 || groups < 0 || v2.exceptionGroups < 0) {
      invalidate("Enter valid positive values, then run analysis.");
      return;
    }

    const base = roles * areas;
    const complexityFactor = getComplexityFactor(complexity);
    const schedulePenalty = 1 + schedules * 0.1;
    const groupPenalty = 1 + groups * 0.05;
    const baseTotal = Math.round(base * schedulePenalty * groupPenalty * complexityFactor);

    const accessModelPressure = getAccessModelPressure(v2.accessModelType);
    const turnoverPressureFactor = getTurnoverPressureFactor(v2.turnoverPressure);
    const exceptionPressure = getExceptionPressure(v2.exceptionGroups);
    const restrictedZonePressure = getRestrictedZonePressure(v2.restrictedZones);
    const scheduleChangePressureFactor = getScheduleChangePressureFactor(v2.scheduleChangePressure);
    const governanceRelief = getGovernanceRelief(v2.adminGovernance);
    const v2PressureFactor = accessModelPressure * turnoverPressureFactor * exceptionPressure * restrictedZonePressure * scheduleChangePressureFactor * governanceRelief;

    const total = Math.round(baseTotal * v2PressureFactor);
    const combinations = base;
    const scalingPressure = total / Math.max(1, roles + areas);
    const recommendedLimit = getRecommendedLimit(complexity);
    const overshoot = Math.max(0, total - recommendedLimit);
    const adminLoadIndex = Number(((schedules * 0.8) + (groups * 0.6) + (roles * 0.4) + (v2.exceptionGroups * 0.7) + (v2.restrictedZones === "high" ? 3 : v2.restrictedZones === "moderate" ? 1.5 : 0) + (v2.turnoverPressure === "high" ? 2.5 : 0) + (v2.adminGovernance === "weak" ? 2.5 : v2.adminGovernance === "strong" ? -1 : 0)).toFixed(1));

    const risk = getRisk(total);

    let thresholdMessage = "Structure remains below the recommended complexity limit.";

    if (total > recommendedLimit) {
      thresholdMessage = "Design exceeds the recommended complexity limit by " + overshoot + " levels.";
    } else {
      thresholdMessage = "Design remains " + (recommendedLimit - total) + " levels under the recommended limit.";
    }

    const actionBasis = {
      ...v2,
      roles,
      areas,
      schedules,
      groups,
      complexity,
      total,
      combinations,
      scalingPressure,
      adminLoadIndex,
      recommendedLimit,
      overshoot,
      riskLabel: risk.label,
      thresholdMessage,
      status: risk.status,
      accessModelPressure,
      turnoverPressureFactor,
      exceptionPressure,
      restrictedZonePressure,
      scheduleChangePressureFactor,
      governanceRelief,
      v2PressureFactor
    };

    const recommendedActions = buildAccessLevelActions(actionBasis);
    const assistantSummary = risk.summary + " " + thresholdMessage;

    els.results.innerHTML = [
      row("Access Levels", total),
      row("Role-Area Combinations", combinations),
      row("Access Structure Load", scalingPressure.toFixed(1)),
      row("Admin Maintenance Load", adminLoadIndex.toFixed(1)),
      row("V2 Pressure Factor", v2PressureFactor.toFixed(2)),
      row("Recommended Limit", recommendedLimit),
      row("Complexity", risk.label),
      row("Threshold Check", thresholdMessage),
      row("Access Model", v2.accessModelTypeLabel),
      row("Turnover", v2.turnoverPressureLabel),
      row("Exceptions", v2.exceptionGroups),
      row("Restricted Zones", v2.restrictedZonesLabel),
      row("Governance", v2.adminGovernanceLabel),
      row("Recommended Actions", recommendedActions.join(" | ")),
      row("Engineering Insight", risk.insight)
    ].join("");

    const scheduleMetrics = {
      ...actionBasis,
      ...v2,
      complexityLabel: complexity.charAt(0).toUpperCase() + complexity.slice(1),
      recommendedActions
    };

    renderAccessLevelSchedule(scheduleMetrics);

    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);

    if (els.completeWrap) els.completeWrap.style.display = "block";

    const flowData = {
      total,
      risk: risk.label,
      combinations,
      scalingPressure,
      adminLoadIndex,
      recommendedLimit,
      overshoot,
      accessLevelStatus: risk.status,
      totalAccessLevels: total,
      accessModelType: v2.accessModelType,
      turnoverPressure: v2.turnoverPressure,
      exceptionGroups: v2.exceptionGroups,
      restrictedZones: v2.restrictedZones,
      scheduleChangePressure: v2.scheduleChangePressure,
      adminGovernance: v2.adminGovernance,
      assistantSummary,
      recommendedActions
    };

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      data: flowData
    });

    currentReport = buildReportPayload({
      status: risk.status,
      summary: risk.summary,
      interpretation: risk.insight,
      inputs: {
        roles,
        areas,
        schedules,
        doorGroups: groups,
        complexityLabel: complexity.charAt(0).toUpperCase() + complexity.slice(1),
        accessModelTypeLabel: v2.accessModelTypeLabel,
        turnoverPressureLabel: v2.turnoverPressureLabel,
        exceptionGroups: v2.exceptionGroups,
        restrictedZonesLabel: v2.restrictedZonesLabel,
        scheduleChangePressureLabel: v2.scheduleChangePressureLabel,
        adminGovernanceLabel: v2.adminGovernanceLabel
      },
      outputs: {
        total,
        combinations,
        scalingPressure,
        adminLoadIndex,
        v2PressureFactor,
        recommendedLimit,
        riskLabel: risk.label,
        thresholdMessage,
        overshoot,
        recommendedActions
      }
    });

    publishAccessLevelSummaryCarryover({
      status: risk.status,
      accessLevelStatus: risk.status,
      totalAccessLevels: total,
      recommendedLimit,
      overshoot,
      adminLoadIndex,
      scalingPressure,
      roles,
      areas,
      schedules,
      groups,
      complexityProfile: complexity,
      accessModelType: v2.accessModelType,
      turnoverPressure: v2.turnoverPressure,
      exceptionGroups: v2.exceptionGroups,
      restrictedZones: v2.restrictedZones,
      scheduleChangePressure: v2.scheduleChangePressure,
      adminGovernance: v2.adminGovernance,
      assistantSummary,
      recommendedActions
    });

    attachOutputShellExport();
    renderLocalAssistant({
      status: risk.status,
      riskLabel: risk.label,
      total,
      combinations,
      scalingPressure,
      adminLoadIndex,
      recommendedLimit,
      overshoot,
      thresholdMessage,
      insight: risk.insight,
      summary: risk.summary,
      roles,
      areas,
      schedules,
      groups,
      complexity: complexity.charAt(0).toUpperCase() + complexity.slice(1),
      accessModelType: v2.accessModelTypeLabel,
      turnoverPressure: v2.turnoverPressureLabel,
      exceptionGroups: v2.exceptionGroups,
      restrictedZones: v2.restrictedZonesLabel,
      scheduleChangePressure: v2.scheduleChangePressureLabel,
      adminGovernance: v2.adminGovernanceLabel,
      assistantSummary,
      recommendedActions
    });
    updateExportControls();
  }

  if (els.calc) {
    els.calc.addEventListener("click", calc);
  }

  if (els.reset) {
    els.reset.addEventListener("click", resetAll);
  }

  [
    els.roles,
    els.areas,
    els.schedules,
    els.doorGroups,
    els.complexity,
    els.accessModelType,
    els.turnoverPressure,
    els.exceptionGroups,
    els.restrictedZones,
    els.scheduleChangePressure,
    els.adminGovernance
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", () => invalidate());
    el.addEventListener("change", () => invalidate());
  });
  document.addEventListener("scopedlabs:report-metadata-saved", () => {
    if (!currentReport) return;
    updateExportControls("Export details updated.");
  });


  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    clearAccessLevelSchedule();
    attachOutputShellExport();
    applyShellModules();
    unlockCategoryPage();

    setTimeout(() => {
      unlockCategoryPage();
      updateExportControls();
    }, 400);

    setTimeout(() => {
      unlockCategoryPage();
      updateExportControls();
    }, 1200);

    loadFlow();
    updateExportControls();
  });
})();
