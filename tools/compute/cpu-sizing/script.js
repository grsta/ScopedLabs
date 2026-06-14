(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "cpu-sizing";
  const LANE = "v1";
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

  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    workload: $("workload"),
    concurrency: $("concurrency"),
    cpuPerWorker: $("cpuPerWorker"),
    peak: $("peak"),
    targetUtil: $("targetUtil"),
    smt: $("smt"),
    results: $("results"),
    flowNote: $("flow-note"),
    workloadContextCard: $("computeWorkloadContextCard"),
    workloadContextTitle: $("computeWorkloadContextTitle"),
    workloadContextCopy: $("computeWorkloadContextCopy"),
    workloadContextMeta: $("computeWorkloadContextMeta"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

  function workloadFactor(workload) {
    if (workload === "web") return 0.9;
    if (workload === "db") return 1.1;
    if (workload === "video") return 1.35;
    if (workload === "compute") return 1.5;
    return 1.0;
  }

  function refreshFlowNote() {
    els.flowNote.hidden = true;
    els.flowNote.innerHTML = "";
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["ram-sizing"]);
      sessionStorage.removeItem(FLOW_KEYS["storage-iops"]);
      sessionStorage.removeItem(FLOW_KEYS["storage-throughput"]);
      sessionStorage.removeItem(FLOW_KEYS["vm-density"]);
      sessionStorage.removeItem(FLOW_KEYS["gpu-vram"]);
      sessionStorage.removeItem(FLOW_KEYS["power-thermal"]);
      sessionStorage.removeItem(FLOW_KEYS["raid-rebuild-time"]);
      sessionStorage.removeItem(FLOW_KEYS["backup-window"]);
    } catch {}

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.invalidate === "function"
    ) {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        flowKey: FLOW_KEYS[STEP],
        category: CATEGORY,
        step: STEP,
        lane: LANE,
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;

      if (els.analysisCopy) {
        els.analysisCopy.style.display = "none";
        els.analysisCopy.innerHTML = "";
      }

      if (chartRef.current) {
        try {
          chartRef.current.destroy();
        } catch {}
        chartRef.current = null;
      }

      if (chartWrapRef.current && chartWrapRef.current.parentNode) {
        chartWrapRef.current.parentNode.removeChild(chartWrapRef.current);
        chartWrapRef.current = null;
      }
    }

    hideContinue();
    refreshFlowNote();

    if (window.ScopedLabsExport && typeof window.ScopedLabsExport.invalidate === "function") {
      window.ScopedLabsExport.invalidate("Inputs changed. Run the calculator again to refresh export.");
    }

    clearComputeAssistant();
    clearComputeCpuVisual();
  }


  function cpuStatusForPlan(status) {
    if (status === "RISK") return "RISK";
    if (status === "WATCH") return "WATCH";
    if (status === "HEALTHY") return "PENDING";
    return "PENDING";
  }
  function cpuContextEscapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function cpuContextTitleCase(value) {
    return String(value || "N/A")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, function (char) { return char.toUpperCase(); }) || "N/A";
  }

  function activeComputeWorkload() {
    if (!State || typeof State.load !== "function" || typeof State.activeWorkload !== "function") return null;

    try {
      return State.activeWorkload(State.load());
    } catch {
      return null;
    }
  }

  function renderWorkloadContext() {
    if (State && typeof State.renderWorkloadDisplay === "function") {
      return State.renderWorkloadDisplay({
        card: els.workloadContextCard,
        title: els.workloadContextTitle,
        description: els.workloadContextCopy,
        meta: els.workloadContextMeta,
        toolLabel: "CPU Sizing"
      });
    }

    const workload = activeComputeWorkload();

    if (!els.workloadContextCard || !els.workloadContextTitle || !els.workloadContextCopy || !els.workloadContextMeta) return null;

    els.workloadContextCard.hidden = false;

    if (!workload) {
      els.workloadContextTitle.textContent = "No active Compute workload selected";
      els.workloadContextCopy.textContent =
        "Open or create a Compute workload before using this tool so the result can be tied to the right workload plan.";
      els.workloadContextMeta.innerHTML = [
        '<div><strong>Workload Source</strong><span>No Workload Planner context detected</span></div>',
        '<div><strong>Result Save</strong><span>Tool result will not be tied to a workload yet.</span></div>'
      ].join("");
      return null;
    }

    els.workloadContextTitle.textContent = workload.name || "Active Compute Workload";
    els.workloadContextCopy.textContent =
      cpuContextTitleCase(workload.environmentType) + " | " +
      cpuContextTitleCase(workload.workloadType) + " | " +
      cpuContextTitleCase(workload.planningPath);

    els.workloadContextMeta.innerHTML = [
      '<div><strong>Environment</strong><span>' + cpuContextEscapeHtml(cpuContextTitleCase(workload.environmentType)) + '</span></div>',
      '<div><strong>Workload Type</strong><span>' + cpuContextEscapeHtml(cpuContextTitleCase(workload.workloadType)) + '</span></div>',
      '<div><strong>Path</strong><span>' + cpuContextEscapeHtml(cpuContextTitleCase(workload.planningPath)) + '</span></div>',
      '<div><strong>Status</strong><span>' + cpuContextEscapeHtml(cpuContextTitleCase(workload.status || workload.summaryStatus || "Planning")) + '</span></div>'
    ].join("");

    return workload;
  }

  function saveCpuResultToWorkload(payload) {
    if (!State || typeof State.recordToolResult !== "function") return null;

    try {
      return State.recordToolResult(STEP, payload);
    } catch {
      return null;
    }
  }


  function clearComputeAssistant() {
    const card = document.getElementById("computeAssistantCard");
    const statusCard = document.getElementById("computeCpuStatusCard");
    const statusText = document.getElementById("computeCpuStatusText");

    const defaults = {
      computeCpuStatusTitle: "Run the CPU sizing calculation",
      computeCpuStatusSubtitle: "The result will show the recommended core baseline, decision status, and downstream Compute action.",
      computeCpuStatusRecommendation: "?",
      computeCpuStatusConfidence: "?",
      computeCpuStatusFlags: "?",
      computeCpuStatusRisk: "?",
      computeCpuStatusAction: "Run the CPU sizing calculation to see the required action."
    };

    Object.keys(defaults).forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = defaults[id];
    });

    if (statusText) {
      statusText.textContent = "PENDING";
      statusText.className = "scopedlabs-result-summary-status is-watch";
    }

    if (statusCard) statusCard.hidden = true;
    if (card) card.hidden = true;
  }

  function cpuDecisionNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function cpuDecisionInputValue(id, fallback) {
    const el = document.getElementById(id);
    return el ? String(el.value || fallback || "") : String(fallback || "");
  }

  function cpuDecisionWorkloadLabel(value) {
    const map = {
      general: "General / Mixed",
      web: "Web / API",
      db: "Database",
      video: "Video / Transcode",
      compute: "Compute-heavy / batch"
    };

    return map[value] || value || "General / Mixed";
  }

  function cpuDecisionStatus(status) {
    const value = String(status || "PENDING").toUpperCase();

    if (value === "RISK") {
      return {
        label: "RISK",
        className: "is-risk",
        confidence: "LOW"
      };
    }

    if (value === "WATCH") {
      return {
        label: "WATCH",
        className: "is-watch",
        confidence: "MEDIUM"
      };
    }

    return {
      label: "GOOD",
      className: "is-good",
      confidence: "HIGH"
    };
  }

  function buildCpuDecisionCore(result) {
    result = result || {};

    const outputs = result.outputs && typeof result.outputs === "object" ? result.outputs : result;
    const inputs = result.inputs && typeof result.inputs === "object" ? result.inputs : {};
    const plannerContext = result.plannerContext || null;

    let activeWorkload = null;

    try {
      activeWorkload = typeof activeComputeWorkload === "function" ? activeComputeWorkload() : null;
    } catch {}

    const hasPlanner = !!(plannerContext || activeWorkload);
    const status = cpuDecisionStatus(result.analyzerStatus || result.status || outputs.status);

    const logical = cpuDecisionNumber(outputs.recommendedLogicalCores, cpuDecisionNumber(result.recommendedLogicalCores, cpuDecisionNumber(result.cores, 0)));
    const physical = cpuDecisionNumber(outputs.recommendedPhysicalCores, cpuDecisionNumber(result.recommendedPhysicalCores, cpuDecisionNumber(result.physicalCores, 0)));
    const effective = cpuDecisionNumber(outputs.effectiveDemandCores, cpuDecisionNumber(result.effectiveDemandCores, cpuDecisionNumber(result.eff, 0)));
    const required = cpuDecisionNumber(outputs.requiredCores, cpuDecisionNumber(result.requiredCores, logical));

    const workloadType = inputs.workloadType || result.workload || (plannerContext && plannerContext.workloadType) || (activeWorkload && activeWorkload.workloadType) || cpuDecisionInputValue("workload", "general");
    const workloadName = (plannerContext && plannerContext.name) || (activeWorkload && activeWorkload.name) || cpuDecisionWorkloadLabel(workloadType);

    const concurrency = inputs.concurrency || result.concurrency || cpuDecisionInputValue("concurrency", "");
    const cpuPerWorker = inputs.cpuPerWorkerPercent || result.cpuPerWorkerPercent || cpuDecisionInputValue("cpuPerWorker", "");
    const peak = inputs.peakFactor || result.peakFactor || cpuDecisionInputValue("peak", "");
    const target = inputs.targetUtilizationPercent || result.targetUtilizationPercent || cpuDecisionInputValue("targetUtil", "");

    const recommendation = logical || physical
      ? logical + " logical cores / " + physical + " physical cores recommended for " + (hasPlanner ? "the active " + workloadName + " workload" : "the current CPU inputs")
      : "CPU recommendation pending";

    const inputSummary = [
      concurrency ? concurrency + " workers" : "",
      cpuPerWorker ? cpuPerWorker + "% per worker" : "",
      peak ? peak + "× burst" : "",
      target ? target + "% target utilization" : ""
    ].filter(Boolean).join(" | ");

    const flags = [
      hasPlanner ? "Planner context active" : "Planner context missing",
      status.label === "WATCH" ? "CPU watch item" : status.label === "RISK" ? "CPU risk item" : "CPU baseline usable",
      "Current CPU inputs applied",
      "RAM sizing next",
      "Downstream validation pending"
    ].join(" | ");

    const risk = status.label === "RISK"
      ? "CPU is likely underbuilt under the current planner context and CPU inputs."
      : status.label === "WATCH"
        ? "CPU margin is tightening under the current concurrency, peak factor, and target utilization."
        : "No immediate CPU sizing risk detected from the active planner context and current CPU inputs.";

    const action = status.label === "RISK"
      ? "Rework the CPU baseline before treating RAM, storage, or specialty branch results as valid."
      : "Carry this CPU result into RAM sizing. Do not treat the Compute plan as complete until RAM and required downstream branches are validated.";

    return {
      title: "CPU SIZING",
      subtitle: recommendation + ". Effective demand is " + effective.toFixed(2) + " cores against " + required.toFixed(2) + " required cores." + (inputSummary ? " Inputs: " + inputSummary + "." : ""),
      statusLabel: status.label,
      statusClass: status.className,
      recommendation,
      confidence: status.confidence,
      flags,
      risk,
      action
    };
  }

  function renderVisibleCpuDecisionStatus(core) {
    const card = document.getElementById("computeAssistantCard");
    const statusCard = document.getElementById("computeCpuStatusCard");

    if (!card || !statusCard || !core) return false;

    const fields = {
      computeCpuStatusTitle: core.title,
      computeCpuStatusSubtitle: core.subtitle,
      computeCpuStatusRecommendation: core.recommendation,
      computeCpuStatusConfidence: core.confidence,
      computeCpuStatusFlags: core.flags,
      computeCpuStatusRisk: core.risk,
      computeCpuStatusAction: core.action
    };

    Object.keys(fields).forEach(function (id) {
      const el = document.getElementById(id);
      if (el) el.textContent = fields[id] || "";
    });

    const statusText = document.getElementById("computeCpuStatusText");
    if (statusText) {
      statusText.textContent = core.statusLabel || "PENDING";
      statusText.className = "scopedlabs-result-summary-status " + (core.statusClass || "watch");
    }

    statusCard.hidden = false;
    card.hidden = false;
    return true;
  }

  function renderComputeAssistant(result) {
    if (!result) return false;

    const core = buildCpuDecisionCore(result);
    return renderVisibleCpuDecisionStatus(core);
  }

  
  function cpuVisualClamp(value, min, max) {
    const num = Number(value);
    if (!Number.isFinite(num)) return min;
    return Math.min(max, Math.max(min, num));
  }

  function cpuVisualStatus(status) {
    const value = String(status || "PENDING").toUpperCase();
    if (value === "RISK") return { label: "RISK", fill: "rgba(248,113,113,.16)", line: "rgba(248,113,113,.82)", text: "rgba(248,113,113,.96)" };
    if (value === "WATCH") return { label: "WATCH", fill: "rgba(250,204,21,.13)", line: "rgba(250,204,21,.78)", text: "rgba(250,204,21,.96)" };
    return { label: "GOOD", fill: "rgba(34,197,94,.13)", line: "rgba(125,255,152,.78)", text: "rgba(125,255,152,.96)" };
  }

  function buildComputeCpuVisualSvg(result) {
    result = result || {};

    const outputs = result && result.outputs ? result.outputs : {};
    const inputs = result && result.inputs ? result.inputs : {};
    const status = cpuVisualStatus(result && (result.analyzerStatus || result.status));

    const logical = Number(outputs.recommendedLogicalCores || result.recommendedLogicalCores || result.cores || 0);
    const physical = Number(outputs.recommendedPhysicalCores || result.recommendedPhysicalCores || result.physicalCores || 0);
    const effective = Number(outputs.effectiveDemandCores || result.effectiveDemandCores || result.eff || 0);
    const required = Number(outputs.requiredCores || result.requiredCores || logical || 0);
    const constraint = outputs.primaryConstraint || result.primaryConstraint || result.constraint || "CPU capacity";

    const metrics = [
      { label: "Load Pressure", value: Number(outputs.loadPressure || result.loadPressure || 0), note: "scheduler pressure" },
      { label: "Core Demand", value: Number(outputs.coreDemand || result.coreDemand || 0), note: "core density" },
      { label: "Utilization", value: Number(outputs.utilizationTarget || result.utilizationTarget || inputs.targetUtilizationPercent || 0), note: "target ceiling" }
    ];

    const max = Math.max(120, ...metrics.map((item) => cpuVisualClamp(item.value, 0, 180)));
    const barX = 206;
    const barW = 410;
    const rows = metrics.map((item, index) => {
      const y = 156 + (index * 54);
      const value = cpuVisualClamp(item.value, 0, 180);
      const w = Math.max(4, Math.round((value / max) * barW));
      const line = value >= 90 ? "rgba(248,113,113,.82)" : value >= 70 ? "rgba(250,204,21,.82)" : "rgba(125,255,152,.82)";

      return [
        '<text x="64" y="' + (y + 16) + '" fill="rgba(246,255,248,.92)" font-size="12" font-weight="850">' + cpuContextEscapeHtml(item.label) + '</text>',
        '<text x="64" y="' + (y + 34) + '" fill="rgba(203,213,225,.62)" font-size="10.5">' + cpuContextEscapeHtml(item.note) + '</text>',
        '<rect x="' + barX + '" y="' + y + '" width="' + barW + '" height="18" rx="8" fill="rgba(0,0,0,.22)" stroke="rgba(148,163,184,.14)" />',
        '<rect x="' + barX + '" y="' + y + '" width="' + w + '" height="18" rx="8" fill="' + line + '" opacity=".86" />',
        '<text x="' + (barX + barW + 18) + '" y="' + (y + 14) + '" fill="' + line + '" font-size="12" font-weight="900">' + Math.round(value) + '%</text>'
      ].join("");
    }).join("");

    function chip(label, value, x, y, width) {
      return [
        '<rect x="' + x + '" y="' + y + '" width="' + width + '" height="48" rx="9" fill="rgba(0,0,0,.18)" stroke="rgba(120,255,120,.13)" />',
        '<text x="' + (x + 10) + '" y="' + (y + 17) + '" font-size="8.5" fill="rgba(203,213,225,.66)" font-weight="850" letter-spacing=".9">' + cpuContextEscapeHtml(label.toUpperCase()) + '</text>',
        '<text x="' + (x + 10) + '" y="' + (y + 36) + '" font-size="17" fill="rgba(246,255,248,.96)" font-weight="850">' + cpuContextEscapeHtml(value) + '</text>'
      ].join("");
    }

    return [
      '<svg viewBox="0 0 760 356" role="img" aria-label="CPU load profile visual" xmlns="http://www.w3.org/2000/svg">',
      '<defs><pattern id="computeCpuGridV1" width="28" height="28" patternUnits="userSpaceOnUse"><path d="M28 0H0V28" fill="none" stroke="rgba(120,255,120,.055)" stroke-width="1"/></pattern></defs>',
      '<rect x="24" y="24" width="712" height="308" rx="16" fill="rgba(2,8,7,.72)" stroke="rgba(120,255,120,.14)" />',
      '<rect x="36" y="36" width="688" height="284" rx="12" fill="url(#computeCpuGridV1)" stroke="rgba(148,163,184,.10)" />',
      '<text x="54" y="64" fill="rgba(203,213,225,.62)" font-size="10.5" font-weight="850" letter-spacing="1.2">COMPUTE CPU SIZING</text>',
      '<text x="54" y="90" fill="rgba(246,255,248,.96)" font-size="20" font-weight="750">CPU load profile and core recommendation</text>',
      '<rect x="610" y="54" width="88" height="30" rx="9" fill="' + status.fill + '" stroke="' + status.line + '" />',
      '<text x="654" y="74" text-anchor="middle" fill="' + status.text + '" font-size="10.5" font-weight="900">' + status.label + '</text>',
      chip("Logical cores", String(logical || "-"), 54, 108, 150),
      chip("Physical cores", String(physical || "-"), 220, 108, 150),
      chip("Effective demand", (effective ? effective.toFixed(2) : "-") + "c", 386, 108, 150),
      chip("Required", (required ? required.toFixed(2) : "-") + "c", 552, 108, 146),
      rows,
      '<line x1="206" y1="300" x2="616" y2="300" stroke="rgba(148,163,184,.18)" />',
      '<text x="64" y="304" fill="rgba(203,213,225,.62)" font-size="10.5">Primary constraint: ' + cpuContextEscapeHtml(constraint) + '</text>',
      '</svg>'
    ].join("");
  }

  function clearComputeCpuVisual() {
    const card = document.getElementById("computeCpuVisualCard");
    const target = document.getElementById("computeCpuVisual");
    if (target) target.innerHTML = "";
    if (card) card.hidden = true;
  }

  function renderComputeCpuVisual(result) {
    const card = document.getElementById("computeCpuVisualCard");
    const target = document.getElementById("computeCpuVisual");
    if (!card || !target || !result) return false;

    target.innerHTML = buildComputeCpuVisualSvg(result);
    card.hidden = false;
    return true;
  }



  function calculate() {
    const workload = els.workload.value;
    const concurrency = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.concurrency.value, 0));
    const cpuPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.cpuPerWorker.value, 0));
    const peak = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.peak.value, 1));
    const target = ScopedLabsAnalyzer.clamp(
      ScopedLabsAnalyzer.safeNumber(els.targetUtil.value, 70),
      10,
      95
    );
    const smt = els.smt.value;

    const avg = concurrency * (cpuPct / 100);
    const eff = avg * peak * workloadFactor(workload);
    const cores = eff / (target / 100);
    const rec = Math.ceil(cores);
    const physicalRec = smt === "on" ? Math.ceil(rec / 2) : rec;

    const loadPressure = ScopedLabsAnalyzer.clamp((eff / Math.max(rec, 1)) * 100, 0, 180);
    const coreDemand = ScopedLabsAnalyzer.clamp((rec / 32) * 100, 0, 180);
    const utilPressure = ScopedLabsAnalyzer.clamp(target, 0, 180);

    const metrics = [
      {
        label: "Load Pressure",
        value: loadPressure,
        displayValue: `${Math.round(loadPressure)}%`
      },
      {
        label: "Core Demand",
        value: coreDemand,
        displayValue: `${Math.round(coreDemand)}%`
      },
      {
        label: "Utilization",
        value: utilPressure,
        displayValue: `${Math.round(utilPressure)}%`
      }
    ];

    const compositeScore = Math.round(
      (loadPressure * 0.35) +
      (Math.min(coreDemand, 100) * 0.30) +
      (utilPressure * 0.35)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let dominantConstraint = "Balanced CPU profile";

    if (analyzer.dominant.label === "Load Pressure") {
      dominantConstraint = "Burst / scheduling pressure";
    } else if (analyzer.dominant.label === "Core Demand") {
      dominantConstraint = "Core count density";
    } else if (analyzer.dominant.label === "Utilization") {
      dominantConstraint = "Utilization ceiling";
    }

    let interpretation = "";

    if (analyzer.status === "RISK") {
      interpretation =
        "CPU sizing is being pushed too close to the edge. The workload is likely to hit scheduling pressure, burst contention, or reduced responsiveness before downstream memory and storage layers can be evaluated cleanly.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "CPU sizing is serviceable but tightening. As concurrency rises or burst conditions widen, scheduler pressure and per-core contention will begin reducing the safety margin for later expansion.";
    } else {
      interpretation =
        "CPU sizing is inside a workable operating envelope. Thread demand, burst factor, and utilization target leave room for normal scheduling overhead without making the processor the first scaling limit.";
    }

    let guidance = "";

    if (analyzer.status === "HEALTHY") {
      guidance =
        "You have usable headroom. The next failure point is more likely to appear in memory density, storage latency, or workload imbalance before raw CPU exhaustion becomes the dominant issue.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Watch what fails first: burst handling, sustained queue depth, or poor thread placement across logical cores. This is the point where future growth can force a jump to the next CPU class sooner than expected.";
    } else {
      guidance =
        `Rework the compute baseline before continuing. The primary limiter is ${dominantConstraint.toLowerCase()}, so expansion will become difficult here first. Reduce concurrency, lower per-worker CPU demand, or step up core count and processor tier.`;
    }

    const summaryRows = [
      { label: "Effective Demand", value: `${eff.toFixed(2)} cores` },
      { label: "Required Cores", value: `${cores.toFixed(2)}` },
      { label: "Recommended Logical Cores", value: `${rec} cores` },
      { label: "Recommended Physical Cores", value: `${physicalRec} cores` }
    ];

    const derivedRows = [
      { label: "Primary Constraint", value: dominantConstraint },
      { label: "Workload Type", value: workload },
      { label: "SMT Mode", value: smt === "on" ? "Logical cores counted" : "Physical cores only" }
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
        referenceValue: 65,
        healthyMax: 65,
        watchMax: 85,
        axisTitle: "CPU Stress Magnitude",
        referenceLabel: "Healthy Margin Floor",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          120,
          Math.ceil(Math.max(...metrics.map((m) => m.value), 85) * 1.08)
        )
      }
    });

    const cpuWorkloadResult = {
      label: "CPU Sizing",
      title: "CPU Sizing",
      status: cpuStatusForPlan(analyzer.status),
      analyzerStatus: analyzer.status,
      summary: rec + " logical cores / " + physicalRec + " physical cores recommended",
      keySavedResult: "Recommended CPU: " + rec + " logical cores; " + physicalRec + " physical cores; effective demand " + eff.toFixed(2) + " cores",
      inputs: {
        workloadType: workload,
        concurrency: concurrency,
        cpuPerWorkerPercent: cpuPct,
        peakFactor: peak,
        targetUtilizationPercent: target,
        smt: smt
      },
      outputs: {
        effectiveDemandCores: Number(eff.toFixed(2)),
        requiredCores: Number(cores.toFixed(2)),
        recommendedLogicalCores: rec,
        recommendedPhysicalCores: physicalRec,
        loadPressure: Number(loadPressure.toFixed(1)),
        coreDemand: Number(coreDemand.toFixed(1)),
        utilizationTarget: Number(target.toFixed(1)),
        primaryConstraint: dominantConstraint
      },
      updatedAt: new Date().toISOString()
    };


    const activeWorkloadForResult = activeComputeWorkload();
    const cpuPipelineResult = {
      ...cpuWorkloadResult,
      cores: rec,
      physicalCores: physicalRec,
      eff,
      requiredCores: Number(cores.toFixed(2)),
      workload,
      status: analyzer.status,
      planStatus: cpuStatusForPlan(analyzer.status),
      primaryConstraint: dominantConstraint,
      loadPressure: Number(loadPressure.toFixed(1)),
      coreDemand: Number(coreDemand.toFixed(1)),
      utilizationTarget: Number(target.toFixed(1)),
      plannerContext: activeWorkloadForResult ? {
        id: activeWorkloadForResult.id || "",
        name: activeWorkloadForResult.name || "",
        environmentType: activeWorkloadForResult.environmentType || "",
        workloadType: activeWorkloadForResult.workloadType || "",
        planningPath: activeWorkloadForResult.planningPath || "",
        status: activeWorkloadForResult.status || activeWorkloadForResult.summaryStatus || ""
      } : null
    };

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: cpuPipelineResult
    });

    saveCpuResultToWorkload(cpuPipelineResult);
    renderWorkloadContext();
    renderComputeAssistant(cpuPipelineResult);
    renderComputeCpuVisual(cpuPipelineResult);

    showContinue();

    if (window.ScopedLabsExport && typeof window.ScopedLabsExport.refresh === "function") {
      window.ScopedLabsExport.refresh();
    }
  }

  els.calc.addEventListener("click", calculate);

  els.reset.addEventListener("click", () => {
    els.workload.value = "general";
    els.concurrency.value = 16;
    els.cpuPerWorker.value = 30;
    els.peak.value = "1.25";
    els.targetUtil.value = 70;
    els.smt.value = "on";
    invalidate();
  });

  ["workload", "concurrency", "cpuPerWorker", "peak", "targetUtil", "smt"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
    renderWorkloadContext();
    refreshFlowNote();
    hideContinue();
  });
})();