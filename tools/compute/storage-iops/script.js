(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "storage-iops";
  const LANE = "v1";
  const PREVIOUS_STEP = "ram-sizing";
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
  let ramContext = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };
  let currentStorageIopsExportResult = null;

  const els = {
    tps: $("tps"),
    reads: $("reads"),
    writes: $("writes"),
    penalty: $("penalty"),
    headroom: $("headroom"),
    availableIops: $("availableIops"),
    peakMultiplier: $("peakMultiplier"),
    growthPct: $("growthPct"),
    targetLatency: $("targetLatency"),
    blockSizeKb: $("blockSizeKb"),
    mediaTier: $("mediaTier"),
    workloadPattern: $("workloadPattern"),
    proofStack: $("storageIopsProofStack"),
    proofStackCard: $("storageIopsProofStackCard"),
    resultCard: $("computeStorageIopsResultCard"),
    resultSummary: $("computeStorageIopsResultSummary"),
    visualCard: $("computeStorageIopsVisualCard"),
    visual: $("computeStorageIopsVisual"),
    referencesCard: $("computeStorageIopsReferencesCard"),
    references: $("computeStorageIopsReferences"),
    actionsCard: $("computeStorageIopsRecommendedActionsCard"),
    actions: $("computeStorageIopsRecommendedActions"),
    decisionCard: $("computeStorageIopsDecisionScheduleCard"),
    decision: $("computeStorageIopsDecisionSchedule"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.continue) els.continue.disabled = false;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continue) els.continue.disabled = true;
  }

  function refreshFlowNote() {
    /*
      compute-storage-iops-hide-visible-flow-context-0704

      Upstream RAM context must stay available to calculations, ledger payloads,
      export, snapshot, and downstream routing. It should not render as a visible
      generated carryover/debug block on the tool page. The active workload card,
      assistant output, export payload, and ledger are the visible/report owners.
    */
    if (!els.flowNote) return;

    els.flowNote.hidden = true;
    els.flowNote.setAttribute("hidden", "");
    els.flowNote.setAttribute("aria-hidden", "true");
    els.flowNote.setAttribute("data-compute-flow-context-hidden", "storage-iops-source");
    els.flowNote.style.setProperty("display", "none", "important");
    els.flowNote.style.setProperty("visibility", "hidden", "important");
    els.flowNote.innerHTML = "";
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
      sessionStorage.removeItem(FLOW_KEYS["storage-throughput"]);
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
    if (els.proofStack) {
      els.proofStack.hidden = true;
      els.proofStack.innerHTML = "";
    }
    if (els.proofStackCard) els.proofStackCard.hidden = true;
    clearStorageIopsShellSections();
    clearStorageIopsCapacityVisual();
    hideContinue();
    refreshFlowNote();
  }

  // storage-iops-planning-shell-0704
  function formatNumber(value) {
    return Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function formatPct(value) {
    return Number(value || 0).toFixed(0) + "%";
  }

  function mediaTierLabel(value) {
    const labels = {
      hdd: "HDD / archive tier",
      hybrid: "Hybrid / mixed tier",
      ssd: "SSD / general purpose",
      nvme: "NVMe / high-performance tier"
    };
    return labels[value] || "Unspecified media tier";
  }

  function workloadPatternLabel(value) {
    const labels = {
      steady: "Steady application workload",
      bursty: "Burst-heavy / queue spikes",
      "write-heavy": "Write-heavy transactional workload",
      database: "Database / low-latency workload"
    };
    return labels[value] || "Unspecified workload pattern";
  }
    
  // storage-iops-result-summary-card-0704
  function storageIopsStatusClass(status) {
    const value = String(status || "").toUpperCase();
    if (value === "RISK" || value === "BLOCKED") return "risk";
    if (value === "WATCH" || value === "REVIEW") return "watch";
    return "good";
  }

  function clearStorageIopsResultSummary() {
    
    if (window.ScopedLabsComputeShellContract && typeof window.ScopedLabsComputeShellContract.clearComputeResultCard === "function") {
      window.ScopedLabsComputeShellContract.clearComputeResultCard({
        card: els.resultCard,
        mount: els.resultSummary,
        emptyText: "Run the calculator to generate the Storage IOPS recommendation."
      });
      return;
    }
if (els.resultSummary) {
      els.resultSummary.innerHTML = '<div class="muted">Run the calculator to generate the Storage IOPS recommendation.</div>';
    }

    if (els.resultCard) {
      els.resultCard.hidden = true;
      els.resultCard.setAttribute("hidden", "");
    }
  }

  function renderStorageIopsResultSummary(result) {
    if (!els.resultCard || !els.resultSummary || !result) return;

    const rawStatus = String(result.status || result.summaryStatus || "WATCH").toUpperCase();
    const displayStatus = rawStatus === "HEALTHY" ? "GOOD" : rawStatus;
    const chipClass = storageIopsStatusClass(rawStatus);

    const finalIops = Number(result.finalIops || result.requiredIops || 0);
    const availableIops = Number(result.availableIops || 0);
    const utilizationPct = Number(result.utilizationPct || 0);
    const reserveIops = Number(result.reserveIops || 0);

    const primaryConstraint = result.primaryConstraint || result.dominantConstraint || "Storage IOPS validation required.";
    const statusSentence = chipClass === "risk"
      ? "Storage IOPS is beyond the available platform edge. Validate the storage tier before treating downstream throughput, density, or platform checks as valid."
      : chipClass === "watch"
        ? "Storage IOPS is usable for planning, but reserve pressure should be validated before continuing."
        : "Storage IOPS has enough planning margin to continue into Storage Throughput validation.";

    const recommendation = result.recommendation || (
      chipClass === "risk"
        ? "Increase available platform IOPS, reduce write penalty, or reduce burst pressure for the active workload."
        : chipClass === "watch"
          ? "Continue with caution and verify peak windows, reserve margin, and storage tier assumptions."
          : "Continue to Storage Throughput with the current IOPS assumptions."
    );

    const confidence = result.confidence || (
      chipClass === "risk"
        ? "MEDIUM"
        : chipClass === "watch"
          ? "MEDIUM"
          : "HIGH"
    );

    const decisionFlags = [
      "Required " + formatNumber(finalIops) + " IOPS",
      "Available " + formatNumber(availableIops) + " IOPS",
      "Utilization " + formatPct(utilizationPct),
      "Reserve " + formatNumber(reserveIops) + " IOPS"
    ];

    const carryForward = result.nextStep || "Carry this Storage IOPS result into Storage Throughput. Keep RAID Rebuild and Backup Window as Compute-only specialty checks if write pressure or resiliency risk remains.";

    if (
      window.ScopedLabsComputeShellContract &&
      typeof window.ScopedLabsComputeShellContract.renderComputeResultCard === "function"
    ) {
      window.ScopedLabsComputeShellContract.renderComputeResultCard({
        card: els.resultCard,
        mount: els.resultSummary,
        title: "STORAGE IOPS",
        status: displayStatus,
        statusClass: chipClass,
        statusSentence,
        recommendation,
        confidence,
        decisionFlags,
        primaryRisk: primaryConstraint,
        carryForward
      });
    }
  }

  function storageIopsExportCleanText(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim();
  }

  function storageIopsExportTableFromDom(selector) {
    const table = document.querySelector(selector);
    if (!table) return null;

    const headers = Array.from(table.querySelectorAll("thead th"))
      .map(function(cell) {
        return storageIopsExportCleanText(cell.textContent);
      })
      .filter(Boolean);

    const rows = Array.from(table.querySelectorAll("tbody tr"))
      .map(function(row) {
        return Array.from(row.querySelectorAll("th, td")).map(function(cell) {
          return storageIopsExportCleanText(cell.textContent);
        });
      })
      .filter(function(row) {
        return row.some(Boolean);
      });

    if (!rows.length) return null;

    return { headers, rows };
  }

  function storageIopsFilteredExportOutputs(outputs) {
    const blocked = [
      "engineering interpretation",
      "dominant constraint",
      "actionable guidance",
      "recommended action",
      "recommended actions",
      "design guidance",
      "best practices"
    ];

    return (outputs || []).filter(function(row) {
      const label = storageIopsExportCleanText(row && row.label).toLowerCase();
      return !blocked.some(function(token) {
        return label === token || label.indexOf(token) >= 0;
      });
    });
  }

  function buildStorageIopsExportInterpretation(result) {
    result = result || {};

    const rawStatus = String(result.status || "REVIEW").toUpperCase();
    const status = rawStatus === "HEALTHY" ? "GOOD" : rawStatus;
    const finalIops = Math.max(0, Number(result.finalIops || 0));
    const availableIops = Math.max(0, Number(result.availableIops || 0));
    const utilizationPct = Math.max(0, Number(result.utilizationPct || 0));
    const targetLatency = Math.max(0, Number(result.targetLatency || 0));
    const blockSizeKb = Math.max(0, Number(result.blockSizeKb || 0));

    const statusLine = status === "RISK"
      ? "RISK - required IOPS exceeds the entered available platform IOPS."
      : status === "WATCH"
        ? "WATCH - the storage plan is usable for planning, but IOPS margin is narrowing."
        : "GOOD - required IOPS remains inside the entered platform envelope.";

    const whyLine = availableIops > 0
      ? "The plan needs " + formatNumber(finalIops) + " IOPS against " + formatNumber(availableIops) + " available IOPS, creating a " + formatPct(utilizationPct) + " utilization condition."
      : "The plan needs " + formatNumber(finalIops) + " IOPS, but available platform IOPS was not entered.";

    const constraintLine = "Primary constraint: " + (result.primaryConstraint || result.dominantConstraint || "Storage IOPS validation") + ".";

    const correctionLine = "Recommended correction: " + (result.guidance || result.recommendation || "Validate platform IOPS, write penalty, media tier, and latency behavior before continuing.");

    const carryLine = "Carry forward: use " + formatNumber(finalIops) + " required IOPS, " + targetLatency + " ms latency target, and " + blockSizeKb + " KB block size in Storage Throughput validation.";

    return [statusLine, whyLine, constraintLine, correctionLine, carryLine].join(" ");
  }

  function buildStorageIopsExportAnalysisSections(result) {
    result = result || {};

    const finalIops = Math.max(0, Number(result.finalIops || 0));
    const availableIops = Math.max(0, Number(result.availableIops || 0));
    const utilizationPct = Math.max(0, Number(result.utilizationPct || 0));
    const targetLatency = Math.max(0, Number(result.targetLatency || 0));
    const blockSizeKb = Math.max(0, Number(result.blockSizeKb || 0));
    const status = String(result.status || "REVIEW").toUpperCase();

    return [
      {
        title: "Status",
        body: status + " - " + (status === "RISK" ? "Required IOPS exceeds the entered available platform IOPS." : "Review the entered storage IOPS margin before continuing.")
      },
      {
        title: "Why it matters",
        body: availableIops > 0
          ? "The plan needs " + formatNumber(finalIops) + " IOPS against " + formatNumber(availableIops) + " available IOPS, creating a " + formatPct(utilizationPct) + " utilization condition."
          : "The plan needs " + formatNumber(finalIops) + " IOPS, but available platform IOPS was not entered."
      },
      {
        title: "Primary constraint",
        body: result.primaryConstraint || result.dominantConstraint || "Storage IOPS validation."
      },
      {
        title: "Recommended correction",
        body: result.guidance || result.recommendation || "Validate platform IOPS, write penalty, media tier, and latency behavior before continuing."
      },
      {
        title: "Carry forward",
        body: "Use " + formatNumber(finalIops) + " required IOPS, " + targetLatency + " ms latency target, and " + blockSizeKb + " KB block size in Storage Throughput validation."
      }
    ];
  }

  function buildStorageIopsInterpretationExportSection(result) {
    const sections = buildStorageIopsExportAnalysisSections(result);
    const text = sections.map(function(section) {
      return storageIopsExportCleanText(section.title) + ": " + storageIopsExportCleanText(section.body);
    }).join("\n\n");

    if (!text) return null;

    return {
      title: "Engineering Interpretation",
      description: "Concise Storage IOPS interpretation for report review.",
      text
    };
  }

  function buildStorageIopsVisualExportSection() {
    const svg = document.querySelector("#computeStorageIopsVisual svg");
    if (!svg) return null;

    return {
      title: "Storage IOPS Capacity Envelope",
      description: "Accepted Storage IOPS capacity envelope from the calculated result.",
      compactSvg: true,
      svgs: [svg.outerHTML]
    };
  }

  function buildStorageIopsReferenceExportSection() {
    const table = storageIopsExportTableFromDom("#computeStorageIopsReferences table");
    if (!table) return null;

    return {
      title: "Recommendation References",
      description: "Reference markers used by the Storage IOPS Capacity Envelope.",
      tableClass: "extra-export-table--planner",
      tables: [
        {
          headers: table.headers.length ? table.headers : ["Marker", "Reference", "Reason"],
          rows: table.rows
        }
      ]
    };
  }

  function buildStorageIopsRecommendedActionsExportSection(result) {
    const actions = Array.isArray(result && result.recommendedActions) ? result.recommendedActions : [];
    let rows = actions.map(function(item) {
      return [
        storageIopsExportCleanText(item.action || item.label || "Review Storage IOPS plan"),
        storageIopsExportCleanText(item.reason || item.value || "Validate this action before continuing downstream.")
      ];
    });

    if (!rows.length) {
      rows = Array.from(document.querySelectorAll("#computeStorageIopsRecommendedActions .compute-recommended-action")).map(function(node) {
        return [
          storageIopsExportCleanText(node.querySelector("strong")?.textContent || "Review Storage IOPS plan"),
          storageIopsExportCleanText(node.querySelector("span")?.textContent || node.textContent || "")
        ];
      }).filter(function(row) {
        return row.some(Boolean);
      });
    }

    if (!rows.length) return null;

    return {
      title: "Recommended Actions",
      description: "Assistant recommended actions for the current Storage IOPS result.",
      tableClass: "extra-export-table--planner",
      tables: [
        {
          headers: ["Action", "Reason"],
          rows
        }
      ]
    };
  }

  function buildStorageIopsDecisionScheduleExportSection() {
    const table = storageIopsExportTableFromDom("#computeStorageIopsDecisionSchedule table");
    if (!table) return null;

    return {
      title: "Storage IOPS Decision Schedule",
      description: "Decision checkpoints generated from the Storage IOPS result.",
      tableClass: "extra-export-table--planner extra-export-table--decision",
      tables: [
        {
          headers: table.headers.length ? table.headers : ["Group", "Metric", "Value", "Engineering Note"],
          rows: table.rows
        }
      ]
    };
  }

  function storageIopsExportNumberFromText(value) {
    const raw = String(value == null ? "" : value).replace(/,/g, "");
    const match = raw.match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

  function storageIopsExportRowValue(rows, labels) {
    const wanted = (labels || []).map(function(label) {
      return storageIopsExportCleanText(label).toLowerCase();
    }).filter(Boolean);

    for (const row of rows || []) {
      const label = storageIopsExportCleanText(row && row.label).toLowerCase();
      if (!label) continue;

      const matched = wanted.some(function(target) {
        return label === target || label.indexOf(target) >= 0;
      });

      if (matched) return storageIopsExportCleanText(row && row.value);
    }

    return "";
  }

  function storageIopsExportDecisionValue(metric) {
    const target = storageIopsExportCleanText(metric).toLowerCase();
    if (!target) return "";

    const rows = Array.from(document.querySelectorAll("#computeStorageIopsDecisionSchedule table tbody tr"));

    for (const row of rows) {
      const cells = Array.from(row.querySelectorAll("th, td")).map(function(cell) {
        return storageIopsExportCleanText(cell.textContent);
      });

      const metricCell = String(cells[1] || "").toLowerCase();
      if (metricCell === target || metricCell.indexOf(target) >= 0) {
        return cells[2] || "";
      }
    }

    return "";
  }

  function storageIopsExportInputValue(id) {
    const el = document.getElementById(id);
    if (!el) return "";
    return storageIopsExportCleanText(el.value);
  }

  function resolveStorageIopsExportResult(result, outputs) {
    const next = Object.assign({}, result || {});

    const requiredIops = storageIopsExportNumberFromText(
      next.finalIops ||
      next.requiredIops ||
      storageIopsExportDecisionValue("Required IOPS") ||
      storageIopsExportRowValue(outputs, ["Estimated Required IOPS", "Required IOPS"])
    );

    const availableIops = storageIopsExportNumberFromText(
      next.availableIops ||
      storageIopsExportDecisionValue("Available IOPS") ||
      storageIopsExportRowValue(outputs, ["Available Platform IOPS", "Available IOPS"])
    );

    const utilizationPct = storageIopsExportNumberFromText(
      next.utilizationPct ||
      storageIopsExportDecisionValue("Utilization") ||
      storageIopsExportRowValue(outputs, ["Utilization"])
    );

    const targetLatency = storageIopsExportNumberFromText(
      next.targetLatency ||
      storageIopsExportDecisionValue("Latency Target") ||
      storageIopsExportRowValue(outputs, ["Latency Target"]) ||
      storageIopsExportInputValue("targetLatency")
    );

    const blockSizeKb = storageIopsExportNumberFromText(
      next.blockSizeKb ||
      storageIopsExportDecisionValue("Block Size") ||
      storageIopsExportRowValue(outputs, ["Block Size"]) ||
      storageIopsExportInputValue("blockSizeKb")
    );

    if (requiredIops > 0) {
      next.finalIops = requiredIops;
      next.requiredIops = requiredIops;
    }

    if (availableIops > 0) next.availableIops = availableIops;
    if (utilizationPct > 0) next.utilizationPct = utilizationPct;
    if (targetLatency > 0) next.targetLatency = targetLatency;
    if (blockSizeKb > 0) next.blockSizeKb = blockSizeKb;

    next.primaryConstraint = next.primaryConstraint || next.dominantConstraint || storageIopsExportRowValue(outputs, ["Primary Constraint"]) || "Storage IOPS validation";
    next.status = next.status || storageIopsExportDecisionValue("Status") || storageIopsExportRowValue(outputs, ["Status"]) || "REVIEW";

    return next;
  }

  function buildStorageIopsExportPayload(context) {
    context = context || {};

    const getInputRows = typeof context.getInputRows === "function" ? context.getInputRows : function() { return []; };
    const getResultRows = typeof context.getResultRows === "function" ? context.getResultRows : function() { return []; };
    const options = context.options || {};

    const rawResult = currentStorageIopsExportResult;
    const inputs = getInputRows();
    const outputs = storageIopsFilteredExportOutputs(getResultRows());

    if (!rawResult || !outputs.length) return null;

    const result = resolveStorageIopsExportResult(rawResult, outputs);
    const status = String(result.status || "REVIEW").toUpperCase();
    const summary = "Storage IOPS requires " + formatNumber(result.finalIops || result.requiredIops || 0) + " IOPS against " + formatNumber(result.availableIops || 0) + " available platform IOPS. Overall status: " + status + ".";

    const extraSections = [
      buildStorageIopsVisualExportSection(),
      buildStorageIopsReferenceExportSection(),
      buildStorageIopsRecommendedActionsExportSection(result),
      buildStorageIopsDecisionScheduleExportSection(),
      buildStorageIopsInterpretationExportSection(result)
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
      exportSectionsContract: "storage-iops-visual-references-actions-schedule",
      assumptions: Array.isArray(options.assumptions) ? options.assumptions : [],
      printLowInkChart: false
    };
  }

  window.ScopedLabsComputeStorageIopsExport = {
    buildPayload: buildStorageIopsExportPayload
  };

  function clearStorageIopsCapacityVisual() {

      currentStorageIopsExportResult = null;
      clearStorageIopsResultSummary();
if (els.visual) {
        els.visual.innerHTML = "";
      }

      if (els.visualCard) {
        els.visualCard.hidden = true;
        els.visualCard.setAttribute("hidden", "");
      }
    }

    function renderStorageIopsCapacityVisual(result) {

      currentStorageIopsExportResult = result || null;
      renderStorageIopsResultSummary(result);
if (
        window.ScopedLabsComputeCapacityVisuals &&
        typeof window.ScopedLabsComputeCapacityVisuals.renderStorageIopsCapacityEnvelope === "function"
      ) {
        window.ScopedLabsComputeCapacityVisuals.renderStorageIopsCapacityEnvelope({
          card: els.visualCard,
          mount: els.visual,
          result
        });
      }
    }



  function renderStorageIopsProof(payload) {
    // storage-iops-visible-proof-suppressed-0705
    if (els.proofStack) {
      els.proofStack.innerHTML = "";
      els.proofStack.hidden = true;
      els.proofStack.setAttribute("hidden", "");
      els.proofStack.setAttribute("aria-hidden", "true");
    }

    if (els.proofStackCard) {
      els.proofStackCard.hidden = true;
      els.proofStackCard.setAttribute("hidden", "");
      els.proofStackCard.setAttribute("aria-hidden", "true");
      els.proofStackCard.style.display = "none";
    }

    return false;
  }


  // storage-iops-full-shell-parity-0704
  // storage-iops-ram-reference-flow-0705
  // storage-iops-ram-section-contract-0705
  function storageIopsEscapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function storageIopsStatusClass(status) {
    const value = String(status || "").toUpperCase();
    if (value === "RISK") return "is-risk";
    if (value === "WATCH") return "is-watch";
    if (value === "GOOD" || value === "HEALTHY") return "is-good";
    return "is-review";
  }

  function normalizeStorageIopsReference(ref) {
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

  function renderStorageIopsReferenceTable(refs) {
    const rows = (refs || []).map(normalizeStorageIopsReference).filter(function(row) {
      return row.marker || row.reference || row.reason;
    });

    return [
      '<table class="compute-recommendation-references-table">',
      '  <thead><tr><th>Marker</th><th>Reference</th><th>Reason</th></tr></thead>',
      '  <tbody>',
      rows.map(function(row) {
        return '<tr><td>' + storageIopsEscapeHtml(row.marker) + '</td><td>' + storageIopsEscapeHtml(row.reference) + '</td><td>' + storageIopsEscapeHtml(row.reason) + '</td></tr>';
      }).join(""),
      '  </tbody>',
      '</table>'
    ].join("");
  }

  function normalizeStorageIopsAction(action) {
    if (action && typeof action === "object") {
      return {
        action: String(action.action || action.label || "Review Storage IOPS plan"),
        reason: String(action.reason || action.value || "Engineering review required.")
      };
    }

    const raw = String(action || "");
    return {
      action: raw || "Review Storage IOPS plan",
      reason: "Validate this action against the selected storage tier before continuing downstream."
    };
  }

  function renderStorageIopsRecommendedActions(actions) {
    const rows = (actions || []).map(normalizeStorageIopsAction).map(function(item) {
      return '<div class="compute-recommended-action" data-export-text="true" data-storage-iops-action-export-row="0705"><strong>' + storageIopsEscapeHtml(item.action) + '</strong> <span>' + storageIopsEscapeHtml(item.reason) + '</span></div>';
    });

    return '<div class="compute-recommended-actions-list">' + (rows.length ? rows.join("") : '<div class="compute-recommended-action" data-export-text="true" data-storage-iops-action-export-row="0705"><strong>No corrective actions generated</strong> <span>Run the Storage IOPS calculation again to refresh recommendations.</span></div>') + '</div>';
  }

  function normalizeStorageIopsDecisionRow(item) {
    if (item && typeof item === "object") {
      return {
        group: String(item.group || "Storage IOPS"),
        metric: String(item.metric || item.label || "Metric"),
        value: String(item.value == null ? "" : item.value),
        note: String(item.note || "Carry this value forward into downstream Compute validation.")
      };
    }

    return {
      group: "Storage IOPS",
      metric: "Review",
      value: String(item || ""),
      note: "Carry this value forward into downstream Compute validation."
    };
  }

  function storageIopsDecisionValueCell(row, status) {
    const value = row && row.value != null ? row.value : "";
    if (row && String(row.metric || "").toLowerCase() === "status") {
      return '<span class="scopedlabs-result-summary-status ' + storageIopsStatusClass(status) + '">' + storageIopsEscapeHtml(value) + '</span>';
    }

    return '<strong>' + storageIopsEscapeHtml(value) + '</strong>';
  }

  function storageIopsScheduleStatus(payload, rows) {
    const payloadStatus = String(payload && payload.status ? payload.status : "").toUpperCase();
    if (payloadStatus === "RISK" || payloadStatus === "WATCH" || payloadStatus === "GOOD" || payloadStatus === "HEALTHY") {
      return payloadStatus === "HEALTHY" ? "GOOD" : payloadStatus;
    }

    const statusRow = (rows || []).find(function(row) {
      return String(row.metric || "").toLowerCase() === "status";
    });

    const rowStatus = String(statusRow && statusRow.value ? statusRow.value : "").toUpperCase();
    if (rowStatus === "RISK" || rowStatus === "WATCH" || rowStatus === "GOOD" || rowStatus === "HEALTHY") {
      return rowStatus === "HEALTHY" ? "GOOD" : rowStatus;
    }

    return "REVIEW";
  }

  function suppressStorageIopsAnalyzerInterpretationSource() {
    if (!els.results) return;

    const blockedTitles = [
      "Engineering Interpretation",
      "Dominant Constraint",
      "Actionable Guidance",
      "Recommended Action",
      "Recommended Actions",
      "Design Guidance",
      "Best Practices"
    ];

    const candidates = Array.from(
      els.results.querySelectorAll("h2, h3, h4, strong, b, .h2, .h3, .analysis-title, .result-label, .result-row-label, .label, dt, th")
    );

    candidates.forEach(function(node) {
      const clean = String(node.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
      if (!clean) return;

      const matched = blockedTitles.some(function(title) {
        const t = title.toLowerCase();
        return clean === t || clean.startsWith(t + " ");
      });

      if (!matched) return;

      node.textContent = "Storage IOPS Analyzer Source";
      node.setAttribute("data-storage-iops-export-analysis-source-suppressed", "0705");
    });
  }

  function renderStorageIopsExportInterpretation(payload) {
    if (!els.analysisCopy) return;

    payload = payload || {};

    const rawStatus = String(payload.status || "REVIEW").toUpperCase();
    const status = rawStatus === "HEALTHY" ? "GOOD" : rawStatus;
    const finalIops = Math.max(0, Number(payload.finalIops || 0));
    const availableIops = Math.max(0, Number(payload.availableIops || 0));
    const utilizationPct = Math.max(0, Number(payload.utilizationPct || 0));
    const targetLatency = Math.max(0, Number(payload.targetLatency || 0));
    const blockSizeKb = Math.max(0, Number(payload.blockSizeKb || 0));

    const statusLine = status === "RISK"
      ? "RISK - required IOPS exceeds the entered available platform IOPS."
      : status === "WATCH"
        ? "WATCH - the storage plan is usable for planning, but IOPS margin is narrowing."
        : "GOOD - the required IOPS remains inside the entered platform envelope.";

    const whyLine = availableIops > 0
      ? "The plan needs " + formatNumber(finalIops) + " IOPS against " + formatNumber(availableIops) + " available IOPS, creating a " + formatPct(utilizationPct) + " utilization condition."
      : "The plan needs " + formatNumber(finalIops) + " IOPS, but available platform IOPS was not entered.";

    const primaryLine = (payload.primaryConstraint || payload.dominantConstraint || "Storage IOPS validation") + ". Review write amplification, burst demand, latency target, reserve margin, and selected media tier before treating the plan as ready.";

    const correctionLine = payload.guidance || payload.recommendation || "Validate platform IOPS, write penalty, media tier, and latency behavior before continuing.";

    const carryLine = "Carry " + formatNumber(finalIops) + " required IOPS, " + targetLatency + " ms latency target, and " + blockSizeKb + " KB block size into Storage Throughput validation.";

    els.analysisCopy.innerHTML = [
      '<div class="analysis-card storage-iops-export-interpretation" data-storage-iops-export-interpretation-structured="0705">',
      '<h3>Engineering Interpretation</h3>',
      '<p><strong>Status:</strong> ' + storageIopsEscapeHtml(statusLine) + '</p>',
      '<p><strong>Why it matters:</strong> ' + storageIopsEscapeHtml(whyLine) + '</p>',
      '<p><strong>Primary constraint:</strong> ' + storageIopsEscapeHtml(primaryLine) + '</p>',
      '<p><strong>Recommended correction:</strong> ' + storageIopsEscapeHtml(correctionLine) + '</p>',
      '<p><strong>Carry forward:</strong> ' + storageIopsEscapeHtml(carryLine) + '</p>',
      '</div>'
    ].join("\n");
  }

  function renderStorageIopsDecisionSchedule(payload, schedule) {
    payload = payload || {};
    const rowsForSchedule = (schedule || []).map(normalizeStorageIopsDecisionRow);
    const status = storageIopsScheduleStatus(payload, rowsForSchedule);
    const statusRow = rowsForSchedule.find(function(row) {
      return String(row.metric || "").toLowerCase() === "status";
    });
    const interpretation = String(
      (statusRow && statusRow.note) ||
      payload.recommendation ||
      payload.nextStep ||
      "Validate the storage IOPS plan before continuing downstream."
    );

    const rows = rowsForSchedule.map(function(row) {
      return '<tr><td>' + storageIopsEscapeHtml(row.group) + '</td><td>' + storageIopsEscapeHtml(row.metric) + '</td><td>' + storageIopsDecisionValueCell(row, status) + '</td><td>' + storageIopsEscapeHtml(row.note) + '</td></tr>';
    }).join("");

    return [
      '<div class="compute-decision-schedule-status">',
      '  <div><strong>' + storageIopsEscapeHtml(status) + ' Storage IOPS Decision Schedule</strong><span>' + storageIopsEscapeHtml(interpretation) + '</span></div>',
      '  <div class="scopedlabs-result-summary-status ' + storageIopsStatusClass(status) + '">' + storageIopsEscapeHtml(status) + '</div>',
      '</div>',
      '<table class="compute-decision-schedule-table">',
      '  <thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead>',
      '  <tbody>' + rows + '</tbody>',
      '</table>',
      '<p class="compute-decision-schedule-interpretation" data-export-text="true" data-storage-iops-decision-export-interpretation="0705"><strong>Engineering Interpretation:</strong> ' + storageIopsEscapeHtml(interpretation) + '</p>'
    ].join("");
  }

  function clearStorageIopsShellSections() {
    if (els.referencesCard) els.referencesCard.hidden = true;
    if (els.references) els.references.innerHTML = "";
    if (els.actionsCard) els.actionsCard.hidden = true;
    if (els.actions) els.actions.innerHTML = "";
    if (els.decisionCard) els.decisionCard.hidden = true;
    if (els.decision) els.decision.innerHTML = "";
  }

  function renderStorageIopsShellSections(payload) {
    payload = payload || {};
    const refs = payload.references || [];
    const actions = payload.recommendedActions || [];
    const schedule = payload.decisionSchedule || [];

    if (els.references && els.referencesCard) {
      els.references.innerHTML = renderStorageIopsReferenceTable(refs);
      els.referencesCard.hidden = false;
    }

    if (els.actions && els.actionsCard) {
      els.actions.innerHTML = renderStorageIopsRecommendedActions(actions);
      els.actionsCard.hidden = false;
    }

    if (els.decision && els.decisionCard) {
      els.decision.innerHTML = renderStorageIopsDecisionSchedule(payload, schedule);
      els.decisionCard.hidden = false;
    }
  }

  function calc() {
    const tps = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.tps.value, 0));
    const reads = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.reads.value, 0));
    const writes = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.writes.value, 0));
    const penalty = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.penalty.value, 1));
    const headroomPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.headroom.value, 0));
    const availableIops = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.availableIops.value, 0));
    const peakMultiplier = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.peakMultiplier.value, 1));
    const growthPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.growthPct.value, 0));
    const targetLatency = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.targetLatency.value, 10));
    const blockSizeKb = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.blockSizeKb.value, 8));
    const mediaTier = String(els.mediaTier.value || "ssd");
    const workloadPattern = String(els.workloadPattern.value || "bursty");

    const readIops = tps * reads;
    const baseWriteIops = tps * writes;
    const writeIops = baseWriteIops * penalty;
    const normalDemandIops = readIops + writeIops;
    const peakDemandIops = normalDemandIops * peakMultiplier;
    const reserveIops = peakDemandIops * (headroomPct / 100);
    const growthReserveIops = peakDemandIops * (growthPct / 100);
    const finalIops = peakDemandIops + reserveIops + growthReserveIops;
    const utilizationPct = availableIops > 0 ? (finalIops / availableIops) * 100 : 0;

    const latencySensitivity =
      targetLatency <= 5 ? 86 :
      targetLatency <= 10 ? 62 :
      targetLatency <= 20 ? 42 :
      28;

    const writePenaltyStress = Math.min(160, ((penalty - 1) / 5) * 100 + (writes > reads ? 20 : 0));
    const capacityPressure = availableIops > 0 ? Math.min(180, utilizationPct) : Math.min(160, finalIops / 600);
    const burstExposure = Math.min(160, ((peakMultiplier - 1) * 70) + (headroomPct < 20 ? 18 : 0));
    const latencyPressure = Math.min(160, latencySensitivity + (utilizationPct > 80 ? 18 : 0) + (workloadPattern === "database" ? 12 : 0));

    const metrics = [
      { label: "Capacity Pressure", value: capacityPressure, displayValue: formatPct(capacityPressure) },
      { label: "Write Penalty Stress", value: writePenaltyStress, displayValue: formatPct(writePenaltyStress) },
      { label: "Burst Exposure", value: burstExposure, displayValue: formatPct(burstExposure) },
      { label: "Latency Sensitivity", value: latencyPressure, displayValue: formatPct(latencyPressure) }
    ];

    const compositeScore = Math.round(
      (capacityPressure * 0.45) +
      (writePenaltyStress * 0.22) +
      (burstExposure * 0.18) +
      (latencyPressure * 0.15)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 70,
      watchMax: 90
    });

    let storagePressure = "Balanced";
    if (utilizationPct >= 70) storagePressure = "Tight IOPS margin";
    if (utilizationPct >= 90) storagePressure = "IOPS capacity edge";
    if (!availableIops && finalIops > 50000) storagePressure = "Extreme IOPS demand";

    let dominantConstraint = "Balanced storage profile";
    if (analyzer.dominant.label === "Capacity Pressure") dominantConstraint = "Available platform IOPS";
    else if (analyzer.dominant.label === "Write Penalty Stress") dominantConstraint = "RAID write amplification";
    else if (analyzer.dominant.label === "Burst Exposure") dominantConstraint = "Peak transaction volatility";
    else if (analyzer.dominant.label === "Latency Sensitivity") dominantConstraint = "Latency-sensitive workload behavior";

    let primaryConstraint = "Balanced";
    if (ramContext && typeof ramContext.status === "string" && ramContext.status === "RISK" && analyzer.status !== "RISK") {
      primaryConstraint = "Memory pressure may still dominate";
    } else if (analyzer.status === "RISK") {
      primaryConstraint = "Storage is likely primary bottleneck";
    } else if (analyzer.status === "WATCH") {
      primaryConstraint = "Storage headroom is tightening";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation = "The storage plan is operating near or beyond its practical IOPS envelope. Write amplification, burst demand, latency sensitivity, or available platform IOPS should be corrected before the design is treated as ready.";
    } else if (analyzer.status === "WATCH") {
      interpretation = "The storage plan is workable, but the IOPS margin is narrowing. Growth, burst behavior, and latency expectations should be verified before locking the storage tier.";
    } else {
      interpretation = "The storage requirement remains inside a manageable planning envelope. Current read/write demand, burst factor, growth reserve, and available platform IOPS leave room for normal operating variation.";
    }

    let guidance = "Maintain the selected media tier and verify the platform's published random IOPS behavior under the expected block size and read/write mix.";
    if (analyzer.status === "WATCH") {
      guidance = "Validate controller cache, media tier, queue depth behavior, and future write growth before locking hardware. If this workload is latency-sensitive, use a faster tier or increase platform IOPS margin.";
    }
    if (analyzer.status === "RISK") {
      guidance = "Rework the storage plan before continuing. Reduce write amplification, select faster media, increase available IOPS, or lower the burst/growth assumptions before moving to throughput and VM density planning.";
    }

    const recommendation =
      analyzer.status === "RISK"
        ? "Increase storage performance or reduce the IOPS demand before continuing."
        : analyzer.status === "WATCH"
          ? "Proceed only after validating platform IOPS, write penalty, and latency margin."
          : "Proceed to throughput sizing with the current IOPS plan.";

    const nextStep =
      analyzer.status === "RISK"
        ? "Revise RAID/media/platform capacity, then recalculate before Storage Throughput."
        : "Continue to Storage Throughput and verify bandwidth does not become the next constraint.";

    const summaryRows = [
      { label: "Read IOPS", value: formatNumber(readIops) },
      { label: "Base Write IOPS", value: formatNumber(baseWriteIops) },
      { label: "Write IOPS (penalized)", value: formatNumber(writeIops) },
      { label: "Peak-Adjusted Demand", value: formatNumber(peakDemandIops) },
      { label: "Headroom Reserve", value: formatNumber(reserveIops) + " IOPS" },
      { label: "Growth Reserve", value: formatNumber(growthReserveIops) + " IOPS" },
      { label: "Estimated Required IOPS", value: formatNumber(finalIops) }
    ];

    const derivedRows = [
      { label: "Available Platform IOPS", value: formatNumber(availableIops) },
      { label: "Utilization", value: availableIops > 0 ? formatPct(utilizationPct) : "Not provided" },
      { label: "Storage Pressure", value: storagePressure },
      { label: "Primary Constraint", value: primaryConstraint },
      { label: "RAID Penalty", value: "x" + penalty },
      { label: "Media Tier", value: mediaTierLabel(mediaTier) },
      { label: "Workload Pattern", value: workloadPatternLabel(workloadPattern) }
    ];

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows,
      derivedRows,
      status: analyzer.status,
      interpretation,
      dominantConstraint,
      guidance,
      chart: {
        labels: metrics.map((m) => m.label),
        values: metrics.map((m) => m.value),
        displayValues: metrics.map((m) => m.displayValue),
        referenceValue: 70,
        healthyMax: 70,
        watchMax: 90,
        axisTitle: "Storage IOPS Planning Pressure",
        referenceLabel: "Planning Margin Target",
        healthyLabel: "Good",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(120, Math.ceil(Math.max(...metrics.map((m) => m.value), 90) * 1.08))
      }
    });

    suppressStorageIopsAnalyzerInterpretationSource();

    renderStorageIopsExportInterpretation({
      status: analyzer.status,
      finalIops,
      availableIops,
      utilizationPct,
      targetLatency,
      blockSizeKb,
      primaryConstraint,
      dominantConstraint,
      guidance,
      recommendation,
      nextStep
    });

    const references = [
      {
        marker: "*1",
        reference: "Burst demand",
        reason: formatNumber(peakDemandIops) + " IOPS after read/write demand, RAID penalty, and peak multiplier are applied."
      },
      {
        marker: "*2",
        reference: "Required IOPS",
        reason: formatNumber(finalIops) + " IOPS after headroom reserve and growth reserve are included."
      },
      {
        marker: "*3",
        reference: "Platform / latency validation",
        reason: "Available platform " + formatNumber(availableIops) + " IOPS | " + targetLatency + " ms target | " + blockSizeKb + " KB blocks."
      }
    ];

    const recommendedActions = [
      {
        action: analyzer.status === "RISK" ? "Increase available platform IOPS before continuing" : "Confirm available platform IOPS before continuing",
        reason: analyzer.status === "RISK"
          ? formatNumber(finalIops) + " required IOPS is above the entered " + formatNumber(availableIops) + " available platform IOPS."
          : "Confirm the entered " + formatNumber(availableIops) + " available platform IOPS against the selected storage tier or vendor/platform specification."
      },
      {
        action: "Validate RAID/write penalty assumptions",
        reason: "The write penalty is x" + penalty + "; confirm this matches the intended storage layout before using the result downstream."
      },
      {
        action: "Carry required IOPS into Storage Throughput",
        reason: "Use " + formatNumber(finalIops) + " required IOPS, " + targetLatency + " ms latency target, and " + blockSizeKb + " KB blocks for bandwidth validation."
      }
    ];

    const decisionSchedule = [
      {
        group: "Capacity",
        metric: "Status",
        value: analyzer.status,
        note: primaryConstraint || "Storage IOPS recommendation status before continuing downstream."
      },
      {
        group: "Demand",
        metric: "Required IOPS",
        value: formatNumber(finalIops) + " IOPS",
        note: "Total required IOPS after burst, headroom reserve, and growth reserve are included."
      },
      {
        group: "Capacity",
        metric: "Available IOPS",
        value: availableIops > 0 ? formatNumber(availableIops) + " IOPS" : "Not provided",
        note: "Entered platform capacity used for the IOPS capacity check."
      },
      {
        group: "Pressure",
        metric: "Utilization",
        value: availableIops > 0 ? formatPct(utilizationPct) : "Not provided",
        note: "Required IOPS as a share of entered platform IOPS."
      },
      {
        group: "Validation",
        metric: "Latency Target",
        value: targetLatency + " ms",
        note: "Latency target carried into downstream throughput validation."
      },
      {
        group: "Validation",
        metric: "Block Size",
        value: blockSizeKb + " KB",
        note: "I/O block size used for throughput translation."
      },
      {
        group: "Next Step",
        metric: "Next Tool",
        value: "Storage Throughput",
        note: "Validate bandwidth after IOPS capacity is resolved."
      }
    ];


    // storage-iops-planner-routing-0706
    const plannerRouting = {
      branch: "storage",
      toolRole: "storage-iops",
      routeIntent: String(analyzer.status || "").toUpperCase() === "RISK" ? "planner-review-before-storage-throughput" : "continue-to-storage-throughput",
      nextTool: "storage-throughput",
      nextHref: "/tools/compute/storage-throughput/",
      plannerAssistantDecisionNeeded: ["RISK", "WATCH", "REVIEW"].includes(String(analyzer.status || "").toUpperCase()) || /latency|write|penalty|capacity|platform/i.test(String(primaryConstraint || "")),
      decisionBasis: [
        "Status: " + analyzer.status,
        "Primary constraint: " + (primaryConstraint || "Storage IOPS capacity"),
        "Required IOPS: " + formatNumber(finalIops) + " IOPS",
        availableIops > 0 ? "Available platform IOPS: " + formatNumber(availableIops) + " IOPS" : "Available platform IOPS: not provided",
        "Latency target: " + targetLatency + " ms",
        "Block size: " + blockSizeKb + " KB",
        "RAID/write penalty: x" + penalty
      ],
      specialtyBranchCandidates: [
        { tool: "storage-throughput", reason: "Continue when required IOPS, latency target, block size, and write penalty are ready for bandwidth validation." },
        { tool: "raid-rebuild-time", reason: "Use when RAID/write penalty, degraded-array behavior, rebuild exposure, or drive-group recovery risk needs proof before storage capacity is accepted." },
        { tool: "backup-window", reason: "Use when the Storage IOPS result feeds backup, restore, replication, or data-movement windows that may dominate the design." },
        { tool: "summary", reason: "Use only when the storage path is complete and no downstream throughput, rebuild, backup, or VM-density validation is selected." }
      ]
    };

    renderStorageIopsProof({
      status: analyzer.status,
      finalIops,
      availableIops,
      peakMultiplier,
      growthPct,
      targetLatency,
      recommendation,
      nextStep,
      references
    });

    renderStorageIopsCapacityVisual({
      status: analyzer.status,
      requiredIops: finalIops,
      peakDemandIops,
      reserveIops,
      growthReserveIops,
      availableIops,
      utilizationPct,
      targetLatency,
      blockSizeKb,
      mediaTier: els.mediaTier ? els.mediaTier.value : "",
      workloadPattern: els.workloadPattern ? els.workloadPattern.value : "",
      references
    });

    renderStorageIopsShellSections({
      references,
      recommendedActions,
      decisionSchedule,
      plannerRouting,
      plannerAssistantDecisionNeeded: plannerRouting.plannerAssistantDecisionNeeded,
      plannerRouteHint: plannerRouting.routeIntent,
      specialtyBranchCandidates: plannerRouting.specialtyBranchCandidates
    });

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        readIops,
        writeIops,
        normalDemandIops,
        peakDemandIops,
        reserveIops,
        growthReserveIops,
        finalIops,
        availableIops,
        utilizationPct,
        mediaTier,
        workloadPattern,
        storagePressure,
        primaryConstraint,
        dominantConstraint,
        plannerRouting,
        plannerAssistantDecisionNeeded: plannerRouting.plannerAssistantDecisionNeeded,
        plannerRouteHint: plannerRouting.routeIntent,
        specialtyBranchCandidates: plannerRouting.specialtyBranchCandidates,
        status: analyzer.status
      }
    });

    saveComputeLedgerResult({
      label: "Storage IOPS",
      summary: formatNumber(finalIops) + " required IOPS; " + primaryConstraint,
      status: analyzer.status,
      summaryStatus: analyzer.status,
      keySavedResult: formatNumber(finalIops) + " IOPS / " + analyzer.status,
      planningInputs: {
        transactionsPerSecond: tps,
        readsPerTransaction: reads,
        writesPerTransaction: writes,
        raidWritePenalty: penalty,
        headroomPct,
        availableIops,
        peakMultiplier,
        growthPct,
        targetLatency,
        blockSizeKb,
        mediaTier,
        workloadPattern
      },
      outputs: {
        readIops,
        writeIops,
        normalDemandIops,
        peakDemandIops,
        reserveIops,
        growthReserveIops,
        finalIops,
        availableIops,
        utilizationPct,
        storagePressure,
        primaryConstraint,
        dominantConstraint
      },
      assistantRecommendation: {
        recommendation,
        nextStep,
        references,
        recommendedActions,
        decisionSchedule,
        plannerRouting,
        plannerAssistantDecisionNeeded: plannerRouting.plannerAssistantDecisionNeeded,
        plannerRouteHint: plannerRouting.routeIntent,
        specialtyBranchCandidates: plannerRouting.specialtyBranchCandidates
      }
    });

    hasResult = true;
    showContinue();
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.tps.value = 2000;
    els.reads.value = 2;
    els.writes.value = 1;
    els.penalty.value = "4";
    els.headroom.value = 30;
    els.availableIops.value = 15000;
    els.peakMultiplier.value = 1.3;
    els.growthPct.value = 25;
    els.targetLatency.value = 10;
    els.blockSizeKb.value = 8;
    els.mediaTier.value = "ssd";
    els.workloadPattern.value = "bursty";
    invalidate();
  });

  ["tps", "reads", "writes", "penalty", "headroom", "availableIops", "peakMultiplier", "growthPct", "targetLatency", "blockSizeKb", "mediaTier", "workloadPattern"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/compute/storage-throughput/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    refreshFlowNote();
    hideContinue();
  });
})();