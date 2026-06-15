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
    workloadPattern: $("workloadPattern"),
    growthReserve: $("growthReserve"),
    platformOverhead: $("platformOverhead"),
    osReserve: $("osReserve"),
    coreEfficiency: $("coreEfficiency"),
    sustainedDerate: $("sustainedDerate"),
    failoverMultiplier: $("failoverMultiplier"),
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
    if (value === "RISK") return { label: "RISK", fill: "rgba(206,32,41,.16)", line: "rgba(206,32,41,.82)", text: "rgba(206,32,41,.96)" };
    if (value === "WATCH") return { label: "WATCH", fill: "rgba(250,204,21,.13)", line: "rgba(250,204,21,.78)", text: "rgba(250,204,21,.96)" };
    return { label: "GOOD", fill: "rgba(44,255,155,.13)", line: "rgba(44,255,155,.78)", text: "rgba(44,255,155,.96)" };
  }

    function buildComputeCpuVisualSvg(result) {
    const outputs = result && result.outputs ? result.outputs : {};
    const inputs = result && result.inputs ? result.inputs : {};

    function num(value, fallback) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    function clamp(value, min, max) {
      return Math.max(min, Math.min(max, value));
    }

    function esc(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    const status = String(result && (result.analyzerStatus || result.status) || "WATCH").toUpperCase();
    const statusColor = status === "GOOD" || status === "HEALTHY"
      ? "rgba(44,255,155,.96)"
      : status === "RISK"
        ? "rgba(206,32,41,.96)"
        : "rgba(250,204,21,.96)";
    const statusFill = status === "GOOD" || status === "HEALTHY"
      ? "rgba(44,255,155,.10)"
      : status === "RISK"
        ? "rgba(206,32,41,.12)"
        : "rgba(250,204,21,.10)";
    const statusLine = status === "GOOD" || status === "HEALTHY"
      ? "rgba(44,255,155,.90)"
      : status === "RISK"
        ? "rgba(206,32,41,.92)"
        : "rgba(250,204,21,.90)";
    const statusLabel = status === "HEALTHY" ? "GOOD" : status;

    const currentWorkers = Math.max(1, num(inputs.concurrency || result.concurrency, 16));
    const growthReserve = clamp(num(inputs.growthReservePercent || result.growthReservePercent, 20), 0, 200);
    const failoverMultiplier = clamp(num(inputs.failoverMultiplier || result.failoverMultiplier, 1), 1, 2);

    const growthWorkers = Math.max(currentWorkers, Math.round(currentWorkers * (1 + (growthReserve / 100))));
    const failoverWorkers = Math.max(growthWorkers, Math.round(growthWorkers * failoverMultiplier));

    const currentRequiredCores = Math.max(0, num(outputs.baseDemandCores || result.baseDemandCores, num(outputs.effectiveDemandCores || result.eff, 0)));
    const growthRequiredCores = Math.max(currentRequiredCores, num(outputs.demandAfterGrowthCores || result.demandAfterGrowthCores, currentRequiredCores * (1 + (growthReserve / 100))));
    const failoverRequiredCores = Math.max(growthRequiredCores, num(outputs.effectiveDemandCores || result.effectiveDemandCores || result.eff, growthRequiredCores));

    const recommendedLogicalCores = Math.max(1, num(outputs.recommendedLogicalCores || result.recommendedLogicalCores || result.cores, 1));
    const recommendedPhysicalCores = Math.max(1, num(outputs.recommendedPhysicalCores || result.recommendedPhysicalCores || result.physicalCores, Math.ceil(recommendedLogicalCores / 2)));
    const targetUtilizationPercent = clamp(num(inputs.targetUtilizationPercent || outputs.utilizationTarget || result.utilizationTarget, 70), 10, 95);

    const usableCapacityCores = Math.max(0.1, recommendedLogicalCores * (targetUtilizationPercent / 100));
    const watchThresholdCores = recommendedLogicalCores * 0.70;
    const riskThresholdCores = recommendedLogicalCores * 0.90;

    const width = 760;
    const height = 500;

    const plot = {
      x: 64,
      y: 108,
      w: 642,
      h: 280
    };

    const maxWorkers = Math.max(failoverWorkers, growthWorkers, currentWorkers, 1);
    const maxCores = Math.max(
      failoverRequiredCores,
      recommendedLogicalCores,
      riskThresholdCores,
      usableCapacityCores,
      1
    );

    const xMax = Math.max(4, Math.ceil(maxWorkers / 4) * 4);
    const yMax = Math.max(4, Math.ceil(maxCores / 4) * 4);

    function xScale(workers) {
      return plot.x + (clamp(workers, 0, xMax) / xMax) * plot.w;
    }

    function yScale(cores) {
      return plot.y + plot.h - (clamp(cores, 0, yMax) / yMax) * plot.h;
    }

    const current = {
      x: xScale(currentWorkers),
      y: yScale(currentRequiredCores)
    };

    const growth = {
      x: xScale(growthWorkers),
      y: yScale(growthRequiredCores)
    };

    const failover = {
      x: xScale(failoverWorkers),
      y: yScale(failoverRequiredCores)
    };

    const usableY = yScale(usableCapacityCores);
    const logicalY = yScale(recommendedLogicalCores);
    const watchY = yScale(watchThresholdCores);
    const riskY = yScale(riskThresholdCores);

    const riskZoneY = plot.y;
    const riskZoneH = Math.max(0, riskY - plot.y);

    const watchZoneY = riskY;
    const watchZoneH = Math.max(0, watchY - riskY);

    const goodZoneY = watchY;
    const goodZoneH = Math.max(0, plot.y + plot.h - watchY);

    const curveStartX = plot.x + 18;
    const curveStartY = yScale(Math.max(1, currentRequiredCores * 0.45));

    const curvePath = [
      "M " + curveStartX.toFixed(1) + " " + curveStartY.toFixed(1),
      "Q " + ((curveStartX + current.x) / 2).toFixed(1) + " " + ((curveStartY + current.y) / 2 + 8).toFixed(1) + " " + current.x.toFixed(1) + " " + current.y.toFixed(1),
      "Q " + ((current.x + growth.x) / 2).toFixed(1) + " " + ((current.y + growth.y) / 2 - 10).toFixed(1) + " " + growth.x.toFixed(1) + " " + growth.y.toFixed(1),
      "Q " + ((growth.x + failover.x) / 2).toFixed(1) + " " + ((growth.y + failover.y) / 2 - 10).toFixed(1) + " " + failover.x.toFixed(1) + " " + failover.y.toFixed(1)
    ].join(" ");

    const yTicks = [];
    const yStep = yMax <= 16 ? 2 : 4;
    for (let v = 0; v <= yMax; v += yStep) {
      yTicks.push(v);
    }

    const xTicks = [0, currentWorkers, growthWorkers, failoverWorkers]
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .sort((a, b) => a - b);

    const yGrid = yTicks.map(function (tick) {
      const y = yScale(tick);
      const cls = tick === 0 || tick === yMax ? "grid-major" : "grid";
      return [
        '<path d="M' + plot.x + ' ' + y.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="' + cls + '"/>',
        '<text x="' + (plot.x - 10) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end" class="tick">' + tick + '</text>'
      ].join("");
    }).join("");

    const xGrid = xTicks.map(function (tick) {
      const x = xScale(tick);
      return [
        '<path d="M' + x.toFixed(1) + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="grid"/>',
        '<text x="' + x.toFixed(1) + '" y="' + (plot.y + plot.h + 16) + '" text-anchor="middle" class="tick">' + tick + '</text>'
      ].join("");
    }).join("");

    const currentLabel = currentWorkers + " workers · " + currentRequiredCores.toFixed(1) + " cores";
    const growthLabel = growthWorkers + " workers · " + growthRequiredCores.toFixed(1) + " cores";
    const failoverLabel = failoverWorkers + " workers · " + failoverRequiredCores.toFixed(1) + " cores";

    function markerLabelX(point) {
      return Math.max(plot.x + 44, Math.min(plot.x + plot.w - 50, point.x));
    }

    function markerLabelY(point) {
      return Math.min(plot.y + plot.h - 28, point.y + 18);
    }

    return [
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="100%" role="img" aria-label="CPU Capacity Envelope analytic graph" data-compute-visual="cpu-capacity-envelope">',
      '<defs>',
      '<linearGradient id="computeCpuEnvelopeBg" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0%" stop-color="#07110f"/>',
      '<stop offset="100%" stop-color="#040b09"/>',
      '</linearGradient>',
      '<style>',
      '.bg{fill:url(#computeCpuEnvelopeBg);stroke:rgba(44,255,155,.22);stroke-width:1.2}.frame{fill:none;stroke:rgba(44,255,155,.16);stroke-width:1}.plot-frame{fill:rgba(255,255,255,.01);stroke:rgba(44,255,155,.20);stroke-width:1}.zone-good{fill:rgba(44,255,155,.05)}.zone-watch{fill:rgba(250,204,21,.055)}.zone-risk{fill:rgba(239,68,68,.06)}.grid{fill:none;stroke:rgba(238,246,255,.08);stroke-width:1}.grid-major{fill:none;stroke:rgba(238,246,255,.14);stroke-width:1}.axis{fill:none;stroke:rgba(238,246,255,.42);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}.tick{fill:rgba(203,213,225,.90);font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:700}.axis-label{fill:rgba(203,213,225,.92);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:.5px}.header{fill:#eef6ff;font-family:Inter,Arial,Helvetica,sans-serif;font-size:18px;font-weight:900;letter-spacing:.5px}.subhead{fill:rgba(203,213,225,.86);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:600}.zone-label{font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:800;letter-spacing:.7px}.zone-good-text{fill:rgba(44,255,155,.92)}.zone-watch-text{fill:rgba(250,204,21,.95)}.zone-risk-text{fill:rgba(206,32,41,.95)}.capacity-line{fill:none;stroke:#2cff9b;stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}.watch-line{fill:none;stroke:rgba(250,204,21,.72);stroke-width:1;stroke-dasharray:5 5}.risk-line{fill:none;stroke:rgba(206,32,41,.86);stroke-width:1;stroke-dasharray:5 5}.logical-line{fill:none;stroke:rgba(238,246,255,.34);stroke-width:1.1;stroke-dasharray:6 5}.curve-shadow{fill:none;stroke:rgba(44,255,155,.22);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.curve{fill:none;stroke:#2cff9b;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}.marker-current{fill:#2cff9b;stroke:#04110d;stroke-width:1.2}.marker-growth{fill:#facc15;stroke:#04110d;stroke-width:1.2}.marker-failover{fill:#ef4444;stroke:#04110d;stroke-width:1.2}.marker-ring{fill:none;stroke:rgba(238,246,255,.7);stroke-width:1}.marker-worker{font-family:Inter,Arial,Helvetica,sans-serif;font-size:9.5px;font-weight:850}.marker-core{fill:rgba(203,213,225,.86);font-family:Inter,Arial,Helvetica,sans-serif;font-size:8.8px;font-weight:650}.marker-worker.tone-current{fill:#2cff9b}.marker-worker.tone-growth{fill:#facc15}.marker-worker.tone-failover{fill:#ef4444}.footer-text.tone-current{fill:#2cff9b}.footer-text.tone-growth{fill:#facc15}.footer-text.tone-failover{fill:#ef4444}.ref-line{fill:none;stroke:rgba(238,246,255,.16);stroke-width:1;stroke-dasharray:4 4}.capacity-label{fill:#2cff9b;font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:800}.logical-label{fill:rgba(203,213,225,.82);font-family:Inter,Arial,Helvetica,sans-serif;font-size:9px;font-weight:700}.status-chip{stroke-width:1}.status-text{font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:.7px}.footer-strip{fill:rgba(255,255,255,.015);stroke:rgba(44,255,155,.14);stroke-width:1}.footer-text{fill:rgba(203,213,225,.88);font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:700}',
      '</style>',
      '</defs>',
      '<rect x="14" y="14" width="732" height="472" rx="16" class="bg"/>',
      '<rect x="26" y="26" width="708" height="448" rx="12" class="frame"/>',
      '<text x="38" y="50" class="header">CPU CAPACITY ENVELOPE</text>',
      '<text x="38" y="68" class="subhead">Demand curve vs usable CPU capacity</text>',
      '<rect x="654" y="34" width="68" height="26" rx="8" fill="' + statusFill + '" stroke="' + statusLine + '" class="status-chip"/>',
      '<text x="688" y="51" text-anchor="middle" fill="' + statusColor + '" class="status-text">' + esc(statusLabel) + '</text>',
      '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + plot.h + '" rx="8" class="plot-frame"/>',
      '<rect x="' + plot.x + '" y="' + riskZoneY.toFixed(1) + '" width="' + plot.w + '" height="' + riskZoneH.toFixed(1) + '" class="zone-risk"/>',
      '<rect x="' + plot.x + '" y="' + watchZoneY.toFixed(1) + '" width="' + plot.w + '" height="' + watchZoneH.toFixed(1) + '" class="zone-watch"/>',
      '<rect x="' + plot.x + '" y="' + goodZoneY.toFixed(1) + '" width="' + plot.w + '" height="' + goodZoneH.toFixed(1) + '" class="zone-good"/>',
      yGrid,
      xGrid,
      '<path d="M' + plot.x + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="axis"/>',
      '<path d="M' + plot.x + ' ' + (plot.y + plot.h) + ' H' + (plot.x + plot.w) + '" class="axis"/>',
      '<text x="42" y="101" class="axis-label">cores</text>',
      '<text x="385" y="442" text-anchor="middle" class="axis-label">Concurrent workers / projected load</text>',
      '<path d="M' + plot.x + ' ' + usableY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="capacity-line"/>',
      '<text x="694" y="' + (usableY - 8).toFixed(1) + '" text-anchor="end" class="capacity-label">Usable capacity · ' + usableCapacityCores.toFixed(1) + ' cores</text>',
      '<path d="M' + plot.x + ' ' + logicalY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="logical-line"/>',
      '<text x="694" y="' + (logicalY - 7).toFixed(1) + '" text-anchor="end" class="logical-label">Recommended logical cores · ' + recommendedLogicalCores + '</text>',
      '<path d="M' + plot.x + ' ' + watchY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="watch-line"/>',
      '<path d="M' + plot.x + ' ' + riskY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="risk-line"/>',
      '<path d="' + curvePath + '" class="curve-shadow"/>',
      '<path d="' + curvePath + '" class="curve"/>',
      '<path d="M' + current.x.toFixed(1) + ' ' + current.y.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="ref-line"/>',
      '<path d="M' + growth.x.toFixed(1) + ' ' + growth.y.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="ref-line"/>',
      '<path d="M' + failover.x.toFixed(1) + ' ' + failover.y.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="ref-line"/>',
      '<circle cx="' + current.x.toFixed(1) + '" cy="' + current.y.toFixed(1) + '" r="6.5" class="marker-ring"/>',
      '<circle cx="' + current.x.toFixed(1) + '" cy="' + current.y.toFixed(1) + '" r="4.5" class="marker-current"/>',
      '<text x="' + markerLabelX(current).toFixed(1) + '" y="' + markerLabelY(current).toFixed(1) + '" text-anchor="middle" class="marker-worker tone-current">' + currentWorkers + ' workers</text>',
      '<text x="' + markerLabelX(current).toFixed(1) + '" y="' + (markerLabelY(current) + 12).toFixed(1) + '" text-anchor="middle" class="marker-core">' + currentRequiredCores.toFixed(1) + ' cores</text>',
      '<circle cx="' + growth.x.toFixed(1) + '" cy="' + growth.y.toFixed(1) + '" r="6.5" class="marker-ring"/>',
      '<circle cx="' + growth.x.toFixed(1) + '" cy="' + growth.y.toFixed(1) + '" r="4.5" class="marker-growth"/>',
      '<text x="' + markerLabelX(growth).toFixed(1) + '" y="' + markerLabelY(growth).toFixed(1) + '" text-anchor="middle" class="marker-worker tone-growth">' + growthWorkers + ' workers</text>',
      '<text x="' + markerLabelX(growth).toFixed(1) + '" y="' + (markerLabelY(growth) + 12).toFixed(1) + '" text-anchor="middle" class="marker-core">' + growthRequiredCores.toFixed(1) + ' cores</text>',
      '<circle cx="' + failover.x.toFixed(1) + '" cy="' + failover.y.toFixed(1) + '" r="6.5" class="marker-ring"/>',
      '<circle cx="' + failover.x.toFixed(1) + '" cy="' + failover.y.toFixed(1) + '" r="4.5" class="marker-failover"/>',
      '<text x="' + markerLabelX(failover).toFixed(1) + '" y="' + markerLabelY(failover).toFixed(1) + '" text-anchor="middle" class="marker-worker tone-failover">' + failoverWorkers + ' workers</text>',
      '<text x="' + markerLabelX(failover).toFixed(1) + '" y="' + (markerLabelY(failover) + 12).toFixed(1) + '" text-anchor="middle" class="marker-core">' + failoverRequiredCores.toFixed(1) + ' cores</text>',
      '<text x="72" y="' + (watchY - 7).toFixed(1) + '" class="logical-label">WATCH threshold · ' + watchThresholdCores.toFixed(1) + '</text>',
      '<text x="72" y="' + (riskY - 7).toFixed(1) + '" class="logical-label">RISK threshold · ' + riskThresholdCores.toFixed(1) + '</text>',
      '<rect x="38" y="458" width="684" height="24" rx="7" class="footer-strip"/>',
      '<text x="54" y="473" class="footer-text tone-current">*1 demand basis</text>',
      '<text x="276" y="473" class="footer-text tone-growth">*2 reserve pressure</text>',
      '<text x="520" y="473" class="footer-text tone-failover">*3 downstream validation</text>',
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

  function cpuCapacityClamp(value, min, max, fallback) {
    const num = Number(value);
    const safe = Number.isFinite(num) ? num : fallback;
    return Math.min(max, Math.max(min, safe));
  }

  function cpuWorkloadPatternFactor(pattern) {
    const map = {
      steady: 1,
      businessPeak: 1.1,
      burstHeavy: 1.22,
      scheduledBatch: 1.16,
      sustained247: 1.12
    };

    return map[String(pattern || "steady")] || 1;
  }

  function cpuFactorDisplay(value, digits) {
    const num = Number(value);
    if (!Number.isFinite(num)) return "-";
    return num.toFixed(typeof digits === "number" ? digits : 2).replace(/\.00$/, "");
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

    const workloadPattern = els.workloadPattern ? els.workloadPattern.value : "steady";
    const workloadPatternFactor = cpuWorkloadPatternFactor(workloadPattern);
    const growthReserve = cpuCapacityClamp(ScopedLabsAnalyzer.safeNumber(els.growthReserve && els.growthReserve.value, 20), 0, 200, 20);
    const platformOverhead = cpuCapacityClamp(ScopedLabsAnalyzer.safeNumber(els.platformOverhead && els.platformOverhead.value, 10), 0, 100, 10);
    const osReserve = cpuCapacityClamp(ScopedLabsAnalyzer.safeNumber(els.osReserve && els.osReserve.value, 10), 0, 100, 10);
    const coreEfficiency = cpuCapacityClamp(ScopedLabsAnalyzer.safeNumber(els.coreEfficiency && els.coreEfficiency.value, 90), 35, 110, 90);
    const sustainedDerate = cpuCapacityClamp(ScopedLabsAnalyzer.safeNumber(els.sustainedDerate && els.sustainedDerate.value, 0), 0, 50, 0);
    const failoverMultiplier = cpuCapacityClamp(ScopedLabsAnalyzer.safeNumber(els.failoverMultiplier && els.failoverMultiplier.value, 1), 1, 2, 1);

    const avg = concurrency * (cpuPct / 100);
    const baseDemand = avg * peak * workloadFactor(workload);
    const patternDemand = baseDemand * workloadPatternFactor;
    const growthDemand = patternDemand * (1 + (growthReserve / 100));
    const platformDemand = growthDemand * (1 + (platformOverhead / 100));
    const reserveDemand = platformDemand * (1 + (osReserve / 100));
    const failoverDemand = reserveDemand * failoverMultiplier;
    const coreEfficiencyRatio = coreEfficiency / 100;
    const sustainedRatio = 1 - (sustainedDerate / 100);
    const eff = failoverDemand / Math.max(coreEfficiencyRatio, 0.35) / Math.max(sustainedRatio, 0.5);
    const cores = eff / (target / 100);
    const rec = Math.ceil(cores);
    const physicalRec = smt === "on" ? Math.ceil(rec / 2) : rec;
    const planningReservePressure = ScopedLabsAnalyzer.clamp(
      (growthReserve * 0.28) +
      (platformOverhead * 0.22) +
      (osReserve * 0.18) +
      ((100 - coreEfficiency) * 0.40) +
      (sustainedDerate * 0.30) +
      ((failoverMultiplier - 1) * 100 * 0.55),
      0,
      180
    );

    const loadPressure = ScopedLabsAnalyzer.clamp((eff / Math.max(rec, 1)) * 100, 0, 180);
    const coreDemand = ScopedLabsAnalyzer.clamp((rec / 32) * 100, 0, 180);
    const utilPressure = ScopedLabsAnalyzer.clamp(target, 0, 180);

    const metrics = [
      {
        label: "Load Pressure",
        value: loadPressure,
        displayValue: String(Math.round(loadPressure)) + "%"
      },
      {
        label: "Core Demand",
        value: coreDemand,
        displayValue: String(Math.round(coreDemand)) + "%"
      },
      {
        label: "Utilization",
        value: utilPressure,
        displayValue: String(Math.round(utilPressure)) + "%"
      },
      {
        label: "Planning Reserve",
        value: planningReservePressure,
        displayValue: String(Math.round(planningReservePressure)) + "%"
      }
    ];

    const compositeScore = Math.round(
      (loadPressure * 0.30) +
      (Math.min(coreDemand, 100) * 0.25) +
      (utilPressure * 0.25) +
      (planningReservePressure * 0.20)
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
    } else if (analyzer.dominant.label === "Planning Reserve") {
      dominantConstraint = "Reserve / platform overhead";
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
      { label: "Base CPU Demand", value: baseDemand.toFixed(2) + " cores" },
      { label: "Adjusted Effective Demand", value: eff.toFixed(2) + " cores" },
      { label: "Required Cores", value: cores.toFixed(2) },
      { label: "Recommended Logical Cores", value: String(rec) + " cores" },
      { label: "Recommended Physical Cores", value: String(physicalRec) + " cores" }
    ];

    const derivedRows = [
      { label: "Primary Constraint", value: dominantConstraint },
      { label: "Workload Type", value: workload },
      { label: "Workload Pattern", value: workloadPattern },
      { label: "Growth Reserve", value: String(growthReserve) + "%" },
      { label: "Platform / OS Reserve", value: String(platformOverhead) + "% platform + " + String(osReserve) + "% OS/agents" },
      { label: "Core Efficiency", value: String(coreEfficiency) + "% effective" },
      { label: "Failover Multiplier", value: cpuFactorDisplay(failoverMultiplier, 2) + "x" },
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
        smt: smt,
        workloadPattern: workloadPattern,
        workloadPatternFactor: workloadPatternFactor,
        growthReservePercent: growthReserve,
        platformOverheadPercent: platformOverhead,
        osReservePercent: osReserve,
        coreEfficiencyPercent: coreEfficiency,
        sustainedDeratePercent: sustainedDerate,
        failoverMultiplier: failoverMultiplier
      },
      outputs: {
        baseDemandCores: Number(baseDemand.toFixed(2)),
        demandAfterPatternCores: Number(patternDemand.toFixed(2)),
        demandAfterGrowthCores: Number(growthDemand.toFixed(2)),
        demandAfterPlatformReserveCores: Number(platformDemand.toFixed(2)),
        demandAfterOsReserveCores: Number(reserveDemand.toFixed(2)),
        demandAfterFailoverCores: Number(failoverDemand.toFixed(2)),
        effectiveDemandCores: Number(eff.toFixed(2)),
        requiredCores: Number(cores.toFixed(2)),
        recommendedLogicalCores: rec,
        recommendedPhysicalCores: physicalRec,
        loadPressure: Number(loadPressure.toFixed(1)),
        coreDemand: Number(coreDemand.toFixed(1)),
        utilizationTarget: Number(target.toFixed(1)),
        planningReservePressure: Number(planningReservePressure.toFixed(1)),
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
      planningReservePressure: Number(planningReservePressure.toFixed(1)),
      baseDemandCores: Number(baseDemand.toFixed(2)),
      workloadPattern,
      workloadPatternFactor,
      growthReservePercent: growthReserve,
      platformOverheadPercent: platformOverhead,
      osReservePercent: osReserve,
      coreEfficiencyPercent: coreEfficiency,
      sustainedDeratePercent: sustainedDerate,
      failoverMultiplier,
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
    if (els.workloadPattern) els.workloadPattern.value = "steady";
    if (els.growthReserve) els.growthReserve.value = 20;
    if (els.platformOverhead) els.platformOverhead.value = "10";
    if (els.osReserve) els.osReserve.value = 10;
    if (els.coreEfficiency) els.coreEfficiency.value = 90;
    if (els.sustainedDerate) els.sustainedDerate.value = 0;
    if (els.failoverMultiplier) els.failoverMultiplier.value = "1";
    invalidate();
  });

  ["workload", "concurrency", "cpuPerWorker", "peak", "targetUtil", "smt", "workloadPattern", "growthReserve", "platformOverhead", "osReserve", "coreEfficiency", "sustainedDerate", "failoverMultiplier"].forEach((id) => {
    const input = $(id);
    if (!input) return;
    input.addEventListener("input", invalidate);
    input.addEventListener("change", invalidate);
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
    renderWorkloadContext();
    refreshFlowNote();
    hideContinue();
  });
})();