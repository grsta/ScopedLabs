(() => {
  const CATEGORY = "access-control";
  const CATEGORY_LABEL = "Access Control";
  const TOOL = "door-count-planner";
  const TOOL_LABEL = "Door Count Planner";
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:door-count-planner";

  const $ = (id) => document.getElementById(id);

  let chart = null;
  let currentReport = null;
  let lastMetrics = null;

  const els = {
    perimeter: $("perimeter"),
    zones: $("zones"),
    highsec: $("highsec"),
    compliance: $("compliance"),
    bothSides: $("bothSides"),
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
    exportStatus: $("exportStatus"),
    decisionCard: $("doorCountDecisionCard"),
    scheduleWrap: $("doorCountScheduleWrap"),
    schedule: $("doorCountSchedule"),
    assistantMount: $("accessControlLocalAssistantMount"),
    flowActions: $("accessControlFlowActions"),
    reportMetadataMount: $("reportMetadataMount"),
    reportActions: $("doorCountReportActions"),
    visualCard: $("doorCountPlanningVisualCard"),
    visualWrap: $("doorCountPlanningVisualWrap"),
    visualMount: $("doorCountPlanningVisual")
  };

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
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

  function compFactor(c) {
    if (c === "moderate") return 1.15;
    if (c === "strict") return 1.35;
    return 1.0;
  }

  function showChartWrap() {
    if (els.chartWrap) els.chartWrap.hidden = false;
  }

  function hideChartWrap() {
    if (els.chartWrap) els.chartWrap.hidden = true;
  }

  function destroyChart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }

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
      reportTitle: (els.reportTitle?.value || "").trim() || "Door Count Planner Assessment",
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
    const doors = outputs.find((x) => x.label === "Total Controlled Doors")?.value || "";
    const readers = outputs.find((x) => x.label === "Estimated Reader Count")?.value || "";
    const status = outputs.find((x) => x.label === "System Status")?.value || "";

    return `Estimated system size is ${doors || "N/A"} controlled doors with ${readers || "N/A"} readers and an overall status of ${status || "unknown"}.`;
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
      "Controlled door count is estimated from perimeter demand, interior segmentation, high-security additions, and compliance posture.",
      "Reader count is adjusted separately based on whether both sides are controlled.",
      "This export reflects the current on-screen tool results at the time the report was opened or saved.",
      "Final door counts should be verified against actual openings, egress requirements, owner security policy, platform licensing, and field conditions."
    ];
  }

  function getChartImage() {
    return getDoorCountPlanningVisualImage();
  }

  function getExportChartImage() {
    return getDoorCountPlanningVisualImage();
  }

  function buildCurrentReportPayload() {
    const outputs = collectVisibleResults();

    if (!outputs.length) return null;

    const status = lastMetrics?.status || getStatusFromResults(outputs);
    const summary = lastMetrics?.summary || getSummaryFromResults(outputs);
    const interpretation = lastMetrics?.insight || getInterpretationFromResults(outputs);

    return {
      reportId: makeReportId("SL-ACC-DOORCOUNT"),
      generatedAt: new Date().toISOString(),
      category: CATEGORY_LABEL,
      categorySlug: CATEGORY,
      tool: TOOL_LABEL,
      toolSlug: TOOL,
      status,
      summary,
      interpretation,
      contributionType: "supplemental",
      summaryGroup: "Supplemental Planning Tools",
      metrics: lastMetrics || {},
      inputs: [
        { label: "Perimeter Entrances", value: String(els.perimeter.value) },
        { label: "Interior Zones / Departments", value: String(els.zones.value) },
        { label: "High-Security Areas", value: String(els.highsec.value) },
        { label: "Compliance Level", value: els.compliance.options[els.compliance.selectedIndex]?.text || els.compliance.value },
        { label: "Control Both Sides?", value: els.bothSides.options[els.bothSides.selectedIndex]?.text || els.bothSides.value }
      ],
      outputs,
      assumptions: getAssumptions(),
      chartImage: getDoorCountPlanningVisualImage(),
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
            <img src="${payload.chartImage}" alt="Door Count Planner chart">
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
          ScopedLabs outputs are planning aids only and do not replace formal engineering review, code compliance review, site-specific validation, egress review, manufacturer documentation, or final project takeoff.
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


  // access-control-door-count-output-contract-022-modern-visual
  function doorCountStatusFromComplexity(complexityIndex) {
    return getStatus(complexityIndex);
  }

  function recommendedDoorCountActions(status) {
    if (status === "RISK") {
      return [
        "Split controller or panel planning into smaller groups before final layout.",
        "Review high-security and compliance-driven openings with operations before installation scope is locked.",
        "Carry this result into the Access Control summary as a supplemental planning pressure item."
      ];
    }

    if (status === "WATCH") {
      return [
        "Document door groups, segmentation boundaries, and reader assumptions before procurement.",
        "Review controller placement and cable routing before final panel capacity decisions.",
        "Carry this result into the Access Control summary as supplemental scope context."
      ];
    }

    return [
      "Document the controlled-door and reader count assumptions in the project handoff.",
      "Confirm whether future expansion, high-security areas, or compliance requirements change the count.",
      "Carry this result into the Access Control summary as supplemental scope context."
    ];
  }


  // access-control-door-count-modern-visual-022
  function renderDoorCountPlanningVisual(metrics = {}) {
    const visuals = window.ScopedLabsAccessControlPlanningVisuals;
    if (!visuals || typeof visuals.renderDoorCount !== "function") return false;

    return visuals.renderDoorCount({
      card: els.visualCard,
      wrap: els.visualWrap,
      target: els.visualMount,
      metrics
    });
  }

  function clearDoorCountPlanningVisual() {
    const visuals = window.ScopedLabsAccessControlPlanningVisuals;
    if (visuals && typeof visuals.hide === "function") {
      visuals.hide({ card: els.visualCard, wrap: els.visualWrap, target: els.visualMount });
      return;
    }

    if (els.visualMount) els.visualMount.innerHTML = "";
    if (els.visualWrap) els.visualWrap.hidden = true;
    if (els.visualCard) els.visualCard.hidden = true;
  }

  function getDoorCountPlanningVisualImage() {
    const visuals = window.ScopedLabsAccessControlPlanningVisuals;
    if (!visuals || typeof visuals.getDataUri !== "function") return "";
    return visuals.getDataUri(els.visualMount);
  }

  function renderDoorCountPlanningSchedule(metrics = {}) {
    const status = metrics.status || doorCountStatusFromComplexity(metrics.complexityIndex);
    const summary = metrics.summary || "Door count planning review generated from perimeter, interior, high-security, compliance, and reader-side inputs.";
    const interpretation = metrics.insight || "Run the calculator to generate door-count planning guidance.";
    const schedule = window.ScopedLabsAccessControlDecisionSchedule;

    const rows = [
      { group: "Inputs", metric: "Perimeter Entrances", value: metrics.perimeter, note: "Base perimeter openings included in the controlled-door estimate." },
      { group: "Inputs", metric: "Interior Zones / Departments", value: metrics.zones, note: "Interior segmentation pressure used to estimate additional controlled openings." },
      { group: "Inputs", metric: "High-Security Areas", value: metrics.highsec, note: "High-security scope adds controlled openings and management complexity." },
      { group: "Inputs", metric: "Compliance Level", value: metrics.complianceLabel, note: "Compliance posture influences segmentation pressure." },
      { group: "Inputs", metric: "Control Both Sides", value: metrics.bothSidesLabel, note: "Dual-sided control increases reader count and coordination requirements." },
      { group: "Calculated Load", metric: "Perimeter Doors", value: metrics.perimeterDoors, note: "Direct perimeter-door contribution." },
      { group: "Calculated Load", metric: "Interior Zone Doors", value: metrics.zoneBaseLabel, note: "Estimated controlled openings from interior segmentation." },
      { group: "Calculated Load", metric: "High-Security Additions", value: metrics.highsecAddLabel, note: "Estimated additions from high-security scope." },
      { group: "Calculated Load", metric: "Total Controlled Doors", value: metrics.doors, note: "Planning-level controlled-door quantity." },
      { group: "Calculated Load", metric: "Estimated Reader Count", value: metrics.readers, note: "Reader estimate after single-sided or dual-sided control assumption." },
      { group: "Decision", metric: "Complexity Index", value: metrics.complexityIndex, note: "Planning pressure indicator for scope, segmentation, and reader coordination." },
      { group: "Decision", metric: "Status", valueHtml: schedule && typeof schedule.statusChip === "function" ? schedule.statusChip(status) : status, note: status === "RISK" ? "Reduce scope complexity or split planning before final layout." : status === "WATCH" ? "Proceed with documented segmentation and controller-placement review." : "Door count is usable for the current planning scope." },
      { group: "Summary", metric: "Contribution", value: "Supplemental Planning Tools", note: "Included in Access Control summary when this non-pipeline tool is used." }
    ];

    if (schedule && typeof schedule.render === "function") {
      return schedule.render({
        card: els.decisionCard,
        wrap: els.scheduleWrap,
        target: els.schedule,
        title: (metrics.statusLabel || status) + " door-count planning pressure",
        summary,
        status,
        statusDetail: "Controlled doors: " + (metrics.doors ?? "—") + " / Readers: " + (metrics.readers ?? "—"),
        rows,
        interpretation,
        exportTableTitle: "Door Count Planning Schedule",
        tableDataAttr: 'data-door-count-summary-table="true" data-access-control-decision-schedule="true"'
      });
    }

    const html = '<table data-door-count-summary-table="true" data-export-table-title="Door Count Planning Schedule"><thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead><tbody>' + rows.map((row) => '<tr><td>' + escapeHtml(row.group) + '</td><td>' + escapeHtml(row.metric) + '</td><td>' + (row.valueHtml || escapeHtml(row.value ?? "—")) + '</td><td>' + escapeHtml(row.note) + '</td></tr>').join("") + '</tbody></table>';

    if (els.schedule) els.schedule.innerHTML = html;
    if (els.scheduleWrap) els.scheduleWrap.hidden = false;
    if (els.decisionCard) els.decisionCard.hidden = false;

    return html;
  }

  function clearDoorCountPlanningSchedule() {
    const shell = window.ScopedLabsAccessControlOutputShell;

    if (shell && typeof shell.hideVisual === "function") {
      shell.hideVisual({ card: els.decisionCard, wrap: els.scheduleWrap, target: els.schedule });
      return;
    }

    if (els.schedule) els.schedule.innerHTML = "";
    if (els.scheduleWrap) els.scheduleWrap.hidden = true;
    if (els.decisionCard) els.decisionCard.hidden = true;
  }

  function buildDoorCountAssistantFallback(metrics = {}) {
    const status = metrics.status || doorCountStatusFromComplexity(metrics.complexityIndex);

    return {
      category: CATEGORY,
      tool: TOOL,
      kicker: "Local Design Assistant",
      title: "Door Count Assistant",
      status,
      summary: metrics.summary || "Door count planning guidance is ready for this supplemental tool result.",
      sections: [
        {
          title: "Scope Pressure",
          body: metrics.insight || "Door-count pressure will appear here after calculation.",
          items: [
            "Controlled doors: " + (metrics.doors ?? "—"),
            "Readers: " + (metrics.readers ?? "—"),
            "Complexity index: " + (metrics.complexityIndex ?? "—"),
            "Status: " + status
          ]
        },
        {
          title: "Summary Role",
          body: "Door Count Planner is a supplemental Access Control tool. It is not part of the real pipeline, but its result should be available to the category summary and future Gold reporting.",
          items: [
            "Contribution type: supplemental",
            "Summary group: Supplemental Planning Tools",
            "Pipeline state: not used"
          ]
        }
      ],
      assumptionsTitle: "Planning Assumptions",
      actionsTitle: "Recommended Actions",
      assumptions: getAssumptions(),
      actions: metrics.recommendedActions || recommendedDoorCountActions(status)
    };
  }

  function renderDoorCountAssistant(metrics = {}) {
    if (!els.assistantMount) return false;

    const api = window.ScopedLabsLocalAssistant;
    if (!api || typeof api.mount !== "function") return false;

    const registry = window.ScopedLabsAccessControlToolAssistantAdapters;
    const adapter = registry && typeof registry.getAdapter === "function" ? registry.getAdapter(TOOL) : null;
    const model = adapter && typeof adapter.buildModel === "function" ? adapter.buildModel(metrics) : buildDoorCountAssistantFallback(metrics);

    return api.mount(els.assistantMount, model);
  }

  function clearDoorCountAssistant() {
    const api = window.ScopedLabsLocalAssistant;

    if (api && typeof api.clear === "function" && els.assistantMount) {
      api.clear(els.assistantMount);
      return;
    }

    if (els.assistantMount) {
      els.assistantMount.innerHTML = "";
      els.assistantMount.hidden = true;
    }
  }

  function publishDoorCountSummaryContribution(metrics = {}) {
    const contribution = {
      category: CATEGORY,
      slug: TOOL,
      title: TOOL_LABEL,
      contributionType: "supplemental",
      summaryGroup: "Supplemental Planning Tools",
      status: metrics.status || doorCountStatusFromComplexity(metrics.complexityIndex),
      summary: metrics.summary || "Door count planning result ready.",
      metrics: {
        perimeterEntrances: metrics.perimeter,
        interiorZones: metrics.zones,
        highSecurityAreas: metrics.highsec,
        complianceLevel: metrics.complianceLabel,
        controlBothSides: metrics.bothSidesLabel,
        totalControlledDoors: metrics.doors,
        estimatedReaderCount: metrics.readers,
        complexityIndex: metrics.complexityIndex
      },
      notes: [
        metrics.insight || "Door count should be verified against final scope, field conditions, door schedule, and operating requirements.",
        "Supplemental tool: included in summary when used, but not part of real pipeline state."
      ],
      updatedAt: new Date().toISOString()
    };

    window.ScopedLabsAccessControlSummaryContributions = window.ScopedLabsAccessControlSummaryContributions || {};
    window.ScopedLabsAccessControlSummaryContributions[contribution.slug] = contribution;

    try {
      localStorage.setItem("scopedlabs:access-control:summary:door-count-planner", JSON.stringify(contribution));
    } catch {}

    return contribution;
  }

  function registerDoorCountOutputShell() {
    const shell = window.ScopedLabsAccessControlOutputShell;

    if (!shell || typeof shell.register !== "function") return false;

    return shell.register(TOOL, {
      getChartImage() {
        return getDoorCountPlanningVisualImage();
      },
      attachExportGetter() {
        return false;
      }
    });
  }

  function placeDoorCountReportActions() {
    if (!els.reportMetadataMount || !els.reportActions) return false;

    const details = els.reportMetadataMount.querySelector("details.sl-report-meta") || els.reportMetadataMount.querySelector("details");
    if (!details) return false;

    if (els.reportActions.parentElement !== details) {
      details.appendChild(els.reportActions);
    }

    els.reportActions.hidden = false;
    els.reportActions.removeAttribute("hidden");
    els.reportActions.style.display = "";

    return true;
  }

  function setupDoorCountReportActions() {
    const run = () => placeDoorCountReportActions();

    run();
    window.setTimeout(run, 50);
    window.setTimeout(run, 250);

    document.addEventListener("scopedlabs:report-metadata-ready", run);
  }

  function getStatus(complexityIndex) {
    if (complexityIndex > 140) return "RISK";
    if (complexityIndex > 80) return "WATCH";
    return "HEALTHY";
  }

  function getGuidance(status) {
    if (status === "RISK") {
      return "System is becoming complex. Consider segmentation strategy, controller distribution, and phased deployment.";
    }

    if (status === "WATCH") {
      return "System complexity is rising. Ensure controller placement and wiring paths are well planned.";
    }

    return "Standard segmentation is acceptable.";
  }

  function getInsight(status) {
    if (status === "RISK") {
      return "High door count and segmentation will increase install time, wiring complexity, and long-term management overhead.";
    }

    if (status === "WATCH") {
      return "System is manageable but requires disciplined layout and clear segmentation boundaries.";
    }

    return "System is clean and scalable with minimal administrative overhead.";
  }

  function renderDoorCountLegacyChartDisabled() {
    destroyChart();
    return false;
  }

  function calc() {
    const perimeter = Math.max(0, Math.floor(n("perimeter")));
    const zones = Math.max(0, Math.floor(n("zones")));
    const highsec = Math.max(0, Math.floor(n("highsec")));
    const compliance = els.compliance.value;
    const bothSides = els.bothSides.value;

    const perimeterDoors = perimeter;
    const zoneBase = zones * 1.6 * compFactor(compliance);
    const highsecAdd = highsec * (compliance === "strict" ? 2.0 : 1.3);

    let doors = Math.round(perimeterDoors + zoneBase + highsecAdd);
    doors = Math.max(0, doors);

    const readerMultiplier = bothSides === "yes" ? 2 : 1;
    const readers = doors * readerMultiplier;

    const zonesImpact = Math.round(zones * 5);
    const complexityIndex = Math.round(
      doors +
      zones * 2 +
      highsec * 5 +
      (bothSides === "yes" ? doors * 0.5 : 0)
    );

    const status = getStatus(complexityIndex);
    const guidance = getGuidance(status);
    const insight = getInsight(status);
    const complianceLabel = els.compliance.options[els.compliance.selectedIndex]?.text || compliance;
    const bothSidesLabel = els.bothSides.options[els.bothSides.selectedIndex]?.text || bothSides;
    const statusLabel = status === "HEALTHY" ? "SAFE" : status;
    const summary = status === "RISK"
      ? "Door count and segmentation pressure are high enough to require scope simplification or phased planning."
      : status === "WATCH"
        ? "Door count planning is workable, but controller distribution and segmentation should be documented."
        : "Door count planning is clean and usable for the current supplemental scope.";

    const metrics = {
      perimeter,
      zones,
      highsec,
      compliance,
      complianceLabel,
      bothSides,
      bothSidesLabel,
      perimeterDoors,
      zoneBase,
      zoneBaseLabel: Math.round(zoneBase),
      highsecAdd,
      highsecAddLabel: Math.round(highsecAdd),
      doors,
      readerMultiplier,
      readers,
      zonesImpact,
      complexityIndex,
      status,
      statusLabel,
      guidance,
      insight,
      summary,
      recommendedActions: recommendedDoorCountActions(status)
    };

    els.results.innerHTML = [
      row("Perimeter Doors", perimeterDoors),
      row("Interior Zone Doors", Math.round(zoneBase)),
      row("High-Security Additions", Math.round(highsecAdd)),
      row("Total Controlled Doors", doors),
      row("Estimated Reader Count", readers),
      row("Complexity Index", complexityIndex),
      row("System Status", status),
      row("Design Guidance", guidance),
      row("Engineering Insight", insight)
    ].join("");

    lastMetrics = metrics;

    renderDoorCountPlanningSchedule(metrics);
    renderDoorCountPlanningVisual(metrics);
    renderDoorCountAssistant(metrics);
    publishDoorCountSummaryContribution(metrics);

    currentReport = buildCurrentReportPayload();
    updateExportControls();
  }

  function resetResults(message = "Enter values and press Calculate.") {
    if (els.results) {
      els.results.innerHTML = '<div class="muted">' + escapeHtml(message) + '</div>';
    }

    destroyChart();
    clearDoorCountPlanningSchedule();
    clearDoorCountPlanningVisual();
    clearDoorCountAssistant();
    lastMetrics = null;
    currentReport = null;
    updateExportControls();
  }

  function invalidate() {
    resetResults("Inputs changed. Press Calculate to refresh results.");
  }

  function reset() {
    if (els.perimeter) els.perimeter.value = 8;
    if (els.zones) els.zones.value = 6;
    if (els.highsec) els.highsec.value = 2;
    if (els.compliance) els.compliance.value = "basic";
    if (els.bothSides) els.bothSides.value = "no";

    resetResults("Enter values and press Calculate.");
  }

  if (els.calc) {
    els.calc.addEventListener("click", calc);
  }

  if (els.reset) {
    els.reset.addEventListener("click", reset);
  }

  [
    els.perimeter,
    els.zones,
    els.highsec,
    els.compliance,
    els.bothSides
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
  setupDoorCountReportActions();
  registerDoorCountOutputShell();
  reset();
})();
