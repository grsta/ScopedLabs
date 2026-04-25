(() => {
  "use strict";

  const DEFAULTS = {
    siteName: "ScopedLabs",
    siteTagline: "Engineering · Analysis · Tools",
    logoUrl: "https://scopedlabs.com/assets/favicon/favicon-32x32.png?v=1",
    resultSelector: "#results",
    inputContainerSelector: "#toolCard .form-grid",
    exportStatusSelector: "#exportStatus",
    exportButtonSelector: "#exportReport",
    snapshotButtonSelector: "#saveSnapshot",
    reportTitleSelector: "#reportTitle",
    projectNameSelector: "#projectName",
    clientNameSelector: "#clientName",
    preparedBySelector: "#preparedBy",
    customNotesSelector: "#customNotes",
    snapshotLimit: 25,
    enableOnProPages: true
  };

  const state = {
    options: {},
    observer: null,
    initialized: false
  };

  const $ = (selector, root = document) => root.querySelector(selector);

  function mergeOptions(options = {}) {
    const body = document.body || {};

    const categorySlug = options.categorySlug || body.dataset?.category || "general";
    const toolSlug =
      options.toolSlug ||
      body.dataset?.tool ||
      body.dataset?.step ||
      document.location.pathname.split("/").filter(Boolean).pop() ||
      "tool";

    const categoryLabel = options.categoryLabel || titleCase(categorySlug);
    const toolLabel =
      options.toolLabel ||
      document.querySelector("h1")?.textContent?.trim() ||
      titleCase(toolSlug);

    return {
      ...DEFAULTS,
      categorySlug,
      categoryLabel,
      toolSlug,
      toolLabel,
      reportPrefix: options.reportPrefix || makePrefix(categorySlug, toolSlug),
      snapshotKey:
        options.snapshotKey ||
        `scopedlabs:reports:${categorySlug}:${toolSlug}`,
      assumptions:
        options.assumptions ||
        [
          "This report reflects the visible tool inputs and outputs at the time the export was generated.",
          "ScopedLabs outputs are planning aids only and should be verified against project requirements, manufacturer documentation, and site-specific conditions."
        ],
      disclaimer:
        options.disclaimer ||
        "ScopedLabs outputs are planning aids only and do not replace formal engineering review, code compliance review, site-specific validation, manufacturer documentation, or platform-specific design validation.",
      ...options
    };
  }

  function titleCase(value) {
    return String(value || "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  function makePrefix(categorySlug, toolSlug) {
    const cat = String(categorySlug || "GEN")
      .split("-")
      .map((x) => x[0] || "")
      .join("")
      .toUpperCase();

    const tool = String(toolSlug || "TOOL")
      .split("-")
      .map((x) => x[0] || "")
      .join("")
      .toUpperCase();

    return `SL-${cat}-${tool}`;
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

        if (normalizeSlug(raw).includes(state.options.categorySlug)) {
          found.add(state.options.categorySlug);
        }

        try {
          const parsed = JSON.parse(raw);
          if (valueContainsCategory(parsed, state.options.categorySlug)) {
            found.add(state.options.categorySlug);
          }
        } catch {}
      });
    } catch {}

    return Array.from(found).filter(Boolean);
  }

  function hasExportAccess() {
    const body = document.body;

    if (state.options.alwaysAllowExport === true) return true;

    if (
      state.options.enableOnProPages &&
      (body?.dataset?.tier === "pro" || body?.dataset?.protected === "true")
    ) {
      return true;
    }

    return hasStoredAuth() && getUnlockedCategories().includes(state.options.categorySlug);
  }

  function setStatus(message = "") {
    const statusEl = $(state.options.exportStatusSelector);
    if (statusEl) statusEl.textContent = message;
  }

  function setButtonsEnabled(enabled) {
    const exportBtn = $(state.options.exportButtonSelector);
    const snapshotBtn = $(state.options.snapshotButtonSelector);

    if (exportBtn) exportBtn.disabled = !enabled;
    if (snapshotBtn) snapshotBtn.disabled = !enabled;
  }

  function getResultRows() {
    const resultEl = $(state.options.resultSelector);
    if (!resultEl) return [];

    return Array.from(resultEl.querySelectorAll(".result-row"))
      .map((rowEl) => {
        const label =
          rowEl.querySelector(".result-label")?.textContent?.trim() ||
          rowEl.querySelector(".k")?.textContent?.trim() ||
          "";

        const value =
          rowEl.querySelector(".result-value")?.textContent?.trim() ||
          rowEl.querySelector(".v")?.textContent?.trim() ||
          "";

        return { label, value };
      })
      .filter((item) => item.label && item.value);
  }

  function hasUsableResults() {
    return getResultRows().length > 0;
  }

  function readFieldLabel(field) {
    return (
      field.querySelector(".label")?.textContent?.trim() ||
      field.querySelector("label")?.textContent?.trim() ||
      field.textContent?.trim() ||
      ""
    );
  }

  function readControlValue(control) {
    if (!control) return "";

    if (control.tagName === "SELECT") {
      return control.options[control.selectedIndex]?.textContent?.trim() || control.value || "";
    }

    if (control.type === "checkbox") {
      return control.checked ? "Yes" : "No";
    }

    if (control.type === "radio") {
      return control.checked ? control.value : "";
    }

    return String(control.value ?? "").trim();
  }

  function getInputRows() {
    const container = $(state.options.inputContainerSelector);
    if (!container) return [];

    return Array.from(container.querySelectorAll(".field"))
      .map((field) => {
        const control = field.querySelector("input, select, textarea");
        if (!control) return null;

        const label = readFieldLabel(field);
        const value = readControlValue(control);

        if (!label || value === "") return null;

        return { label, value };
      })
      .filter(Boolean);
  }

  function getMeta() {
    return {
      reportTitle:
        ($(state.options.reportTitleSelector)?.value || "").trim() ||
        `${state.options.toolLabel} Assessment`,
      projectName: ($(state.options.projectNameSelector)?.value || "").trim(),
      clientName: ($(state.options.clientNameSelector)?.value || "").trim(),
      preparedBy: ($(state.options.preparedBySelector)?.value || "").trim(),
      customNotes: ($(state.options.customNotesSelector)?.value || "").trim()
    };
  }

  function getStatusFromOutputs(outputs) {
    const candidates = [
      "System Status",
      "Status",
      "Operational Risk",
      "Install Difficulty",
      "Complexity",
      "Risk",
      "Health"
    ];

    const found = outputs.find((row) =>
      candidates.some((label) => normalizeSlug(row.label) === normalizeSlug(label))
    );

    const raw = normalizeSlug(found?.value || "");

    if (
      raw.includes("risk") ||
      raw.includes("high") ||
      raw.includes("critical") ||
      raw.includes("overload") ||
      raw.includes("failed")
    ) {
      return "RISK";
    }

    if (
      raw.includes("watch") ||
      raw.includes("moderate") ||
      raw.includes("tight") ||
      raw.includes("warning") ||
      raw.includes("caution")
    ) {
      return "WATCH";
    }

    return "HEALTHY";
  }

  function getInterpretationFromOutputs(outputs) {
    const found = outputs.find((row) => {
      const label = normalizeSlug(row.label);
      return (
        label.includes("engineering insight") ||
        label.includes("engineering interpretation") ||
        label.includes("interpretation") ||
        label.includes("analysis") ||
        label.includes("guidance")
      );
    });

    return found?.value || "";
  }

  function getSummaryFromOutputs(outputs) {
    if (typeof state.options.summaryBuilder === "function") {
      try {
        const summary = state.options.summaryBuilder(outputs, getInputRows());
        if (summary) return summary;
      } catch {}
    }

    const status = getStatusFromOutputs(outputs);
    const first = outputs[0];
    const second = outputs[1];

    if (first && second) {
      return `${state.options.toolLabel} returned ${first.label}: ${first.value} and ${second.label}: ${second.value}. Overall status: ${status}.`;
    }

    if (first) {
      return `${state.options.toolLabel} returned ${first.label}: ${first.value}. Overall status: ${status}.`;
    }

    return `${state.options.toolLabel} report generated from the current visible calculator results.`;
  }

  function captureVisibleChart() {
    if (typeof state.options.getChartImage === "function") {
      try {
        const custom = state.options.getChartImage();
        if (custom) return custom;
      } catch (err) {
        console.warn("ScopedLabs export custom chart capture failed:", err);
      }
    }

    try {
      const candidates = Array.from(document.querySelectorAll("canvas"));
      const visible = candidates.find((canvas) => {
        const rect = canvas.getBoundingClientRect();
        const wrap = canvas.closest("[hidden], .hidden");
        return !wrap && rect.width > 0 && rect.height > 0;
      });

      if (!visible) return "";

      return visible.toDataURL("image/png", 1);
    } catch (err) {
      console.warn("ScopedLabs export chart capture failed:", err);
      return "";
    }
  }

  function buildPayload() {
    const outputs = getResultRows();

    if (!outputs.length) return null;

    const inputs = getInputRows();
    const meta = getMeta();
    const status = getStatusFromOutputs(outputs);
    const interpretation = getInterpretationFromOutputs(outputs);
    const chartImage = captureVisibleChart();

    return {
      reportId: makeReportId(state.options.reportPrefix),
      generatedAt: new Date().toISOString(),
      category: state.options.categoryLabel,
      categorySlug: state.options.categorySlug,
      tool: state.options.toolLabel,
      toolSlug: state.options.toolSlug,
      status,
      summary: getSummaryFromOutputs(outputs),
      interpretation,
      inputs,
      outputs,
      assumptions: state.options.assumptions,
      chartImage,
      meta
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

  function saveSnapshot(payload) {
    const key = state.options.snapshotKey;
    const existing = readSnapshots(key);

    existing.unshift({
      ...payload,
      savedAt: new Date().toISOString()
    });

    const trimmed = existing.slice(0, state.options.snapshotLimit);
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
            <img src="${payload.chartImage}" alt="${escapeHtml(payload.tool)} chart">
          </div>
        </section>
      `
      : "";

    const interpretationBlock = payload.interpretation
      ? `
        <section class="section">
          <h2>Engineering Interpretation</h2>
          <div class="body-copy">${escapeHtml(payload.interpretation)}</div>
        </section>
      `
      : "";

    const statusClass = String(payload.status || "").toLowerCase();

    return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(payload.meta?.reportTitle || payload.tool || "ScopedLabs Report")} • ${escapeHtml(state.options.siteName)}</title>
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
        <img src="${escapeHtml(state.options.logoUrl)}" alt="">
        <div class="brand-name">${escapeHtml(state.options.siteName)}</div>
      </div>
      <div class="tagline">${escapeHtml(state.options.siteTagline)}</div>

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

      ${interpretationBlock}
      ${chartBlock}
      ${notesBlock}

      <section class="section">
        <h2>Assumptions</h2>
        <div class="body-copy"><ul class="assumptions">${assumptions}</ul></div>
      </section>

      <section class="section">
        <h2>Disclaimer</h2>
        <div class="body-copy">${escapeHtml(state.options.disclaimer)}</div>
      </section>

      <div class="foot">
        ${escapeHtml(state.options.siteName)} Pro export for internal and client-facing documentation workflows.
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
      console.error("ScopedLabs export report open failed:", err);
      return false;
    }
  }

  function refresh(message) {
    const unlocked = hasExportAccess();
    const ready = hasUsableResults();

    setButtonsEnabled(unlocked && ready);

    if (message !== undefined) {
      setStatus(message);
      return;
    }

    if (!unlocked) {
      setStatus(`${state.options.categoryLabel} export is available with category unlock.`);
      return;
    }

    if (!ready) {
      setStatus("Run the calculator to enable export.");
      return;
    }

    setStatus("Calculation ready. Open Export Report or Save Snapshot.");
  }

  function invalidate(message = "Inputs changed. Run the calculator again to refresh export.") {
    setButtonsEnabled(false);
    setStatus(message);
  }

  function bindEvents() {
    const exportBtn = $(state.options.exportButtonSelector);
    const snapshotBtn = $(state.options.snapshotButtonSelector);
    const resultEl = $(state.options.resultSelector);
    const inputContainer = $(state.options.inputContainerSelector);

    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        if (!hasExportAccess()) {
          refresh(`${state.options.categoryLabel} export is available with category unlock.`);
          return;
        }

        const payload = buildPayload();

        if (!payload) {
          refresh("Run the calculator before exporting a report.");
          return;
        }

        const ok = openReportWindow(payload);
        refresh(ok ? "Export report opened in a new tab." : "Popup blocked or export failed.");
      });
    }

    if (snapshotBtn) {
      snapshotBtn.addEventListener("click", () => {
        if (!hasExportAccess()) {
          refresh(`${state.options.categoryLabel} export is available with category unlock.`);
          return;
        }

        const payload = buildPayload();

        if (!payload) {
          refresh("Run the calculator before saving a snapshot.");
          return;
        }

        const count = saveSnapshot(payload);
        refresh(`Saved locally. ${count} snapshot${count === 1 ? "" : "s"} stored for this tool.`);
      });
    }

    if (inputContainer) {
      inputContainer.addEventListener("input", () => invalidate());
      inputContainer.addEventListener("change", () => invalidate());
    }

    [
      state.options.reportTitleSelector,
      state.options.projectNameSelector,
      state.options.clientNameSelector,
      state.options.preparedBySelector,
      state.options.customNotesSelector
    ].forEach((selector) => {
      const field = $(selector);
      if (!field) return;

      field.addEventListener("input", () => {
        if (!hasUsableResults()) return;
        refresh("Export details updated.");
      });
    });

    if (resultEl && typeof MutationObserver !== "undefined") {
      state.observer = new MutationObserver(() => {
        refresh();
      });

      state.observer.observe(resultEl, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }
  }

  function init(options = {}) {
    if (state.initialized) return;

    state.options = mergeOptions({
      ...(window.ScopedLabsExportConfig || {}),
      ...options
    });

    const exportBtn = $(state.options.exportButtonSelector);
    const snapshotBtn = $(state.options.snapshotButtonSelector);

    if (!exportBtn && !snapshotBtn) return;

    state.initialized = true;
    bindEvents();
    refresh();
  }

  window.ScopedLabsExport = {
    init,
    refresh,
    invalidate,
    buildPayload,
    openReportWindow,
    saveSnapshot,
    getResultRows,
    getInputRows
  };

  window.addEventListener("DOMContentLoaded", () => {
    init();
  });
})();