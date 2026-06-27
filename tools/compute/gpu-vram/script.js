(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "gpu-vram";
  const LANE = "v1";
  const PREVIOUS_STEP = "vm-density";
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

  function hideLegacyResultsSource() {
    if (els.results) {
      els.results.hidden = true;
      els.results.setAttribute("aria-hidden", "true");
      els.results.setAttribute("aria-live", "off");
      els.results.setAttribute("data-compute-legacy-results-source", "true");
      els.results.setAttribute("data-compute-ledger-source", "true");
      if (els.results.classList && !els.results.classList.contains("compute-legacy-results-source")) {
        els.results.classList.add("compute-legacy-results-source");
      }
    }

    if (els.analysisCopy) {
      els.analysisCopy.hidden = true;
      els.analysisCopy.style.display = "none";
      els.analysisCopy.setAttribute("aria-hidden", "true");
      els.analysisCopy.setAttribute("data-compute-legacy-analysis-source", "true");
      if (els.analysisCopy.classList && !els.analysisCopy.classList.contains("compute-legacy-analysis-source")) {
        els.analysisCopy.classList.add("compute-legacy-analysis-source");
      }
    }
  }

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

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
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
    hideLegacyResultsSource();
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["power-thermal"]);
      sessionStorage.removeItem(FLOW_KEYS["raid-rebuild-time"]);
      sessionStorage.removeItem(FLOW_KEYS["backup-window"]);
    } catch {}

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      flowKey: FLOW_KEYS[STEP],
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Run calculation."
    });

    hideContinue();
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

    saveComputeLedgerResult({
      label: "GPU VRAM",
      summary: "GPU not required for this workload path",
      status: "HEALTHY",
      summaryStatus: "HEALTHY",
      keySavedResult: "No GPU required / HEALTHY",
      outputs: {
        gpu: "none",
        vram: 0,
        gpuRequired: false
      }
    });

    showContinue();
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

    saveComputeLedgerResult({
      label: "GPU VRAM",
      summary: totalGb.toFixed(1) + " GB VRAM required; " + gpuClass,
      status: analyzer.status,
      summaryStatus: analyzer.status,
      keySavedResult: totalGb.toFixed(1) + " GB VRAM / " + analyzer.status,
      outputs: {
        gpu: "required",
        vram: totalGb,
        gpuClass,
        crossCheck,
        gpuRequired: true
      }
    });

    showContinue();
  }

  function calculate() {
    const mode = els.gpuMode.value;

    if (mode === "no") {
      calcCpuOnly();
      return;
    }

    calcGpuMode();
  }

  els.calc.addEventListener("click", calculate);

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

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    const unlocked = unlockCategoryPage();
    if (!unlocked) return;

    refreshFlowNote();
    hideContinue();
  });
})();


/* ScopedLabs GPU VRAM engineering planning inputs 0621 */
(function () {
  const MARKER = "ScopedLabsComputeGpuVramEngineeringInputs0621";

  if (window[MARKER]) return;
  window[MARKER] = true;

  const $gpuEng = (id) => document.getElementById(id);

  function numberValue(id, fallback) {
    const el = $gpuEng(id);
    if (!el) return fallback;
    const parsed = Number(el.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function textValue(id, fallback) {
    const el = $gpuEng(id);
    return el && typeof el.value === "string" ? el.value : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function precisionMultiplier(mode) {
    const map = {
      manual: 1,
      fp32: 1,
      fp16: 0.55,
      int8: 0.32,
      int4: 0.22
    };
    return map[mode] || 1;
  }

  function modelCopyFactor(mode, jobs, replicas) {
    if (mode === "modelSplit") return Math.max(1 / Math.max(1, replicas), 0.2);
    if (mode === "replicated") return Math.max(1, replicas);
    if (mode === "dataParallel") return Math.max(1, replicas, jobs);
    return Math.max(1, replicas);
  }

  function sharingPenalty(mode) {
    const map = {
      dedicated: 1,
      shared: 1.08,
      mig: 1.05,
      oversubscribed: 1.18
    };
    return map[mode] || 1;
  }

  function statusForPressure(pressure) {
    if (pressure <= 0.7) return "GOOD";
    if (pressure <= 0.9) return "WATCH";
    return "RISK";
  }

  function statusClass(status) {
    return String(status || "").toLowerCase();
  }

  function gb(value) {
    return `${Number(value || 0).toFixed(1)} GB`;
  }

  function pct(value) {
    return `${Math.round(Number(value || 0) * 100)}%`;
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readGpuEngineeringInputs() {
    return {
      modelGb: numberValue("modelGb", 0),
      batch: numberValue("batch", 1),
      perSampleMb: numberValue("perSampleMb", 0),
      jobs: Math.max(1, numberValue("jobs", 1)),
      overheadPct: clamp(numberValue("overhead", 0), 0, 500),
      installedVramGb: Math.max(1, numberValue("installedVramGb", 24)),
      targetUtilizationPct: clamp(numberValue("targetUtilization", 85), 1, 100),
      displayReserveGb: Math.max(0, numberValue("displayReserveGb", 0)),
      precisionMode: textValue("precisionMode", "manual"),
      parallelismMode: textValue("parallelismMode", "shared"),
      replicaCount: Math.max(1, numberValue("replicaCount", 1)),
      growthReservePct: Math.max(0, numberValue("growthReserve", 0)),
      kvCacheGb: Math.max(0, numberValue("kvCacheGb", 0)),
      checkpointReserveGb: Math.max(0, numberValue("checkpointReserveGb", 0)),
      failoverMultiplier: Math.max(1, numberValue("failoverMultiplier", 1)),
      gpuSharingMode: textValue("gpuSharingMode", "dedicated")
    };
  }

  function buildGpuEngineeringPlan() {
    const input = readGpuEngineeringInputs();

    const precisionFactor = precisionMultiplier(input.precisionMode);
    const copyFactor = modelCopyFactor(input.parallelismMode, input.jobs, input.replicaCount);
    const sharingFactor = sharingPenalty(input.gpuSharingMode);

    const adjustedModelGb = input.modelGb * precisionFactor;
    const modelFootprintGb = adjustedModelGb * copyFactor;
    const batchActivationGb = (input.batch * input.perSampleMb * input.jobs) / 1024;
    const runtimeCacheGb = input.kvCacheGb * input.jobs;
    const workspaceGb = input.checkpointReserveGb * Math.max(1, input.replicaCount);

    const rawDemandGb = modelFootprintGb + batchActivationGb + runtimeCacheGb + workspaceGb;
    const overheadGb = rawDemandGb * (input.overheadPct / 100);
    const reserveAdjustedGb = (rawDemandGb + overheadGb) * (1 + input.growthReservePct / 100);
    const requiredVramGb = reserveAdjustedGb * input.failoverMultiplier * sharingFactor;

    const usableVramGb = Math.max(0, (input.installedVramGb - input.displayReserveGb) * (input.targetUtilizationPct / 100));
    const capacityPressure = usableVramGb > 0 ? requiredVramGb / usableVramGb : 99;
    const installedPressure = input.installedVramGb > 0 ? requiredVramGb / input.installedVramGb : 99;
    const status = statusForPressure(capacityPressure);

    let guidance = "GPU VRAM capacity has usable headroom under the current engineering assumptions.";
    if (status === "WATCH") {
      guidance = "GPU VRAM capacity is near the planning edge. Validate peak batch, cache, and replica assumptions before committing hardware.";
    }
    if (status === "RISK") {
      guidance = "GPU VRAM demand exceeds the planning envelope. Reduce concurrency/batch/cache pressure or plan a larger GPU allocation.";
    }

    if (input.gpuSharingMode === "oversubscribed") {
      guidance += " Oversubscribed GPU sharing adds extra allocation risk.";
    }

    return {
      input,
      adjustedModelGb,
      modelFootprintGb,
      batchActivationGb,
      runtimeCacheGb,
      workspaceGb,
      rawDemandGb,
      overheadGb,
      requiredVramGb,
      usableVramGb,
      installedPressure,
      capacityPressure,
      status,
      guidance
    };
  }

  function envelopeSvg(plan) {
    const max = Math.max(plan.input.installedVramGb, plan.usableVramGb, plan.requiredVramGb, plan.rawDemandGb, 1);
    const scaleMax = max * 1.18;
    const width = 760;
    const height = 430;
    const plot = { x: 72, y: 104, w: 606, h: 224 };
    const xDemand = plot.x + 115;
    const xRequired = plot.x + 305;
    const xUsable = plot.x + 492;
    const status = String(plan.status || "WATCH").toUpperCase();
    const statusFill = status === "RISK" ? "rgba(239,68,68,.13)" : status === "WATCH" ? "rgba(250,204,21,.12)" : "rgba(44,255,155,.12)";
    const statusColor = status === "RISK" ? "#ff4d5a" : status === "WATCH" ? "#facc15" : "#2cff9b";

    function y(value) {
      const n = Number(value || 0);
      return plot.y + plot.h - ((n / scaleMax) * plot.h);
    }

    function safeY(value) {
      return Math.max(plot.y, Math.min(plot.y + plot.h, y(value)));
    }

    function marker(point) {
      return [
        '<g data-ref="' + escapeHtml(point.ref) + '" tabindex="0" role="img" aria-label="' + escapeHtml(point.ref + " - " + point.detail) + '">',
        '<title>' + escapeHtml(point.ref + " - " + point.detail) + '</title>',
        '<path d="M' + point.x.toFixed(1) + ' ' + point.y.toFixed(1) + ' V' + (plot.y + plot.h) + '" class="ref-line"/>',
        '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="7" class="marker-ring"/>',
        '<circle cx="' + point.x.toFixed(1) + '" cy="' + point.y.toFixed(1) + '" r="4.8" class="marker-' + point.tone + '"/>',
        '</g>'
      ].join("");
    }

    const demandY = safeY(plan.rawDemandGb);
    const requiredY = safeY(plan.requiredVramGb);
    const usableY = safeY(plan.usableVramGb);
    const installedY = safeY(plan.input.installedVramGb);
    const riskY = safeY(plan.usableVramGb * 0.9);
    const watchY = safeY(plan.usableVramGb * 0.7);

    const riskZoneH = Math.max(0, plot.y + plot.h - riskY);
    const watchZoneH = Math.max(0, riskY - watchY);
    const goodZoneH = Math.max(0, watchY - plot.y);

    const points = [
      {
        ref: "*1",
        tone: "current",
        label: "Demand",
        x: xDemand,
        y: demandY,
        detail: "Raw model, batch, runtime cache, checkpoint, and workspace demand before reserve multipliers."
      },
      {
        ref: "*2",
        tone: "growth",
        label: "Required",
        x: xRequired,
        y: requiredY,
        detail: "Required VRAM after precision, parallelism, growth reserve, failover, and sharing assumptions."
      }
    ];

    const yTicks = [0, 0.25, 0.5, 0.75, 1].map(function (ratio) {
      const yy = plot.y + plot.h - (plot.h * ratio);
      const value = scaleMax * ratio;
      const major = ratio === 0 || ratio === 0.5 || ratio === 1;
      return [
        '<path d="M' + plot.x + ' ' + yy.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="' + (major ? "grid-major" : "grid") + '"/>',
        '<text x="' + (plot.x - 12) + '" y="' + (yy + 3).toFixed(1) + '" text-anchor="end" class="tick">' + escapeHtml(gb(value)) + '</text>'
      ].join("");
    }).join("");

    const xTicks = points.map(function (point) {
      return [
        '<path d="M' + point.x.toFixed(1) + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="grid"/>',
        '<text x="' + point.x.toFixed(1) + '" y="' + (plot.y + plot.h + 22) + '" text-anchor="middle" class="tick">' + escapeHtml(point.label) + '</text>'
      ].join("");
    }).join("");

    const curvePath = "M" + xDemand.toFixed(1) + " " + demandY.toFixed(1) +
      " C" + (xDemand + 80).toFixed(1) + " " + demandY.toFixed(1) + ", " +
      (xRequired - 80).toFixed(1) + " " + requiredY.toFixed(1) + ", " +
      xRequired.toFixed(1) + " " + requiredY.toFixed(1);

    return [
      '<svg data-export-svg="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" width="100%" role="img" aria-label="GPU VRAM Capacity Envelope analytic graph" data-compute-visual="gpu-vram-capacity-envelope" data-compute-capacity-visual="gpu-vram-envelope">',
      '<defs>',
      '<linearGradient id="computeGpuEnvelopeBg0622" x1="0" y1="0" x2="0" y2="1">',
      '<stop offset="0%" stop-color="#07110f"/>',
      '<stop offset="100%" stop-color="#040b09"/>',
      '</linearGradient>',
      '<style>',
      '.plot-bg{fill:url(#computeGpuEnvelopeBg0622)}.plot-frame{fill:rgba(255,255,255,.012);stroke:rgba(44,255,155,.20);stroke-width:1}.zone-good{fill:rgba(44,255,155,.055)}.zone-watch{fill:rgba(250,204,21,.055)}.zone-risk{fill:rgba(239,68,68,.06)}.grid{fill:none;stroke:rgba(238,246,255,.08);stroke-width:1}.grid-major{fill:none;stroke:rgba(238,246,255,.14);stroke-width:1}.axis{fill:none;stroke:rgba(238,246,255,.42);stroke-width:1.2;stroke-linecap:round;stroke-linejoin:round}.tick{fill:rgba(203,213,225,.90);font-family:Inter,Arial,Helvetica,sans-serif;font-size:10px;font-weight:700}.axis-label{fill:rgba(203,213,225,.92);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:750;letter-spacing:.5px}.header{fill:#eef6ff;font-family:Inter,Arial,Helvetica,sans-serif;font-size:18px;font-weight:900;letter-spacing:.5px}.subhead{fill:rgba(203,213,225,.86);font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:650}.capacity-line{fill:none;stroke:#2cff9b;stroke-width:1.6;stroke-linecap:round}.capacity-rail-dot{fill:#2cff9b;stroke:#04110d;stroke-width:1.1}.installed-line{fill:none;stroke:rgba(203,213,225,.55);stroke-width:1;stroke-dasharray:6 5}.watch-line{fill:none;stroke:rgba(250,204,21,.70);stroke-width:1;stroke-dasharray:5 5}.risk-line{fill:none;stroke:rgba(255,77,90,.82);stroke-width:1;stroke-dasharray:5 5}.curve-shadow{fill:none;stroke:rgba(44,255,155,.22);stroke-width:4;stroke-linecap:round;stroke-linejoin:round}.curve{fill:none;stroke:#2cff9b;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round}.marker-current{fill:#38d9ff;stroke:#04110d;stroke-width:1.2}.marker-growth{fill:#a78bfa;stroke:#04110d;stroke-width:1.2}.marker-capacity{fill:#2cff9b;stroke:#04110d;stroke-width:1.2}.marker-failover{fill:#f59e0b;stroke:#04110d;stroke-width:1.2}.marker-ring{fill:none;stroke:rgba(238,246,255,.72);stroke-width:1}.ref-line{fill:none;stroke:rgba(238,246,255,.16);stroke-width:1;stroke-dasharray:4 4}.rail-label{fill:rgba(203,213,225,.82);font-family:Inter,Arial,Helvetica,sans-serif;font-size:9px;font-weight:750}.status-chip{stroke-width:1}.status-text{font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:.7px}.band-label-good{fill:#2cff9b;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:.5px}.threshold-label-risk{fill:#ff4d5a;font-family:Inter,Arial,Helvetica,sans-serif;font-size:9px;font-weight:850;letter-spacing:.35px}.threshold-label-watch{fill:#facc15;font-family:Inter,Arial,Helvetica,sans-serif;font-size:9px;font-weight:850;letter-spacing:.35px}.band-label-watch{fill:#facc15;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:.5px}.band-label-risk{fill:#ff4d5a;font-family:Inter,Arial,Helvetica,sans-serif;font-size:11px;font-weight:900;letter-spacing:.5px}',
      '</style>',
      '</defs>',
      '<rect width="' + width + '" height="' + height + '" rx="18" class="plot-bg"/>',
      '<text x="50" y="56" class="header">GPU VRAM CAPACITY ENVELOPE</text>',
      '<text x="50" y="76" class="subhead">Demand curve vs usable GPU VRAM planning capacity</text>',
      '<rect x="632" y="38" width="64" height="28" rx="3" fill="' + statusFill + '" stroke="' + statusColor + '" class="status-chip"/>',
      '<text x="664" y="57" text-anchor="middle" fill="' + statusColor + '" class="status-text">' + escapeHtml(status) + '</text>',
      '<rect x="' + plot.x + '" y="' + riskY.toFixed(1) + '" width="' + plot.w + '" height="' + riskZoneH.toFixed(1) + '" class="zone-risk"/>',
      '<rect x="' + plot.x + '" y="' + watchY.toFixed(1) + '" width="' + plot.w + '" height="' + watchZoneH.toFixed(1) + '" class="zone-watch"/>',
      '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + goodZoneH.toFixed(1) + '" class="zone-good"/>',
      '<rect x="' + plot.x + '" y="' + plot.y + '" width="' + plot.w + '" height="' + plot.h + '" class="plot-frame"/>',
      yTicks,
      xTicks,
      '<path d="M' + plot.x + ' ' + plot.y + ' V' + (plot.y + plot.h) + '" class="axis"/>',
      '<path d="M' + plot.x + ' ' + (plot.y + plot.h) + ' H' + (plot.x + plot.w) + '" class="axis"/>',
      '<path d="M' + plot.x + ' ' + riskY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="risk-line"/>',
      '<text x="' + (plot.x + plot.w - 6) + '" y="' + (riskY - 6).toFixed(1) + '" text-anchor="end" class="threshold-label-risk">risk threshold</text>',
      '<path d="M' + plot.x + ' ' + watchY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="watch-line"/>',
      '<text x="' + (plot.x + plot.w - 6) + '" y="' + (watchY - 6).toFixed(1) + '" text-anchor="end" class="threshold-label-watch">watch threshold</text>',
      '<path d="M' + plot.x + ' ' + usableY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="capacity-line"/>',
      '<circle cx="' + (plot.x + plot.w - 8).toFixed(1) + '" cy="' + usableY.toFixed(1) + '" r="3.6" class="capacity-rail-dot"/>',
      '<path d="M' + plot.x + ' ' + installedY.toFixed(1) + ' H' + (plot.x + plot.w) + '" class="installed-line"/>',
      '<text x="' + (plot.x + 18) + '" y="' + (plot.y + 20) + '" class="band-label-risk">RISK</text>',
      '<text x="' + (plot.x + 18) + '" y="' + (watchY - 8).toFixed(1) + '" class="band-label-watch">WATCH</text>',
      '<text x="' + (plot.x + 18) + '" y="' + (plot.y + plot.h - 16) + '" class="band-label-good">GOOD</text>',
      '<text x="' + (plot.x + plot.w - 4) + '" y="' + (usableY - 7).toFixed(1) + '" text-anchor="end" class="rail-label">usable planning rail</text>',
      '<text x="' + (plot.x + plot.w - 4) + '" y="' + (installedY - 7).toFixed(1) + '" text-anchor="end" class="rail-label">installed VRAM rail</text>',
      '<path d="' + curvePath + '" class="curve-shadow"/>',
      '<path d="' + curvePath + '" class="curve"/>',
      points.map(marker).join(""),
      '<text x="50" y="407" class="axis-label">Capacity edge: watch at 70% of usable VRAM, risk at 90%</text>',
      '</svg>'
    ].join("");
  }

  function renderGpuEngineeringPlan() {
    const summary = $gpuEng("computeGpuEngineeringSummary");
    const envelope = $gpuEng("computeGpuEnvelope");
    const visualCard = $gpuEng("computeGpuVisualCard");
    const visualShell = $gpuEng("computeGpuVisual");
    if (!summary || !envelope) return null;

    const plan = buildGpuEngineeringPlan();

    if (visualCard) visualCard.hidden = false;
    if (visualShell) visualShell.hidden = false;
    summary.hidden = false;
    envelope.hidden = false;

    summary.innerHTML = `
      <div class="compute-gpu-engineering-summary__top">
        <div>
          <h3>GPU VRAM engineering result</h3>
          <p>${escapeHtml(plan.guidance)}</p>
        </div>
        <span class="compute-gpu-status-chip is-${statusClass(plan.status)}">${escapeHtml(plan.status)}</span>
      </div>

      <div class="compute-gpu-engineering-grid">
        <div class="compute-gpu-engineering-metric">
          <span>Raw demand</span>
          <strong>${gb(plan.rawDemandGb)}</strong>
        </div>
        <div class="compute-gpu-engineering-metric">
          <span>Required VRAM</span>
          <strong>${gb(plan.requiredVramGb)}</strong>
        </div>
        <div class="compute-gpu-engineering-metric">
          <span>Usable VRAM</span>
          <strong>${gb(plan.usableVramGb)}</strong>
        </div>
        <div class="compute-gpu-engineering-metric">
          <span>Capacity pressure</span>
          <strong>${pct(plan.capacityPressure)}</strong>
        </div>
      </div>
    `;

    envelope.innerHTML = envelopeSvg(plan);

    try {
      window.dispatchEvent(new CustomEvent("scopedlabs:compute-gpu-vram-plan-rendered", {
        detail: { plan }
      }));
    } catch (err) {}

    const analysis = $gpuEng("analysis-copy");
    if (analysis) {
      const base = analysis.textContent || "";
      const line = `Engineering GPU VRAM plan: ${plan.status} ? required ${gb(plan.requiredVramGb)} against usable ${gb(plan.usableVramGb)}.`;
      if (!base.includes("Engineering GPU VRAM plan:")) {
        analysis.textContent = base ? `${base} ${line}` : line;
      } else {
        analysis.textContent = base.replace(/Engineering GPU VRAM plan:[^.]*(?:\.|$)/, line);
      }
    }

    try {
      sessionStorage.setItem("scopedlabs.compute.gpu-vram.engineeringPlan", JSON.stringify({
        tool: "gpu-vram",
        status: plan.status,
        rawDemandGb: Number(plan.rawDemandGb.toFixed(3)),
        requiredVramGb: Number(plan.requiredVramGb.toFixed(3)),
        usableVramGb: Number(plan.usableVramGb.toFixed(3)),
        installedVramGb: Number(plan.input.installedVramGb.toFixed(3)),
        capacityPressure: Number(plan.capacityPressure.toFixed(4)),
        precisionMode: plan.input.precisionMode,
        parallelismMode: plan.input.parallelismMode,
        gpuSharingMode: plan.input.gpuSharingMode
      }));
    } catch (err) {}

    return plan;
  }

  function clearGpuEngineeringPlan() {
    const summary = $gpuEng("computeGpuEngineeringSummary");
    const envelope = $gpuEng("computeGpuEnvelope");

    if (summary) {
      summary.hidden = true;
      summary.innerHTML = "";
    }

    if (envelope) {
      envelope.hidden = true;
      envelope.innerHTML = "";
    }

    try {
      sessionStorage.removeItem("scopedlabs.compute.gpu-vram.engineeringPlan");
    } catch (err) {}
  }

  function bindGpuEngineeringInputs() {
    const calc = $gpuEng("calc");
    const reset = $gpuEng("reset");

    if (calc) {
      calc.addEventListener("click", function () {
        window.setTimeout(renderGpuEngineeringPlan, 0);
      });
    }

    if (reset) {
      reset.addEventListener("click", function () {
        window.setTimeout(clearGpuEngineeringPlan, 0);
      });
    }

    [
      "installedVramGb",
      "targetUtilization",
      "displayReserveGb",
      "precisionMode",
      "parallelismMode",
      "replicaCount",
      "growthReserve",
      "kvCacheGb",
      "checkpointReserveGb",
      "failoverMultiplier",
      "gpuSharingMode"
    ].forEach(function (id) {
      const el = $gpuEng(id);
      if (!el) return;

      el.addEventListener("input", function () {
        clearGpuEngineeringPlan();
        if (typeof invalidate === "function") {
          try { invalidate(); } catch (err) {}
        }
      });

      el.addEventListener("change", function () {
        clearGpuEngineeringPlan();
        if (typeof invalidate === "function") {
          try { invalidate(); } catch (err) {}
        }
      });
    });
  }

  window.ScopedLabsComputeGpuVramEngineeringInputs = {
    readInputs: readGpuEngineeringInputs,
    buildPlan: buildGpuEngineeringPlan,
    render: renderGpuEngineeringPlan,
    clear: clearGpuEngineeringPlan
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindGpuEngineeringInputs);
  } else {
    bindGpuEngineeringInputs();
  }
})();


/* ScopedLabs GPU VRAM shell proof bridge 0621 */
(function () {
  const MARKER = "ScopedLabsComputeGpuVramShellProof0621";
  if (window[MARKER]) return;
  window[MARKER] = true;

  const $gpuShell = (id) => document.getElementById(id);

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function gb(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n.toFixed(1) + " GB" : "?";
  }

  function pct(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? Math.round(n * 100) + "%" : "?";
  }

  function currentPlan() {
    if (window.ScopedLabsComputeGpuVramEngineeringInputs && typeof window.ScopedLabsComputeGpuVramEngineeringInputs.buildPlan === "function") {
      try {
        return window.ScopedLabsComputeGpuVramEngineeringInputs.buildPlan();
      } catch (err) {}
    }

    try {
      const raw = sessionStorage.getItem("scopedlabs.compute.gpu-vram.engineeringPlan");
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function statusTone(status) {
    return String(status || "WATCH").toLowerCase();
  }

  function renderLedger(plan) {
    const mount = $gpuShell("computeInternalResultsLedger");
    if (!mount || !plan) return;

    mount.hidden = true;
    mount.innerHTML = JSON.stringify({
      tool: "gpu-vram",
      status: plan.status,
      rawDemandGb: Number(plan.rawDemandGb || 0),
      requiredVramGb: Number(plan.requiredVramGb || 0),
      usableVramGb: Number(plan.usableVramGb || 0),
      installedVramGb: Number((plan.input && plan.input.installedVramGb) || plan.installedVramGb || 0),
      capacityPressure: Number(plan.capacityPressure || 0),
      shellProof: "0621"
    });
  }

  function renderAssistant(plan) {
    const card = $gpuShell("computeAssistantCard");
    const mount = $gpuShell("computeAssistantMount");
    if (!card || !mount || !plan) return;

    card.hidden = false;

    const status = escapeHtml(plan.status || "WATCH");
    const tone = statusTone(status);
    const required = gb(plan.requiredVramGb);
    const usable = gb(plan.usableVramGb);
    const pressure = pct(plan.capacityPressure);
    const sharing = escapeHtml((plan.input && plan.input.gpuSharingMode) || "dedicated");
    const precision = escapeHtml((plan.input && plan.input.precisionMode) || "manual");
    const parallelism = escapeHtml((plan.input && plan.input.parallelismMode) || "shared");

    mount.innerHTML = `
      <article class="scopedlabs-result-summary-card">
        <div class="scopedlabs-result-summary-top">
          <div>
            <div class="scopedlabs-result-summary-title">GPU VRAM planning assistant</div>
            <div class="scopedlabs-result-summary-subtitle">Reviews demand, usable capacity, reserves, precision, sharing, and failover assumptions.</div>
          </div>
          <span class="scopedlabs-result-summary-status is-${tone}">${status}</span>
        </div>
        <div class="scopedlabs-result-summary-grid">
          <div class="scopedlabs-result-summary-item">
            <span>Required VRAM</span>
            <strong>${required}</strong>
          </div>
          <div class="scopedlabs-result-summary-item">
            <span>Usable VRAM</span>
            <strong>${usable}</strong>
          </div>
          <div class="scopedlabs-result-summary-item">
            <span>Capacity pressure</span>
            <strong>${pressure}</strong>
          </div>
          <div class="scopedlabs-result-summary-item">
            <span>GPU profile</span>
            <strong>${precision} / ${parallelism} / ${sharing}</strong>
          </div>
        </div>
        <p class="scopedlabs-result-summary-action">${escapeHtml(plan.guidance || "Validate GPU capacity assumptions before final hardware selection.")}</p>
      </article>
    `;
  }

  function renderReferences(plan) {
    const card = $gpuShell("computeGpuReferencesCard");
    const mount = $gpuShell("computeGpuReferences");
    if (!card || !mount || !plan) return;

    card.hidden = false;
    mount.innerHTML = [
      '<table class="compute-gpu-reference-table">',
      '<thead><tr><th>Marker</th><th>Reference</th><th>Reason</th></tr></thead>',
      '<tbody>',
      '<tr><td><span class="compute-gpu-ref-marker is-demand">*1</span></td><td><strong>Demand basis</strong></td><td>Raw GPU memory demand from model/workload footprint, batch/sample activation pressure, concurrent jobs, runtime cache, checkpoint, workspace, and overhead assumptions.</td></tr>',
      '<tr><td><span class="compute-gpu-ref-marker is-required">*2</span></td><td><strong>Required/status-driving point</strong></td><td>Required VRAM is the plotted status-driving point after precision, parallelism, growth reserve, failover, and sharing assumptions are applied. This is the point compared against the watch/risk thresholds.</td></tr>',
      '<tr><td><span class="compute-gpu-ref-marker is-capacity">*3</span></td><td><strong>Capacity rail context</strong></td><td>Usable and installed VRAM remain horizontal capacity rails. Validate framework allocation, KV/cache behavior, replica count, precision mode, GPU sharing mode, and display/OS reserve before committing GPU hardware.</td></tr>',
      '</tbody>',
      '</table>'
    ].join("");
  }

  function renderActions(plan) {
    const card = $gpuShell("computeGpuRecommendedActionsCard");
    const mount = $gpuShell("computeGpuRecommendedActions");
    if (!card || !mount || !plan) return;

    card.hidden = false;

    const status = String(plan.status || "WATCH").toUpperCase();
    let actions = [
      {
        title: "Validate GPU memory assumptions",
        detail: "Run a representative batch, cache, and concurrency test before locking the GPU allocation."
      },
      {
        title: "Preserve the GPU VRAM assumptions",
        detail: "Keep precision, parallelism, replica count, reserve, and sharing assumptions attached to the report."
      },
      {
        title: "Carry GPU status downstream",
        detail: "Use this GPU VRAM result when reviewing VM density, power/thermal, and final Compute summary."
      }
    ];

    if (status === "WATCH") {
      actions = [
        {
          title: "Validate model, batch, and cache pressure",
          detail: "Required VRAM is near the usable planning rail. Confirm peak batch, KV/cache reserve, and concurrent job behavior before locking hardware."
        },
        {
          title: "Protect the target utilization margin",
          detail: "Consider lowering target utilization or increasing installed/allocated VRAM if growth, failover, or shared GPU use is likely."
        },
        {
          title: "Benchmark the representative workload",
          detail: "Run a sample workload on the target GPU class to confirm real framework allocation and runtime cache behavior."
        },
        {
          title: "Carry WATCH into downstream validation",
          detail: "VM density, power/thermal, and final Compute summary should treat this GPU result as watch-state until validated."
        }
      ];
    }

    if (status === "RISK") {
      actions = [
        {
          title: "Increase GPU VRAM before continuing",
          detail: "Required VRAM exceeds the safe planning envelope. Move to a larger GPU allocation or reduce the workload pressure."
        },
        {
          title: "Reduce batch, cache, or concurrency pressure",
          detail: "Lower batch/sample activation memory, runtime cache, concurrent jobs, or replica count before accepting this result."
        },
        {
          title: "Recheck precision and sharing mode",
          detail: "Precision mode, model splitting, oversubscription, and display/OS reserve can materially change the VRAM envelope."
        },
        {
          title: "Recalculate before downstream validation",
          detail: "Do not treat VM density, power/thermal, or final Compute summary as valid until the GPU VRAM baseline is corrected."
        }
      ];
    }

    mount.innerHTML = '<div class="compute-gpu-proof-actions-list">' + actions.map(function (item) {
      return '<div class="compute-gpu-proof-action"><strong>' + escapeHtml(item.title) + '</strong><span>' + escapeHtml(item.detail) + '</span></div>';
    }).join("") + '</div>';
  }

  function renderSchedule(plan) {
    const card = $gpuShell("computeGpuDecisionScheduleCard");
    const mount = $gpuShell("computeGpuDecisionSchedule");
    if (!card || !mount || !plan) return;

    card.hidden = false;

    const status = String(plan.status || "WATCH").toUpperCase();
    const tone = status.toLowerCase();
    const pressure = pct(plan.capacityPressure);
    const required = gb(plan.requiredVramGb);
    const usable = gb(plan.usableVramGb);
    const raw = gb(plan.rawDemandGb);
    const installed = plan.input && plan.input.installedVramGb ? gb(plan.input.installedVramGb) : usable;

    let summary = "GPU VRAM demand is within the current usable planning rail. Continue downstream with the attached assumptions.";
    if (status === "WATCH") {
      summary = "GPU VRAM demand is near the planning edge. Validate batch, cache, replica, and growth assumptions before treating downstream results as final.";
    }
    if (status === "RISK") {
      summary = "GPU VRAM demand is at or beyond the planning envelope. Correct the GPU memory baseline before downstream validation.";
    }

    mount.innerHTML = [
      '<div class="compute-gpu-decision-summary is-' + escapeHtml(tone) + '">',
      '<div><strong>' + escapeHtml(status) + ' GPU VRAM Capacity Envelope</strong><span>' + escapeHtml(summary) + '</span></div>',
      '<span class="compute-gpu-decision-chip is-' + escapeHtml(tone) + '">' + escapeHtml(status) + '</span>',
      '</div>',
      '<table class="compute-gpu-decision-table">',
      '<thead><tr><th>Group</th><th>Metric</th><th>Value</th><th>Engineering Note</th></tr></thead>',
      '<tbody>',
      '<tr><td>Capacity</td><td>Status</td><td><span class="compute-gpu-decision-chip is-' + escapeHtml(tone) + '">' + escapeHtml(status) + '</span></td><td>Readiness of this GPU VRAM result before it is carried into VM density, power/thermal, and summary.</td></tr>',
      '<tr><td>Demand</td><td>Raw demand</td><td><strong>' + escapeHtml(raw) + '</strong></td><td>Model/workload memory before reserve, failover, and sharing pressure are applied.</td></tr>',
      '<tr><td>Required</td><td>Required VRAM</td><td><strong>' + escapeHtml(required) + '</strong></td><td>Status-driving point compared against the usable planning rail and watch/risk thresholds.</td></tr>',
      '<tr><td>Capacity</td><td>Usable VRAM</td><td><strong>' + escapeHtml(usable) + '</strong></td><td>Planning capacity after display/OS reserve and target utilization are applied.</td></tr>',
      '<tr><td>Hardware</td><td>Installed / allocated VRAM</td><td><strong>' + escapeHtml(installed) + '</strong></td><td>Hardware or allocation rail that should be verified against the selected GPU class.</td></tr>',
      '<tr><td>Pressure</td><td>Capacity pressure</td><td><strong>' + escapeHtml(pressure) + '</strong></td><td>Watch begins at 70% of usable VRAM; risk begins at 90%.</td></tr>',
      '</tbody>',
      '</table>'
    ].join("");
  }

  function renderProofSectionsFromPlan(plan) {
    if (!plan) return;

    renderReferences(plan);
    renderActions(plan);
    renderSchedule(plan);
  }

  function renderShellProof() {
    hideLegacyResultsSource();
    const plan = currentPlan();
    if (!plan) return;

    renderLedger(plan);
    renderAssistant(plan);
    renderProofSectionsFromPlan(plan);
  }

  function clearShellProof() {
    hideLegacyResultsSource();
    [
      "computeAssistantCard",
      "computeGpuVisualCard",
      "computeGpuEngineeringSummary",
      "computeGpuEnvelope",
      "computeGpuReferencesCard",
      "computeGpuRecommendedActionsCard",
      "computeGpuDecisionScheduleCard"
    ].forEach(function (id) {
      const el = $gpuShell(id);
      if (!el) return;
      el.hidden = true;
    });

    [
      "computeAssistantMount",
      "computeGpuReferences",
      "computeGpuRecommendedActions",
      "computeGpuDecisionSchedule",
      "computeInternalResultsLedger"
    ].forEach(function (id) {
      const el = $gpuShell(id);
      if (el) el.innerHTML = "";
    });
  }

  function bind() {
    const calc = $gpuShell("calc");
    const reset = $gpuShell("reset");

    if (calc) {
      calc.addEventListener("click", function () {
        window.setTimeout(renderShellProof, 20);
      });
    }

    if (reset) {
      reset.addEventListener("click", function () {
        window.setTimeout(clearShellProof, 0);
      });
    }

    window.addEventListener("scopedlabs:compute-gpu-vram-plan-rendered", function (event) {
      const plan = event && event.detail && event.detail.plan ? event.detail.plan : currentPlan();
      renderProofSectionsFromPlan(plan);
    });

    [
      "modelGb",
      "batch",
      "perSampleMb",
      "jobs",
      "overhead",
      "installedVramGb",
      "targetUtilization",
      "displayReserveGb",
      "precisionMode",
      "parallelismMode",
      "replicaCount",
      "growthReserve",
      "kvCacheGb",
      "checkpointReserveGb",
      "failoverMultiplier",
      "gpuSharingMode"
    ].forEach(function (id) {
      const el = $gpuShell(id);
      if (!el) return;
      el.addEventListener("input", clearShellProof);
      el.addEventListener("change", clearShellProof);
    });
  }

  window.ScopedLabsComputeGpuVramShellProof = {
    render: renderShellProof,
    clear: clearShellProof
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();



/* ScopedLabs GPU VRAM export parity 0624K */
(function () {
  const MARKER = "ScopedLabsComputeGpuVramExport0624K";
  if (window[MARKER]) return;
  window[MARKER] = true;

  function safeText(value) {
    return String(value == null ? "" : value);
  }

  function compactText(value) {
    const text = safeText(value);
    let out = "";
    let wasSpace = false;

    for (let i = 0; i < text.length; i += 1) {
      const code = text.charCodeAt(i);
      const isSpace = code <= 32;

      if (isSpace) {
        if (!wasSpace && out) out += " ";
        wasSpace = true;
      } else {
        out += text[i];
        wasSpace = false;
      }
    }

    return out.trim();
  }

  function gb(value) {
    const n = Number(value || 0);
    return Number.isFinite(n) ? n.toFixed(1) + " GB" : "";
  }

  function pct(value) {
    const n = Number(value || 0);
    if (!Number.isFinite(n)) return "";
    return Math.round(n * 100) + "%";
  }

  function currentPlan() {
    if (window.ScopedLabsComputeGpuVramEngineeringInputs &&
        typeof window.ScopedLabsComputeGpuVramEngineeringInputs.buildPlan === "function") {
      try {
        return window.ScopedLabsComputeGpuVramEngineeringInputs.buildPlan();
      } catch (err) {}
    }

    try {
      const raw = sessionStorage.getItem("scopedlabs.compute.gpu-vram.engineeringPlan");
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function domTable(selector) {
    const table = document.querySelector(selector);
    if (!table) return null;

    const headers = Array.from(table.querySelectorAll("thead th"))
      .map(function (cell) {
        return compactText(cell.textContent);
      })
      .filter(Boolean);

    const rows = Array.from(table.querySelectorAll("tbody tr")).map(function (row) {
      return Array.from(row.querySelectorAll("th,td")).map(function (cell) {
        return compactText(cell.textContent);
      });
    }).filter(function (row) {
      return row.some(Boolean);
    });

    if (!headers.length && !rows.length) return null;
    return { headers: headers, rows: rows };
  }

  function plainCell(value) {
    return { text: safeText(value || "") };
  }

  function valueCell(value) {
    return { text: safeText(value || ""), style: "font-weight:700;color:#0f172a;" };
  }

  function noteCell(value) {
    return { text: safeText(value || ""), style: "font-weight:700;color:#0f172a;" };
  }

  function chartSvg() {
    const svg = document.querySelector("#computeGpuEnvelope svg");
    return svg ? svg.outerHTML : "";
  }

  function inputRows(plan) {
    const input = plan && plan.input ? plan.input : {};

    return [
      { label: "Model / workload memory", value: gb(input.modelGb || plan.rawDemandGb || 0) },
      { label: "Installed / allocated VRAM", value: gb(input.installedVramGb || plan.installedVramGb || 0) },
      { label: "Target VRAM utilization", value: String(Math.round(Number(input.targetUtilization || 0) * 100 || 0)) + "%" },
      { label: "Precision / quantization", value: safeText(input.precisionMode || "manual") },
      { label: "Parallelism mode", value: safeText(input.parallelismMode || "shared") },
      { label: "Replica / model copy count", value: safeText(input.replicaCount || 1) },
      { label: "Growth reserve", value: String(Math.round(Number(input.growthReserve || 0) * 100 || 0)) + "%" },
      { label: "KV / runtime cache reserve", value: gb(input.kvCacheGb || 0) },
      { label: "Checkpoint / workspace reserve", value: gb(input.checkpointReserveGb || 0) },
      { label: "Failover multiplier", value: safeText(input.failoverMultiplier || 1) },
      { label: "GPU sharing mode", value: safeText(input.gpuSharingMode || "dedicated") }
    ];
  }

  function outputRows(plan) {
    const status = String(plan && plan.status ? plan.status : "WATCH").toUpperCase();

    return [
      { label: "GPU VRAM Status", value: status },
      { label: "Raw Demand", value: gb(plan.rawDemandGb) },
      { label: "Required VRAM", value: gb(plan.requiredVramGb) },
      { label: "Usable VRAM", value: gb(plan.usableVramGb) },
      { label: "Installed / Allocated VRAM", value: gb((plan.input && plan.input.installedVramGb) || plan.installedVramGb || 0) },
      { label: "Capacity Pressure", value: pct(plan.capacityPressure) },
      { label: "Engineering Interpretation", value: safeText(plan.guidance || "Validate GPU VRAM capacity assumptions before final hardware selection.") }
    ];
  }

  function visualExportSection(plan) {
    const svg = chartSvg();

    return {
      title: "GPU VRAM Capacity Envelope",
      description: "Demand curve versus usable GPU VRAM planning capacity, including demand basis, required/status-driving point, usable/installed rails, and the active GPU VRAM envelope status." + (plan.status ? " Status: " + plan.status + "." : ""),
      compactSvg: false,
      svgs: svg ? [svg] : []
    };
  }

  function referenceExportSection() {
    const table = domTable("#computeGpuReferences table.compute-gpu-reference-table");
    const referenceColumnWidths =
      window.ScopedLabsComputeExportProofTables &&
      typeof window.ScopedLabsComputeExportProofTables.widthsFor === "function"
        ? window.ScopedLabsComputeExportProofTables.widthsFor("recommendationReferences")
        : ["12%", "23%", "65%"];

    return {
      title: "Recommendation References",
      description: "Reference markers shown in the GPU VRAM Capacity Envelope and recommendation proof. These explain the demand basis, required/status-driving point, and capacity rail context.",
      tableClass: "extra-export-table--planner extra-export-table--decision",
      tables: [
        {
          headers: table && table.headers.length ? table.headers : ["Marker", "Reference", "Reason"],
          colWidths: referenceColumnWidths,
          rows: table && table.rows.length ? table.rows : [
            ["*1", "Demand basis", "Raw GPU memory demand from workload, batch, concurrency, cache, checkpoint, workspace, and overhead assumptions."],
            ["*2", "Required/status-driving point", "Required VRAM is the status-driving point compared against watch/risk thresholds."],
            ["*3", "Capacity rail context", "Usable and installed VRAM remain horizontal capacity rails for hardware validation."]
          ]
        }
      ]
    };
  }

  function actionRowsFromDom() {
    return Array.from(document.querySelectorAll("#computeGpuRecommendedActions .compute-gpu-proof-action")).map(function (item) {
      const title = item.querySelector("strong");
      const detail = item.querySelector("span");
      return [
        compactText(title ? title.textContent : "Review GPU VRAM plan"),
        compactText(detail ? detail.textContent : "Engineering review required.")
      ];
    }).filter(function (row) {
      return row.some(Boolean);
    });
  }

  function recommendedActionsExportSection() {
    const rows = actionRowsFromDom();

    return {
      title: "Recommended Actions",
      description: "Corrective or validation steps generated from the GPU VRAM Capacity Envelope status authority.",
      tableClass: "extra-export-table--planner extra-export-table--decision",
      tables: [
        {
          headers: ["Action", "Reason"],
          colWidths: ["34%", "66%"],
          rows: (rows.length ? rows : [
            ["Validate GPU memory assumptions", "Run a representative batch, cache, and concurrency test before locking the GPU allocation."]
          ]).map(function (row) {
            return [plainCell(row[0]), plainCell(row[1])];
          })
        }
      ]
    };
  }

  function decisionScheduleExportSection() {
    const table = domTable("#computeGpuDecisionSchedule table.compute-gpu-decision-table");

    return {
      title: "GPU VRAM Decision Schedule",
      description: "Decision checkpoints generated from the GPU VRAM sizing result.",
      tableClass: "extra-export-table--planner extra-export-table--decision",
      tables: [
        {
          headers: table && table.headers.length ? table.headers : ["Group", "Metric", "Value", "Engineering Note"],
          colWidths: ["16%", "22%", "18%", "44%"],
          rows: (table && table.rows.length ? table.rows : []).map(function (row) {
            const cols = Array.isArray(row) ? row : [];
            return [
              plainCell(cols[0] || ""),
              plainCell(cols[1] || ""),
              valueCell(cols[2] || ""),
              noteCell(cols[3] || "")
            ];
          })
        }
      ]
    };
  }

  function buildPayload(context) {
    const plan = currentPlan();
    if (!plan) return null;

    const options = context && context.options ? context.options : {};
    const outputs = outputRows(plan);

    const extraSections = [
      visualExportSection(plan),
      referenceExportSection(),
      recommendedActionsExportSection(),
      decisionScheduleExportSection()
    ].filter(Boolean);

    return {
      status: String(plan.status || "WATCH").toUpperCase(),
      summary: "GPU VRAM export generated from the latest calculated GPU VRAM Capacity Envelope result.",
      interpretation: safeText(plan.guidance || "Validate GPU VRAM capacity assumptions before final hardware selection."),
      inputs: inputRows(plan),
      outputs: outputs,
      chartImage: "",
      extraSections: extraSections,
      exportSectionsContract: "gpu-vram-visual-references-actions-schedule",
      assumptions: Array.isArray(options.assumptions) ? options.assumptions : [],
      printLowInkChart: false
    };
  }

  window.ScopedLabsComputeGpuVramExport = {
    buildPayload: buildPayload
  };

  window.addEventListener("scopedlabs:compute-gpu-vram-plan-rendered", function () {
    window.setTimeout(function () {
      if (window.ScopedLabsExport && typeof window.ScopedLabsExport.refresh === "function") {
        window.ScopedLabsExport.refresh();
      }
    }, 0);
  });
})();


/* ScopedLabs GPU VRAM export dynamic placement 0624M */
(function () {
  const MARKER = "ScopedLabsComputeGpuVramExportDynamicPlacement0624M";
  if (window[MARKER]) return;
  window[MARKER] = true;

  const INPUT_IDS = [
    "modelGb",
    "batch",
    "perSampleMb",
    "jobs",
    "overhead",
    "installedVramGb",
    "targetUtilization",
    "displayReserveGb",
    "precisionMode",
    "parallelismMode",
    "replicaCount",
    "growthReserve",
    "kvCacheGb",
    "checkpointReserveGb",
    "failoverMultiplier",
    "gpuSharingMode"
  ];

  function exportCard() {
    return document.querySelector(".compute-export-card");
  }

  function resetRow() {
    const reset = document.getElementById("reset");
    if (!reset) return null;
    return reset.closest(".btn-row") || reset.parentElement;
  }

  function flowActions() {
    return document.querySelector("[data-compute-flow-actions], .compute-flow-actions");
  }

  function decisionScheduleCard() {
    return document.getElementById("computeGpuDecisionScheduleCard");
  }

  function insertAfter(node, anchor) {
    if (!node || !anchor || !anchor.parentNode) return false;
    anchor.parentNode.insertBefore(node, anchor.nextSibling);
    return true;
  }

  function insertBefore(node, anchor) {
    if (!node || !anchor || !anchor.parentNode) return false;
    anchor.parentNode.insertBefore(node, anchor);
    return true;
  }

  function placeExportInInputs() {
    const card = exportCard();
    const row = resetRow();
    if (!card || !row) return false;
    return insertAfter(card, row);
  }

  function placeExportAfterProofStack() {
    const card = exportCard();
    if (!card) return false;

    const flow = flowActions();
    if (flow && !card.contains(flow) && insertBefore(card, flow)) return true;

    const schedule = decisionScheduleCard();
    if (schedule && insertAfter(card, schedule)) return true;

    return false;
  }

  function bindInputResetPlacement() {
    INPUT_IDS.forEach(function (id) {
      const el = document.getElementById(id);
      if (!el) return;

      el.addEventListener("input", function () {
        window.setTimeout(placeExportInInputs, 0);
      });

      el.addEventListener("change", function () {
        window.setTimeout(placeExportInInputs, 0);
      });
    });

    const reset = document.getElementById("reset");
    if (reset) {
      reset.addEventListener("click", function () {
        window.setTimeout(placeExportInInputs, 0);
      });
    }
  }

  function bind() {
    placeExportInInputs();
    bindInputResetPlacement();

    window.addEventListener("scopedlabs:compute-gpu-vram-plan-rendered", function () {
      window.setTimeout(placeExportAfterProofStack, 0);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }

  window.ScopedLabsComputeGpuVramExportPlacement = {
    placeInInputs: placeExportInInputs,
    placeAfterProofStack: placeExportAfterProofStack
  };
})();
