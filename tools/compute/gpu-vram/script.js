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
    const chartLeft = 70;
    const chartTop = 34;
    const chartWidth = 610;
    const chartHeight = 250;
    const xDemand = chartLeft + 120;
    const xRequired = chartLeft + 305;
    const xUsable = chartLeft + 490;

    function y(value) {
      return chartTop + chartHeight - ((value / scaleMax) * chartHeight);
    }

    const demandY = y(plan.rawDemandGb);
    const requiredY = y(plan.requiredVramGb);
    const usableY = y(plan.usableVramGb);
    const installedY = y(plan.input.installedVramGb);
    const riskY = y(plan.usableVramGb * 0.9);
    const watchY = y(plan.usableVramGb * 0.7);

    return `
      <svg viewBox="0 0 760 360" role="img" aria-label="GPU VRAM Capacity Envelope">
        <defs>
          <linearGradient id="gpuVramBg0621" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#0f172a"/>
            <stop offset="100%" stop-color="#020617"/>
          </linearGradient>
        </defs>
        <rect width="760" height="360" rx="18" fill="url(#gpuVramBg0621)"/>
        <g opacity="0.32" stroke="#334155" stroke-width="1">
          <path d="M70 54 H680"/>
          <path d="M70 104 H680"/>
          <path d="M70 154 H680"/>
          <path d="M70 204 H680"/>
          <path d="M70 254 H680"/>
          <path d="M70 304 H680"/>
          <path d="M190 34 V304"/>
          <path d="M375 34 V304"/>
          <path d="M560 34 V304"/>
        </g>

        <rect x="70" y="${riskY}" width="610" height="${Math.max(0, chartTop + chartHeight - riskY)}" fill="#ef4444" opacity="0.12"/>
        <rect x="70" y="${watchY}" width="610" height="${Math.max(0, riskY - watchY)}" fill="#f59e0b" opacity="0.12"/>
        <rect x="70" y="34" width="610" height="${Math.max(0, watchY - chartTop)}" fill="#22c55e" opacity="0.08"/>

        <line x1="70" y1="${installedY}" x2="680" y2="${installedY}" stroke="#94a3b8" stroke-width="2" stroke-dasharray="6 6" opacity="0.82"/>
        <line x1="70" y1="${usableY}" x2="680" y2="${usableY}" stroke="#22c55e" stroke-width="2" stroke-dasharray="10 6" opacity="0.86"/>

        <path d="M${xDemand} ${demandY} L${xRequired} ${requiredY}" fill="none" stroke="#38bdf8" stroke-width="3"/>

        <circle cx="${xDemand}" cy="${demandY}" r="7" fill="#38bdf8"/>
        <circle cx="${xRequired}" cy="${requiredY}" r="8" fill="#facc15"/>
        <circle cx="${xUsable}" cy="${usableY}" r="8" fill="#22c55e"/>
        <circle cx="${xUsable + 45}" cy="${installedY}" r="6" fill="#cbd5e1"/>

        <text x="70" y="24" fill="#e5eef8" font-size="15" font-weight="700">GPU VRAM Capacity Envelope</text>
        <text x="680" y="24" fill="#cbd5e1" font-size="11" text-anchor="end">Status: ${escapeHtml(plan.status)}</text>

        <text x="${xDemand}" y="326" fill="#94a3b8" font-size="11" text-anchor="middle">Raw demand</text>
        <text x="${xRequired}" y="326" fill="#94a3b8" font-size="11" text-anchor="middle">Required</text>
        <text x="${xUsable}" y="326" fill="#94a3b8" font-size="11" text-anchor="middle">Usable rail</text>

        <text x="${xDemand}" y="${demandY - 13}" fill="#e0f2fe" font-size="11" text-anchor="middle">${gb(plan.rawDemandGb)}</text>
        <text x="${xRequired}" y="${requiredY - 13}" fill="#fef3c7" font-size="11" text-anchor="middle">${gb(plan.requiredVramGb)}</text>
        <text x="${xUsable}" y="${usableY - 13}" fill="#bbf7d0" font-size="11" text-anchor="middle">${gb(plan.usableVramGb)}</text>
        <text x="${xUsable + 45}" y="${installedY - 13}" fill="#e2e8f0" font-size="11" text-anchor="middle">Installed ${gb(plan.input.installedVramGb)}</text>

        <text x="74" y="${installedY - 8}" fill="#94a3b8" font-size="10">installed VRAM rail</text>
        <text x="74" y="${usableY - 8}" fill="#86efac" font-size="10">usable planning rail</text>
      </svg>
    `;
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
    mount.innerHTML = `
      <table>
        <tbody>
          <tr>
            <th>*1 demand basis</th>
            <td>Required VRAM combines base model/workload memory, batch/sample activation pressure, concurrent jobs, cache/workspace reserves, overhead, growth reserve, and failover multiplier.</td>
          </tr>
          <tr>
            <th>*2 capacity rail</th>
            <td>Usable VRAM is calculated from installed/allocated VRAM minus display or OS reserve, then limited by target utilization.</td>
          </tr>
          <tr>
            <th>*3 validation</th>
            <td>Validate peak batch, context/cache behavior, replica count, precision mode, GPU sharing mode, and real framework allocation before committing GPU hardware.</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  function renderActions(plan) {
    const card = $gpuShell("computeGpuRecommendedActionsCard");
    const mount = $gpuShell("computeGpuRecommendedActions");
    if (!card || !mount || !plan) return;

    card.hidden = false;

    const status = String(plan.status || "WATCH").toUpperCase();
    let primary = "Proceed with the selected GPU allocation and keep the planning assumptions attached to the report.";
    let secondary = "Run a sample workload or benchmark to confirm actual framework/runtime allocation.";

    if (status === "WATCH") {
      primary = "Validate model memory, batch size, KV/cache reserve, and concurrent job assumptions before locking hardware.";
      secondary = "Consider reducing target utilization or increasing installed/allocated VRAM if growth is likely.";
    }

    if (status === "RISK") {
      primary = "Increase installed/allocated VRAM, reduce batch/concurrency/cache pressure, or change precision/parallelism before proceeding.";
      secondary = "Treat this GPU allocation as undersized until a real benchmark proves otherwise.";
    }

    mount.innerHTML = `
      <ol>
        <li>${escapeHtml(primary)}</li>
        <li>${escapeHtml(secondary)}</li>
        <li>Carry the GPU VRAM status into VM density, power/thermal, and final Compute summary review.</li>
      </ol>
    `;
  }

  function renderSchedule(plan) {
    const card = $gpuShell("computeGpuDecisionScheduleCard");
    const mount = $gpuShell("computeGpuDecisionSchedule");
    if (!card || !mount || !plan) return;

    card.hidden = false;
    mount.innerHTML = `
      <table>
        <tbody>
          <tr>
            <th>Now</th>
            <td>Confirm required VRAM of ${escapeHtml(gb(plan.requiredVramGb))} against usable planning capacity of ${escapeHtml(gb(plan.usableVramGb))}.</td>
          </tr>
          <tr>
            <th>Before procurement</th>
            <td>Benchmark representative batch/concurrency/cache behavior on the target GPU class.</td>
          </tr>
          <tr>
            <th>Before rollout</th>
            <td>Recheck growth, failover, sharing, and downstream power/thermal assumptions.</td>
          </tr>
        </tbody>
      </table>
    `;
  }

  function renderShellProof() {
    hideLegacyResultsSource();
    const plan = currentPlan();
    if (!plan) return;

    renderLedger(plan);
    renderAssistant(plan);
    renderReferences(plan);
    renderActions(plan);
    renderSchedule(plan);
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

