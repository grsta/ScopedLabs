(() => {
  "use strict";

  const CATEGORY = "access-control";
  const STEP = "reader-type-selector";
  const LANE = "v1";
  const PREVIOUS_STEP = "fail-safe-fail-secure";
    const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:reader-type-selector";

  const FLOW_KEYS = {
    "fail-safe-fail-secure": "scopedlabs:pipeline:access-control:fail-safe-fail-secure",
    "reader-type-selector": "scopedlabs:pipeline:access-control:reader-type-selector",
    "lock-power-budget": "scopedlabs:pipeline:access-control:lock-power-budget",
    "panel-capacity": "scopedlabs:pipeline:access-control:panel-capacity",
    "access-level-sizing": "scopedlabs:pipeline:access-control:access-level-sizing"
  };

  const $ = (id) => document.getElementById(id);

  let hasResult = false;

  const els = {
    sec: $("sec"),
    cred: $("cred"),
    env: $("env"),
    throughput: $("throughput"),
    iface: $("iface"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    nextWrap: $("continue-wrap"),
    nextBtn: $("continue"),
    flowNote: $("flow-note")
  };

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

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["lock-power-budget"]);
      sessionStorage.removeItem(FLOW_KEYS["panel-capacity"]);
      sessionStorage.removeItem(FLOW_KEYS["access-level-sizing"]);
    } catch {}

    hideContinue();
    els.results.innerHTML = `<div class="muted">Run recommendation.</div>`;
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    loadFlowContext();
  }

  function render(rows) {
    els.results.innerHTML = "";
    rows.forEach((r) => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      els.results.appendChild(div);
    });
  }

  function loadFlowContext() {
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    if (!parsed || parsed.category !== "access-control" || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    const d = parsed.data || {};
    const lines = [];

    if (d.recommendation) lines.push(`Fail Mode: <strong>${d.recommendation}</strong>`);
    if (d.doorType) lines.push(`Door Type: <strong>${d.doorType}</strong>`);
    if (d.life) lines.push(`Life Safety: <strong>${d.life}</strong>`);
    if (d.threat) lines.push(`Threat: <strong>${d.threat}</strong>`);
    if (d.powerLoss) lines.push(`Power Reliability: <strong>${d.powerLoss}</strong>`);
    if (d.fire) lines.push(`Fire Integration: <strong>${d.fire}</strong>`);

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
      Use that door-behavior decision to choose a reader style that fits the security need, environment, and user experience instead of selecting reader hardware in isolation.
    `;
  }

  function calc() {
    const sec = els.sec.value;
    const cred = els.cred.value;
    const env = els.env.value;
    const throughput = els.throughput.value;
    const iface = els.iface.value;

    let interfaceRec =
      iface === "osdp"
        ? "OSDP (secure, supervised)"
        : "Wiegand (legacy, not encrypted)";

    let reader = "Smart card reader";
    if (cred === "mobile") reader = "Mobile credential reader";
    if (cred === "pin") reader = "Keypad reader";
    if (cred === "multi") reader = "Multi-factor reader";

    let security =
      sec === "high"
        ? "Encrypted credentials + OSDP + MFA recommended"
        : sec === "med"
        ? "Encrypted credentials recommended"
        : "Standard credentials acceptable";

    let envNote =
      env === "harsh"
        ? "Use industrial/IP-rated reader"
        : env === "outdoor"
        ? "Use weather-rated reader"
        : "Indoor-rated reader is fine";

    let throughputNote =
      throughput === "handsfree"
        ? "Long-range / BLE readers required"
        : throughput === "fast"
        ? "Optimize for fast authentication"
        : "Standard read speed acceptable";

    let interpretation = "";
    if (cred === "multi" || sec === "high") {
      interpretation = "This door is being treated as a higher-assurance checkpoint, so reader choice should prioritize credential integrity and stronger supervision over convenience alone.";
    } else if (throughput === "handsfree") {
      interpretation = "This opening is being optimized for flow and convenience, which changes the reader decision away from standard wall-reader assumptions and toward faster user interaction patterns.";
    } else {
      interpretation = "The recommended reader type is balanced for normal access-control conditions, where security, usability, and environment all matter but none of them are extreme enough to dominate the design outright.";
    }

    const guidance =
      iface === "wg"
        ? "If the panel can support it, consider moving away from Wiegand on new deployments so the reader decision does not lock the project into weaker signaling and less supervision."
        : "OSDP is the stronger default here. Keep wiring, reader compatibility, and address planning aligned early so the interface choice stays clean through deployment.";

    render([
      { label: "Reader Type", value: reader },
      { label: "Interface", value: interfaceRec },
      { label: "Security", value: security },
      { label: "Environment", value: envNote },
      { label: "Throughput", value: throughputNote },
      { label: "Engineering Interpretation", value: interpretation },
      { label: "Actionable Guidance", value: guidance }
    ]);

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        readerType: reader,
        interfaceRec,
        security,
        envNote,
        throughputNote,
        environment: env,
        priority: sec
      }
    });

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
        meta: getReportMeta()
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
        meta: getReportMeta()
      };

      const count = saveSnapshotToStorage(REPORT_SAVE_KEY, currentReport, 25);
      setExportStatus(`Saved locally. ${count} snapshot${count === 1 ? "" : "s"} stored for this tool.`);
    });
  }
els.reset.addEventListener("click", () => {
    els.sec.value = "low";
    els.cred.value = "card";
    els.env.value = "indoor";
    els.throughput.value = "standard";
    els.iface.value = "wg";
    invalidate();
  });

  [els.sec, els.cred, els.env, els.throughput, els.iface].forEach((el) => {
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  els.nextBtn.addEventListener("click", () => {
    window.location.href = "/tools/access-control/lock-power-budget/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    loadFlowContext();
    hideContinue();
  });
})();