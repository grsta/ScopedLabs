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
  let currentComputeCpuExportResult = null;

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

  let plannerInputsHydrated = false;

  function workloadFactor(workload) {
    if (workload === "web") return 0.9;
    if (workload === "db") return 1.1;
    if (workload === "virtualization") return 1.15;
    if (workload === "analytics") return 1.25;
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
    if (status === "GOOD" || status === "HEALTHY") return "GOOD";
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


  function normalizeComputeCarryoverWorkloadValue(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const key = raw.toLowerCase().replace(/[_\s/]+/g, "-");
    const map = {
      general: "general",
      mixed: "general",
      web: "web",
      "web-api": "web",
      api: "web",
      db: "db",
      database: "db",
      virtualization: "virtualization",
      virtualized: "virtualization",
      analytics: "analytics",
      "analytics-ml": "analytics",
      ml: "analytics",
      video: "video",
      "video-transcode": "video",
      transcode: "video",
      compute: "compute",
      "compute-heavy": "compute",
      "compute-heavy-batch": "compute",
      batch: "compute"
    };

    const normalized = map[key] || raw;
    if (!els.workload || !els.workload.querySelector('option[value="' + normalized + '"]')) return "";
    return normalized;
  }

  function computeCarryoverPercent(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function normalizeCpuCarryoverPattern(value) {
    const raw = String(value || "").trim();
    if (!raw) return "";

    const key = raw.toLowerCase().replace(/[_\s/]+/g, "-");
    const map = {
      steady: "steady",
      predictable: "steady",
      "steady-predictable": "steady",
      standard: "steady",
      "business-peak": "businessPeak",
      "business-hours": "businessPeak",
      "business-hours-peak": "businessPeak",
      peak: "businessPeak",
      burst: "burstHeavy",
      bursty: "burstHeavy",
      "burst-heavy": "burstHeavy",
      "queue-spikes": "burstHeavy",
      batch: "scheduledBatch",
      "scheduled-batch": "scheduledBatch",
      scheduled: "scheduledBatch",
      sustained: "sustained247",
      "24-7": "sustained247",
      "24/7": "sustained247",
      "sustained-24-7": "sustained247"
    };

    const normalized = map[key] || "";
    if (!normalized || !els.workloadPattern || !els.workloadPattern.querySelector('option[value="' + normalized + '"]')) return "";
    return normalized;
  }

  function hydrateCpuInputsFromPlanner(workload) {
    if (plannerInputsHydrated || !workload) return false;

    let changed = false;

    const carriedWorkload = normalizeComputeCarryoverWorkloadValue(workload.workloadType);
    if (carriedWorkload && els.workload && els.workload.value !== carriedWorkload) {
      els.workload.value = carriedWorkload;
      changed = true;
    }

    const carriedTarget = computeCarryoverPercent(
      workload.targetUtilization != null ? workload.targetUtilization : workload.targetUtilizationPercent,
      null
    );

    if (carriedTarget != null && els.targetUtil) {
      els.targetUtil.value = String(cpuCapacityClamp(carriedTarget, 10, 95, 70));
      changed = true;
    }

    const carriedGrowth = computeCarryoverPercent(
      workload.growthMargin != null ? workload.growthMargin :
        workload.growthMarginPercent != null ? workload.growthMarginPercent :
          workload.growthReserve != null ? workload.growthReserve :
            workload.growthReservePercent,
      null
    );

    if (carriedGrowth != null && els.growthReserve) {
      els.growthReserve.value = String(cpuCapacityClamp(carriedGrowth, 0, 200, 20));
      changed = true;
    }

    const carriedPattern = normalizeCpuCarryoverPattern(
      workload.demandPattern || workload.demandProfile || workload.demand
    );

    if (carriedPattern && els.workloadPattern && els.workloadPattern.value !== carriedPattern) {
      els.workloadPattern.value = carriedPattern;
      changed = true;
    }

    plannerInputsHydrated = true;
    return changed;
  }

  function renderWorkloadContext() {
    const plannerWorkload = activeComputeWorkload();
    hydrateCpuInputsFromPlanner(plannerWorkload);

    if (State && typeof State.renderWorkloadDisplay === "function") {
      return State.renderWorkloadDisplay({
        card: els.workloadContextCard,
        title: els.workloadContextTitle,
        description: els.workloadContextCopy,
        meta: els.workloadContextMeta,
        toolLabel: "CPU Sizing"
      });
    }

    const workload = plannerWorkload;

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
      virtualization: "Virtualization",
      analytics: "Analytics / ML",
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
    const envelopeStatus = cpuEnvelopeStatus(result);
    const status = cpuDecisionStatus(envelopeStatus || result.analyzerStatus || result.status || outputs.status);

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


  function cpuEnvelopeNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function cpuEnvelopeClamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function cpuEnvelopeThresholds(result) {
    if (
      window.ScopedLabsComputeCapacityVisuals &&
      typeof window.ScopedLabsComputeCapacityVisuals.cpuEnvelopeThresholds === "function"
    ) {
      return window.ScopedLabsComputeCapacityVisuals.cpuEnvelopeThresholds(result);
    }

    result = result || {};

    const outputs = result.outputs && typeof result.outputs === "object" ? result.outputs : {};
    const inputs = result.inputs && typeof result.inputs === "object" ? result.inputs : {};

    const recommendedLogicalCores = Math.max(1, cpuEnvelopeNumber(
      outputs.recommendedLogicalCores || result.recommendedLogicalCores || result.cores,
      1
    ));

    const targetUtilizationPercent = cpuEnvelopeClamp(cpuEnvelopeNumber(
      inputs.targetUtilizationPercent || result.targetUtilizationPercent || outputs.utilizationTarget || result.utilizationTarget,
      70
    ), 10, 95);

    const currentDemandCores = Math.max(0, cpuEnvelopeNumber(
      outputs.baseDemandCores || result.baseDemandCores,
      cpuEnvelopeNumber(outputs.effectiveDemandCores || result.effectiveDemandCores || result.eff, 0)
    ));

    const growthDemandCores = Math.max(currentDemandCores, cpuEnvelopeNumber(
      outputs.demandAfterGrowthCores || result.demandAfterGrowthCores,
      currentDemandCores
    ));

    const failoverDemandCores = Math.max(growthDemandCores, cpuEnvelopeNumber(
      outputs.envelopeFinalDemandCores || result.envelopeFinalDemandCores || outputs.effectiveDemandCores || result.effectiveDemandCores || result.eff,
      growthDemandCores
    ));

    const finalDemandCores = Math.max(currentDemandCores, growthDemandCores, failoverDemandCores);
    const usableCapacityCores = Math.max(0.1, cpuEnvelopeNumber(
      outputs.usableCapacityCores || result.usableCapacityCores || outputs.envelopeUsableCapacityCores || result.envelopeUsableCapacityCores,
      recommendedLogicalCores * (targetUtilizationPercent / 100)
    ));
    const watchThresholdCores = usableCapacityCores * 0.70;
    const riskThresholdCores = usableCapacityCores * 0.90;

    let status = "GOOD";

    if (finalDemandCores >= riskThresholdCores) {
      status = "RISK";
    } else if (finalDemandCores >= watchThresholdCores) {
      status = "WATCH";
    }

    return {
      status,
      finalDemandCores,
      currentDemandCores,
      growthDemandCores,
      failoverDemandCores,
      recommendedLogicalCores,
      usableCapacityCores,
      watchThresholdCores,
      riskThresholdCores,
      targetUtilizationPercent,
      statusAuthority: "cpu-capacity-envelope"
    };
  }

  function cpuEnvelopeStatus(result) {
    return cpuEnvelopeThresholds(result).status;
  }

    function buildComputeCpuVisualSvg(result) {
    if (window.ScopedLabsComputeCapacityVisuals && typeof window.ScopedLabsComputeCapacityVisuals.buildCpuCapacityEnvelopeSvg === "function") {
      return window.ScopedLabsComputeCapacityVisuals.buildCpuCapacityEnvelopeSvg(result);
    }

    return "";
  }


  function computeCpuProofNumber(value, fallback) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : Number(fallback || 0);
  }

  function computeCpuProofCores(value, fallback) {
    return computeCpuProofNumber(value, fallback).toFixed(2) + " cores";
  }

  function computeCpuProofEsc(value) {
    return cpuContextEscapeHtml(value);
  }

  function computeCpuProofOutput(result, key, fallback) {
    const outputs = result && result.outputs ? result.outputs : {};
    if (outputs[key] !== undefined && outputs[key] !== null && outputs[key] !== "") return outputs[key];
    if (result && result[key] !== undefined && result[key] !== null && result[key] !== "") return result[key];
    return fallback;
  }

  function computeCpuProofInput(result, key, fallback) {
    const inputs = result && result.inputs ? result.inputs : {};
    if (inputs[key] !== undefined && inputs[key] !== null && inputs[key] !== "") return inputs[key];
    if (result && result[key] !== undefined && result[key] !== null && result[key] !== "") return result[key];
    return fallback;
  }


  function computeCpuMarkerColor(tone, marker) {
    const markerValue = String(marker || "").trim();
    const toneValue = String(tone || "").toLowerCase();

    if (toneValue === "current" || toneValue === "tone-current" || markerValue === "*1") return "#38d9ff";
    if (toneValue === "growth" || toneValue === "tone-growth" || markerValue === "*2") return "#a78bfa";
    if (toneValue === "failover" || toneValue === "tone-failover" || markerValue === "*3") return "#f59e0b";

    return "inherit";
  }

  function computeCpuMarkerToneClass(tone) {
    const clean = String(tone || "current").toLowerCase();
    if (clean.includes("fail") || clean.includes("downstream")) return "tone-failover";
    if (clean.includes("growth") || clean.includes("reserve")) return "tone-growth";
    return "tone-current";
  }

  function computeCpuMarkerHtml(marker, tone) {
    const color = computeCpuMarkerColor(tone, marker);
    return '<span class="compute-cpu-proof-marker ' + computeCpuMarkerToneClass(tone) + '" style="color:' + computeCpuProofEsc(color) + ';font-weight:900;">' + computeCpuProofEsc(marker) + '</span>';
  }

  function buildComputeCpuRecommendationReferences(result) {
    const currentWorkers = computeCpuProofInput(result, "concurrency", computeCpuProofOutput(result, "currentWorkers", ""));
    const growthReserve = computeCpuProofInput(result, "growthReservePercent", "0");
    const platformOverhead = computeCpuProofInput(result, "platformOverheadPercent", "0");
    const osReserve = computeCpuProofInput(result, "osReservePercent", "0");
    const coreEfficiency = computeCpuProofInput(result, "coreEfficiencyPercent", "100");
    const sustainedDerate = computeCpuProofInput(result, "sustainedDeratePercent", "100");
    const failoverMultiplier = computeCpuProofInput(result, "failoverMultiplier", "1");
    const baseDemand = computeCpuProofOutput(result, "baseDemandCores", computeCpuProofOutput(result, "currentRequiredCores", 0));
    const growthDemand = computeCpuProofOutput(result, "demandAfterGrowthCores", computeCpuProofOutput(result, "growthRequiredCores", baseDemand));
    const finalDemand = computeCpuProofOutput(result, "envelopeFinalDemandCores", computeCpuProofOutput(result, "effectiveDemandCores", computeCpuProofOutput(result, "failoverRequiredCores", growthDemand)));
    const watchThreshold = computeCpuProofOutput(result, "envelopeWatchThresholdCores", 0);
    const riskThreshold = computeCpuProofOutput(result, "envelopeRiskThresholdCores", 0);

    return [
      {
        id: "*1",
        label: "Demand basis",
        reason: "Current demand is based on " + currentWorkers + " concurrent workers and lands at " + computeCpuProofCores(baseDemand) + " before growth and reserve pressure.",
        tone: "current"
      },
      {
        id: "*2",
        label: "Reserve pressure",
        reason: "Growth reserve " + growthReserve + "%, platform overhead " + platformOverhead + "%, OS reserve " + osReserve + "%, core efficiency " + coreEfficiency + "%, and sustained derate " + sustainedDerate + "% raise the planning demand to " + computeCpuProofCores(growthDemand) + ".",
        tone: "growth"
      },
      {
        id: "*3",
        label: "Downstream validation",
        reason: "Failover multiplier " + failoverMultiplier + "× pushes final envelope demand to " + computeCpuProofCores(finalDemand) + " against watch " + computeCpuProofCores(watchThreshold) + " and risk " + computeCpuProofCores(riskThreshold) + ". Continue into RAM sizing before treating Compute as complete.",
        tone: "failover"
      }
    ];
  }


  function buildComputeCpuRecommendedActions(result) {
    const outputs = result && result.outputs ? result.outputs : {};
    const inputs = result && result.inputs ? result.inputs : {};
    const status = String(result && (result.envelopeStatus || outputs.envelopeStatus || result.status) || "PENDING").toUpperCase();
    const constraint = computeCpuProofOutput(result, "primaryConstraint", result && result.primaryConstraint ? result.primaryConstraint : "CPU capacity");
    const target = computeCpuProofInput(result, "targetUtilizationPercent", computeCpuProofOutput(result, "utilizationTarget", ""));
    const finalDemand = computeCpuProofOutput(result, "envelopeFinalDemandCores", computeCpuProofOutput(result, "effectiveDemandCores", 0));
    const usable = computeCpuProofOutput(result, "usableCapacityCores", 0);
    const workload = computeCpuProofInput(result, "workloadType", inputs.workloadType || result?.workload || "active workload");

    if (status === "RISK") {
      return [
        { action: "Increase CPU capacity before continuing", reason: "Final CPU demand is " + computeCpuProofCores(finalDemand) + " against usable capacity near " + computeCpuProofCores(usable) + ". Step up the CPU class or core count before using this as a downstream baseline." },
        { action: "Lower the target utilization ceiling", reason: "A lower target creates more scheduling headroom for burst, failover, and background services instead of running the CPU plan at the edge." },
        { action: "Reduce peak/burst pressure where possible", reason: "Queue smoothing, job staggering, or workload throttling can reduce the burst multiplier that is pushing the envelope into Risk." },
        { action: "Review GPU or acceleration branch", reason: "For video, analytics, or AI-style workloads, offloading eligible work may be safer than continuing to add general CPU cores." },
        { action: "Do not treat RAM/storage results as final yet", reason: "Downstream sizing depends on this CPU baseline. Rework CPU first, then continue into RAM validation." }
      ];
    }

    if (status === "WATCH") {
      return [
        { action: "Validate CPU margin before procurement", reason: "The CPU plan is serviceable but tightening. Confirm whether " + constraint + " is acceptable for the active " + workload + " workload." },
        { action: "Add headroom or choose the next CPU tier", reason: "If this is production, critical, edge, or video-heavy, move the plan farther away from the Watch threshold before locking hardware." },
        { action: "Check whether the utilization target is too aggressive", reason: "Current target utilization is " + target + "%. A lower target may be more appropriate when burst and failover behavior matter." },
        { action: "Smooth bursts or reduce concurrent workers", reason: "Reducing simultaneous CPU demand can pull final demand below the Watch line without changing the whole platform." },
        { action: "Continue to RAM sizing, but keep CPU flagged", reason: "RAM validation should proceed next, but carry this as a CPU watch item until downstream capacity confirms the plan." }
      ];
    }

    return [
      { action: "Carry CPU result into RAM sizing", reason: "The CPU envelope is currently inside the usable range, so RAM should be checked next for density, cache, and memory pressure." },
      { action: "Preserve the CPU assumptions", reason: "Keep workload type, concurrency, burst factor, target utilization, and reserve settings attached to the report so the baseline remains defensible." },
      { action: "Recheck CPU if planner context changes", reason: "Changes to workload branch, growth margin, redundancy, or operating window can move this result back into Watch or Risk." }
    ];
  }

  function buildComputeCpuRecommendedActionsHtml(actions) {
    const rows = (Array.isArray(actions) ? actions : []).map(function (item) {
      return '<div class="compute-cpu-proof-action"><strong>' + computeCpuProofEsc(item.action || "Review CPU plan") + '</strong><span>' + computeCpuProofEsc(item.reason || "Engineering review required.") + '</span></div>';
    });

    return '<div class="compute-cpu-proof-actions-list">' + (rows.length ? rows.join("") : '<div class="compute-cpu-proof-action"><strong>No corrective actions generated</strong><span>Run the CPU calculation again to refresh recommendations.</span></div>') + '</div>';
  }
  function computeCpuDecisionScheduleRow(group, metric, value, note) {
    return '<tr><td>' + computeCpuProofEsc(group) + '</td><td>' + computeCpuProofEsc(metric) + '</td><td>' + value + '</td><td>' + computeCpuProofEsc(note) + '</td></tr>';
  }

  function computeCpuProofStatusChip(status) {
    const visual = cpuVisualStatus(status);
    return '<span class="compute-cpu-proof-status-chip" style="background:' + visual.fill + ';border:1px solid ' + visual.line + ';color:' + visual.text + ';">' + computeCpuProofEsc(visual.label) + '</span>';
  }

  function buildComputeCpuDecisionScheduleHtml(result) {
    const outputs = result && result.outputs ? result.outputs : {};
    const status = String(result && (result.envelopeStatus || outputs.envelopeStatus || result.status) || "PENDING").toUpperCase();
    const finalDemand = computeCpuProofOutput(result, "envelopeFinalDemandCores", computeCpuProofOutput(result, "effectiveDemandCores", 0));
    const watchThreshold = computeCpuProofOutput(result, "envelopeWatchThresholdCores", 0);
    const riskThreshold = computeCpuProofOutput(result, "envelopeRiskThresholdCores", 0);
    const logical = computeCpuProofOutput(result, "recommendedLogicalCores", computeCpuProofOutput(result, "cores", 0));
    const physical = computeCpuProofOutput(result, "recommendedPhysicalCores", computeCpuProofOutput(result, "physicalCores", 0));
    const usable = computeCpuProofOutput(result, "usableCapacityCores", computeCpuProofNumber(logical, 0) * (computeCpuProofOutput(result, "utilizationTarget", 70) / 100));
    const authority = computeCpuProofOutput(result, "statusAuthority", "cpu-capacity-envelope");
    const metricStatus = computeCpuProofOutput(result, "metricAnalyzerStatus", "n/a");
    const constraint = computeCpuProofOutput(result, "primaryConstraint", "CPU capacity");
    const interpretation = result && result.interpretation ? result.interpretation : "CPU envelope interpretation pending.";

    const tableRows = [
      computeCpuDecisionScheduleRow("Capacity", "Status", computeCpuProofStatusChip(status), "Readiness of this CPU result before it is carried into RAM sizing."),
      computeCpuDecisionScheduleRow("Capacity", "Final Demand", computeCpuProofEsc(computeCpuProofCores(finalDemand)), "Maximum plotted CPU demand after growth, reserve, and failover pressure."),
      computeCpuDecisionScheduleRow("Threshold", "Watch Threshold", computeCpuProofEsc(computeCpuProofCores(watchThreshold)), "Demand at or above this line changes the CPU plan to Watch."),
      computeCpuDecisionScheduleRow("Threshold", "Risk Threshold", computeCpuProofEsc(computeCpuProofCores(riskThreshold)), "Demand at or above this line changes the CPU plan to Risk."),
      computeCpuDecisionScheduleRow("Recommendation", "Logical / Physical Cores", computeCpuProofEsc(logical + " logical / " + physical + " physical"), "Recommended CPU ceiling carried forward into the Compute planning path."),
      computeCpuDecisionScheduleRow("Capacity", "Usable Capacity", computeCpuProofEsc(computeCpuProofCores(usable)), "CPU capacity available at the selected target utilization."),
      computeCpuDecisionScheduleRow("Authority", "Status Authority", computeCpuProofEsc(authority), "The chart, summary, and assistant should use this status source."),
      computeCpuDecisionScheduleRow("Diagnostic", "Metric Analyzer", computeCpuProofEsc(metricStatus), "Secondary diagnostic status preserved for troubleshooting, not the final displayed status."),
      computeCpuDecisionScheduleRow("Constraint", "Primary Constraint", computeCpuProofEsc(constraint), "Main CPU planning pressure behind the recommendation.")
    ];

    return [
      '<div class="compute-cpu-proof-hero">',
      '<div><strong>' + computeCpuProofEsc(status) + ' CPU Capacity Envelope</strong><span>Final demand is ' + computeCpuProofEsc(computeCpuProofCores(finalDemand)) + ' against watch ' + computeCpuProofEsc(computeCpuProofCores(watchThreshold)) + ' and risk ' + computeCpuProofEsc(computeCpuProofCores(riskThreshold)) + ' thresholds.</span></div>',
      '<div>' + computeCpuProofStatusChip(status) + '<span>Authority: ' + computeCpuProofEsc(authority) + '</span></div>',
      '</div>',
      '<table class="compute-cpu-proof-table" data-compute-cpu-decision-schedule-table="true"><thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead><tbody>',
      tableRows.join(""),
      '</tbody></table>',
      '<p class="mini-note"><strong>Engineering Interpretation:</strong> ' + computeCpuProofEsc(interpretation) + '</p>'
    ].join("");
  }

  function buildComputeCpuRecommendationReferencesHtml(references) {
    const rows = (Array.isArray(references) ? references : []).map(function (item) {
      return '<tr><td>' + computeCpuMarkerHtml(item.id || "", item.tone || "") + '</td><td>' + computeCpuProofEsc(item.label || "Reference") + '</td><td>' + computeCpuProofEsc(item.reason || "Review required.") + '</td></tr>';
    });

    return [
      '<table class="compute-cpu-proof-table" data-compute-cpu-recommendation-references-table="true"><thead><tr><th>Marker</th><th>Reference</th><th>Reason</th></tr></thead><tbody>',
      rows.length ? rows.join("") : '<tr><td></td><td>No references documented</td><td>No CPU recommendation references were supplied.</td></tr>',
      '</tbody></table>'
    ].join("");
  }

  function clearComputeCpuProofSections() {
    const scheduleCard = document.getElementById("computeCpuDecisionScheduleCard");
    const scheduleTarget = document.getElementById("computeCpuDecisionSchedule");
    const referencesCard = document.getElementById("computeCpuRecommendationReferencesCard");
    const referencesTarget = document.getElementById("computeCpuRecommendationReferences");
    const actionsCard = document.getElementById("computeCpuRecommendedActionsCard");
    const actionsTarget = document.getElementById("computeCpuRecommendedActions");

    if (scheduleTarget) scheduleTarget.innerHTML = "";
    if (referencesTarget) referencesTarget.innerHTML = "";
    if (actionsTarget) actionsTarget.innerHTML = "";
    if (scheduleCard) scheduleCard.hidden = true;
    if (referencesCard) referencesCard.hidden = true;
    if (actionsCard) actionsCard.hidden = true;
  }

  function renderComputeCpuProofSections(result) {
    const scheduleCard = document.getElementById("computeCpuDecisionScheduleCard");
    const scheduleTarget = document.getElementById("computeCpuDecisionSchedule");
    const referencesCard = document.getElementById("computeCpuRecommendationReferencesCard");
    const referencesTarget = document.getElementById("computeCpuRecommendationReferences");
    const actionsCard = document.getElementById("computeCpuRecommendedActionsCard");
    const actionsTarget = document.getElementById("computeCpuRecommendedActions");

    if (!result || !scheduleCard || !scheduleTarget || !referencesCard || !referencesTarget) return false;

    const references = Array.isArray(result.recommendationReferences) && result.recommendationReferences.length
      ? result.recommendationReferences
      : buildComputeCpuRecommendationReferences(result);

    scheduleTarget.innerHTML = buildComputeCpuDecisionScheduleHtml(result);
    referencesTarget.innerHTML = buildComputeCpuRecommendationReferencesHtml(references);
    scheduleCard.hidden = false;
    referencesCard.hidden = false;

    if (actionsCard && actionsTarget) {
      actionsTarget.innerHTML = buildComputeCpuRecommendedActionsHtml(buildComputeCpuRecommendedActions(result));
      actionsCard.hidden = false;
    }

    return true;
  }

  function computeCpuExportRowValue(rows, label) {
    const target = String(label || "").trim().toLowerCase();
    const row = Array.isArray(rows)
      ? rows.find((item) => String(item?.label || "").trim().toLowerCase() === target)
      : null;
    return row ? row.value : "";
  }


  function computeCpuAuthoritativeExportStatus(result, outputs) {
    const source = result || {};
    const resultOutputs = source.outputs && typeof source.outputs === "object" ? source.outputs : {};
    const envelope = String(source.envelopeStatus || resultOutputs.envelopeStatus || "").toUpperCase();

    if (envelope === "RISK") return "RISK";
    if (envelope === "WATCH") return "WATCH";
    if (envelope === "GOOD" || envelope === "HEALTHY") return "HEALTHY";

    const rowStatus = String(computeCpuExportRowValue(outputs || [], "Status") || source.status || source.analyzerStatus || "").toUpperCase();
    if (rowStatus === "RISK") return "RISK";
    if (rowStatus === "WATCH") return "WATCH";
    if (rowStatus === "GOOD" || rowStatus === "HEALTHY") return "HEALTHY";

    return rowStatus || "";
  }
  function computeCpuSvgDataUri(svg) {
    const text = String(svg || "").trim();
    if (!text) return "";
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(text);
  }

  function computeCpuExportTableFromDom(selector) {
    const table = document.querySelector(selector);
    if (!table) return null;

    const headers = Array.from(table.querySelectorAll("thead th"))
      .map((cell) => String(cell.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);

    const rows = Array.from(table.querySelectorAll("tbody tr"))
      .map((row) => Array.from(row.children || [])
        .map((cell) => String(cell.textContent || "").replace(/\s+/g, " ").trim()))
      .filter((row) => row.some(Boolean));

    if (!headers.length && !rows.length) return null;
    return { headers, rows };
  }


  function buildComputeCpuVisualExportSection(result, chartSvg) {
    const status = String(result && (result.envelopeStatus || result.status) || "").toUpperCase();
    return {
      title: "CPU Capacity Envelope",
      description: "Demand curve versus usable CPU capacity, including demand basis, reserve pressure, downstream validation, and the active CPU envelope status." + (status ? " Status: " + status + "." : ""),
      compactSvg: false,
      svgs: [chartSvg]
    };
  }
  function buildComputeCpuReferenceExportSection(result) {
    const references = Array.isArray(result?.recommendationReferences) && result.recommendationReferences.length
      ? result.recommendationReferences
      : buildComputeCpuRecommendationReferences(result || {});

    return {
      title: "Recommendation References",
      description: "Reference markers shown in the CPU Capacity Envelope and recommendation proof. These explain the demand basis, reserve pressure, and downstream validation path.",
      tableClass: "extra-export-table--planner extra-export-table--decision",
      tables: [
        {
          headers: ["Marker", "Reference", "Reason"],
          rows: references.map((item) => {
            const marker = item.id || item.marker || "";
            const color = computeCpuMarkerColor(item.tone, marker);
            return [
              {
                text: marker,
                style: color && color !== "inherit" ? "color:" + color + ";font-weight:900;" : "font-weight:900;",
                className: "report-reference-marker"
              },
              item.label || item.reference || "",
              item.reason || ""
            ];
          })
        }
      ]
    };
  }



  function computeCpuExportStatusTone(value) {
    const api = computeCpuExportProofTables();
    if (api && typeof api.statusTone === "function") return api.statusTone(value);

    const normalized = String(value || "").trim().toUpperCase();
    if (normalized === "GOOD" || normalized === "HEALTHY") return "#16a34a";
    if (normalized === "WATCH") return "#d97706";
    if (normalized === "RISK") return "#dc2626";
    return "";
  }

  function computeCpuExportPlainCell(value) {
    const api = computeCpuExportProofTables();
    if (api && typeof api.plainCell === "function") return api.plainCell(value);

    return {
      text: String(value || ""),
      style: "font-weight:400;color:#334155;"
    };
  }

  function computeCpuExportValueCell(value) {
    const api = computeCpuExportProofTables();
    if (api && typeof api.valueCell === "function") return api.valueCell(value);

    const text = String(value || "");
    const tone = computeCpuExportStatusTone(text);

    return {
      text,
      style: tone
        ? "font-weight:700;color:" + tone + ";"
        : "font-weight:700;color:#0f172a;"
    };
  }



  function computeCpuExportNoteCell(value) {
    const api = computeCpuExportProofTables();
    if (api && typeof api.noteCell === "function") return api.noteCell(value);

    return {
      text: String(value || ""),
      style: "font-weight:700;color:#0f172a;"
    };
  }

  function computeCpuExportProofTables() {
    return window.ScopedLabsComputeExportProofTables || null;
  }

  function computeCpuProofTableWidths(kind) {
    const api = computeCpuExportProofTables();
    if (api && typeof api.widthsFor === "function") {
      const widths = api.widthsFor(kind);
      if (Array.isArray(widths) && widths.length) return widths;
    }

    if (kind === "recommendedActions") return ["34%", "66%"];
    if (kind === "decisionSchedule") return ["16%", "22%", "18%", "44%"];
    return [];
  }

  function buildComputeCpuRecommendedActionsExportSection(result) {
    const actions = buildComputeCpuRecommendedActions(result || {});

    return {
      title: "Recommended Actions",
      description: "Corrective or validation steps generated from the CPU Capacity Envelope status authority.",
      tableClass: "extra-export-table--planner extra-export-table--decision",
      tables: [
        {
          headers: ["Action", "Reason"],
          colWidths: computeCpuProofTableWidths("recommendedActions"),
          rows: actions.map((item) => [
            computeCpuExportPlainCell(item.action || "Review CPU plan"),
            computeCpuExportPlainCell(item.reason || "Engineering review required.")
          ])
        }
      ]
    };
  }


  function buildComputeCpuDecisionScheduleExportSection() {
    const table = computeCpuExportTableFromDom("#computeCpuDecisionSchedule table");
    if (!table) return null;

    return {
      title: "CPU Capacity Decision Schedule",
      description: "Decision checkpoints generated from the CPU sizing result.",
      tableClass: "extra-export-table--planner extra-export-table--decision",
      tables: [
        {
          headers: Array.isArray(table.headers) && table.headers.length
            ? table.headers
            : ["Group", "Metric", "Value", "Engineering Note"],
          colWidths: computeCpuProofTableWidths("decisionSchedule"),
          rows: (Array.isArray(table.rows) ? table.rows : []).map((row) => {
            const cols = Array.isArray(row) ? row : [];

            return [
              computeCpuExportPlainCell(cols[0] || ""),
              computeCpuExportPlainCell(cols[1] || ""),
              computeCpuExportValueCell(cols[2] || ""),
              computeCpuExportNoteCell(cols[3] || "")
            ];
          })
        }
      ]
    };
  }

  function buildComputeCpuExportPayload(context = {}) {
    const getInputRows = typeof context.getInputRows === "function" ? context.getInputRows : () => [];
    const getResultRows = typeof context.getResultRows === "function" ? context.getResultRows : () => [];
    const options = context.options || {};

    const inputs = getInputRows();
    const outputs = getResultRows();
    const result = currentComputeCpuExportResult;

    if (!result || !outputs.length) return null;

    const chartSvg = buildComputeCpuVisualSvg(result);
    const extraSections = [
      buildComputeCpuVisualExportSection(result, chartSvg),
      buildComputeCpuReferenceExportSection(result),
      buildComputeCpuRecommendedActionsExportSection(result),
      buildComputeCpuDecisionScheduleExportSection()
    ].filter(Boolean);

    const status = computeCpuAuthoritativeExportStatus(result, outputs);
    const summary = typeof options.summaryBuilder === "function"
      ? options.summaryBuilder(outputs)
      : "CPU sizing export generated from the latest calculated workload result.";

    return {
      status,
      summary,
      interpretation: computeCpuExportRowValue(outputs, "Engineering Interpretation") || result.interpretation || "",
      inputs,
      outputs,
      chartImage: "",
      extraSections,
      exportSectionsContract: "cpu-visual-references-actions-schedule",
      assumptions: Array.isArray(options.assumptions) ? options.assumptions : [],
      printLowInkChart: false
    };
  }

  window.ScopedLabsComputeCpuExport = {
    buildPayload: buildComputeCpuExportPayload
  };

  function clearComputeCpuVisual() {
    currentComputeCpuExportResult = null;
    const card = document.getElementById("computeCpuVisualCard");
    const target = document.getElementById("computeCpuVisual");
    if (target) target.innerHTML = "";
    if (card) card.hidden = true;
    clearComputeCpuProofSections();
  }

  function renderComputeCpuVisual(result) {
    const card = document.getElementById("computeCpuVisualCard");
    const target = document.getElementById("computeCpuVisual");
    if (!card || !target || !result) return false;

    target.innerHTML = buildComputeCpuVisualSvg(result);
    currentComputeCpuExportResult = result;
    card.hidden = false;
    renderComputeCpuProofSections(result);
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

    const cpuEnvelopeAuthority = cpuEnvelopeThresholds({
      inputs: {
        targetUtilizationPercent: target
      },
      outputs: {
        baseDemandCores: Number(baseDemand.toFixed(2)),
        demandAfterGrowthCores: Number(growthDemand.toFixed(2)),
        effectiveDemandCores: Number(eff.toFixed(2)),
        recommendedLogicalCores: rec,
        utilizationTarget: Number(target.toFixed(1))
      },
      cores: rec,
      eff
    });
    const finalCpuStatus = cpuEnvelopeAuthority.status;
    const finalAnalyzerStatus = finalCpuStatus === "GOOD" ? "HEALTHY" : finalCpuStatus;

    let interpretation = "";

    if (finalCpuStatus === "RISK") {
      interpretation =
        "CPU sizing is being pushed too close to the edge. The workload is likely to hit scheduling pressure, burst contention, or reduced responsiveness before downstream memory and storage layers can be evaluated cleanly.";
    } else if (finalCpuStatus === "WATCH") {
      interpretation =
        "CPU sizing is serviceable but tightening. As concurrency rises or burst conditions widen, scheduler pressure and per-core contention will begin reducing the safety margin for later expansion.";
    } else {
      interpretation =
        "CPU sizing is inside a workable operating envelope. Thread demand, burst factor, and utilization target leave room for normal scheduling overhead without making the processor the first scaling limit.";
    }

    let guidance = "";

    if (finalCpuStatus === "GOOD") {
      guidance =
        "You have usable headroom. The next failure point is more likely to appear in memory density, storage latency, or workload imbalance before raw CPU exhaustion becomes the dominant issue.";
    } else if (finalCpuStatus === "WATCH") {
      guidance =
        "Watch what fails first: burst handling, sustained queue depth, or poor thread placement across logical cores. This is the point where future growth can force a jump to the next CPU class sooner than expected.";
    } else {
      guidance =
        `Rework the compute baseline before continuing. The primary limiter is ${dominantConstraint.toLowerCase()}, so expansion will become difficult here first. Reduce concurrency, lower per-worker CPU demand, or step up core count and processor tier.`;
    }

    const summaryRows = [
      { label: "Status", value: finalCpuStatus },
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
      status: finalAnalyzerStatus,
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
      status: cpuStatusForPlan(finalCpuStatus),
      analyzerStatus: finalCpuStatus,
      metricAnalyzerStatus: analyzer.status,
      envelopeStatus: finalCpuStatus,
      statusAuthority: "cpu-capacity-envelope",
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
        primaryConstraint: dominantConstraint,
        envelopeStatus: finalCpuStatus,
        envelopeFinalDemandCores: Number(cpuEnvelopeAuthority.finalDemandCores.toFixed(2)),
        envelopeWatchThresholdCores: Number(cpuEnvelopeAuthority.watchThresholdCores.toFixed(2)),
        envelopeRiskThresholdCores: Number(cpuEnvelopeAuthority.riskThresholdCores.toFixed(2)),
        statusAuthority: cpuEnvelopeAuthority.statusAuthority
      },
      updatedAt: new Date().toISOString()
    };

    cpuWorkloadResult.recommendationReferences = buildComputeCpuRecommendationReferences(cpuWorkloadResult);

    const activeWorkloadForResult = activeComputeWorkload();
    const cpuPipelineResult = {
      ...cpuWorkloadResult,
      cores: rec,
      physicalCores: physicalRec,
      eff,
      requiredCores: Number(cores.toFixed(2)),
      workload,
      status: finalCpuStatus,
      planStatus: cpuStatusForPlan(finalCpuStatus),
      metricAnalyzerStatus: analyzer.status,
      envelopeStatus: finalCpuStatus,
      statusAuthority: "cpu-capacity-envelope",
      envelopeFinalDemandCores: Number(cpuEnvelopeAuthority.finalDemandCores.toFixed(2)),
      envelopeWatchThresholdCores: Number(cpuEnvelopeAuthority.watchThresholdCores.toFixed(2)),
      envelopeRiskThresholdCores: Number(cpuEnvelopeAuthority.riskThresholdCores.toFixed(2)),
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
        demandPattern: activeWorkloadForResult.demandPattern || activeWorkloadForResult.demandProfile || "",
        planningPath: activeWorkloadForResult.planningPath || "",
        targetUtilization: activeWorkloadForResult.targetUtilization || activeWorkloadForResult.targetUtilizationPercent || "",
        growthMargin: activeWorkloadForResult.growthMargin || activeWorkloadForResult.growthMarginPercent || "",
        branches: activeWorkloadForResult.branches || {},
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