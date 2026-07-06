(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "storage-throughput";
  const LANE = "v1";
  const PREVIOUS_STEP = "storage-iops";
  const State = window.ScopedLabsComputePlanState;

  const FLOW_KEYS = {
    "cpu-sizing": "scopedlabs:pipeline:compute:cpu-sizing",
    "ram-sizing": "scopedlabs:pipeline:compute:ram-sizing",
    "storage-iops": "scopedlabs:pipeline:compute:storage-iops",
    "storage-throughput": "scopedlabs:pipeline:compute:storage-throughput",
    "vm-density": "scopedlabs:pipeline:compute:vm-density",
    "gpu-vram": "scopedlabs:pipeline:compute:gpu-vram",
    "power-thermal": "scopedlabs:pipeline:compute:power-thermal",
    "raid-rebuild-time": "scopedlabs:pipeline:compute:raid-rebuild-time",
    "backup-window": "scopedlabs:pipeline:compute:backup-window"
  };

  const $ = (id) => document.getElementById(id);

  let hasResult = false;

      // storage-throughput-shared-assistant-contract-0705
      function renderStorageThroughputSharedAssistant(flowPayload) {
        if (!els.assistantCard || !els.assistantMount) return;
        if (!window.ScopedLabsComputeAssistant || typeof window.ScopedLabsComputeAssistant.renderStorageThroughputAssistantStatusCard !== "function") return;

        els.assistantMount.innerHTML = window.ScopedLabsComputeAssistant.renderStorageThroughputAssistantStatusCard({
          outputs: flowPayload || {},
          workloadType: els.workloadType ? els.workloadType.value : "active workload"
        });

        els.assistantCard.hidden = false;
        els.assistantCard.removeAttribute("hidden");
        els.assistantCard.style.display = "";

        if (els.resultCard) {
          els.resultCard.hidden = true;
          els.resultCard.setAttribute("hidden", "");
          els.resultCard.style.display = "none";
        }
      }
    let currentStorageThroughputExportResult = null;
let iopsContext = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    iops: $("iops"),
    kb: $("kb"),
    readPct: $("readPct"),
    writePct: $("writePct"),
    overhead: $("overhead"),
        availableMBps: $("availableMBps"),
    peakMultiplier: $("peakMultiplier"),
    growthPct: $("growthPct"),
    datasetTB: $("datasetTB"),
    transferWindowHours: $("transferWindowHours"),
    transportPath: $("transportPath"),
    mediaTier: $("mediaTier"),
    workloadType: $("workloadType"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
    visualCard: $("computeStorageThroughputVisualCard"),
    visual: $("computeStorageThroughputVisual"),
    resultCard: $("computeStorageThroughputResultCard"),
    resultSummary: $("computeStorageThroughputResultSummary"),
    assistantCard: $("computeAssistantCard"),
    assistantMount: $("computeAssistantMount"),
    referencesCard: $("computeStorageThroughputReferencesCard"),
    references: $("computeStorageThroughputReferences"),
    actionsCard: $("computeStorageThroughputRecommendedActionsCard"),
    actions: $("computeStorageThroughputRecommendedActions"),
    decisionCard: $("computeStorageThroughputDecisionScheduleCard"),
    decision: $("computeStorageThroughputDecisionSchedule"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  function hasStoredAuth() {
    try {
      const k = Object.keys(localStorage).find((x) => x.startsWith("sb-"));
      if (!k) return false;
      const raw = JSON.parse(localStorage.getItem(k));
      return !!(
        raw?.access_token ||
        raw?.currentSession?.access_token ||
        (Array.isArray(raw) ? raw[0]?.access_token : null)
      );
    } catch {
      return false;
    }
  }

  function getUnlockedCategories() {
    try {
      const raw = localStorage.getItem("sl_unlocked_categories");
      if (!raw) return [];
      return raw.split(",").map((x) => String(x).trim().toLowerCase()).filter(Boolean);
    } catch {
      return [];
    }
  }

  function unlockCategoryPage() {
    const category = String(document.body?.dataset?.category || "").trim().toLowerCase();
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

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.continue) els.continue.disabled = false;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continue) els.continue.disabled = true;
  }

  function refreshFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      iopsContext = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      iopsContext = null;
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      iopsContext = null;
      return;
    }

    iopsContext = parsed.data || {};

    const rows = [];
    if (typeof iopsContext.finalIops === "number") rows.push(`Required IOPS: <strong>${Math.round(iopsContext.finalIops)}</strong>`);
    if (typeof iopsContext.storagePressure === "string") rows.push(`Storage Pressure: <strong>${iopsContext.storagePressure}</strong>`);
    if (typeof iopsContext.primaryConstraint === "string") rows.push(`Primary Constraint: <strong>${iopsContext.primaryConstraint}</strong>`);
    if (typeof iopsContext.status === "string") rows.push(`IOPS Status: <strong>${iopsContext.status}</strong>`);

    if (!rows.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      ${rows.join(" | ")}
      <br><br>
      This step checks whether throughput becomes the next practical storage limiter after the random IOPS profile already defined upstream.
    `;
  }


  function saveComputeLedgerResult(payload) {
    if (!State || typeof State.recordToolResult !== "function") return null;

    try {
      return State.recordToolResult(STEP, payload);
    } catch {
      return null;
    }
  }
  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["vm-density"]);
      sessionStorage.removeItem(FLOW_KEYS["gpu-vram"]);
      sessionStorage.removeItem(FLOW_KEYS["power-thermal"]);
      sessionStorage.removeItem(FLOW_KEYS["raid-rebuild-time"]);
      sessionStorage.removeItem(FLOW_KEYS["backup-window"]);
    } catch {}

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: null,
      continueBtnEl: null,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS[STEP],
      category: CATEGORY,
      step: STEP,
      lane: LANE
    });

    hasResult = false;
    clearStorageThroughputCapacityVisual();
        clearStorageThroughputShellSections();
hideContinue();
    refreshFlowNote();
  }

  function storageThroughputLabel(map, value, fallback) {
    return map[value] || fallback || "Unspecified";
  }

  function storageThroughputTransportLabel(value) {
    return storageThroughputLabel({
      "10g": "10 GbE / shared path",
      "25g": "25 GbE / faster shared path",
      "40g": "40 GbE / storage fabric",
      "100g": "100 GbE / high-speed fabric",
      local: "Local storage bus",
      "san-nas": "SAN / NAS array path",
      "cloud-object": "Cloud / object storage path"
    }, value, "Unspecified transport path");
  }

  function storageThroughputMediaLabel(value) {
    return storageThroughputLabel({
      hdd: "HDD / spinning disk",
      "sata-ssd": "SATA / SAS SSD",
      nvme: "NVMe / high-performance tier",
      "shared-array": "Shared storage array",
      "object-cloud": "Object / cloud-backed storage"
    }, value, "Unspecified media tier");
  }

  function storageThroughputWorkloadLabel(value) {
    return storageThroughputLabel({
      backup: "Backup",
      restore: "Restore",
      "file-transfer": "File transfer",
      "analytics-read": "Analytics read",
      "vm-datastore": "VM datastore",
      archive: "Archive / retention"
    }, value, "Unspecified workload type");
  }

  function formatStorageThroughputMBps(value) {
    return Number(value || 0).toFixed(1) + " MB/s";
  }


  // storage-throughput-capacity-envelope-wire-0705
  function clearStorageThroughputCapacityVisual() {
    if (els.visual) {
      els.visual.innerHTML = "";
    }

    if (els.visualCard) {
      els.visualCard.hidden = true;
      els.visualCard.setAttribute("hidden", "");
    }
  }

  function renderStorageThroughputCapacityVisual(result) {
    if (
      window.ScopedLabsComputeCapacityVisuals &&
      typeof window.ScopedLabsComputeCapacityVisuals.renderStorageThroughputCapacityEnvelope === "function"
    ) {
      window.ScopedLabsComputeCapacityVisuals.renderStorageThroughputCapacityEnvelope({
        card: els.visualCard,
        mount: els.visual,
        result
      });
    }
  }


  // storage-throughput-proof-stack-0705
  function storageThroughputEscapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function storageThroughputStatusClass(status) {
    const value = String(status || "").toUpperCase();
    if (value === "RISK" || value === "BLOCKED") return "is-risk";
    if (value === "WATCH" || value === "REVIEW") return "is-watch";
    if (value === "GOOD" || value === "HEALTHY") return "is-good";
    return "is-review";
  }

  function normalizeStorageThroughputReference(ref) {
    if (ref && typeof ref === "object") {
      return {
        marker: String(ref.marker || ""),
        reference: String(ref.reference || ref.label || ""),
        reason: String(ref.reason || ref.value || "")
      };
    }

    const raw = String(ref || "");
    const parts = raw.split("|");
    return {
      marker: parts[0] || "",
      reference: parts[1] || "",
      reason: parts.slice(2).join("|") || ""
    };
  }

  function renderStorageThroughputReferenceTable(refs) {
    const rows = (refs || []).map(normalizeStorageThroughputReference).filter(function(row) {
      return row.marker || row.reference || row.reason;
    });

    return [
      '<table class="compute-recommendation-references-table">',
      '  <thead><tr><th>Marker</th><th>Reference</th><th>Reason</th></tr></thead>',
      '  <tbody>',
      rows.map(function(row) {
        return '<tr><td>' + storageThroughputEscapeHtml(row.marker) + '</td><td>' + storageThroughputEscapeHtml(row.reference) + '</td><td>' + storageThroughputEscapeHtml(row.reason) + '</td></tr>';
      }).join(""),
      '  </tbody>',
      '</table>'
    ].join("");
  }

  function normalizeStorageThroughputAction(action) {
    if (action && typeof action === "object") {
      return {
        action: String(action.action || action.label || "Review Storage Throughput plan"),
        reason: String(action.reason || action.value || "Engineering review required.")
      };
    }

    return {
      action: String(action || "Review Storage Throughput plan"),
      reason: "Validate this action against the selected storage path before continuing downstream."
    };
  }

  function renderStorageThroughputRecommendedActions(actions) {
    const rows = (actions || []).map(normalizeStorageThroughputAction).map(function(item) {
      return '<div class="compute-recommended-action" data-export-text="true" data-storage-throughput-action-export-row="0705"><strong>' + storageThroughputEscapeHtml(item.action) + '</strong> <span>' + storageThroughputEscapeHtml(item.reason) + '</span></div>';
    });

    return '<div class="compute-recommended-actions-list">' + (rows.length ? rows.join("") : '<div class="compute-recommended-action" data-export-text="true" data-storage-throughput-action-export-row="0705"><strong>No corrective actions generated</strong> <span>Run the Storage Throughput calculation again to refresh recommendations.</span></div>') + '</div>';
  }

  function normalizeStorageThroughputDecisionRow(item) {
    if (item && typeof item === "object") {
      return {
        group: String(item.group || "Storage Throughput"),
        metric: String(item.metric || item.label || "Metric"),
        value: String(item.value == null ? "" : item.value),
        note: String(item.note || "Carry this value forward into downstream Compute validation.")
      };
    }

    return {
      group: "Storage Throughput",
      metric: "Review",
      value: String(item || ""),
      note: "Carry this value forward into downstream Compute validation."
    };
  }

  function storageThroughputDecisionValueCell(row, status) {
    const value = row && row.value != null ? row.value : "";
    if (row && String(row.metric || "").toLowerCase() === "status") {
      return '<span class="scopedlabs-result-summary-status ' + storageThroughputStatusClass(status) + '">' + storageThroughputEscapeHtml(value) + '</span>';
    }
    return storageThroughputEscapeHtml(value);
  }

  function renderStorageThroughputDecisionSchedule(payload, schedule) {
    payload = payload || {};
    const rowsForSchedule = (schedule || []).map(normalizeStorageThroughputDecisionRow);
    const status = String(payload.status || "REVIEW").toUpperCase();
    const interpretation = String(payload.interpretation || payload.guidance || "Validate the storage throughput plan before continuing downstream.");

    const rows = rowsForSchedule.map(function(row) {
      return '<tr><td>' + storageThroughputEscapeHtml(row.group) + '</td><td>' + storageThroughputEscapeHtml(row.metric) + '</td><td>' + storageThroughputDecisionValueCell(row, status) + '</td><td>' + storageThroughputEscapeHtml(row.note) + '</td></tr>';
    }).join("");

    return [
      '<div class="compute-decision-schedule-status">',
      '  <div><strong>' + storageThroughputEscapeHtml(status) + ' Storage Throughput Decision Schedule</strong><span>' + storageThroughputEscapeHtml(interpretation) + '</span></div>',
      '  <div class="scopedlabs-result-summary-status ' + storageThroughputStatusClass(status) + '">' + storageThroughputEscapeHtml(status) + '</div>',
      '</div>',
      '<table class="compute-decision-schedule-table">',
      '  <thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead>',
      '  <tbody>' + rows + '</tbody>',
      '</table>',
      '<p class="compute-decision-schedule-interpretation" data-export-text="true" data-storage-throughput-decision-export-interpretation="0705"><strong>Engineering Interpretation:</strong> ' + storageThroughputEscapeHtml(interpretation) + '</p>'
    ].join("");
  }

  function clearStorageThroughputShellSections() {
    currentStorageThroughputExportResult = null;
    clearStorageThroughputResultSummary();
    if (els.referencesCard) els.referencesCard.hidden = true;
    if (els.references) els.references.innerHTML = "";
    if (els.actionsCard) els.actionsCard.hidden = true;
    if (els.actions) els.actions.innerHTML = "";
    if (els.decisionCard) els.decisionCard.hidden = true;
    if (els.decision) els.decision.innerHTML = "";
  }

  function renderStorageThroughputShellSections(payload) {
    payload = payload || {};

    if (els.references && els.referencesCard) {
      els.references.innerHTML = renderStorageThroughputReferenceTable(payload.references || []);
      els.referencesCard.hidden = false;
      els.referencesCard.removeAttribute("hidden");
    }

    if (els.actions && els.actionsCard) {
      els.actions.innerHTML = renderStorageThroughputRecommendedActions(payload.recommendedActions || []);
      els.actionsCard.hidden = false;
      els.actionsCard.removeAttribute("hidden");
    }

    if (els.decision && els.decisionCard) {
      els.decision.innerHTML = renderStorageThroughputDecisionSchedule(payload, payload.decisionSchedule || []);
      els.decisionCard.hidden = false;
      els.decisionCard.removeAttribute("hidden");
    }
  }


  // storage-throughput-export-payload-0705
  function storageThroughputExportCleanText(value) {
    return String(value == null ? "" : value)
      .replace(/\s+/g, " ")
      .trim();
  }

  function storageThroughputExportFormatMBps(value) {
    const numeric = Number(value || 0);
    if (typeof formatStorageThroughputMBps === "function") {
      return formatStorageThroughputMBps(numeric);
    }
    return Math.round(numeric).toLocaleString() + " MB/s";
  }

  function storageThroughputExportTableFromDom(selector) {
    const table = document.querySelector(selector);
    if (!table) return null;

    const headers = Array.from(table.querySelectorAll("thead th")).map(function(cell) {
      return storageThroughputExportCleanText(cell.textContent);
    });

    const rows = Array.from(table.querySelectorAll("tbody tr")).map(function(row) {
      return Array.from(row.querySelectorAll("th, td")).map(function(cell) {
        return storageThroughputExportCleanText(cell.textContent);
      });
    }).filter(function(row) {
      return row.some(Boolean);
    });

    if (!headers.length && !rows.length) return null;
    return { headers, rows };
  }

  function buildStorageThroughputVisualExportSection() {
    const svg = document.querySelector("#computeStorageThroughputVisual svg");
    if (!svg) return null;

    return {
      title: "Storage Throughput Capacity Envelope",
      description: "Accepted Storage Throughput capacity envelope from the calculated result.",
      compactSvg: true,
      svgs: [svg.outerHTML]
    };
  }

  function buildStorageThroughputReferenceExportSection() {
    const table = storageThroughputExportTableFromDom("#computeStorageThroughputReferences table");
    if (!table) return null;

    return {
      title: "Recommendation References",
      description: "Reference markers used by the Storage Throughput Capacity Envelope.",
      tableClass: "extra-export-table--planner",
      tables: [
        {
          headers: table.headers.length ? table.headers : ["Marker", "Reference", "Reason"],
          rows: table.rows
        }
      ]
    };
  }

  function buildStorageThroughputRecommendedActionsExportSection(result) {
    const actions = Array.isArray(result && result.recommendedActions) ? result.recommendedActions : [];
    let rows = actions.map(function(item) {
      return [
        storageThroughputExportCleanText(item.action || item.label || "Review Storage Throughput plan"),
        storageThroughputExportCleanText(item.reason || item.value || "Validate this action before continuing downstream.")
      ];
    });

    if (!rows.length) {
      rows = Array.from(document.querySelectorAll("#computeStorageThroughputRecommendedActions .compute-recommended-action")).map(function(node) {
        const strong = node.querySelector("strong");
        const span = node.querySelector("span");
        return [
          storageThroughputExportCleanText(strong ? strong.textContent : "Review Storage Throughput plan"),
          storageThroughputExportCleanText(span ? span.textContent : node.textContent)
        ];
      }).filter(function(row) {
        return row.some(Boolean);
      });
    }

    if (!rows.length) return null;

    return {
      title: "Recommended Actions",
      description: "Assistant recommended actions for the current Storage Throughput result.",
      tableClass: "extra-export-table--planner",
      tables: [
        {
          headers: ["Action", "Reason"],
          rows
        }
      ]
    };
  }

  function buildStorageThroughputDecisionScheduleExportSection() {
    const table = storageThroughputExportTableFromDom("#computeStorageThroughputDecisionSchedule table");
    if (!table) return null;

    return {
      title: "Storage Throughput Decision Schedule",
      description: "Decision checkpoints generated from the Storage Throughput result.",
      tableClass: "extra-export-table--planner extra-export-table--decision",
      tables: [
        {
          headers: table.headers.length ? table.headers : ["Group", "Metric", "Value", "Engineering Note"],
          rows: table.rows
        }
      ]
    };
  }

  function buildStorageThroughputExportAnalysisSections(result) {
    result = result || {};

    const required = Math.max(0, Number(result.requiredThroughputMBps || result.finalMBps || 0));
    const available = Math.max(0, Number(result.availableThroughputMBps || 0));
    const utilization = Math.max(0, Number(result.throughputUtilizationPct || result.utilizationPct || 0));
    const headroom = Number(result.headroomMBps || 0);
    const status = String(result.status || "REVIEW").toUpperCase();

    return [
      {
        title: "Status",
        body: status + " - " + (status === "RISK" ? "Required throughput exceeds the entered available storage path ceiling." : "Review the entered storage throughput margin before continuing.")
      },
      {
        title: "Why it matters",
        body: available > 0
          ? "The plan needs " + storageThroughputExportFormatMBps(required) + " against " + storageThroughputExportFormatMBps(available) + " available path throughput, creating a " + Math.round(utilization) + "% utilization condition."
          : "The plan needs " + storageThroughputExportFormatMBps(required) + ", but available path throughput was not entered."
      },
      {
        title: "Primary constraint",
        body: result.dominantConstraint || "Storage Throughput validation."
      },
      {
        title: "Recommended correction",
        body: result.guidance || "Validate transport path, media tier, protocol overhead, transfer window, and available throughput before continuing."
      },
      {
        title: "Carry forward",
        body: "Use " + storageThroughputExportFormatMBps(required) + " required throughput, " + (result.transportPathLabel || "selected transport path") + ", and " + (result.mediaTierLabel || "selected media tier") + " in VM Density validation. Headroom/deficit: " + storageThroughputExportFormatMBps(headroom) + "."
      }
    ];
  }

  function buildStorageThroughputInterpretationExportSection(result) {
    const sections = buildStorageThroughputExportAnalysisSections(result);
    const text = sections.map(function(section) {
      return storageThroughputExportCleanText(section.title) + ": " + storageThroughputExportCleanText(section.body);
    }).join("\n\n");

    if (!text) return null;

    return {
      title: "Engineering Interpretation",
      description: "Concise Storage Throughput interpretation for report review.",
      text
    };
  }

  function storageThroughputFilteredExportOutputs(rows) {
    return (rows || []).filter(function(row) {
      const label = storageThroughputExportCleanText(row && row.label);
      return label && label !== "Chart";
    });
  }

  function resolveStorageThroughputExportResult(result, outputs) {
    const next = Object.assign({}, result || {});
    outputs = outputs || [];

    function outputValue(labels) {
      const wanted = (labels || []).map(function(label) {
        return storageThroughputExportCleanText(label).toLowerCase();
      }).filter(Boolean);

      for (const row of outputs) {
        const label = storageThroughputExportCleanText(row && row.label).toLowerCase();
        if (!label) continue;

        const matched = wanted.some(function(target) {
          return label === target || label.indexOf(target) >= 0;
        });

        if (matched) return storageThroughputExportCleanText(row && row.value);
      }

      return "";
    }

    function numberFromText(value) {
      const raw = String(value == null ? "" : value).replace(/,/g, "");
      const match = raw.match(/-?\d+(?:\.\d+)?/);
      return match ? Number(match[0]) : 0;
    }

    const required = numberFromText(
      next.requiredThroughputMBps ||
      next.finalMBps ||
      outputValue(["Estimated Required Throughput", "Required Throughput"])
    );

    const available = numberFromText(
      next.availableThroughputMBps ||
      outputValue(["Available Path Throughput", "Available Throughput"])
    );

    const utilization = numberFromText(
      next.throughputUtilizationPct ||
      next.utilizationPct ||
      outputValue(["Utilization"])
    );

    if (required > 0) {
      next.requiredThroughputMBps = required;
      next.finalMBps = required;
    }

    if (available > 0) next.availableThroughputMBps = available;
    if (utilization > 0) {
      next.throughputUtilizationPct = utilization;
      next.utilizationPct = utilization;
    }

    next.status = next.status || outputValue(["Status"]) || "REVIEW";
    next.dominantConstraint = next.dominantConstraint || outputValue(["Dominant Constraint"]) || "Storage Throughput validation";

    return next;
  }

  function buildStorageThroughputExportPayload(context) {
    context = context || {};

    const getInputRows = typeof context.getInputRows === "function" ? context.getInputRows : function() { return []; };
    const getResultRows = typeof context.getResultRows === "function" ? context.getResultRows : function() { return []; };
    const options = context.options || {};

    const rawResult = currentStorageThroughputExportResult;
    const inputs = getInputRows();
    const outputs = storageThroughputFilteredExportOutputs(getResultRows());

    if (!rawResult || !outputs.length) return null;

    const result = resolveStorageThroughputExportResult(rawResult, outputs);
    const status = String(result.status || "REVIEW").toUpperCase();
    const required = Number(result.requiredThroughputMBps || result.finalMBps || 0);
    const available = Number(result.availableThroughputMBps || 0);

    const summary = "Storage Throughput requires " + storageThroughputExportFormatMBps(required) + " against " + (available > 0 ? storageThroughputExportFormatMBps(available) : "no entered available path") + ". Overall status: " + status + ".";

    const extraSections = [
      buildStorageThroughputVisualExportSection(),
      buildStorageThroughputReferenceExportSection(),
      buildStorageThroughputRecommendedActionsExportSection(result),
      buildStorageThroughputDecisionScheduleExportSection(),
      buildStorageThroughputInterpretationExportSection(result)
    ].filter(Boolean);

    return {
      status,
      summary,
      interpretation: "",
      analysisSections: [],
      inputs,
      outputs,
      chartImage: "",
      extraSections,
      exportSectionsContract: "storage-throughput-visual-references-actions-schedule",
      assumptions: Array.isArray(options.assumptions) ? options.assumptions : [],
      printLowInkChart: false
    };
  }

  window.ScopedLabsComputeStorageThroughputExport = {
    buildPayload: buildStorageThroughputExportPayload
  };


  // storage-throughput-shell-parity-0705
  function clearStorageThroughputResultSummary() {
    if (els.resultSummary) {
      els.resultSummary.innerHTML = '<div class="muted">Run the calculator to generate the Storage Throughput recommendation.</div>';
    }

    if (els.resultCard) {
      els.resultCard.hidden = true;
      els.resultCard.setAttribute("hidden", "");
    }
  }

  function renderStorageThroughputResultSummary(payload) {
    payload = payload || {};
    if (!els.resultSummary || !els.resultCard) return;

    const status = String(payload.status || "REVIEW").toUpperCase();
    const required = Number(payload.requiredThroughputMBps || payload.finalMBps || 0);
    const available = Number(payload.availableThroughputMBps || 0);
    const utilization = Number(payload.throughputUtilizationPct || payload.utilizationPct || 0);
    const headroom = Number(payload.headroomMBps || 0);
    const constraint = payload.dominantConstraint || "Storage Throughput validation";
    const next = status === "RISK"
      ? "Resolve the throughput bottleneck before continuing to VM Density."
      : "Carry this throughput result into VM Density validation.";

    els.resultSummary.innerHTML = [
      '<div class="scopedlabs-result-summary-grid" data-storage-throughput-result-summary-rendered="0705">',
      '  <div><span class="muted">Status</span><strong class="scopedlabs-result-summary-status ' + storageThroughputStatusClass(status) + '">' + storageThroughputEscapeHtml(status) + '</strong></div>',
      '  <div><span class="muted">Required Throughput</span><strong>' + storageThroughputEscapeHtml(formatStorageThroughputMBps(required)) + '</strong></div>',
      '  <div><span class="muted">Available Path</span><strong>' + storageThroughputEscapeHtml(available > 0 ? formatStorageThroughputMBps(available) : "Not provided") + '</strong></div>',
      '  <div><span class="muted">Utilization</span><strong>' + storageThroughputEscapeHtml(available > 0 ? Math.round(utilization) + "%" : "Not provided") + '</strong></div>',
      '</div>',
      '<p class="muted" style="margin-bottom:0;"><strong>Primary constraint:</strong> ' + storageThroughputEscapeHtml(constraint) + ' <strong>Next:</strong> ' + storageThroughputEscapeHtml(next) + ' Headroom/deficit: ' + storageThroughputEscapeHtml(formatStorageThroughputMBps(headroom)) + '.</p>'
    ].join("");

    els.resultCard.hidden = false;
    els.resultCard.removeAttribute("hidden");
  }

  function calc() {
    const iops = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.iops.value, 0));
    const kb = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.kb.value, 1));
    const readPct = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.readPct.value, 0), 0, 100);
    const writePct = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.writePct.value, 0), 0, 100);
    const overhead = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.overhead.value, 0));
    const availableThroughputMBps = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.availableMBps.value, 0));
    const peakMultiplier = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.peakMultiplier.value, 1));
    const growthPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.growthPct.value, 0));
    const datasetTB = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.datasetTB.value, 0));
    const transferWindowHours = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.transferWindowHours.value, 0.1));
    const transportPath = String(els.transportPath.value || "10g");
    const mediaTier = String(els.mediaTier.value || "sata-ssd");
    const workloadType = String(els.workloadType.value || "vm-datastore");

    const transportPathLabel = storageThroughputTransportLabel(transportPath);
    const mediaTierLabel = storageThroughputMediaLabel(mediaTier);
    const workloadTypeLabel = storageThroughputWorkloadLabel(workloadType);

    const pctTotal = Math.max(readPct + writePct, 1);
    const normalizedReadPct = (readPct / pctTotal) * 100;
    const normalizedWritePct = (writePct / pctTotal) * 100;

    const readIops = iops * (normalizedReadPct / 100);
    const writeIops = iops * (normalizedWritePct / 100);

    const readMBps = (readIops * kb) / 1024;
    const writeMBps = (writeIops * kb) / 1024;
    const baseMBps = readMBps + writeMBps;
    const overheadAdjustedMBps = baseMBps * (1 + overhead / 100);
    const burstAdjustedMBps = overheadAdjustedMBps * peakMultiplier;
    const growthAdjustedMBps = burstAdjustedMBps * (1 + growthPct / 100);

    const transferWindowRequiredMBps = datasetTB > 0
      ? (datasetTB * 1024 * 1024) / (transferWindowHours * 3600)
      : 0;

    const requiredThroughputMBps = Math.max(growthAdjustedMBps, transferWindowRequiredMBps);
    const throughputUtilizationPct = availableThroughputMBps > 0
      ? (requiredThroughputMBps / availableThroughputMBps) * 100
      : 0;

    const headroomMBps = availableThroughputMBps > 0 ? availableThroughputMBps - requiredThroughputMBps : 0;
    const deficitMBps = availableThroughputMBps > 0 ? Math.max(0, requiredThroughputMBps - availableThroughputMBps) : 0;

    const seqBias = Math.min(160, (kb / 128) * 100);
    const utilizationPressure = availableThroughputMBps > 0 ? Math.min(160, throughputUtilizationPct) : Math.min(160, requiredThroughputMBps / 20);
    const windowPressure = requiredThroughputMBps > 0 ? Math.min(160, (transferWindowRequiredMBps / requiredThroughputMBps) * 100) : 0;
    const overheadStress = Math.min(160, overhead * 2.2);

    let status = "GOOD";
    if (availableThroughputMBps <= 0) {
      status = "WATCH";
    } else if (requiredThroughputMBps > availableThroughputMBps) {
      status = "RISK";
    } else if (
      throughputUtilizationPct >= 75 ||
      headroomMBps < Math.max(100, requiredThroughputMBps * 0.25) ||
      transferWindowRequiredMBps >= growthAdjustedMBps * 0.90
    ) {
      status = "WATCH";
    }

    let throughputClass = "Balanced throughput demand";
    if (requiredThroughputMBps > 500) throughputClass = "High throughput demand";
    if (requiredThroughputMBps > 1500) throughputClass = "Extreme throughput demand";

    let workloadPattern = "Mixed / general throughput";
    if (transferWindowRequiredMBps >= growthAdjustedMBps && datasetTB > 0) {
      workloadPattern = "Window-bound bulk transfer";
    } else if (kb >= 128 && requiredThroughputMBps > 300) {
      workloadPattern = "Sequential throughput-heavy";
    } else if (iops > 10000 && kb <= 16) {
      workloadPattern = "Small-block random throughput";
    } else if (transportPath === "cloud-object") {
      workloadPattern = "Cloud/object path sensitive";
    }

    let dominantConstraint = "Balanced storage flow";
    if (availableThroughputMBps > 0 && requiredThroughputMBps > availableThroughputMBps) {
      dominantConstraint = transportPathLabel + " ceiling";
    } else if (transferWindowRequiredMBps >= growthAdjustedMBps && transferWindowRequiredMBps > 0) {
      dominantConstraint = "Transfer window requirement";
    } else if (mediaTier === "hdd" && requiredThroughputMBps > 300) {
      dominantConstraint = "Media tier throughput ceiling";
    } else if (overhead >= 25) {
      dominantConstraint = "Protocol / filesystem overhead";
    } else if (kb >= 128) {
      dominantConstraint = "Large-block transfer profile";
    }

    let crossCheck = "IOPS and throughput appear reasonably aligned";
    if (iopsContext && typeof iopsContext.finalIops === "number") {
      if (iopsContext.finalIops > 20000 && requiredThroughputMBps < 300) {
        crossCheck = "High upstream IOPS with modest MB/s suggests random workload pressure where latency may still matter more than raw throughput.";
      } else if (requiredThroughputMBps > 1000 && iopsContext.finalIops < 5000) {
        crossCheck = "Throughput demand is outrunning IOPS density, which points toward sequential or large-block transfer behavior.";
      } else if (iopsContext.status === "RISK" && status !== "RISK") {
        crossCheck = "Upstream IOPS pressure may still dominate before throughput becomes the first bottleneck.";
      }
    }

    const interpretation = status === "RISK"
      ? "Required throughput exceeds the entered available storage path ceiling. Rework the media tier, transport path, transfer window, burst/growth assumptions, or dataset movement plan before carrying this result forward."
      : status === "WATCH"
        ? "The throughput plan is usable for planning, but reserve is tightening. Validate the available path, transfer window, media tier, and protocol overhead before locking hardware."
        : "Required throughput fits inside the entered available path with usable planning margin. Carry this throughput target forward with the selected transport path and media tier assumptions.";

    const guidance = status === "RISK"
      ? "Increase available path throughput, widen the transfer window, reduce dataset movement, lower overhead, or move to a faster media/transport tier before continuing."
      : status === "WATCH"
        ? "Validate controller path, transport layer, future block-size growth, and transfer-window assumptions before locking hardware."
        : "Maintain throughput reserve above sustained transfer demand and verify the selected path under the expected block size and workload type.";

    const metrics = [
      { label: "Utilization Pressure", value: utilizationPressure, displayValue: Math.round(utilizationPressure) + "%" },
      { label: "Transfer Window Pressure", value: windowPressure, displayValue: Math.round(windowPressure) + "%" },
      { label: "Sequential Bias", value: seqBias, displayValue: Math.round(seqBias) + "%" },
      { label: "Overhead Stress", value: overheadStress, displayValue: Math.round(overheadStress) + "%" }
    ];

    const summaryRows = [
      { label: "Read Throughput", value: formatStorageThroughputMBps(readMBps) },
      { label: "Write Throughput", value: formatStorageThroughputMBps(writeMBps) },
      { label: "Base Throughput", value: formatStorageThroughputMBps(baseMBps) },
      { label: "Burst / Growth Required", value: formatStorageThroughputMBps(growthAdjustedMBps) },
      { label: "Transfer Window Required", value: formatStorageThroughputMBps(transferWindowRequiredMBps) },
      { label: "Estimated Required Throughput", value: formatStorageThroughputMBps(requiredThroughputMBps) },
      { label: "Available Path Throughput", value: availableThroughputMBps > 0 ? formatStorageThroughputMBps(availableThroughputMBps) : "Not provided" },
      { label: "Headroom / Deficit", value: availableThroughputMBps > 0 ? formatStorageThroughputMBps(headroomMBps) : "Not provided" },
      { label: "Utilization", value: availableThroughputMBps > 0 ? throughputUtilizationPct.toFixed(0) + "%" : "Not provided" }
    ];

    const derivedRows = [
      { label: "Throughput Class", value: throughputClass },
      { label: "Workload Pattern", value: workloadPattern },
      { label: "Transport Path", value: transportPathLabel },
      { label: "Media Tier", value: mediaTierLabel },
      { label: "Workload Type", value: workloadTypeLabel },
      { label: "Dominant Constraint", value: dominantConstraint },
      { label: "Cross-Check", value: crossCheck }
    ];


    const references = [
      {
        marker: "*1",
        reference: "Burst / growth demand",
        reason: formatStorageThroughputMBps(growthAdjustedMBps) + " after peak multiplier, protocol overhead, and growth reserve are applied."
      },
      {
        marker: "*2",
        reference: "Required throughput",
        reason: formatStorageThroughputMBps(requiredThroughputMBps) + " required after comparing burst/growth demand against the transfer-window requirement."
      },
      {
        marker: "*3",
        reference: "Available path validation",
        reason: (availableThroughputMBps > 0 ? formatStorageThroughputMBps(availableThroughputMBps) : "No available path entered") + " | " + transportPathLabel + " | " + (availableThroughputMBps > 0 ? "headroom " + formatStorageThroughputMBps(headroomMBps) : "headroom not available") + "."
      }
    ];

    const recommendedActions = [
      {
        action: status === "RISK" ? "Increase available path throughput before continuing" : "Confirm available path throughput before continuing",
        reason: status === "RISK"
          ? formatStorageThroughputMBps(requiredThroughputMBps) + " required throughput is above the entered " + formatStorageThroughputMBps(availableThroughputMBps) + " available path."
          : "Confirm the entered " + formatStorageThroughputMBps(availableThroughputMBps) + " available path against the selected transport, controller, media, and shared-fabric assumptions."
      },
      {
        action: "Validate transfer-window and dataset assumptions",
        reason: "The transfer window requires " + formatStorageThroughputMBps(transferWindowRequiredMBps) + " for " + datasetTB + " TB over " + transferWindowHours + " hours."
      },
      {
        action: "Carry required throughput into VM Density",
        reason: "Use " + formatStorageThroughputMBps(requiredThroughputMBps) + " required throughput, " + transportPathLabel + ", and " + mediaTierLabel + " when validating density and shared platform pressure."
      }
    ];

    const decisionSchedule = [
      { group: "Capacity", metric: "Status", value: status, note: dominantConstraint || "Storage Throughput recommendation status before continuing downstream." },
      { group: "Demand", metric: "Required Throughput", value: formatStorageThroughputMBps(requiredThroughputMBps), note: "Final required throughput after burst, growth, overhead, and transfer-window demand are included." },
      { group: "Capacity", metric: "Available Throughput", value: availableThroughputMBps > 0 ? formatStorageThroughputMBps(availableThroughputMBps) : "Not provided", note: "Entered available storage path ceiling used for the throughput capacity check." },
      { group: "Pressure", metric: "Utilization", value: availableThroughputMBps > 0 ? throughputUtilizationPct.toFixed(0) + "%" : "Not provided", note: "Required throughput as a share of entered available path throughput." },
      { group: "Validation", metric: "Transfer Window", value: datasetTB + " TB / " + transferWindowHours + " hr", note: "Bulk movement window used to validate whether time-bound transfers exceed burst/growth demand." },
      { group: "Validation", metric: "Block Size", value: kb + " KB", note: "I/O block size used for IOPS-to-throughput translation." },
      { group: "Next Step", metric: "Next Tool", value: "VM Density", note: "Validate VM density after storage IOPS and throughput capacity are resolved." }
    ];


    // storage-throughput-planner-routing-0706
    const plannerRouting = {
      branch: "storage",
      toolRole: "storage-throughput",
      routeIntent: status === "RISK" ? "planner-review-before-vm-density" : "continue-to-vm-density",
      nextTool: "vm-density",
      nextHref: "/tools/compute/vm-density/",
      plannerAssistantDecisionNeeded: status === "RISK" || status === "WATCH" || dominantConstraint === "Transfer window requirement",
      decisionBasis: [
        "Status: " + status,
        "Dominant constraint: " + dominantConstraint,
        "Required throughput: " + formatStorageThroughputMBps(requiredThroughputMBps),
        availableThroughputMBps > 0 ? "Available throughput: " + formatStorageThroughputMBps(availableThroughputMBps) : "Available throughput: not provided",
        "Transfer window required: " + formatStorageThroughputMBps(transferWindowRequiredMBps)
      ],
      specialtyBranchCandidates: [
        { tool: "nic-bonding", reason: "Use when the storage path is limited by Ethernet/fabric throughput, shared 10/25/40/100 GbE paths, or network-carried storage traffic." },
        { tool: "backup-window", reason: "Use when dataset size and transfer window dominate required throughput or recovery/backup movement needs proof." },
        { tool: "storage-iops", reason: "Return when upstream random IOPS pressure, block-size assumptions, or latency-sensitive storage behavior need revalidation." },
        { tool: "summary", reason: "Use when storage path is complete and no selected downstream branch requires VM Density or specialty validation." }
      ]
    };


    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows,
      derivedRows,
      status,
      interpretation,
      dominantConstraint,
      guidance
    });

    const flowPayload = {
      finalMBps: requiredThroughputMBps,
      requiredThroughputMBps,
      availableThroughputMBps,
      throughputUtilizationPct,
      utilizationPct: throughputUtilizationPct,
      headroomMBps,
      deficitMBps,
      transferWindowRequiredMBps,
      transferWindowHours,
      datasetTB,
      transportPath,
      transportPathLabel,
      mediaTier,
      mediaTierLabel,
      workloadType,
      workloadTypeLabel,
      throughputClass,
      workloadPattern,
      crossCheck,
      dominantConstraint,
      status,
      blockSizeKb: kb,
      overheadPct: overhead,
      peakMultiplier,
      growthPct,
      readMBps,
      writeMBps,
      baseMBps,
      burstAdjustedMBps,
      growthAdjustedMBps,
      references,
      recommendedActions,
      decisionSchedule,
      plannerRouting,
      plannerAssistantDecisionNeeded: plannerRouting.plannerAssistantDecisionNeeded,
      plannerRouteHint: plannerRouting.routeIntent,
      specialtyBranchCandidates: plannerRouting.specialtyBranchCandidates,
      guidance,
      interpretation,
      upstreamRequiredIops: iopsContext && typeof iopsContext.finalIops === "number" ? iopsContext.finalIops : iops
    };

    currentStorageThroughputExportResult = flowPayload;
    renderStorageThroughputResultSummary(flowPayload);
    renderStorageThroughputCapacityVisual(flowPayload);
    renderStorageThroughputShellSections(flowPayload);

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: flowPayload
    });

    saveComputeLedgerResult({
      label: "Storage Throughput",
      summary: formatStorageThroughputMBps(requiredThroughputMBps) + " required; " + workloadPattern,
      status,
      summaryStatus: status,
      keySavedResult: formatStorageThroughputMBps(requiredThroughputMBps) + " / " + status,
      outputs: flowPayload
    });

    renderStorageThroughputSharedAssistant(flowPayload);


    hasResult = true;
    showContinue();
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.iops.value = 5000;
    els.kb.value = 32;
    els.readPct.value = 70;
    els.writePct.value = 30;
    els.overhead.value = 15;
    els.availableMBps.value = 1000;
    els.peakMultiplier.value = 1.25;
    els.growthPct.value = 20;
    els.datasetTB.value = 2;
    els.transferWindowHours.value = 4;
    els.transportPath.value = "10g";
    els.mediaTier.value = "sata-ssd";
    els.workloadType.value = "vm-datastore";
    invalidate();
  });

  ["iops", "kb", "readPct", "writePct", "overhead", "availableMBps", "peakMultiplier", "growthPct", "datasetTB", "transferWindowHours", "transportPath", "mediaTier", "workloadType"].forEach((id) => {
    const input = $(id);
    if (!input) return;
    input.addEventListener("input", invalidate);
    input.addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/compute/vm-density/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    unlockCategoryPage();
    setTimeout(() => {
      unlockCategoryPage();
    }, 400);

    refreshFlowNote();
    hideContinue();
  });
})();