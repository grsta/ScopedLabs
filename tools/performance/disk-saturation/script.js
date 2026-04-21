(() => {
  "use strict";

  const CATEGORY = "performance";
  const STEP = "disk-saturation";
  const LANE = "v1";
  const PREVIOUS_STEP = "cpu-utilization-impact";
  const NEXT_URL = "/tools/performance/network-congestion/";

  const FLOW_KEYS = {
    "response-time-sla": "scopedlabs:pipeline:performance:response-time-sla",
    "latency-vs-throughput": "scopedlabs:pipeline:performance:latency-vs-throughput",
    "queue-depth": "scopedlabs:pipeline:performance:queue-depth",
    "concurrency-scaling": "scopedlabs:pipeline:performance:concurrency-scaling",
    "cpu-utilization-impact": "scopedlabs:pipeline:performance:cpu-utilization-impact",
    "disk-saturation": "scopedlabs:pipeline:performance:disk-saturation",
    "network-congestion": "scopedlabs:pipeline:performance:network-congestion",
    "cache-hit-ratio": "scopedlabs:pipeline:performance:cache-hit-ratio",
    "bottleneck-analyzer": "scopedlabs:pipeline:performance:bottleneck-analyzer",
    "headroom-target": "scopedlabs:pipeline:performance:headroom-target"
  };

  const chartRef = { current: null };
  const chartWrapRef = { current: null };
  const $ = (id) => document.getElementById(id);

  let hasResult = false;

  const els = {
    riops: $("riops"),
    wiops: $("wiops"),
    iosz: $("iosz"),
    cap: $("cap"),
    util: $("util"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  const DEFAULTS = {
    riops: 12000,
    wiops: 6000,
    iosz: 16,
    cap: 1500,
    util: 75
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

  function num(value) {
    return ScopedLabsAnalyzer.safeNumber(value, NaN);
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtPct(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function fmtMBs(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} MB/s` : "—";
  }

  function fmtIOPS(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} IOPS` : "—";
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.continueBtn) els.continueBtn.disabled = false;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continueBtn) els.continueBtn.disabled = true;
  }

  function applyDefaults() {
    els.riops.value = String(DEFAULTS.riops);
    els.wiops.value = String(DEFAULTS.wiops);
    els.iosz.value = String(DEFAULTS.iosz);
    els.cap.value = String(DEFAULTS.cap);
    els.util.value = String(DEFAULTS.util);
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["network-congestion"]);
      sessionStorage.removeItem(FLOW_KEYS["cache-hit-ratio"]);
      sessionStorage.removeItem(FLOW_KEYS["bottleneck-analyzer"]);
      sessionStorage.removeItem(FLOW_KEYS["headroom-target"]);
    } catch {}

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: null,
      continueBtnEl: null,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS[STEP],
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Calculate."
    });

    hasResult = false;
    hideContinue();
  }

  function loadPrior() {
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    const d = parsed.data || {};

    const currentCpu = num(d.currentCpuUtilizationPct);
    const targetCpu = num(d.targetCpuUtilizationPct);
    const targetLatency = num(d.targetLatencyMs);
    const safeCpu = num(d.safeCpuUtilizationPct);

    if (Number.isFinite(safeCpu) && safeCpu > 0) {
      els.util.value = String(Math.round(safeCpu));
    } else if (Number.isFinite(targetCpu) && targetCpu > 0) {
      els.util.value = String(Math.round(targetCpu));
    }

    if (Number.isFinite(targetLatency)) {
      if (targetLatency > 200) els.cap.value = "2500";
      else if (targetLatency > 100) els.cap.value = "2000";
      else if (targetLatency > 50) els.cap.value = "1700";
      else els.cap.value = "1500";
    }

    const parts = [];
    if (Number.isFinite(currentCpu)) parts.push(`Current CPU: <strong>${fmtPct(currentCpu)}</strong>`);
    if (Number.isFinite(targetCpu)) parts.push(`Target CPU: <strong>${fmtPct(targetCpu)}</strong>`);
    if (Number.isFinite(targetLatency)) parts.push(`Target Latency: <strong>${fmt(targetLatency, 1)} ms</strong>`);
    if (Number.isFinite(safeCpu)) parts.push(`Safe CPU Ceiling: <strong>${fmtPct(safeCpu)}</strong>`);

    if (!parts.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      ${parts.join(" | ")}
      <br><br>
      This step checks whether storage throughput becomes the next active limiter after processor-side pressure has already been estimated.
    `;
  }

  function getInputs() {
    const riops = num(els.riops.value);
    const wiops = num(els.wiops.value);
    const iosz = num(els.iosz.value);
    const cap = num(els.cap.value);
    const util = num(els.util.value);

    if (
      !Number.isFinite(riops) || riops < 0 ||
      !Number.isFinite(wiops) || wiops < 0 ||
      !Number.isFinite(iosz) || iosz <= 0 ||
      !Number.isFinite(cap) || cap <= 0 ||
      !Number.isFinite(util) || util <= 0 || util > 95
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, riops, wiops, iosz, cap, util };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const totalIops = input.riops + input.wiops;
    const throughput = (totalIops * input.iosz) / 1024;
    const utilizationPct = (throughput / input.cap) * 100;
    const targetLimitMBs = input.cap * (input.util / 100);

    const throughputPressure = utilizationPct;
    const headroomDeficitPct = Math.max(0, utilizationPct - input.util);
    const saturationOverrunPct = Math.max(0, utilizationPct - 90) * 2;
    const readWriteImbalancePct =
      totalIops > 0 ? Math.abs(input.riops - input.wiops) / totalIops * 100 : 0;

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(throughputPressure - 40, headroomDeficitPct * 2, saturationOverrunPct),
      metrics: [
        {
          label: "Throughput Pressure",
          value: throughputPressure,
          displayValue: fmtPct(utilizationPct)
        },
        {
          label: "Headroom Deficit",
          value: headroomDeficitPct * 2,
          displayValue: fmtPct(headroomDeficitPct)
        },
        {
          label: "Saturation Overrun",
          value: saturationOverrunPct,
          displayValue: fmtMBs(throughput)
        }
      ],
      healthyMax: 35,
      watchMax: 70
    });

    let diskClass = "COMFORTABLE";
    if (statusPack.status === "WATCH") diskClass = "ELEVATED";
    if (statusPack.status === "RISK") diskClass = "SATURATED";

    const dominantLabel = statusPack.dominant.label;

    let interpretation = `The workload drives approximately ${fmtMBs(throughput)} of disk throughput from ${fmtIOPS(totalIops)} at an average IO size of ${fmt(input.iosz, 1)} KB. That places storage utilization at ${fmtPct(utilizationPct)} against a capacity of ${fmtMBs(input.cap)}.`;

    if (statusPack.status === "RISK") {
      interpretation += ` The dominant storage pressure is already in a risk band, which means the disk tier is no longer just busy — it is approaching a point where queueing, service-time inflation, and application-visible slowdown become likely.`;
    } else if (statusPack.status === "WATCH") {
      interpretation += ` Storage remains usable, but the pressure profile is already elevated enough that moderate growth or burst activity can push the disk tier into a visible bottleneck state.`;
    } else {
      interpretation += ` Storage remains in a controlled band, so the workload does not yet indicate a severe throughput-side saturation problem under the current assumptions.`;
    }

    let dominantConstraint = "";
    if (dominantLabel === "Throughput Pressure") {
      dominantConstraint = "Throughput pressure is the dominant limiter. The main concern is the raw fraction of available disk bandwidth the workload is already consuming.";
    } else if (dominantLabel === "Headroom Deficit") {
      dominantConstraint = "Headroom deficit is the dominant limiter. The design is exceeding the intended operating band even before absolute saturation is reached, so resilience is already being consumed.";
    } else {
      dominantConstraint = "Saturation overrun is the dominant limiter. The biggest practical risk is that storage is being pushed far enough that service time and queueing behavior can degrade sharply.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = "Treat storage as the active bottleneck candidate. Validate queue depth, latency, controller contention, and read/write amplification before assuming the next subsystem in the stack is the primary issue.";
    } else if (statusPack.status === "WATCH") {
      guidance = "Disk pressure is rising. Confirm whether this load is sustained or bursty and whether the throughput assumptions reflect real production peak behavior rather than averages.";
    } else {
      guidance = "Disk capacity is balanced for the current model. Continue into Network Congestion next to determine whether the path beyond storage becomes the next limiting layer.";
    }

    return {
      ok: true,
      totalIops,
      throughput,
      utilizationPct,
      targetLimitMBs,
      headroomMBs: targetLimitMBs - throughput,
      targetUtilizationPct: input.util,
      capacityMBs: input.cap,
      ioszKB: input.iosz,
      readIops: input.riops,
      writeIops: input.wiops,
      readWriteImbalancePct,
      diskClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      throughputPressure,
      headroomDeficitPct,
      saturationOverrunPct
    };
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) {
      ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
      ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
      els.results.innerHTML = `<div class="muted">${data.message}</div>`;
      hideContinue();
      return;
    }

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Total IOPS", value: fmtIOPS(data.totalIops) },
        { label: "Throughput", value: fmtMBs(data.throughput) },
        { label: "Utilization", value: fmtPct(data.utilizationPct) },
        { label: "Disk Class", value: data.diskClass }
      ],
      derivedRows: [
        { label: "Capacity", value: fmtMBs(data.capacityMBs) },
        { label: "Target Limit", value: fmtMBs(data.targetLimitMBs) },
        { label: "Headroom", value: fmtMBs(data.headroomMBs) },
        { label: "Read IOPS", value: fmtIOPS(data.readIops) },
        { label: "Write IOPS", value: fmtIOPS(data.writeIops) },
        { label: "Read/Write Imbalance", value: fmtPct(data.readWriteImbalancePct) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Throughput Pressure",
          "Headroom Deficit",
          "Saturation Overrun"
        ],
        values: [
          Number(data.throughputPressure.toFixed(1)),
          Number((data.headroomDeficitPct * 2).toFixed(1)),
          Number(data.saturationOverrunPct.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.utilizationPct),
          fmtPct(data.headroomDeficitPct),
          fmtMBs(data.throughput)
        ],
        referenceValue: 35,
        healthyMax: 35,
        watchMax: 70,
        axisTitle: "Storage Saturation Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(
            Math.max(
              data.throughputPressure,
              data.headroomDeficitPct * 2,
              data.saturationOverrunPct,
              70
            ) * 1.12
          )
        )
      }
    });

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        totalIops: data.totalIops,
        throughputMBps: data.throughput,
        diskUtilizationPct: data.utilizationPct,
        targetUtilizationPct: data.targetUtilizationPct,
        capacityMBps: data.capacityMBs,
        diskClass: data.diskClass,
        saturated: data.status === "RISK"
      }
    });

    hasResult = true;
    showContinue();
  }

  function reset() {
    applyDefaults();
    loadPrior();
    invalidate();
  }

  function bind() {
    [els.riops, els.wiops, els.iosz, els.cap, els.util].forEach((el) => {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    els.calc.addEventListener("click", calc);
    els.reset.addEventListener("click", reset);
    els.continueBtn.addEventListener("click", () => {
      if (!hasResult) return;
      window.location.href = NEXT_URL;
    });
  }

  function init() {
    bind();
    loadPrior();
    invalidate();
  }

  window.addEventListener("DOMContentLoaded", () => {
    unlockCategoryPage();
    setTimeout(() => {
      unlockCategoryPage();
    }, 400);

    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
    init();
  });
})();
