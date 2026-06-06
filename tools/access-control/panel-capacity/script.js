(() => {
  "use strict";

  const CATEGORY = "access-control";
  const CATEGORY_LABEL = "Access Control";
  const STEP = "panel-capacity";
  const TOOL_LABEL = "Panel Capacity Planner";
  const LANE = "v1";
  const PREVIOUS_STEP = "lock-power-budget";
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:panel-capacity";

  const FLOW_KEYS = {
    "fail-safe-fail-secure": "scopedlabs:pipeline:access-control:fail-safe-fail-secure",
    "reader-type-selector": "scopedlabs:pipeline:access-control:reader-type-selector",
    "lock-power-budget": "scopedlabs:pipeline:access-control:lock-power-budget",
    "panel-capacity": "scopedlabs:pipeline:access-control:panel-capacity",
    "access-level-sizing": "scopedlabs:pipeline:access-control:access-level-sizing"
  };

  const $ = (id) => document.getElementById(id);

  let chart = null;
  let currentReport = null;
  let lastMetrics = null;

  const els = {
    doors: $("doors"),
    readersPerDoor: $("readersPerDoor"),
    inputsPerDoor: $("inputsPerDoor"),
    outputsPerDoor: $("outputsPerDoor"),
    baseDoors: $("baseDoors"),
    expDoors: $("expDoors"),
    maxExp: $("maxExp"),
    spare: $("spare"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    chart: $("chart"),
    chartWrap: $("chartWrap"),
    visualCard: $("panelCapacityVisualCard"),
    scheduleCard: $("panelCapacityScheduleCard"),
    schedule: $("panelCapacitySchedule"),
    nextWrap: $("continue-wrap"),
    nextBtn: $("continue"),
    flowNote: $("flow-note"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard"),
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

  function numberValue(el) {
    const n = Number(el?.value);
    return Number.isFinite(n) ? n : 0;
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

  // access-control-panel-capacity-compact-schedule-024
  function scheduleCell(value) {
    return escapeHtml(value === undefined || value === null ? "" : String(value));
  }

  function scheduleStatusChip(status) {
    const normalized = String(status || "HEALTHY").toUpperCase();
    const tone = normalized === "RISK" ? "is-risk" : normalized === "WATCH" ? "is-watch" : "is-healthy";
    return '<span class="panel-capacity-status-chip ' + tone + '">' + scheduleCell(normalized) + '</span>';
  }

  function scheduleRow(group, metric, value, note) {
    return '<tr><td>' + scheduleCell(group) + '</td><td>' + scheduleCell(metric) + '</td><td>' + value + '</td><td>' + scheduleCell(note) + '</td></tr>';
  }

  function renderCapacitySchedule(metrics = {}) {
    if (!els.schedule || !els.scheduleCard) return false;

    const loadPct = numericMetric(metrics.loadPct, 0);
    const expansionPct = numericMetric(metrics.expansionPct, 0);
    const status = String(metrics.status || getStatus(loadPct)).toUpperCase();
    const rows = [
      scheduleRow("Architecture", "Panels Required", scheduleCell(metrics.panels), "Controller bays needed for target door count."),
      scheduleRow("Architecture", "Expansion Modules", scheduleCell(metrics.expansions), "Expansion boards consumed across the planned panels."),
      scheduleRow("Architecture", "Door Capacity", scheduleCell(metrics.panelCapacity), "Total panel door capacity after expansion assumptions."),
      scheduleRow("Demand", "Target Doors", scheduleCell(metrics.targetDoors), "Door count after applying spare growth margin."),
      scheduleRow("Demand", "Readers / I/O", scheduleCell(metrics.readers) + " / " + scheduleCell(metrics.totalInputs) + " / " + scheduleCell(metrics.totalOutputs), "Readers, inputs, and outputs for field coordination."),
      scheduleRow("Reserve", "Spare Doors", scheduleCell(metrics.spareDoors), "Remaining door capacity after current door count."),
      scheduleRow("Pressure", "System Load", scheduleCell(loadPct.toFixed(0)) + "%", "Watch threshold begins above 65%; risk begins above 85%."),
      scheduleRow("Pressure", "Expansion Pressure", scheduleCell(expansionPct.toFixed(0)) + "%", "Expansion slot consumption across the controller group."),
      scheduleRow("Decision", "Status", scheduleStatusChip(status), status === "RISK" ? "Split the system or add controller capacity." : status === "WATCH" ? "Plan growth paths before future adds consume reserve." : "Architecture has practical growth margin.")
    ];

    els.schedule.innerHTML = '<table class="panel-capacity-summary-table" data-panel-capacity-summary-table="true"><thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead><tbody>' + rows.join("") + '</tbody></table>';
    els.scheduleCard.hidden = false;
    return true;
  }

  function clearCapacitySchedule() {
    if (els.schedule) els.schedule.innerHTML = "";
    if (els.scheduleCard) els.scheduleCard.hidden = true;
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
    if (document.body?.dataset?.tier === "pro") return true;
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
    clearCapacitySchedule();
  }

  function showContinue() {
    if (els.nextWrap) els.nextWrap.style.display = "flex";
    if (els.nextBtn) els.nextBtn.disabled = false;
  }

  function hideContinue() {
    if (els.nextWrap) els.nextWrap.style.display = "none";
    if (els.nextBtn) els.nextBtn.disabled = true;
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
      setExportStatus("Run calculation to enable export.");
      return;
    }

    setExportStatus("Calculation ready. Open Export Report or Save Snapshot.");
  }

  function getReportMeta() {
    return {
      reportTitle: (els.reportTitle?.value || "").trim() || "Panel Capacity Planner Assessment",
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

  function getChartImage() {
    try {
      if (chart && typeof chart.toBase64Image === "function") {
        return chart.toBase64Image("image/png", 1);
      }
    } catch {}

    return "";
  }

    function numericMetric(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clampMetric(value, min, max) {
    return Math.max(min, Math.min(max, numericMetric(value, min)));
  }

  function svgDataUri(svg) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(String(svg || ""));
  }

  function buildPanelCapacityVisualSvg(metrics = {}, options = {}) {
    // PANEL_CAPACITY_CAD_ARCHITECTURE_MAP_024
    const exportMode = !!options.exportMode;
    const width = 1120;
    const height = 500;
    const loadPct = clampMetric(metrics.loadPct, 0, 140);
    const expansionPct = clampMetric(metrics.expansionPct, 0, 120);
    const panels = Math.max(0, Math.round(numericMetric(metrics.panels, 0)));
    const expansions = Math.max(0, Math.round(numericMetric(metrics.expansions, 0)));
    const readers = Math.max(0, Math.round(numericMetric(metrics.readers, 0)));
    const totalInputs = Math.max(0, Math.round(numericMetric(metrics.totalInputs, 0)));
    const totalOutputs = Math.max(0, Math.round(numericMetric(metrics.totalOutputs, 0)));
    const targetDoors = Math.max(0, Math.round(numericMetric(metrics.targetDoors, 0)));
    const panelCapacity = Math.max(0, Math.round(numericMetric(metrics.panelCapacity, 0)));
    const spareDoors = Math.max(0, Math.round(numericMetric(metrics.spareDoors, 0)));
    const maxExp = Math.max(1, Math.round(numericMetric(metrics.maxExp, 1)));
    const status = String(metrics.status || getStatus(loadPct)).toUpperCase();

    const palette = {
      bg: exportMode ? "#ffffff" : "rgba(0,0,0,0)",
      panel: exportMode ? "#f8fbf8" : "rgba(4,14,10,.78)",
      card: exportMode ? "#ffffff" : "rgba(6,18,12,.72)",
      block: exportMode ? "#f5faf7" : "rgba(9,31,19,.86)",
      text: exportMode ? "#101715" : "rgba(238,255,244,.95)",
      muted: exportMode ? "#54615d" : "rgba(203,213,225,.72)",
      grid: exportMode ? "#dce8e1" : "rgba(125,255,158,.13)",
      lineSoft: exportMode ? "#b8cabe" : "rgba(125,255,158,.24)",
      lineStrong: exportMode ? "#668273" : "rgba(180,255,200,.52)",
      green: exportMode ? "#1f9d57" : "rgba(125,255,158,.88)",
      amber: exportMode ? "#b7791f" : "rgba(255,204,102,.92)",
      amberSoft: exportMode ? "#fff4d8" : "rgba(255,204,102,.13)",
      red: exportMode ? "#b42318" : "rgba(255,105,105,.9)",
      redSoft: exportMode ? "#ffe2df" : "rgba(255,105,105,.14)"
    };

    palette.statusColor = status === "RISK" ? palette.red : status === "WATCH" ? palette.amber : palette.green;
    palette.statusSoft = status === "RISK" ? palette.redSoft : status === "WATCH" ? palette.amberSoft : exportMode ? "#e7f8ee" : "rgba(125,255,158,.12)";

    function esc(value) {
      return escapeHtml(value === undefined || value === null ? "" : String(value));
    }

    function metricChip(x, y, label, value, tone, w = 190) {
      const color = tone === "status" ? palette.statusColor : tone === "amber" ? palette.amber : palette.green;
      const fill = tone === "status" ? palette.statusSoft : tone === "amber" ? palette.amberSoft : palette.card;
      return [
        '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="46" rx="10" fill="' + fill + '" stroke="' + color + '" stroke-width="1"/>',
        '<text x="' + (x + 12) + '" y="' + (y + 18) + '" fill="' + palette.muted + '" font-size="10" font-weight="800" font-family="Inter,Arial,sans-serif">' + esc(label).toUpperCase() + '</text>',
        '<text x="' + (x + 12) + '" y="' + (y + 36) + '" fill="' + color + '" font-size="14" font-weight="900" font-family="Inter,Arial,sans-serif">' + esc(value) + '</text>'
      ].join("");
    }

    function expansionStrip(x, y, active, maxSlots) {
      const slots = Math.max(1, Math.min(8, maxSlots));
      const gap = 4;
      const slotW = Math.max(7, Math.min(12, Math.floor((116 - ((slots - 1) * gap)) / slots)));
      const used = Math.max(0, Math.min(slots, active));
      const parts = [];

      for (let i = 0; i < slots; i += 1) {
        const sx = x + i * (slotW + gap);
        const isUsed = i < used;
        parts.push('<rect x="' + sx + '" y="' + y + '" width="' + slotW + '" height="19" rx="3" fill="' + (isUsed ? palette.amberSoft : palette.card) + '" stroke="' + (isUsed ? palette.amber : palette.lineSoft) + '" stroke-width="1"/>');
      }

      return parts.join("");
    }

    function panelModule(x, y, index, activeExp, maxSlots) {
      return [
        '<g aria-label="Panel ' + (index + 1) + ' controller bay">',
        '<rect x="' + x + '" y="' + y + '" width="164" height="138" rx="12" fill="' + palette.block + '" stroke="' + palette.lineStrong + '" stroke-width="1.4"/>',
        '<path d="M ' + (x + 16) + ' ' + (y + 30) + ' H ' + (x + 148) + ' M ' + (x + 16) + ' ' + (y + 62) + ' H ' + (x + 148) + ' M ' + (x + 16) + ' ' + (y + 96) + ' H ' + (x + 148) + '" stroke="' + palette.grid + '" stroke-width="1"/>',
        '<text x="' + (x + 18) + '" y="' + (y + 23) + '" fill="' + palette.text + '" font-size="14" font-weight="900" font-family="Inter,Arial,sans-serif">PANEL ' + (index + 1) + '</text>',
        '<text x="' + (x + 18) + '" y="' + (y + 49) + '" fill="' + palette.muted + '" font-size="10" font-weight="800" font-family="Inter,Arial,sans-serif">CTRL BAY</text>',
        '<circle cx="' + (x + 142) + '" cy="' + (y + 43) + '" r="5" fill="' + palette.card + '" stroke="' + palette.green + '" stroke-width="1.4"/>',
        '<circle cx="' + (x + 142) + '" cy="' + (y + 75) + '" r="5" fill="' + palette.card + '" stroke="' + palette.lineStrong + '" stroke-width="1.4"/>',
        '<text x="' + (x + 18) + '" y="' + (y + 82) + '" fill="' + palette.muted + '" font-size="10" font-weight="800" font-family="Inter,Arial,sans-serif">EXPANSION SLOTS</text>',
        expansionStrip(x + 18, y + 96, activeExp, maxSlots),
        '<text x="' + (x + 18) + '" y="' + (y + 127) + '" fill="' + palette.muted + '" font-size="10" font-weight="800" font-family="Inter,Arial,sans-serif">' + activeExp + '/' + maxSlots + ' EXP USED</text>',
        '</g>'
      ].join("");
    }

    function loadBank(x, y) {
      return [
        '<g aria-label="Reader and I/O load bank">',
        '<rect x="' + x + '" y="' + y + '" width="216" height="180" rx="13" fill="' + palette.block + '" stroke="' + palette.lineStrong + '" stroke-width="1.4"/>',
        '<text x="' + (x + 18) + '" y="' + (y + 30) + '" fill="' + palette.text + '" font-size="14" font-weight="900" font-family="Inter,Arial,sans-serif">FIELD DEMAND</text>',
        '<text x="' + (x + 18) + '" y="' + (y + 54) + '" fill="' + palette.muted + '" font-size="10" font-weight="800" font-family="Inter,Arial,sans-serif">READERS / INPUTS / OUTPUTS</text>',
        '<path d="M ' + (x + 24) + ' ' + (y + 88) + ' H ' + (x + 192) + ' M ' + (x + 24) + ' ' + (y + 122) + ' H ' + (x + 192) + ' M ' + (x + 24) + ' ' + (y + 156) + ' H ' + (x + 192) + '" stroke="' + palette.grid + '" stroke-width="1"/>',
        '<text x="' + (x + 32) + '" y="' + (y + 92) + '" fill="' + palette.green + '" font-size="13" font-weight="900" font-family="Inter,Arial,sans-serif">' + readers + ' READERS</text>',
        '<text x="' + (x + 32) + '" y="' + (y + 126) + '" fill="' + palette.text + '" font-size="13" font-weight="900" font-family="Inter,Arial,sans-serif">' + totalInputs + ' INPUTS</text>',
        '<text x="' + (x + 32) + '" y="' + (y + 160) + '" fill="' + palette.text + '" font-size="13" font-weight="900" font-family="Inter,Arial,sans-serif">' + totalOutputs + ' OUTPUTS</text>',
        '</g>'
      ].join("");
    }

    function pressureScale(x, y, label, pct, tone) {
      const color = tone === "status" ? palette.statusColor : palette.amber;
      const markerX = x + Math.min(1, pct / 100) * 292;

      return [
        '<g aria-label="' + esc(label) + ' pressure scale">',
        '<text x="' + x + '" y="' + (y - 14) + '" fill="' + palette.muted + '" font-size="10" font-weight="800" font-family="Inter,Arial,sans-serif">' + esc(label).toUpperCase() + '</text>',
        '<line x1="' + x + '" y1="' + y + '" x2="' + (x + 292) + '" y2="' + y + '" stroke="' + palette.lineSoft + '" stroke-width="2"/>',
        '<line x1="' + (x + 190) + '" y1="' + (y - 10) + '" x2="' + (x + 190) + '" y2="' + (y + 10) + '" stroke="' + palette.amber + '" stroke-width="1" stroke-dasharray="4 4"/>',
        '<line x1="' + (x + 248) + '" y1="' + (y - 10) + '" x2="' + (x + 248) + '" y2="' + (y + 10) + '" stroke="' + palette.red + '" stroke-width="1" stroke-dasharray="4 4"/>',
        '<circle cx="' + markerX.toFixed(1) + '" cy="' + y + '" r="7" fill="' + color + '" stroke="' + palette.card + '" stroke-width="2"/>',
        '<text x="' + (x + 308) + '" y="' + (y + 5) + '" fill="' + color + '" font-size="13" font-weight="900" font-family="Inter,Arial,sans-serif">' + pct.toFixed(0) + '%</text>',
        '</g>'
      ].join("");
    }

    const displayPanels = Math.max(1, Math.min(3, panels || 1));
    const panelParts = [];

    for (let i = 0; i < displayPanels; i += 1) {
      const activeExp = Math.max(0, Math.min(maxExp, expansions - (i * maxExp)));
      panelParts.push(panelModule(74 + i * 190, 150, i, activeExp, maxExp));
    }

    if (panels > displayPanels) {
      panelParts.push('<text x="' + (74 + displayPanels * 190 + 8) + '" y="218" fill="' + palette.muted + '" font-size="12" font-weight="900" font-family="Inter,Arial,sans-serif">+' + (panels - displayPanels) + ' MORE</text>');
    }

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="CAD-style panel capacity architecture map">',
      '<rect x="0" y="0" width="' + width + '" height="' + height + '" rx="18" fill="' + palette.bg + '"/>',
      '<rect x="24" y="22" width="1072" height="438" rx="18" fill="' + palette.panel + '" stroke="' + palette.lineSoft + '"/>',
      '<path d="M 54 78 H 1066 M 54 126 H 1066 M 54 334 H 1066 M 54 388 H 1066 M 54 432 H 1066" stroke="' + palette.grid + '" stroke-width="1"/>',
      '<path d="M 94 48 V 438 M 690 48 V 438 M 938 48 V 438" stroke="' + palette.grid + '" stroke-width="1"/>',
      '<text x="54" y="60" fill="' + palette.text + '" font-size="18" font-weight="900" font-family="Inter,Arial,sans-serif">Panel Architecture Map</text>',
      '<text x="54" y="88" fill="' + palette.muted + '" font-size="12" font-weight="700" font-family="Inter,Arial,sans-serif">Controller bay → expansion slots → field reader/I/O demand → spare door capacity.</text>',
      '<rect x="914" y="50" width="138" height="38" rx="10" fill="' + palette.statusSoft + '" stroke="' + palette.statusColor + '"/>',
      '<text x="934" y="74" fill="' + palette.statusColor + '" font-size="13" font-weight="900" font-family="Inter,Arial,sans-serif">' + esc(status) + ' · ' + loadPct.toFixed(0) + '%</text>',
      '<text x="74" y="134" fill="' + palette.green + '" font-size="10" font-weight="900" font-family="Inter,Arial,sans-serif">CONTROLLER GROUP</text>',
      panelParts.join(""),
      '<line x1="682" y1="212" x2="846" y2="212" stroke="' + palette.lineStrong + '" stroke-width="2"/>',
      '<line x1="682" y1="252" x2="846" y2="252" stroke="' + palette.lineSoft + '" stroke-width="1.4" stroke-dasharray="6 6"/>',
      '<text x="710" y="192" fill="' + palette.green + '" font-size="10" font-weight="900" font-family="Inter,Arial,sans-serif">I/O BUS</text>',
      loadBank(856, 150),
      pressureScale(74, 358, "System load", loadPct, "status"),
      pressureScale(454, 358, "Expansion pressure", expansionPct, "amber"),
      metricChip(74, 400, "Target / Capacity", targetDoors + ' / ' + panelCapacity, "green", 178),
      metricChip(266, 400, "Spare Doors", spareDoors, "green", 160),
      metricChip(440, 400, "Panels / Expansions", panels + ' / ' + expansions, "amber", 190),
      metricChip(644, 400, "Readers / I-O", readers + ' / ' + totalInputs + '-' + totalOutputs, "green", 178),
      metricChip(836, 400, "Status", status, "status", 160),
      '</svg>'
    ].join("");
  }

    function renderOutputVisual(metrics) {
    const svg = buildPanelCapacityVisualSvg(metrics);
    const shell = outputShell();

    if (shell && typeof shell.showVisual === "function") {
      return shell.showVisual({
        card: els.visualCard,
        wrap: els.chartWrap,
        target: els.chart,
        html: svg
      });
    }

    if (els.chart) els.chart.innerHTML = svg;
    if (els.chartWrap) els.chartWrap.hidden = false;
    if (els.visualCard) els.visualCard.hidden = false;
    return true;
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

  function getPanelCapacityVisualImage(metrics, options = {}) {
    if (!metrics) return getChartImage();
    return svgDataUri(buildPanelCapacityVisualSvg(metrics, Object.assign({ exportMode: true }, options)));
  }

  function getExportChartImage() {
    return getPanelCapacityVisualImage(lastMetrics, { exportMode: true });
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
            <img src="${payload.chartImage}" alt="Panel Capacity Planner chart">
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
    @media (max-width:760px){
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
          ScopedLabs outputs are planning aids only and do not replace formal engineering review, manufacturer documentation, listed hardware requirements, platform capacity validation, licensing review, or site-specific controller architecture review.
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

  function loadFlowContext() {
    if (!els.flowNote) return;
    els.flowNote.hidden = true;
    els.flowNote.innerHTML = "";
  }

  function collectVisibleResults() {
    if (!els.results) return [];

    return Array.from(els.results.querySelectorAll(".result-row"))
      .map((rowEl) => {
        const label = rowEl.querySelector(".result-label")?.textContent?.trim() || "";
        const value = rowEl.querySelector(".result-value")?.textContent?.trim() || "";
        return { label, value };
      })
      .filter((item) => item.label && item.value);
  }

  function getSummaryFromResults(outputs) {
    const panels = outputs.find((x) => x.label === "Panels Required")?.value || "";
    const expansions = outputs.find((x) => x.label === "Expansion Modules")?.value || "";
    const status = outputs.find((x) => x.label === "Status")?.value || "";

    return `Estimated architecture requires ${panels || "N/A"} panels with ${expansions || "N/A"} expansion modules and an overall status of ${status || "unknown"}.`;
  }

  function getInterpretationFromResults(outputs) {
    return outputs.find((x) => x.label === "Engineering Insight")?.value || "";
  }

  function getStatusFromResults(outputs) {
    const status = (outputs.find((x) => x.label === "Status")?.value || "").toUpperCase();

    if (status === "RISK") return "RISK";
    if (status === "WATCH") return "WATCH";
    return "HEALTHY";
  }

  function getAssumptions() {
    return [
      "Panel requirement is based on target doors including spare capacity, then compared against base and expansion door capacity.",
      "Reader totals, input totals, and output totals are planning references and should be validated against the selected controller platform.",
      "This export reflects the current on-screen tool results at the time the report was opened or saved.",
      "Final architecture should be verified against manufacturer capacity, licensing, IO limits, expansion rules, wiring topology, and owner growth expectations."
    ];
  }

  function buildCurrentReportPayload() {
    const outputs = collectVisibleResults();

    if (!outputs.length) return null;

    return {
      reportId: makeReportId("SL-ACC-PANEL"),
      generatedAt: new Date().toISOString(),
      category: CATEGORY_LABEL,
      categorySlug: CATEGORY,
      tool: TOOL_LABEL,
      toolSlug: STEP,
      status: getStatusFromResults(outputs),
      summary: getSummaryFromResults(outputs),
      interpretation: getInterpretationFromResults(outputs),
      inputs: [
        { label: "Doors", value: String(els.doors.value) },
        { label: "Readers per Door", value: els.readersPerDoor.options[els.readersPerDoor.selectedIndex]?.text || els.readersPerDoor.value },
        { label: "Inputs per Door", value: String(els.inputsPerDoor.value) },
        { label: "Outputs per Door", value: String(els.outputsPerDoor.value) },
        { label: "Base Doors", value: String(els.baseDoors.value) },
        { label: "Expansion Doors", value: String(els.expDoors.value) },
        { label: "Max Expansions", value: String(els.maxExp.value) },
        { label: "Spare %", value: String(els.spare.value) }
      ],
      outputs,
      assumptions: getAssumptions(),
      chartImage: getExportChartImage(),
      meta: getReportMeta()
    };
  }


  function outputShell() {
    return window.ScopedLabsAccessControlOutputShell || null;
  }

  function attachOutputShellExport() {
    const shell = outputShell();

    if (shell && typeof shell.register === "function") {
      shell.register(STEP, {
        getChartImage: getExportChartImage
      });
    }

    if (shell && typeof shell.attachExportGetter === "function") {
      shell.attachExportGetter(STEP, window.ScopedLabsExportConfig);
      return true;
    }

    if (window.ScopedLabsExportConfig) {
      window.ScopedLabsExportConfig.getChartImage = getExportChartImage;
      return true;
    }

    return false;
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

  function renderLocalAssistant(core) {
    const assistant = window.ScopedLabsLocalAssistant;
    const adapters = window.ScopedLabsAccessControlToolAssistantAdapters;
    const adapter = adapters && typeof adapters.getAdapter === "function"
      ? adapters.getAdapter(STEP)
      : null;

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

  function clearAnalysis() {
    if (window.ScopedLabsAnalyzer && els.analysis) {
      ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    } else if (els.analysis) {
      els.analysis.innerHTML = "";
      els.analysis.style.display = "none";
    }
  }

  function invalidate(message = "Run calculation.") {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["access-level-sizing"]);
    } catch {}

    destroyChart();
    hideContinue();
    clearLocalAssistant();
    clearAnalysis();

    if (els.results) {
      els.results.innerHTML = `<div class="muted">${escapeHtml(message)}</div>`;
    }

    lastMetrics = null;
    currentReport = null;
    updateExportControls();
    loadFlowContext();
  }

  function reset() {
    if (els.doors) els.doors.value = "24";
    if (els.readersPerDoor) els.readersPerDoor.value = "1";
    if (els.inputsPerDoor) els.inputsPerDoor.value = "2";
    if (els.outputsPerDoor) els.outputsPerDoor.value = "1";
    if (els.baseDoors) els.baseDoors.value = "4";
    if (els.expDoors) els.expDoors.value = "2";
    if (els.maxExp) els.maxExp.value = "8";
    if (els.spare) els.spare.value = "20";

    invalidate("Run calculation.");
  }

  function getStatus(loadPct) {
    if (loadPct > 85) return "RISK";
    if (loadPct > 65) return "WATCH";
    return "HEALTHY";
  }

  function getInsight(status) {
    if (status === "RISK") {
      return "Panel architecture is too dense. Expansion paths are near exhaustion, which increases upgrade cost and reduces flexibility for growth.";
    }

    if (status === "WATCH") {
      return "System is serviceable but nearing expansion limits. Plan for additional panels or segmentation before future adds consume remaining capacity.";
    }

    return "Panel architecture is balanced with solid remaining growth margin and manageable expansion pressure.";
  }

  function getGuidance(status) {
    if (status === "RISK") {
      return "Add controller capacity or split the system into additional panel groups before deployment. Do not build a new system at this density unless there is a clear expansion plan.";
    }

    if (status === "WATCH") {
      return "Design is workable, but future expansion should be planned now. Leave physical space, pathway capacity, and licensing room for the next growth phase.";
    }

    return "Architecture is healthy. Existing panel and expansion assumptions leave practical room for growth and normal field changes.";
  }

  function renderLegacyChartFallback(metrics) {
    return renderOutputVisual(metrics);
  }

  function calc() {
    const doors = numberValue(els.doors);
    const readersPerDoor = numberValue(els.readersPerDoor);
    const inputsPerDoor = numberValue(els.inputsPerDoor);
    const outputsPerDoor = numberValue(els.outputsPerDoor);
    const spare = numberValue(els.spare);
    const base = numberValue(els.baseDoors);
    const exp = numberValue(els.expDoors);
    const maxExp = numberValue(els.maxExp);

    if (
      !Number.isFinite(doors) || doors <= 0 ||
      !Number.isFinite(readersPerDoor) || readersPerDoor <= 0 ||
      !Number.isFinite(inputsPerDoor) || inputsPerDoor < 0 ||
      !Number.isFinite(outputsPerDoor) || outputsPerDoor < 0 ||
      !Number.isFinite(spare) || spare < 0 ||
      !Number.isFinite(base) || base <= 0 ||
      !Number.isFinite(exp) || exp <= 0 ||
      !Number.isFinite(maxExp) || maxExp <= 0
    ) {
      render([row("Error", "Enter valid values for all inputs.")]);
      destroyChart();
      hideContinue();
      lastMetrics = null;
      currentReport = null;
      updateExportControls();
      return;
    }

    const targetDoors = Math.ceil(doors * (1 + spare / 100));
    const perPanelCapacity = base + (maxExp * exp);
    const panels = Math.max(1, Math.ceil(targetDoors / perPanelCapacity));

    const baseCapacityTotal = panels * base;
    const remainingAfterBase = Math.max(0, targetDoors - baseCapacityTotal);
    const expansions = Math.min(panels * maxExp, Math.ceil(remainingAfterBase / exp));

    const panelCapacity = panels * perPanelCapacity;
    const spareDoors = Math.max(0, panelCapacity - doors);
    const readers = Math.ceil(doors * readersPerDoor);
    const totalInputs = Math.ceil(doors * inputsPerDoor);
    const totalOutputs = Math.ceil(doors * outputsPerDoor);

    const loadPct = (targetDoors / panelCapacity) * 100;
    const expansionPct = panels > 0 && maxExp > 0 ? (expansions / (panels * maxExp)) * 100 : 0;

    const status = getStatus(loadPct);
    const insight = getInsight(status);
    const guidance = getGuidance(status);

    render([
      row("Panels Required", panels),
      row("Expansion Modules", expansions),
      row("Panel Door Capacity", panelCapacity),
      row("Target Doors with Spare", targetDoors),
      row("Spare Door Capacity", spareDoors),
      row("Total Readers", readers),
      row("Total Inputs", totalInputs),
      row("Total Outputs", totalOutputs),
      row("System Load", `${loadPct.toFixed(0)}%`),
      row("Expansion Pressure", `${expansionPct.toFixed(0)}%`),
      row("Status", status),
      row("Design Guidance", guidance),
      row("Engineering Insight", insight)
    ]);

    lastMetrics = {
      loadPct,
      expansionPct,
      panels,
      expansions,
      readers,
      totalInputs,
      totalOutputs,
      doors,
      targetDoors,
      panelCapacity,
      spareDoors,
      status,
      base,
      exp,
      maxExp,
      spare,
      perPanelCapacity,
      baseCapacityTotal
    };

    renderOutputVisual(lastMetrics);
    renderCapacitySchedule(lastMetrics);

    if (window.ScopedLabsAnalyzer) {
      ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
        category: CATEGORY,
        step: STEP,
        lane: LANE,
        data: {
          panels,
          expansions,
          readers,
          totalInputs,
          totalOutputs,
          panelCapacity,
          targetDoors,
          spareDoors,
          loadPct,
          expansionPct,
          utilizationPct: loadPct,
          status
        }
      });
    }

    currentReport = buildCurrentReportPayload();
    renderLocalAssistant({
      status,
      doors,
      targetDoors,
      panelCapacity,
      panels,
      expansions,
      readers,
      totalInputs,
      totalOutputs,
      spareDoors,
      loadPct,
      expansionPct,
      guidance,
      insight
    });
    updateExportControls();
    showContinue();
  }

  function bindEvents() {
    if (els.calc) {
      els.calc.addEventListener("click", calc);
    }

    if (els.reset) {
      els.reset.addEventListener("click", reset);
    }

    [
      els.doors,
      els.readersPerDoor,
      els.inputsPerDoor,
      els.outputsPerDoor,
      els.baseDoors,
      els.expDoors,
      els.maxExp,
      els.spare
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", () => invalidate("Inputs changed. Press Calculate to refresh results."));
      el.addEventListener("change", () => invalidate("Inputs changed. Press Calculate to refresh results."));
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

    if (els.nextBtn) {
      els.nextBtn.addEventListener("click", () => {
        window.location.href = "/tools/access-control/access-level-sizing/";
      });
    }
  }

  function init() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    reset();
    attachOutputShellExport();
    applyShellModules();

    unlockCategoryPage();

    setTimeout(() => {
      unlockCategoryPage();
      updateExportControls();
      attachOutputShellExport();
      applyShellModules();
    }, 400);

    setTimeout(() => {
      unlockCategoryPage();
      updateExportControls();
    }, 1200);
  }

  bindEvents();
  init();
})();