(() => {
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:door-cable-length";

  const $ = (id) => document.getElementById(id);
  let chart = null;
  let currentReport = null;

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

  function row(label, value) {
    return `
      <div class="result-row">
        <span class="result-label">${label}</span>
        <span class="result-value">${value}</span>
      </div>
    `;
  }

  function destroyChart() {
    if (chart) {
      chart.destroy();
      chart = null;
    }
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

  function collectVisibleResults() {
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
      "This export reflects the current on-screen tool results at the time the report was opened or saved."
    ];
  }

  function buildCurrentReportPayload() {
    const outputs = collectVisibleResults();
    if (!outputs.length) return null;

    return {
      reportId: makeReportId("SL-ACC-CABLE"),
      generatedAt: new Date().toISOString(),
      category: "Access Control",
      tool: "Door Cable Length Estimator",
      status: getStatusFromResults(outputs),
      summary: getSummaryFromResults(outputs),
      interpretation: getInterpretationFromResults(outputs),
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
      chartImage: getChartImage(),
      meta: getReportMeta()
    };
  }

  function resetResults() {
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    destroyChart();
    currentReport = null;
    setExportEnabled(false);
    setExportStatus("");
  }

  function setCableEnabledFromRuns() {
    const isMulti = els.runs.value === "multi";
    els.cables.disabled = !isMulti;
    if (!isMulti) els.cables.value = 1;
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

  function renderChart(metrics) {
    destroyChart();
    if (!els.chart) return;

    const labels = [
      "Per-Door Cable",
      "Routing Loss %",
      "Cable Density",
      "Total Cable / 100"
    ];

    const values = [
      metrics.perDoorTotal,
      metrics.routingLossPct,
      metrics.cableDensity * 40,
      metrics.totalAllDoors / 100
    ];

    const displayNote = {
      0: `${metrics.perDoorTotal.toFixed(1)} ft`,
      1: `${metrics.routingLossPct.toFixed(0)}%`,
      2: `${metrics.cableDensity.toFixed(2)}`,
      3: `${metrics.totalAllDoors.toFixed(0)} ft total`
    };

    const dominantIndex = values.indexOf(Math.max(...values));
    const referenceValue = 220;
    const chartMax = Math.max(300, Math.ceil(Math.max(...values, referenceValue) * 1.12));

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

        const healthyMax = Math.min(160, x.max);
        const watchMax = Math.min(220, x.max);

        ctx.save();

        if (healthyMax > 0) {
          ctx.fillStyle = "rgba(46, 204, 113, 0.16)";
          ctx.fillRect(left, top, x.getPixelForValue(healthyMax) - left, bottom - top);
        }

        if (watchMax > 160) {
          ctx.fillStyle = "rgba(255, 200, 80, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(160),
            top,
            x.getPixelForValue(watchMax) - x.getPixelForValue(160),
            bottom - top
          );
        }

        if (x.max > 220) {
          ctx.fillStyle = "rgba(255, 90, 90, 0.13)";
          ctx.fillRect(
            x.getPixelForValue(220),
            top,
            right - x.getPixelForValue(220),
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
        ctx.fillText("Install Watch Limit", rx + 8, bottom - 10);

        ctx.fillStyle = "rgba(180, 255, 200, 0.82)";
        ctx.font = "600 11px sans-serif";
        ctx.fillText("Healthy", x.getPixelForValue(8), top + 14);

        ctx.fillStyle = "rgba(255, 220, 140, 0.82)";
        ctx.fillText("Watch", x.getPixelForValue(168), top + 14);

        ctx.fillStyle = "rgba(255, 160, 160, 0.82)";
        ctx.fillText("Risk", x.getPixelForValue(228), top + 14);

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
        ctx.fillText(displayNote[dominantIndex], Math.min(px + 8, chartArea.right - 80), py - 8);

        ctx.restore();
      }
    };

    chart = new Chart(els.chart, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Cable Planning Metrics",
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
                if (v > 220) return "rgba(255, 92, 92, 1)";
                if (v > 160) return "rgba(255, 188, 82, 1)";
                return "rgba(120, 255, 170, 1)";
              }

              if (v > 220) return "rgba(255, 77, 77, 0.30)";
              if (v > 160) return "rgba(255, 170, 51, 0.24)";
              return "rgba(90, 170, 255, 0.15)";
            },
            borderColor: (context) => {
              const i = context.dataIndex;
              const v = context.raw;

              if (i === dominantIndex) {
                if (v > 220) return "rgba(255, 220, 220, 1)";
                if (v > 160) return "rgba(255, 240, 210, 1)";
                return "rgba(215, 255, 230, 1)";
              }

              return "rgba(120,170,200,0.18)";
            },
            hoverBackgroundColor: (context) => {
              const v = context.raw;
              if (v > 220) return "rgba(255, 105, 105, 1)";
              if (v > 160) return "rgba(255, 198, 95, 1)";
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
                return ` ${displayNote[i]}`;
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
              text: "Installation Magnitude",
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
      }
    });

    if (els.chart) {
      els.chart.style.width = "100%";
      els.chart.style.height = "340px";
      if (els.chart.parentElement) {
        els.chart.parentElement.style.minHeight = "340px";
      }
    }
  }

  function calc() {
    const distance = Math.max(0, n("distance"));
    const routing = parseFloat(els.routing.value);
    const slack = Math.max(0, n("slack"));
    const doors = Math.max(1, n("doors"));
    const runs = els.runs.value;
    const cables = Math.max(1, Math.floor(n("cables")));

    const routed = distance * (Number.isFinite(routing) ? routing : 1.3);
    const routingLossPct = (routing - 1) * 100;
    const perDoorSingle = routed + slack;
    const perDoorTotal = runs === "multi" ? perDoorSingle * cables : perDoorSingle;
    const totalAllDoors = perDoorTotal * doors;
    const cableDensity = perDoorTotal / Math.max(1, distance);

    const difficulty = getDifficulty(perDoorTotal, cableDensity, totalAllDoors);
    const recommendation = getRecommendation(difficulty, runs, distance);
    const insight = getInsight(difficulty);

    els.results.innerHTML = [
      row("Routed Distance (per door)", `${routed.toFixed(1)} ft`),
      row("Routing Loss", `${routingLossPct.toFixed(0)}%`),
      row("Estimated Run (single cable)", `${perDoorSingle.toFixed(1)} ft`),
      row("Estimated Total per Door", `${perDoorTotal.toFixed(1)} ft`),
      row("Estimated Total Cable", `${totalAllDoors.toFixed(1)} ft`),
      row("Cable Density", cableDensity.toFixed(2)),
      row("Install Difficulty", difficulty),
      row("Design Guidance", recommendation),
      row("Engineering Insight", insight)
    ].join("");

    renderChart({
      perDoorTotal,
      routingLossPct,
      cableDensity,
      totalAllDoors
    });

    currentReport = buildCurrentReportPayload();
    setExportEnabled(!!currentReport);
    setExportStatus(currentReport ? "Calculation ready. Open Export Report or Save Snapshot." : "");
  }

  function reset() {
    els.distance.value = 120;
    els.routing.value = "1.30";
    els.slack.value = 15;
    els.doors.value = 8;
    els.runs.value = "single";
    els.cables.value = 4;
    setCableEnabledFromRuns();
    resetResults();
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

  els.reset.addEventListener("click", reset);

  els.runs.addEventListener("change", () => {
    setCableEnabledFromRuns();
    resetResults();
  });

  [els.distance, els.routing, els.slack, els.doors, els.cables].forEach((el) => {
    el.addEventListener("input", resetResults);
    el.addEventListener("change", resetResults);
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

  reset();
})();
