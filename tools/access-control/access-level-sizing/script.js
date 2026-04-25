(() => {
  const CATEGORY = "access-control";
  const STEP = "access-level-sizing";
  const LANE = "v1";
  const PREVIOUS_STEP = "panel-capacity";
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:access-level-sizing";

  const FLOW_KEYS = {
    "reader-type-selector": "scopedlabs:pipeline:access-control:reader-type-selector",
    "fail-safe-fail-secure": "scopedlabs:pipeline:access-control:fail-safe-fail-secure",
    "lock-power-budget": "scopedlabs:pipeline:access-control:lock-power-budget",
    "panel-capacity": "scopedlabs:pipeline:access-control:panel-capacity",
    "access-level-sizing": "scopedlabs:pipeline:access-control:access-level-sizing"
  };

  const $ = (id) => document.getElementById(id);

  let chart = null;
  let currentReport = null;

  const els = {
    roles: $("roles"),
    areas: $("areas"),
    schedules: $("schedules"),
    doorGroups: $("doorGroups"),
    complexity: $("complexity"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    completeWrap: $("complete-wrap"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    calc: $("calc"),
    reset: $("reset"),
    chart: $("chart"),
    chartWrap: $("chartWrap"),
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
    return {
      reportTitle: (els.reportTitle?.value || "").trim() || "Access Level Sizing Assessment",
      projectName: (els.projectName?.value || "").trim(),
      clientName: (els.clientName?.value || "").trim(),
      preparedBy: (els.preparedBy?.value || "").trim(),
      customNotes: (els.customNotes?.value || "").trim()
    };
  }

  function getChartImage() {
    try {
      if (chart && typeof chart.toBase64Image === "function") {
        return chart.toBase64Image("image/png", 1);
      }
    } catch {}

    return "";
  }

  function showChartWrap() {
    if (els.chartWrap) els.chartWrap.hidden = false;
  }

  function hideChartWrap() {
    if (els.chartWrap) els.chartWrap.hidden = true;
  }

  function getExportChartImage() {
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1200;
      canvas.height = 620;

      const ctx = canvas.getContext("2d");
      if (!ctx) return getChartImage();

      const roles = num(els.roles.value);
      const areas = num(els.areas.value);
      const schedules = num(els.schedules.value);
      const groups = num(els.doorGroups.value);
      const complexity = els.complexity.value;

      const base = roles * areas;
      const complexityFactor = getComplexityFactor(complexity);
      const schedulePenalty = 1 + schedules * 0.1;
      const groupPenalty = 1 + groups * 0.05;

      const total = Math.round(base * schedulePenalty * groupPenalty * complexityFactor);
      const combinations = base;
      const recommendedLimit = getRecommendedLimit(complexity);

      const labels = [
        "Access Levels",
        "Role-Area Combos",
        "Schedules",
        "Door Groups"
      ];

      const values = [
        total,
        combinations,
        schedules,
        groups
      ];

      const maxValue = Math.max(...values, recommendedLimit, 160);
      const dominantIndex = values.indexOf(Math.max(...values));

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
          const watchMax = Math.min(150, x.max);

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

          if (x.max > 150) {
            ctx.fillStyle = "rgba(239, 68, 68, 0.12)";
            ctx.fillRect(
              x.getPixelForValue(150),
              top,
              right - x.getPixelForValue(150),
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

          const rx = x.getPixelForValue(recommendedLimit);
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
          ctx.fillText(`Recommended Limit (${recommendedLimit})`, rx + 10, bottom - 12);

          ctx.fillStyle = "#15803d";
          ctx.font = "700 15px Arial";
          ctx.fillText("Healthy", x.getPixelForValue(8), top + 18);

          ctx.fillStyle = "#b45309";
          ctx.fillText("Watch", x.getPixelForValue(88), top + 18);

          ctx.fillStyle = "#b91c1c";
          ctx.fillText("Risk", x.getPixelForValue(158), top + 18);

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

          ctx.restore();
        }
      };

      exportChart = new Chart(ctx, {
        type: "bar",
        data: {
          labels,
          datasets: [
            {
              label: "Access Design Metrics",
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
                  if (v > 150) return "#dc2626";
                  if (v > 80) return "#f59e0b";
                  return "#22c55e";
                }

                if (v > 150) return "rgba(220, 38, 38, 0.55)";
                if (v > 80) return "rgba(245, 158, 11, 0.50)";
                return "rgba(59, 130, 246, 0.42)";
              },
              borderColor: (context) => {
                const i = context.dataIndex;
                const v = context.raw;

                if (i === dominantIndex) {
                  if (v > 150) return "#7f1d1d";
                  if (v > 80) return "#92400e";
                  return "#166534";
                }

                if (v > 150) return "#991b1b";
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
                text: "Complexity Magnitude",
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
        { label: "Complexity", value: core.inputs.complexityLabel }
      ],
      outputs: [
        { label: "Access Levels", value: String(core.outputs.total) },
        { label: "Role-Area Combinations", value: String(core.outputs.combinations) },
        { label: "Scaling Pressure", value: core.outputs.scalingPressure.toFixed(1) },
        { label: "Admin Load Index", value: core.outputs.adminLoadIndex.toFixed(1) },
        { label: "Recommended Limit", value: String(core.outputs.recommendedLimit) },
        { label: "Complexity", value: core.outputs.riskLabel },
        { label: "Threshold Check", value: core.outputs.thresholdMessage },
        { label: "Overshoot", value: String(core.outputs.overshoot) }
      ],
      assumptions: assumptionsForTool(),
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
    if (chart) {
      chart.destroy();
      chart = null;
    }

    hideChartWrap();
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

  function renderChart(total, roles, areas, schedules, groups, recommendedLimit) {
    if (!els.chart) return;

    showChartWrap();

    if (chart) {
      chart.destroy();
      chart = null;
    }

    const labels = [
      "Access Levels",
      "Role-Area Combos",
      "Schedules",
      "Door Groups"
    ];

    const values = [
      total,
      roles * areas,
      schedules,
      groups
    ];

    const maxValue = Math.max(...values, recommendedLimit, 160);
    const dominantIndex = values.indexOf(Math.max(...values));

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
        const watchMax = Math.min(150, x.max);

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

        if (x.max > 150) {
          ctx.fillStyle = "rgba(255, 90, 90, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(150),
            top,
            right - x.getPixelForValue(150),
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

        const rx = x.getPixelForValue(recommendedLimit);
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
        ctx.fillText(`Recommended Limit (${recommendedLimit})`, rx + 8, bottom - 10);

        ctx.fillStyle = "rgba(180, 255, 200, 0.82)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText("Healthy", x.getPixelForValue(8), top + 14);

        ctx.fillStyle = "rgba(255, 220, 140, 0.82)";
        ctx.fillText("Watch", x.getPixelForValue(88), top + 14);

        ctx.fillStyle = "rgba(255, 160, 160, 0.82)";
        ctx.fillText("Risk", x.getPixelForValue(158), top + 14);

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

        ctx.restore();
      }
    };

    chart = new Chart(els.chart, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Access Design Metrics",
            barThickness: 16,
            maxBarThickness: 16,
            barPercentage: 0.8,
            categoryPercentage: 0.7,
            data: values,
            borderWidth: 2,
            borderRadius: 8,
            borderSkipped: false,
            backgroundColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 150) return "rgba(255, 92, 92, 1)";
                if (v > 80) return "rgba(255, 188, 82, 1)";
                return "rgba(120, 255, 170, 1)";
              }

              if (v > 150) return "rgba(255, 77, 77, 0.30)";
              if (v > 80) return "rgba(255, 170, 51, 0.24)";
              return "rgba(90, 170, 255, 0.15)";
            },
            borderColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 150) return "rgba(255, 220, 220, 1)";
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
                return ` ${context.raw}`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            suggestedMax: Math.ceil(maxValue * 1.08),
            ticks: {
              color: "rgba(220, 238, 230, 0.78)"
            },
            grid: {
              color: "rgba(110, 160, 140, 0.10)"
            },
            title: {
              display: true,
              text: "Complexity Magnitude",
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
    const roles = num(els.roles.value);
    const areas = num(els.areas.value);
    const schedules = num(els.schedules.value);
    const groups = num(els.doorGroups.value);
    const complexity = els.complexity.value;

    if (roles <= 0 || areas <= 0 || schedules < 0 || groups < 0) {
      invalidate("Enter valid positive values, then run analysis.");
      return;
    }

    const base = roles * areas;
    const complexityFactor = getComplexityFactor(complexity);
    const schedulePenalty = 1 + schedules * 0.1;
    const groupPenalty = 1 + groups * 0.05;

    const total = Math.round(base * schedulePenalty * groupPenalty * complexityFactor);
    const combinations = base;
    const scalingPressure = total / Math.max(1, roles + areas);
    const recommendedLimit = getRecommendedLimit(complexity);
    const overshoot = Math.max(0, total - recommendedLimit);
    const adminLoadIndex = Number(((schedules * 0.8) + (groups * 0.6) + (roles * 0.4)).toFixed(1));

    const risk = getRisk(total);

    let thresholdMessage = "Structure remains below the recommended complexity limit.";

    if (total > recommendedLimit) {
      thresholdMessage = `Design exceeds the recommended complexity limit by ${overshoot} levels.`;
    } else {
      thresholdMessage = `Design remains ${recommendedLimit - total} levels under the recommended limit.`;
    }

    els.results.innerHTML = [
      row("Access Levels", total),
      row("Role-Area Combinations", combinations),
      row("Scaling Pressure", scalingPressure.toFixed(1)),
      row("Admin Load Index", adminLoadIndex.toFixed(1)),
      row("Recommended Limit", recommendedLimit),
      row("Complexity", risk.label),
      row("Threshold Check", thresholdMessage),
      row("Engineering Insight", risk.insight)
    ].join("");

    renderChart(total, roles, areas, schedules, groups, recommendedLimit);

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
      overshoot
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
        complexityLabel: complexity.charAt(0).toUpperCase() + complexity.slice(1)
      },
      outputs: {
        total,
        combinations,
        scalingPressure,
        adminLoadIndex,
        recommendedLimit,
        riskLabel: risk.label,
        thresholdMessage,
        overshoot
      }
    });

    updateExportControls();
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
        chartImage: getExportChartImage(),
        meta: getReportMeta()
      };

      const ok = openReportWindow(currentReport);
      updateExportControls(ok ? "Export report opened in a new tab." : "Popup blocked. Allow popups for ScopedLabs and try again.");
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
        chartImage: getExportChartImage(),
        meta: getReportMeta()
      };

      const count = saveSnapshot(REPORT_SAVE_KEY, currentReport, 25);
      updateExportControls(`Saved locally. ${count} snapshot${count === 1 ? "" : "s"} stored for this tool.`);
    });
  }

  if (els.reset) {
    els.reset.addEventListener("click", resetAll);
  }

  [
    els.roles,
    els.areas,
    els.schedules,
    els.doorGroups,
    els.complexity
  ].forEach((el) => {
    if (!el) return;
    el.addEventListener("input", () => invalidate());
    el.addEventListener("change", () => invalidate());
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
    if (els.chart.parentElement) els.chart.parentElement.style.minHeight = "340px";
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    hideChartWrap();
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