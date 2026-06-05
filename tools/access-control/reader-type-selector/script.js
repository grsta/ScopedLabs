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

  function render(rows) {
    if (!els.results) return;

    els.results.innerHTML = "";

    rows.forEach((r) => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${escapeHtml(r.label)}</span>
        <span class="result-value">${escapeHtml(r.value)}</span>
      `;
      els.results.appendChild(div);
    });
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
        { label: "Credential Preference", value: core.inputs.credentialPreference },
        { label: "Environment", value: core.inputs.environment },
        { label: "Throughput", value: core.inputs.throughput },
        { label: "Panel Interface", value: core.inputs.interfaceChoice }
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

    const textSection = (title, text, description) => {
      const value = String(text || "").trim();
      if (!value) return null;
      return { title, description: description || "", text: value };
    };

    const previous = getPreviousStepData();
    const readerType = outputValue("Reader Type") || "Pending";
    const interfaceChoice = outputValue("Interface") || "Pending";
    const security = outputValue("Security") || "Pending";
    const environment = outputValue("Environment") || "Pending";
    const throughput = outputValue("Throughput") || "Pending";
    const interpretation = outputValue("Engineering Interpretation") || currentReport.interpretation || "";
    const guidance = outputValue("Actionable Guidance") || "";

    const failMode = previous.recommendation || previous.failStateRecommendation || "Not carried forward";
    const failStatus = previous.status || previous.failStateStatus || "Not documented";
    const powerLossIntent = previous.powerLossIntent || previous.powerLoss || "Not documented";

    const extraSections = [
      {
        title: "Executive Summary",
        text: currentReport.summary || ""
      },
      {
        title: "Carry-Forward Context",
        description: "Door behavior carried from Fail-Safe / Fail-Secure into reader selection.",
        countLabel: failMode === "Not carried forward" ? "0 ITEMS" : "1 ITEM",
        countTone: "muted",
        tableClass: "extra-export-table--planner extra-export-table--access-scope",
        tables: [
          {
            headers: ["Previous Step", "Decision", "Status", "Power Loss Intent", "Next Action"],
            rows: [[
              "Fail-Safe / Fail-Secure",
              failMode,
              failStatus,
              powerLossIntent,
              "Carry reader type into Lock Power Budget."
            ]]
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
        title: "Reader Recommendation",
        description: "Short decision facts only. Engineering interpretation and guidance are separated below.",
        tableClass: "extra-export-table--planner extra-export-table--decision",
        tables: [
          {
            headers: ["Reader Type", "Interface", "Security", "Environment", "Throughput"],
            rows: [[readerType, interfaceChoice, security, environment, throughput]]
          }
        ]
      }
    ];

    [
      textSection("Engineering Interpretation", interpretation, "Why this reader strategy fits the selected security, environment, and throughput assumptions."),
      textSection("Actionable Guidance", guidance, "What should be checked before carrying this reader strategy into Lock Power Budget.")
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

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    const d = parsed.data || {};
    const lines = [];

    if (d.recommendation) lines.push(`Fail Mode: <strong>${escapeHtml(d.recommendation)}</strong>`);
    if (d.doorType) lines.push(`Door Type: <strong>${escapeHtml(d.doorType)}</strong>`);
    if (d.life) lines.push(`Life Safety: <strong>${escapeHtml(d.life)}</strong>`);
    if (d.threat) lines.push(`Threat: <strong>${escapeHtml(d.threat)}</strong>`);
    if (d.powerLoss) lines.push(`Power Reliability: <strong>${escapeHtml(d.powerLoss)}</strong>`);
    if (d.fire) lines.push(`Fire Integration: <strong>${escapeHtml(d.fire)}</strong>`);

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

  function getStatus({ sec, iface, cred }) {
    if (sec === "high" && iface === "wg") return "WATCH";
    if (sec === "high" && cred !== "multi") return "WATCH";
    return "HEALTHY";
  }

  function buildSummary({ reader, interfaceRec, security }) {
    return `${reader} is the current planning recommendation. ${security}. Interface recommendation: ${interfaceRec}.`;
  }

  function calc() {
    const sec = els.sec.value;
    const cred = els.cred.value;
    const env = els.env.value;
    const throughput = els.throughput.value;
    const iface = els.iface.value;

    const interfaceRec =
      iface === "osdp"
        ? "OSDP (secure, supervised)"
        : "Wiegand (legacy, not encrypted)";

    let reader = "Smart card reader";
    if (cred === "mobile") reader = "Mobile credential reader";
    if (cred === "pin") reader = "Keypad reader";
    if (cred === "multi") reader = "Multi-factor reader";

    const security =
      sec === "high"
        ? "Encrypted credentials + OSDP + MFA recommended"
        : sec === "med"
          ? "Encrypted credentials recommended"
          : "Standard credentials acceptable";

    const envNote =
      env === "harsh"
        ? "Use industrial/IP-rated reader"
        : env === "outdoor"
          ? "Use weather-rated reader"
          : "Indoor-rated reader is fine";

    const throughputNote =
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
        interface: iface
      }
    });

    showContinue();

    const status = getStatus({ sec, iface, cred });
    const summary = buildSummary({ reader, interfaceRec, security });

    const assistantCore = {
      status,
      recommendation: reader,
      interfaceChoice: interfaceRec,
      security,
      environment: envNote,
      throughput: throughputNote,
      interpretation,
      guidance,
      nextTool: "Lock Power Budget",
      requiredActions: [
        guidance,
        "Confirm the selected reader interface is supported by the panel and reader hardware.",
        "Carry this reader strategy into Lock Power Budget before panel capacity is finalized."
      ]
    };

    renderLocalAssistant(assistantCore);

    currentReport = buildReportPayload({
      status,
      summary,
      interpretation,
      inputs: {
        securityLevel: labelFromSelect(els.sec),
        credentialPreference: labelFromSelect(els.cred),
        environment: labelFromSelect(els.env),
        throughput: labelFromSelect(els.throughput),
        interfaceChoice: labelFromSelect(els.iface)
      },
      outputs: getRenderedRows()
    });

    updateExportControls();
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