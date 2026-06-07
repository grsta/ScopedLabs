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
    exceptionMode: $("exceptionMode"),
    syncOpeningExceptions: $("syncOpeningExceptions"),
    openingExceptionsWrap: $("openingExceptionsWrap"),
    scopeSeedContextCard: $("scopeSeedContextCard"),
    scopeSeedContextTitle: $("scopeSeedContextTitle"),
    scopeSeedContextDescription: $("scopeSeedContextDescription"),
    scopeSeedContextGrid: $("scopeSeedContextGrid"),
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
      "Special locking review is based on opening count, locking condition, egress impact, release logic, authority review status, override planning, and optional per-opening exceptions.",
      "This output is a planning aid for identifying coordination and authority-review pressure.",
      "Final legality, release behavior, signage, emergency operation, and inspection acceptance must be validated with the AHJ, project code team, and selected hardware/platform."
    ];
  }


  const GROUP_DEFAULT = "__group__";

  const SPECIAL_LOCKING_OPTIONS = Object.freeze({
    lockingType: Object.freeze([
      { value: "maglock", label: "Maglock / electromagnetic lock" },
      { value: "delayed-egress", label: "Delayed egress locking" },
      { value: "controlled-egress", label: "Controlled egress / special locking" },
      { value: "security-interlock", label: "Security interlock / mantrap" },
      { value: "high-security-room", label: "High-security room / secured suite" }
    ]),
    egressImpact: Object.freeze([
      { value: "yes", label: "Yes - affects egress path" },
      { value: "no", label: "No - security-side only" },
      { value: "unknown", label: "Unknown / requires review" }
    ]),
    releaseLogic: Object.freeze([
      { value: "confirmed", label: "Confirmed release sequence" },
      { value: "needed", label: "Release sequence needs coordination" },
      { value: "not-applicable", label: "Not applicable / no release tie-in expected" }
    ]),
    authorityReview: Object.freeze([
      { value: "required", label: "AHJ / code review required" },
      { value: "likely", label: "Likely review item" },
      { value: "not-flagged", label: "Not currently flagged" }
    ]),
    overridePlan: Object.freeze([
      { value: "documented", label: "Documented operator override" },
      { value: "partial", label: "Partial / needs procedure" },
      { value: "missing", label: "Missing or undefined" }
    ])
  });

  function optionLabel(field, value, fallback = "") {
    const list = SPECIAL_LOCKING_OPTIONS[field] || [];
    const item = list.find((entry) => entry.value === value);
    return item ? item.label : fallback || String(value || "");
  }

  function statusToneName(status) {
    const clean = String(status || "").toUpperCase();
    if (clean === "RISK") return "risk";
    if (clean === "WATCH") return "watch";
    return "safe";
  }

  function statusRank(status) {
    const clean = String(status || "").toUpperCase();
    if (clean === "RISK") return 3;
    if (clean === "WATCH") return 2;
    return 1;
  }

  function highestStatus(statuses) {
    return statuses.reduce((best, status) => statusRank(status) > statusRank(best) ? status : best, "HEALTHY");
  }

  function currentOpeningCount() {
    return Math.max(0, Math.round(n("openingCount")));
  }

  function exceptionModeEnabled() {
    return els.exceptionMode && els.exceptionMode.value === "yes";
  }

  function exceptionSelectHtml(field, selected) {
    const options = ['<option value="' + GROUP_DEFAULT + '">Use group default</option>'].concat(
      (SPECIAL_LOCKING_OPTIONS[field] || []).map((entry) => '<option value="' + escapeHtml(entry.value) + '"' + (entry.value === selected ? ' selected' : '') + '>' + escapeHtml(entry.label) + '</option>')
    );

    return '<select data-exception-field="' + escapeHtml(field) + '">' + options.join("") + '</select>';
  }

  function readOpeningExceptionDrafts() {
    const drafts = new Map();
    const wrap = els.openingExceptionsWrap;
    if (!wrap) return drafts;

    Array.from(wrap.querySelectorAll("[data-opening-exception-row]")).forEach((rowEl) => {
      const openingNumber = Number(rowEl.getAttribute("data-opening-index"));
      if (!Number.isFinite(openingNumber) || openingNumber < 1) return;

      const draft = {
        openingNumber,
        enabled: !!rowEl.querySelector("[data-exception-enabled]")?.checked,
        label: rowEl.querySelector("[data-exception-label]")?.value || "Opening #" + openingNumber
      };

      Array.from(rowEl.querySelectorAll("[data-exception-field]")).forEach((fieldEl) => {
        draft[fieldEl.getAttribute("data-exception-field")] = fieldEl.value || GROUP_DEFAULT;
      });

      drafts.set(openingNumber, draft);
    });

    return drafts;
  }

  function syncExceptionCheckboxStates() {
    const wrap = els.openingExceptionsWrap;
    if (!wrap) return;

    Array.from(wrap.querySelectorAll("[data-opening-exception-row]")).forEach((rowEl) => {
      const enabled = !!rowEl.querySelector("[data-exception-enabled]")?.checked;
      rowEl.classList.toggle("is-exception-enabled", enabled);
      rowEl.setAttribute("data-exception-active", enabled ? "true" : "false");
    });
  }

  function renderOpeningExceptionRows() {
    const wrap = els.openingExceptionsWrap;
    if (!wrap) return false;

    if (!exceptionModeEnabled()) {
      wrap.innerHTML = "";
      wrap.hidden = true;
      return true;
    }

    const count = currentOpeningCount();
    const previous = readOpeningExceptionDrafts();
    const rows = [];

    for (let index = 1; index <= count; index += 1) {
      const draft = previous.get(index) || { openingNumber: index, enabled: false, label: "Opening #" + index };

      rows.push([
        '<div class="access-control-opening-exception-row" data-opening-exception-row data-opening-index="' + index + '">',
        '<label class="access-control-exception-toggle"><input type="checkbox" data-exception-enabled' + (draft.enabled ? ' checked' : '') + '><span><strong>Flag #' + index + ' as exception</strong><small>Checked rows override group defaults</small></span></label>',
        '<label class="access-control-exception-row-field"><span class="access-control-exception-mini-label">Label</span><input type="text" data-exception-label value="' + escapeHtml(draft.label || ("Opening #" + index)) + '"></label>',
        '<label class="access-control-exception-row-field"><span class="access-control-exception-mini-label">Locking</span>' + exceptionSelectHtml("lockingType", draft.lockingType) + '</label>',
        '<label class="access-control-exception-row-field"><span class="access-control-exception-mini-label">Egress</span>' + exceptionSelectHtml("egressImpact", draft.egressImpact) + '</label>',
        '<label class="access-control-exception-row-field"><span class="access-control-exception-mini-label">Release</span>' + exceptionSelectHtml("releaseLogic", draft.releaseLogic) + '</label>',
        '<label class="access-control-exception-row-field"><span class="access-control-exception-mini-label">Review</span>' + exceptionSelectHtml("authorityReview", draft.authorityReview) + '</label>',
        '<label class="access-control-exception-row-field"><span class="access-control-exception-mini-label">Override</span>' + exceptionSelectHtml("overridePlan", draft.overridePlan) + '</label>',
        '</div>'
      ].join(""));
    }

    wrap.innerHTML = rows.length ? rows.join("") : '<div class="mini-note">Set the opening count above, then sync opening rows.</div>';
    wrap.hidden = false;
    syncExceptionCheckboxStates();
    return true;
  }

  function getOpeningExceptionRecords() {
    if (!exceptionModeEnabled()) return [];

    return Array.from(readOpeningExceptionDrafts().values()).filter((item) => item.enabled).map((item) => ({
      openingNumber: item.openingNumber,
      label: item.label || "Opening #" + item.openingNumber,
      lockingType: item.lockingType || GROUP_DEFAULT,
      egressImpact: item.egressImpact || GROUP_DEFAULT,
      releaseLogic: item.releaseLogic || GROUP_DEFAULT,
      authorityReview: item.authorityReview || GROUP_DEFAULT,
      overridePlan: item.overridePlan || GROUP_DEFAULT
    }));
  }

  function mergeOpeningValues(defaults, exception) {
    const merged = { ...defaults, openingCount: 1 };
    if (!exception) return merged;

    ["lockingType", "egressImpact", "releaseLogic", "authorityReview", "overridePlan"].forEach((field) => {
      if (exception[field] && exception[field] !== GROUP_DEFAULT) merged[field] = exception[field];
    });

    return merged;
  }

  function openingDriverSummary(values, isException) {
    const drivers = [];
    if (values.egressImpact === "yes") drivers.push("egress path");
    if (values.egressImpact === "unknown") drivers.push("egress review");
    if (values.releaseLogic === "needed") drivers.push("release coordination");
    if (values.authorityReview === "required") drivers.push("AHJ review");
    if (values.authorityReview === "likely") drivers.push("likely review");
    if (values.overridePlan === "missing") drivers.push("missing override");
    if (values.overridePlan === "partial") drivers.push("partial override");
    if (isException && !drivers.length) drivers.push("different locking/security condition");
    return drivers.length ? drivers.join(", ") : "group defaults clear";
  }

  function buildOpeningDetails(defaults) {
    if (!exceptionModeEnabled()) return [];

    const count = currentOpeningCount();
    const exceptions = new Map(getOpeningExceptionRecords().map((item) => [item.openingNumber, item]));
    const details = [];

    for (let index = 1; index <= count; index += 1) {
      const exception = exceptions.get(index) || null;
      const values = mergeOpeningValues(defaults, exception);
      const riskScore = riskWeights(values);
      const status = classify(riskScore);

      details.push({
        openingNumber: index,
        label: exception?.label || "Opening #" + index,
        isException: !!exception,
        values,
        riskScore,
        status,
        tone: statusToneName(status),
        lockingTypeLabel: optionLabel("lockingType", values.lockingType, values.lockingType),
        egressImpactLabel: optionLabel("egressImpact", values.egressImpact, values.egressImpact),
        releaseLogicLabel: optionLabel("releaseLogic", values.releaseLogic, values.releaseLogic),
        authorityReviewLabel: optionLabel("authorityReview", values.authorityReview, values.authorityReview),
        overridePlanLabel: optionLabel("overridePlan", values.overridePlan, values.overridePlan),
        driverSummary: openingDriverSummary(values, !!exception)
      });
    }

    return details;
  }

  function openingStatusCounts(details) {
    const counts = { safe: 0, watch: 0, risk: 0 };
    details.forEach((item) => {
      if (item.status === "RISK") counts.risk += 1;
      else if (item.status === "WATCH") counts.watch += 1;
      else counts.safe += 1;
    });
    return counts;
  }

  function openingRollupLabel(counts) {
    if (!counts) return "Group defaults only";
    return counts.safe + " safe / " + counts.watch + " watch / " + counts.risk + " risk";
  }

  function openingExceptionSummary(details) {
    const exceptions = details.filter((item) => item.isException);
    if (!exceptionModeEnabled()) return "Group defaults applied to all openings.";
    if (!exceptions.length) return "Per-opening rows reviewed; no exceptions flagged.";
    return exceptions.map((item) => "#" + item.openingNumber + " " + item.status + " - " + item.driverSummary).join("; ");
  }


  const SPECIAL_LOCKING_SEED_KEY = "scopedlabs:pipeline:access-control:special-locking-seed";
  const SPECIAL_LOCKING_SEED_CONTRACT = "scopedlabs.access-control.branch-seed.special-locking.v1";
  let activeScopeSeedContext = null;

  function safeJsonParse(text, fallback = null) {
    try {
      return text ? JSON.parse(text) : fallback;
    } catch {
      return fallback;
    }
  }

  function readStoredSpecialLockingSeed() {
    try {
      return safeJsonParse(sessionStorage.getItem(SPECIAL_LOCKING_SEED_KEY), null) || safeJsonParse(localStorage.getItem(SPECIAL_LOCKING_SEED_KEY), null);
    } catch {
      return null;
    }
  }

  function normalizeSpecialLockingSeed(seed = {}) {
    return {
      contract: seed.contract || SPECIAL_LOCKING_SEED_CONTRACT,
      openingCount: Math.max(0, Math.round(Number(seed.openingCount || 1) || 0)),
      lockingType: seed.lockingType || "maglock",
      egressImpact: seed.egressImpact || "unknown",
      releaseLogic: seed.releaseLogic || "needed",
      authorityReview: seed.authorityReview || "likely",
      overridePlan: seed.overridePlan || "documented"
    };
  }

  function getScopeSeedContext() {
    const scopeApi = window.ScopedLabsAccessControlScopeState;
    const activeScope = scopeApi && typeof scopeApi.getActiveScope === "function" ? scopeApi.getActiveScope() : null;
    const stored = readStoredSpecialLockingSeed();
    const activeSeed = activeScope?.branchSeeds?.specialLocking || activeScope?.specialLockingSeed || null;
    const storedMatches = stored && (!activeScope || !stored.scopeId || stored.scopeId === activeScope.id);
    const seed = activeSeed || (storedMatches ? stored.seed : null);

    if (!seed) return null;

    return {
      contract: SPECIAL_LOCKING_SEED_CONTRACT,
      source: "Access Scope Planner",
      scopeId: activeScope?.id || stored?.scopeId || "",
      scopeName: activeScope?.name || stored?.scopeName || "Access Scope",
      scopeType: activeScope?.scopeType || stored?.scopeType || "special-locking-scope",
      planningPath: activeScope?.planningPath || stored?.planningPath || "special-locking-scope",
      seed: normalizeSpecialLockingSeed(seed),
      rawScope: activeScope || null
    };
  }

  function renderScopeSeedContext(context) {
    if (!els.scopeSeedContextCard) return;

    if (!context) {
      els.scopeSeedContextCard.hidden = true;
      return;
    }

    activeScopeSeedContext = context;
    els.scopeSeedContextCard.hidden = false;

    if (els.scopeSeedContextTitle) els.scopeSeedContextTitle.textContent = context.scopeName || "Access Scope Planner seed";
    if (els.scopeSeedContextDescription) {
      els.scopeSeedContextDescription.textContent = "Starter assumptions were imported from the Access Scope Planner. Edit anything here if the specialty review needs a different default.";
    }

    const seed = context.seed || {};
    const rows = [
      ["Scope Type", context.scopeType],
      ["Openings", String(seed.openingCount ?? "")],
      ["Locking", optionLabel("lockingType", seed.lockingType, seed.lockingType)],
      ["Egress", optionLabel("egressImpact", seed.egressImpact, seed.egressImpact)],
      ["Release", optionLabel("releaseLogic", seed.releaseLogic, seed.releaseLogic)],
      ["Review", optionLabel("authorityReview", seed.authorityReview, seed.authorityReview)],
      ["Override", optionLabel("overridePlan", seed.overridePlan, seed.overridePlan)],
      ["Source", context.source]
    ];

    if (els.scopeSeedContextGrid) {
      els.scopeSeedContextGrid.innerHTML = rows.map(([label, value]) => '<div><strong>' + escapeHtml(label) + '</strong><span>' + escapeHtml(value || "Not documented") + '</span></div>').join("");
    }
  }

  function setSelectValue(el, value) {
    if (!el || value === undefined || value === null) return;
    const wanted = String(value);
    if (Array.from(el.options || []).some((option) => option.value === wanted)) el.value = wanted;
  }

  function applySpecialLockingScopeSeed() {
    const context = getScopeSeedContext();
    renderScopeSeedContext(context);

    if (!context || !context.seed) return false;

    const seed = context.seed;
    if (els.openingCount) els.openingCount.value = String(seed.openingCount || 1);
    setSelectValue(els.lockingType, seed.lockingType);
    setSelectValue(els.egressImpact, seed.egressImpact);
    setSelectValue(els.releaseLogic, seed.releaseLogic);
    setSelectValue(els.authorityReview, seed.authorityReview);
    setSelectValue(els.overridePlan, seed.overridePlan);
    if (els.exceptionMode) els.exceptionMode.value = "no";

    renderOpeningExceptionRows();
    return true;
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
      if (window.ScopedLabsExportConfig) {
        window.ScopedLabsExportConfig.customPayloadBuilder = getSpecialLockingExportPayload;
        window.ScopedLabsExportConfig.payloadBuilder = getSpecialLockingExportPayload;
        window.ScopedLabsExportConfig.stackReportSections = true;
        window.ScopedLabsExportConfig.inputSectionTitle = "Group Default Inputs";
        window.ScopedLabsExportConfig.outputSectionTitle = "Decision Summary";
      }
      return true;
    }

    if (window.ScopedLabsExportConfig) {
      window.ScopedLabsExportConfig.getChartImage = getExportChartImage;
      window.ScopedLabsExportConfig.customPayloadBuilder = getSpecialLockingExportPayload;
      window.ScopedLabsExportConfig.payloadBuilder = getSpecialLockingExportPayload;
      window.ScopedLabsExportConfig.stackReportSections = true;
      window.ScopedLabsExportConfig.inputSectionTitle = "Group Default Inputs";
      window.ScopedLabsExportConfig.outputSectionTitle = "Decision Summary";
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
      { group: "Scope", metric: "Opening Exceptions", value: metrics.exceptionCount || 0, note: metrics.exceptionSummary || "Group defaults applied." },
      { group: "Scope", metric: "Opening Rollup", value: metrics.openingRollupLabel || "Group defaults only", note: "Safe / Watch / Risk distribution when per-opening exceptions are reviewed." },
      { group: "Scope", metric: "Locking Condition", value: metrics.lockingTypeLabel, note: "Selected group default locking or security condition." },
      { group: "Life Safety", metric: "Egress Impact", value: metrics.egressImpactLabel, note: "Whether the condition affects the egress path." },
      { group: "Life Safety", metric: "Release Logic", value: metrics.releaseLogicLabel, note: "Fire alarm, emergency release, or power-loss release coordination status." },
      { group: "Authority", metric: "Authority Review", value: metrics.authorityReviewLabel, note: "AHJ/code review expectation." },
      { group: "Operations", metric: "Override Plan", value: metrics.overridePlanLabel, note: metrics.guidance },
      { group: "Pressure", metric: "Risk Score", value: metrics.riskScore, note: metrics.interpretation }
    ];

    const openingRows = Array.isArray(metrics.openingDetails) ? metrics.openingDetails.filter((item) => item.isException).map((item) => ({
      group: "Opening Exceptions",
      metric: "#" + item.openingNumber + " " + item.label,
      valueHtml: schedule.statusChip(item.status),
      note: item.driverSummary + "; locking: " + item.lockingTypeLabel + "; egress: " + item.egressImpactLabel + "; release: " + item.releaseLogicLabel + "; review: " + item.authorityReviewLabel + "; override: " + item.overridePlanLabel
    })) : [];

    if (!openingRows.length && metrics.exceptionMode === "yes") {
      openingRows.push({ group: "Opening Exceptions", metric: "Reviewed Rows", value: "No exceptions flagged", note: "Every reviewed opening currently follows the group defaults." });
    }

    schedule.render({
      card: els.scheduleCard,
      wrap: els.schedule,
      target: els.schedule,
      title: "Special Locking Decision Schedule",
      summary: "Specialty-branch schedule for special locking, egress impact, release coordination, authority-review pressure, and per-opening exceptions.",
      status: metrics.status,
      statusDetail: metrics.riskScore + " risk score",
      interpretation: metrics.interpretation,
      exportTableTitle: "Special Locking Decision Schedule",
      tableDataAttr: 'data-special-locking-summary="true" data-access-control-decision-schedule="true"',
      rows: rows.concat(openingRows)
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
          exceptionMode: metrics.exceptionMode,
          exceptionCount: metrics.exceptionCount,
          openingRollup: metrics.openingRollupLabel,
          openingExceptionSummary: metrics.exceptionSummary,
          openingStatusCounts: metrics.openingStatusCounts,
          openingDetails: (metrics.openingDetails || []).map((item) => ({ openingNumber: item.openingNumber, label: item.label, status: item.status, riskScore: item.riskScore, isException: item.isException, driverSummary: item.driverSummary })),
          scopeSeed: activeScopeSeedContext ? { scopeId: activeScopeSeedContext.scopeId, scopeName: activeScopeSeedContext.scopeName, source: activeScopeSeedContext.source } : null,
          riskScore: metrics.riskScore
        }
      };

      localStorage.setItem(key, JSON.stringify({ ...ledger, category: CATEGORY, tools }));
      return true;
    } catch {
      return false;
    }
  }


  function reportToneFromStatus(status) {
    const clean = String(status || "").toUpperCase();
    if (clean === "RISK") return "risk";
    if (clean === "WATCH") return "watch";
    return "safe";
  }

  function reportToneCell(status) {
    const clean = String(status || "HEALTHY").toUpperCase();
    return { text: clean, tone: reportToneFromStatus(clean) };
  }

  function getSpecialLockingStatusSource(metrics = {}) {
    const status = String(metrics.status || "HEALTHY").toUpperCase();
    const details = Array.isArray(metrics.openingDetails) ? metrics.openingDetails : [];
    const flagged = details.filter((item) => item && item.isException);
    const riskFlags = flagged.filter((item) => item.status === "RISK");
    const watchFlags = flagged.filter((item) => item.status === "WATCH");

    if (riskFlags.length) {
      return "Opening exception authority pressure: " + riskFlags.map((item) => "#" + item.openingNumber + " " + item.label).join(", ");
    }

    if (watchFlags.length && status === "WATCH") {
      return "Opening exception review pressure: " + watchFlags.map((item) => "#" + item.openingNumber + " " + item.label).join(", ");
    }

    if (status === "RISK") return "Authority review / release coordination pressure";
    if (status === "WATCH") return "Locking scope / review pressure";
    return "Release checks clear";
  }

  function exportOpeningMode(item) {
    return item && item.isException ? "Flagged exception" : "Group default";
  }

  function compactOpeningNote(item) {
    if (!item) return "";
    return item.driverSummary || (item.isException ? "Flagged opening exception" : "Uses group defaults");
  }

  function buildSpecialLockingExportSections(metrics = {}, outputs = []) {
    const details = Array.isArray(metrics.openingDetails) ? metrics.openingDetails : [];
    const flagged = details.filter((item) => item && item.isException);
    const counts = metrics.openingStatusCounts || (details.length ? openingStatusCounts(details) : null);
    const status = String(metrics.status || getStatusFromResults(outputs) || "HEALTHY").toUpperCase();
    const statusTone = reportToneFromStatus(status);
    const source = getSpecialLockingStatusSource(metrics);
    const rollup = metrics.openingRollupLabel || openingRollupLabel(counts);
    const exceptionSummary = metrics.exceptionSummary || openingExceptionSummary(details);
    const exceptionCount = Number(metrics.exceptionCount || flagged.length || 0);

    const exportSvg = (() => {
      const visuals = planningVisuals();
      if (!metrics || !visuals || typeof visuals.buildSpecialLockingSvg !== "function") return "";
      return visuals.buildSpecialLockingSvg(metrics, { exportMode: true });
    })();

    const statusScoreCell = (itemStatus, score) => ({
      text: String(itemStatus || "HEALTHY").toUpperCase() + (score === undefined || score === null || score === "" ? "" : " / " + score),
      tone: reportToneFromStatus(itemStatus)
    });

    const groupDefaultRows = [
      ["Flagged Openings", String(metrics.openingCount ?? els.openingCount?.value ?? ""), "Openings included in this specialty branch."],
      ["Default Locking", metrics.lockingTypeLabel || selectedText(els.lockingType), "Applied to openings that are not checked as exceptions."],
      ["Default Egress", metrics.egressImpactLabel || selectedText(els.egressImpact), "Default life-safety assumption for unflagged openings."],
      ["Default Release", metrics.releaseLogicLabel || selectedText(els.releaseLogic), "Default release/emergency operation assumption."],
      ["Default Review", metrics.authorityReviewLabel || selectedText(els.authorityReview), "Default AHJ/code review expectation."],
      ["Default Override", metrics.overridePlanLabel || selectedText(els.overridePlan), "Default operator override / monitoring expectation."],
      ["Status Source", source, "Why the report status is Safe, Watch, or Risk."],
      ["Risk Score", String(metrics.riskScore ?? "pending"), "Highest group/default or per-opening exception pressure."]
    ];

    const rollupRows = [
      ["Exception Mode", metrics.exceptionMode === "yes" ? "Per-opening exceptions reviewed" : "Group defaults only", "How the opening group was evaluated."],
      ["Exception Count", String(exceptionCount), "Checked rows that override the group defaults."],
      ["Opening Rollup", rollup, "Safe / Watch / Risk distribution across reviewed openings."],
      ["Exception Summary", exceptionSummary, "Flagged opening drivers from the live tool."],
      ["Overall Status", reportToneCell(status), source]
    ];

    const openingMapRows = details.length
      ? details.map((item) => [
          "#" + item.openingNumber,
          item.label || "Opening #" + item.openingNumber,
          exportOpeningMode(item),
          statusScoreCell(item.status, item.riskScore),
          compactOpeningNote(item)
        ])
      : [["Group", "All openings", "Group default", statusScoreCell(status, metrics.riskScore), exceptionSummary]];

    const flaggedRows = flagged.map((item) => [
      "#" + item.openingNumber,
      item.label || "Opening #" + item.openingNumber,
      statusScoreCell(item.status, item.riskScore),
      item.driverSummary || "Flagged opening exception",
      [
        item.lockingTypeLabel ? "locking: " + item.lockingTypeLabel : "",
        item.egressImpactLabel ? "egress: " + item.egressImpactLabel : "",
        item.releaseLogicLabel ? "release: " + item.releaseLogicLabel : "",
        item.authorityReviewLabel ? "review: " + item.authorityReviewLabel : "",
        item.overridePlanLabel ? "override: " + item.overridePlanLabel : ""
      ].filter(Boolean).join("; ")
    ]);

    const sections = [
      {
        title: "Special Locking Visual Snapshot",
        description: "Inline report-safe CAD visual from the live Special Locking branch. Door tones match the per-opening conditions.",
        countLabel: status + " / score " + String(metrics.riskScore ?? "pending"),
        countTone: statusTone,
        compactSvg: true,
        svgs: exportSvg ? [exportSvg] : []
      },
      {
        title: "Special Locking Scope Summary",
        description: "Group defaults, status source, and exception rollup from the live Special Locking branch.",
        countLabel: status + " / score " + String(metrics.riskScore ?? "pending"),
        countTone: statusTone,
        tables: [
          {
            title: "Group Default Assumptions",
            className: "extra-export-table--kv",
            headers: ["Item", "Value", "Report Note"],
            rows: groupDefaultRows
          },
          {
            title: "Opening Exception Rollup",
            className: "extra-export-table--kv",
            headers: ["Metric", "Value", "Note"],
            rows: rollupRows
          }
        ]
      },
      {
        title: "Opening Status Map",
        description: "Every reviewed opening is listed so checked exceptions and group-default openings remain traceable in the printout.",
        countLabel: rollup,
        countTone: counts?.risk ? "risk" : counts?.watch ? "watch" : statusTone,
        tables: [
          {
            title: "Per-Opening Status",
            className: "extra-export-table--decision",
            headers: ["Opening", "Label", "Mode", "Status / Score", "Driver"],
            rows: openingMapRows
          }
        ]
      }
    ];

    if (flagged.length) {
      sections.push({
        title: "Flagged Opening Exception Schedule",
        description: "Only checked exception rows are listed here. These are the openings that override the group defaults.",
        countLabel: String(flagged.length) + " exception" + (flagged.length === 1 ? "" : "s"),
        countTone: flagged.some((item) => item.status === "RISK") ? "risk" : flagged.some((item) => item.status === "WATCH") ? "watch" : "safe",
        tables: [
          {
            title: "Checked Opening Exceptions",
            className: "extra-export-table--decision",
            headers: ["Opening", "Label", "Status / Score", "Drivers", "Condition Details"],
            rows: flaggedRows
          }
        ]
      });
    } else if (metrics.exceptionMode === "yes") {
      sections.push({
        title: "Flagged Opening Exception Schedule",
        description: "Per-opening rows were reviewed, but no checked exceptions currently override the group defaults.",
        countLabel: "0 exceptions",
        countTone: "safe",
        tables: [
          {
            title: "Checked Opening Exceptions",
            className: "extra-export-table--decision",
            headers: ["Opening", "Label", "Status / Score", "Drivers", "Condition Details"],
            rows: [["-", "No checked rows", statusScoreCell("HEALTHY", ""), "All reviewed rows use group defaults.", "No exception details."]]
          }
        ]
      });
    }

    return sections;
  }

  function getSpecialLockingReportSummary(metrics = {}, outputs = []) {
    const base = getSummaryFromResults(outputs);
    if (!metrics || !metrics.openingDetails) return base;

    const source = getSpecialLockingStatusSource(metrics);
    const rollup = metrics.openingRollupLabel || "Group defaults only";
    const exceptionCount = Number(metrics.exceptionCount || 0);

    return base + " Status source: " + source + ". Opening rollup: " + rollup + ". Exception openings: " + exceptionCount + ".";
  }

  function getSpecialLockingExportPayload() {
    return currentReport || buildCurrentReportPayload();
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
      summary: getSpecialLockingReportSummary(lastMetrics || {}, outputs),
      interpretation: getInterpretationFromResults(outputs),
      inputs: [
        { label: "Scope Planner Source", value: activeScopeSeedContext ? activeScopeSeedContext.scopeName + " / " + activeScopeSeedContext.source : "Standalone specialty branch" },
        { label: "Special Locking Openings", value: String(els.openingCount?.value || "") },
        { label: "Locking / Security Condition", value: selectedText(els.lockingType) },
        { label: "Egress Path Impact", value: selectedText(els.egressImpact) },
        { label: "Fire Alarm / Emergency Release", value: selectedText(els.releaseLogic) },
        { label: "Authority Review Status", value: selectedText(els.authorityReview) },
        { label: "Monitoring / Override Plan", value: selectedText(els.overridePlan) },
        { label: "Opening Exception Mode", value: exceptionModeEnabled() ? "Per-opening exceptions reviewed" : "Group defaults only" },
        { label: "Opening Exception Summary", value: lastMetrics?.exceptionSummary || "Group defaults applied to all openings." }
      ],
      outputs,
      assumptions: getAssumptions(),
      extraSections: buildSpecialLockingExportSections(lastMetrics || {}, outputs),
      stackReportSections: true,
      chartImage: "",
      openingDetails: lastMetrics?.openingDetails || [],
      scopeSeedContext: activeScopeSeedContext,
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

    if (exceptionModeEnabled()) renderOpeningExceptionRows();

    const baseRiskScore = riskWeights(values);
    const openingDetails = buildOpeningDetails(values);
    const openingCounts = openingDetails.length ? openingStatusCounts(openingDetails) : null;
    const openingMaxScore = openingDetails.reduce((max, item) => Math.max(max, item.riskScore || 0), 0);
    const riskScore = Math.max(baseRiskScore, openingMaxScore);
    const status = highestStatus([classify(baseRiskScore)].concat(openingDetails.map((item) => item.status)));
    const exceptionCount = openingDetails.filter((item) => item.isException).length;
    const openingRollup = openingRollupLabel(openingCounts);
    const exceptionSummary = openingExceptionSummary(openingDetails);
    const guidance = guidanceFor(status, values);
    const interpretation = interpretationFor(status, values) + (exceptionCount ? " Per-opening exceptions flagged: " + exceptionSummary + "." : "");

    const metrics = {
      ...values,
      lockingTypeLabel: selectedText(els.lockingType),
      egressImpactLabel: selectedText(els.egressImpact),
      releaseLogicLabel: selectedText(els.releaseLogic),
      authorityReviewLabel: selectedText(els.authorityReview),
      overridePlanLabel: selectedText(els.overridePlan),
      riskScore,
      baseRiskScore,
      exceptionMode: exceptionModeEnabled() ? "yes" : "no",
      exceptionCount,
      exceptionSummary,
      openingDetails,
      openingStatusCounts: openingCounts,
      openingRollupLabel: openingRollup,
      openingTones: openingDetails.map((item) => item.tone),
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
      row("Opening Exceptions", metrics.exceptionSummary),
      row("Opening Rollup", metrics.openingRollupLabel),
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
    if (els.exceptionMode) els.exceptionMode.value = "no";
    renderOpeningExceptionRows();

    lastMetrics = null;
    currentReport = null;

    render(['<div class="muted">Run calculation.</div>']);
    clearOutputVisual();
    clearSpecialLockingSchedule();
    clearLocalAssistant();
    applySpecialLockingScopeSeed();
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
  applySpecialLockingScopeSeed();

  [els.openingCount, els.lockingType, els.egressImpact, els.releaseLogic, els.authorityReview, els.overridePlan, els.exceptionMode, els.openingExceptionsWrap].forEach((el) => {
    if (el) el.addEventListener("input", handleInputChange);
    if (el) el.addEventListener("change", handleInputChange);
  });

  if (els.openingCount) {
    els.openingCount.addEventListener("input", renderOpeningExceptionRows);
    els.openingCount.addEventListener("change", renderOpeningExceptionRows);
  }

  if (els.exceptionMode) {
    els.exceptionMode.addEventListener("change", renderOpeningExceptionRows);
  }

  if (els.syncOpeningExceptions) {
    els.syncOpeningExceptions.addEventListener("click", () => {
      renderOpeningExceptionRows();
      handleInputChange();
    });
  }

  function handleExceptionCheckboxChange(event) {
    const target = event.target;
    if (!target || !target.matches || !target.matches("[data-exception-enabled]")) return;

    syncExceptionCheckboxStates();

    if (lastMetrics) {
      calc();
    } else {
      handleInputChange();
    }
  }

  if (els.openingExceptionsWrap) {
    els.openingExceptionsWrap.addEventListener("change", handleExceptionCheckboxChange);
  }

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
    getSpecialLockingExportPayload,
    getCurrentReport: () => currentReport
  });
})();
