const LANE = "v1";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "concurrency-scaling";
  const PREVIOUS_STEP = "queue-depth";
  const NEXT_URL = "/tools/performance/cpu-utilization-impact/";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    base: $("base"),
    w0: $("w0"),
    w1: $("w1"),
    p: $("p"),
    oh: $("oh"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  const DEFAULTS = {
    base: 1200,
    w0: 4,
    w1: 12,
    p: 85,
    oh: 8
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

  function fmtRps(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} req/s` : "—";
  }

  function speedup(workers, parallelFraction) {
    return 1 / ((1 - parallelFraction) + (parallelFraction / workers));
  }

  function applyDefaults() {
    els.base.value = String(DEFAULTS.base);
    els.w0.value = String(DEFAULTS.w0);
    els.w1.value = String(DEFAULTS.w1);
    els.p.value = String(DEFAULTS.p);
    els.oh.value = String(DEFAULTS.oh);
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
      intro: "This step estimates whether adding concurrency will materially improve throughput after the upstream queue-depth condition has already been observed."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const d = flow.data || {};

    const queueDepth = num(d.queueDepth);
    const utilization = num(d.utilization);
    const responseTime = num(d.responseTime);
    const workers = num(d.workers);
    const capacity = num(d.capacity);

    if (Number.isFinite(capacity) && capacity > 0) {
      els.base.value = String(Math.round(capacity));
    }

    if (Number.isFinite(workers) && workers > 0) {
      const currentWorkers = Math.max(1, Math.round(workers));
      els.w0.value = String(currentWorkers);
      els.w1.value = String(Math.max(currentWorkers + 2, currentWorkers * 2));
    }

    if (Number.isFinite(utilization)) {
      let suggestedOverhead = 8;
      if (utilization >= 0.90) suggestedOverhead = 15;
      else if (utilization >= 0.75) suggestedOverhead = 10;
      else if (utilization <= 0.50) suggestedOverhead = 5;
      els.oh.value = String(suggestedOverhead);
    }

    if (Number.isFinite(queueDepth) && queueDepth > 5) {
      els.p.value = "90";
    } else if (Number.isFinite(queueDepth) && queueDepth > 2) {
      els.p.value = "85";
    } else if (Number.isFinite(queueDepth) && queueDepth <= 2) {
      els.p.value = "75";
    }

    const contextParts = [];
    if (Number.isFinite(queueDepth)) {
      contextParts.push(`Queue Depth: <strong>${fmt(queueDepth, 2)}</strong>`);
    }
    if (Number.isFinite(utilization)) {
      contextParts.push(`Utilization: <strong>${fmt(utilization * 100, 1)}%</strong>`);
    }
    if (Number.isFinite(responseTime)) {
      contextParts.push(`Response Time: <strong>${fmt(responseTime, 2)} ms</strong>`);
    }
    if (Number.isFinite(capacity)) {
      contextParts.push(`Capacity: <strong>${fmt(capacity, 0)} req/s</strong>`);
    }
    if (Number.isFinite(workers)) {
      contextParts.push(`Workers: <strong>${fmt(workers, 0)}</strong>`);
    }

    els.flowNote.style.display = "";
    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      ${contextParts.join(", ")}.
      These values were used to seed the concurrency model.
    `;
  }

  function getInputs() {
    const base = num(els.base.value);
    const w0 = Math.max(1, num(els.w0.value));
    const w1 = Math.max(1, num(els.w1.value));
    const p = num(els.p.value);
    const oh = num(els.oh.value);

    if (
      !Number.isFinite(base) || base < 0 ||
      !Number.isFinite(w0) || w0 < 1 ||
      !Number.isFinite(w1) || w1 < 1 ||
      !Number.isFinite(p) || p < 0 || p > 100 ||
      !Number.isFinite(oh) || oh < 0 || oh > 95
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, base, w0, w1, p, oh };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const { base, w0, w1, p, oh } = input;

    const parallelFraction = p / 100;
    const overheadFraction = oh / 100;

    const s0 = speedup(w0, parallelFraction);
    const s1 = speedup(w1, parallelFraction);

    const rel = s1 / s0;
    const rawTarget = base * rel;
    const target = rawTarget * (1 - overheadFraction);
    const idealLinearGainPct = (w1 / w0) * 100;
    const actualGainPct = rel * 100;
    const efficiency = (rel / (w1 / w0)) * 100;
    const overheadDragPct = oh;
    const scalingLossPct = Math.max(0, idealLinearGainPct - actualGainPct);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(100 - efficiency, overheadDragPct * 2, scalingLossPct / 2),
      metrics: [
        {
          label: "Efficiency Loss",
          value: 100 - efficiency,
          displayValue: fmtPct(100 - efficiency)
        },
        {
          label: "Coordination Drag",
          value: overheadDragPct * 2,
          displayValue: fmtPct(overheadDragPct)
        },
        {
          label: "Non-Linear Scaling Loss",
          value: scalingLossPct / 2,
          displayValue: fmtPct(scalingLossPct)
        }
      ],
      healthyMax: 20,
      watchMax: 40
    });

    let scalingClass = "STRONG";
    if (statusPack.status === "WATCH") scalingClass = "MODERATE";
    if (statusPack.status === "RISK") scalingClass = "LIMITED";

    const dominantLabel = statusPack.dominant.label;

    let interpretation = `Moving from ${fmt(w0, 0)} to ${fmt(w1, 0)} workers increases modeled throughput from ${fmtRps(base)} to ${fmtRps(target)} after coordination overhead, with a scaling efficiency of ${fmtPct(efficiency)}.`;

    if (statusPack.status === "RISK") {
      interpretation += ` Scaling benefit is now limited. The dominant drag is large enough that extra workers are no longer converting cleanly into usable throughput, which usually points to serial work, contention, coordination cost, or a shared downstream constraint.`;
    } else if (statusPack.status === "WATCH") {
      interpretation += ` Scaling is still helping, but diminishing returns are already visible. Additional workers improve output, though the gain is no longer keeping pace with the worker increase.`;
    } else {
      interpretation += ` Scaling remains in a controlled band. Added workers are still translating into meaningful throughput improvement without excessive coordination loss.`;
    }

    let dominantConstraint = "";
    if (dominantLabel === "Efficiency Loss") {
      dominantConstraint = "Efficiency loss is the dominant limiter. The biggest concern is that added workers are no longer translating into proportional useful work.";
    } else if (dominantLabel === "Coordination Drag") {
      dominantConstraint = "Coordination drag is the dominant limiter. Synchronization, scheduling, lock contention, or cross-worker overhead is consuming too much of the theoretical gain.";
    } else {
      dominantConstraint = "Non-linear scaling loss is the dominant limiter. The workload’s serial fraction is now preventing extra workers from delivering near-linear improvement.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = "Do not assume that adding more workers is the next best fix. Validate lock contention, queue ownership, shard imbalance, or shared resource pressure before scaling concurrency further.";
    } else if (statusPack.status === "WATCH") {
      guidance = "Additional workers are still useful, but profile where the extra coordination cost is accumulating. This is the point where worker growth should be paired with architectural validation, not just raw horizontal expansion.";
    } else {
      guidance = "The concurrency model is healthy. Continue into CPU Utilization Impact next to see whether the projected gain is likely to create a new processor-side pressure point.";
    }

    return {
      ok: true,
      base,
      w0,
      w1,
      p,
      oh,
      rawTarget,
      target,
      rel,
      efficiency,
      idealLinearGainPct,
      actualGainPct,
      overheadDragPct,
      scalingLossPct,
      scalingClass,
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
        baselineThroughput: data.base,
        currentWorkers: data.w0,
        targetWorkers: data.w1,
        parallelFraction: data.p / 100,
        overheadPct: data.oh,
        throughput: data.target,
        scalingGain: data.rel,
        scalingEfficiencyPct: data.efficiency,
        scalingClass: data.scalingClass
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
        { label: "Baseline Throughput", value: fmtRps(data.base) },
        { label: "After Overhead", value: fmtRps(data.target) },
        { label: "Scaling Efficiency", value: fmtPct(data.efficiency) },
        { label: "Scaling Class", value: data.scalingClass }
      ],
      derivedRows: [
        { label: "Current Workers", value: fmt(data.w0, 0) },
        { label: "Target Workers", value: fmt(data.w1, 0) },
        { label: "Raw Target", value: fmtRps(data.rawTarget) },
        { label: "Actual Gain", value: fmtPct(data.actualGainPct) },
        { label: "Ideal Linear Gain", value: fmtPct(data.idealLinearGainPct) },
        { label: "Coordination Overhead", value: fmtPct(data.oh) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Efficiency Loss",
          "Coordination Drag",
          "Non-Linear Scaling Loss"
        ],
        values: [
          Number((100 - data.efficiency).toFixed(1)),
          Number((data.overheadDragPct * 2).toFixed(1)),
          Number((data.scalingLossPct / 2).toFixed(1))
        ],
        displayValues: [
          fmtPct(100 - data.efficiency),
          fmtPct(data.overheadDragPct),
          fmtPct(data.scalingLossPct)
        ],
        referenceValue: 20,
        healthyMax: 20,
        watchMax: 40,
        axisTitle: "Scaling Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(
            Math.max(
              100 - data.efficiency,
              data.overheadDragPct * 2,
              data.scalingLossPct / 2,
              40
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
    [els.base, els.w0, els.w1, els.p, els.oh].forEach((el) => {
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
