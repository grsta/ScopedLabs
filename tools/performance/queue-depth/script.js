(() => {
  "use strict";

  const CATEGORY = "performance";
  const STEP = "queue-depth";
  const LANE = "v1";
  const PREVIOUS_STEP = "latency-vs-throughput";
  const NEXT_URL = "/tools/performance/concurrency-scaling/";

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
    lambda: $("lambda"),
    mu: $("mu"),
    k: $("k"),
    svc: $("svc"),
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
    lambda: 900,
    mu: 1200,
    k: 1,
    svc: 4
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

  function fmt(value, digits = 2) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtPct(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function fmtMs(value, digits = 2) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} ms` : "—";
  }

  function fmtRps(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} req/s` : "—";
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
    els.lambda.value = String(DEFAULTS.lambda);
    els.mu.value = String(DEFAULTS.mu);
    els.k.value = String(DEFAULTS.k);
    els.svc.value = String(DEFAULTS.svc);
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["concurrency-scaling"]);
      sessionStorage.removeItem(FLOW_KEYS["cpu-utilization-impact"]);
      sessionStorage.removeItem(FLOW_KEYS["disk-saturation"]);
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

    const currentUtilizationPct =
      num(d.currentUtilizationPct) ??
      (Number.isFinite(num(d.currentUtilization)) ? num(d.currentUtilization) * 100 : NaN);

    const targetUtilizationPct =
      num(d.targetUtilizationPct) ??
      (Number.isFinite(num(d.utilization)) ? num(d.utilization) * 100 : NaN);

    const currentLatencyMs =
      num(d.currentLatencyMs) ??
      num(d.currentLatency);

    const targetLatencyMs =
      num(d.targetLatencyMs) ??
      num(d.latency);

    const capacity =
      num(d.capacity) ??
      num(d.systemCapacity);

    const currentThroughput =
      num(d.currentThroughput);

    const targetThroughput =
      num(d.targetThroughput);

    let selectedWorkers = Math.max(1, Math.floor(num(els.k.value) || DEFAULTS.k));

    if (Number.isFinite(targetUtilizationPct)) {
      if (targetUtilizationPct >= 90) {
        selectedWorkers = 1;
      } else if (targetUtilizationPct >= 75) {
        selectedWorkers = 2;
      } else {
        selectedWorkers = 3;
      }

      els.k.value = String(selectedWorkers);
    }

    const arrivalRate =
      Number.isFinite(targetThroughput) && targetThroughput > 0
        ? targetThroughput
        : Number.isFinite(currentThroughput) && currentThroughput > 0
          ? currentThroughput
          : Number.isFinite(capacity) && Number.isFinite(targetUtilizationPct)
            ? capacity * (targetUtilizationPct / 100)
            : Number.isFinite(capacity) && Number.isFinite(currentUtilizationPct)
              ? capacity * (currentUtilizationPct / 100)
              : NaN;

    if (Number.isFinite(arrivalRate) && arrivalRate > 0) {
      els.lambda.value = String(Math.round(arrivalRate));
    }

    if (Number.isFinite(capacity) && capacity > 0) {
      const perWorkerServiceRate = capacity / selectedWorkers;
      els.mu.value = String(Math.round(perWorkerServiceRate));
    }

    if (Number.isFinite(currentLatencyMs)) {
      if (currentLatencyMs <= 10) els.svc.value = "2";
      else if (currentLatencyMs <= 25) els.svc.value = "4";
      else if (currentLatencyMs <= 60) els.svc.value = "6";
      else els.svc.value = "8";
    }

    const parts = [];
    if (Number.isFinite(currentUtilizationPct)) parts.push(`Current Utilization: <strong>${fmt(currentUtilizationPct, 1)}%</strong>`);
    if (Number.isFinite(targetUtilizationPct)) parts.push(`Target Utilization: <strong>${fmt(targetUtilizationPct, 1)}%</strong>`);
    if (Number.isFinite(currentLatencyMs)) parts.push(`Current Latency: <strong>${fmt(currentLatencyMs, 1)} ms</strong>`);
    if (Number.isFinite(targetLatencyMs)) parts.push(`Target Latency: <strong>${fmt(targetLatencyMs, 1)} ms</strong>`);
    if (Number.isFinite(capacity)) parts.push(`Capacity: <strong>${fmt(capacity, 0)}</strong>`);

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
      This step evaluates backlog formation after the upstream latency-versus-throughput relationship has already shown how fast delay grows near saturation.
    `;
  }

  function getInputs() {
    const lambda = num(els.lambda.value);
    const mu = num(els.mu.value);
    const k = Math.max(1, Math.floor(num(els.k.value)));
    const svc = num(els.svc.value);

    if (
      !Number.isFinite(lambda) || lambda < 0 ||
      !Number.isFinite(mu) || mu <= 0 ||
      !Number.isFinite(k) || k < 1 ||
      !Number.isFinite(svc) || svc < 0
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, lambda, mu, k, svc };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const capacity = input.mu * input.k;
    const rho = input.lambda / capacity;

    let q;
    if (rho >= 1) {
      q = Infinity;
    } else {
      q = (rho * rho) / (1 - rho);
    }

    let rt;
    if (!Number.isFinite(q)) {
      rt = Infinity;
    } else if (input.lambda <= 0) {
      rt = input.svc;
    } else {
      const waitMs = (q / input.lambda) * 1000;
      rt = input.svc + waitMs;
    }

    const utilizationPct = rho * 100;
    const queueDepthMetric = Number.isFinite(q) ? Math.min(q * 4, 100) : 100;
    const responseTimeMetric = Number.isFinite(rt) ? Math.min(rt, 100) : 100;
    const saturationPressure = Math.min(Math.max(utilizationPct, 0), 100);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(
        saturationPressure,
        queueDepthMetric,
        responseTimeMetric
      ),
      metrics: [
        {
          label: "Saturation Pressure",
          value: saturationPressure,
          displayValue: fmtPct(utilizationPct)
        },
        {
          label: "Queue Depth Pressure",
          value: queueDepthMetric,
          displayValue: Number.isFinite(q) ? fmt(q, 2) : "RUNAWAY"
        },
        {
          label: "Response Time Pressure",
          value: responseTimeMetric,
          displayValue: Number.isFinite(rt) ? fmtMs(rt) : "UNBOUNDED"
        }
      ],
      healthyMax: 70,
      watchMax: 85
    });

    let queueClass = "STABLE";
    if (statusPack.status === "WATCH") queueClass = "RISING";
    if (statusPack.status === "RISK") {
      queueClass = Number.isFinite(q) ? "HEAVY" : "RUNAWAY";
    }

    let interpretation = `Total service capacity is ${fmtRps(capacity)} with utilization at ${fmtPct(utilizationPct)}. The modeled queue depth is ${Number.isFinite(q) ? fmt(q, 2) : "RUNAWAY"} and the resulting response time is ${Number.isFinite(rt) ? fmtMs(rt) : "UNBOUNDED"}.`;

    if (statusPack.status === "RISK") {
      interpretation += ` The queue is now in a dangerous region where backlog formation becomes the dominant problem. At this point, small increases in arrival rate can cause queue growth and delay to accelerate much faster than service can recover.`;
    } else if (statusPack.status === "WATCH") {
      interpretation += ` Queueing is present but not yet catastrophic. The system is still working, though delay is already beginning to accumulate instead of remaining flat under load.`;
    } else {
      interpretation += ` Queue pressure remains in a controlled band, so the arrival and service rates are still close enough that backlog stays limited under the current assumptions.`;
    }

    let dominantConstraint = "";
    if (statusPack.dominant.label === "Saturation Pressure") {
      dominantConstraint = "Saturation pressure is the dominant limiter. The main concern is how closely arrival rate is approaching total service capacity.";
    } else if (statusPack.dominant.label === "Queue Depth Pressure") {
      dominantConstraint = "Queue depth pressure is the dominant limiter. The backlog itself is becoming the first practical sign that the system is losing equilibrium under load.";
    } else {
      dominantConstraint = "Response time pressure is the dominant limiter. The system may still be processing work, but service delay is already growing enough to become the user-visible problem.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = "Treat backlog as the active bottleneck signal. Either reduce arrival rate, raise service capacity, or add concurrency before assuming downstream optimizations will fix the visible delay.";
    } else if (statusPack.status === "WATCH") {
      guidance = "The queue is serviceable but rising. This is the point where small load increases can start creating non-trivial backlog, so use concurrency carefully and validate burst behavior.";
    } else {
      guidance = "Queue pressure is balanced. Continue into Concurrency Scaling next to see whether additional workers will improve throughput cleanly or introduce coordination drag.";
    }

    return {
      ok: true,
      arrivalRate: input.lambda,
      serviceRate: input.mu,
      workers: input.k,
      serviceTimeMs: input.svc,
      capacity,
      rho,
      utilizationPct,
      queueDepth: q,
      responseTimeMs: rt,
      queueClass,
      saturationPressure,
      queueDepthMetric,
      responseTimeMetric,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
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
        { label: "Total Capacity", value: fmtRps(data.capacity) },
        { label: "Utilization", value: fmtPct(data.utilizationPct) },
        { label: "Queue Depth", value: Number.isFinite(data.queueDepth) ? fmt(data.queueDepth, 2) : "RUNAWAY" },
        { label: "Response Time", value: Number.isFinite(data.responseTimeMs) ? fmtMs(data.responseTimeMs) : "UNBOUNDED" }
      ],
      derivedRows: [
        { label: "Arrival Rate", value: fmtRps(data.arrivalRate) },
        { label: "Service Rate", value: fmtRps(data.serviceRate) },
        { label: "Workers", value: fmt(data.workers, 0) },
        { label: "Base Service Time", value: fmtMs(data.serviceTimeMs, 1) },
        { label: "Queue Class", value: data.queueClass },
        { label: "Utilization (ρ)", value: fmt(data.rho, 3) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Saturation Pressure",
          "Queue Depth Pressure",
          "Response Time Pressure"
        ],
        values: [
          Number(data.saturationPressure.toFixed(1)),
          Number(data.queueDepthMetric.toFixed(1)),
          Number(data.responseTimeMetric.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.utilizationPct),
          Number.isFinite(data.queueDepth) ? fmt(data.queueDepth, 2) : "RUNAWAY",
          Number.isFinite(data.responseTimeMs) ? fmtMs(data.responseTimeMs) : "UNBOUNDED"
        ],
        referenceValue: 70,
        healthyMax: 70,
        watchMax: 85,
        axisTitle: "Queue Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: 100
      }
    });

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        queueDepth: data.queueDepth,
        utilization: data.rho,
        utilizationPct: data.utilizationPct,
        responseTime: data.responseTimeMs,
        responseTimeMs: data.responseTimeMs,
        workers: data.workers,
        capacity: data.capacity,
        queueClass: data.queueClass
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
    [els.lambda, els.mu, els.k, els.svc].forEach((el) => {
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