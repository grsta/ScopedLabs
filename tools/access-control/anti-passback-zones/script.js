(() => {
  const CATEGORY = "access-control";
  const CATEGORY_LABEL = "Access Control";
  const TOOL = "anti-passback-zones";
  const TOOL_LABEL = "Anti-Passback Zones";
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:anti-passback-zones";

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
    visualCard: $("antiPassbackVisualCard"),
    scheduleCard: $("antiPassbackScheduleCard"),
    schedule: $("antiPassbackSchedule"),
    localAssistantMount: $("accessControlLocalAssistantMount"),
    flowActions: $("accessControlFlowActions"),
    reportActions: $("antiPassbackReportActions"),
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
    clearAntiPassbackSchedule();
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
      reportTitle: (els.reportTitle?.value || "").trim() || "Anti-Passback Zone Assessment",
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

  function placeAntiPassbackReportActions() {
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

    if (visuals && typeof visuals.renderAntiPassback === "function") {
      return visuals.renderAntiPassback({
        card: els.visualCard,
        wrap: els.chartWrap,
        target: els.chart,
        metrics
      });
    }

    return false;
  }

  function getAntiPassbackVisualImage(metrics, options = {}) {
    const visuals = planningVisuals();
    if (!metrics || !visuals || typeof visuals.buildAntiPassbackSvg !== "function") return "";

    if (typeof visuals.svgToDataUri === "function") {
      return visuals.svgToDataUri(visuals.buildAntiPassbackSvg(metrics, Object.assign({ exportMode: true }, options)));
    }

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(visuals.buildAntiPassbackSvg(metrics, Object.assign({ exportMode: true }, options)));
  }

  function clearAntiPassbackSchedule() {
    if (els.schedule) els.schedule.innerHTML = "";
    if (els.scheduleCard) els.scheduleCard.hidden = true;
  }

  function renderAntiPassbackSchedule(metrics) {
    const schedule = window.ScopedLabsAccessControlDecisionSchedule;
    if (!schedule || typeof schedule.render !== "function" || !els.schedule) return false;

    const rows = [
      { group: "Zone Model", metric: "Recommended Zones", value: metrics.recommendedZones, note: "Total APB zones derived from perimeter, interior, and floor segmentation." },
      { group: "Zone Model", metric: "Perimeter / Interior / Floors", value: metrics.perimeterZones + " / " + metrics.interiorZones + " / " + metrics.floorZones, note: "Shows which part of the scope is driving the zone count." },
      { group: "Transitions", metric: "Paired Entrances", value: metrics.pairedEntrances, note: "Estimated IN/OUT reader transitions needed for the selected APB type." },
      { group: "Pressure", metric: "Complexity Index", value: metrics.complexityIndex, note: "Used to flag APB administration and nuisance-lockout pressure." },
      { group: "Pressure", metric: "Enforcement Exposure", value: metrics.enforcementExposure, note: "Higher values mean more chances for missed-read or override handling." },
      { group: "Decision", metric: "Recommended Mode", value: metrics.recommendedType, note: metrics.modeRecommendation }
    ];

    schedule.render({
      card: els.scheduleCard,
      wrap: els.schedule,
      target: els.schedule,
      title: "Anti-Passback Decision Schedule",
      summary: "Specialty-branch APB schedule for zone structure, paired transitions, and enforcement pressure.",
      status: metrics.status,
      statusDetail: metrics.operationalRisk + " operational risk",
      interpretation: metrics.interpretation,
      exportTableTitle: "Anti-Passback Decision Schedule",
      tableDataAttr: 'data-apb-summary="true" data-access-control-decision-schedule="true"',
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

  function publishAntiPassbackSummaryContribution(metrics) {
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
          recommendedZones: metrics.recommendedZones,
          pairedEntrances: metrics.pairedEntrances,
          complexityIndex: metrics.complexityIndex,
          operationalRisk: metrics.operationalRisk,
          recommendedType: metrics.recommendedType
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
    return getAntiPassbackVisualImage(lastMetrics);
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
        { label: "Zone Strategy", value: els.strategy.options[els.strategy.selectedIndex]?.text || els.strategy.value },
        { label: "APB Type", value: els.type.options[els.type.selectedIndex]?.text || els.type.value }
      ],
      outputs,
      assumptions: getAssumptions(),
      chartImage: getExportChartImage(),
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
            <img src="${payload.chartImage}" alt="Anti-Passback Zones chart">
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
          ScopedLabs outputs are planning aids only and do not replace formal engineering review, code compliance review, site-specific validation, manufacturer documentation, controller-specific rule testing, or operational policy review.
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

    render([
      row("Recommended Zones", zoneBreakdown.total),
      row("Perimeter Zones", zoneBreakdown.perimeterZones),
      row("Interior Zones", zoneBreakdown.interiorZones),
      row("Floor Segments", zoneBreakdown.floorZones),
      row("Suggested Paired Entrances (IN/OUT)", pairedEntrances),
      row("APB Complexity Index", complexityIndex),
      row("Operational Risk", operationalRisk),
      row("Recommended Enforcement Mode", recommendedType),
      row("Design Guidance", modeRecommendation),
      row("Engineering Interpretation", interpretation)
    ]);

    lastMetrics = {
      recommendedZones: zoneBreakdown.total,
      perimeterZones: zoneBreakdown.perimeterZones,
      interiorZones: zoneBreakdown.interiorZones,
      floorZones: zoneBreakdown.floorZones,
      pairedEntrances,
      complexityIndex,
      enforcementExposure,
      operationalRisk,
      recommendedType,
      modeRecommendation,
      interpretation,
      strategy,
      strategyLabel: els.strategy.options[els.strategy.selectedIndex]?.text || strategy,
      type,
      typeLabel: els.type.options[els.type.selectedIndex]?.text || type,
      status: operationalRisk === "HIGH" ? "RISK" : operationalRisk === "MODERATE" ? "WATCH" : "HEALTHY"
    };

    renderOutputVisual(lastMetrics);
    renderAntiPassbackSchedule(lastMetrics);
    renderLocalAssistant(lastMetrics);
    publishAntiPassbackSummaryContribution(lastMetrics);

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
    if (els.entrances) els.entrances.value = 6;
    if (els.interiorAreas) els.interiorAreas.value = 4;
    if (els.floors) els.floors.value = 2;
    if (els.strategy) els.strategy.value = "minimal";
    if (els.type) els.type.value = "soft";

    resetResults("Enter values and press Calculate.");
  }

  placeAntiPassbackReportActions();
  applyShellModules();
  attachOutputShellExport();

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
    // Modern SVG visual sizing is owned by the shared planning visual module.
  }

  resetResults();
})();