// access-control-elevator-reader-count-export-print-ux-001: local print report wording and page-pack polish.
(() => {
  const CATEGORY = "access-control";
  const CATEGORY_LABEL = "Access Control";
  const TOOL = "elevator-reader-count";
  const TOOL_LABEL = "Elevator Reader Count";
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:elevator-reader-count";

  const $ = (id) => document.getElementById(id);

  let chart = null;
  let currentReport = null;
  let lastMetrics = null;

  const els = {
    topology: $("topology"),
    cars: $("cars"),
    banks: $("banks"),
    mixedBankGroups: $("mixedBankGroups"),
    mixedCarsPerBank: $("mixedCarsPerBank"),
    mixedSeparateLocations: $("mixedSeparateLocations"),
    mixedCarsPerSeparateLocation: $("mixedCarsPerSeparateLocation"),
    floors: $("floors"),
    dcsMode: $("dcsMode"),
    dcsCredentialPoints: $("dcsCredentialPoints"),
    dest: $("dest"),
    placement: $("placement"),
    scopeSeedContextCard: $("scopeSeedContextCard"),
    scopeSeedContextTitle: $("scopeSeedContextTitle"),
    scopeSeedContextDescription: $("scopeSeedContextDescription"),
    scopeSeedContextGrid: $("scopeSeedContextGrid"),
    results: $("results"),
    calc: $("calc"),
    reset: $("reset"),
    chart: $("chart"),
    chartWrap: $("chartWrap"),
    visualCard: $("elevatorReaderVisualCard"),
    scheduleCard: $("elevatorReaderScheduleCard"),
    schedule: $("elevatorReaderSchedule"),
    localAssistantMount: $("accessControlLocalAssistantMount"),
    flowActions: $("accessControlFlowActions"),
    reportActions: $("elevatorReaderReportActions"),
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


  const ELEVATOR_READER_SEED_KEY = "scopedlabs:pipeline:access-control:elevator-reader-seed";
  const ELEVATOR_READER_SEED_CONTRACT = "scopedlabs.access-control.branch-seed.elevator-reader.v1";
  let activeElevatorSeedContext = null;

  function safeJsonParse(text, fallback = null) {
    try {
      return text ? JSON.parse(text) : fallback;
    } catch {
      return fallback;
    }
  }

  function readStoredElevatorReaderSeed() {
    try {
      return safeJsonParse(sessionStorage.getItem(ELEVATOR_READER_SEED_KEY), null) || safeJsonParse(localStorage.getItem(ELEVATOR_READER_SEED_KEY), null);
    } catch {
      return null;
    }
  }

  function normalizeElevatorReaderSeed(seed = {}) {
    return {
      topology: elevatorTopologyLabel(seed.topology),
      contract: seed.contract || ELEVATOR_READER_SEED_CONTRACT,
      topology: normalizeElevatorTopology(seed.topology),
      dcsMode: normalizeElevatorDcsMode(seed.dcsMode || seed.dest),
      dcsCredentialPoints: Math.max(0, Math.round(Number(seed.dcsCredentialPoints || 0) || 0)),
      cars: Math.max(0, Math.round(Number(seed.cars || 0) || 0)),
      banks: Math.max(1, Math.round(Number(seed.banks || 1) || 1)),
      mixedBankGroups: Math.max(0, Math.round(Number(seed.mixedBankGroups || 0) || 0)),
      mixedCarsPerBank: Math.max(0, Math.round(Number(seed.mixedCarsPerBank || 0) || 0)),
      mixedSeparateLocations: Math.max(0, Math.round(Number(seed.mixedSeparateLocations || 0) || 0)),
      mixedCarsPerSeparateLocation: 1,
      floors: Math.max(0, Math.round(Number(seed.floors || 0) || 0)),
      dest: seed.dest || "no",
      placement: seed.placement || "car",
      tenantSeparation: seed.tenantSeparation || "none",
      emergencyOverride: seed.emergencyOverride || "review",
      highSecurityConnection: seed.highSecurityConnection || "no"
    };
  }

  function seedChoiceLabel(list, value, fallback = "") {
    const found = list.find((item) => item.value === value);
    return found ? found.label : (fallback || String(value || ""));
  }

  function elevatorReaderSeedLabels(seed = {}) {
    return {
      dest: seedChoiceLabel([
        { value: "no", label: "No (traditional buttons)" },
        { value: "yes", label: "Yes (DCS / kiosks)" }
      ], seed.dest, seed.dest),
      placement: seedChoiceLabel([
        { value: "car", label: "Inside each car" },
        { value: "lobby", label: "In lobby (per bank)" },
        { value: "both", label: "Both (lobby + car)" }
      ], seed.placement, seed.placement),
      tenantSeparation: seedChoiceLabel([
        { value: "none", label: "No tenant separation expected" },
        { value: "review", label: "Tenant separation needs review" },
        { value: "yes", label: "Tenant separation required" }
      ], seed.tenantSeparation, seed.tenantSeparation),
      emergencyOverride: seedChoiceLabel([
        { value: "documented", label: "Documented fire service / override plan" },
        { value: "review", label: "Fire service / override coordination needs review" },
        { value: "missing", label: "Override coordination missing or undefined" }
      ], seed.emergencyOverride, seed.emergencyOverride),
      highSecurityConnection: seedChoiceLabel([
        { value: "no", label: "No high-security connection" },
        { value: "review", label: "Connected to restricted areas / review" },
        { value: "yes", label: "Serves high-security floors or areas" }
      ], seed.highSecurityConnection, seed.highSecurityConnection)
    };
  }

  function getElevatorReaderSeedContext() {
    const scopeApi = window.ScopedLabsAccessControlScopeState;
    const activeScope = scopeApi && typeof scopeApi.getActiveScope === "function" ? scopeApi.getActiveScope() : null;
    const stored = readStoredElevatorReaderSeed();
    const activeSeed = activeScope?.branchSeeds?.elevatorReader || activeScope?.elevatorReaderSeed || null;
    const storedMatches = stored && (!activeScope || !stored.scopeId || stored.scopeId === activeScope.id);
    const seed = activeSeed || (storedMatches ? stored.seed : null);

    if (!seed) return null;

    return {
      contract: ELEVATOR_READER_SEED_CONTRACT,
      source: "Access Scope Planner",
      scopeId: activeScope?.id || stored?.scopeId || "",
      scopeName: activeScope?.name || stored?.scopeName || "Elevator Bank Scope",
      scopeType: activeScope?.scopeType || stored?.scopeType || "elevator-bank",
      planningPath: activeScope?.planningPath || stored?.planningPath || "elevator-bank",
      seed: normalizeElevatorReaderSeed(seed),
      rawScope: activeScope || null
    };
  }

  function renderElevatorSeedContext(context) {
    if (!els.scopeSeedContextCard) return;

    if (!context) {
      els.scopeSeedContextCard.hidden = true;
      return;
    }

    activeElevatorSeedContext = context;
    els.scopeSeedContextCard.hidden = false;

    if (els.scopeSeedContextTitle) els.scopeSeedContextTitle.textContent = context.scopeName || "Elevator Bank Scope";
    if (els.scopeSeedContextDescription) {
      els.scopeSeedContextDescription.textContent = "Starter assumptions were imported from the Access Scope Planner. Edit anything here if this elevator bank needs a different reader model.";
    }

    const seed = context.seed || {};
    const labels = elevatorReaderSeedLabels(seed);
    const rows = [
      ["Scope Type", context.scopeType],
      ["Elevator Topology", labels.topology],
      ["Bank / Location Count", String(seed.banks ?? "")],
      ["Cars / Cabs per Bank or Location", String(seed.cars ?? "")],
      ["Elevator Bank Groups", String(seed.mixedBankGroups ?? 0)],
      ["Cars / Cabs per Bank Group", String(seed.mixedCarsPerBank ?? 0)],
      ["Single Elevator Locations", String(seed.mixedSeparateLocations ?? 0)],
      ["Secured Floors Served", String(seed.floors ?? "")],
      ["DCS Mode", elevatorDcsModeLabel(seed.dcsMode || seed.dest)],
      ["DCS Credential Points", String(seed.dcsCredentialPoints ?? 0)],
      ["Reader Placement", labels.placement],
      ["Tenant Separation", labels.tenantSeparation],
      ["Override", labels.emergencyOverride],
      ["High-Security", labels.highSecurityConnection],
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

  function applyElevatorReaderScopeSeed() {
    const context = getElevatorReaderSeedContext();
    renderElevatorSeedContext(context);

    if (!context || !context.seed) return false;

    const seed = context.seed;
    setSelectValue(els.topology, seed.topology);
    if (els.cars) els.cars.value = String(seed.cars || 0);
    if (els.banks) els.banks.value = String(seed.banks || 1);
    if (els.floors) els.floors.value = String(seed.floors || 0);
    if (els.mixedBankGroups) els.mixedBankGroups.value = String(seed.mixedBankGroups || 0);
    if (els.mixedCarsPerBank) els.mixedCarsPerBank.value = String(seed.mixedCarsPerBank || 0);
    if (els.mixedSeparateLocations) els.mixedSeparateLocations.value = String(seed.mixedSeparateLocations || 0);
    if (els.mixedCarsPerSeparateLocation) els.mixedCarsPerSeparateLocation.value = "1";
    setSelectValue(els.dcsMode, seed.dcsMode || seed.dest);
    if (els.dcsCredentialPoints) els.dcsCredentialPoints.value = String(seed.dcsCredentialPoints || defaultElevatorDcsCredentialPoints({ dcsMode: seed.dcsMode || seed.dest, topology: seed.topology, banks: seed.banks }));
    setSelectValue(els.dest, seed.dest);
    setSelectValue(els.placement, seed.placement);

    return true;
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

  function showChartWrap() {
    if (els.chartWrap) els.chartWrap.hidden = false;
  }

  function hideChartWrap() {
    if (els.chartWrap) els.chartWrap.hidden = true;
  }

  function destroyChart() {
    if (chart && typeof chart.destroy === "function") {
      chart.destroy();
    }

    chart = null;
    clearOutputVisual();
    clearElevatorSchedule();
    clearLocalAssistant();
    hideChartWrap();
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
    return {
      reportTitle: (els.reportTitle?.value || "").trim() || "Elevator Reader Count Assessment",
      projectName: (els.projectName?.value || "").trim(),
      clientName: (els.clientName?.value || "").trim(),
      preparedBy: (els.preparedBy?.value || "").trim(),
      customNotes: (els.customNotes?.value || "").trim()
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
    const totalReaders = outputs.find((x) => x.label === "Estimated Total Readers")?.value || "";
    const status = outputs.find((x) => x.label === "System Status")?.value || "";
    const placement = outputs.find((x) => x.label === "Placement")?.value || "";

    return `Estimated elevator access design requires ${totalReaders || "N/A"} readers with ${status || "unknown"} system status using a ${placement || "N/A"} placement strategy.`;
  }

  function getInterpretationFromResults(outputs) {
    return outputs.find((x) => x.label === "Engineering Insight")?.value || "";
  }

  function getStatusFromResults(outputs) {
    const status = (outputs.find((x) => x.label === "System Status")?.value || "").toUpperCase();

    if (status === "RISK") return "RISK";
    if (status === "WATCH") return "WATCH";
    return "HEALTHY";
  }

  function getAssumptions() {
    return [
      "Reader count is estimated from cars, banks, secured floors, DCS presence, and placement strategy.",
      "This export reflects the current on-screen tool results at the time the report was opened or saved.",
      "Outputs are planning aids for hardware and integration magnitude, not controller-specific elevator interface sizing.",
      "Elevator access design should be validated with the elevator contractor, access-control platform, fire/life-safety requirements, override behavior, and owner operating policy."
    ];
  }


  function reportToneFromStatus(status) {
    const key = String(status || "").toLowerCase();
    if (key.includes("risk")) return "risk";
    if (key.includes("watch")) return "watch";
    return "safe";
  }

  function reportCell(text, tone = "") {
    return tone ? { text: String(text ?? ""), tone } : String(text ?? "");
  }

  function getElevatorReaderVisualSvg(metrics, options = {}) {
    const visuals = planningVisuals();
    if (!metrics || !visuals || typeof visuals.buildElevatorReaderSvg !== "function") return "";

    return visuals.buildElevatorReaderSvg(metrics, Object.assign({ exportMode: true }, options));
  }

  function buildElevatorReaderInputRows() {
    const topology = normalizeElevatorTopology(els.topology?.value);
    const isBanksPlusSingles = topology === "mixed-custom";

    const rows = [
      { label: "Scope Planner Source", value: activeElevatorSeedContext ? activeElevatorSeedContext.scopeName + " / " + activeElevatorSeedContext.source : "Standalone elevator branch" },
      { label: "Elevator Scope Type", value: els.topology?.options[els.topology.selectedIndex]?.text || elevatorTopologyLabel(topology) }
    ];

    if (isBanksPlusSingles) {
      rows.push(
        { label: "Elevator Bank Groups", value: String(els.mixedBankGroups?.value || 0) },
        { label: "Cars / Cabs per Bank Group", value: String(els.mixedCarsPerBank?.value || 0) },
        { label: "Single Elevator Locations", value: String(els.mixedSeparateLocations?.value || 0) }
      );
    } else {
      rows.push(
        { label: "Cars / Cabs per Bank or Location", value: String(els.cars?.value || 0) },
        { label: "Bank / Location Count", value: String(els.banks?.value || 0) }
      );
    }

    rows.push(
      { label: "Secured Floors Served", value: String(els.floors?.value || 0) },
      { label: "DCS Mode", value: els.dcsMode?.options[els.dcsMode.selectedIndex]?.text || els.dcsMode?.value || "No DCS" },
      { label: "DCS Credential Capture Points", value: String(els.dcsCredentialPoints?.value || 0) },
      { label: "Reader Placement", value: els.placement?.options[els.placement.selectedIndex]?.text || els.placement?.value || "" }
    );

    return rows.filter((item) => item.label && item.value !== undefined && item.value !== null);
  }

  function buildElevatorReaderExportSections(metrics) {
    if (!metrics) return [];

    const tone = reportToneFromStatus(metrics.status);
    const visualSvg = getElevatorReaderVisualSvg(metrics, { exportMode: true });
    const isBanksPlusSingles = metrics.isMixedTopology === true || metrics.topology === "mixed-custom";

    const scopeRows = [
      ["Elevator Scope Type", metrics.topologyLabel || "Not documented"],
      ["Bank / Location Count", String(metrics.banks ?? "0")],
      ["Secured Floors Served", String(metrics.floors ?? "0")]
    ];

    if (isBanksPlusSingles) {
      scopeRows.push(
        ["Elevator Bank Groups", String(metrics.bankGroups ?? metrics.mixedBankGroups ?? 0)],
        ["Cars / Cabs per Bank Group", String(metrics.mixedCarsPerBank ?? 0)],
        ["Single Elevator Locations", String(metrics.separateLocations ?? metrics.mixedSeparateLocations ?? 0)],
        ["Banked Cars", String(metrics.bankedCars ?? 0)],
        ["Single Cars", String(metrics.separateCars ?? 0)]
      );
    } else {
      scopeRows.push(
        ["Cars / Cabs per Bank or Location", String(metrics.carsPerGroup ?? metrics.cars ?? 0)],
        ["Total Cars / Cabs", String(metrics.cars ?? 0)]
      );
    }

    const readerRows = [
      ["Car Readers", String(metrics.carReaders ?? 0)],
      ["Lobby Readers", String(metrics.lobbyReaders ?? 0)],
      ["DCS Readers", String(metrics.dcsAdd ?? 0)],
      ["Estimated Total Readers", reportCell(metrics.totalReaders ?? 0, tone)],
      ["Planning Complexity", reportCell(metrics.complexityIndex ?? 0, tone)],
      ["System Status", reportCell(metrics.status || "HEALTHY", tone)]
    ];

    const dcsRows = [
      ["DCS Mode", metrics.dcsModeLabel || metrics.destLabel || "No DCS"],
      ["DCS Credential Capture Points", String(metrics.dcsCredentialPoints ?? 0)],
      ["DCS Count Driver", "Credential capture points are counted as reader/authentication points, not as a flat yes/no adder."],
      ["Reader Placement", metrics.placementLabel || metrics.placement || "Not documented"]
    ];

    const sections = [];

    if (visualSvg) {
      sections.push({
        title: "Elevator Reader Visual Snapshot",
        text: "Report-safe CAD view of the selected elevator topology, reader model, DCS reader points, and status pressure line.",
        svgs: [visualSvg],
        compactSvg: true
      });
    }

    sections.push(
      {
        title: "Elevator Scope Topology",
        text: isBanksPlusSingles
          ? "Banks + single elevators are separated so banked cars and single elevator locations remain traceable in the reader count."
          : "Topology inputs define whether reader count follows cars, bank/location groups, or separate elevator locations.",
        tables: [{
          title: "Topology Breakdown",
          headers: ["Field", "Value"],
          rows: scopeRows,
          className: "extra-export-table--compact"
        }]
      },
      {
        title: "Reader Count Breakdown",
        text: "Reader totals separate in-car readers, lobby/landing readers, and DCS credential capture points.",
        tables: [{
          title: "Reader Count Model",
          headers: ["Reader Driver", "Count"],
          rows: readerRows,
          className: "extra-export-table--compact"
        }]
      },
      {
        title: "DCS / Dispatch Assumptions",
        text: "Destination dispatch is modeled as credential capture reader points so the printout reflects the actual authentication count driver.",
        tables: [{
          title: "DCS Driver Summary",
          headers: ["DCS Field", "Value"],
          rows: dcsRows,
          className: "extra-export-table--compact"
        }]
      }
    );

    return sections;
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
      shell.register(TOOL, {
        getChartImage: getExportChartImage
      });
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

  function placeElevatorReaderReportActions() {
    const mount = document.getElementById("reportMetadataMount");
    const actions = els.reportActions;
    if (!mount || !actions) return false;

    const details = mount.querySelector(".sl-report-meta") || mount.querySelector("details") || mount;
    if (actions.parentElement !== details) {
      details.appendChild(actions);
    }

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
      return shell.hideVisual({
        card: els.visualCard,
        wrap: els.chartWrap,
        target: els.chart
      });
    }

    if (els.chart) els.chart.innerHTML = "";
    if (els.chartWrap) els.chartWrap.hidden = true;
    if (els.visualCard) els.visualCard.hidden = true;
    return true;
  }

  function renderOutputVisual(metrics) {
    const visuals = planningVisuals();

    if (visuals && typeof visuals.renderElevatorReader === "function") {
      return visuals.renderElevatorReader({
        card: els.visualCard,
        wrap: els.chartWrap,
        target: els.chart,
        metrics
      });
    }

    return false;
  }

  function getElevatorReaderVisualImage(metrics, options = {}) {
    const visuals = planningVisuals();
    if (!metrics || !visuals || typeof visuals.buildElevatorReaderSvg !== "function") return "";

    if (typeof visuals.svgToDataUri === "function") {
      return visuals.svgToDataUri(visuals.buildElevatorReaderSvg(metrics, Object.assign({ exportMode: true }, options)));
    }

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(visuals.buildElevatorReaderSvg(metrics, Object.assign({ exportMode: true }, options)));
  }

  function clearElevatorSchedule() {
    if (els.schedule) els.schedule.innerHTML = "";
    if (els.scheduleCard) els.scheduleCard.hidden = true;
  }

  function renderElevatorReaderSchedule(metrics) {
    const schedule = window.ScopedLabsAccessControlDecisionSchedule;
    if (!schedule || typeof schedule.render !== "function" || !els.schedule) return false;

    const rows = [
      { group: "Reader Model", metric: "Total Readers", value: metrics.totalReaders, note: "Estimated total reader count for the selected elevator strategy." },
      { group: "Reader Model", metric: "Car / Lobby / DCS", value: metrics.carReaders + " / " + metrics.lobbyReaders + " / " + metrics.dcsAdd, note: "Shows how the selected placement and DCS setting drive reader count." },
      { group: "Scope", metric: "Topology / Count / Floors", value: metrics.topologyLabel + " / " + metrics.banks + " / " + metrics.floors, note: "Topology, bank/location count, and secured floors used for reader-count planning magnitude." },
      { group: "Pressure", metric: "Complexity Index", value: metrics.complexityIndex, note: "Used to flag elevator coordination and integration pressure." },
      { group: "Decision", metric: "Placement", value: metrics.placementLabel, note: metrics.guidance },
      { group: "Decision", metric: "DCS Mode", value: metrics.dcsModeLabel, note: metrics.insight },
      { group: "Decision", metric: "DCS Credential Points", value: String(metrics.dcsCredentialPoints || 0), note: "DCS capture points are counted as reader/authentication points rather than a flat yes/no adder." }
    ];

    schedule.render({
      card: els.scheduleCard,
      wrap: els.schedule,
      target: els.schedule,
      title: "Elevator Reader Decision Schedule",
      summary: "Specialty-branch elevator reader schedule for reader count, DCS adders, and integration pressure.",
      status: metrics.status,
      statusDetail: metrics.complexityIndex + " complexity index",
      interpretation: metrics.insight,
      exportTableTitle: "Elevator Reader Decision Schedule",
      tableDataAttr: 'data-elevator-reader-summary="true" data-access-control-decision-schedule="true"',
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
    const adapter = adapters && typeof adapters.getAdapter === "function"
      ? adapters.getAdapter(TOOL)
      : null;

    if (!assistant || !adapter || !els.localAssistantMount || typeof adapter.buildModel !== "function") {
      return false;
    }

    return assistant.mount(els.localAssistantMount, adapter.buildModel(metrics));
  }

  function publishElevatorReaderSummaryContribution(metrics) {
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
        interpretation: metrics.insight,
        updatedAt: new Date().toISOString(),
        metrics: {
          totalReaders: metrics.totalReaders,
          carReaders: metrics.carReaders,
          lobbyReaders: metrics.lobbyReaders,
          dcsAdd: metrics.dcsAdd,
          complexityIndex: metrics.complexityIndex,
          placement: metrics.placementLabel,
          topology: metrics.topologyLabel,
          mixedScope: metrics.isMixedTopology,
          bankGroups: metrics.bankGroups,
          separateLocations: metrics.separateLocations,
          dcsMode: metrics.dcsModeLabel,
          dcsCredentialPoints: metrics.dcsCredentialPoints,
          destinationControl: metrics.destLabel,
          scopeSeed: activeElevatorSeedContext ? { scopeId: activeElevatorSeedContext.scopeId, scopeName: activeElevatorSeedContext.scopeName, source: activeElevatorSeedContext.source } : null
        }
      };

      localStorage.setItem(key, JSON.stringify({ ...ledger, category: CATEGORY, tools }));
      return true;
    } catch {
      return false;
    }
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
    return getElevatorReaderVisualImage(lastMetrics);
  }

  function buildCurrentReportPayload() {
    const outputs = collectVisibleResults();

    if (!outputs.length) return null;

    return {
      reportId: makeReportId("SL-ACC-ELEVATOR"),
      generatedAt: new Date().toISOString(),
      category: CATEGORY_LABEL,
      categorySlug: CATEGORY,
      tool: TOOL_LABEL,
      toolSlug: TOOL,
      status: getStatusFromResults(outputs),
      summary: getSummaryFromResults(outputs),
      interpretation: getInterpretationFromResults(outputs),
      inputs: buildElevatorReaderInputRows(),
      outputs,
      assumptions: getAssumptions(),
      extraSections: buildElevatorReaderExportSections(lastMetrics),
      chartImage: "",
      scopeSeedContext: activeElevatorSeedContext,
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
          <h2>Planning Visual</h2>
          <div class="chart-wrap">
            <img src="${payload.chartImage}" alt="Elevator Reader Count planning visual">
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
      border-radius:10px;
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
      font-weight:720;
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
      border-radius:10px;
      font-size:.82rem;
      font-weight:720;
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
    @media (max-width:760px){
      body{padding:14px}
      .report{padding:20px}
      .report-head{flex-direction:column}
      .grid{grid-template-columns:1fr}
    }
    @media print{
      @page{margin:.45in}
      body{background:#fff;padding:0}
      .page{max-width:none;border:none;box-shadow:none}
      .toolbar{display:none !important}
      .report{padding:0}
      .report-head,.section,.chart-wrap,.grid,.summary,.body-copy,.foot{break-inside:avoid;page-break-inside:avoid}
      .section{margin-top:12px}
      .section h2{break-after:avoid;page-break-after:avoid}
      .chart-wrap img{display:block;max-width:100%;max-height:4.6in;object-fit:contain;margin:0 auto}
      table{break-inside:auto}
      tr{break-inside:avoid;page-break-inside:avoid}
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
              <thead><tr><th>Input</th><th>Value</th></tr></thead>
              <tbody>${inputRows}</tbody>
            </table>
          </div>
          <div>
            <h2>Calculated Outputs</h2>
            <table>
              <thead><tr><th>Output</th><th>Value</th></tr></thead>
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
        <div class="body-copy"><ul class="assumptions">${assumptions}</ul></div>
      </section>

      <section class="section">
        <h2>Disclaimer</h2>
        <div class="body-copy">
          ScopedLabs outputs are planning aids only and do not replace formal engineering review, code compliance review, site-specific validation, elevator contractor coordination, fire/life-safety review, or manufacturer documentation.
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

      setTimeout(() => URL.revokeObjectURL(url), 10000);
      return true;
    } catch (err) {
      console.error("Export report open failed:", err);
      return false;
    }
  }


  function normalizeElevatorTopology(value) {
    const key = String(value || "").trim();
    return ["single-bank", "multiple-banks", "separate-elevators", "mixed-custom"].includes(key) ? key : "single-bank";
  }

  function elevatorTopologyLabel(value) {
    const key = normalizeElevatorTopology(value);
    if (key === "multiple-banks") return "Multiple elevator banks";
    if (key === "separate-elevators") return "Separate individual elevators / locations";
    if (key === "mixed-custom") return "Banks + single elevators";
    return "Single elevator bank";
  }


  function normalizeElevatorDcsMode(value) {
    const raw = String(value || "").trim();
    if (raw === "yes") return "per-bank";
    if (raw === "no") return "no-dcs";
    return ["no-dcs", "shared-bank", "per-bank", "separate-location", "mixed-custom"].includes(raw) ? raw : "no-dcs";
  }

  function isElevatorDcsEnabled(value) {
    return normalizeElevatorDcsMode(value) !== "no-dcs";
  }

  function elevatorDcsModeLabel(value) {
    const mode = normalizeElevatorDcsMode(value);
    if (mode === "shared-bank") return "Shared lobby dispatch for this bank";
    if (mode === "per-bank") return "Per-bank dispatch terminals";
    if (mode === "separate-location") return "Separate-location dispatch terminals";
    if (mode === "mixed-custom") return "Custom DCS credential points";
    return "No DCS / traditional elevator call buttons";
  }

  function defaultElevatorDcsCredentialPoints(options = {}) {
    const mode = normalizeElevatorDcsMode(options.dcsMode);
    const banks = Math.max(1, Math.round(Number(options.banks || 1) || 1));

    if (mode === "no-dcs") return 0;
    if (mode === "shared-bank") return 1;
    if (mode === "per-bank") return banks;
    if (mode === "separate-location") return banks;
    return 0;
  }


  function numberFromElement(el, fallback = 0) {
    const value = Number(el?.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function setElevatorFieldHidden(el, hidden) {
    const field = el?.closest ? el.closest(".field") : null;
    if (!field) return;
    field.hidden = Boolean(hidden);
    field.style.display = hidden ? "none" : "";
    field.setAttribute("aria-hidden", hidden ? "true" : "false");
  }

  function syncElevatorTopologyControls() {
    const rawTopology = String(els.topology?.value || "");
    const isSingleBank = rawTopology === "single-bank";
    const isBanksPlusSingles = rawTopology === "mixed-custom";

    if (els.cars) {
      setFieldHidden(els.cars, isBanksPlusSingles);
      els.cars.disabled = false;
      els.cars.readOnly = false;
      els.cars.title = isBanksPlusSingles
        ? "Banks + single elevators uses Cars / Cabs per Bank Group."
        : "Cars or cabs in the selected bank/location model.";
    }

    if (els.banks) {
      if (isSingleBank) els.banks.value = "1";
      els.banks.disabled = false;
      els.banks.readOnly = isSingleBank || isBanksPlusSingles;
      setFieldHidden(els.banks, isBanksPlusSingles);
      els.banks.title = isSingleBank
        ? "Single elevator bank uses one bank group. Put the elevator count in Cars / Cabs per Bank or Location."
        : isBanksPlusSingles
          ? "Banks + single elevators computes this from Elevator Bank Groups plus Single Elevator Locations."
          : "For multiple banks or single elevator locations, this count drives reader quantity.";
    }

    const bankGroups = Math.max(0, Math.round(Number(els.mixedBankGroups?.value || 0) || 0));
    const singleLocations = Math.max(0, Math.round(Number(els.mixedSeparateLocations?.value || 0) || 0));

    [
      els.mixedBankGroups,
      els.mixedCarsPerBank,
      els.mixedSeparateLocations
    ].forEach((el) => setFieldHidden(el, !isBanksPlusSingles));

    if (els.mixedCarsPerSeparateLocation) {
      els.mixedCarsPerSeparateLocation.value = "1";
      setFieldHidden(els.mixedCarsPerSeparateLocation, true);
    }

    if (isBanksPlusSingles && els.banks) {
      els.banks.value = String(Math.max(1, bankGroups + singleLocations));
    }

    function setFieldHidden(el, hidden) {
      setElevatorFieldHidden(el, hidden);
    }
  }

  function getPerBankReaders(floors) {
    return floors > 12 ? 2 : 1;
  }

  function getStatus(complexityIndex) {
    if (complexityIndex > 90) return "RISK";
    if (complexityIndex > 55) return "WATCH";
    return "HEALTHY";
  }

  function getGuidance(status, placement, dest) {
    if (status === "RISK") {
      return "Reader strategy is becoming complex. Coordinate early with the elevator contractor and validate kiosk, car, and override behaviors before procurement.";
    }

    if (status === "WATCH") {
      return "Design is workable, but integration detail matters. Confirm reader placement, throughput expectations, and emergency override sequences.";
    }

    if (dest === "yes" && placement === "car") {
      return "DCS is present, so verify whether lobby authentication is actually required before locking into in-car-only hardware.";
    }

    return "Reader strategy is straightforward and should deploy cleanly with normal coordination.";
  }

  function getInsight(status, dest, total) {
    if (status === "RISK") {
      return `This elevator access design is hardware-heavy. At ${total} estimated readers, the challenge is less about count and more about integration behavior, queue flow, and how cleanly elevator logic is coordinated with access control.`;
    }

    if (status === "WATCH") {
      return "This is a moderate-complexity elevator access design. Hardware count is manageable, but reader location and user flow will determine whether the system feels smooth or frustrating in daily use.";
    }

    if (dest === "yes") {
      return "The reader count remains reasonable, but DCS changes where authentication belongs. Keep user interaction aligned with the destination-selection point, not just the elevator car.";
    }

    return "This is a clean elevator reader design with limited deployment overhead and predictable control behavior.";
  }

  function calc() {
    syncElevatorTopologyControls();

    const topology = normalizeElevatorTopology(els.topology?.value);
    const isMixedTopology = topology === "mixed-custom";
    const carsPerGroup = Math.max(0, Math.floor(n("cars")));
    const scopeCountInput = Math.max(1, Math.floor(n("banks")));
    const mixedBankGroups = isMixedTopology ? Math.max(0, Math.floor(n("mixedBankGroups"))) : 0;
    const mixedCarsPerBank = isMixedTopology ? Math.max(0, Math.floor(n("mixedCarsPerBank"))) : 0;
    const mixedSeparateLocations = isMixedTopology ? Math.max(0, Math.floor(n("mixedSeparateLocations"))) : 0;
    const mixedCarsPerSeparateLocation = isMixedTopology ? 1 : 0;
    const bankGroups = isMixedTopology ? mixedBankGroups : (topology === "single-bank" ? 1 : scopeCountInput);
    const separateLocations = isMixedTopology ? mixedSeparateLocations : (topology === "separate-elevators" ? scopeCountInput : 0);
    const banks = isMixedTopology ? Math.max(1, bankGroups + separateLocations) : (topology === "single-bank" ? 1 : scopeCountInput);
    const bankedCars = isMixedTopology ? bankGroups * mixedCarsPerBank : carsPerGroup * banks;
    const separateCars = isMixedTopology ? separateLocations : 0;
    const cars = isMixedTopology ? bankedCars + separateCars : carsPerGroup * banks;
    const floors = Math.max(0, Math.floor(n("floors")));
    const dcsMode = normalizeElevatorDcsMode(els.dcsMode?.value || els.dest?.value);
    const dcsCredentialPointsInput = Math.max(0, Math.floor(n("dcsCredentialPoints")));
    const dcsCredentialPoints = isElevatorDcsEnabled(dcsMode) ? (dcsCredentialPointsInput > 0 ? dcsCredentialPointsInput : defaultElevatorDcsCredentialPoints({ dcsMode, topology, banks })) : 0;
    const dest = isElevatorDcsEnabled(dcsMode) ? "yes" : "no";
    const placement = els.placement.value;

    if (cars <= 0) {
      if (els.results) {
        els.results.innerHTML = row("Error", "Enter Cars / Cabs per Bank or Location > 0");
      }

      destroyChart();
      lastMetrics = null;
      currentReport = null;
      updateExportControls();
      return;
    }
    let carReaders = 0;
    let lobbyReaders = 0;

    if (dest === "yes") {
      if (placement === "car" || placement === "both") {
        carReaders = cars;
      }
    } else if (placement === "car") {
      carReaders = cars;
    } else if (placement === "lobby") {
      lobbyReaders = banks * getPerBankReaders(floors);
    } else {
      carReaders = cars;
      lobbyReaders = banks * getPerBankReaders(floors);
    }

    const dcsAdd = dcsCredentialPoints;
    const totalReaders = carReaders + lobbyReaders + dcsAdd;

    const complexityIndex = Math.round(
      totalReaders +
      floors * 1.5 +
      banks * 4 +
      (dest === "yes" ? 8 + dcsCredentialPoints * 2 : 0) +
      (placement === "both" ? 10 : placement === "lobby" ? 4 : 0)
    );

    const status = getStatus(complexityIndex);
    const guidance = getGuidance(status, placement, dest);
    const insight = getInsight(status, dest, totalReaders);

    els.results.innerHTML = [
      row("Elevator Scope Type", elevatorTopologyLabel(topology)),
      row("Bank / Location Count", banks),
      row("Cars / Cabs per Bank or Location", carsPerGroup),
      isMixedTopology ? row("Elevator Bank Groups", bankGroups) : "",
      isMixedTopology ? row("Cars / Cabs per Bank Group", mixedCarsPerBank) : "",
      isMixedTopology ? row("Single Elevator Locations", separateLocations) : "",
      isMixedTopology ? row("Banked Cars / Single Cars", bankedCars + " / " + separateCars) : "",
      row("Total Cars / Cabs", cars),
      row("Secured Floors Served", floors),
      row("DCS Mode", elevatorDcsModeLabel(dcsMode)),
      row("DCS Credential Points", dcsCredentialPoints),
      row("Placement", placement.toUpperCase()),
      row("Car Readers (est.)", carReaders),
      row("Lobby Readers (est.)", lobbyReaders),
      row("DCS Readers (est.)", dcsAdd),
      row("Estimated Total Readers", totalReaders),
      row("Planning Complexity", complexityIndex),
      row("System Status", status),
      row("Design Guidance", guidance),
      row("Engineering Insight", insight)
    ].join("");

    lastMetrics = {
      topology,
      topologyLabel: elevatorTopologyLabel(topology),
      isMixedTopology,
      carsPerGroup,
      cars,
      banks,
      bankGroups,
      separateLocations,
      mixedBankGroups,
      mixedCarsPerBank,
      mixedSeparateLocations,
      mixedCarsPerSeparateLocation,
      bankedCars,
      separateCars,
      floors,
      dcsMode,
      dcsModeLabel: elevatorDcsModeLabel(dcsMode),
      dcsCredentialPoints,
      dest,
      destLabel: elevatorDcsModeLabel(dcsMode),
      placement,
      placementLabel: els.placement.options[els.placement.selectedIndex]?.text || placement,
      totalReaders,
      carReaders,
      lobbyReaders,
      dcsAdd,
      complexityIndex,
      status,
      systemStatus: status,
      guidance,
      insight,
      interpretation: insight
    };

    renderOutputVisual(lastMetrics);
    renderElevatorReaderSchedule(lastMetrics);
    renderLocalAssistant(lastMetrics);
    publishElevatorReaderSummaryContribution(lastMetrics);

    currentReport = buildCurrentReportPayload();
    updateExportControls();
  }

  function resetResults(message = "Enter values and press Calculate.") {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">${escapeHtml(message)}</div>`;
    }

    destroyChart();
    lastMetrics = null;
    currentReport = null;
    updateExportControls();
  }

  function invalidate() {
    resetResults("Inputs changed. Press Calculate to refresh results.");
  }

  function reset() {
    if (els.topology) els.topology.value = "multiple-banks";
    if (els.cars) els.cars.value = 3;
    if (els.banks) els.banks.value = 2;
    if (els.floors) els.floors.value = 8;
    if (els.dcsMode) els.dcsMode.value = "no-dcs";
    if (els.dcsCredentialPoints) els.dcsCredentialPoints.value = "0";
    if (els.dest) els.dest.value = "no";
    if (els.placement) els.placement.value = "car";

    applyElevatorReaderScopeSeed();
    syncElevatorTopologyControls();
    resetResults("Enter values and press Calculate.");
  }

  window.ScopedLabsAccessControlElevatorReaderExport = Object.freeze({
    buildPayload: buildCurrentReportPayload,
    buildSections: buildElevatorReaderExportSections
  });

  if (window.ScopedLabsExportConfig) {
    window.ScopedLabsExportConfig.customPayloadBuilder = "ScopedLabsAccessControlElevatorReaderExport.buildPayload";
    window.ScopedLabsExportConfig.stackReportSections = true;
  }

  if (els.topology) els.topology.addEventListener("change", syncElevatorTopologyControls);
  syncElevatorTopologyControls();

  placeElevatorReaderReportActions();
  applyShellModules();
  attachOutputShellExport();
  applyElevatorReaderScopeSeed();

  if (els.calc) {
    els.calc.addEventListener("click", (event) => {
      if (event && typeof event.preventDefault === "function") event.preventDefault();

      try {
        syncElevatorTopologyControls();
        calc();
      } catch (error) {
        console.error("Elevator Reader calculate failed:", error);
        if (els.results) {
          els.results.innerHTML = row("Error", "Calculator runtime error. Recheck elevator inputs and refresh the page if this persists.");
        }
      }
    });
  }

  if (els.reset) {
    els.reset.addEventListener("click", reset);
  }

  [
    els.topology,
    els.cars,
    els.banks,
    els.floors,
    els.mixedBankGroups,
    els.mixedCarsPerBank,
    els.mixedSeparateLocations,
    els.mixedCarsPerSeparateLocation,
    els.dcsMode,
    els.dcsCredentialPoints,
    els.dest,
    els.placement
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
    // Modern SVG visual sizing is owned by the shared planning visual module.
  }

  reset();
  // access-control-route-conflict-export-override-elevator-reader-count
  function elevator_reader_count_setRouteExportStatus(message) {
    if (typeof setExportStatus === "function") {
      setExportStatus(message);
      return;
    }

    const statusEl = els && els.exportStatus ? els.exportStatus : document.getElementById("exportStatus");
    if (statusEl) statusEl.textContent = message || "";
  }

  function elevator_reader_count_routeExportSvgDataUri(svg) {
    const raw = String(svg || "").trim();
    if (!raw) return "";
    if (raw.startsWith("data:image")) return raw;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(raw);
  }

  function elevator_reader_count_getRouteExportChartImage() {
    try {
      const svg = lastMetrics ? getElevatorReaderVisualSvg(lastMetrics, { exportMode: false }) : "";
      const image = elevator_reader_count_routeExportSvgDataUri(svg);
      if (image) return image;
    } catch (err) {
      console.warn("elevator-reader-count dark SVG export capture failed:", err);
    }

    try {
      const fallback = getElevatorReaderVisualImage(lastMetrics, { exportMode: false });
      if (fallback) return fallback;
    } catch (err) {
      console.warn("elevator-reader-count fallback export image capture failed:", err);
    }

    try {
      if (typeof getExportChartImage === "function") {
        const image = getExportChartImage();
        if (image) return image;
      }
    } catch (err) {
      console.warn("elevator-reader-count final export chart image capture failed:", err);
    }

    return "";
  }

  function elevator_reader_count_buildRouteExportPayload() {
    const engine = window.ScopedLabsExport || null;
    const cfg = window.ScopedLabsExportConfig || {};
    const localReport = typeof currentReport !== "undefined" ? currentReport : null;

    let base = null;

    if (engine && typeof engine.buildPayload === "function") {
      try {
        base = engine.buildPayload();
      } catch (err) {
        console.warn("elevator-reader-count shared export payload failed:", err);
      }
    }

    if (!base && localReport) {
      base = Object.assign({
        category: cfg.categoryLabel || "Access Control",
        categorySlug: cfg.categorySlug || "access-control",
        tool: cfg.toolLabel || "",
        toolSlug: cfg.toolSlug || "elevator-reader-count",
        assumptions: Array.isArray(cfg.assumptions) ? cfg.assumptions : [],
        meta: {}
      }, localReport);
    }

    if (!base) return null;

    const chartImage = elevator_reader_count_getRouteExportChartImage();

    return Object.assign({}, base, {
      chartImage: chartImage || base.chartImage || "",
      printLowInkChart: true
    });
  }

  function elevator_reader_count_openRouteExportReport(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    const engine = window.ScopedLabsExport || null;

    if (!engine || typeof engine.openReportWindow !== "function") {
      elevator_reader_count_setRouteExportStatus("Export engine is still loading. Try again in a moment.");
      return false;
    }

    const payload = elevator_reader_count_buildRouteExportPayload();

    if (!payload) {
      elevator_reader_count_setRouteExportStatus("Run the calculator before exporting a report.");
      return false;
    }

    const opened = engine.openReportWindow(payload);
    elevator_reader_count_setRouteExportStatus(opened ? "Export report opened in a new tab." : "Popup blocked or export failed.");
    return opened;
  }

  function elevator_reader_count_bindRouteExportOverride() {
    const button = els && els.exportReport ? els.exportReport : document.getElementById("exportReport");
    if (!button || button.dataset.routeConflictExportBound) return;

    button.dataset.routeConflictExportBound = "elevator-reader-count";
    button.addEventListener("click", elevator_reader_count_openRouteExportReport, true);
  }

  elevator_reader_count_bindRouteExportOverride();

})();