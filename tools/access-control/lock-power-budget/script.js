// access-control-lock-power-budget-export-print-ux-001: local print report wording and page-pack polish.
(() => {
  "use strict";

  const CATEGORY = "access-control";
  const CATEGORY_LABEL = "Access Control";
  const STEP = "lock-power-budget";
  const TOOL_LABEL = "Lock Power Budget";
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
  let lastMetrics = null;

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
    chart: $("chart"),
    chartWrap: $("chartWrap"),
    visualCard: $("lockPowerVisualCard"),
    nextWrap: $("continue-wrap") || $("next-step-row"),
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
    exportStatus: $("exportStatus"),
    activeScopeCard: $("activeAccessScopeCard"),
    activeScopeTitle: $("activeAccessScopeTitle"),
    activeScopeDescription: $("activeAccessScopeDescription"),
    activeScopeMeta: $("activeAccessScopeMeta"),
    localAssistantMount: $("accessControlLocalAssistantMount")
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


  // access-control-lock-power-scope-hydration-021
  function accessScopeState() {
    return window.ScopedLabsAccessControlScopeState || null;
  }

  function getActiveAccessScope() {
    const api = accessScopeState();
    if (!api || typeof api.getActiveScope !== "function") return null;
    return api.getActiveScope();
  }

  function renderActiveScopeContext() {
    const api = accessScopeState();

    if (api && typeof api.renderScopeDisplay === "function") {
      return api.renderScopeDisplay({
        card: els.activeScopeCard,
        title: els.activeScopeTitle,
        description: els.activeScopeDescription,
        meta: els.activeScopeMeta,
        toolLabel: "Lock Power Budget"
      });
    }

    return null;
  }

  function setSelectValue(selectEl, value) {
    if (!selectEl || value === undefined || value === null) return false;

    const normalized = String(value).trim();
    if (!normalized) return false;

    const option = Array.from(selectEl.options || []).find((item) => item.value === normalized);
    if (!option) return false;

    selectEl.value = normalized;
    return true;
  }

  function getPositiveInteger(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return 0;
    return Math.max(1, Math.round(n));
  }

  function mapScopeLockType(scope) {
    const lockIntent = String(scope?.lockIntent || "").toLowerCase();

    if (lockIntent === "electric-strike") return "strike";
    if (lockIntent === "maglock") return "mag";
    if (lockIntent === "electrified-lockset") return "mortise";

    return "";
  }

  function getScopeLockCount(scope) {
    return getPositiveInteger(
      scope?.openingCount ||
      scope?.doorCount ||
      scope?.openings ||
      scope?.doors ||
      0
    );
  }

  function applyActiveScopeToInputs() {
    const scope = getActiveAccessScope();
    if (!scope) return false;

    let applied = false;

    const lockType = mapScopeLockType(scope);
    if (lockType) {
      applied = setSelectValue(els.lockType, lockType) || applied;
    }

    const lockCount = getScopeLockCount(scope);
    if (lockCount && els.locks) {
      els.locks.value = String(lockCount);
      applied = true;
    }

    return applied;
  }

  function getActiveScopeExportContext() {
    const api = accessScopeState();
    if (!api || typeof api.buildScopeDisplayContext !== "function") return null;
    return api.buildScopeDisplayContext("Lock Power Budget");
  }

  function showChartWrap() {
    if (els.visualCard) els.visualCard.hidden = false;
    if (els.chartWrap) els.chartWrap.hidden = false;
  }

  function hideChartWrap() {
    if (els.chartWrap) els.chartWrap.hidden = true;
    if (els.visualCard) els.visualCard.hidden = true;
  }

  function destroyChart() {
    if (chart && typeof chart.destroy === "function") {
      chart.destroy();
    }

    chart = null;

    const shell = outputShell();
    if (shell && typeof shell.hideVisual === "function") {
      shell.hideVisual({
        card: els.visualCard,
        wrap: els.chartWrap,
        target: els.chart
      });
      return;
    }

    if (els.chart) {
      els.chart.innerHTML = "";
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
      setExportStatus("Run calculation to enable export.");
      return;
    }

    setExportStatus("Calculation ready. Open Export Report or Save Snapshot.");
  }

  function getReportMeta() {
    return {
      reportTitle: (els.reportTitle?.value || "").trim() || "Lock Power Budget Assessment",
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


  function clampNumber(value, min, max) {
    const n = Number(value);
    if (!Number.isFinite(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function formatAmp(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0.00 A";
    return n.toFixed(2) + " A";
  }

  function formatWatt(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return "0.0 W";
    return n.toFixed(1) + " W";
  }

  function getCadPowerRailImage(metrics, options = {}) {
    if (!metrics) return "";
    return getSharedLockPowerRailImage(metrics, { exportMode: options.exportMode === true });
  }

  function getChartImage() {
    return getCadPowerRailImage(lastMetrics, { exportMode: true });
  }



  function getExportChartImage() {
    return getCadPowerRailImage(lastMetrics, { exportMode: true });
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
            <img src="${payload.chartImage}" alt="Lock Power Budget planning visual">
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
      .report-head,.section,.chart-wrap,.grid,.summary,.body-copy,.foot{break-inside:avoid;page-break-inside:avoid}
      .section{margin-top:12px}
      .section h2{break-after:avoid;page-break-after:avoid}
      .chart-wrap img{display:block;max-width:100%;max-height:4.6in;object-fit:contain;margin:0 auto}
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
          ScopedLabs outputs are planning aids only and do not replace formal engineering review, manufacturer documentation, listed hardware requirements, fire/life-safety review, voltage-drop analysis, or site-specific validation.
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

    if (d.readerType) lines.push(`Reader Type: <strong>${escapeHtml(d.readerType)}</strong>`);
    if (d.interfaceRec) lines.push(`Interface: <strong>${escapeHtml(d.interfaceRec)}</strong>`);
    if (d.security) lines.push(`Security: <strong>${escapeHtml(d.security)}</strong>`);
    if (d.environment) lines.push(`Environment: <strong>${escapeHtml(d.environment)}</strong>`);
    if (d.credential) lines.push(`Credential: <strong>${escapeHtml(d.credential)}</strong>`);

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

  // access-control-lock-power-hidden-ledger-policy-027: #results is a hidden structured ledger; assistant + CAD rail own the visible output.
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
      "Peak unlock demand is based on simultaneous unlock events, not all installed locks unlocking at once unless configured that way.",
      "Required supply includes the configured design headroom percentage.",
      "This export reflects the current on-screen tool results at the time the report was opened or saved.",
      "Final power design should be checked against manufacturer surge current, hold current, power supply listing, wiring distance, voltage drop, and fire/life-safety behavior."
    ];
  }

  function buildCurrentReportPayload() {
    const outputs = collectVisibleResults();

    if (!outputs.length) return null;

    return {
      reportId: makeReportId("SL-ACC-LOCKPOWER"),
      generatedAt: new Date().toISOString(),
      category: CATEGORY_LABEL,
      categorySlug: CATEGORY,
      tool: TOOL_LABEL,
      toolSlug: STEP,
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
      chartImage: getExportChartImage(),
      meta: getReportMeta(),
      activeScopeContext: getActiveScopeExportContext()
    };
  }


  // access-control-lock-power-output-shell-module-029: shared visual shell owns CAD output visibility and export image handoff.
  function outputShell() {
    return window.ScopedLabsAccessControlOutputShell || null;
  }

  // access-control-lock-power-shared-planning-visual-054: prefer shared modern planning visual, retain local CAD rail fallback.
  function planningVisuals() {
    return window.ScopedLabsAccessControlPlanningVisuals || null;
  }

  function getSharedLockPowerRailHtml(metrics, options = {}) {
    const visuals = planningVisuals();
    if (!visuals || typeof visuals.buildLockPowerBudgetSupplyRailSvg !== "function") return "";

    try {
      return visuals.buildLockPowerBudgetSupplyRailSvg({
        ...(metrics || {}),
        exportMode: options.exportMode === true
      });
    } catch (err) {
      console.warn("ScopedLabs Lock Power shared planning visual failed:", err);
      return "";
    }
  }

  function getSharedLockPowerRailImage(metrics, options = {}) {
    const html = getSharedLockPowerRailHtml(metrics, options);
    if (!html) return "";

    const match = String(html).match(/<svg[\s\S]*?<\/svg>/i);
    if (!match) return "";

    const visuals = planningVisuals();
    if (visuals && typeof visuals.svgToDataUri === "function") {
      return visuals.svgToDataUri(match[0]);
    }

    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(match[0]);
  }


  function attachOutputShellExport() {
    const shell = outputShell();

    if (shell && typeof shell.register === "function") {
      shell.register(STEP, {
        getChartImage: () => getCadPowerRailImage(lastMetrics, { exportMode: true })
      });
    }

    if (shell && typeof shell.attachExportGetter === "function") {
      shell.attachExportGetter(STEP, window.ScopedLabsExportConfig);
      return true;
    }

    if (window.ScopedLabsExportConfig) {
      window.ScopedLabsExportConfig.getChartImage = getExportChartImage;
      return true;
    }

    return false;
  }

  function clearLocalAssistant() {
    if (window.ScopedLabsLocalAssistant && els.localAssistantMount) {
      window.ScopedLabsLocalAssistant.clear(els.localAssistantMount);
      return;
    }

    if (els.localAssistantMount) {
      els.localAssistantMount.innerHTML = "";
      els.localAssistantMount.hidden = true;
    }
  }

  function renderLocalAssistant(core) {
    const assistant = window.ScopedLabsLocalAssistant;
    const adapters = window.ScopedLabsAccessControlToolAssistantAdapters;
    const adapter = adapters && typeof adapters.getAdapter === "function" ? adapters.getAdapter(STEP) : null;

    if (!assistant || !adapter || !els.localAssistantMount || typeof adapter.buildModel !== "function") {
      return false;
    }

    return assistant.mount(els.localAssistantMount, adapter.buildModel(core));
  }

  function applyShellModules() {
    const shell = window.ScopedLabsToolShell;
    if (shell && typeof shell.applyBackContinueShell === "function") {
      shell.applyBackContinueShell({ rowId: "accessControlFlowActions" });
    }
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
      sessionStorage.removeItem(FLOW_KEYS["panel-capacity"]);
      sessionStorage.removeItem(FLOW_KEYS["access-level-sizing"]);
    } catch {}

    destroyChart();
    hideContinue();
    clearLocalAssistant();
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
    if (els.lockType) els.lockType.value = "strike";
    if (els.voltage) els.voltage.value = "12";
    if (els.amps) els.amps.value = "0.35";
    if (els.locks) els.locks.value = "8";
    if (els.simul) els.simul.value = "2";
    if (els.headroom) els.headroom.value = "25";

    applyActiveScopeToInputs();
    renderActiveScopeContext();

    invalidate("Run calculation.");
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


  // access-control-lock-power-visual-output-fix-028
  function renderVisualOutput(metrics) {
    if (!metrics || !els.chart || !els.chartWrap) return false;

    const visuals = planningVisuals();
    if (visuals && typeof visuals.renderLockPowerBudget === "function") {
      const rendered = visuals.renderLockPowerBudget({
        card: els.visualCard,
        wrap: els.chartWrap,
        target: els.chart,
        metrics
      });

      if (rendered) return true;
    }

    const svg = getSharedLockPowerRailHtml(metrics, { exportMode: false });
    const shell = outputShell();

    if (shell && typeof shell.showVisual === "function") {
      return shell.showVisual({
        card: els.visualCard,
        wrap: els.chartWrap,
        target: els.chart,
        html: svg
      });
    }

    if (els.visualCard) els.visualCard.hidden = false;
    els.chartWrap.hidden = false;
    els.chart.innerHTML = svg;

    return true;
  }

  function renderChart(metrics) {
    destroyChart();

    if (!els.chart) return;

    renderVisualOutput(metrics);

    chart = {
      destroy() {
        if (els.chart) els.chart.innerHTML = "";
      }
    };
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
      lastMetrics = null;
      currentReport = null;
      updateExportControls();
      return;
    }

    const effectiveSimul = Math.min(locks, simul);
    const peak = effectiveSimul * amps;
    const required = peak * (1 + headroom / 100);
    const watts = required * voltage;
    const utilizationPct = required > 0 ? (peak / required) * 100 : 0;

    const status = getStatus(utilizationPct);
    const guidance = getGuidance(status, effectiveSimul, locks, els.lockType.value);
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

    lastMetrics = {
      peak,
      required,
      watts,
      utilizationPct,
      status,
      voltage,
      locks,
      simultaneous: effectiveSimul,
      amps,
      headroom,
      lockType: els.lockType?.options?.[els.lockType.selectedIndex]?.text || els.lockType?.value || "Lock hardware"
    };

    renderChart(lastMetrics);

    if (window.ScopedLabsAnalyzer) {
      ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
        category: CATEGORY,
        step: STEP,
        lane: LANE,
        data: {
          peakLoadA: peak,
          requiredSupplyA: required,
          watts,
          utilizationPct,
          status
        }
      });
    }

    renderVisualOutput(lastMetrics);

    currentReport = buildCurrentReportPayload();
    renderLocalAssistant({
      status,
      lockType: els.lockType.value,
      lockCount: locks,
      simultaneousUnlocks: effectiveSimul,
      peakLoadA: peak,
      requiredSupplyA: required,
      watts,
      utilizationPct,
      guidance,
      insight
    });
    updateExportControls();
    showContinue();
  }

  function bindEvents() {
    if (els.calc) {
      els.calc.addEventListener("click", calc);
    }

    if (els.reset) {
      els.reset.addEventListener("click", reset);
    }

    [
      els.lockType,
      els.voltage,
      els.amps,
      els.locks,
      els.simul,
      els.headroom
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
        window.location.href = "/tools/access-control/panel-capacity/";
      });
    }
  }

  function init() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    reset();
    attachOutputShellExport();
    applyShellModules();

    window.addEventListener("scopedlabs:access-control-scope-updated", () => {
      renderActiveScopeContext();
      if (!currentReport) {
        applyActiveScopeToInputs();
        invalidate("Run calculation.");
      }
    });

    unlockCategoryPage();

    setTimeout(() => {
      unlockCategoryPage();
      updateExportControls();
      attachOutputShellExport();
      applyShellModules();
    }, 400);

    setTimeout(() => {
      unlockCategoryPage();
      updateExportControls();
    }, 1200);
  }

  bindEvents();
  init();
  // access-control-route-conflict-export-override-lock-power-budget
  function lock_power_budget_setRouteExportStatus(message) {
    if (typeof setExportStatus === "function") {
      setExportStatus(message);
      return;
    }

    const statusEl = els && els.exportStatus ? els.exportStatus : document.getElementById("exportStatus");
    if (statusEl) statusEl.textContent = message || "";
  }

  function lock_power_budget_routeExportSvgDataUri(svg) {
    const raw = String(svg || "").trim();
    if (!raw) return "";
    if (raw.startsWith("data:image")) return raw;
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(raw);
  }

  function lock_power_budget_getRouteExportChartImage() {
    try {
      const svg = lastMetrics ? getSharedLockPowerRailHtml(lastMetrics, { exportMode: false }) : "";
      const image = lock_power_budget_routeExportSvgDataUri(svg);
      if (image) return image;
    } catch (err) {
      console.warn("lock-power-budget dark SVG export capture failed:", err);
    }

    try {
      const fallback = getCadPowerRailImage(lastMetrics, { exportMode: false });
      if (fallback) return fallback;
    } catch (err) {
      console.warn("lock-power-budget fallback export image capture failed:", err);
    }

    try {
      if (typeof getExportChartImage === "function") {
        const image = getExportChartImage();
        if (image) return image;
      }
    } catch (err) {
      console.warn("lock-power-budget final export chart image capture failed:", err);
    }

    return "";
  }

  function lock_power_budget_buildRouteExportPayload() {
    const engine = window.ScopedLabsExport || null;
    const cfg = window.ScopedLabsExportConfig || {};
    const localReport = typeof currentReport !== "undefined" ? currentReport : null;

    let base = null;

    if (engine && typeof engine.buildPayload === "function") {
      try {
        base = engine.buildPayload();
      } catch (err) {
        console.warn("lock-power-budget shared export payload failed:", err);
      }
    }

    if (!base && localReport) {
      base = Object.assign({
        category: cfg.categoryLabel || "Access Control",
        categorySlug: cfg.categorySlug || "access-control",
        tool: cfg.toolLabel || "",
        toolSlug: cfg.toolSlug || "lock-power-budget",
        assumptions: Array.isArray(cfg.assumptions) ? cfg.assumptions : [],
        meta: {}
      }, localReport);
    }

    if (!base) return null;

    const chartImage = lock_power_budget_getRouteExportChartImage();

    return Object.assign({}, base, {
      chartImage: chartImage || base.chartImage || "",
      printLowInkChart: true
    });
  }

  function lock_power_budget_openRouteExportReport(event) {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    const engine = window.ScopedLabsExport || null;

    if (!engine || typeof engine.openReportWindow !== "function") {
      lock_power_budget_setRouteExportStatus("Export engine is still loading. Try again in a moment.");
      return false;
    }

    const payload = lock_power_budget_buildRouteExportPayload();

    if (!payload) {
      lock_power_budget_setRouteExportStatus("Run the calculator before exporting a report.");
      return false;
    }

    const opened = engine.openReportWindow(payload);
    lock_power_budget_setRouteExportStatus(opened ? "Export report opened in a new tab." : "Popup blocked or export failed.");
    return opened;
  }

  function lock_power_budget_bindRouteExportOverride() {
    const button = els && els.exportReport ? els.exportReport : document.getElementById("exportReport");
    if (!button || button.dataset.routeConflictExportBound) return;

    button.dataset.routeConflictExportBound = "lock-power-budget";
    button.addEventListener("click", lock_power_budget_openRouteExportReport, true);
  }

  lock_power_budget_bindRouteExportOverride();

})();