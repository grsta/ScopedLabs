(function () {
  "use strict";

  const VERSION = "scopedlabs-compute-assistant-contract-010-ram-decision-status-badge";

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

  

  function cpuReferenceSection(data) { const outputs = cpuPayloadOutputs(data); const currentWorkers = cpuNumber(outputs.currentWorkers, cpuNumber(data.concurrency, 0)); const growthWorkers = cpuNumber(outputs.growthWorkers, currentWorkers); const failoverWorkers = cpuNumber(outputs.failoverWorkers, growthWorkers); return { title: "Recommendation References", body: "Use these references while reading the CPU Capacity Envelope and the assistant guidance.", items: [ "*1 Demand basis — Current demand is the active workload baseline at " + currentWorkers + " workers.", "*2 Reserve pressure — Growth / reserve expands the planning envelope to " + growthWorkers + " workers.", "*3 Downstream validation — Stress validation checks whether the CPU baseline still holds at " + failoverWorkers + " workers." ] }; } function nextStepSection(status) {
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


  function ramPick(data, keys, fallback) {
    data = data || {};
    for (const key of keys) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "") return cpuNumber(data[key], fallback || 0);
    }
    return cpuNumber(fallback, 0);
  }

  function ramGb(value, digits) {
    return cpuNumber(value, 0).toFixed(digits == null ? 1 : digits) + " GB";
  }

  function ramPct(value) {
    return cpuNumber(value, 0).toFixed(1) + "%";
  }

  function ramStatusLabel(status) {
    const value = String(status || "PENDING").toUpperCase();
    if (value === "RISK") return "RISK";
    if (value === "WATCH") return "WATCH";
    if (value === "GOOD" || value === "HEALTHY" || value === "COMPLETE") return "GOOD";
    return "PENDING";
  }

  function ramSummary(status) {
    const value = ramStatusLabel(status);
    if (value === "RISK") return "RAM is being pushed too close to the installed memory edge. Resolve memory pressure before treating downstream storage, density, or platform checks as valid.";
    if (value === "WATCH") return "RAM is workable, but reserve margin is tightening. Carry this as a watch item while validating storage and workload density.";
    if (value === "GOOD") return "RAM is inside a workable planning envelope. Continue downstream validation while keeping the same workload assumptions tied to this result.";
    return "Run RAM sizing to generate local Compute assistant guidance.";
  }

  function ramValues(data) {
    data = data || {};
    const demand = ramPick(data, ["demandRamGb", "demandGb", "adjustedWorkloadRamGb"], 0);
    const required = ramPick(data, ["requiredRamGb", "totalRequired", "totalRequiredGb"], demand);
    const reserve = ramPick(data, ["reserveRamGb", "reserveGb"], Math.max(required - demand, 0));
    const recommended = ramPick(data, ["recommendedRamGb", "installedRamGb", "recommended"], required);
    const headroom = ramPick(data, ["headroomRamGb", "remainingHeadroomGb"], Math.max(recommended - required, 0));
    return { demand, required, reserve, recommended, headroom };
  }

  function ramResultSection(data) {
    data = data || {};
    const values = ramValues(data);
    return {
      title: "RAM Sizing Summary",
      body: "The RAM result combines workload memory, base overhead, reserve/cache allowance, and the installed memory tier.",
      items: [
        "Status: " + ramStatusLabel(data.status),
        "Workload: " + (data.workloadLabel || workloadLabel(data.workload) || "Current workload"),
        "Concurrent processes / VMs: " + cpuNumber(data.concurrency, 0),
        "Average RAM per process: " + ramGb(data.perProc, 1),
        "OS / base overhead: " + ramGb(data.osGb, 1),
        "Cache / headroom target: " + ramPct(data.headroomPct),
        "Demand RAM: " + ramGb(values.demand, 1),
        "Total required RAM: " + ramGb(values.required, 1),
        "Recommended installed RAM: " + ramGb(values.recommended, 0),
        "Remaining installed headroom: " + ramGb(values.headroom, 1),
        "Reserve ratio: " + ramPct(data.reserveRatio)
      ]
    };
  }

  function ramReferenceSection(data) {
    data = data || {};
    const values = ramValues(data);
    return {
      title: "Recommendation References",
      body: "Use these references while reading the RAM Capacity Envelope, assistant guidance, and export report.",
      items: [
        "*1 Demand basis ? Current demand is " + ramGb(values.demand, 1) + " before reserve pressure is added.",
        "*2 Reserve pressure ? Required RAM is " + ramGb(values.required, 1) + " after " + ramGb(values.reserve, 1) + " of reserve/cache allocation.",
        "*3 Downstream validation ? Installed RAM tier is " + ramGb(values.recommended, 0) + ". " + (data.cpuCoupling || "Validate against CPU, storage, and workload density next.")
      ]
    };
  }

  function ramNextStepSection(status) {
    const value = ramStatusLabel(status);
    if (value === "RISK") return { title: "Next Planning Step", body: "Do not continue downstream as if the Compute plan is stable while RAM is at risk.", items: ["Increase installed RAM or reduce workload density before continuing.", "Check whether per-process footprint, VM density, or cache reserve assumptions are too aggressive.", "Recalculate RAM sizing before treating storage or VM density results as valid."] };
    if (value === "WATCH") return { title: "Next Planning Step", body: "Continue, but keep memory margin under review.", items: ["Carry RAM as a watch item into storage IOPS and throughput validation.", "Validate memory-heavy spikes, virtualization growth, and cache behavior before locking hardware.", "Recheck RAM if concurrency or per-process footprint changes."] };
    return { title: "Next Planning Step", body: "Use this RAM baseline as the second Compute planning checkpoint.", items: ["Continue to Storage IOPS.", "Keep CPU and RAM tied to the same active workload assumptions.", "Use branch tools only when the active workload calls for them."] };
  }

  function buildRamSizingAssistantModel(data) {
    data = data || {};
    const status = ramStatusLabel(data.status);
    const upstream = data.upstreamCpuContext || {};
    const cpuStatus = upstream.status ? "Upstream CPU status: " + upstream.status : "Upstream CPU status: not available";
    const next = ramNextStepSection(status);
    return {
      category: "compute",
      tool: "ram-sizing",
      title: "RAM Sizing Result",
      kicker: "Compute Assistant",
      status,
      summary: ramSummary(status),
      hideHeaderPills: true,
      hideStandardLists: false,
      assumptionsTitle: "Current RAM Planning Inputs",
      actionsTitle: "Recommended Next Actions",
      assumptions: ["Workload: " + (data.workloadLabel || workloadLabel(data.workload) || "Current workload"), "Concurrent processes / VMs: " + cpuNumber(data.concurrency, 0), "Average RAM per process: " + ramGb(data.perProc, 1), "OS / base overhead: " + ramGb(data.osGb, 1), "Cache / headroom: " + ramPct(data.headroomPct), cpuStatus],
      actions: next.items,
      sections: [workloadContextSection("RAM Sizing"), ramResultSection(data), ramReferenceSection(data), next]
    };
  }
  function buildToolAssistantModel(config) {
    const data = config && config.result ? config.result : null;
    const toolSlug = config && config.toolSlug ? config.toolSlug : getStep();

    if (toolSlug === "cpu-sizing" && data) {
      return buildCpuSizingAssistantModel(data);
    }

    if (toolSlug === "ram-sizing" && data) {
      return buildRamSizingAssistantModel(data);
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

  


  function ramAssistantEscapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, '&#39;');
  }

  function ramAssistantStatusClass(status) {
    const value = ramStatusLabel(status);
    if (value === "RISK") return "is-risk";
    if (value === "WATCH") return "is-watch";
    if (value === "GOOD") return "is-good";
    return "is-review";
  }

  function ramAssistantValue(data, keys, fallback) {
    data = data || {};
    for (const key of keys) {
      if (data[key] !== undefined && data[key] !== null && data[key] !== "") return cpuNumber(data[key], fallback || 0);
    }
    return cpuNumber(fallback, 0);
  }

  function ramAssistantGb(value, digits) {
    return cpuNumber(value, 0).toFixed(digits == null ? 1 : digits) + " GB";
  }

  function ramAssistantCompactLine(data) {
    data = data || {};
    const demand = ramAssistantValue(data, ["demandRamGb", "demandGb", "adjustedWorkloadRamGb"], 0);
    const required = ramAssistantValue(data, ["requiredRamGb", "totalRequired", "totalRequiredGb"], demand);
    const installed = ramAssistantValue(data, ["recommendedRamGb", "installedRamGb", "recommended"], required);
    const headroom = ramAssistantValue(data, ["headroomRamGb", "remainingHeadroomGb"], Math.max(installed - required, 0));
    return { demand, required, installed, headroom };
  }

  function renderComputeRamTopSummaryCard(data) {
    data = data || {};
    const status = ramStatusLabel(data.status);
    const values = ramAssistantCompactLine(data);
    const workload = data.workloadLabel || workloadLabel(data.workload) || "Current workload";
    const reserveRatio = ramPct(data.reserveRatio);
    const primaryRisk = status === "RISK"
      ? "Memory headroom is exhausted at the current RAM tier."
      : status === "WATCH"
        ? "Reserve margin should be reviewed before downstream validation."
        : "RAM plan is inside the current planning envelope.";
    const confidence = status === "RISK" ? "LOW" : status === "WATCH" ? "MEDIUM" : "HIGH";

    return [
      '<section id="computeRamStatusCard" class="scopedlabs-result-summary-card" aria-live="polite">',
      '  <div class="scopedlabs-result-summary-top">',
      '    <div>',
      '      <h3 id="computeRamStatusTitle" class="scopedlabs-result-summary-title">RAM SIZING</h3>',
      '      <p id="computeRamStatusSubtitle" class="scopedlabs-result-summary-subtitle">' + ramAssistantEscapeHtml(ramSummary(status)) + '</p>',
      '    </div>',
      '    <div id="computeRamStatusText" class="scopedlabs-result-summary-status ' + ramAssistantStatusClass(status) + '">' + ramAssistantEscapeHtml(status) + '</div>',
      '  </div>',
      '  <div class="scopedlabs-result-summary-grid">',
      '    <div class="scopedlabs-result-summary-item"><strong>Recommendation</strong><span>' + ramAssistantEscapeHtml(ramAssistantGb(values.installed, 0) + " installed RAM recommended for the active " + workload + " workload") + '</span></div>',
      '    <div class="scopedlabs-result-summary-item"><strong>Confidence</strong><span>' + ramAssistantEscapeHtml(confidence) + '</span></div>',
      '    <div class="scopedlabs-result-summary-item"><strong>Decision Flags</strong><span>' + ramAssistantEscapeHtml("Demand " + ramAssistantGb(values.demand, 1) + " | Required " + ramAssistantGb(values.required, 1) + " | Headroom " + ramAssistantGb(values.headroom, 1)) + '</span></div>',
      '    <div class="scopedlabs-result-summary-item"><strong>Primary Risk</strong><span>' + ramAssistantEscapeHtml(primaryRisk) + '</span></div>',
      '  </div>',
      '  <p class="scopedlabs-result-summary-note">Carry this RAM result into Storage IOPS. Do not treat the Compute plan as complete until storage and density checks validate the same workload assumptions.</p>',
      '</section>'
    ].join("");
  }

    // compute-storage-throughput-assistant-contract-0705
  function storageThroughputAssistantNumber(value, fallback) {
    const num = Number(value);
    return Number.isFinite(num) ? num : (Number.isFinite(Number(fallback)) ? Number(fallback) : 0);
  }

  function storageThroughputAssistantEscapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function storageThroughputAssistantFormatMBps(value) {
    const num = storageThroughputAssistantNumber(value, 0);
    return num.toFixed(num >= 100 ? 1 : 2).replace(/\.0$/, "") + " MB/s";
  }

  function renderComputeStorageThroughputAssistantStatusCard(data) {
    const source = data && data.outputs ? data.outputs : (data || {});
    const status = String(source.status || data.status || "WATCH").toUpperCase();
    const required = storageThroughputAssistantNumber(source.requiredThroughputMBps || source.requiredMBps || source.required, 0);
    const available = storageThroughputAssistantNumber(source.availablePathMBps || source.availableMBps || source.availableThroughputMBps, 0);
    const utilization = storageThroughputAssistantNumber(source.utilizationPct || source.utilization, available > 0 ? required / available * 100 : 0);
    const headroom = storageThroughputAssistantNumber(source.headroomMBps, available - required);
    const workload = String(source.workloadType || data.workloadType || "active workload");

    let recommendation = "Carry this throughput result into VM Density validation.";
    let confidence = "MEDIUM";
    let primaryRisk = "Throughput is within the entered path capacity, but downstream VM density should still validate shared-path contention.";

    if (status === "GOOD") {
      confidence = "HIGH";
      primaryRisk = "No immediate throughput bottleneck is indicated from the entered path ceiling.";
    } else if (status === "WATCH") {
      recommendation = "Validate shared-path reserve before increasing VM density.";
      primaryRisk = "Throughput reserve is tightening and could become a limiter under burst or growth conditions.";
    } else if (status === "RISK") {
      recommendation = "Increase available path throughput or reduce transfer demand before VM Density planning.";
      confidence = "LOW";
      primaryRisk = "Required throughput exceeds the available path or leaves insufficient operating headroom.";
    }

    const flags = [
      "Required " + storageThroughputAssistantFormatMBps(required),
      "Available " + storageThroughputAssistantFormatMBps(available),
      "Utilization " + Math.round(utilization) + "%",
      "Headroom " + storageThroughputAssistantFormatMBps(headroom)
    ].join(" | ");

    return [
      '<div class="scopedlabs-result-summary-card" data-compute-storage-throughput-assistant-status-card="0705">',
      '  <div class="scopedlabs-result-summary-header">',
      '    <h3 id="computeStorageThroughputStatusTitle" class="scopedlabs-result-summary-title">STORAGE THROUGHPUT</h3>',
      '    <span class="status-badge status-' + storageThroughputAssistantEscapeHtml(status.toLowerCase()) + '">' + storageThroughputAssistantEscapeHtml(status) + '</span>',
      '  </div>',
      '  <p class="muted">' + storageThroughputAssistantEscapeHtml(primaryRisk) + '</p>',
      '  <div class="scopedlabs-result-summary-grid">',
      '    <div class="scopedlabs-result-summary-item"><strong>RECOMMENDATION</strong><span>' + storageThroughputAssistantEscapeHtml(recommendation) + '</span></div>',
      '    <div class="scopedlabs-result-summary-item"><strong>CONFIDENCE</strong><span>' + storageThroughputAssistantEscapeHtml(confidence) + '</span></div>',
      '    <div class="scopedlabs-result-summary-item"><strong>DECISION FLAGS</strong><span>' + storageThroughputAssistantEscapeHtml(flags) + '</span></div>',
      '    <div class="scopedlabs-result-summary-item"><strong>PRIMARY RISK</strong><span>' + storageThroughputAssistantEscapeHtml(primaryRisk) + '</span></div>',
      '  </div>',
      '  <p class="scopedlabs-result-summary-note">Carry this Storage Throughput result into VM Density. Do not treat the Compute plan as complete until density checks validate the same ' + storageThroughputAssistantEscapeHtml(workload) + ' assumptions.</p>',
      '</div>'
    ].join("");
  }

function renderComputeRamRecommendationReferences(data) {
    data = data || {};
    const values = ramAssistantCompactLine(data);
    const reserve = ramAssistantValue(data, ["reserveRamGb", "reserveGb"], Math.max(values.required - values.demand, 0));
    const reserveRatio = ramPct(data.reserveRatio);
    const cpuCoupling = data.cpuCoupling || "Validate against CPU, storage, and workload density next."; 

    return [
      '<table class="compute-recommendation-references-table">',
      '  <thead><tr><th>Marker</th><th>Reference</th><th>Reason</th></tr></thead>',
      '  <tbody>',
      '    <tr><td>*1</td><td>Demand basis</td><td>' + ramAssistantEscapeHtml(ramAssistantGb(values.demand, 1) + " current memory demand before reserve pressure is added.") + '</td></tr>',
      '    <tr><td>*2</td><td>Reserve pressure</td><td>' + ramAssistantEscapeHtml(ramAssistantGb(values.required, 1) + " required after " + ramAssistantGb(reserve, 1) + " of reserve/cache allocation.") + '</td></tr>',
      '    <tr><td>*3</td><td>Downstream validation</td><td>' + ramAssistantEscapeHtml("Installed tier " + ramAssistantGb(values.installed, 0) + " | Reserve ratio " + reserveRatio + ". " + cpuCoupling) + '</td></tr>',
      '  </tbody>',
      '</table>'
    ].join("");
  }

  function ramRecommendedActionRows(data) {
    data = data || {};
    const status = ramStatusLabel(data.status);
    const values = ramAssistantCompactLine(data);
    const workload = data.workloadLabel || workloadLabel(data.workload) || "active workload";
    const concurrency = cpuNumber(data.concurrency, 0);
    const perProc = ramAssistantValue(data, ["perProc", "perProcessRamGb", "perProcessGb"], 0);

    if (status === "RISK") {
      return [
        { action: "Increase installed RAM before continuing", reason: "Required RAM is " + ramAssistantGb(values.required, 1) + " against a " + ramAssistantGb(values.installed, 0) + " installed tier. Resolve the memory edge before treating storage or density results as valid." },
        { action: "Reduce concurrency or per-process memory pressure", reason: "The active " + workload + " plan uses " + concurrency + " processes / VMs at about " + ramAssistantGb(perProc, 1) + " each before overhead and reserve." },
        { action: "Review cache and reserve assumptions", reason: "Reserve pressure can move quickly on memory-heavy workloads. Confirm cache/buffer behavior before locking the RAM tier." },
        { action: "Recalculate RAM before downstream validation", reason: "Storage IOPS, throughput, and VM density should use the corrected RAM baseline, not the current Risk state." }
      ];
    }

    if (status === "WATCH") {
      return [
        { action: "Validate RAM margin before procurement", reason: "The RAM plan is usable but reserve margin is tightening. Confirm whether " + ramAssistantGb(values.headroom, 1) + " of remaining headroom is acceptable." },
        { action: "Confirm cache/buffer pool behavior", reason: "The current headroom target may be enough for planning, but memory-heavy services can consume reserve faster than expected." },
        { action: "Keep RAM flagged through Storage IOPS", reason: "Continue downstream, but carry RAM as a watch item until storage and density checks validate the same workload assumptions." },
        { action: "Recheck RAM if workload assumptions change", reason: "Concurrency, per-process footprint, planner branch, and upstream CPU context can all shift the required RAM tier." }
      ];
    }

    return [
      { action: "Carry RAM baseline into Storage IOPS", reason: "The RAM envelope is inside the current planning range, so storage validation should use this memory baseline." },
      { action: "Preserve CPU and RAM assumptions together", reason: "Keep workload type, concurrency, CPU status, RAM reserve, and planner context attached so downstream results stay defensible." },
      { action: "Recheck RAM if density changes", reason: "VM density, GPU branch decisions, or workload growth can move memory pressure back into Watch or Risk." }
    ];
  }

  function renderComputeRamRecommendedActions(data) {
    const rows = ramRecommendedActionRows(data).map(function (item) {
      return '<div class="compute-recommended-action"><strong>' + ramAssistantEscapeHtml(item.action || "Review RAM plan") + '</strong><span>' + ramAssistantEscapeHtml(item.reason || "Engineering review required.") + '</span></div>';
    });

    return '<div class="compute-recommended-actions-list">' + (rows.length ? rows.join("") : '<div class="compute-recommended-action"><strong>No corrective actions generated</strong><span>Run the RAM calculation again to refresh recommendations.</span></div>') + '</div>';
  }

  function ramDecisionScheduleRows(data) {
    data = data || {};
    const status = ramStatusLabel(data.status);
    const values = ramAssistantCompactLine(data);
    const reserve = ramAssistantValue(data, ["reserveRamGb", "reserveGb"], Math.max(values.required - values.demand, 0));
    const reserveRatio = ramPct(data.reserveRatio);
    const dominant = data.dominantConstraint || (status === "RISK" ? "Installed memory edge" : status === "WATCH" ? "Reserve margin" : "Within RAM envelope");
    const authority = "ram-capacity-envelope";
    const interpretation = status === "RISK"
      ? "RAM demand is at or beyond the current installed tier. Correct the memory baseline before downstream validation."
      : status === "WATCH"
        ? "RAM is usable but tightening. Carry this as a watch item through storage and density checks."
        : "RAM sizing fits the active workload assumptions with workable headroom.";

    return {
      status,
      authority,
      interpretation,
      rows: [
        { group: "Capacity", metric: "Status", value: status, note: "Readiness of this RAM result before it is carried into Storage IOPS." },
        { group: "Demand", metric: "Demand RAM", value: ramAssistantGb(values.demand, 1), note: "Current memory demand before reserve/cache pressure is added." },
        { group: "Reserve", metric: "Reserve / Cache", value: ramAssistantGb(reserve, 1), note: "Memory margin added for cache, buffers, and operating reserve." },
        { group: "Capacity", metric: "Required RAM", value: ramAssistantGb(values.required, 1), note: "Total RAM required after reserve/cache allocation." },
        { group: "Recommendation", metric: "Installed RAM Tier", value: ramAssistantGb(values.installed, 0), note: "Recommended installed RAM tier carried forward into the Compute planning path." },
        { group: "Capacity", metric: "Remaining Headroom", value: ramAssistantGb(values.headroom, 1), note: "Headroom remaining at the recommended installed RAM tier." },
        { group: "Pressure", metric: "Reserve Ratio", value: reserveRatio, note: "Reserve pressure signal used by the RAM assistant and downstream validation." },
        { group: "Authority", metric: "Status Authority", value: authority, note: "The chart, summary, and assistant should use this status source." },
        { group: "Constraint", metric: "Primary Constraint", value: dominant, note: "Main RAM planning pressure behind the recommendation." }
      ]
    };
  }

  function ramDecisionStatusClass(status) {
    const value = ramStatusLabel(status);
    if (value === "RISK") return "is-risk";
    if (value === "WATCH") return "is-watch";
    if (value === "GOOD") return "is-good";
    return "is-review";
  }


  function ramDecisionScheduleValueCell(row, status) {
    const value = row && row.value != null ? row.value : "";
    if (row && row.metric === "Status") {
      return '<span class="scopedlabs-result-summary-status ' + ramDecisionStatusClass(status) + '">' + ramAssistantEscapeHtml(value) + '</span>';
    }

    return '<strong>' + ramAssistantEscapeHtml(value) + '</strong>';
  }
  function renderComputeRamDecisionSchedule(data) {
    const schedule = ramDecisionScheduleRows(data);
    const rows = schedule.rows.map(function (row) {
      return '<tr><td>' + ramAssistantEscapeHtml(row.group) + '</td><td>' + ramAssistantEscapeHtml(row.metric) + '</td><td>' + ramDecisionScheduleValueCell(row, schedule.status) + '</td><td>' + ramAssistantEscapeHtml(row.note) + '</td></tr>';
    }).join("");

    return [
      '<div class="compute-decision-schedule-status">',
      '  <div><strong>' + ramAssistantEscapeHtml(schedule.status) + ' RAM Capacity Envelope</strong><span>' + ramAssistantEscapeHtml(schedule.interpretation) + '</span></div>',
      '  <div class="scopedlabs-result-summary-status ' + ramDecisionStatusClass(schedule.status) + '">' + ramAssistantEscapeHtml(schedule.status) + '</div>',
      '</div>',
      '<table class="compute-decision-schedule-table">',
      '  <thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead>',
      '  <tbody>' + rows + '</tbody>',
      '</table>',
      '<p class="compute-decision-schedule-interpretation"><strong>Engineering Interpretation:</strong> ' + ramAssistantEscapeHtml(schedule.interpretation) + '</p>'
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
    if (toolSlug === "ram-sizing" && data) {
      mount.innerHTML = renderComputeRamTopSummaryCard(data);
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
    renderStorageThroughputAssistantStatusCard: renderComputeStorageThroughputAssistantStatusCard,
    renderRamRecommendationReferences: renderComputeRamRecommendationReferences,
    renderRamRecommendedActions: renderComputeRamRecommendedActions,
    renderRamDecisionSchedule: renderComputeRamDecisionSchedule,
    mountCpuSizing,
    clear: clearAssistant
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();

// compute-assistant-vm-density-status-card-0706
(function () {
  var api = Object.assign({}, window.ScopedLabsComputeAssistant || {});
  if (api.renderVmDensityAssistantStatusCard) {
    window.ScopedLabsComputeAssistant = api;
    return;
  }

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function statusClass(status) {
    var value = String(status || "").toUpperCase();
    if (value === "RISK" || value === "BLOCKED") return "risk";
    if (value === "WATCH" || value === "REVIEW") return "watch";
    return "good";
  }

  function renderVmDensityAssistantStatusCard(target, result) {
    var mount = typeof target === "string" ? document.getElementById(target) : target;
    if (!mount) return false;

    var status = result.status || result.summaryStatus || "GOOD";
    var outputs = result.outputs || result || {};
    var routing = result.plannerRouting || {};
    var branches = result.specialtyBranchCandidates || routing.specialtyBranchCandidates || [];
    var gold = result.futureGoldTierDependencies || [];
    var recommendation = result.guidance || (result.assistantRecommendation && result.assistantRecommendation.recommendation) || "Validate host density before continuing downstream.";

    mount.innerHTML = [
      '<div class="compute-assistant-card compute-vm-density-assistant-card" data-compute-vm-density-assistant-0706>',
      '<div class="compute-assistant-card__head">',
      '<div><h3>Assistant Recommended Actions</h3><p>VM Density routing is based on host density, limiting resource, spare policy, and downstream Compute branches.</p></div>',
      '<span class="scopedlabs-result-summary-status ' + esc(statusClass(status)) + '">' + esc(status) + '</span>',
      '</div>',
      '<p>' + esc(recommendation) + '</p>',
      '<div class="compute-recommended-actions-list">',
      '<div><strong>Validate density limiter</strong><span>Current limiter: ' + esc(outputs.limiting || result.limiting || "Balanced") + '.</span></div>',
      '<div><strong>Confirm next Compute step</strong><span>Route hint: ' + esc(result.plannerRouteHint || routing.routeIntent || "continue-to-power-thermal") + '.</span></div>',
      '<div><strong>Preserve branch choices</strong><span>' + esc(branches.map(function (item) { return item.tool; }).join(", ") || "No specialty branches flagged") + '.</span></div>',
      '</div>',
      gold.length ? '<p class="muted mini-note">Future Gold-tier handoff notes: ' + esc(gold.map(function (item) { return item.area || item.tool || item; }).join(", ")) + '.</p>' : '',
      '</div>'
    ].join("");

    return true;
  }

  api.renderVmDensityAssistantStatusCard = renderVmDensityAssistantStatusCard;
  window.ScopedLabsComputeAssistant = api;
})();


/* compute-assistant-vm-density-ram-shell-renderers-0706 */
(() => {
  "use strict";
  const api = Object.assign({}, window.ScopedLabsComputeAssistant || {});
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const row = (label, value) => '<div class="result-row"><span class="k">' + esc(label) + '</span><span class="v">' + esc(value ?? "Not set") + '</span></div>';

  
  /* compute-assistant-vm-density-summary-card-0706 */
  api.renderVmDensitySummaryCard = function renderVmDensitySummaryCard(result) {
    const outputs = result.outputs || {};
    const inputs = result.inputs || {};
    const status = String(outputs.status || result.status || "REVIEW").toUpperCase();
    const modeled = Number.isFinite(Number(outputs.vms ?? outputs.modeledVmCapacity)) ? Number(outputs.vms ?? outputs.modeledVmCapacity) : 0;
    const demand = Number.isFinite(Number(outputs.growthAdjustedVmDemand ?? inputs.targetVmCount)) ? Number(outputs.growthAdjustedVmDemand ?? inputs.targetVmCount) : modeled;
    const limiter = outputs.limiting || outputs.primaryConstraint || "Balanced";
    const gap = modeled - demand;
    const recommendation = status === "RISK"
      ? "Rework the density target before continuing to Power / Thermal validation."
      : "Carry this VM Density result into Power / Thermal validation.";

    return '<div class="compute-result-shell">' +
      '<h3 class="h3" style="margin-top:0; text-transform:uppercase; letter-spacing:.05em;">VM Density</h3>' +
      '<div style="font-weight:800; margin-bottom:14px;">' + esc(status) + '</div>' +
      '<p class="muted">' + esc(recommendation) + '</p>' +
      '<div class="results-grid">' +
        row("Recommendation", recommendation) +
        row("Confidence", status === "RISK" ? "MEDIUM" : "HIGH") +
        row("Decision Flags", "Modeled " + modeled + " VMs | Demand " + demand + " VMs | Gap " + gap + " VMs") +
        row("Primary Risk", limiter + " is the active density limiter.") +
      '</div>' +
      '<p class="muted" style="border-left:3px solid rgba(47,255,128,.75); padding-left:12px; margin-top:14px;">Carry this VM Density result into Power / Thermal. Do not treat the Compute plan as complete until power and thermal load are validated.</p>' +
    '</div>';
  };

api.renderVmDensityRecommendationReferences = function renderVmDensityRecommendationReferences(result) {
    const outputs = result.outputs || {};
    const inputs = result.inputs || {};
    return '<div class="results-grid">' +
      row("*1 Modeled density", (outputs.vms ?? "Not set") + " VMs modeled from CPU/RAM pool and reserve policy") +
      row("*2 Demand basis", (outputs.growthAdjustedVmDemand ?? "Not set") + " growth-adjusted VMs; target " + (inputs.targetVmCount || "not set")) +
      row("*3 Validation limiter", (outputs.limiting || "Balanced") + " limiter; " + (outputs.crossCheck || "cross-check pending")) +
      '</div>';
  };

  api.renderVmDensityRecommendedActions = function renderVmDensityRecommendedActions(result) {
    const status = String(result.status || result.summaryStatus || "WATCH").toUpperCase();
    const outputs = result.outputs || {};
    const flags = Array.isArray(result.planningPressureFlags) ? result.planningPressureFlags : [];
    const primary = status === "RISK"
      ? "Rework density before continuing to power and thermal planning."
      : status === "WATCH"
        ? "Validate reserve policy, noisy-neighbor behavior, and storage pressure before locking density."
        : "Density assumptions are acceptable for the next Compute planning step.";
    return '<p class="muted">' + esc(result.guidance || primary) + '</p>' +
      '<div class="results-grid">' +
      row("Recommendation", primary) +
      row("Primary Constraint", outputs.limiting || "Balanced") +
      row("Capacity Gap", typeof outputs.capacityGapVms === "number" ? outputs.capacityGapVms + " VMs" : "Not set") +
      row("Planning Flags", flags.length ? flags.join(", ") : "None") +
      '</div>';
  };

  api.renderVmDensityDecisionSchedule = function renderVmDensityDecisionSchedule(result) {
    const outputs = result.outputs || {};
    const routing = result.plannerRouting || {};
    return '<div class="results-grid">' +
      row("Status", String(result.status || result.summaryStatus || "WATCH").toUpperCase()) +
      row("Modeled VM Capacity", outputs.vms !== undefined ? outputs.vms + " VMs" : "Not set") +
      row("Growth Demand", outputs.growthAdjustedVmDemand !== undefined ? outputs.growthAdjustedVmDemand + " VMs" : "Not set") +
      row("Next Step", routing.nextTool || "power-thermal") +
      row("Route Hint", result.plannerRouteHint || routing.routeIntent || "continue-to-power-thermal") +
      '</div>';
  };
  window.ScopedLabsComputeAssistant = api;
})();
