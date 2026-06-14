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

  function cpuResultSection(data) {
    const status = String(data.status || "PENDING").toUpperCase();
    const logical = Number(data.cores || 0);
    const physical = Number(data.physicalCores || 0);
    const effective = Number(data.eff || 0);

    return {
      title: "CPU Result Readout",
      body: "This is the current CPU sizing result saved for the active Compute planning path.",
      items: [
        "Status: " + status,
        "Recommended logical cores: " + logical,
        "Estimated physical cores: " + physical,
        "Effective CPU demand: " + effective.toFixed(2) + " cores",
        "Primary constraint: " + titleCase(data.primaryConstraint || data.constraint || "CPU capacity")
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
    const status = data.status || "PENDING";
    const workload = data.workload || inputValue("workload", "general");
    const smt = inputValue("smt", "on");
    const target = inputValue("targetUtil", "70");
    const peak = inputValue("peak", "1.25");
    const concurrency = inputValue("concurrency", "");
    const cpuPerWorker = inputValue("cpuPerWorker", "");
    const saved = savedToolResult("cpu-sizing");

    return {
      category: "compute",
      tool: "cpu-sizing",
      title: "CPU Design Assistant",
      kicker: "Compute Assistant",
      status,
      summary: statusSummary(status),
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
        "Saved to active workload: " + (saved ? "Yes" : "Not confirmed")
      ],
      actions: actionList(status, data),
      sections: [
        workloadContextSection("CPU Sizing"),
        cpuResultSection(data),
        nextStepSection(status)
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

  function renderToolAssistant(config) {
    config = config || {};

    const mount = config.mount || document.querySelector("[data-compute-assistant-mount]");
    const card = config.card || document.querySelector("[data-compute-assistant-card]");
    if (!mount || !card) return false;

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