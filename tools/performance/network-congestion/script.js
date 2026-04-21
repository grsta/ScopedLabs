(() => {
  "use strict";

  const CATEGORY = "performance";
  const STEP = "network-congestion";
  const LANE = "v1";
  const PREVIOUS_STEP = "disk-saturation";
  const NEXT_URL = "/tools/performance/cache-hit-ratio/";

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
    cur: $("cur"),
    peak: $("peak"),
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
    cur: 600,
    peak: 900,
    cap: 1000,
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

  function fmtMbps(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} Mbps` : "—";
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
    els.cur.value = String(DEFAULTS.cur);
    els.peak.value = String(DEFAULTS.peak);
    els.cap.value = String(DEFAULTS.cap);
    els.util.value = String(DEFAULTS.util);
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
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

    const throughputMBps =
      num(d.throughputMBps) ??
      num(d.throughput) ??
      num(d.diskThroughputMBps);

    const diskUtilizationPct =
      num(d.diskUtilizationPct) ??
      num(d.utilizationPct);

    const capacityMBps =
      num(d.capacityMBps) ??
      num(d.capacity);

    const totalIops = num(d.totalIops);
    const saturated = Boolean(d.saturated);
    const targetUtilizationPct = num(d.targetUtilizationPct);

    if (Number.isFinite(throughputMBps) && throughputMBps > 0) {
      els.cur.value = String(Math.round(throughputMBps));
      els.peak.value = String(Math.round(throughputMBps * (saturated ? 1.35 : 1.20)));
    }

    if (Number.isFinite(capacityMBps) && capacityMBps > 0) {
      els.cap.value = String(Math.round(capacityMBps));
    }

    if (Number.isFinite(targetUtilizationPct) && targetUtilizationPct > 0) {
      els.util.value = String(Math.round(targetUtilizationPct));
    } else if (Number.isFinite(diskUtilizationPct) && diskUtilizationPct > 0) {
      els.util.value = String(Math.round(diskUtilizationPct));
    }

    const parts = [];
    if (Number.isFinite(throughputMBps)) parts.push(`Disk Throughput: <strong>${fmt(throughputMBps, 1)} MB/s</strong>`);
    if (Number.isFinite(diskUtilizationPct)) parts.push(`Disk Utilization: <strong>${fmt(diskUtilizationPct, 1)}%</strong>`);
    if (Number.isFinite(capacityMBps)) parts.push(`Disk Capacity: <strong>${fmt(capacityMBps, 0)} MB/s</strong>`);
    if (Number.isFinite(totalIops)) parts.push(`Total IOPS: <strong>${fmt(totalIops, 0)}</strong>`);
    parts.push(`Saturation Risk: <strong>${saturated ? "Yes" : "No"}</strong>`);

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
      This step checks whether network bandwidth becomes the next limiter after storage throughput and disk saturation were evaluated.
    `;
  }

  function getInputs() {
    const cur = num(els.cur.value);
    const peak = num(els.peak.value);
    const cap = num(els.cap.value);
    const utilPct = num(els.util.value);

    if (
      !Number.isFinite(cur) || cur < 0 ||
      !Number.isFinite(peak) || peak < 0 ||
      !Number.isFinite(cap) || cap <= 0 ||
      !Number.isFinite(utilPct) || utilPct <= 0 || utilPct > 95
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, cur, peak, cap, utilPct };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const currentUtilizationPct = (input.cur / input.cap) * 100;
    const peakUtilizationPct = (input.peak / input.cap) * 100;
    const targetThroughputMbps = input.cap * (input.utilPct / 100);

    const congestionRisk =
      input.peak > targetThroughputMbps ? "HIGH" :
      input.cur > targetThroughputMbps ? "MEDIUM" :
      "LOW";

    const saturationPressure = peakUtilizationPct;
    const targetBandOverrunPct = Math.max(0, peakUtilizationPct - input.utilPct);
    const reserveTightnessPct = Math.max(0, 100 - (100 - peakUtilizationPct));

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(
        saturationPressure,
        targetBandOverrunPct * 2,
        reserveTightnessPct
      ),
      metrics: [
        {
          label: "Saturation Pressure",
          value: saturationPressure,
          displayValue: fmtPct(peakUtilizationPct)
        },
        {
          label: "Target Band Overrun",
          value: targetBandOverrunPct * 2,
          displayValue: fmtPct(targetBandOverrunPct)
        },
        {
          label: "Reserve Tightness",
          value: reserveTightnessPct,
          displayValue: fmtPct(100 - peakUtilizationPct)
        }
      ],
      healthyMax: 70,
      watchMax: 85
    });

    let congestionClass = "LOW";
    if (statusPack.status === "WATCH") congestionClass = "MEDIUM";
    if (statusPack.status === "RISK") congestionClass = "HIGH";

    let interpretation = `Current traffic uses ${fmtPct(currentUtilizationPct)} of link capacity and peak traffic reaches ${fmtPct(peakUtilizationPct)}. The target operating band allows about ${fmtMbps(targetThroughputMbps)} before congestion planning limits are exceeded.`;

    if (statusPack.status === "RISK") {
      interpretation += ` The path is already in a congestion-prone region where queueing, retransmits, latency spikes, and throughput collapse become much more likely under peak conditions.`;
    } else if (statusPack.status === "WATCH") {
      interpretation += ` The link remains usable, but pressure is high enough that bursts can start producing meaningful delay and jitter instead of remaining invisible to applications.`;
    } else {
      interpretation += ` The link still has practical room before congestion becomes the dominant limiter, so network pressure remains in a controlled band under the current assumptions.`;
    }

    let dominantConstraint = "";
    if (statusPack.dominant.label === "Saturation Pressure") {
      dominantConstraint = "Saturation pressure is the dominant limiter. The main concern is how close peak traffic is pushing the link toward full utilization.";
    } else if (statusPack.dominant.label === "Target Band Overrun") {
      dominantConstraint = "Target band overrun is the dominant limiter. The design is exceeding its intended operating band before the link is technically full, which reduces resilience under bursts.";
    } else {
      dominantConstraint = "Reserve tightness is the dominant limiter. The link is losing too much spare capacity at peak load, leaving less tolerance for spikes, retries, and mixed traffic behavior.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = "Treat network capacity as the next bottleneck candidate. Validate queueing behavior, burst profile, and transport retries before assuming downstream application layers are the primary cause of delay.";
    } else if (statusPack.status === "WATCH") {
      guidance = "The path is still serviceable, but monitor burst behavior closely. This is where moderate growth can turn a healthy link into a congestion-sensitive one.";
    } else {
      guidance = "Network headroom is balanced. Continue into Cache Hit Ratio next to determine whether caching can further reduce backend pressure and response-time instability.";
    }

    return {
      ok: true,
      currentTrafficMbps: input.cur,
      peakTrafficMbps: input.peak,
      linkCapacityMbps: input.cap,
      currentUtilizationPct,
      peakUtilizationPct,
      targetThroughputMbps,
      targetUtilizationPct: input.utilPct,
      targetBandOverrunPct,
      reserveTightnessPct,
      congestionClass,
      congestionRisk,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      saturationPressure
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
        { label: "Current Utilization", value: fmtPct(data.currentUtilizationPct) },
        { label: "Peak Utilization", value: fmtPct(data.peakUtilizationPct) },
        { label: "Target Throughput @ Util", value: fmtMbps(data.targetThroughputMbps) },
        { label: "Congestion Class", value: data.congestionClass }
      ],
      derivedRows: [
        { label: "Current Traffic", value: fmtMbps(data.currentTrafficMbps) },
        { label: "Peak Traffic", value: fmtMbps(data.peakTrafficMbps) },
        { label: "Link Capacity", value: fmtMbps(data.linkCapacityMbps) },
        { label: "Target Utilization", value: fmtPct(data.targetUtilizationPct) },
        { label: "Target Band Overrun", value: fmtPct(data.targetBandOverrunPct) },
        { label: "Reserve Remaining", value: fmtPct(100 - data.peakUtilizationPct) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Saturation Pressure",
          "Target Band Overrun",
          "Reserve Tightness"
        ],
        values: [
          Number(data.saturationPressure.toFixed(1)),
          Number((data.targetBandOverrunPct * 2).toFixed(1)),
          Number(data.reserveTightnessPct.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.peakUtilizationPct),
          fmtPct(data.targetBandOverrunPct),
          fmtPct(100 - data.peakUtilizationPct)
        ],
        referenceValue: 70,
        healthyMax: 70,
        watchMax: 85,
        axisTitle: "Congestion Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(
            Math.max(
              data.saturationPressure,
              data.targetBandOverrunPct * 2,
              data.reserveTightnessPct,
              85
            ) * 1.12
          )
        )
      }
    });

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        currentTrafficMbps: data.currentTrafficMbps,
        peakTrafficMbps: data.peakTrafficMbps,
        linkCapacityMbps: data.linkCapacityMbps,
        utilization: data.peakUtilizationPct / 100,
        currentUtilizationPct: data.currentUtilizationPct,
        peakUtilizationPct: data.peakUtilizationPct,
        targetUtilizationPct: data.targetUtilizationPct,
        targetThroughputMbps: data.targetThroughputMbps,
        congestionRisk: data.congestionRisk,
        congestionClass: data.congestionClass
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
    [els.cur, els.peak, els.cap, els.util].forEach((el) => {
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