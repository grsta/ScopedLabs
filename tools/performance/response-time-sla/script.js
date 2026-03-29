const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "response-time-sla";
  const NEXT_URL = "/tools/performance/latency-vs-throughput/";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    cur: $("cur"),
    tgt: $("tgt"),
    sla: $("sla"),
    eb: $("eb"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  const DEFAULTS = {
    cur: 120,
    tgt: 180,
    sla: 200,
    eb: 1
  };

  function num(value) {
    return ScopedLabsAnalyzer.safeNumber(value, NaN);
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtMs(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} ms` : "—";
  }

  function fmtPct(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function applyDefaults() {
    els.cur.value = String(DEFAULTS.cur);
    els.tgt.value = String(DEFAULTS.tgt);
    els.sla.value = String(DEFAULTS.sla);
    els.eb.value = String(DEFAULTS.eb);
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
      emptyMessage: "Enter values and press Check SLA."
    });
  }

  function loadPrior() {
    ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: STORAGE_KEY,
      category: CATEGORY,
      step: STEP,
      title: "Pipeline start",
      intro: "This is the first step of the Performance pipeline. Define the acceptable response-time boundary first so downstream throughput, queueing, and scaling calculations have a clear latency target."
    });
  }

  function getInputs() {
    const cur = num(els.cur.value);
    const tgt = num(els.tgt.value);
    const sla = num(els.sla.value);
    const eb = num(els.eb.value);

    if (
      !Number.isFinite(cur) || cur < 0 ||
      !Number.isFinite(tgt) || tgt < 0 ||
      !Number.isFinite(sla) || sla <= 0 ||
      !Number.isFinite(eb) || eb < 0 || eb > 100
    ) {
      return { ok: false, message: "Enter valid values and press Check SLA." };
    }

    return { ok: true, cur, tgt, sla, eb };
  }

  function classifyLatency(lat, sla) {
    if (lat <= sla) return "PASS";
    if (lat <= sla * 1.1) return "RISK";
    return "FAIL";
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const currentStatus = classifyLatency(input.cur, input.sla);
    const targetStatus = classifyLatency(input.tgt, input.sla);

    const currentOverrunPct = Math.max(0, ((input.cur - input.sla) / input.sla) * 100);
    const targetOverrunPct = Math.max(0, ((input.tgt - input.sla) / input.sla) * 100);
    const errorBudgetPressure = input.eb * 10;
    const currentPressure = (input.cur / input.sla) * 100;
    const targetPressure = (input.tgt / input.sla) * 100;

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(currentPressure, targetPressure, errorBudgetPressure),
      metrics: [
        {
          label: "Current SLA Pressure",
          value: currentPressure,
          displayValue: fmtMs(input.cur)
        },
        {
          label: "Target SLA Pressure",
          value: targetPressure,
          displayValue: fmtMs(input.tgt)
        },
        {
          label: "Error Budget Pressure",
          value: errorBudgetPressure,
          displayValue: fmtPct(input.eb)
        }
      ],
      healthyMax: 100,
      watchMax: 110
    });

    let slaClass = "PASS";
    if (statusPack.status === "WATCH") slaClass = "RISK";
    if (statusPack.status === "RISK") slaClass = "FAIL";

    let interpretation = `The SLA threshold is ${fmtMs(input.sla)}. Current latency is ${fmtMs(input.cur)} and target latency is ${fmtMs(input.tgt)}.`;

    if (statusPack.status === "RISK") {
      interpretation += ` The model is already beyond an acceptable SLA band. At this point, response time is exceeding the defined service boundary enough that the system should be treated as out-of-policy rather than merely close to target.`;
    } else if (statusPack.status === "WATCH") {
      interpretation += ` The system is near the SLA boundary. Small regressions or transient spikes could push it into violation, so downstream planning should assume latency reserve is already thin.`;
    } else {
      interpretation += ` The current and target values remain inside a controlled SLA band, so downstream calculations can treat the latency objective as still achievable under the entered assumptions.`;
    }

    let dominantConstraint = "";
    if (statusPack.dominant.label === "Current SLA Pressure") {
      dominantConstraint = "Current SLA pressure is the dominant limiter. The present operating point is already the strongest indicator of risk against the defined response-time boundary.";
    } else if (statusPack.dominant.label === "Target SLA Pressure") {
      dominantConstraint = "Target SLA pressure is the dominant limiter. The future operating target is more aggressive than the current state and is the first place SLA margin begins to disappear.";
    } else {
      dominantConstraint = "Error budget pressure is the dominant limiter. The primary concern is how little additional latency variance or failure allowance the policy leaves available.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = "Treat the latency target as already broken or functionally unsafe. Reduce service time, lower load, or revise the SLA assumptions before trusting downstream capacity calculations.";
    } else if (statusPack.status === "WATCH") {
      guidance = "The SLA is still technically reachable, but reserve is limited. Use the downstream tools to identify where throughput, queueing, or concurrency is most likely to push latency over the line.";
    } else {
      guidance = "The SLA boundary is healthy. Continue into Latency vs Throughput next to see how close rising throughput will push the system toward this response-time limit.";
    }

    return {
      ok: true,
      sla: input.sla,
      currentLatency: input.cur,
      targetLatency: input.tgt,
      errorBudget: input.eb,
      currentStatus,
      targetStatus,
      currentOverrunPct,
      targetOverrunPct,
      currentPressure,
      targetPressure,
      errorBudgetPressure,
      slaClass,
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
        sla: data.sla,
        slaMs: data.sla,
        currentLatency: data.currentLatency,
        currentLatencyMs: data.currentLatency,
        targetLatency: data.targetLatency,
        targetLatencyMs: data.targetLatency,
        errorBudget: data.errorBudget,
        errorBudgetPct: data.errorBudget,
        status: data.slaClass,
        slaStatus: data.slaClass
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
        { label: "SLA Threshold", value: fmtMs(data.sla) },
        { label: "Current Avg", value: `${fmtMs(data.currentLatency)} (${data.currentStatus})` },
        { label: "Target Avg", value: `${fmtMs(data.targetLatency)} (${data.targetStatus})` },
        { label: "SLA Class", value: data.slaClass }
      ],
      derivedRows: [
        { label: "Error Budget", value: fmtPct(data.errorBudget) },
        { label: "Current Overrun", value: fmtPct(data.currentOverrunPct) },
        { label: "Target Overrun", value: fmtPct(data.targetOverrunPct) },
        { label: "Current SLA Pressure", value: fmtPct(data.currentPressure) },
        { label: "Target SLA Pressure", value: fmtPct(data.targetPressure) },
        { label: "Error Budget Pressure", value: fmt(data.errorBudgetPressure, 1) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Current SLA Pressure",
          "Target SLA Pressure",
          "Error Budget Pressure"
        ],
        values: [
          Number(data.currentPressure.toFixed(1)),
          Number(data.targetPressure.toFixed(1)),
          Number(data.errorBudgetPressure.toFixed(1))
        ],
        displayValues: [
          fmtMs(data.currentLatency),
          fmtMs(data.targetLatency),
          fmtPct(data.errorBudget)
        ],
        referenceValue: 100,
        healthyMax: 100,
        watchMax: 110,
        axisTitle: "SLA Pressure",
        referenceLabel: "SLA Boundary",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          120,
          Math.ceil(
            Math.max(
              data.currentPressure,
              data.targetPressure,
              data.errorBudgetPressure,
              110
            ) * 1.08
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
    [els.cur, els.tgt, els.sla, els.eb].forEach((el) => {
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

function renderFlowNote() {
  // TODO: implement upstream flow-note carry-over
}


window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});
