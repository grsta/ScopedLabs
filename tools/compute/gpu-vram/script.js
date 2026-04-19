(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "gpu-vram";
  const LANE = "v1";
  const PREVIOUS_STEP = "vm-density";

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
    reset: $("reset"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

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
    const category = String(document.body?.dataset?.category || "").trim().toLowerCase();
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }

  function refreshFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstreamContext = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstreamContext = null;
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstreamContext = null;
      return;
    }

    const data = parsed.data || {};
    upstreamContext = data;

    const lines = [];
    if (typeof data.vms === "number") lines.push(`VM Capacity: <strong>${data.vms}</strong>`);
    if (typeof data.densityClass === "string") lines.push(`Density Class: <strong>${data.densityClass}</strong>`);
    if (typeof data.crossCheck === "string") lines.push(`Cross-Check: <strong>${data.crossCheck}</strong>`);
    if (typeof data.status === "string") lines.push(`Upstream Status: <strong>${data.status}</strong>`);

    if (!lines.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      ${lines.join(" | ")}
      <br><br>
      This step checks whether acceleration is actually required and, if it is, whether VRAM becomes the first practical hardware ceiling for the workload profile already modeled upstream.
    `;
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["power-thermal"]);
      sessionStorage.removeItem(FLOW_KEYS["raid-rebuild-time"]);
      sessionStorage.removeItem(FLOW_KEYS["backup-window"]);
    } catch {}

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continue,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS[STEP],
      category: CATEGORY,
      step: STEP,
      lane: LANE,
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

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
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

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
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

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    unlockCategoryPage();
    setTimeout(() => {
      unlockCategoryPage();
    }, 400);

    refreshFlowNote();
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continue);
  });
})();