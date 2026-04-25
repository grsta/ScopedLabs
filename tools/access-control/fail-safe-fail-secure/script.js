(() => {
  "use strict";

  const CATEGORY = "access-control";
  const CATEGORY_LABEL = "Access Control";
  const STEP = "fail-safe-fail-secure";
  const TOOL_LABEL = "Fail-Safe vs Fail-Secure";
  const LANE = "v1";
  const REPORT_SAVE_KEY = "scopedlabs:reports:access-control:fail-safe-fail-secure";

  const FLOW_KEYS = {
    "fail-safe-fail-secure": "scopedlabs:pipeline:access-control:fail-safe-fail-secure",
    "reader-type-selector": "scopedlabs:pipeline:access-control:reader-type-selector",
    "lock-power-budget": "scopedlabs:pipeline:access-control:lock-power-budget",
    "panel-capacity": "scopedlabs:pipeline:access-control:panel-capacity",
    "access-level-sizing": "scopedlabs:pipeline:access-control:access-level-sizing"
  };

  const $ = (id) => document.getElementById(id);

  const els = {
    doorType: $("doorType"),
    life: $("life"),
    powerLoss: $("powerLoss"),
    fire: $("fire"),
    threat: $("threat"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue"),
    reportTitle: $("reportTitle"),
    projectName: $("projectName"),
    clientName: $("clientName"),
    preparedBy: $("preparedBy"),
    customNotes: $("customNotes"),
    exportReport: $("exportReport"),
    saveSnapshot: $("saveSnapshot"),
    exportStatus: $("exportStatus")
  };

  let currentReport = null;

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
      setExportStatus("Run the evaluation to enable export.");
      return;
    }

    setExportStatus("Evaluation ready. Open Export Report or Save Snapshot.");
  }

  function getReportMeta() {
    return {
      reportTitle: (els.reportTitle?.value || "").trim() || "Fail-Safe vs Fail-Secure Assessment",
      projectName: (els.projectName?.value || "").trim(),
      clientName: (els.clientName?.value || "").trim(),
      preparedBy: (els.preparedBy?.value || "").trim(),
      customNotes: (els.customNotes?.value || "").trim()
    };
  }

  function assumptionsForTool() {
    return [
      "This model is a planning aid for early door behavior review and does not replace code compliance review.",
      "Life safety, egress requirements, AHJ direction, and adopted codes must override calculator output where applicable.",
      "Fail-secure behavior must still preserve safe egress through compliant hardware and door function.",
      "Final hardware selection should be validated against the lock type, fire alarm interface, power supply design, and site operating policy."
    ];
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.continueBtn) els.continueBtn.disabled = false;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continueBtn) els.continueBtn.disabled = true;
  }

  function render(rows) {
    if (!els.results) return;

    els.results.innerHTML = rows.map((r) => `
      <div class="result-row">
        <span class="result-label">${escapeHtml(r.label)}</span>
        <span class="result-value">${escapeHtml(r.value)}</span>
      </div>
    `).join("");
  }

  function getRenderedRows() {
    if (!els.results) return [];

    return Array.from(els.results.querySelectorAll(".result-row"))
      .map((row) => {
        const label = row.querySelector(".result-label")?.textContent?.trim() || "";
        const value = row.querySelector(".result-value")?.textContent?.trim() || "";
        return { label, value };
      })
      .filter((item) => item.label || item.value);
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
      reportId: makeReportId("SL-ACC-FS"),
      generatedAt: new Date().toISOString(),
      category: CATEGORY_LABEL,
      categorySlug: CATEGORY,
      tool: TOOL_LABEL,
      toolSlug: STEP,
      status: core.status,
      summary: core.summary,
      interpretation: core.interpretation,
      inputs: [
        { label: "Door Type", value: core.inputs.doorTypeLabel },
        { label: "Life Safety Priority", value: core.inputs.lifeLabel },
        { label: "Power Reliability", value: core.inputs.powerLossLabel },
        { label: "Fire Alarm Integration", value: core.inputs.fireLabel },
        { label: "Threat Level", value: core.inputs.threatLabel }
      ],
      outputs: core.outputs,
      assumptions: assumptionsForTool(),
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
          ScopedLabs outputs are planning aids only and do not replace formal engineering review, code compliance review, AHJ review, site-specific validation, or manufacturer documentation.
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

  function savePipelineResult(payload) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      data: payload
    });
  }

  function invalidatePipelineResult() {
    try {
      Object.values(FLOW_KEYS).forEach((key) => {
        sessionStorage.removeItem(key);
      });
    } catch {}

    hideContinue();
  }

  function clearAnalysis() {
    if (window.ScopedLabsAnalyzer && els.analysis) {
      ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    } else if (els.analysis) {
      els.analysis.innerHTML = "";
      els.analysis.style.display = "none";
    }
  }

  function clearResults(message = "Run the evaluation to see results.") {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">${escapeHtml(message)}</div>`;
    }

    clearAnalysis();
    hideContinue();
  }

  function invalidate() {
    currentReport = null;
    invalidatePipelineResult();
    clearResults("Inputs changed. Press Evaluate to refresh results.");
    updateExportControls();
  }

  function getConfidence(score) {
    const abs = Math.abs(score);
    if (abs >= 4) return "HIGH";
    if (abs >= 2) return "MEDIUM";
    return "LOW";
  }

  function getScoreMeaning(score) {
    if (score >= 3) return "Strong bias toward life safety behavior.";
    if (score >= 1) return "Moderate lean toward life safety.";
    if (score <= -3) return "Strong bias toward security retention.";
    if (score <= -1) return "Moderate lean toward security.";
    return "Balanced conditions — requires design judgment.";
  }

  function labelFromSelect(selectEl) {
    if (!selectEl) return "";
    return selectEl.options[selectEl.selectedIndex]?.textContent?.trim() || selectEl.value || "";
  }

  function buildInterpretation(recommendation) {
    if (recommendation === "FAIL-SAFE") {
      return "This door leans toward fail-safe behavior because egress reliability and release behavior matter more than retaining the secured state through power loss. That is especially true when the door type or fire/alarm conditions increase life-safety sensitivity.";
    }

    if (recommendation === "FAIL-SECURE") {
      return "This door leans toward fail-secure behavior because the security consequence of releasing during outage is higher than the benefit of automatic unlock. That usually happens on perimeter or critical doors where threat pressure and asset protection outweigh convenience.";
    }

    return "The door conditions are balanced enough that neither fail-safe nor fail-secure wins cleanly on logic alone. This is where code requirements, occupancy, emergency egress, and actual operational use should drive the final hardware choice.";
  }

  function buildGuidance(recommendation) {
    if (recommendation === "FAIL-SAFE") {
      return "Confirm that the lock hardware, release path, and fire-alarm behavior all support safe egress under loss-of-power conditions before moving into reader and power design.";
    }

    if (recommendation === "FAIL-SECURE") {
      return "Verify egress method and code treatment carefully. A fail-secure choice is only acceptable if safe exit remains intact under the door’s actual use case and authority requirements.";
    }

    return "Do not finalize lock type yet. Escalate this door for code review and operational review before choosing reader placement or power assumptions.";
  }

  function getStatusForRecommendation(recommendation, confidence) {
    if (recommendation === "CONDITIONAL") return "WATCH";
    if (confidence === "LOW") return "WATCH";
    return "HEALTHY";
  }

  function calculate() {
    const doorType = els.doorType.value;
    const life = els.life.value;
    const powerLoss = els.powerLoss.value;
    const fire = els.fire.value;
    const threat = els.threat.value;

    let score = 0;

    if (doorType === "stairwell") score += 3;
    if (doorType === "interior") score += 1;
    if (doorType === "perimeter") score -= 1;
    if (doorType === "it") score -= 3;

    if (life === "high") score += 3;
    if (life === "med") score += 1;
    if (life === "low") score -= 2;

    if (powerLoss === "frequent") score += 2;
    if (powerLoss === "rare") score -= 1;

    if (fire === "yes") score += 1;

    if (threat === "high") score -= 3;
    if (threat === "med") score -= 1;

    let recommendation;
    let rationale;
    let risk;

    if (score >= 2) {
      recommendation = "FAIL-SAFE";
      rationale = "Life safety and egress reliability outweigh the need to stay locked during power loss.";
      risk = "Exposure during outage or release conditions.";
    } else if (score <= -2) {
      recommendation = "FAIL-SECURE";
      rationale = "Security retention outweighs automatic release behavior.";
      risk = "Improper egress if not designed correctly.";
    } else {
      recommendation = "CONDITIONAL";
      rationale = "Balanced inputs require code-driven and operational decision.";
      risk = "Inconsistent behavior across doors.";
    }

    const confidence = getConfidence(score);
    const scoreMeaning = getScoreMeaning(score);
    const interpretation = buildInterpretation(recommendation);
    const guidance = buildGuidance(recommendation);
    const status = getStatusForRecommendation(recommendation, confidence);

    render([
      { label: "Recommendation", value: recommendation },
      { label: "Confidence", value: confidence },
      { label: "Why", value: rationale },
      { label: "Score Meaning", value: scoreMeaning },
      { label: "Primary Risk", value: risk },
      { label: "Score", value: String(score) },
      { label: "Engineering Interpretation", value: interpretation },
      { label: "Actionable Guidance", value: guidance }
    ]);

    savePipelineResult({
      recommendation,
      score,
      confidence,
      doorType,
      life,
      powerLoss,
      fire,
      threat
    });

    showContinue();

    currentReport = buildReportPayload({
      status,
      summary: `${recommendation} is the current planning recommendation with ${confidence.toLowerCase()} confidence. ${rationale}`,
      interpretation,
      inputs: {
        doorTypeLabel: labelFromSelect(els.doorType),
        lifeLabel: labelFromSelect(els.life),
        powerLossLabel: labelFromSelect(els.powerLoss),
        fireLabel: labelFromSelect(els.fire),
        threatLabel: labelFromSelect(els.threat)
      },
      outputs: getRenderedRows()
    });

    updateExportControls();
  }

  function resetAll() {
    els.doorType.value = "interior";
    els.life.value = "high";
    els.powerLoss.value = "normal";
    els.fire.value = "yes";
    els.threat.value = "low";

    currentReport = null;
    invalidatePipelineResult();
    clearResults("Run the evaluation to see results.");
    updateExportControls();
  }

  function bindEvents() {
    if (els.calc) {
      els.calc.addEventListener("click", calculate);
    }

    if (els.reset) {
      els.reset.addEventListener("click", resetAll);
    }

    [
      els.doorType,
      els.life,
      els.powerLoss,
      els.fire,
      els.threat
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("change", invalidate);
      el.addEventListener("input", invalidate);
    });

    if (els.continueBtn) {
      els.continueBtn.addEventListener("click", () => {
        window.location.href = "/tools/access-control/reader-type-selector/";
      });
    }

    if (els.exportReport) {
      els.exportReport.addEventListener("click", () => {
        if (!hasExportAccess()) {
          updateExportControls("Export is available with Access Control category unlock.");
          return;
        }

        if (!currentReport) {
          updateExportControls("Run the evaluation before exporting a report.");
          return;
        }

        currentReport = {
          ...currentReport,
          generatedAt: new Date().toISOString(),
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
          updateExportControls("Run the evaluation before saving a snapshot.");
          return;
        }

        currentReport = {
          ...currentReport,
          generatedAt: new Date().toISOString(),
          meta: getReportMeta()
        };

        const count = saveSnapshot(REPORT_SAVE_KEY, currentReport, 25);
        updateExportControls(`Saved locally. ${count} snapshot${count === 1 ? "" : "s"} stored for this tool.`);
      });
    }

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
  }

  function init() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    resetAll();

    setTimeout(() => {
      updateExportControls();
    }, 500);

    setTimeout(() => {
      updateExportControls();
    }, 1200);
  }

  bindEvents();
  init();
})();