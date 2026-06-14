(function () {
  "use strict";

  const VERSION = "scopedlabs-compute-assistant-contract-001";

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

  function mountCpuSizing() {
    if (!isComputeShellPage() || getStep() !== "cpu-sizing") return false;

    const mount = document.querySelector("[data-compute-assistant-mount]");
    const card = document.querySelector("[data-compute-assistant-card]");
    if (!mount || !card) return false;

    const flow = readFlow("cpu-sizing");
    const data = flow && flow.data ? flow.data : null;

    if (!data) {
      if (window.ScopedLabsLocalAssistant && typeof window.ScopedLabsLocalAssistant.clear === "function") {
        window.ScopedLabsLocalAssistant.clear(mount);
      } else {
        mount.innerHTML = "";
      }
      card.hidden = true;
      return false;
    }

    const status = data.status || "PENDING";
    const logical = Number(data.cores || 0);
    const physical = Number(data.physicalCores || 0);
    const effective = Number(data.eff || 0);
    const workload = data.workload || inputValue("workload", "general");
    const smt = inputValue("smt", "on");
    const target = inputValue("targetUtil", "70");
    const peak = inputValue("peak", "1.25");
    const concurrency = inputValue("concurrency", "");
    const cpuPerWorker = inputValue("cpuPerWorker", "");

    const model = {
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
        "SMT mode: " + (smt === "on" ? "logical cores counted" : "physical cores only")
      ],
      actions: actionList(status, data),
      sections: [
        {
          title: "CPU sizing output",
          body:
            "Recommended logical cores: " +
            (logical ? logical + " cores" : "not calculated") +
            ". Recommended physical cores: " +
            (physical ? physical + " cores" : "not calculated") +
            ". Effective CPU demand: " +
            (Number.isFinite(effective) ? effective.toFixed(2) + " cores" : "not calculated") +
            "."
        },
        {
          title: "Before RAM sizing",
          body:
            "Use this CPU result as the Compute baseline for the next step. RAM sizing should validate whether memory pressure becomes the next practical limiter after CPU demand is established."
        }
      ]
    };

    if (window.ScopedLabsLocalAssistant && typeof window.ScopedLabsLocalAssistant.mount === "function") {
      window.ScopedLabsLocalAssistant.mount(mount, model);
    } else {
      mount.innerHTML =
        '<div class="scopedlabs-local-assistant-card scopedlabs-local-assistant-card--rich">' +
        '<h2>CPU Design Assistant</h2>' +
        '<p class="muted">' + model.summary + '</p>' +
        '</div>';
      card.hidden = false;
    }

    card.hidden = false;
    return true;
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

    window.setTimeout(mountCpuSizing, 120);
  }

  window.ScopedLabsComputeAssistant = Object.freeze({
    version: VERSION,
    mountCpuSizing,
    clear: clearAssistant
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();