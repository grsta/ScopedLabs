(() => {
  "use strict";

  const CATEGORY = "access-control";
  const CATEGORY_LABEL = "Access Control";
  const STEP = "reader-type-selector";
  const TOOL_LABEL = "Reader Type Selector";
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

  const els = {
    sec: $("sec"),
    cred: $("cred"),
    env: $("env"),
    throughput: $("throughput"),
    iface: $("iface"),
    cardFormat: $("cardFormat"),
    existingCred: $("existingCred"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    nextStepRow: $("next-step-row"),
    nextBtn: $("continue"),
    localAssistantMount: $("accessControlLocalAssistantMount"),
    flowNote: $("flow-note"),
    activeScopeCard: $("activeAccessScopeCard"),
    activeScopeTitle: $("activeAccessScopeTitle"),
    activeScopeDescription: $("activeAccessScopeDescription"),
    activeScopeMeta: $("activeAccessScopeMeta"),
    reportTitle: $("reportTitle"),
    projectName: $("projectName"),
    clientName: $("clientName"),
    preparedBy: $("preparedBy"),
    customNotes: $("customNotes"),
    exportReport: $("exportReport"),
    saveSnapshot: $("saveSnapshot"),
    exportStatus: $("exportStatus"),
    decisionCard: $("readerTypeDecisionCard"),
    chartWrap: $("chartWrap"),
    readerTypeSchedule: $("readerTypeSchedule")
  };

  let currentReport = null;

  function ensureReaderResultCadStyles() {
    if (typeof document === "undefined" || document.getElementById("reader-type-result-cad-styles")) return;

    const style = document.createElement("style");
    style.id = "reader-type-result-cad-styles";
    style.textContent = `
      .reader-result-hero {
        border: 1px solid rgba(125,255,152,.18);
        background: rgba(125,255,152,.03);
        border-radius: 14px;
        padding: 14px 16px;
        margin-bottom: 14px;
      }

      .reader-result-kicker {
        color: rgba(190,255,205,.82);
        font-size: .68rem;
        font-weight: 760;
        letter-spacing: .08em;
        margin-bottom: 6px;
        text-transform: uppercase;
      }

      .reader-result-title {
        color: rgba(226,232,240,.94);
        font-size: 1.02rem;
        font-weight: 760;
        line-height: 1.25;
      }

      .reader-result-subtitle {
        color: rgba(203,213,225,.78);
        font-size: .86rem;
        font-weight: 520;
        margin-top: 6px;
      }

      .reader-result-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .reader-result-grid .result-row {
        align-items: start;
        border: 1px solid rgba(148,163,184,.12);
        border-radius: 10px;
        display: grid;
        gap: 6px;
        grid-template-columns: minmax(120px, .65fr) minmax(0, 1fr);
        min-height: 0;
        padding: 8px 10px;
        background: rgba(255,255,255,.022);
      }

      .reader-result-grid .result-row--wide {
        grid-column: 1 / -1;
      }

      .reader-result-grid .result-label {
        color: rgba(203,213,225,.64);
        font-size: .66rem;
        font-weight: 720;
        letter-spacing: .08em;
        line-height: 1.25;
        text-transform: uppercase;
      }

      .reader-result-grid .result-value {
        color: rgba(226,232,240,.88);
        font-size: .84rem;
        font-weight: 720;
        line-height: 1.35;
        text-align: right;
      }

      .reader-result-grid .result-value[data-tone="active"] {
        color: rgba(125,255,152,.92);
      }

      .reader-result-grid .result-value[data-tone="watch"] {
        color: rgba(255,214,102,.94);
      }

      .reader-result-grid .result-value[data-tone="risk"] {
        color: rgba(255,138,138,.94);
      }

      .reader-status-token--healthy {
        color: rgba(125,255,152,.94);
      }

      .reader-status-token--watch {
        color: rgba(255,214,102,.94);
      }

      .reader-status-token--risk {
        color: rgba(255,138,138,.94);
      }

      @media (max-width: 760px) {
        .reader-result-grid {
          grid-template-columns: 1fr;
        }

        .reader-result-grid .result-row {
          grid-template-columns: 1fr;
        }

        .reader-result-grid .result-value {
          text-align: left;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function ensureReaderTypeVerificationStyles() {
    if (typeof document === "undefined" || document.getElementById("reader-type-verification-styles")) return;

    const style = document.createElement("style");
    style.id = "reader-type-verification-styles";
    style.textContent = `
      .reader-verification-hold {
        border: 1px solid rgba(120, 255, 120, 0.12);
        background: rgba(0, 0, 0, 0.12);
        border-radius: 14px;
        padding: 14px 16px;
        margin: 0 0 16px;
      }

      .reader-verification-hold--risk {
        border-color: rgba(120, 255, 120, 0.12);
        background: rgba(0, 0, 0, 0.12);
      }

      .reader-verification-hold__label {
        font-weight: inherit;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 8px;
      }

      .reader-verification-hold__body {
        margin: 0 0 10px;
      }

      .reader-verification-hold ul {
        margin: 0;
        padding-left: 20px;
      }
    `;

    document.head.appendChild(style);
  }

  function renderSemanticStatusText(value) {
    const text = String(value || "");
    const match = text.match(/^(WATCH|RISK|HEALTHY):(.*)$/i);

    if (!match) return escapeHtml(text);

    const status = match[1].toUpperCase();
    const rest = match[2] || "";
    const toneClass =
      status === "RISK" ? "reader-status-token--risk" :
      status === "WATCH" ? "reader-status-token--watch" :
      status === "HEALTHY" ? "reader-status-token--healthy" :
      "";

    if (!toneClass) return escapeHtml(text);

    return '<span class="' + toneClass + '">' + escapeHtml(status + ":") + '</span>' + escapeHtml(rest);
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

  function normalizeSlug(value) {
    return String(value ?? "").trim().toLowerCase();
  }

  // access-control-reader-type-output-contract-023
  function outputShell() {
    return window.ScopedLabsAccessControlOutputShell || null;
  }

  function findRowValue(rows, label) {
    const target = String(label || "").trim().toLowerCase();
    const row = Array.isArray(rows)
      ? rows.find((item) => String(item?.label || "").trim().toLowerCase() === target)
      : null;

    return row ? row.value : "";
  }

  function statusFromVerification(value) {
    const text = String(value || "").toUpperCase();
    if (text.includes("RISK")) return "RISK";
    if (text.includes("WATCH")) return "WATCH";
    return "HEALTHY";
  }

  function statusChipHtml(status) {
    const clean = String(status || "HEALTHY").toUpperCase();
    const tone = clean === "RISK" ? "is-risk" : clean === "WATCH" ? "is-watch" : "is-healthy";
    return '<span class="reader-type-status-chip ' + tone + '">' + escapeHtml(clean) + '</span>';
  }

  function scheduleRow(group, metric, value, note) {
    return '<tr><td>' + escapeHtml(group) + '</td><td>' + escapeHtml(metric) + '</td><td>' + value + '</td><td>' + escapeHtml(note) + '</td></tr>';
  }

  function buildReaderTypeScheduleHtml(rows = [], verificationHold = null) {
    const readerType = findRowValue(rows, "Reader Type") || "Reader recommendation pending";
    const verification = findRowValue(rows, "Verification Status") || verificationHold?.label || "HEALTHY";
    const status = verificationHold?.status || statusFromVerification(verification);
    const interfaceValue = findRowValue(rows, "Interface") || "Interface pending";
    const security = findRowValue(rows, "Security") || "Security basis pending";
    const cardFormat = findRowValue(rows, "Credential Format / Facility Code") || "Credential format pending";
    const existingCompatibility = findRowValue(rows, "Existing Credential Compatibility") || "Existing credential basis pending";
    const compatibilityRisk = findRowValue(rows, "Compatibility Risk") || "Compatibility risk pending";
    const environment = findRowValue(rows, "Environment") || "Environment pending";
    const throughput = findRowValue(rows, "Throughput") || "Throughput pending";
    const cautionarySteps = findRowValue(rows, "Cautionary Steps") || "No cautionary steps documented";
    const interpretation = findRowValue(rows, "Engineering Interpretation") || "Reader decision interpretation pending.";
    const guidance = findRowValue(rows, "Actionable Guidance") || "Verify reader compatibility before carrying forward.";

    const tableRows = [
      scheduleRow("Decision", "Reader Type", escapeHtml(readerType), "Primary reader technology recommendation."),
      scheduleRow("Decision", "Verification Status", statusChipHtml(status), "Reader decision readiness before moving to lock power."),
      scheduleRow("Protocol", "Reader Interface", escapeHtml(interfaceValue), "Panel reader signaling and supervision basis."),
      scheduleRow("Security", "Credential Strategy", escapeHtml(security), "Credential assurance and authentication direction."),
      scheduleRow("Credential", "Format / Facility Code", escapeHtml(cardFormat), "Format, facility-code, UID, tenant, or managed credential basis."),
      scheduleRow("Migration", "Existing Compatibility", escapeHtml(existingCompatibility), "Existing-card support and migration condition."),
      scheduleRow("Risk", "Compatibility Risk", escapeHtml(compatibilityRisk), "Known reader/credential/protocol constraints."),
      scheduleRow("Site", "Environment / Throughput", escapeHtml(environment + " / " + throughput), "Reader rating and user-flow condition."),
      scheduleRow("Action", "Cautionary Steps", escapeHtml(cautionarySteps), "Required verification before final hardware selection.")
    ];

    return [
      '<div class="reader-type-decision-hero">',
      '<div><strong>' + escapeHtml(readerType) + '</strong><span>' + escapeHtml(interfaceValue) + '</span></div>',
      '<div>' + statusChipHtml(status) + '<span>' + escapeHtml(security) + '</span></div>',
      '</div>',
      '<table class="reader-type-summary-table" data-reader-type-summary-table="true"><thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead><tbody>',
      tableRows.join(""),
      '</tbody></table>',
      '<p class="mini-note"><strong>Engineering Interpretation:</strong> ' + escapeHtml(interpretation) + '</p>',
      '<p class="mini-note"><strong>Actionable Guidance:</strong> ' + escapeHtml(guidance) + '</p>'
    ].join("");
  }

  function renderReaderTypeSchedule(rows, verificationHold = null) {
    const html = buildReaderTypeScheduleHtml(rows, verificationHold);
    const shell = outputShell();

    if (shell && typeof shell.showVisual === "function") {
      return shell.showVisual({
        card: els.decisionCard,
        wrap: els.chartWrap,
        target: els.readerTypeSchedule,
        html
      });
    }

    if (els.readerTypeSchedule) els.readerTypeSchedule.innerHTML = html;
    if (els.chartWrap) els.chartWrap.hidden = false;
    if (els.decisionCard) els.decisionCard.hidden = false;
    return true;
  }

  function clearReaderTypeSchedule() {
    const shell = outputShell();

    if (shell && typeof shell.hideVisual === "function") {
      return shell.hideVisual({
        card: els.decisionCard,
        wrap: els.chartWrap,
        target: els.readerTypeSchedule
      });
    }

    if (els.readerTypeSchedule) els.readerTypeSchedule.innerHTML = "";
    if (els.chartWrap) els.chartWrap.hidden = true;
    if (els.decisionCard) els.decisionCard.hidden = true;
    return true;
  }

  function svgDataUri(svg) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(String(svg || ""));
  }

  function buildReaderTypeExportSvg() {
    if (!currentReport) return "";

    const outputValue = (label) => {
      const target = String(label || "").trim().toLowerCase();
      const row = (currentReport.outputs || []).find((item) => String(item?.label || "").trim().toLowerCase() === target);
      return row ? row.value : "";
    };

    const status = statusFromVerification(outputValue("Verification Status") || currentReport.status);
    const color = status === "RISK" ? "#b42318" : status === "WATCH" ? "#b7791f" : "#1f9d57";
    const readerType = outputValue("Reader Type") || "Reader recommendation";
    const iface = outputValue("Interface") || "Interface pending";
    const security = outputValue("Security") || "Security basis pending";

    return '<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="360" viewBox="0 0 1100 360"><rect width="1100" height="360" rx="22" fill="#ffffff"/><rect x="36" y="34" width="1028" height="292" rx="18" fill="#f8fbf8" stroke="#b8cabe"/><text x="70" y="78" fill="#101715" font-size="24" font-weight="800" font-family="Inter,Arial,sans-serif">Reader Decision Schedule</text><rect x="870" y="54" width="130" height="38" rx="10" fill="#ffffff" stroke="' + color + '"/><text x="892" y="79" fill="' + color + '" font-size="14" font-weight="800" font-family="Inter,Arial,sans-serif">' + escapeHtml(status) + '</text><text x="70" y="138" fill="#1f9d57" font-size="20" font-weight="800" font-family="Inter,Arial,sans-serif">' + escapeHtml(readerType) + '</text><text x="70" y="180" fill="#54615d" font-size="16" font-family="Inter,Arial,sans-serif">' + escapeHtml(iface) + '</text><text x="70" y="222" fill="#54615d" font-size="16" font-family="Inter,Arial,sans-serif">' + escapeHtml(security) + '</text><path d="M70 258 H1016" stroke="#dce8e1"/><text x="70" y="292" fill="#54615d" font-size="14" font-family="Inter,Arial,sans-serif">Verify credential format, facility-code, existing-card support, and protocol before final hardware selection.</text></svg>';
  }

  function getReaderTypeVisualImage() {
    const svg = buildReaderTypeExportSvg();
    return svg ? svgDataUri(svg) : "";
  }

  function attachOutputShellExport() {
    const shell = outputShell();
    if (!shell || typeof shell.register !== "function") return false;

    shell.register(STEP, {
      getChartImage: getReaderTypeVisualImage,
      getVisualHtml: () => els.readerTypeSchedule ? els.readerTypeSchedule.innerHTML : ""
    });

    if (typeof shell.attachExportGetter === "function") {
      shell.attachExportGetter(STEP, window.ScopedLabsExportConfig);
    }

    return true;
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
      setExportStatus("Run recommendation to enable export.");
      return;
    }

    setExportStatus("Recommendation ready. Open Export Report or Save Snapshot.");
  }

  function getActiveScopeContext() {
    const scopeApi = window.ScopedLabsAccessControlScopeState;

    if (scopeApi && typeof scopeApi.buildScopeDisplayContext === "function") {
      return scopeApi.buildScopeDisplayContext("Reader Type Selector");
    }

    return {
      projectSite: "Not documented",
      areaScope: "No active scope selected",
      openingDoorCount: "Not documented",
      openingType: "Not documented",
      doorFunction: "Not documented",
      securityContext: "Not documented",
      upstreamSource: "No Scope Planner context detected",
      powerLossIntent: "Not documented",
      hasActiveScope: false,
      reportRows: [
        { label: "Active Scope", value: "No active access scope selected" },
        { label: "Scope Source", value: "No Scope Planner context detected" }
      ]
    };
  }

  function renderActiveScopeContext() {
    const scopeApi = window.ScopedLabsAccessControlScopeState;

    if (scopeApi && typeof scopeApi.renderScopeDisplay === "function") {
      return scopeApi.renderScopeDisplay({
        card: els.activeScopeCard,
        title: els.activeScopeTitle,
        description: els.activeScopeDescription,
        meta: els.activeScopeMeta,
        toolLabel: "Reader Type Selector"
      });
    }

    return getActiveScopeContext();
  }

  function getReportMeta() {
    return {
      reportTitle: (els.reportTitle?.value || "").trim() || "Reader Type Selector Assessment",
      projectName: (els.projectName?.value || "").trim(),
      clientName: (els.clientName?.value || "").trim(),
      preparedBy: (els.preparedBy?.value || "").trim(),
      customNotes: (els.customNotes?.value || "").trim()
    };
  }

  function assumptionsForTool() {
    return [
      "Reader recommendations are planning guidance and must be verified against the selected access-control platform.",
      "Interface recommendations assume the panel and reader hardware support the selected signaling method.",
      "Outdoor and harsh-environment recommendations should be verified against manufacturer environmental ratings.",
      "Credential and authentication choices should be aligned with site security policy, user workflow, and lifecycle support."
    ];
  }

  function showContinue() {
    if (els.nextStepRow) els.nextStepRow.style.display = "flex";
    if (els.nextBtn) els.nextBtn.disabled = false;
  }

  function hideContinue() {
    if (els.nextStepRow) els.nextStepRow.style.display = "none";
    if (els.nextBtn) els.nextBtn.disabled = true;
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

  function clearAnalysis() {
    if (window.ScopedLabsAnalyzer && els.analysis) {
      ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    } else if (els.analysis) {
      els.analysis.innerHTML = "";
      els.analysis.style.display = "none";
    }
  }

  function clearResults(message = "Run recommendation.") {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">${escapeHtml(message)}</div>`;
    }

    clearReaderTypeSchedule();
    clearAnalysis();
    clearLocalAssistant();
  }

  function labeledSemanticValue(label, value) {
    const l = String(label || "").toLowerCase();

    if (l.includes("verification status")) {
      return renderSemanticStatusText(value);
    }

    return escapeHtml(value);
  }

  function toneForRenderedValue(label, value) {
    const l = String(label || "").toLowerCase();
    const v = String(value || "").toLowerCase();

    if (l.includes("verification status")) return "";
    if (l.includes("cautionary") || l.includes("compatibility risk")) return v.includes("no major") ? "muted" : "watch";
    if (l.includes("card format") && (v.includes("unknown") || v.includes("csn") || v.includes("uid") || v.includes("26-bit"))) return "watch";
    if (l.includes("interface") && v.includes("osdp")) return "active";
    if (l.includes("interface") && v.includes("wiegand")) return "watch";
    if (l.includes("security") && (v.includes("encrypted") || v.includes("mfa") || v.includes("multi"))) return "active";
    if (l.includes("reader type")) return "active";
    return "";
  }

  function toneForRenderedValue(label, value) {
    const l = String(label || "").toLowerCase();
    const v = String(value || "").toLowerCase();

    if (l.includes("interface") && v.includes("osdp")) return "active";
    if (l.includes("interface") && v.includes("wiegand")) return "watch";
    if (l.includes("security") && (v.includes("encrypted") || v.includes("mfa") || v.includes("multi"))) return "active";
    if (l.includes("reader type")) return "active";
    return "";
  }

  function toneForRenderedValue(label, value) {
    const l = String(label || "").toLowerCase();
    const v = String(value || "").toLowerCase();

    if (l.includes("interface") && v.includes("osdp")) return "active";
    if (l.includes("interface") && v.includes("wiegand")) return "watch";
    if (l.includes("security") && (v.includes("encrypted") || v.includes("mfa") || v.includes("multi"))) return "active";
    if (l.includes("reader type")) return "active";
    return "";
  }

  function render(rows, verificationHold = null) {
    if (!els.results) return;

    ensureReaderTypeVerificationStyles();
    ensureReaderResultCadStyles();

    const detailRows = rows.filter((item) => item && item.label && item.value);

    const resultRows = detailRows.map((r) => {
      const tone = toneForRenderedValue(r.label, r.value);
      return [
        '<div class="result-row" data-result-label="' + escapeHtml(r.label) + '" data-result-value="' + escapeHtml(r.value) + '">',
        '<span class="result-label">' + escapeHtml(r.label) + '</span>',
        '<span class="result-value"' + (tone ? ' data-tone="' + escapeHtml(tone) + '"' : '') + '>' + labeledSemanticValue(r.label, r.value) + '</span>',
        '</div>'
      ].join("");
    }).join("");

    els.results.innerHTML = resultRows || '<div class="muted">Run recommendation.</div>';
    renderReaderTypeSchedule(rows, verificationHold);
  }

  function getRenderedRows() {
    if (!els.results) return [];

    return Array.from(els.results.querySelectorAll(".result-row"))
      .map((row) => {
        const label = row.dataset.resultLabel || row.querySelector(".result-label")?.textContent?.trim() || "";
        const value = row.dataset.resultValue || row.querySelector(".result-value")?.textContent?.trim() || "";
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

  function labelFromSelect(selectEl) {
    if (!selectEl) return "";
    return selectEl.options[selectEl.selectedIndex]?.textContent?.trim() || selectEl.value || "";
  }

  function getPreviousStepData() {
    try {
      const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
      const parsed = raw ? JSON.parse(raw) : null;
      if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) return {};
      return parsed.data || {};
    } catch {
      return {};
    }
  }

  function buildReportPayload(core) {
    return {
      reportId: makeReportId("SL-ACC-RTS"),
      generatedAt: new Date().toISOString(),
      category: CATEGORY_LABEL,
      categorySlug: CATEGORY,
      tool: TOOL_LABEL,
      toolSlug: STEP,
      status: core.status,
      summary: core.summary,
      interpretation: core.interpretation,
      inputs: [
        { label: "Security Level", value: core.inputs.securityLevel },
        { label: "Credential / Reader Technology", value: core.inputs.credentialTechnology },
        { label: "Card Format / Facility Code", value: core.inputs.cardFormat },
        { label: "Existing Credential Compatibility", value: core.inputs.existingCredentialCompatibility },
        { label: "Environment", value: core.inputs.environment },
        { label: "Throughput", value: core.inputs.throughput },
        { label: "Panel Interface / Reader Protocol", value: core.inputs.interfaceChoice }
      ],
      outputs: core.outputs,
      assumptions: assumptionsForTool(),
      meta: getReportMeta(),
      activeScopeContext: getActiveScopeContext()
    };
  }

  function getSharedExportPayload() {
    if (!currentReport) return null;

    const outputValue = (label) => {
      const row = (currentReport.outputs || []).find((item) => {
        return item && String(item.label || "").trim().toLowerCase() === String(label || "").trim().toLowerCase();
      });

      return row ? row.value : "";
    };

    const inputValue = (label) => {
      const row = (currentReport.inputs || []).find((item) => {
        return item && String(item.label || "").trim().toLowerCase() === String(label || "").trim().toLowerCase();
      });

      return row ? row.value : "";
    };

    const textSection = (title, text, description) => {
      const value = String(text || "").trim();
      if (!value) return null;
      return { title, description: description || "", text: value };
    };

    const cell = (text, tone = "") => {
      return { text: text || "", tone };
    };

    const toneForInterface = (value) => {
      const text = String(value || "").toLowerCase();
      if (text.includes("secure channel") || text.includes("osdp")) return "active";
      if (text.includes("wiegand") || text.includes("unknown")) return "watch";
      return "";
    };

    const toneForSecurity = (value) => {
      const text = String(value || "").toLowerCase();
      if (text.includes("higher") || text.includes("encrypted") || text.includes("multi")) return "active";
      if (text.includes("standard")) return "muted";
      return "";
    };

    const toneForCredentialFormat = (value) => {
      const text = String(value || "").toLowerCase();
      if (text.includes("unknown") || text.includes("csn") || text.includes("uid") || text.includes("26-bit")) return "watch";
      if (text.includes("managed") || text.includes("encrypted") || text.includes("corporate")) return "active";
      return "";
    };

    const readerType = outputValue("Reader Type") || "Pending";
    const interfaceChoice = outputValue("Interface") || "Pending";
    const security = outputValue("Security") || "Pending";
    const environment = outputValue("Environment") || "Pending";
    const throughput = outputValue("Throughput") || "Pending";
    const cardFormat = outputValue("Credential Format / Facility Code") || inputValue("Card Format / Facility Code") || "Not documented";
    const existingCompatibility = outputValue("Existing Credential Compatibility") || inputValue("Existing Credential Compatibility") || "Not documented";
    const compatibilityRisk = outputValue("Compatibility Risk") || "No compatibility risk documented";
    const verificationStatus = outputValue("Verification Status") || currentReport.status || "Not documented";
    const cautionarySteps = outputValue("Cautionary Steps") || "No cautionary steps documented";
    const interpretation = outputValue("Engineering Interpretation") || currentReport.interpretation || "";
    const guidance = outputValue("Actionable Guidance") || "";

    const activeScope = currentReport.activeScopeContext || getActiveScopeContext();

    const activeScopeRows = Array.isArray(activeScope.reportRows) && activeScope.reportRows.length
      ? activeScope.reportRows.map((item) => [item.label, item.value])
      : [
        ["Project / Site", activeScope.projectSite || "Not documented"],
        ["Area / Scope", activeScope.areaScope || "Not documented"],
        ["Opening / Door Count", activeScope.openingDoorCount || "Not documented"],
        ["Opening Type", activeScope.openingType || "Not documented"],
        ["Door Function", activeScope.doorFunction || "Not documented"],
        ["Security Context", activeScope.securityContext || "Not documented"],
        ["Power Loss Intent", activeScope.powerLossIntent || "Not documented"],
        ["Upstream Source", activeScope.upstreamSource || "Scope Planner active scope"]
      ];

    const extraSections = [
      {
        title: "Executive Summary",
        text: currentReport.summary || ""
      },
      {
        title: "Active Scope Context",
        description: "Area, opening, and upstream planning context this reader recommendation applies to.",
        tableClass: "extra-export-table--kv",
        tables: [
          {
            headers: ["Scope Field", "Value"],
            rows: activeScopeRows
          }
        ]
      },
      {
        title: "Inputs",
        description: "Reader selection assumptions used for this planning recommendation.",
        tableClass: "extra-export-table--kv",
        tables: [
          {
            headers: ["Input", "Value"],
            rows: (currentReport.inputs || []).map((item) => [item.label, item.value])
          }
        ]
      },
      {
        title: "Credential Verification Trail",
        description: "Credential format, facility-code, and existing-card assumptions used by this recommendation.",
        tableClass: "extra-export-table--planner extra-export-table--decision",
        tables: [
          {
            headers: ["Verification Status", "Card Format / Facility Code", "Existing Compatibility", "Compatibility Risk"],
            rows: [[
              cell(verificationStatus, String(verificationStatus).includes("RISK") ? "risk" : String(verificationStatus).includes("WATCH") ? "watch" : "muted"),
              cell(cardFormat, toneForCredentialFormat(cardFormat) || "muted"),
              existingCompatibility,
              cell(compatibilityRisk, toneForCredentialFormat(cardFormat) || "muted")
            ]]
          }
        ]
      },
      {
        title: "Reader Recommendation",
        description: "Short decision facts only. Engineering interpretation and guidance are separated below.",
        tableClass: "extra-export-table--planner extra-export-table--decision",
        tables: [
          {
            headers: ["Reader Type", "Interface", "Security", "Environment", "Throughput"],
            rows: [[
              cell(readerType, readerType === "Pending" ? "muted" : "active"),
              cell(interfaceChoice, toneForInterface(interfaceChoice) || "muted"),
              cell(security, toneForSecurity(security) || "muted"),
              environment,
              throughput
            ]]
          }
        ]
      }
    ];

    [
      textSection("Cautionary Steps", cautionarySteps, "Verification items that should be confirmed or documented before this reader decision is treated as final."),
      textSection("Engineering Interpretation", interpretation, "Why this reader strategy fits the selected security, protocol, credential-format, environment, and throughput assumptions."),
      textSection("Actionable Guidance", guidance, "What should be checked before carrying this reader strategy into Lock Power Budget and Summary.")
    ].filter(Boolean).forEach((section) => extraSections.push(section));

    return {
      ...currentReport,
      meta: getReportMeta(),
      summary: "",
      inputs: [],
      outputs: [],
      interpretation: "",
      extraSections,
      stackReportSections: true
    };
  }

  window.ScopedLabsAccessControlReaderTypeExport = Object.freeze({
    getPayload: getSharedExportPayload
  });

  function loadFlowContext() {
    if (els.flowNote) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
    }
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["lock-power-budget"]);
      sessionStorage.removeItem(FLOW_KEYS["panel-capacity"]);
      sessionStorage.removeItem(FLOW_KEYS["access-level-sizing"]);
    } catch {}

    currentReport = null;
    hideContinue();
    clearResults("Inputs changed. Press Recommend to refresh results.");
    loadFlowContext();
    renderActiveScopeContext();
    applyToolShellModules();
    updateExportControls();
  }

  function resetAll() {
    if (els.sec) els.sec.value = "low";
    if (els.cred) els.cred.value = "card";
    if (els.env) els.env.value = "indoor";
    if (els.throughput) els.throughput.value = "standard";
    if (els.iface) els.iface.value = "wg";
    if (els.cardFormat) els.cardFormat.value = "unknown";
    if (els.existingCred) els.existingCred.value = "unknown";

    currentReport = null;

    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["lock-power-budget"]);
      sessionStorage.removeItem(FLOW_KEYS["panel-capacity"]);
      sessionStorage.removeItem(FLOW_KEYS["access-level-sizing"]);
    } catch {}

    hideContinue();
    clearResults("Run recommendation.");
    loadFlowContext();
    renderActiveScopeContext();
    updateExportControls();
  }

  function buildVerificationHold(status, steps, compatibilityRisk) {
    const cleanStatus = String(status || "HEALTHY").toUpperCase();
    const cleanSteps = Array.isArray(steps)
      ? steps.map((item) => String(item || "").trim()).filter(Boolean)
      : [];

    if (cleanStatus === "HEALTHY" && !cleanSteps.length) {
      return {
        status: cleanStatus,
        label: "HEALTHY ? No cautionary hold flagged",
        body: "No reader-protocol or credential-format hold is currently blocking the next step.",
        steps: []
      };
    }

    const fallback = compatibilityRisk && compatibilityRisk !== "No major credential compatibility risk flagged."
      ? compatibilityRisk
      : "Confirm credential format, facility-code/bit-format, existing-card compatibility, and panel reader protocol before continuing.";

    return {
      status: cleanStatus,
      label: cleanStatus + ": Confirm before continuing",
      body: "This reader decision should not be treated as final until the items below are verified or documented as known constraints.",
      steps: cleanSteps.length ? cleanSteps : [fallback]
    };
  }

  function getStatus({ sec, iface, cred, cardFormat, existingCred }) {
    if (cardFormat === "existing-unknown" && existingCred === "must-remain") return "WATCH";
    if (cardFormat === "csn-uid" && sec === "high") return "RISK";
    if (sec === "high" && iface === "wg") return "WATCH";
    if (sec === "high" && cred !== "multi" && cred !== "card-pin" && cred !== "biometric") return "WATCH";
    if (iface === "unknown") return "WATCH";
    return "HEALTHY";
  }

  function buildSummary({ reader, interfaceRec, security, cardFormatNote, compatibilityNote }) {
    return `${reader} is the current planning recommendation. ${security}. Interface recommendation: ${interfaceRec}. Credential format basis: ${cardFormatNote}. Compatibility basis: ${compatibilityNote}.`;
  }

  function calc() {
    const sec = els.sec.value;
    const cred = els.cred.value;
    const env = els.env.value;
    const throughput = els.throughput.value;
    const iface = els.iface.value;
    const cardFormat = els.cardFormat.value;
    const existingCred = els.existingCred.value;

    const interfaceRecMap = {
      unknown: "Protocol not selected yet",
      wg: "Wiegand (legacy, not encrypted)",
      osdp: "OSDP (supervised)",
      "osdp-secure": "OSDP Secure Channel (supervised/encrypted)",
      either: "Either supported; prefer OSDP Secure Channel when available"
    };

    const interfaceRec = interfaceRecMap[iface] || "Protocol not selected yet";

    let reader = "Smart card reader";
    if (cred === "mobile") reader = "Mobile credential reader";
    if (cred === "pin") reader = "Keypad reader";
    if (cred === "card-pin") reader = "Card + PIN reader";
    if (cred === "biometric") reader = "Biometric reader";
    if (cred === "long-range") reader = "Long-range / vehicle reader";
    if (cred === "qr") reader = "QR / barcode visitor reader";
    if (cred === "multi") reader = "Multi-technology / multi-factor reader";

    const security =
      sec === "high"
        ? "Higher-assurance credential + supervised protocol recommended"
        : sec === "med"
          ? "Managed/encrypted credential preferred"
          : "Standard credential strategy acceptable if compatibility is verified";

    const envNote =
      env === "harsh"
        ? "Use industrial/IP-rated reader"
        : env === "outdoor"
          ? "Use weather-rated reader"
          : "Indoor-rated reader is acceptable";

    const throughputNote =
      throughput === "handsfree"
        ? "Hands-free / BLE / long-range user flow"
        : throughput === "fast"
          ? "Optimize reader placement and credential presentation for throughput"
          : "Standard read speed acceptable";

    const cardFormatMap = {
      unknown: "Unknown / not verified",
      "existing-known": "Existing facility code + bit format known",
      "existing-unknown": "Existing credentials with unknown facility code / bit format",
      "new-population": "New credential population",
      "26-bit": "26-bit / common facility-code format",
      "corp-1000": "35/37-bit Corporate 1000 style",
      "csn-uid": "CSN / UID only",
      "managed-encrypted": "Managed encrypted smart credential",
      "mobile-tenant": "Mobile credential tenant / account"
    };

    const compatibilityMap = {
      unknown: "Unknown / inventory not verified",
      "must-remain": "Must support existing cards",
      "new-allowed": "New credentials allowed",
      "mixed-migration": "Mixed migration / phased replacement"
    };

    const cardFormatNote = cardFormatMap[cardFormat] || "Unknown / not verified";
    const compatibilityNote = compatibilityMap[existingCred] || "Unknown / inventory not verified";

    const risks = [];

    if (existingCred === "must-remain" && cardFormat === "existing-unknown") {
      risks.push("Existing credentials must remain, but facility code / bit format is unknown.");
    }

    if (cardFormat === "unknown") {
      risks.push("Credential format is not verified.");
    }

    if (cardFormat === "csn-uid") {
      risks.push("CSN / UID-only credential use should not be treated as a strong security basis.");
    }

    if (cardFormat === "26-bit" && sec !== "low") {
      risks.push("Common 26-bit formats can create duplication and lifecycle-control concerns.");
    }

    if (iface === "wg") {
      risks.push("Wiegand is a legacy unsupervised reader interface.");
    }

    if (iface === "unknown") {
      risks.push("Panel protocol is not selected.");
    }

    const compatibilityRisk = risks.length ? risks.join(" ") : "No major credential compatibility risk flagged.";

    let interpretation = "";
    if (risks.length) {
      interpretation = "The reader recommendation is being limited by credential compatibility and protocol verification. Before hardware is finalized, confirm the card format, facility-code/bit-format basis, and panel reader protocol.";
    } else if (cred === "multi" || cred === "card-pin" || cred === "biometric" || sec === "high") {
      interpretation = "This door is being treated as a higher-assurance checkpoint, so reader choice should prioritize credential integrity, protocol supervision, and lifecycle control.";
    } else if (throughput === "handsfree" || cred === "long-range") {
      interpretation = "This opening is being optimized for user flow, so reader selection should account for range, credential presentation, and nuisance-read control.";
    } else {
      interpretation = "The recommended reader type is balanced for normal access-control conditions, with compatibility verification carried forward before lock-power and panel assumptions are finalized.";
    }

    const guidanceParts = [];

    if (existingCred === "must-remain" && (cardFormat === "unknown" || cardFormat === "existing-unknown")) {
      guidanceParts.push("Inventory existing cards and document facility code / bit format before selecting reader hardware.");
    }

    if (cardFormat === "csn-uid") {
      guidanceParts.push("Avoid UID-only as the security decision basis for higher-security doors.");
    }

    if (iface === "wg") {
      guidanceParts.push("If the panel can support it, prefer OSDP or OSDP Secure Channel for new supervised deployments.");
    }

    if (iface === "unknown") {
      guidanceParts.push("Confirm panel reader protocol before carrying this result into Lock Power Budget.");
    }

    if (!guidanceParts.length) {
      guidanceParts.push("Verify reader compatibility, credential enrollment path, and protocol support before carrying this result into Lock Power Budget.");
    }

    const guidance = guidanceParts.join(" ");
    const status = getStatus({ sec, iface, cred, cardFormat, existingCred });
    const verificationHold = buildVerificationHold(status, guidanceParts, compatibilityRisk);

    render([
      { label: "Reader Type", value: reader },
      { label: "Verification Status", value: verificationHold.label },
      { label: "Interface", value: interfaceRec },
      { label: "Security", value: security },
      { label: "Credential Format / Facility Code", value: cardFormatNote },
      { label: "Existing Credential Compatibility", value: compatibilityNote },
      { label: "Compatibility Risk", value: compatibilityRisk },
      { label: "Cautionary Steps", value: verificationHold.steps.join(" ") },
      { label: "Environment", value: envNote },
      { label: "Throughput", value: throughputNote },
      { label: "Engineering Interpretation", value: interpretation },
      { label: "Actionable Guidance", value: guidance }
    ], verificationHold);

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      data: {
        readerType: reader,
        interfaceRec,
        security,
        envNote,
        throughputNote,
        environment: env,
        priority: sec,
        credential: cred,
        credentialTechnology: cred,
        cardFormat,
        cardFormatNote,
        facilityCodeStatus: cardFormat,
        existingCredentialCompatibility: existingCred,
        compatibilityNote,
        compatibilityRisk,
        interface: iface,
        panelInterface: iface,
        readerProtocol: iface,
        verificationStatus: verificationHold.label,
        cautionarySteps: verificationHold.steps,
        requiredActions: guidanceParts,
        activeScopeContext: getActiveScopeContext(),
        nextTool: "Lock Power Budget"
      }
    });

    showContinue();

    const summary = buildSummary({ reader, interfaceRec, security, cardFormatNote, compatibilityNote });

    const assistantCore = {
      status,
      recommendation: reader,
      interfaceChoice: interfaceRec,
      security,
      environment: envNote,
      throughput: throughputNote,
      credentialTechnology: labelFromSelect(els.cred),
      cardFormat: cardFormatNote,
      existingCredentialCompatibility: compatibilityNote,
      compatibilityRisk,
      verificationStatus: verificationHold.label,
      verificationSteps: verificationHold.steps,
      interpretation,
      guidance,
      nextTool: "Lock Power Budget",
      requiredActions: [
        guidance,
        "Verify credential format, facility-code/bit-format, and existing-card compatibility before final reader selection.",
        "Carry reader type, interface, credential technology, and credential-format assumptions into Lock Power Budget and Summary."
      ]
    };

    const currentRows = getRenderedRows();

    currentReport = buildReportPayload({
      status,
      summary,
      interpretation,
      inputs: {
        securityLevel: labelFromSelect(els.sec),
        credentialTechnology: labelFromSelect(els.cred),
        cardFormat: labelFromSelect(els.cardFormat),
        existingCredentialCompatibility: labelFromSelect(els.existingCred),
        environment: labelFromSelect(els.env),
        throughput: labelFromSelect(els.throughput),
        interfaceChoice: labelFromSelect(els.iface)
      },
      outputs: currentRows
    });

    updateExportControls();

    renderLocalAssistant(assistantCore);
  }

  function bindEvents() {
    if (els.calc) {
      els.calc.addEventListener("click", calc);
    }

    if (els.reset) {
      els.reset.addEventListener("click", resetAll);
    }

    [
      els.sec,
      els.cred,
      els.env,
      els.throughput,
      els.iface,
      els.cardFormat,
      els.existingCred
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    if (els.nextBtn) {
      els.nextBtn.addEventListener("click", () => {
        window.location.href = "/tools/access-control/lock-power-budget/";
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

  function applyToolShellModules() {
    if (
      window.ScopedLabsToolShell &&
      typeof window.ScopedLabsToolShell.applyBackContinueShell === "function"
    ) {
      window.ScopedLabsToolShell.applyBackContinueShell({
        rowId: "accessControlFlowActions"
      });
    }
  }

  function init() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    currentReport = null;
    hideContinue();
    clearResults("Run recommendation.");
    loadFlowContext();
    renderActiveScopeContext();
    updateExportControls();
    attachOutputShellExport();

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