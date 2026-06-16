(function () {
  "use strict";

  const VERSION = "scopedlabs-compute-assistant-contract-004-no-stale-automount";

  function isComputeShellPage() {
    const body = document.body;
    return !!(
      body &&
      body.dataset &&
      body.dataset.category === "compute" &&
      body.dataset.computeToolShell === "0614"
    );
  }

  function getStep() {
    return document.body && document.body.dataset ? document.body.dataset.step || "" : "";
  }

  function inputValue(id, fallback) {
    const el = document.getElementById(id);
    return el ? String(el.value || fallback || "") : String(fallback || "");
  }

  function readFlow(step) {
    try {
      const raw = sessionStorage.getItem("scopedlabs:pipeline:compute:" + step);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function statusSummary(status) {
    const value = String(status || "PENDING").toUpperCase();

    if (value === "RISK") {
      return "CPU sizing is being pushed close to its practical operating edge. Resolve CPU pressure before relying on downstream RAM, storage, or density assumptions.";
    }

    if (value === "WATCH") {
      return "CPU sizing is serviceable, but the margin is tightening. Treat RAM sizing as the next validation step, not as proof that the platform is complete.";
    }

    if (value === "HEALTHY") {
      return "CPU sizing is inside a workable planning envelope. The next likely constraint should be validated in RAM, storage, or workload density.";
    }

    return "Run the CPU sizing tool to generate local Compute assistant guidance.";
  }

  function actionList(status, data) {
    const value = String(status || "PENDING").toUpperCase();

    if (value === "RISK") {
      return [
        "Rework the CPU baseline before continuing to RAM sizing.",
        "Reduce concurrency, reduce per-worker CPU demand, or step up processor/core class.",
        "Recalculate after changing the inputs so downstream Compute planning starts from a stable CPU baseline."
      ];
    }

    if (value === "WATCH") {
      return [
        "Continue to RAM sizing, but keep the CPU result in review.",
        "Watch burst factor, target utilization, and thread scheduling as workload growth changes.",
        "Avoid treating the recommended core count as a final hardware choice until RAM and storage pressure are checked."
      ];
    }

    if (value === "HEALTHY") {
      return [
        "Continue to RAM sizing using this CPU result as the current Compute baseline.",
        "Use the physical/logical core recommendation as planning context, not a vendor benchmark replacement.",
        "Revisit CPU sizing if concurrency, workload type, or burst assumptions change."
      ];
    }

    return ["Run the calculator to generate Compute assistant actions."];
  }

  function workloadLabel(value) {
    const map = {
      general: "General / Mixed",
      web: "Web / API",
      db: "Database",
      video: "Video / Transcode",
      compute: "Compute-heavy / batch"
    };
    return map[value] || value || "General / Mixed";
  }


  // compute-assistant-contract-002-active-workload-context
  function computePlanState() {
    return window.ScopedLabsComputePlanState || null;
  }

  function titleCase(value) {
    return String(value || "N/A")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, function (letter) {
        return letter.toUpperCase();
      }) || "N/A";
  }

  function activeWorkloadContext(toolLabel) {
    const state = computePlanState();
    if (!state || typeof state.buildWorkloadDisplayContext !== "function") return null;

    try {
      return state.buildWorkloadDisplayContext(toolLabel || "Compute Tool");
    } catch {
      return null;
    }
  }

  function activeWorkloadRecord() {
    const state = computePlanState();
    if (!state || typeof state.load !== "function" || typeof state.activeWorkload !== "function") return null;

    try {
      return state.activeWorkload(state.load());
    } catch {
      return null;
    }
  }

  function savedToolResult(toolSlug) {
    const state = computePlanState();
    if (!state || typeof state.load !== "function" || typeof state.activeWorkload !== "function") return null;

    try {
      const plan = state.load();
      const active = state.activeWorkload(plan);
      const workloadId = active ? active.id : "unscoped";
      return plan && plan.results && plan.results[workloadId] ? plan.results[workloadId][toolSlug] || null : null;
    } catch {
      return null;
    }
  }

  function contextRowsToItems(context, limit) {
    if (!context || !Array.isArray(context.rows)) return [];
    return context.rows.slice(0, limit || context.rows.length).map(function (row) {
      return String(row[0] || "Context") + ": " + String(row[1] || "N/A");
    });
  }

  function workloadContextSection(toolLabel) {
    const context = activeWorkloadContext(toolLabel);

    if (!context || !context.hasActiveWorkload) {
      return {
        title: "Active Workload Context",
        body: "No active Compute workload is selected. The assistant can still explain the CPU result, but the result is not tied to a named workload plan yet.",
        items: [
          "Open the Compute Workload Planner to create or select a workload.",
          "Run CPU sizing again after the workload context is active."
        ]
      };
    }

    return {
      title: "Active Workload Context",
      body: context.title + " is the active workload for this CPU sizing result.",
      items: contextRowsToItems(context, 8)
    };
  }

  function cpuPayloadInputs(data) {
    return data && data.inputs && typeof data.inputs === "object" ? data.inputs : {};
  }

  function cpuPayloadOutputs(data) {
    if (data && data.outputs && typeof data.outputs === "object") return data.outputs;
    return data && typeof data === "object" ? data : {};
  }

  function cpuNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function cpuStatusLabel(status) {
    const value = String(status || "PENDING").toUpperCase();
    if (value === "RISK") return "Risk";
    if (value === "WATCH") return "Watch";
    if (value === "GOOD" || value === "HEALTHY" || value === "COMPLETE") return "Good";
    return "Review";
  }

  function cpuStatusForActions(status) {
    const value = String(status || "PENDING").toUpperCase();
    if (value === "GOOD" || value === "HEALTHY" || value === "COMPLETE") return "PENDING";
    return value;
  }

  function cpuPct(value) {
    const num = cpuNumber(value, 0);
    return Math.round(num) + "%";
  }

  function cpuCores(value, fallback) {
    return cpuNumber(value, fallback || 0).toFixed(2) + " cores";
  }

  function cpuMultiplier(value, fallback) {
    const num = cpuNumber(value, fallback || 1);
    return num.toFixed(2).replace(/\.00$/, "") + "×";
  }

  function cpuInputPercent(inputs, data, key, id, fallback) {
    return cpuNumber(inputs[key] || data[key] || inputValue(id, fallback), Number(fallback));
  }

  function cpuInputValue(inputs, data, key, id, fallback) {
    return inputs[key] || data[key] || inputValue(id, fallback);
  }

  

  function cpuResultSection(data) {
    const outputs = cpuPayloadOutputs(data);
    const status = cpuStatusLabel(data.envelopeStatus || outputs.envelopeStatus || data.status || data.analyzerStatus);

    const logical = cpuNumber(outputs.recommendedLogicalCores, cpuNumber(data.cores, 0));
    const physical = cpuNumber(outputs.recommendedPhysicalCores, cpuNumber(data.physicalCores, 0));
    const effective = cpuNumber(outputs.effectiveDemandCores, cpuNumber(data.eff, 0));
    const required = cpuNumber(outputs.requiredCores, logical);
    const finalDemand = cpuNumber(outputs.envelopeFinalDemandCores || data.envelopeFinalDemandCores, effective);
    const watchThreshold = cpuNumber(outputs.envelopeWatchThresholdCores || data.envelopeWatchThresholdCores, logical * 0.70);
    const riskThreshold = cpuNumber(outputs.envelopeRiskThresholdCores || data.envelopeRiskThresholdCores, logical * 0.90);
    const authority = outputs.statusAuthority || data.statusAuthority || "cpu-capacity-envelope";
    const metricStatus = outputs.metricAnalyzerStatus || data.metricAnalyzerStatus || data.analyzerStatus || "n/a";
    const constraint = titleCase(outputs.primaryConstraint || data.primaryConstraint || data.constraint || "CPU capacity");

    return {
      title: "CPU Sizing Summary",
      body: data.summary || "CPU sizing result saved for the active Compute planning path.",
      items: [
        "Status: " + status,
        "Recommended logical cores: " + logical,
        "Recommended physical cores: " + physical,
        "Effective CPU demand: " + effective.toFixed(2) + " cores",
        "Envelope final demand: " + finalDemand.toFixed(2) + " cores",
        "Envelope watch threshold: " + watchThreshold.toFixed(2) + " cores",
        "Envelope risk threshold: " + riskThreshold.toFixed(2) + " cores",
        "Status authority: " + authority,
        "Metric analyzer status: " + metricStatus,
        "Required CPU capacity: " + required.toFixed(2) + " cores",
        "Primary constraint: " + constraint
      ]
    };
  }

  function cpuVisualSection(data) {
    const outputs = cpuPayloadOutputs(data);
    const loadPressure = cpuNumber(outputs.loadPressure, 0);
    const coreDemand = cpuNumber(outputs.coreDemand, 0);
    const utilization = cpuNumber(outputs.utilizationTarget, 0);
    const finalDemand = cpuNumber(outputs.envelopeFinalDemandCores || data.envelopeFinalDemandCores, outputs.effectiveDemandCores || data.eff || 0);
    const watchThreshold = cpuNumber(outputs.envelopeWatchThresholdCores || data.envelopeWatchThresholdCores, 0);
    const riskThreshold = cpuNumber(outputs.envelopeRiskThresholdCores || data.envelopeRiskThresholdCores, 0);

    return {
      title: "CPU Capacity Envelope",
      body: "The visible CPU envelope and this assistant readout use the same saved result payload.",
      items: [
        "Load pressure: " + cpuPct(loadPressure),
        "Core demand: " + cpuPct(coreDemand),
        "Utilization target: " + cpuPct(utilization),
        "Final envelope demand: " + cpuCores(finalDemand),
        "Watch threshold: " + cpuCores(watchThreshold),
        "Risk threshold: " + cpuCores(riskThreshold)
      ]
    };
  }

  

  function nextStepSection(status) {
    const value = String(status || "PENDING").toUpperCase();

    if (value === "RISK") {
      return {
        title: "Next Planning Step",
        body: "Resolve the CPU risk before treating the rest of the Compute path as valid.",
        items: [
          "Adjust concurrency, workload class, peak factor, SMT mode, or target utilization.",
          "Recalculate CPU sizing before continuing to RAM sizing.",
          "Do not use downstream RAM or storage results as proof while CPU remains at risk."
        ]
      };
    }

    if (value === "WATCH") {
      return {
        title: "Next Planning Step",
        body: "Continue to RAM sizing, but keep the CPU result under review.",
        items: [
          "Carry the CPU result forward as a watch item.",
          "Validate RAM next, then storage IOPS or throughput if the workload path requires it.",
          "Recheck CPU if concurrency, burst factor, or utilization target changes."
        ]
      };
    }

    return {
      title: "Next Planning Step",
      body: "Use this CPU baseline as the first Compute planning checkpoint.",
      items: [
        "Continue to RAM sizing.",
        "Use branch tools only when the active workload context calls for them.",
        "Keep CPU, RAM, and storage results tied to the same active workload."
      ]
    };
  }

  function buildCpuSizingAssistantModel(data) {
    data = data || {};

    const inputs = cpuPayloadInputs(data);
    const status = data.status || data.analyzerStatus || "PENDING";
    const actionStatus = cpuStatusForActions(status);

    const workload = inputs.workloadType || data.workload || inputValue("workload", "general");
    const smt = inputs.smt || inputValue("smt", "on");
    const target = inputs.targetUtilizationPercent || inputValue("targetUtil", "70");
    const peak = inputs.peakFactor || inputValue("peak", "1.25");
    const concurrency = inputs.concurrency || inputValue("concurrency", "");
    const cpuPerWorker = inputs.cpuPerWorkerPercent || inputValue("cpuPerWorker", "");
    const workloadPattern = inputs.workloadPattern || inputValue("workloadPattern", "balanced");
    const growthReserve = cpuInputPercent(inputs, data, "growthReservePercent", "growthReserve", "20");
    const platformOverhead = cpuInputPercent(inputs, data, "platformOverheadPercent", "platformOverhead", "10");
    const osReserve = cpuInputPercent(inputs, data, "osReservePercent", "osReserve", "5");
    const coreEfficiency = cpuInputPercent(inputs, data, "coreEfficiencyPercent", "coreEfficiency", "85");
    const sustainedDerate = cpuInputPercent(inputs, data, "sustainedDeratePercent", "sustainedDerate", "90");
    const failoverMultiplier = cpuNumber(inputs.failoverMultiplier || data.failoverMultiplier || inputValue("failoverMultiplier", "1"), 1);
    const saved = savedToolResult("cpu-sizing");

    return {
      category: "compute",
      tool: "cpu-sizing",
      title: "CPU Sizing Result",
      kicker: "Compute Assistant",
      status,
      summary: data.summary || statusSummary(actionStatus),
      hideHeaderPills: true,
      hideStandardLists: false,
      assumptionsTitle: "Current CPU Planning Inputs",
      actionsTitle: "Recommended Next Actions",
      assumptions: [
        "Workload: " + workloadLabel(workload),
        "Concurrent workers / threads: " + concurrency,
        "Average CPU per worker: " + cpuPerWorker + "%",
        "Peak factor: " + peak + "×",
        "Target utilization ceiling: " + target + "%",
        "SMT mode: " + (smt === "on" ? "logical cores counted" : "physical cores only"),
        "Workload pattern: " + titleCase(String(workloadPattern).replace(/-/g, " ")),
        "Growth reserve: " + Math.round(growthReserve) + "%",
        "Platform overhead: " + Math.round(platformOverhead) + "%",
        "OS reserve: " + Math.round(osReserve) + "%",
        "Core efficiency: " + Math.round(coreEfficiency) + "%",
        "Sustained derate: " + Math.round(sustainedDerate) + "%",
        "Failover multiplier: " + cpuMultiplier(failoverMultiplier),
        "Saved to active workload: " + (saved ? "Yes" : "Not confirmed")
      ],
      actions: actionList(actionStatus, data),
      sections: [
        workloadContextSection("CPU Sizing"),
        cpuResultSection(data),
        cpuVisualSection(data),
        nextStepSection(actionStatus)
      ]
    };
  }

  function buildToolAssistantModel(config) {
    const data = config && config.result ? config.result : null;
    const toolSlug = config && config.toolSlug ? config.toolSlug : getStep();

    if (toolSlug === "cpu-sizing" && data) {
      return buildCpuSizingAssistantModel(data);
    }

    return {
      category: "compute",
      tool: toolSlug || "compute-tool",
      title: "Compute Design Assistant",
      kicker: "Compute Assistant",
      status: "PENDING",
      summary: "Run the tool to generate local Compute assistant guidance.",
      hideHeaderPills: true,
      assumptions: [],
      actions: ["Run the calculator to generate Compute assistant actions."],
      sections: [workloadContextSection(config && config.toolLabel ? config.toolLabel : "Compute Tool")]
    };
  }

  function computeCpuSummaryCardEscapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function computeCpuTopCardStatus(status) {
    const value = String(status || "PENDING").toUpperCase();

    if (value === "RISK") {
      return {
        label: "RISK",
        className: "is-risk",
        confidence: "LOW",
        risk: "CPU plan is likely underbuilt or operating too close to the edge.",
        action: "Rework the CPU baseline before treating RAM, storage, or branch tools as valid."
      };
    }

    if (value === "WATCH") {
      return {
        label: "WATCH",
        className: "is-watch",
        confidence: "MEDIUM",
        risk: "CPU margin is tightening and should be carried forward as a watch item.",
        action: "Continue to RAM sizing, but keep this CPU result under review if concurrency, burst factor, or utilization target changes."
      };
    }

    return {
      label: "GOOD",
      className: "is-good",
      confidence: "HIGH",
      risk: "No immediate CPU sizing risk detected from the current workload assumptions.",
      action: "Carry this CPU baseline into RAM sizing as the first Compute planning checkpoint."
    };
  }

  function computeCpuTopCardModel(data) {
    data = data || {};

    const outputs = cpuPayloadOutputs(data);
    const inputs = cpuPayloadInputs(data);
    const context = activeWorkloadContext("CPU Sizing");
    const workloadRecord = activeWorkloadRecord();
    const plannerContext = data.plannerContext || null;

    const hasPlanner = !!(
      (context && context.hasActiveWorkload) ||
      plannerContext ||
      workloadRecord
    );

    const rawStatus = data.envelopeStatus || outputs.envelopeStatus || data.status || data.analyzerStatus || outputs.status || "PENDING";
    const status = computeCpuTopCardStatus(rawStatus);

    const logical = cpuNumber(outputs.recommendedLogicalCores, cpuNumber(data.recommendedLogicalCores, cpuNumber(data.cores, 0)));
    const physical = cpuNumber(outputs.recommendedPhysicalCores, cpuNumber(data.recommendedPhysicalCores, cpuNumber(data.physicalCores, 0)));
    const effective = cpuNumber(outputs.effectiveDemandCores, cpuNumber(data.effectiveDemandCores, cpuNumber(data.eff, 0)));
    const required = cpuNumber(outputs.requiredCores, cpuNumber(data.requiredCores, logical));
    const finalDemand = cpuNumber(outputs.envelopeFinalDemandCores || data.envelopeFinalDemandCores, effective);
    const watchThreshold = cpuNumber(outputs.envelopeWatchThresholdCores || data.envelopeWatchThresholdCores, logical * 0.70);
    const riskThreshold = cpuNumber(outputs.envelopeRiskThresholdCores || data.envelopeRiskThresholdCores, logical * 0.90);
    const authority = outputs.statusAuthority || data.statusAuthority || "cpu-capacity-envelope";
    const metricStatus = outputs.metricAnalyzerStatus || data.metricAnalyzerStatus || data.analyzerStatus || "n/a";
    const constraint = titleCase(outputs.primaryConstraint || data.primaryConstraint || data.constraint || "CPU capacity");

    const workloadType = inputs.workloadType || data.workload || (plannerContext && plannerContext.workloadType) || (workloadRecord && workloadRecord.workloadType) || inputValue("workload", "general");
    const workloadName =
      (context && context.hasActiveWorkload && context.title) ||
      (plannerContext && plannerContext.name) ||
      (workloadRecord && workloadRecord.name) ||
      workloadLabel(workloadType);

    const concurrency = inputs.concurrency || data.concurrency || inputValue("concurrency", "");
    const cpuPerWorker = inputs.cpuPerWorkerPercent || data.cpuPerWorkerPercent || inputValue("cpuPerWorker", "");
    const peak = inputs.peakFactor || data.peakFactor || inputValue("peak", "");
    const target = inputs.targetUtilizationPercent || data.targetUtilizationPercent || inputValue("targetUtil", "");
    const workloadPattern = cpuInputValue(inputs, data, "workloadPattern", "workloadPattern", "balanced");
    const growthReserve = cpuInputPercent(inputs, data, "growthReservePercent", "growthReserve", "20");
    const platformOverhead = cpuInputPercent(inputs, data, "platformOverheadPercent", "platformOverhead", "10");
    const osReserve = cpuInputPercent(inputs, data, "osReservePercent", "osReserve", "5");
    const coreEfficiency = cpuInputPercent(inputs, data, "coreEfficiencyPercent", "coreEfficiency", "85");
    const sustainedDerate = cpuInputPercent(inputs, data, "sustainedDeratePercent", "sustainedDerate", "90");
    const failoverMultiplier = cpuNumber(inputs.failoverMultiplier || data.failoverMultiplier || inputValue("failoverMultiplier", "1"), 1);

    let recommendation = "CPU recommendation pending";

    if (logical || physical) {
      if (hasPlanner) {
        recommendation = logical + " logical cores / " + physical + " physical cores recommended for the active " + workloadName + " workload";
      } else {
        recommendation = logical + " logical cores / " + physical + " physical cores recommended for the current CPU inputs";
      }
    }

    const confidence = status.label === "RISK"
      ? "LOW"
      : !hasPlanner
        ? "MEDIUM"
        : status.label === "WATCH"
          ? "MEDIUM"
          : "HIGH";

    const flags = [
      hasPlanner ? "Planner context active" : "Planner context missing",
      status.label === "WATCH" ? "CPU watch item" : status.label === "RISK" ? "CPU risk item" : "CPU baseline usable",
      "Current CPU inputs applied",
      "CPU V2 inputs applied",
      "Envelope authority: " + authority,
      "Metric analyzer: " + metricStatus,
      "RAM sizing next",
      "Downstream validation pending"
    ].join(" | ");

    const inputSummary = [
      concurrency ? concurrency + " workers" : "",
      cpuPerWorker ? cpuPerWorker + "% per worker" : "",
      peak ? peak + "× burst" : "",
      target ? target + "% target utilization" : "",
      "pattern " + titleCase(String(workloadPattern).replace(/-/g, " ")),
      "growth reserve " + Math.round(growthReserve) + "%",
      "platform overhead " + Math.round(platformOverhead) + "%",
      "OS reserve " + Math.round(osReserve) + "%",
      "core efficiency " + Math.round(coreEfficiency) + "%",
      "sustained derate " + Math.round(sustainedDerate) + "%",
      "failover " + cpuMultiplier(failoverMultiplier)
    ].filter(Boolean).join(" | ");

    const risk = status.label === "RISK"
      ? "Envelope demand is " + cpuCores(finalDemand) + ", at or above the " + cpuCores(riskThreshold) + " risk threshold."
      : status.label === "WATCH"
        ? "Envelope demand is " + cpuCores(finalDemand) + ", above the " + cpuCores(watchThreshold) + " watch threshold but below the " + cpuCores(riskThreshold) + " risk threshold."
        : "Envelope demand is " + cpuCores(finalDemand) + ", below the " + cpuCores(watchThreshold) + " watch threshold.";

    const action = status.label === "RISK"
      ? "Rework the CPU baseline before treating RAM, storage, or specialty branch results as valid."
      : "Carry this CPU envelope into RAM sizing. The metric analyzer is preserved as " + metricStatus + ", but status authority is " + authority + ". Do not treat the Compute plan as complete until RAM and required downstream branches are validated.";

    return {
      title: "CPU SIZING",
      subtitle: recommendation + ". Envelope demand is " + finalDemand.toFixed(2) + " cores; watch starts at " + watchThreshold.toFixed(2) + " and risk starts at " + riskThreshold.toFixed(2) + " cores." + (inputSummary ? " Inputs: " + inputSummary + "." : ""),
      statusLabel: status.label,
      statusClass: status.className,
      recommendation,
      confidence,
      flags,
      risk,
      action
    };
  }

  function renderComputeCpuTopSummaryCard(data) {
    const model = computeCpuTopCardModel(data);

    return [
      '<section id="computeCpuStatusCard" class="scopedlabs-result-summary-card" aria-live="polite" data-compute-cpu-status-card>',
      '  <div class="scopedlabs-result-summary-top">',
      '    <div>',
      '      <h3 id="computeCpuStatusTitle" class="scopedlabs-result-summary-title">' + computeCpuSummaryCardEscapeHtml(model.title) + '</h3>',
      '      <p id="computeCpuStatusSubtitle" class="scopedlabs-result-summary-subtitle">' + computeCpuSummaryCardEscapeHtml(model.subtitle) + '</p>',
      '    </div>',
      '    <div id="computeCpuStatusText" class="scopedlabs-result-summary-status ' + computeCpuSummaryCardEscapeHtml(model.statusClass) + '">' + computeCpuSummaryCardEscapeHtml(model.statusLabel) + '</div>',
      '  </div>',
      '  <div class="scopedlabs-result-summary-grid">',
      '    <div class="scopedlabs-result-summary-item"><strong>Recommendation</strong><span id="computeCpuStatusRecommendation">' + computeCpuSummaryCardEscapeHtml(model.recommendation) + '</span></div>',
      '    <div class="scopedlabs-result-summary-item"><strong>Confidence</strong><span id="computeCpuStatusConfidence">' + computeCpuSummaryCardEscapeHtml(model.confidence) + '</span></div>',
      '    <div class="scopedlabs-result-summary-item"><strong>Decision Flags</strong><span id="computeCpuStatusFlags">' + computeCpuSummaryCardEscapeHtml(model.flags) + '</span></div>',
      '    <div class="scopedlabs-result-summary-item"><strong>Primary Risk</strong><span id="computeCpuStatusRisk">' + computeCpuSummaryCardEscapeHtml(model.risk) + '</span></div>',
      '  </div>',
      '  <div id="computeCpuStatusAction" class="scopedlabs-result-summary-action">' + computeCpuSummaryCardEscapeHtml(model.action) + '</div>',
      '</section>'
    ].join("");
  }

  

  function renderToolAssistant(config) {
    config = config || {};

    const mount = config.mount || document.querySelector("[data-compute-assistant-mount]");
    const card = config.card || document.querySelector("[data-compute-assistant-card]");
    if (!mount || !card) return false;

    const data = config && config.result ? config.result : null;
    const toolSlug = config && config.toolSlug ? config.toolSlug : getStep();

    if (toolSlug === "cpu-sizing" && data) {
      mount.innerHTML = renderComputeCpuTopSummaryCard(data);
      card.hidden = false;
      return true;
    }

    const model = buildToolAssistantModel(config);

    if (window.ScopedLabsLocalAssistant && typeof window.ScopedLabsLocalAssistant.mount === "function") {
      window.ScopedLabsLocalAssistant.mount(mount, model);
    } else {
      mount.innerHTML =
        '<div class="scopedlabs-local-assistant-card scopedlabs-local-assistant-card--rich">' +
        '<h2>' + model.title + '</h2>' +
        '<p class="muted">' + model.summary + '</p>' +
        '</div>';
    }

    card.hidden = false;
    return true;
  }

  function mountCpuSizing() {
    if (!isComputeShellPage() || getStep() !== "cpu-sizing") return false;

    const mount = document.querySelector("[data-compute-assistant-mount]");
    const card = document.querySelector("[data-compute-assistant-card]");
    if (!mount || !card) return false;

    const flow = readFlow("cpu-sizing");
    let data = flow && flow.data ? flow.data : null;

    if (!data) {
      const saved = savedToolResult("cpu-sizing");
      data = saved && saved.result ? saved.result : null;
    }

    if (!data) {
      if (window.ScopedLabsLocalAssistant && typeof window.ScopedLabsLocalAssistant.clear === "function") {
        window.ScopedLabsLocalAssistant.clear(mount);
      } else {
        mount.innerHTML = "";
      }
      card.hidden = true;
      return false;
    }

    return renderToolAssistant({
      mount,
      card,
      toolSlug: "cpu-sizing",
      toolLabel: "CPU Sizing",
      result: data
    });
  }

  function clearAssistant() {
    const mount = document.querySelector("[data-compute-assistant-mount]");
    const card = document.querySelector("[data-compute-assistant-card]");
    if (!mount || !card) return;

    if (window.ScopedLabsLocalAssistant && typeof window.ScopedLabsLocalAssistant.clear === "function") {
      window.ScopedLabsLocalAssistant.clear(mount);
    } else {
      mount.innerHTML = "";
    }

    card.hidden = true;
  }

  function wire() {
    if (!isComputeShellPage()) return;

    /*
      CPU Sizing uses a page-local Fail-Safe-style decision card.
      The shared compute assistant contract must not bind Calculate timers
      or input/change clears on CPU.
    */
    if (getStep() === "cpu-sizing") return;

    const calc = document.getElementById("calc");

    if (calc) {
      calc.addEventListener("click", function () {
        window.setTimeout(mountCpuSizing, 80);
        window.setTimeout(mountCpuSizing, 240);
      });
    }

    ["workload", "concurrency", "cpuPerWorker", "peak", "targetUtil", "smt"].forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", clearAssistant);
      el.addEventListener("change", clearAssistant);
    });
  }

  window.ScopedLabsComputeAssistant = Object.freeze({
    version: VERSION,
    buildToolAssistantModel,
    renderToolAssistant,
    mountCpuSizing,
    clear: clearAssistant
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();