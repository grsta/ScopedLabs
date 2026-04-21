(() => {
  "use strict";

  const CATEGORY = "performance";
  const STEP = "latency-vs-throughput";
  const LANE = "v1";
  const PREVIOUS_STEP = "response-time-sla";
  const NEXT_URL = "/tools/performance/queue-depth/";

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
    baseLat: $("baseLat"),
    t0: $("t0"),
    t1: $("t1"),
    cap: $("cap"),
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
    baseLat: 25,
    t0: 1200,
    t1: 1800,
    cap: 2000
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

  function fmtMs(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} ms` : "—";
  }

  function fmtTput(value, digits = 0) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}` : "—";
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
    els.baseLat.value = String(DEFAULTS.baseLat);
    els.t0.value = String(DEFAULTS.t0);
    els.t1.value = String(DEFAULTS.t1);
    els.cap.value = String(DEFAULTS.cap);
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["queue-depth"]);
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

    const sla =
      num(d.sla) ??
      num(d.slaMs) ??
      num(d.targetLatencyMs);

    const currentLatency =
      num(d.currentLatency) ??
      num(d.currentLatencyMs) ??
      num(d.latencyMs);

    const status =
      d.status ||
      d.slaStatus ||
      null;

    if (Number.isFinite(currentLatency) && currentLatency > 0) {
      if (currentLatency <= 20) {
        els.baseLat.value = "12";
      } else if (currentLatency <= 50) {
        els.baseLat.value = "20";
      } else if (currentLatency <= 100) {
        els.baseLat.value = "30";
      } else {
        els.baseLat.value = "40";
      }
    }

    if (Number.isFinite(sla)) {
      if (sla <= 50) {
        els.cap.value = "1800";
        els.t0.value = "900";
        els.t1.value = "1350";
      } else if (sla <= 100) {
        els.cap.value = "2000";
        els.t0.value = "1200";
        els.t1.value = "1700";
      } else {
        els.cap.value = "2500";
        els.t0.value = "1400";
        els.t1.value = "2100";
      }
    }

    const parts = [];
    if (Number.isFinite(sla)) parts.push(`SLA Target: <strong>${fmt(sla, 1)} ms</strong>`);
    if (Number.isFinite(currentLatency)) parts.push(`Current Latency: <strong>${fmt(currentLatency, 1)} ms</strong>`);
    if (status) parts.push(`SLA Status: <strong>${status}</strong>`);

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
      This step evaluates how rising load will affect latency after the upstream SLA target and current response-time expectations have already been defined.
    `;
  }

  function estLatency(base, utilFraction) {
    const denom = Math.max(0.02, 1 - utilFraction);
    return base / denom;
  }

  function getInputs() {
    const baseLat = num(els.baseLat.value);
    const t0 = num(els.t0.value);
    const t1 = num(els.t1.value);
    const cap = num(els.cap.value);

    if (
      !Number.isFinite(baseLat) || baseLat < 0 ||
      !Number.isFinite(t0) || t0 < 0 ||
      !Number.isFinite(t1) || t1 < 0 ||
      !Number.isFinite(cap) || cap <= 0
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, baseLat, t0, t1, cap };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const u0 = Math.min(0.98, input.t0 / input.cap);
    const u1 = Math.min(0.98, input.t1 / input.cap);

    const l0 = estLatency(input.baseLat, u0);
    const l1 = estLatency(input.baseLat, u1);
    const growth = l0 > 0 ? ((l1 / l0) - 1) * 100 : 0;

    const currentUtilPct = u0 * 100;
    const targetUtilPct = u1 * 100;
    const utilizationRisePct = targetUtilPct - currentUtilPct;

    const saturationPressure = targetUtilPct;
    const latencyGrowthPressure = growth;
    const remainingCapacityPct = Math.max(0, (1 - u1) * 100);
    const reserveTightness = Math.max(0, 100 - remainingCapacityPct);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(
        saturationPressure,
        latencyGrowthPressure,
        reserveTightness
      ),
      metrics: [
        {
          label: "Saturation Pressure",
          value: saturationPressure,
          displayValue: fmtPct(targetUtilPct)
        },
        {
          label: "Latency Growth Pressure",
          value: latencyGrowthPressure,
          displayValue: fmtPct(growth)
        },
        {
          label: "Reserve Tightness",
          value: reserveTightness,
          displayValue: fmtPct(remainingCapacityPct)
        }
      ],
      healthyMax: 70,
      watchMax: 85
    });

    let loadClass = "STABLE";
    if (statusPack.status === "WATCH") loadClass = "RISING";
    if (statusPack.status === "RISK") loadClass = "SATURATION RISK";

    let interpretation = `At current throughput, utilization is ${fmtPct(currentUtilPct)} with modeled latency of ${fmtMs(l0)}. At target throughput, utilization rises to ${fmtPct(targetUtilPct)} and modeled latency increases to ${fmtMs(l1)}.`;

    if (statusPack.status === "RISK") {
      interpretation += ` The system is being pushed into a region where small increases in offered load can cause disproportionately large latency growth. This is the classic pre-saturation knee where response time stops scaling gracefully.`;
    } else if (statusPack.status === "WATCH") {
      interpretation += ` The system is still functioning, but the load curve is already bending enough that latency begins to rise faster than throughput. This is where sustained demand can start eroding user experience quicker than expected.`;
    } else {
      interpretation += ` The load curve remains in a controlled region, so the modeled latency increase is still proportionate and the system retains usable margin before true saturation behavior begins.`;
    }

    let dominantConstraint = "";
    if (statusPack.dominant.label === "Saturation Pressure") {
      dominantConstraint = "Saturation pressure is the dominant limiter. The main risk is how close target throughput is pushing the system toward its capacity ceiling.";
    } else if (statusPack.dominant.label === "Latency Growth Pressure") {
      dominantConstraint = "Latency growth pressure is the dominant limiter. The key problem is not just high utilization, but how sharply response time is starting to expand under additional load.";
    } else {
      dominantConstraint = "Reserve tightness is the dominant limiter. The system is losing too much remaining capacity at the target load, which reduces tolerance for bursts and variance.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = "Treat this as a load-shaping or capacity-planning problem now rather than later. Reducing offered throughput or increasing capacity will usually be more effective than trying to tune latency after the curve has already steepened.";
    } else if (statusPack.status === "WATCH") {
      guidance = "The system is serviceable, but keep an eye on transient spikes and queueing. This is the point where a little more throughput can produce a lot more latency.";
    } else {
      guidance = "The throughput target is balanced. Continue into Queue Depth next to see how the same pressure translates into queue build-up and service delay under load.";
    }

    return {
      ok: true,
      baseLat: input.baseLat,
      currentThroughput: input.t0,
      targetThroughput: input.t1,
      capacity: input.cap,
      currentUtilPct,
      targetUtilPct,
      utilizationRisePct,
      currentLatencyMs: l0,
      targetLatencyMs: l1,
      latencyGrowthPct: growth,
      remainingCapacityPct,
      saturationPressure,
      latencyGrowthPressure,
      reserveTightness,
      loadClass,
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
        { label: "Current Utilization", value: fmtPct(data.currentUtilPct) },
        { label: "Latency @ Current", value: fmtMs(data.currentLatencyMs) },
        { label: "Target Utilization", value: fmtPct(data.targetUtilPct) },
        { label: "Latency @ Target", value: fmtMs(data.targetLatencyMs) }
      ],
      derivedRows: [
        { label: "Base Latency", value: fmtMs(data.baseLat) },
        { label: "Current Throughput", value: fmtTput(data.currentThroughput, 0) },
        { label: "Target Throughput", value: fmtTput(data.targetThroughput, 0) },
        { label: "System Capacity", value: fmtTput(data.capacity, 0) },
        { label: "Latency Growth", value: fmtPct(data.latencyGrowthPct) },
        { label: "Load Class", value: data.loadClass }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Saturation Pressure",
          "Latency Growth Pressure",
          "Reserve Tightness"
        ],
        values: [
          Number(data.saturationPressure.toFixed(1)),
          Number(data.latencyGrowthPressure.toFixed(1)),
          Number(data.reserveTightness.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.targetUtilPct),
          fmtPct(data.latencyGrowthPct),
          fmtPct(data.remainingCapacityPct)
        ],
        referenceValue: 70,
        healthyMax: 70,
        watchMax: 85,
        axisTitle: "Load Curve Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(
            Math.max(
              data.saturationPressure,
              data.latencyGrowthPressure,
              data.reserveTightness,
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
        currentThroughput: data.currentThroughput,
        targetThroughput: data.targetThroughput,
        capacity: data.capacity,
        utilization: data.targetUtilPct / 100,
        currentUtilizationPct: data.currentUtilPct,
        targetUtilizationPct: data.targetUtilPct,
        currentLatencyMs: data.currentLatencyMs,
        latency: data.targetLatencyMs,
        targetLatencyMs: data.targetLatencyMs,
        growth: data.latencyGrowthPct,
        latencyGrowthPct: data.latencyGrowthPct,
        loadClass: data.loadClass
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
    [els.baseLat, els.t0, els.t1, els.cap].forEach((el) => {
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