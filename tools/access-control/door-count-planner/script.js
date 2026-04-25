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
    exportStatus: $("exportStatus")
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
        "Doors",
        "Zones Impact",
        "Readers",
        "Complexity"
      ];

      const values = [
        lastMetrics.doors,
        lastMetrics.zonesImpact,
        lastMetrics.readers,
        lastMetrics.complexityIndex
      ];

      const displayValues = {
        0: `${lastMetrics.doors} doors`,
        1: `${lastMetrics.zonesImpact} impact`,
        2: `${lastMetrics.readers} readers`,
        3: `${lastMetrics.complexityIndex} complexity`
      };

      const referenceValue = 80;
      const dominantIndex = values.indexOf(Math.max(...values));
      const maxValue = Math.max(...values, referenceValue, 160);

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

          const healthyMax = Math.min(80, x.max);
          const watchMax = Math.min(140, x.max);

          if (healthyMax > 0) {
            ctx.fillStyle = "rgba(34, 197, 94, 0.14)";
            ctx.fillRect(left, top, x.getPixelForValue(healthyMax) - left, height);
          }

          if (watchMax > 80) {
            ctx.fillStyle = "rgba(245, 158, 11, 0.14)";
            ctx.fillRect(
              x.getPixelForValue(80),
              top,
              x.getPixelForValue(watchMax) - x.getPixelForValue(80),
              height
            );
          }

          if (x.max > 140) {
            ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
            ctx.fillRect(
              x.getPixelForValue(140),
              top,
              right - x.getPixelForValue(140),
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
          ctx.fillText("Complexity Watch Limit", rx + 10, bottom - 12);

          ctx.fillStyle = "#15803d";
          ctx.font = "700 15px Arial";
          ctx.fillText("Healthy", x.getPixelForValue(8), top + 18);

          ctx.fillStyle = "#b45309";
          ctx.fillText("Watch", x.getPixelForValue(88), top + 18);

          ctx.fillStyle = "#b91c1c";
          ctx.fillText("Risk", x.getPixelForValue(148), top + 18);

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
              label: "Door Planning Metrics",
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
                  if (v > 140) return "#dc2626";
                  if (v > 80) return "#f59e0b";
                  return "#22c55e";
                }

                if (v > 140) return "rgba(220, 38, 38, 0.55)";
                if (v > 80) return "rgba(245, 158, 11, 0.50)";
                return "rgba(59, 130, 246, 0.42)";
              },
              borderColor: (context) => {
                const i = context.dataIndex;
                const v = context.raw;

                if (i === dominantIndex) {
                  if (v > 140) return "#7f1d1d";
                  if (v > 80) return "#92400e";
                  return "#166534";
                }

                if (v > 140) return "#991b1b";
                if (v > 80) return "#b45309";
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
                text: "Planning Magnitude",
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

  function buildCurrentReportPayload() {
    const outputs = collectVisibleResults();

    if (!outputs.length) return null;

    return {
      reportId: makeReportId("SL-ACC-DOORCOUNT"),
      generatedAt: new Date().toISOString(),
      category: CATEGORY_LABEL,
      categorySlug: CATEGORY,
      tool: TOOL_LABEL,
      toolSlug: TOOL,
      status: getStatusFromResults(outputs),
      summary: getSummaryFromResults(outputs),
      interpretation: getInterpretationFromResults(outputs),
      inputs: [
        { label: "Perimeter Entrances", value: String(els.perimeter.value) },
        { label: "Interior Zones / Departments", value: String(els.zones.value) },
        { label: "High-Security Areas", value: String(els.highsec.value) },
        { label: "Compliance Level", value: els.compliance.options[els.compliance.selectedIndex]?.text || els.compliance.value },
        { label: "Control Both Sides?", value: els.bothSides.options[els.bothSides.selectedIndex]?.text || els.bothSides.value }
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

  function renderChart(data) {
    destroyChart();

    if (!els.chart) return;

    showChartWrap();

    const labels = [
      "Doors",
      "Zones Impact",
      "Readers",
      "Complexity"
    ];

    const values = [
      data.doors,
      data.zonesImpact,
      data.readers,
      data.complexityIndex
    ];

    const displayValues = {
      0: `${data.doors} doors`,
      1: `${data.zonesImpact} impact`,
      2: `${data.readers} readers`,
      3: `${data.complexityIndex} complexity`
    };

    const dominantIndex = values.indexOf(Math.max(...values));
    const referenceValue = 80;
    const chartMax = Math.max(160, Math.ceil(Math.max(...values, referenceValue, 140) * 1.12));

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

        const healthyMax = Math.min(80, x.max);
        const watchMax = Math.min(140, x.max);

        ctx.save();

        if (healthyMax > 0) {
          ctx.fillStyle = "rgba(46, 204, 113, 0.16)";
          ctx.fillRect(left, top, x.getPixelForValue(healthyMax) - left, bottom - top);
        }

        if (watchMax > 80) {
          ctx.fillStyle = "rgba(255, 200, 80, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(80),
            top,
            x.getPixelForValue(watchMax) - x.getPixelForValue(80),
            bottom - top
          );
        }

        if (x.max > 140) {
          ctx.fillStyle = "rgba(255, 90, 90, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(140),
            top,
            right - x.getPixelForValue(140),
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
        ctx.fillText("Complexity Watch Limit", rx + 8, bottom - 10);

        ctx.fillStyle = "rgba(180, 255, 200, 0.82)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText("Healthy", x.getPixelForValue(8), top + 14);

        ctx.fillStyle = "rgba(255, 220, 140, 0.82)";
        ctx.fillText("Watch", x.getPixelForValue(88), top + 14);

        ctx.fillStyle = "rgba(255, 160, 160, 0.82)";
        ctx.fillText("Risk", x.getPixelForValue(148), top + 14);

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
            label: "Door Planning Metrics",
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
                if (v > 140) return "rgba(255, 92, 92, 1)";
                if (v > 80) return "rgba(255, 188, 82, 1)";
                return "rgba(120, 255, 170, 1)";
              }

              if (v > 140) return "rgba(255, 77, 77, 0.30)";
              if (v > 80) return "rgba(255, 170, 51, 0.24)";
              return "rgba(90, 170, 255, 0.15)";
            },
            borderColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 140) return "rgba(255, 220, 220, 1)";
                if (v > 80) return "rgba(255, 240, 210, 1)";
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
              text: "Planning Magnitude",
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

    lastMetrics = {
      doors,
      zonesImpact,
      readers,
      complexityIndex
    };

    renderChart(lastMetrics);

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

  reset();
})();