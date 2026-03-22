(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "cache-hit-ratio";
  const PREVIOUS_STEP = "network-congestion";
  const NEXT_URL = "/tools/performance/bottleneck-analyzer/";

  const $ = (id) => document.getElementById(id);

  const els = {
    rps: $("rps"),
    hit: $("hit"),
    hitLat: $("hitLat"),
    missLat: $("missLat"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
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

  function row(label, value) {
    return `<div class="result-row">
      <span class="result-label">${label}</span>
      <span class="result-value">${value}</span>
    </div>`;
  }

  function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function fmtNumber(value, digits = 0) {
    const n = num(value);
    return n === null ? "—" : n.toFixed(digits);
  }

  function showContinue() {
    els.continueWrap.style.display = "";
    els.continueBtn.disabled = false;
  }

  function hideContinue() {
    els.continueWrap.style.display = "none";
    els.continueBtn.disabled = true;
  }

  function clearStored() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function setDefaultResults() {
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  function resetInputsToDefaults() {
    els.rps.value = DEFAULTS.rps;
    els.hit.value = DEFAULTS.hit;
    els.hitLat.value = DEFAULTS.hitLat;
    els.missLat.value = DEFAULTS.missLat;
  }

  function getSaved() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function hideFlowNote() {
    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";
  }

  function showFlowNote(html) {
    els.flowNote.innerHTML = html;
    els.flowNote.style.display = "";
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function invalidate() {
    clearStored();
    hideContinue();
    setDefaultResults();
  }

  function loadPrior() {
    const saved = getSaved();

    hideFlowNote();

    if (!saved || saved.category !== CATEGORY || saved.step !== PREVIOUS_STEP) {
      return;
    }

    const d = saved.data || {};

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

    if (rpsFromPrior !== null) {
      derivedRps = rpsFromPrior;
    } else if (peakTrafficMbps !== null) {
      derivedRps = Math.round(peakTrafficMbps * 5);
    }

    if (derivedRps !== null && derivedRps > 0) {
      els.rps.value = String(Math.round(derivedRps));
    }

    if (congestionRisk === "HIGH") {
      els.hit.value = "92";
      els.hitLat.value = "2.0";
      els.missLat.value = queueDelayMs !== null ? String(Math.max(40, queueDelayMs)) : "50";
    } else if (congestionRisk === "MEDIUM") {
      els.hit.value = "88";
      els.hitLat.value = "2.0";
      els.missLat.value = queueDelayMs !== null ? String(Math.max(35, queueDelayMs)) : "40";
    } else if (congestionRisk === "LOW") {
      els.hit.value = "82";
      els.hitLat.value = "2.0";
      els.missLat.value = queueDelayMs !== null ? String(Math.max(25, queueDelayMs)) : "30";
    }

    const contextParts = [];

    if (peakTrafficMbps !== null) {
      contextParts.push(`Peak Traffic: <strong>${fmtNumber(peakTrafficMbps, 0)} Mbps</strong>`);
    }

    if (utilization !== null) {
      const utilPct = utilization <= 1 ? utilization * 100 : utilization;
      contextParts.push(`Network Utilization: <strong>${fmtNumber(utilPct, 1)}%</strong>`);
    }

    if (packetLossPct !== null) {
      contextParts.push(`Packet Loss: <strong>${fmtNumber(packetLossPct, 2)}%</strong>`);
    }

    if (queueDelayMs !== null) {
      contextParts.push(`Queue Delay: <strong>${fmtNumber(queueDelayMs, 1)} ms</strong>`);
    }

    contextParts.push(`Congestion Risk: <strong>${congestionRisk}</strong>`);

    showFlowNote(`
      <strong>Carried over context</strong><br>
      ${contextParts.join(", ")}.
      Cache efficiency is now being evaluated as the next mitigation layer to reduce backend misses, lower average latency, and stabilize performance under the upstream network conditions from the previous step.
    `);
  }

  function calculateStatus(hitPct, reductionPct, backendLoadRps) {
    if (hitPct >= 90 && reductionPct >= 80 && backendLoadRps <= 1000) {
      return "EXCELLENT";
    }
    if (hitPct >= 80 && reductionPct >= 60) {
      return "GOOD";
    }
    if (hitPct >= 65 && reductionPct >= 40) {
      return "MODERATE";
    }
    return "WEAK";
  }

  function calculateInterpretation(status, hitPct, missRps, avgLat, reductionPct) {
    if (status === "EXCELLENT") {
      return `Cache behavior is strong. With a ${hitPct.toFixed(1)}% hit ratio, backend misses are held to ${missRps.toFixed(0)} req/s and average latency drops to ${avgLat.toFixed(2)} ms. This indicates caching is materially absorbing repeated demand and protecting the origin tier from unnecessary load.`;
    }

    if (status === "GOOD") {
      return `Cache efficiency is healthy. The cache is offloading a meaningful share of repeated traffic, cutting effective latency by ${reductionPct.toFixed(1)}%. Backend systems still see ${missRps.toFixed(0)} req/s, so origin sizing and downstream bottlenecks still matter under sustained peaks.`;
    }

    if (status === "MODERATE") {
      return `Cache performance is only moderate. Miss traffic remains high enough at ${missRps.toFixed(0)} req/s that backend services are still exposed during bursts. Review cacheability of responses, eviction policy, TTL strategy, and request locality to improve protection of the origin path.`;
    }

    return `Cache effectiveness is weak. The current hit ratio leaves too much traffic reaching the backend, so average latency improvement is limited and origin load remains elevated. In engineering terms, the cache is not yet functioning as a strong performance shield and bottlenecks are likely to remain downstream.`;
  }

  function calc() {
    const rps = parseFloat(els.rps.value);
    const hitPct = parseFloat(els.hit.value);
    const hitLat = parseFloat(els.hitLat.value);
    const missLat = parseFloat(els.missLat.value);

    if (
      !Number.isFinite(rps) || rps < 0 ||
      !Number.isFinite(hitPct) || hitPct < 0 || hitPct > 100 ||
      !Number.isFinite(hitLat) || hitLat < 0 ||
      !Number.isFinite(missLat) || missLat < 0
    ) {
      els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      hideContinue();
      return;
    }

    const hit = hitPct / 100;
    const miss = 1 - hit;

    const hitRps = rps * hit;
    const missRps = rps * miss;
    const avgLat = (hit * hitLat) + (miss * missLat);
    const reductionPct = missLat > 0 ? ((missLat - avgLat) / missLat) * 100 : 0;
    const backendLoadReductionPct = hitPct;
    const status = calculateStatus(hitPct, reductionPct, missRps);
    const interpretation = calculateInterpretation(status, hitPct, missRps, avgLat, reductionPct);

    els.results.innerHTML = [
      row("Hit Requests / sec", `${hitRps.toFixed(0)}`),
      row("Miss Requests / sec", `${missRps.toFixed(0)}`),
      row("Average Latency", `${avgLat.toFixed(2)} ms`),
      row("Latency Reduction", `${reductionPct.toFixed(1)}%`),
      row("Backend Load Reduction", `${backendLoadReductionPct.toFixed(1)}%`),
      row("Cache Efficiency Status", status),
      row("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        requestsPerSecond: rps,
        cacheHitRatioPct: hitPct,
        hitRequestsPerSecond: hitRps,
        missRequestsPerSecond: missRps,
        avgLatencyMs: avgLat,
        latencyReductionPct: reductionPct,
        backendLoadRps: missRps,
        backendLoadReductionPct: backendLoadReductionPct,
        cacheStatus: status
      }
    }));

    showContinue();
  }

  function reset() {
    resetInputsToDefaults();
    clearStored();
    hideContinue();
    setDefaultResults();
    loadPrior();
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
    hideContinue();
    setDefaultResults();
    loadPrior();
    bind();
  }

  init();
})();
