(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "cpu-utilization-impact";
  const PREVIOUS_STEP = "concurrency-scaling";
  const NEXT_URL = "/tools/performance/disk-saturation/";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    u: $("u"),
    u2: $("u2"),
    lat: $("lat"),
    head: $("head"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  const DEFAULTS = {
    u: 65,
    u2: 85,
    lat: 25,
    head: 20
  };

  function num(value) {
    return ScopedLabsAnalyzer.safeNumber(value, NaN);
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtPct(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function fmtMs(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} ms` : "—";
  }

  function applyDefaults() {
    els.u.value = String(DEFAULTS.u);
    els.u2.value = String(DEFAULTS.u2);
    els.lat.value = String(DEFAULTS.lat);
    els.head.value = String(DEFAULTS.head);
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: STORAGE_KEY,
      category: CATEGORY,
      step: STEP,
      emptyMessage: "Enter values and press Calculate."
    });
  }

  function loadPrior() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: STORAGE_KEY,
      category: CATEGORY,
      step: STEP,
      title: "Carried over context",
      intro: "This step evaluates whether the concurrency gain from the previous step is likely to create a processor-side saturation problem."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const d = flow.data || {};

    const throughput = num(d.throughput);
    const scalingGain = num(d.scalingGain);
    const efficiency = num(d.scalingEfficiencyPct);
    const currentWorkers = num(d.currentWorkers);
    const targetWorkers = num(d.targetWorkers);

    if (Number.isFinite(throughput)) {
      if (throughput <= 1500) {
        els.u.value = "48";
        els.u2.value = "62";
        els.lat.value = "18";
      } else if (throughput <= 3000) {
        els.u.value = "58";
        els.u2.value = "74";
        els.lat.value = "22";
      } else if (throughput <= 5000) {
        els.u.value = "68";
        els.u2.value = "84";
        els.lat.value = "28";
      } else {
        els.u.value = "78";
        els.u2.value = "92";
        els.lat.value = "35";
      }
    }

    if (Number.isFinite(efficiency)) {
      if (efficiency < 60) els.head.value = "30";
      else if (efficiency < 75) els.head.value = "25";
      else els.head.value = "20";
    }

    const parts = [];
    if (Number.isFinite(throughput)) parts.push(`Scaled Throughput: <strong>${fmt(throughput, 0)} req/s</strong>`);
    if (Number.isFinite(scalingGain)) parts.push(`Scaling Gain: <strong>${fmtPct(scalingGain * 100)}</strong>`);
    if (Number.isFinite(efficiency)) parts.push(`Scaling Efficiency: <strong>${fmtPct(efficiency)}</strong>`);
    if (Number.isFinite(currentWorkers) && Number.isFinite(targetWorkers)) {
      parts.push(`Workers: <strong>${fmt(currentWorkers, 0)} → ${fmt(targetWorkers, 0)}</strong>`);
    }

    els.flowNote.style.display = "";
    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      ${parts.join(", ")}.
      This step evaluates CPU saturation limits after concurrency scaling.
    `;
  }

  function blowup(lat, utilFraction) {
    const denom = Math.max(0.01, 1 - utilFraction);
    return lat / denom;
  }

  function getInputs() {
    const u = num(els.u.value);
    const u2 = num(els.u2.value);
    const lat = num(els.lat.value);
    const head = num(els.head.value);

    if (
      !Number.isFinite(u) || u < 0 || u > 100 ||
      !Number.isFinite(u2) || u2 < 0 || u2 > 100 ||
      !Number.isFinite(lat) || lat < 0 ||
      !Number.isFinite(head) || head < 0 || head > 95
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, u, u2, lat, head };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const currentUtil = input.u / 100;
    const targetUtil = input.u2 / 100;
    const safeUtil = 1 - (input.head / 100);

    const currentLatency = blowup(input.lat, Math.min(0.99, currentUtil));
    const targetLatency = blowup(input.lat, Math.min(0.99, targetUtil));
    const latencyGrowthPct =
      currentLatency > 0 ? ((targetLatency - currentLatency) / currentLatency) * 100 : 0;

    const targetPressure = targetUtil * 100;
    const headroomGapPct = Math.max(0, (targetUtil - safeUtil) * 100);
    const queueingPressure = Math.max(0, (targetUtil - 0.70) * 100 * 2);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(targetPressure - 60, headroomGapPct * 2, queueingPressure),
      metrics: [
        {
          label: "Target CPU Pressure",
          value: targetPressure,
          displayValue: fmtPct(targetPressure)
        },
        {
          label: "Headroom Deficit",
          value: headroomGapPct * 2,
          displayValue: fmtPct(headroomGapPct)
        },
        {
          label: "Queueing Pressure",
          value: queueingPressure,
          displayValue: fmtMs(targetLatency)
        }
      ],
      healthyMax: 35,
      watchMax: 70
    });

    let cpuClass = "COMFORTABLE";
    if (statusPack.status === "WATCH") cpuClass = "RISING";
    if (statusPack.status === "RISK") cpuClass = "SATURATION RISK";

    const dominantLabel = statusPack.dominant.label;

    let interpretation = `CPU utilization rises from ${fmtPct(input.u)} to ${fmtPct(input.u2)}, which increases modeled latency from ${fmtMs(currentLatency)} to ${fmtMs(targetLatency)}.`;

    if (statusPack.status === "RISK") {
      interpretation += ` The dominant processor-side pressure is already in a risk band, so this is the point where CPU is likely to become the active bottleneck and latency can accelerate sharply rather than climb gradually.`;
    } else if (statusPack.status === "WATCH") {
      interpretation += ` CPU pressure is climbing into a meaningful warning zone. The system may still function acceptably, but processor contention and queueing behavior are becoming much more likely to drive visible response-time growth.`;
    } else {
      interpretation += ` CPU remains in a controlled band, so the modeled utilization increase does not yet indicate a severe saturation problem under the current assumptions.`;
    }

    let dominantConstraint = "";
    if (dominantLabel === "Target CPU Pressure") {
      dominantConstraint = "Target CPU pressure is the dominant limiter. The main concern is simply how close the processor is being pushed toward saturation.";
    } else if (dominantLabel === "Headroom Deficit") {
      dominantConstraint = "Headroom deficit is the dominant limiter. The design is consuming more CPU reserve than the stated target allows, so resilience is weakening before full saturation is even reached.";
    } else {
      dominantConstraint = "Queueing pressure is the dominant limiter. The biggest practical risk is not just raw utilization, but the latency amplification that begins once CPU demand gets too close to saturation.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = "Treat CPU as the leading bottleneck candidate. Validate scheduler contention, steal time, run queue pressure, and thread placement before assuming downstream systems are the primary issue.";
    } else if (statusPack.status === "WATCH") {
      guidance = "CPU is still manageable, but you should verify whether the utilization increase is sustained or bursty. This is the point where extra workload can start turning latency growth non-linear.";
    } else {
      guidance = "CPU headroom is balanced. Continue into Disk Saturation next to confirm that storage does not become the next dominant limiter once processor pressure remains under control.";
    }

    return {
      ok: true,
      currentUtilPct: input.u,
      targetUtilPct: input.u2,
      baselineLatencyMs: input.lat,
      currentLatency,
      targetLatency,
      safeUtilPct: safeUtil * 100,
      latencyGrowthPct,
      cpuClass,
      targetPressure,
      headroomGapPct,
      queueingPressure,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(STORAGE_KEY, {
      category: CATEGORY,
      step: STEP,
      data: {
        currentCpuUtilizationPct: data.currentUtilPct,
        targetCpuUtilizationPct: data.targetUtilPct,
        baselineLatencyMs: data.baselineLatencyMs,
        targetLatencyMs: data.targetLatency,
        safeCpuUtilizationPct: data.safeUtilPct,
        latencyGrowthPct: data.latencyGrowthPct,
        cpuClass: data.cpuClass
      }
    });
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Latency @ Current", value: fmtMs(data.currentLatency) },
        { label: "Latency @ Target", value: fmtMs(data.targetLatency) },
        { label: "Recommended Max Util", value: fmtPct(data.safeUtilPct) },
        { label: "CPU Class", value: data.cpuClass }
      ],
      derivedRows: [
        { label: "Current CPU Utilization", value: fmtPct(data.currentUtilPct) },
        { label: "Target CPU Utilization", value: fmtPct(data.targetUtilPct) },
        { label: "Baseline Latency", value: fmtMs(data.baselineLatencyMs) },
        { label: "Latency Growth", value: fmtPct(data.latencyGrowthPct) },
        { label: "Headroom Gap", value: fmtPct(data.headroomGapPct) },
        { label: "Queueing Pressure", value: fmt(data.queueingPressure, 1) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Target CPU Pressure",
          "Headroom Deficit",
          "Queueing Pressure"
        ],
        values: [
          Number(data.targetPressure.toFixed(1)),
          Number((data.headroomGapPct * 2).toFixed(1)),
          Number(data.queueingPressure.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.targetUtilPct),
          fmtPct(data.headroomGapPct),
          fmtMs(data.targetLatency)
        ],
        referenceValue: 35,
        healthyMax: 35,
        watchMax: 70,
        axisTitle: "CPU Saturation Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(
            Math.max(
              data.targetPressure,
              data.headroomGapPct * 2,
              data.queueingPressure,
              70
            ) * 1.12
          )
        )
      }
    });

    writeFlow(data);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) {
      renderError(data.message);
      return;
    }
    renderSuccess(data);
  }

  function reset() {
    applyDefaults();
    loadPrior();
    invalidate();
  }

  function bind() {
    [els.u, els.u2, els.lat, els.head].forEach((el) => {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    els.calc.addEventListener("click", calc);
    els.reset.addEventListener("click", reset);
    els.continueBtn.addEventListener("click", () => {
      window.location.href = NEXT_URL;
    });
  }

  function init() {
    bind();
    loadPrior();
    invalidate();
  }

  window.addEventListener("DOMContentLoaded", init);
})();