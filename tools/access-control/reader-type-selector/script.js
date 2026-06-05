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

      .reader-status-token--watch {
        color: #ffd666;
      }

      .reader-status-token--risk {
        color: #ff8a8a;
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
    const toneClass = status === "RISK" ? "reader-status-token--risk" : status === "WATCH" ? "reader-status-token--watch" : "";

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

    if (l.includes("verification status") && v.includes("risk")) return "";
    if (l.includes("verification status") && v.includes("watch")) return "";
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

    const rowMap = new Map(rows.map((item) => [item.label, item.value]));
    const readerType = rowMap.get("Reader Type") || "Reader recommendation pending";
    const interfaceValue = rowMap.get("Interface") || "Interface pending";
    const interpretation = rowMap.get("Engineering Interpretation") || "";
    const guidance = rowMap.get("Actionable Guidance") || "";

    const detailRows = rows.filter((item) => {
      return item.label !== "Engineering Interpretation" && item.label !== "Actionable Guidance";
    });

    const resultRows = detailRows.map((r) => {
      const tone = toneForRenderedValue(r.label, r.value);
      return `
        <div class="result-row" data-result-label="${escapeHtml(r.label)}" data-result-value="${escapeHtml(r.value)}">
          <span class="result-label">${escapeHtml(r.label)}</span>
          <span class="result-value" ${tone ? `data-tone="${escapeHtml(tone)}"` : ""}>${labeledSemanticValue(r.label, r.value)}</span>
        </div>
      `;
    }).join("");

    const hold = verificationHold && verificationHold.status && verificationHold.status !== "HEALTHY"
      ? `
        <div class="reader-verification-hold reader-verification-hold--${escapeHtml(String(verificationHold.status).toLowerCase())}">
          <div class="reader-verification-hold__label">${renderSemanticStatusText(verificationHold.label)}</div>
          <p class="reader-verification-hold__body">${escapeHtml(verificationHold.body)}</p>
          ${Array.isArray(verificationHold.steps) && verificationHold.steps.length ? `
            <ul>
              ${verificationHold.steps.map((step) => `<li>${escapeHtml(step)}</li>`).join("")}
            </ul>
          ` : ""}
        </div>
      `
      : "";

    els.results.innerHTML = `
      ${hold}

      <div class="reader-result-hero">
        <div class="reader-result-kicker">Current Reader Direction</div>
        <div class="reader-result-title">${escapeHtml(readerType)}</div>
        <div class="reader-result-subtitle">${escapeHtml(interfaceValue)}</div>
      </div>

      <div class="reader-result-grid">
        ${resultRows}
        ${interpretation ? `
          <div class="result-row result-row--wide" data-result-label="Engineering Interpretation" data-result-value="${escapeHtml(interpretation)}">
            <span class="result-label">Engineering Interpretation</span>
            <span class="result-value">${escapeHtml(interpretation)}</span>
          </div>
        ` : ""}
        ${guidance ? `
          <div class="result-row result-row--wide" data-result-label="Actionable Guidance" data-result-value="${escapeHtml(guidance)}">
            <span class="result-label">Actionable Guidance</span>
            <span class="result-value">${escapeHtml(guidance)}</span>
          </div>
        ` : ""}
      </div>
    `;
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
      meta: getReportMeta()
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

    const activeScopeRows = [
      ["Project / Site", inputValue("Project / Site") || inputValue("Project") || "Not documented"],
      ["Area / Scope", inputValue("Area / Scope") || inputValue("Scope") || inputValue("Area") || "Not documented"],
      ["Opening / Door Count", inputValue("Opening / Door Count") || inputValue("Door Count") || "Not documented"],
      ["Upstream Source", "Scope Planner / Fail-Safe context"]
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
    applyToolShellModules();
    updateExportControls();
  }

  function resetAll() {
    if (els.sec) els.sec.value = "low";
    if (els.cred) els.cred.value = "card";
    if (els.env) els.env.value = "indoor";
    if (els.throughput) els.throughput.value = "standard";
    if (els.iface) els.iface.value = "wg";

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
        activeScopeContext: {
          source: "Scope Planner / Fail-Safe context",
          note: "Reader Type decision applies to the active Access Control scope carried into this step."
        },
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
      els.iface
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
    updateExportControls();

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