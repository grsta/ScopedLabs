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
    if (chart) {
      chart.destroy();
      chart = null;
    }

    hideChartWrap();
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

  function getExportChartImage() {
    if (!lastMetrics || typeof Chart === "undefined") return getChartImage();

    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 620;

      const ctx = canvas.getContext("2d");
      if (!ctx) return getChartImage();

      const labels = [
        "System Load",
        "Expansion Pressure",
        "Panels x10",
        "Readers"
      ];

      const values = [
        lastMetrics.loadPct,
        lastMetrics.expansionPct,
        lastMetrics.panels * 10,
        lastMetrics.readers
      ];

      const displayValues = {
        0: `${lastMetrics.loadPct.toFixed(0)}%`,
        1: `${lastMetrics.expansionPct.toFixed(0)}%`,
        2: `${lastMetrics.panels} panels`,
        3: `${lastMetrics.readers} readers`
      };

      const referenceValue = 65;
      const dominantIndex = values.indexOf(Math.max(...values));
      const maxValue = Math.max(...values, referenceValue, 100);

      let exportChart = null;

      const bgPlugin = {
        id: "exportBgPlugin",
        beforeDraw(chartInstance) {
          const { ctx, chartArea } = chartInstance;
          if (!chartArea) return;

          const { left, top, width, height, right, bottom } = chartArea;
          const x = chartInstance.scales.x;

          ctx.save();

          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, chartInstance.width, chartInstance.height);

          ctx.fillStyle = "#f8fbf9";
          ctx.fillRect(left, top, width, height);

          const healthyMax = Math.min(65, x.max);
          const watchMax = Math.min(85, x.max);

          if (healthyMax > 0) {
            ctx.fillStyle = "rgba(34, 197, 94, 0.14)";
            ctx.fillRect(left, top, x.getPixelForValue(healthyMax) - left, height);
          }

          if (watchMax > 65) {
            ctx.fillStyle = "rgba(245, 158, 11, 0.14)";
            ctx.fillRect(
              x.getPixelForValue(65),
              top,
              x.getPixelForValue(watchMax) - x.getPixelForValue(65),
              height
            );
          }

          if (x.max > 85) {
            ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
            ctx.fillRect(
              x.getPixelForValue(85),
              top,
              right - x.getPixelForValue(85),
              height
            );
          }

          ctx.restore();
        },
        afterDatasetsDraw(chartInstance) {
          const { ctx, chartArea, scales } = chartInstance;
          if (!chartArea || !scales.x || !scales.y) return;

          const x = scales.x;
          const y = scales.y;
          const { top, bottom } = chartArea;

          ctx.save();

          const rx = x.getPixelForValue(referenceValue);
          ctx.strokeStyle = "#198754";
          ctx.lineWidth = 3;
          ctx.setLineDash([6, 5]);
          ctx.beginPath();
          ctx.moveTo(rx, top);
          ctx.lineTo(rx, bottom);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = "#1f2937";
          ctx.font = "600 16px Arial";
          ctx.fillText("Healthy Capacity Floor", rx + 10, bottom - 12);

          ctx.fillStyle = "#15803d";
          ctx.font = "700 15px Arial";
          ctx.fillText("Healthy", x.getPixelForValue(6), top + 18);

          ctx.fillStyle = "#b45309";
          ctx.fillText("Watch", x.getPixelForValue(69), top + 18);

          ctx.fillStyle = "#b91c1c";
          ctx.fillText("Risk", x.getPixelForValue(89), top + 18);

          const dominantValue = values[dominantIndex];
          const px = x.getPixelForValue(dominantValue);
          const py = y.getPixelForValue(labels[dominantIndex]);

          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.strokeStyle = "#111827";
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = "#1f2937";
          ctx.font = "600 15px Arial";
          ctx.fillText(displayValues[dominantIndex], Math.min(px + 10, chartArea.right - 120), py - 10);

          ctx.restore();
        }
      };

      exportChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Panel Capacity Metrics",
              data: values,
              indexAxis: "y",
              barThickness: 18,
              maxBarThickness: 18,
              barPercentage: 0.8,
              categoryPercentage: 0.7,
              borderRadius: 8,
              borderSkipped: false,
              borderWidth: 1.5,
              backgroundColor: (context) => {
                const i = context.dataIndex;
                const v = context.raw;

                if (i === dominantIndex) {
                  if (v > 85) return "#dc2626";
                  if (v > 65) return "#f59e0b";
                  return "#22c55e";
                }

                if (v > 85) return "rgba(220, 38, 38, 0.55)";
                if (v > 65) return "rgba(245, 158, 11, 0.50)";
                return "rgba(59, 130, 246, 0.42)";
              },
              borderColor: (context) => {
                const i = context.dataIndex;
                const v = context.raw;

                if (i === dominantIndex) {
                  if (v > 85) return "#7f1d1d";
                  if (v > 65) return "#92400e";
                  return "#166534";
                }

                if (v > 85) return "#991b1b";
                if (v > 65) return "#b45309";
                return "#1d4ed8";
              }
            }
          ]
        },
        options: {
          responsive: false,
          maintainAspectRatio: false,
          animation: false,
          indexAxis: "y",
          layout: {
            padding: {
              top: 36,
              right: 22,
              bottom: 10,
              left: 18
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false }
          },
          scales: {
            x: {
              beginAtZero: true,
              suggestedMax: Math.ceil(maxValue * 1.08),
              ticks: {
                color: "#334155",
                font: {
                  size: 14,
                  weight: "600"
                }
              },
              grid: {
                color: "rgba(15, 23, 42, 0.08)"
              },
              border: {
                color: "rgba(15, 23, 42, 0.18)"
              },
              title: {
                display: true,
                text: "Capacity Stress Magnitude",
                color: "#0f172a",
                font: {
                  size: 15,
                  weight: "700"
                }
              }
            },
            y: {
              ticks: {
                color: "#0f172a",
                font: {
                  size: 15,
                  weight: "700"
                }
              },
              grid: {
                display: false
              },
              border: {
                color: "rgba(15, 23, 42, 0.18)"
              }
            }
          }
        },
        plugins: [bgPlugin]
      });

      const dataUrl = canvas.toDataURL("image/png", 1);

      if (exportChart) {
        exportChart.destroy();
        exportChart = null;
      }

      return dataUrl;
    } catch (err) {
      console.error("Export chart render failed:", err);
      return getChartImage();
    }
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

    if (Number.isFinite(Number(d.peakLoadA))) lines.push(`Peak Load: <strong>${Number(d.peakLoadA).toFixed(2)} A</strong>`);
    if (Number.isFinite(Number(d.requiredSupplyA))) lines.push(`Required Supply: <strong>${Number(d.requiredSupplyA).toFixed(2)} A</strong>`);
    if (Number.isFinite(Number(d.watts))) lines.push(`Power: <strong>${Number(d.watts).toFixed(1)} W</strong>`);
    if (d.status) lines.push(`Power Status: <strong>${escapeHtml(d.status)}</strong>`);

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
      Use that lock-power result as the basis for deciding how much controller and expansion capacity the full system really needs with growth margin included.
    `;
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

  function renderChart(metrics) {
    destroyChart();

    if (!els.chart) return;

    showChartWrap();

    const labels = [
      "System Load",
      "Expansion Pressure",
      "Panels x10",
      "Readers"
    ];

    const values = [
      metrics.loadPct,
      metrics.expansionPct,
      metrics.panels * 10,
      metrics.readers
    ];

    const displayValues = {
      0: `${metrics.loadPct.toFixed(0)}%`,
      1: `${metrics.expansionPct.toFixed(0)}%`,
      2: `${metrics.panels} panels`,
      3: `${metrics.readers} readers`
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
        ctx.fillText("Healthy Capacity Floor", rx + 8, bottom - 10);

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

    chart = new Chart(els.chart, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Panel Capacity Metrics",
            data: values,
            barThickness: 16,
            maxBarThickness: 16,
            barPercentage: 0.8,
            categoryPercentage: 0.7,
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
              text: "Capacity Stress Magnitude",
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

    els.chart.style.width = "100%";
    els.chart.style.height = "340px";

    if (els.chart.parentElement) {
      els.chart.parentElement.style.minHeight = "340px";
    }
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
      readers
    };

    renderChart(lastMetrics);

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
    updateExportControls();
    showContinue();
  }

  function bindEvents() {
    if (els.calc) {
      els.calc.addEventListener("click", calc);
    }

    if (els.exportReport) {
      els.exportReport.addEventListener("click", () => {
        if (!hasExportAccess()) {
          updateExportControls("Export is available with Access Control category unlock.");
          return;
        }

        if (!currentReport) {
          updateExportControls("Run analysis before exporting a report.");
          return;
        }

        currentReport = {
          ...currentReport,
          generatedAt: new Date().toISOString(),
          meta: getReportMeta(),
          chartImage: getExportChartImage()
        };

        const ok = openReportWindow(currentReport);
        updateExportControls(ok ? "Export report opened in a new tab." : "Popup blocked or export failed.");
      });
    }

    if (els.saveSnapshot) {
      els.saveSnapshot.addEventListener("click", () => {
        if (!hasExportAccess()) {
          updateExportControls("Export is available with Access Control category unlock.");
          return;
        }

        if (!currentReport) {
          updateExportControls("Run analysis before saving a snapshot.");
          return;
        }

        currentReport = {
          ...currentReport,
          generatedAt: new Date().toISOString(),
          meta: getReportMeta(),
          chartImage: getExportChartImage()
        };

        const count = saveSnapshotToStorage(REPORT_SAVE_KEY, currentReport, 25);
        updateExportControls(`Saved locally. ${count} snapshot${count === 1 ? "" : "s"} stored for this tool.`);
      });
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

    unlockCategoryPage();

    setTimeout(() => {
      unlockCategoryPage();
      updateExportControls();
    }, 400);

    setTimeout(() => {
      unlockCategoryPage();
      updateExportControls();
    }, 1200);
  }

  bindEvents();
  init();
})();