// access-control-door-cable-length-export-print-ux-001: local print report wording and page-pack polish.
(() => {
  const CATEGORY = "access-control";
  const CATEGORY_LABEL = "Access Control";
  const TOOL = "door-cable-length";
  const TOOL_LABEL = "Door Cable Length Estimator";
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:door-cable-length";

  const $ = (id) => document.getElementById(id);

  let chart = null;
  let currentReport = null;
  let lastMetrics = null;

  const els = {
    distance: $("distance"),
    routing: $("routing"),
    slack: $("slack"),
    doors: $("doors"),
    runs: $("runs"),
    cables: $("cables"),
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
    decisionCard: $("doorCableDecisionCard"),
    scheduleWrap: $("doorCableScheduleWrap"),
    schedule: $("doorCableSchedule"),
    assistantMount: $("accessControlLocalAssistantMount"),
    flowActions: $("accessControlFlowActions"),
    reportMetadataMount: $("reportMetadataMount"),
    reportActions: $("doorCableReportActions"),
    visualCard: $("doorCablePlanningVisualCard"),
    visualWrap: $("doorCablePlanningVisualWrap"),
    visualMount: $("doorCablePlanningVisual")
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
      reportTitle: (els.reportTitle?.value || "").trim() || "Door Cable Length Assessment",
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
    const totalCable = outputs.find((x) => x.label === "Estimated Total Cable")?.value || "";
    const difficulty = outputs.find((x) => x.label === "Install Difficulty")?.value || "";
    const guidance = outputs.find((x) => x.label === "Design Guidance")?.value || "";

    return `Estimated total cable is ${totalCable || "N/A"} with ${difficulty || "unknown"} install difficulty. ${guidance || ""}`.trim();
  }

  function getInterpretationFromResults(outputs) {
    return outputs.find((x) => x.label === "Engineering Insight")?.value || "";
  }

  function getStatusFromResults(outputs) {
    const difficulty = (outputs.find((x) => x.label === "Install Difficulty")?.value || "").toUpperCase();

    if (difficulty === "HIGH") return "RISK";
    if (difficulty === "MODERATE") return "WATCH";
    return "HEALTHY";
  }

  function getAssumptions() {
    return [
      "Cable estimates are derived from straight-line distance adjusted by routing factor, plus service slack.",
      "Multi-run mode multiplies the per-door cable quantity by the configured number of separate cable paths.",
      "This export reflects the current on-screen tool results at the time the report was opened or saved.",
      "Final quantities should be verified against actual routing, pathway conditions, service loops, spare capacity, and installation standards."
    ];
  }

  function getChartImage() {
    return getDoorCablePlanningVisualImage();
  }

  function getExportChartImage() {
    return getDoorCablePlanningVisualImage();
  }

  function buildCurrentReportPayload() {
    const outputs = collectVisibleResults();

    if (!outputs.length) return null;

    const status = lastMetrics?.status || getStatusFromResults(outputs);
    const summary = lastMetrics?.summary || getSummaryFromResults(outputs);
    const interpretation = lastMetrics?.insight || getInterpretationFromResults(outputs);

    return {
      reportId: makeReportId("SL-ACC-CABLE"),
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
        { label: "Straight-Line Distance (ft)", value: String(els.distance.value) },
        { label: "Routing Factor", value: els.routing.options[els.routing.selectedIndex]?.text || els.routing.value },
        { label: "Service Slack (ft)", value: String(els.slack.value) },
        { label: "Door Count", value: String(els.doors.value) },
        { label: "Separate Runs?", value: els.runs.options[els.runs.selectedIndex]?.text || els.runs.value },
        { label: "Number of Separate Cables", value: String(els.cables.value) }
      ],
      outputs,
      assumptions: getAssumptions(),
      chartImage: getDoorCablePlanningVisualImage(),
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
            <img src="${payload.chartImage}" alt="Door Cable Length planning visual">
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
      .chart-wrap{
        background:#fff!important;
        border:1px solid var(--line)!important;
        padding:10px!important;
        box-shadow:none!important;
      }
      .report-head,.section,.chart-wrap,.grid,.summary,.body-copy,.foot{break-inside:avoid;page-break-inside:avoid}
      .section{margin-top:12px}
      .section h2{break-after:avoid;page-break-after:avoid}
      .chart-wrap img{display:block;max-width:100%;max-height:4.6in;object-fit:contain;margin:0 auto;filter:invert(1) hue-rotate(180deg) saturate(.75) contrast(1.15)}
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
          ScopedLabs outputs are planning aids only and do not replace formal engineering review, code compliance review, site-specific validation, manufacturer documentation, pathway verification, or installer takeoff review.
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

  function setCableEnabledFromRuns() {
    const isMulti = els.runs.value === "multi";

    if (els.cables) {
      els.cables.disabled = !isMulti;

      if (!isMulti) {
        els.cables.value = 1;
      }
    }
  }


  // access-control-door-cable-output-contract-023-modern-visual
  function scheduleCell(value) {
    return escapeHtml(value == null || value === "" ? "—" : value);
  }

  function doorCableStatusFromDifficulty(difficulty) {
    const value = String(difficulty || "").toUpperCase();
    if (value === "HIGH") return "RISK";
    if (value === "MODERATE") return "WATCH";
    return "HEALTHY";
  }

  function doorCableStatusChip(status) {
    const clean = String(status || "PENDING").toUpperCase();
    const display = clean === "HEALTHY" ? "SAFE" : clean;
    const tone = clean.includes("RISK") ? "is-risk" : clean.includes("WATCH") ? "is-watch" : "is-healthy";
    return '<span class="door-cable-status-chip ' + tone + '">' + escapeHtml(display) + '</span>';
  }

  function doorCableScheduleRow(group, metric, value, note) {
    return '<tr><td>' + escapeHtml(group) + '</td><td>' + escapeHtml(metric) + '</td><td>' + value + '</td><td>' + escapeHtml(note) + '</td></tr>';
  }

  function recommendedDoorCableActions(status, metrics = {}) {
    if (status === "RISK") {
      return [
        "Move control hardware closer to the door group or split pathways before rough-in.",
        "Review pathway fill, pull-box access, cable type, and service loop assumptions with the installer.",
        "Document high-effort routing in the Access Control summary before final handoff."
      ];
    }

    if (status === "WATCH") {
      return [
        "Keep routing controlled and label pathway assumptions before field install.",
        "Verify service slack, spare capacity, and pathway congestion for the selected routing factor.",
        "Carry this result into the Access Control summary as supplemental routing context."
      ];
    }

    return [
      "Document the estimated cable quantity and routing assumptions in the project handoff.",
      "Confirm the actual pathway before procurement or installation.",
      "Carry this result into the Access Control summary as supplemental routing context."
    ];
  }


  // access-control-door-cable-modern-visual-023
  function renderDoorCablePlanningVisual(metrics = {}) {
    const visuals = window.ScopedLabsAccessControlPlanningVisuals;
    if (!visuals || typeof visuals.renderDoorCable !== "function") return false;

    return visuals.renderDoorCable({
      card: els.visualCard,
      wrap: els.visualWrap,
      target: els.visualMount,
      metrics
    });
  }

  function clearDoorCablePlanningVisual() {
    const visuals = window.ScopedLabsAccessControlPlanningVisuals;
    if (visuals && typeof visuals.hide === "function") {
      visuals.hide({ card: els.visualCard, wrap: els.visualWrap, target: els.visualMount });
      return;
    }

    if (els.visualMount) els.visualMount.innerHTML = "";
    if (els.visualWrap) els.visualWrap.hidden = true;
    if (els.visualCard) els.visualCard.hidden = true;
  }

  function getDoorCablePlanningVisualImage() {
    const visuals = window.ScopedLabsAccessControlPlanningVisuals;
    if (!visuals || typeof visuals.getDataUri !== "function") return "";
    return visuals.getDataUri(els.visualMount);
  }

  function renderDoorCableLengthSchedule(metrics = {}) {
    const status = metrics.status || doorCableStatusFromDifficulty(metrics.difficulty);
    const statusLabel = String(status).toUpperCase() === "HEALTHY" ? "SAFE" : String(status || "PENDING").toUpperCase();
    const summary = metrics.summary || "Door cable routing review generated from the selected distance, slack, door count, and run strategy.";
    const interpretation = metrics.insight || "Run the calculator to generate door cable routing guidance.";
    const schedule = window.ScopedLabsAccessControlDecisionSchedule;

    const rows = [
      { group: "Inputs", metric: "Straight-Line Distance", value: metrics.distanceLabel, note: "Base field distance before routing factor and slack." },
      { group: "Inputs", metric: "Routing Factor", value: metrics.routingLabel, note: "Routing overhead for open, mixed, or constrained pathways." },
      { group: "Inputs", metric: "Service Slack", value: metrics.slackLabel, note: "Additional slack per door for serviceability." },
      { group: "Inputs", metric: "Door Count", value: metrics.doors, note: "Number of openings included in this cable estimate." },
      { group: "Inputs", metric: "Run Strategy", value: metrics.runLabel, note: "Single combined cable or separate cable paths per opening." },
      { group: "Calculated Load", metric: "Routed Distance per Door", value: metrics.routedLabel, note: "Straight-line distance after routing factor." },
      { group: "Calculated Load", metric: "Estimated Total per Door", value: metrics.perDoorTotalLabel, note: "Per-door cable quantity after routing, slack, and run strategy." },
      { group: "Calculated Load", metric: "Estimated Total Cable", value: metrics.totalAllDoorsLabel, note: "Total planning quantity for all modeled doors." },
      { group: "Calculated Load", metric: "Cable Density", value: metrics.cableDensityLabel, note: "Routing pressure indicator compared with straight-line distance." },
      { group: "Decision", metric: "Install Difficulty", value: metrics.difficulty, note: "Planning-level routing difficulty." },
      { group: "Decision", metric: "Status", valueHtml: schedule && typeof schedule.statusChip === "function" ? schedule.statusChip(status) : doorCableStatusChip(status), note: statusLabel === "RISK" ? "Reduce routing distance, split pathways, or move hardware closer before final layout." : statusLabel === "WATCH" ? "Proceed with documented pathway assumptions and installation review." : "Routing quantity is usable for the current planning scope." },
      { group: "Summary", metric: "Contribution", value: "Supplemental Planning Tools", note: "Included in Access Control summary when this non-pipeline tool is used." }
    ];

    if (schedule && typeof schedule.render === "function") {
      return schedule.render({
        card: els.decisionCard,
        wrap: els.scheduleWrap,
        target: els.schedule,
        title: (metrics.difficulty || "Door cable routing review") + " routing difficulty",
        summary,
        status,
        statusDetail: "Total cable: " + (metrics.totalAllDoorsLabel || "—"),
        rows,
        interpretation,
        exportTableTitle: "Door Cable Routing Schedule",
        tableDataAttr: 'data-door-cable-summary-table="true" data-access-control-decision-schedule="true"'
      });
    }

    const html = [
      '<table data-door-cable-summary-table="true" data-export-table-title="Door Cable Routing Schedule"><thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead><tbody>',
      rows.map((row) => doorCableScheduleRow(row.group, row.metric, row.valueHtml || scheduleCell(row.value), row.note)).join(""),
      '</tbody></table>'
    ].join("");

    if (els.schedule) els.schedule.innerHTML = html;
    if (els.scheduleWrap) els.scheduleWrap.hidden = false;
    if (els.decisionCard) els.decisionCard.hidden = false;
    return html;
  }

  function clearDoorCableLengthSchedule() {
    const shell = window.ScopedLabsAccessControlOutputShell;
    if (shell && typeof shell.hideVisual === "function") {
      shell.hideVisual({ card: els.decisionCard, wrap: els.scheduleWrap, target: els.schedule });
      return;
    }

    if (els.schedule) els.schedule.innerHTML = "";
    if (els.scheduleWrap) els.scheduleWrap.hidden = true;
    if (els.decisionCard) els.decisionCard.hidden = true;
  }

  function buildDoorCableLengthAssistantFallback(metrics = {}) {
    const status = metrics.status || doorCableStatusFromDifficulty(metrics.difficulty);
    return {
      category: CATEGORY,
      tool: TOOL,
      kicker: "Local Design Assistant",
      title: "Door Cable Assistant",
      status,
      summary: metrics.summary || "Door cable routing guidance is ready for this supplemental tool result.",
      sections: [
        {
          title: "Routing Pressure",
          body: metrics.insight || "Cable routing pressure will appear here after calculation.",
          items: [
            "Total cable: " + (metrics.totalAllDoorsLabel || "—"),
            "Per-door cable: " + (metrics.perDoorTotalLabel || "—"),
            "Cable density: " + (metrics.cableDensityLabel || "—"),
            "Difficulty: " + (metrics.difficulty || "—")
          ]
        },
        {
          title: "Summary Role",
          body: "Door Cable Length is a supplemental Access Control tool. It is not part of the real pipeline, but its result should be available to the category summary and future Gold reporting.",
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
      actions: metrics.recommendedActions || recommendedDoorCableActions(status, metrics)
    };
  }

  function renderDoorCableLengthAssistant(metrics = {}) {
    if (!els.assistantMount) return false;

    const api = window.ScopedLabsLocalAssistant;
    if (!api || typeof api.mount !== "function") return false;

    const registry = window.ScopedLabsAccessControlToolAssistantAdapters;
    const adapter = registry && typeof registry.getAdapter === "function" ? registry.getAdapter(TOOL) : null;
    const model = adapter && typeof adapter.buildModel === "function"
      ? adapter.buildModel(metrics)
      : buildDoorCableLengthAssistantFallback(metrics);

    return api.mount(els.assistantMount, model);
  }

  function clearDoorCableLengthAssistant() {
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

  function publishDoorCableLengthSummaryContribution(metrics = {}) {
    const contribution = {
      category: CATEGORY,
      slug: TOOL,
      title: TOOL_LABEL,
      contributionType: "supplemental",
      summaryGroup: "Supplemental Planning Tools",
      status: metrics.status || doorCableStatusFromDifficulty(metrics.difficulty),
      summary: metrics.summary || "Door cable routing result ready.",
      metrics: {
        straightLineDistance: metrics.distance,
        routingFactor: metrics.routingFactor,
        serviceSlack: metrics.slack,
        doors: metrics.doors,
        runStrategy: metrics.runLabel,
        separateCables: metrics.cables,
        estimatedTotalCable: metrics.totalAllDoorsLabel,
        estimatedTotalPerDoor: metrics.perDoorTotalLabel,
        cableDensity: metrics.cableDensityLabel,
        installDifficulty: metrics.difficulty
      },
      notes: [
        metrics.insight || "Door cable length should be verified against actual routing, pathway constraints, service loops, and field conditions.",
        "Supplemental tool: included in summary when used, but not part of real pipeline state."
      ],
      updatedAt: new Date().toISOString()
    };

    window.ScopedLabsAccessControlSummaryContributions = window.ScopedLabsAccessControlSummaryContributions || {};
    window.ScopedLabsAccessControlSummaryContributions[contribution.slug] = contribution;

    try {
      localStorage.setItem("scopedlabs:access-control:summary:door-cable-length", JSON.stringify(contribution));
    } catch {}

    return contribution;
  }

  function registerDoorCableLengthOutputShell() {
    const shell = window.ScopedLabsAccessControlOutputShell;
    if (!shell || typeof shell.register !== "function") return false;

    return shell.register(TOOL, {
      getChartImage() {
        return getDoorCablePlanningVisualImage();
      },
      attachExportGetter() {
        return false;
      }
    });
  }

  function placeDoorCableReportActions() {
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

  function setupDoorCableReportActions() {
    const run = () => placeDoorCableReportActions();

    run();
    window.setTimeout(run, 50);
    window.setTimeout(run, 250);

    document.addEventListener("scopedlabs:report-metadata-ready", run);
  }

  function getDifficulty(perDoorTotal, cableDensity, totalAllDoors) {
    if (perDoorTotal > 350 || cableDensity > 3.2 || totalAllDoors > 4000) return "HIGH";
    if (perDoorTotal > 220 || cableDensity > 2.0 || totalAllDoors > 2000) return "MODERATE";
    return "LOW";
  }

  function getRecommendation(difficulty, runs, distance) {
    if (difficulty === "HIGH") {
      return "Consider moving control hardware closer, reducing home-run distance, or splitting pathways by door group.";
    }

    if (difficulty === "MODERATE") {
      return "Routing is workable, but pathway efficiency, labeling, and slack discipline will matter in the field.";
    }

    if (runs === "multi" && distance > 150) {
      return "Runs are still acceptable, but verify pathway fill and service loop planning before rough-in.";
    }

    return "Standard routing is acceptable.";
  }

  function getInsight(difficulty) {
    if (difficulty === "HIGH") {
      return "Cable planning is entering a high-effort zone. Expect more labor, higher pathway congestion, and greater install/debug overhead if routing is not controlled carefully.";
    }

    if (difficulty === "MODERATE") {
      return "Cable design is reasonable, but not effortless. Installation success will depend on pathway cleanliness, termination consistency, and avoiding unnecessary reroutes.";
    }

    return "Cable design is clean and efficient. Install should be straightforward with minimal overhead.";
  }

  function renderDoorCableLengthLegacyChartDisabled() {
    destroyChart();
    return false;
  }

  function calc() {
    const distance = Math.max(0, n("distance"));
    const routing = parseFloat(els.routing.value);
    const slack = Math.max(0, n("slack"));
    const doors = Math.max(1, n("doors"));
    const runs = els.runs.value;
    const cables = Math.max(1, Math.floor(n("cables")));

    const routingFactor = Number.isFinite(routing) ? routing : 1.3;
    const routed = distance * routingFactor;
    const routingLossPct = (routingFactor - 1) * 100;
    const perDoorSingle = routed + slack;
    const perDoorTotal = runs === "multi" ? perDoorSingle * cables : perDoorSingle;
    const totalAllDoors = perDoorTotal * doors;
    const cableDensity = perDoorTotal / Math.max(1, distance);

    const difficulty = getDifficulty(perDoorTotal, cableDensity, totalAllDoors);
    const recommendation = getRecommendation(difficulty, runs, distance);
    const insight = getInsight(difficulty);
    const status = doorCableStatusFromDifficulty(difficulty);
    const runLabel = runs === "multi" ? "Multiple separate cable paths" : "Single combined cable";
    const routingLabel = els.routing.options[els.routing.selectedIndex]?.text || String(routingFactor);
    const summary = difficulty === "HIGH"
      ? "Cable routing is high-effort and should be simplified before final layout."
      : difficulty === "MODERATE"
        ? "Cable routing is workable, but pathway discipline and installation review are important."
        : "Cable routing is clean and usable for planning.";

    const metrics = {
      distance,
      routing,
      routingFactor,
      routingLabel,
      slack,
      doors,
      runs,
      runLabel,
      cables,
      routed,
      routingLossPct,
      perDoorSingle,
      perDoorTotal,
      totalAllDoors,
      cableDensity,
      difficulty,
      recommendation,
      insight,
      status,
      summary,
      recommendedActions: recommendedDoorCableActions(status),
      distanceLabel: distance.toFixed(1) + " ft",
      slackLabel: slack.toFixed(1) + " ft",
      routedLabel: routed.toFixed(1) + " ft",
      perDoorSingleLabel: perDoorSingle.toFixed(1) + " ft",
      perDoorTotalLabel: perDoorTotal.toFixed(1) + " ft",
      totalAllDoorsLabel: totalAllDoors.toFixed(1) + " ft",
      routingLossPctLabel: routingLossPct.toFixed(0) + "%",
      cableDensityLabel: cableDensity.toFixed(2)
    };

    els.results.innerHTML = [
      row("Routed Distance (per door)", metrics.routedLabel),
      row("Routing Loss", metrics.routingLossPctLabel),
      row("Estimated Run (single cable)", metrics.perDoorSingleLabel),
      row("Estimated Total per Door", metrics.perDoorTotalLabel),
      row("Estimated Total Cable", metrics.totalAllDoorsLabel),
      row("Cable Density", metrics.cableDensityLabel),
      row("Install Difficulty", difficulty),
      row("Design Guidance", recommendation),
      row("Engineering Insight", insight)
    ].join("");

    lastMetrics = metrics;

    renderDoorCableLengthSchedule(metrics);
    renderDoorCablePlanningVisual(metrics);
    renderDoorCableLengthAssistant(metrics);
    publishDoorCableLengthSummaryContribution(metrics);

    currentReport = buildCurrentReportPayload();
    updateExportControls();
  }

  function resetResults(message = "Enter values and press Calculate.") {
    if (els.results) {
      els.results.innerHTML = '<div class="muted">' + escapeHtml(message) + '</div>';
    }

    destroyChart();
    clearDoorCableLengthSchedule();
    clearDoorCablePlanningVisual();
    clearDoorCableLengthAssistant();
    lastMetrics = null;
    currentReport = null;
    updateExportControls();
  }

  function invalidate() {
    resetResults("Inputs changed. Press Calculate to refresh results.");
  }

  function reset() {
    if (els.distance) els.distance.value = 120;
    if (els.routing) els.routing.value = "1.30";
    if (els.slack) els.slack.value = 15;
    if (els.doors) els.doors.value = 8;
    if (els.runs) els.runs.value = "single";
    if (els.cables) els.cables.value = 4;

    setCableEnabledFromRuns();
    resetResults("Enter values and press Calculate.");
  }

  if (els.calc) {
    els.calc.addEventListener("click", calc);
  }

  if (els.reset) {
    els.reset.addEventListener("click", reset);
  }

  if (els.runs) {
    els.runs.addEventListener("change", () => {
      setCableEnabledFromRuns();
      invalidate();
    });
  }

  [
    els.distance,
    els.routing,
    els.slack,
    els.doors,
    els.cables
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
  setupDoorCableReportActions();
  registerDoorCableLengthOutputShell();
  reset();
})();
