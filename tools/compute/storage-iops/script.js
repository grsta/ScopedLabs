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

  function clearStorageIopsCapacityVisual() {
      
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
      return '<div class="compute-recommended-action"><strong>' + storageIopsEscapeHtml(item.action) + '</strong><span>' + storageIopsEscapeHtml(item.reason) + '</span></div>';
    });

    return '<div class="compute-recommended-actions-list">' + (rows.length ? rows.join("") : '<div class="compute-recommended-action"><strong>No corrective actions generated</strong><span>Run the Storage IOPS calculation again to refresh recommendations.</span></div>') + '</div>';
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

  function renderStorageIopsDecisionSchedule(payload, schedule) {
    const status = String(payload.status || "REVIEW").toUpperCase();
    const interpretation = String(payload.recommendation || payload.nextStep || "Validate the storage IOPS plan before continuing downstream.");
    const rows = (schedule || []).map(normalizeStorageIopsDecisionRow).map(function(row) {
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
      '<p class="compute-decision-schedule-interpretation"><strong>Engineering Interpretation:</strong> ' + storageIopsEscapeHtml(interpretation) + '</p>'
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
      { label: "Current Status", value: analyzer.status + " - " + primaryConstraint },
      { label: "Validation Trigger", value: availableIops > 0 ? formatPct(utilizationPct) + " of entered platform IOPS consumed." : "Available platform IOPS was not provided." },
      { label: "Next Tool", value: nextStep }
    ];

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
      decisionSchedule
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
        decisionSchedule
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