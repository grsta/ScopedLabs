const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const STEP = "gpu-vram";
const CATEGORY = "compute";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿(() => {
  const $ = (id) => document.getElementById(id);

  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "compute";
  const CURRENT_STEP = "gpu-vram";

  let hasResult = false;
  let cachedFlow = null;
  let upstreamContext = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    gpuMode: $("gpuMode"),
    modelGb: $("modelGb"),
    batch: $("batch"),
    perSampleMb: $("perSampleMb"),
    jobs: $("jobs"),
    overhead: $("overhead"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

  function refreshFlowNote() {
    cachedFlow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      cachedFlow,
      title: "System Context",
      intro:
        "This step confirms whether GPU acceleration is actually required, and if so whether memory capacity becomes the first hardware ceiling.",
      customRows: (() => {
        const source = ScopedLabsAnalyzer.getUpstreamFlow({
          flowKey: FLOW_KEY,
          category: CURRENT_CATEGORY,
          step: CURRENT_STEP,
          cachedFlow
        });

        upstreamContext = source ? (source.data || {}) : null;

        if (!source || !source.data) return null;

        const data = source.data;
        const rows = [];

        if (typeof data.vms === "number") {
          rows.push({ label: "VM Capacity", value: `${data.vms}` });
        }

        if (typeof data.densityClass === "string") {
          rows.push({ label: "Density Class", value: data.densityClass });
        }

        if (typeof data.crossCheck === "string") {
          rows.push({ label: "Cross-Check", value: data.crossCheck });
        }

        if (typeof data.status === "string") {
          rows.push({ label: "Upstream Status", value: data.status });
        }

        return rows.length ? rows : null;
      })()
    });
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continue,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      emptyMessage: "Run calculation."
    });

    hasResult = false;
    refreshFlowNote();
  }

  function calcCpuOnly() {
    const summaryRows = [
      { label: "GPU Requirement", value: "Not Required" },
      { label: "Execution Mode", value: "CPU-only" },
      { label: "VRAM Required", value: "0.00 GB" }
    ];

    let crossCheck = "No GPU path is required for the current workload assumption";
    if (upstreamContext && typeof upstreamContext.densityClass === "string" && upstreamContext.densityClass.includes("High")) {
      crossCheck = "Platform density is elevated, but GPU capacity is still not the primary modeled requirement";
    }

    const derivedRows = [
      { label: "Hardware Path", value: "CPU + RAM design remains sufficient" },
      { label: "Cross-Check", value: crossCheck },
      { label: "Acceleration Pressure", value: "None" }
    ];

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows,
      derivedRows,
      status: "HEALTHY",
      interpretation:
        "The current workload profile does not justify a dedicated GPU memory envelope. CPU, RAM, and storage remain the meaningful sizing drivers.",
      dominantConstraint: "No GPU dependency",
      guidance:
        "Keep the platform CPU-only unless model size, inference concurrency, or rendering behavior changes enough to justify a GPU path later.",
      chart: null
    });

    ScopedLabsAnalyzer.writeFlow(FLOW_KEY, {
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      data: {
        gpu: "none",
        vram: 0,
        status: "HEALTHY",
        gpuRequired: false
      }
    });

    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continue);
    hasResult = true;
  }

  function calcGpuMode() {
    const modelGb = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.modelGb.value, 0));
    const batch = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.batch.value, 1));
    const perSampleMb = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.perSampleMb.value, 0));
    const jobs = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.jobs.value, 1));
    const overhead = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.overhead.value, 0));

    const batchMemGb = (batch * perSampleMb) / 1024;
    const jobFootprintGb = modelGb + batchMemGb;
    const rawTotalGb = jobFootprintGb * jobs;
    const totalGb = rawTotalGb * (1 + overhead / 100);
    const reserveGb = totalGb - rawTotalGb;

    const capacityPressure = ScopedLabsAnalyzer.clamp((totalGb / 24) * 100, 0, 180);
    const concurrencyPressure = ScopedLabsAnalyzer.clamp((jobs / 4) * 100, 0, 180);
    const batchPressure = ScopedLabsAnalyzer.clamp((batchMemGb / Math.max(modelGb + 0.5, 0.5)) * 100 * 1.25, 0, 180);

    const metrics = [
      {
        label: "Capacity Pressure",
        value: capacityPressure,
        displayValue: `${Math.round(capacityPressure)}%`
      },
      {
        label: "Concurrency Pressure",
        value: concurrencyPressure,
        displayValue: `${Math.round(concurrencyPressure)}%`
      },
      {
        label: "Batch Pressure",
        value: batchPressure,
        displayValue: `${Math.round(batchPressure)}%`
      }
    ];

    const compositeScore = Math.round(
      (capacityPressure * 0.50) +
      (concurrencyPressure * 0.30) +
      (batchPressure * 0.20)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let gpuClass = "Balanced GPU demand";
    if (totalGb > 16) gpuClass = "High VRAM demand";
    if (totalGb > 40) gpuClass = "Extreme VRAM demand";

    let dominantConstraint = "Balanced GPU profile";
    if (analyzer.dominant.label === "Capacity Pressure") {
      dominantConstraint = "GPU memory ceiling";
    } else if (analyzer.dominant.label === "Concurrency Pressure") {
      dominantConstraint = "Concurrent job density";
    } else if (analyzer.dominant.label === "Batch Pressure") {
      dominantConstraint = "Per-batch activation growth";
    }

    let crossCheck = "GPU demand appears aligned with the modeled compute profile";
    if (upstreamContext && typeof upstreamContext.status === "string" && upstreamContext.status === "RISK" && analyzer.status !== "RISK") {
      crossCheck = "The upstream compute profile may still tighten before VRAM becomes the first practical bottleneck";
    } else if (jobs >= 4 && totalGb < 16) {
      crossCheck = "Concurrency is elevated, but the per-job footprint remains relatively compact";
    } else if (batch >= 16 && totalGb > 24) {
      crossCheck = "Batch scaling is materially increasing activation memory and compressing upgrade headroom";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The GPU workload is crowding its usable VRAM envelope too tightly. Model residency, activation growth, or concurrent job demand will begin collapsing execution margin before the rest of the system reaches balance.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The GPU workload is workable, but memory reserve is tightening. The design should run, although larger batches, heavier models, or more concurrent jobs will reduce upgrade headroom faster than the raw VRAM number suggests.";
    } else {
      interpretation =
        "The GPU memory requirement remains inside a manageable operating envelope. Current model size, batch footprint, and concurrency still leave usable reserve before VRAM becomes the first likely scaling wall.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Maintain the current model and job profile, but track future batch growth and concurrency expansion. The first pressure increase will usually appear in VRAM reserve before it appears in raw compute throughput.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate card selection, multi-GPU strategy, and future batch growth before locking hardware. Watch what fails first: batch expansion, model size growth, or job concurrency.";
    } else {
      guidance =
        `Rework the GPU plan before continuing. The primary limiter is ${dominantConstraint.toLowerCase()}, so execution headroom will collapse there first. Reduce batch size, lower concurrency, optimize model footprint, or move to a higher-VRAM GPU class.`;
    }

    const summaryRows = [
      { label: "Model Footprint", value: `${modelGb.toFixed(2)} GB` },
      { label: "Batch Memory", value: `${batchMemGb.toFixed(2)} GB` },
      { label: "Per-Job Footprint", value: `${jobFootprintGb.toFixed(2)} GB` },
      { label: "Concurrent Jobs", value: `${jobs}` },
      { label: "Reserve / Overhead", value: `${reserveGb.toFixed(2)} GB` },
      { label: "VRAM Required", value: `${totalGb.toFixed(2)} GB` }
    ];

    const derivedRows = [
      { label: "GPU Class", value: gpuClass },
      { label: "Cross-Check", value: crossCheck },
      { label: "Acceleration Path", value: "GPU-required workload" }
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
        axisTitle: "GPU VRAM Stress Magnitude",
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

    ScopedLabsAnalyzer.writeFlow(FLOW_KEY, {
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      data: {
        gpu: "required",
        vram: totalGb,
        gpuClass,
        crossCheck,
        status: analyzer.status,
        gpuRequired: true
      }
    });

    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continue);
    hasResult = true;
  }

  function calc() {
    const mode = els.gpuMode.value;

    if (mode === "no") {
      calcCpuOnly();
      return;
    }

    calcGpuMode();
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.gpuMode.value = "no";
    els.modelGb.value = 8;
    els.batch.value = 4;
    els.perSampleMb.value = 200;
    els.jobs.value = 2;
    els.overhead.value = 20;
    invalidate();
  });

  ["gpuMode", "modelGb", "batch", "perSampleMb", "jobs", "overhead"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/compute/power-thermal/";
  });

  refreshFlowNote();
  ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continue);
})();


function renderFlowNote() {
  // TODO: implement upstream flow-note carry-over
}


window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});


function hasStoredAuth() {
  try {
    const k = Object.keys(localStorage).find((x) => x.startsWith("sb-"));
    if (!k) return false;
    const raw = JSON.parse(localStorage.getItem(k));
    return !!(
      raw?.access_token ||
      raw?.currentSession?.access_token ||
      (Array.isArray(raw) ? raw[0]?.access_token : null)
    );
  } catch {
    return false;
  }
}


function getUnlockedCategories() {
  try {
    const raw = localStorage.getItem("sl_unlocked_categories");
    if (!raw) return [];
    return raw.split(",").map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  } catch {
    return [];
  }
}


function unlockCategoryPage() {
  const body = document.body;
  const category = String(body?.dataset?.category || "").trim().toLowerCase();
  const signedIn = hasStoredAuth();
  const unlocked = getUnlockedCategories().includes(category);

  const lockedCard = document.getElementById("lockedCard");
  const toolCard = document.getElementById("toolCard");

  if (signedIn && unlocked) {
    if (lockedCard) lockedCard.style.display = "none";
    if (toolCard) toolCard.style.display = "";
    return true;
  }

  if (lockedCard) lockedCard.style.display = "";
  if (toolCard) toolCard.style.display = "none";
  return false;
}
