(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "cache-hit-ratio";
  const PREVIOUS_STEP = "network-congestion";
  const NEXT_URL = "/tools/performance/bottleneck-analyzer/";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    rps: $("rps"),
    hit: $("hit"),
    hitLat: $("hitLat"),
    missLat: $("missLat"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  const DEFAULTS = {
    rps: 5000,
    hit: 85,
    hitLat: 2,
    missLat: 40
  };

  function num(value) {
    return ScopedLabsAnalyzer.safeNumber(value, NaN);
  }

  function fmtNumber(value, digits = 0) {
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

  function applyDefaults() {
    els.rps.value = String(DEFAULTS.rps);
    els.hit.value = String(DEFAULTS.hit);
    els.hitLat.value = String(DEFAULTS.hitLat);
    els.missLat.value = String(DEFAULTS.missLat);
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
      intro: "This step evaluates whether caching can reduce backend pressure and average latency under the upstream network conditions from the previous step."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const d = flow.data || {};

    const peakTrafficMbps =
      num(d.peakTrafficMbps) ??
      num(d.trafficMbps) ??
      num(d.throughputMbps);

    const utilization =
      num(d.utilization) ??
      num(d.networkUtilization) ??
      num(d.linkUtilization);

    const congestionRisk =
      d.congestionRisk ??
      d.status ??
      d.classification ??
      "—";

    const packetLossPct =
      num(d.packetLossPct) ??
      num(d.packetLoss) ??
      num(d.dropRatePct);

    const queueDelayMs =
      num(d.queueDelayMs) ??
      num(d.latencyPenaltyMs) ??
      num(d.addedLatencyMs);

    const rpsFromPrior =
      num(d.requestsPerSecond) ??
      num(d.rps) ??
      num(d.projectedRps) ??
      num(d.adjustedRps) ??
      num(d.loadRps);

    let derivedRps = null;

    if (Number.isFinite(rpsFromPrior)) {
      derivedRps = rpsFromPrior;
    } else if (Number.isFinite(peakTrafficMbps)) {
      derivedRps = Math.round(peakTrafficMbps * 5);
    }

    if (Number.isFinite(derivedRps) && derivedRps > 0) {
      els.rps.value = String(Math.round(derivedRps));
    }

    if (congestionRisk === "HIGH") {
      els.hit.value = "92";
      els.hitLat.value = "2.0";
      els.missLat.value = Number.isFinite(queueDelayMs) ? String(Math.max(40, queueDelayMs)) : "50";
    } else if (congestionRisk === "MEDIUM") {
      els.hit.value = "88";
      els.hitLat.value = "2.0";
      els.missLat.value = Number.isFinite(queueDelayMs) ? String(Math.max(35, queueDelayMs)) : "40";
    } else if (congestionRisk === "LOW") {
      els.hit.value = "82";
      els.hitLat.value = "2.0";
      els.missLat.value = Number.isFinite(queueDelayMs) ? String(Math.max(25, queueDelayMs)) : "30";
    }

    const contextParts = [];

    if (Number.isFinite(peakTrafficMbps)) {
      contextParts.push(`Peak Traffic: <strong>${fmtNumber(peakTrafficMbps, 0)} Mbps</strong>`);
    }

    if (Number.isFinite(utilization)) {
      const utilPct = utilization <= 1 ? utilization * 100 : utilization;
      contextParts.push(`Network Utilization: <strong>${fmtNumber(utilPct, 1)}%</strong>`);
    }

    if (Number.isFinite(packetLossPct)) {
      contextParts.push(`Packet Loss: <strong>${fmtNumber(packetLossPct, 2)}%</strong>`);
    }

    if (Number.isFinite(queueDelayMs)) {
      contextParts.push(`Queue Delay: <strong>${fmtNumber(queueDelayMs, 1)} ms</strong>`);
    }

    contextParts.push(`Congestion Risk: <strong>${congestionRisk}</strong>`);

    els.flowNote.style.display = "";
    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      ${contextParts.join(", ")}.
      Cache efficiency is now being evaluated as the next mitigation layer to reduce backend misses, lower average latency, and stabilize performance under the upstream network conditions from the previous step.
    `;
  }

  function getInputs() {
    const rps = num(els.rps.value);
    const hitPct = num(els.hit.value);
    const hitLat = num(els.hitLat.value);
    const missLat = num(els.missLat.value);

    if (
      !Number.isFinite(rps) || rps < 0 ||
      !Number.isFinite(hitPct) || hitPct < 0 || hitPct > 100 ||
      !Number.isFinite(hitLat) || hitLat < 0 ||
      !Number.isFinite(missLat) || missLat < 0
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, rps, hitPct, hitLat, missLat };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const { rps, hitPct, hitLat, missLat } = input;

    const hit = hitPct / 100;
    const miss = 1 - hit;

    const hitRps = rps * hit;
    const missRps = rps * miss;
    const avgLat = (hit * hitLat) + (miss * missLat);
    const reductionPct = missLat > 0 ? ((missLat - avgLat) / missLat) * 100 : 0;
    const backendLoadReductionPct = hitPct;

    const cacheMissPressure = 100 - hitPct;
    const latencyRetentionPressure = 100 - reductionPct;

    let backendMissPressure = 0;
    if (missRps <= 500) backendMissPressure = 12;
    else if (missRps <= 1000) backendMissPressure = 24;
    else if (missRps <= 2000) backendMissPressure = 42;
    else if (missRps <= 3500) backendMissPressure = 62;
    else backendMissPressure = 82;

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(cacheMissPressure, backendMissPressure, latencyRetentionPressure),
      metrics: [
        {
          label: "Cache Miss Pressure",
          value: cacheMissPressure,
          displayValue: fmtPct(cacheMissPressure)
        },
        {
          label: "Backend Miss Pressure",
          value: backendMissPressure,
          displayValue: fmtRps(missRps)
        },
        {
          label: "Latency Retention Pressure",
          value: latencyRetentionPressure,
          displayValue: fmtPct(latencyRetentionPressure)
        }
      ],
      healthyMax: 20,
      watchMax: 40
    });

    let cacheStatus = "WEAK";
    if (statusPack.status === "HEALTHY") cacheStatus = "EXCELLENT";
    else if (statusPack.status === "WATCH") cacheStatus = "GOOD";
    else if (Math.max(cacheMissPressure, backendMissPressure, latencyRetentionPressure) <= 65) cacheStatus = "MODERATE";

    const dominantLabel = statusPack.dominant.label;

    let interpretation = `At ${fmtPct(hitPct)}, the cache serves ${fmtRps(hitRps)} while ${fmtRps(missRps)} still reaches the backend. Average latency falls to ${fmtMs(avgLat)}, which represents a ${fmtPct(reductionPct)} reduction from the miss path.`;

    if (statusPack.status === "RISK") {
      interpretation += ` The dominant pressure is already in a risk band, so caching is not yet acting as a strong shield for the origin tier. In practice, too much repeated demand is still leaking through to the backend or too much latency is being retained on the average path.`;
    } else if (statusPack.status === "WATCH") {
      interpretation += ` Cache behavior is helping, but the dominant pressure remains elevated enough that backend systems can still feel sustained peaks and latency improvement is not yet comfortably protected.`;
    } else {
      interpretation += ` Cache behavior is in a controlled band. Repeated demand is being absorbed effectively enough that the backend sees materially less pressure and average latency is being reduced in a meaningful way.`;
    }

    let dominantConstraint = "";
    if (dominantLabel === "Cache Miss Pressure") {
      dominantConstraint = "Cache miss pressure is the dominant limiter. The main issue is that too much traffic is missing the cache outright, so improving cacheability, TTLs, or reuse patterns should move the needle first.";
    } else if (dominantLabel === "Backend Miss Pressure") {
      dominantConstraint = "Backend miss pressure is the dominant limiter. Even with a decent hit ratio on paper, the absolute miss volume is still large enough to keep the origin tier exposed under load.";
    } else {
      dominantConstraint = "Latency retention pressure is the dominant limiter. The cache may be offloading work, but the average latency profile is still carrying too much of the miss-path penalty to feel fully optimized.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = "Review cacheability rules, TTL strategy, eviction behavior, and request locality first. If repeated requests are still bypassing cache or missing too often, downstream bottlenecks will remain exposed no matter how much backend capacity you add.";
    } else if (statusPack.status === "WATCH") {
      guidance = "The cache is helping, but not enough to be ignored. Validate whether miss traffic is bursty or sustained and confirm that hot content is actually remaining resident under peak load.";
    } else {
      guidance = "Cache performance is balanced. Continue into Bottleneck Analyzer next to see which subsystem remains the most likely active constraint after cache offload has reduced backend pressure.";
    }

    return {
      ok: true,
      rps,
      hitPct,
      hitLat,
      missLat,
      hitRps,
      missRps,
      avgLat,
      reductionPct,
      backendLoadReductionPct,
      cacheMissPressure,
      backendMissPressure,
      latencyRetentionPressure,
      cacheStatus,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(STORAGE_KEY, {
      category: CATEGORY,
      step: STEP,
      data: {
        requestsPerSecond: data.rps,
        cacheHitRatioPct: data.hitPct,
        hitRequestsPerSecond: data.hitRps,
        missRequestsPerSecond: data.missRps,
        avgLatencyMs: data.avgLat,
        latencyReductionPct: data.reductionPct,
        backendLoadRps: data.missRps,
        backendLoadReductionPct: data.backendLoadReductionPct,
        cacheStatus: data.cacheStatus
      }
    });
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Hit Requests / sec", value: fmtRps(data.hitRps) },
        { label: "Miss Requests / sec", value: fmtRps(data.missRps) },
        { label: "Average Latency", value: fmtMs(data.avgLat) },
        { label: "Cache Efficiency Status", value: data.cacheStatus }
      ],
      derivedRows: [
        { label: "Cache Hit Ratio", value: fmtPct(data.hitPct) },
        { label: "Latency Reduction", value: fmtPct(data.reductionPct) },
        { label: "Backend Load Reduction", value: fmtPct(data.backendLoadReductionPct) },
        { label: "Hit Latency", value: fmtMs(data.hitLat) },
        { label: "Miss Latency", value: fmtMs(data.missLat) },
        { label: "Total Requests / sec", value: fmtRps(data.rps) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Cache Miss Pressure",
          "Backend Miss Pressure",
          "Latency Retention Pressure"
        ],
        values: [
          Number(data.cacheMissPressure.toFixed(1)),
          Number(data.backendMissPressure.toFixed(1)),
          Number(data.latencyRetentionPressure.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.cacheMissPressure),
          fmtRps(data.missRps),
          fmtPct(data.latencyRetentionPressure)
        ],
        referenceValue: 20,
        healthyMax: 20,
        watchMax: 40,
        axisTitle: "Cache Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(
            Math.max(
              data.cacheMissPressure,
              data.backendMissPressure,
              data.latencyRetentionPressure,
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
    [els.rps, els.hit, els.hitLat, els.missLat].forEach((el) => {
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
