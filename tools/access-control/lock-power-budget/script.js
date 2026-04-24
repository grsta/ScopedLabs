(() => {
  "use strict";

  const CATEGORY = "access-control";
  const STEP = "lock-power-budget";
  const LANE = "v1";
  const PREVIOUS_STEP = "reader-type-selector";
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:lock-power-budget";

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
  let chartWrap = null;
  let hasResult = false;

  const els = {
    lockType: $("lockType"),
    voltage: $("voltage"),
    amps: $("amps"),
    locks: $("locks"),
    simul: $("simul"),
    headroom: $("headroom"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
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
    exportStatus: $("exportStatus")
  };

  function hasStoredAuth() {
    try {
      const k = Object.keys(localStorage).find((x) => x.startsWith("sb-"));
      if (!k) return false;
      const raw = JSON.parse(localStorage.getItem(k));
      return !!(
        raw?.access_token ||
        raw?.currentSession?.access_token ||
        (Array.isArray(raw) ? raw[0]?.access_token : null)
      );
    } catch {
      return false;
    }
  }

  function getUnlockedCategories() {
    try {
      const raw = localStorage.getItem("sl_unlocked_categories");
      if (!raw) return [];
      return raw.split(",").map((x) => String(x).trim().toLowerCase()).filter(Boolean);
    } catch {
      return [];
    }
  }

  function unlockCategoryPage() {
    const category = String(document.body?.dataset?.category || "").trim().toLowerCase();
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

  function destroyChart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
    if (chartWrap && chartWrap.parentNode) {
      chartWrap.parentNode.removeChild(chartWrap);
    }
    chartWrap = null;
  }

  function showContinue() {
    els.nextWrap.style.display = "flex";
    els.nextBtn.disabled = false;
    hasResult = true;
  }

  function hideContinue() {
    els.nextWrap.style.display = "none";
    els.nextBtn.disabled = true;
    hasResult = false;
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

  function setExportEnabled(enabled) {
    if (els.exportReport) els.exportReport.disabled = !enabled;
    if (els.saveSnapshot) els.saveSnapshot.disabled = !enabled;
  }

  function setExportStatus(message = "") {
    if (els.exportStatus) els.exportStatus.textContent = message;
  }

  function getReportMeta() {
    return {
      reportTitle: (els.reportTitle?.value || "").trim() || "Assessment Report",
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
            <img src="${payload.chartImage}" alt="Report chart">
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
    .page{max-width:980px;margin:0 auto;background:#fff;border:1px solid var(--line);box-shadow:0 18px 50px rgba(0,0,0,.08)}
    .toolbar{display:flex;justify-content:flex-end;gap:10px;padding:14px 18px;border-bottom:1px solid var(--line);background:#fbfcfb}
    .toolbar button{appearance:none;border:1px solid #c9d8cf;background:#fff;color:var(--ink);border-radius:999px;padding:10px 14px;font-weight:700;cursor:pointer}
    .toolbar button:hover{background:#f3f7f5}
    .report{padding:28px 30px 32px}
    .brand-row{display:flex;align-items:center;gap:12px;margin-bottom:10px}
    .brand-row img{width:28px;height:28px;display:block}
    .brand-name{font-size:1.15rem;font-weight:800;letter-spacing:.02em}
    .tagline{color:var(--muted);font-size:.95rem;margin-bottom:18px}
    .report-head{display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-top:1px solid var(--line);border-bottom:1px solid var(--line);padding:18px 0;margin-bottom:22px}
    .report-title{font-size:1.7rem;line-height:1.15;margin:0 0 6px}
    .report-meta{color:var(--muted);font-size:.95rem;line-height:1.6}
    .status-pill{display:inline-flex;align-items:center;justify-content:center;padding:8px 12px;border-radius:999px;font-size:.82rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;border:1px solid transparent;white-space:nowrap}
    .status-pill.healthy{color:var(--accent);background:var(--accent-soft);border-color:#c9ead7}
    .status-pill.watch{color:var(--watch);background:var(--watch-soft);border-color:#f2dfad}
    .status-pill.risk{color:var(--risk);background:var(--risk-soft);border-color:#f3c6c1}
    .section{margin-top:24px}
    .section h2{margin:0 0 10px;font-size:1rem;letter-spacing:.02em;text-transform:uppercase}
    .summary,.body-copy{border:1px solid var(--line);background:#fafcfb;border-radius:14px;padding:16px 18px;line-height:1.65}
    .project-details{display:grid;gap:6px;margin-top:10px;color:var(--muted);font-size:.95rem}
    .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px}
    table{width:100%;border-collapse:collapse;border:1px solid var(--line);border-radius:14px;overflow:hidden;font-size:.95rem}
    th,td{padding:11px 12px;border-bottom:1px solid var(--line);vertical-align:top}
    th{text-align:left;background:#f7faf8;font-size:.82rem;text-transform:uppercase;letter-spacing:.06em}
    tr:last-child td{border-bottom:none}
    td:last-child{font-weight:700;text-align:right}
    .assumptions{margin:0;padding-left:18px;line-height:1.7}
    .chart-wrap{border:1px solid var(--line);border-radius:14px;background:#fff;padding:18px;text-align:center}
    .chart-wrap img{max-width:100%;height:auto;display:inline-block}
    .foot{margin-top:26px;padding-top:16px;border-top:1px solid var(--line);color:var(--muted);font-size:.9rem;line-height:1.7}
    @media (max-width:760px){
      body{padding:14px}
      .report{padding:20px}
      .report-head{flex-direction:column}
      .grid{grid-template-columns:1fr}
      td:last-child{text-align:left}
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
          ScopedLabs outputs are planning aids only and do not replace formal engineering review, code compliance review, site-specific validation, or manufacturer documentation.
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

  function loadFlowContext() {
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
    const lines = [];

    if (d.readerType) lines.push(`Reader Type: <strong>${d.readerType}</strong>`);
    if (d.recommendedMounting) lines.push(`Mounting: <strong>${d.recommendedMounting}</strong>`);
    if (d.environment) lines.push(`Environment: <strong>${d.environment}</strong>`);
    if (d.priority) lines.push(`Priority: <strong>${d.priority}</strong>`);

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
      Use that reader decision as the basis for estimating whether the chosen lock hardware can be supported cleanly under simultaneous unlock demand.
    `;
  }

  function row(label, value) {
    return `
      <div class="result-row">
        <span class="result-label">${label}</span>
        <span class="result-value">${value}</span>
      </div>
    `;
  }

  function render(rows) {
    els.results.innerHTML = rows.join("");
  }

  function collectVisibleResults() {
    const rows = Array.from(els.results.querySelectorAll(".result-row"));
    return rows.map((rowEl) => {
      const label = rowEl.querySelector(".result-label")?.textContent?.trim() || "";
      const value = rowEl.querySelector(".result-value")?.textContent?.trim() || "";
      return { label, value };
    }).filter((item) => item.label && item.value);
  }

  function getSummaryFromResults(outputs) {
    const supply = outputs.find((x) => x.label === "Required Supply")?.value || "";
    const watts = outputs.find((x) => x.label === "Power")?.value || "";
    const status = outputs.find((x) => x.label === "System Status")?.value || "";
    return `Estimated required supply is ${supply || "N/A"} with ${watts || "N/A"} total power and an overall status of ${status || "unknown"}.`;
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
      "Peak unlock demand is based on simultaneous unlock events, not total installed locks unlocking at once unless configured that way.",
      "Required supply includes the configured design headroom percentage.",
      "This export reflects the current on-screen tool results at the time the report was opened or saved."
    ];
  }

  function buildCurrentReportPayload() {
    const outputs = collectVisibleResults();
    if (!outputs.length) return null;

    return {
      reportId: makeReportId("SL-ACC-LOCKPOWER"),
      generatedAt: new Date().toISOString(),
      category: "Access Control",
      tool: "Lock Power Budget",
      status: getStatusFromResults(outputs),
      summary: getSummaryFromResults(outputs),
      interpretation: getInterpretationFromResults(outputs),
      inputs: [
        { label: "Lock Type", value: els.lockType.options[els.lockType.selectedIndex]?.text || els.lockType.value },
        { label: "Voltage", value: els.voltage.options[els.voltage.selectedIndex]?.text || els.voltage.value },
        { label: "Current per Lock (A)", value: String(els.amps.value) },
        { label: "Number of Locks", value: String(els.locks.value) },
        { label: "Simultaneous Unlocks", value: String(els.simul.value) },
        { label: "Headroom (%)", value: String(els.headroom.value) }
      ],
      outputs,
      assumptions: getAssumptions(),
      chartImage: getChartImage(),
      meta: getReportMeta()
    };
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["panel-capacity"]);
      sessionStorage.removeItem(FLOW_KEYS["access-level-sizing"]);
    } catch {}

    destroyChart();
    hideContinue();
    currentReport = null;
    setExportEnabled(false);
    setExportStatus("");
    els.results.innerHTML = `<div class="muted">Run calculation.</div>`;
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    loadFlowContext();
  }

  function getStatus(utilizationPct) {
    if (utilizationPct > 85) return "RISK";
    if (utilizationPct > 65) return "WATCH";
    return "HEALTHY";
  }

  function getGuidance(status, simul, locks, lockType) {
    if (status === "RISK") {
      return `Power supply margin is too tight. High simultaneous ${lockType} events may cause voltage sag, unlock instability, or nuisance behavior under field conditions.`;
    }
    if (status === "WATCH") {
      return `System is serviceable but tight. ${simul} simultaneous unlocks across ${locks} locks leaves limited margin for expansion, cable loss, or supply aging.`;
    }
    return "Power budget is clean. Supply sizing should tolerate normal unlock bursts with reasonable field margin.";
  }

  function getInsight(status, peak, required, watts) {
    if (status === "RISK") {
      return `Peak event load of ${peak.toFixed(2)} A is pushing the supply too hard. Required budget rises to ${required.toFixed(2)} A / ${watts.toFixed(1)} W once headroom is included, which is not where you want a lock circuit to live.`;
    }
    if (status === "WATCH") {
      return "The design is within range, but only with moderate reserve. Unlock bursts, cable losses, and future changes could move this supply from acceptable to problematic.";
    }
    return "The design stays well inside a healthy operating envelope. Peak unlock demand and reserved headroom remain balanced, which is what you want for stable lock behavior.";
  }

  function renderChart(metrics) {
    destroyChart();

    chartWrap = document.createElement("div");
    chartWrap.style.marginTop = "16px";
    chartWrap.style.width = "100%";
    chartWrap.style.height = "340px";
    chartWrap.style.minHeight = "340px";
    chartWrap.style.position = "relative";

    const canvas = document.createElement("canvas");
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.display = "block";

    chartWrap.appendChild(canvas);
    els.results.appendChild(chartWrap);

    const labels = [
      "Peak Load",
      "Required Supply",
      "Power / 10",
      "Utilization"
    ];

    const values = [
      metrics.peak,
      metrics.required,
      metrics.watts / 10,
      metrics.utilizationPct
    ];

    const displayValues = {
      0: `${metrics.peak.toFixed(2)} A`,
      1: `${metrics.required.toFixed(2)} A`,
      2: `${metrics.watts.toFixed(1)} W`,
      3: `${metrics.utilizationPct.toFixed(0)}%`
    };

    const dominantIndex = values.indexOf(Math.max(...values));
    const referenceValue = 65;
    const chartMax = Math.max(100, Math.ceil(Math.max(...values, referenceValue, 85) * 1.12));

    const chartBgPlugin = {
      id: "chartBgPlugin",
      beforeDraw(c) {
        const { ctx, chartArea } = c;
        if (!chartArea) return;

        const { left, top, width, height } = chartArea;
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fillRect(left, top, width, height);
        ctx.restore();
      }
    };

    const thresholdBandPlugin = {
      id: "thresholdBandPlugin",
      beforeDatasetsDraw(c) {
        const { ctx, chartArea, scales } = c;
        if (!chartArea || !scales.x) return;

        const x = scales.x;
        const { top, bottom, left, right } = chartArea;

        const healthyMax = Math.min(65, x.max);
        const watchMax = Math.min(85, x.max);

        ctx.save();

        if (healthyMax > 0) {
          ctx.fillStyle = "rgba(46, 204, 113, 0.16)";
          ctx.fillRect(left, top, x.getPixelForValue(healthyMax) - left, bottom - top);
        }

        if (watchMax > 65) {
          ctx.fillStyle = "rgba(255, 200, 80, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(65),
            top,
            x.getPixelForValue(watchMax) - x.getPixelForValue(65),
            bottom - top
          );
        }

        if (x.max > 85) {
          ctx.fillStyle = "rgba(255, 90, 90, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(85),
            top,
            right - x.getPixelForValue(85),
            bottom - top
          );
        }

        ctx.restore();
      },
      afterDatasetsDraw(c) {
        const { ctx, chartArea, scales } = c;
        if (!chartArea || !scales.x || !scales.y) return;

        const x = scales.x;
        const y = scales.y;
        const { top, bottom } = chartArea;

        ctx.save();

        const rx = x.getPixelForValue(referenceValue);
        ctx.strokeStyle = "rgba(120, 255, 170, 0.98)";
        ctx.lineWidth = 3;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(rx, top);
        ctx.lineTo(rx, bottom);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "rgba(220, 255, 235, 0.96)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText("Healthy Margin Floor", rx + 8, bottom - 10);

        ctx.fillStyle = "rgba(180, 255, 200, 0.82)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText("Healthy", x.getPixelForValue(6), top + 14);

        ctx.fillStyle = "rgba(255, 220, 140, 0.82)";
        ctx.fillText("Watch", x.getPixelForValue(69), top + 14);

        ctx.fillStyle = "rgba(255, 160, 160, 0.82)";
        ctx.fillText("Risk", x.getPixelForValue(89), top + 14);

        const dominantValue = values[dominantIndex];
        const px = x.getPixelForValue(dominantValue);
        const py = y.getPixelForValue(labels[dominantIndex]);

        ctx.beginPath();
        ctx.arc(px, py, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(225, 255, 240, 1)";
        ctx.fill();
        ctx.strokeStyle = "rgba(120, 255, 170, 0.95)";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = "rgba(235, 248, 240, 0.92)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText(displayValues[dominantIndex], Math.min(px + 8, chartArea.right - 110), py - 8);

        ctx.restore();
      }
    };

    chart = new Chart(canvas, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Power Budget Metrics",
            data: values,
            barPercentage: 0.5,
            categoryPercentage: 0.58,
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            backgroundColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 85) return "rgba(255, 92, 92, 1)";
                if (v > 65) return "rgba(255, 188, 82, 1)";
                return "rgba(120, 255, 170, 1)";
              }

              if (v > 85) return "rgba(255, 77, 77, 0.30)";
              if (v > 65) return "rgba(255, 170, 51, 0.24)";
              return "rgba(90, 170, 255, 0.15)";
            },
            borderColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 85) return "rgba(255, 220, 220, 1)";
                if (v > 65) return "rgba(255, 240, 210, 1)";
                return "rgba(215, 255, 230, 1)";
              }

              return "rgba(120,170,200,0.18)";
            },
            hoverBackgroundColor: (context) => {
              const v = context.raw;
              if (v > 85) return "rgba(255, 105, 105, 1)";
              if (v > 65) return "rgba(255, 198, 95, 1)";
              return "rgba(135, 255, 182, 1)";
            }
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        animation: {
          duration: 700,
          easing: "easeOutQuart"
        },
        layout: {
          padding: {
            top: 28,
            right: 12,
            left: 10,
            bottom: 0
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: "rgba(8, 18, 18, 0.96)",
            titleColor: "#e8fff1",
            bodyColor: "#d9f7e7",
            borderColor: "rgba(100, 255, 180, 0.25)",
            borderWidth: 1,
            padding: 12,
            callbacks: {
              label(context) {
                const i = context.dataIndex;
                return ` ${displayValues[i]}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            suggestedMax: chartMax,
            ticks: {
              color: "rgba(220, 238, 230, 0.78)"
            },
            grid: {
              color: "rgba(110, 160, 140, 0.10)"
            },
            title: {
              display: true,
              text: "Power Stress Magnitude",
              color: "rgba(230, 255, 240, 0.92)"
            }
          },
          y: {
            ticks: {
              color: "rgba(228, 245, 235, 0.92)"
            },
            grid: {
              display: false
            }
          }
        }
      },
      plugins: [chartBgPlugin, thresholdBandPlugin]
    });
  }

  function calc() {
    const amps = parseFloat(els.amps.value);
    const locks = parseInt(els.locks.value, 10);
    const simul = parseInt(els.simul.value, 10);
    const headroom = parseFloat(els.headroom.value);
    const voltage = parseInt(els.voltage.value, 10);

    if (
      !Number.isFinite(amps) || amps <= 0 ||
      !Number.isFinite(locks) || locks <= 0 ||
      !Number.isFinite(simul) || simul <= 0 ||
      !Number.isFinite(headroom) || headroom < 0 ||
      !Number.isFinite(voltage) || voltage <= 0
    ) {
      render([row("Error", "Enter valid values for all inputs.")]);
      destroyChart();
      hideContinue();
      currentReport = null;
      setExportEnabled(false);
      setExportStatus("");
      return;
    }

    const peak = Math.min(locks, simul) * amps;
    const required = peak * (1 + headroom / 100);
    const watts = required * voltage;
    const utilizationPct = required > 0 ? (peak / required) * 100 : 0;

    const status = getStatus(utilizationPct);
    const guidance = getGuidance(status, simul, locks, els.lockType.value);
    const insight = getInsight(status, peak, required, watts);

    render([
      row("Peak Load", `${peak.toFixed(2)} A`),
      row("Required Supply", `${required.toFixed(2)} A`),
      row("Power", `${watts.toFixed(1)} W`),
      row("Utilization", `${utilizationPct.toFixed(0)}%`),
      row("System Status", status),
      row("Design Guidance", guidance),
      row("Engineering Insight", insight)
    ]);

    renderChart({
      peak,
      required,
      watts,
      utilizationPct
    });

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        peakLoadA: peak,
        requiredSupplyA: required,
        watts,
        utilizationPct,
        status
      }
    });

    currentReport = buildCurrentReportPayload();
    setExportEnabled(!!currentReport);
    setExportStatus(currentReport ? "Calculation ready. Open Export Report or Save Snapshot." : "");

    showContinue();
  }

  els.calc.addEventListener("click", calc);

  if (els.exportReport) {
    els.exportReport.addEventListener("click", () => {
      if (!currentReport) {
        setExportStatus("Run analysis before exporting a report.");
        return;
      }

      currentReport = {
        ...currentReport,
        generatedAt: new Date().toISOString(),
        meta: getReportMeta(),
        chartImage: getChartImage()
      };

      const ok = openReportWindow(currentReport);
      setExportStatus(ok ? "Export report opened in a new tab." : "Popup blocked or export failed.");
    });
  }

  if (els.saveSnapshot) {
    els.saveSnapshot.addEventListener("click", () => {
      if (!currentReport) {
        setExportStatus("Run analysis before saving a snapshot.");
        return;
      }

      currentReport = {
        ...currentReport,
        generatedAt: new Date().toISOString(),
        meta: getReportMeta(),
        chartImage: getChartImage()
      };

      const count = saveSnapshotToStorage(REPORT_SAVE_KEY, currentReport, 25);
      setExportStatus(`Saved locally. ${count} snapshot${count === 1 ? "" : "s"} stored for this tool.`);
    });
  }

  els.reset.addEventListener("click", invalidate);

  [els.lockType, els.voltage, els.amps, els.locks, els.simul, els.headroom].forEach((el) => {
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
      setExportStatus("Export details updated.");
    });
  });

  els.nextBtn.addEventListener("click", () => {
    window.location.href = "/tools/access-control/panel-capacity/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    unlockCategoryPage();
    setTimeout(() => {
      unlockCategoryPage();
    }, 400);

    loadFlowContext();
    hideContinue();
    setExportEnabled(false);
  });
})();