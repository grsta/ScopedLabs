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
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      ramContext = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      ramContext = null;
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      ramContext = null;
      return;
    }

    const data = parsed.data || {};
    ramContext = data;

    const rows = [];
    if (typeof data.ram === "number") rows.push(`Recommended RAM: <strong>${data.ram} GB</strong>`);
    if (typeof data.totalRequired === "number") rows.push(`Estimated Total: <strong>${Number(data.totalRequired).toFixed(1)} GB</strong>`);
    if (typeof data.status === "string") rows.push(`Memory Status: <strong>${data.status}</strong>`);
    if (typeof data.dominantConstraint === "string") rows.push(`Primary Constraint: <strong>${data.dominantConstraint}</strong>`);

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
      This step checks whether storage performance becomes the next practical bottleneck after the memory profile already defined upstream.
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
    function clearStorageIopsCapacityVisual() {
      if (els.visual) {
        els.visual.innerHTML = "";
      }

      if (els.visualCard) {
        els.visualCard.hidden = true;
        els.visualCard.setAttribute("hidden", "");
      }
    }

    function renderStorageIopsCapacityVisual(result) {
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
    if (!els.proofStack) return;

    const rawStatus = String(payload.status || "");
    const chipClass = rawStatus === "HEALTHY" ? "good" : rawStatus.toLowerCase();
    const refs = payload.references || [];

    els.proofStack.hidden = false;
    if (els.proofStackCard) els.proofStackCard.hidden = false;
    els.proofStack.innerHTML = [
      '<div class="storage-iops-proof-grid">',
        '<div class="storage-iops-proof-card">',
          '<div class="storage-iops-proof-label">A / Entered Conditions</div>',
          '<div class="storage-iops-proof-value">',
            formatNumber(payload.finalIops) + ' required IOPS against ' + formatNumber(payload.availableIops) + ' available. ',
            'Burst x' + payload.peakMultiplier.toFixed(1) + ', growth ' + formatPct(payload.growthPct) + ', latency target ' + payload.targetLatency + ' ms.',
          '</div>',
        '</div>',
        '<div class="storage-iops-proof-card">',
          '<div class="storage-iops-proof-label">B / Assistant Recommendation</div>',
          '<div class="storage-iops-proof-value">',
            '<span class="storage-iops-status-chip ' + chipClass + '">' + payload.status + '</span>',
            payload.recommendation,
          '</div>',
        '</div>',
        '<div class="storage-iops-proof-card">',
          '<div class="storage-iops-proof-label">C / Verification Path</div>',
          '<div class="storage-iops-proof-value">' + payload.nextStep + '</div>',
        '</div>',
      '</div>',
      '<ol class="storage-iops-reference-list">',
        refs.map(function(ref) { return '<li>' + ref + '</li>'; }).join(''),
      '</ol>'
    ].join("");
  }


  // storage-iops-full-shell-parity-0704
  function clearStorageIopsShellSections() {
    if (els.referencesCard) els.referencesCard.hidden = true;
    if (els.references) els.references.innerHTML = "";
    if (els.actionsCard) els.actionsCard.hidden = true;
    if (els.actions) els.actions.innerHTML = "";
    if (els.decisionCard) els.decisionCard.hidden = true;
    if (els.decision) els.decision.innerHTML = "";
  }

  function renderStorageIopsShellSections(payload) {
    const refs = payload.references || [];
    const actions = payload.recommendedActions || [];
    const schedule = payload.decisionSchedule || [];

    if (els.references && els.referencesCard) {
      els.references.innerHTML = '<ol class="storage-iops-reference-list">' + refs.map(function(ref) {
        return '<li>' + ref + '</li>';
      }).join('') + '</ol>';
      els.referencesCard.hidden = false;
    }

    if (els.actions && els.actionsCard) {
      els.actions.innerHTML = '<ol class="storage-iops-actions-list">' + actions.map(function(action) {
        return '<li>' + action + '</li>';
      }).join('') + '</ol>';
      els.actionsCard.hidden = false;
    }

    if (els.decision && els.decisionCard) {
      els.decision.innerHTML = schedule.map(function(item) {
        return '<div class="storage-iops-decision-row"><div class="storage-iops-decision-k">' +
          item.label + '</div><div class="storage-iops-decision-v">' + item.value + '</div></div>';
      }).join('');
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
      "*1 Required IOPS includes read demand, penalized write demand, peak multiplier, headroom reserve, and growth reserve.",
      "*2 Utilization compares required IOPS against the entered available platform IOPS; confirm this against the selected storage tier and vendor/platform limits.",
      "*3 Latency-sensitive or burst-heavy workloads need more margin than raw average IOPS suggests."
    ];

    const recommendedActions = [
      analyzer.status === "RISK" ? "Increase available platform IOPS or move to a faster media tier before continuing." : "Confirm the entered available platform IOPS against the storage tier or vendor/platform specification.",
      "Validate the RAID/write penalty assumption against the intended storage layout.",
      "Carry the required IOPS and latency target into Storage Throughput so bandwidth is checked against the same workload."
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