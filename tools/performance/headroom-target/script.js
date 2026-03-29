const LANE = "v1";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "headroom-target";
  const PREVIOUS_STEP = "bottleneck-analyzer";
  const NEXT_URL = "/tools/performance/";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    u: $("u"),
    h: $("h"),
    cap: $("cap"),
    unit: $("unit"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  const DEFAULTS = {
    u: 60,
    h: 25,
    cap: 1000,
    unit: "req/s"
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

  function applyDefaults() {
    els.u.value = String(DEFAULTS.u);
    els.h.value = String(DEFAULTS.h);
    els.cap.value = String(DEFAULTS.cap);
    els.unit.value = DEFAULTS.unit;
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
      intro: "This final step converts the identified bottleneck into a safer operating target by reserving headroom for bursts, failover conditions, and future growth."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const d = flow.data || {};

    const highestSubsystem =
      d.highestSubsystem ||
      d.likelyBottleneck ||
      d.bottleneckSubsystem ||
      "—";

    const highestUtilizationPct =
      num(d.highestUtilizationPct) ??
      num(d.highestUtilization) ??
      num(d.maxUtilizationPct) ??
      num(d.currentUtilizationPct);

    const secondHighestSubsystem =
      d.secondHighestSubsystem || "—";

    const secondHighestUtilizationPct =
      num(d.secondHighestUtilizationPct) ??
      num(d.secondHighestUtilization);

    const bottleneckStatus =
      d.bottleneckStatus ||
      d.status ||
      d.severity ||
      "—";

    const bottleneckGapPts =
      num(d.bottleneckGapPts) ??
      num(d.spread) ??
      num(d.utilizationGapPts);

    const averageUtilizationPct =
      num(d.averageUtilizationPct) ??
      num(d.avgUtilizationPct);

    const balanceStatus =
      d.balanceStatus ||
      d.loadBalance ||
      "—";

    if (Number.isFinite(highestUtilizationPct)) {
      els.u.value = String(Math.round(highestUtilizationPct));

      if (highestUtilizationPct >= 90) {
        els.h.value = "30";
      } else if (highestUtilizationPct >= 80) {
        els.h.value = "25";
      } else if (highestUtilizationPct >= 70) {
        els.h.value = "20";
      } else {
        els.h.value = "15";
      }
    }

    if (highestSubsystem === "CPU") {
      els.unit.value = "req/s";
      els.cap.value = "1000";
    } else if (highestSubsystem === "Network") {
      els.unit.value = "Mbps";
      els.cap.value = "1000";
    } else if (highestSubsystem === "Disk") {
      els.unit.value = "IOPS";
      els.cap.value = "10000";
    } else if (highestSubsystem === "Memory") {
      els.unit.value = "req/s";
      els.cap.value = "1000";
    }

    const parts = [];

    if (highestSubsystem !== "—" && Number.isFinite(highestUtilizationPct)) {
      parts.push(`Likely Bottleneck: <strong>${highestSubsystem} (${fmt(highestUtilizationPct, 1)}%)</strong>`);
    }
    if (secondHighestSubsystem !== "—" && Number.isFinite(secondHighestUtilizationPct)) {
      parts.push(`Second Highest: <strong>${secondHighestSubsystem} (${fmt(secondHighestUtilizationPct, 1)}%)</strong>`);
    }
    if (bottleneckStatus !== "—") {
      parts.push(`Severity: <strong>${bottleneckStatus}</strong>`);
    }
    if (Number.isFinite(bottleneckGapPts)) {
      parts.push(`Gap: <strong>${fmt(bottleneckGapPts, 1)} pts</strong>`);
    }
    if (Number.isFinite(averageUtilizationPct)) {
      parts.push(`Average Utilization: <strong>${fmt(averageUtilizationPct, 1)}%</strong>`);
    }
    if (balanceStatus !== "—") {
      parts.push(`Load Balance: <strong>${balanceStatus}</strong>`);
    }

    els.flowNote.style.display = "";
    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      ${parts.join(", ")}.
      This final step converts the identified bottleneck into a safer operating target by reserving headroom for bursts, failover conditions, and future growth.
    `;
  }

  function getInputs() {
    const uPct = num(els.u.value);
    const hPct = num(els.h.value);
    const cap = num(els.cap.value);
    const unit = els.unit.value;

    if (
      !Number.isFinite(uPct) || uPct < 0 || uPct > 100 ||
      !Number.isFinite(hPct) || hPct < 0 || hPct >= 100 ||
      !Number.isFinite(cap) || cap <= 0
    ) {
      return { ok: false, message: "Enter valid values and press Calculate." };
    }

    return { ok: true, uPct, hPct, cap, unit };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const { uPct, hPct, cap, unit } = input;

    const u = uPct / 100;
    const h = hPct / 100;
    const safeUtil = 1 - h;
    const currentLoad = cap * u;
    const maxLoad = cap * safeUtil;
    const remainingSafeCapacity = maxLoad - currentLoad;
    const growthUntilLimitPct = maxLoad > 0 ? (remainingSafeCapacity / maxLoad) * 100 : 0;
    const overloadAgainstTarget = Math.max(0, currentLoad - maxLoad);

    const operatingPressure = uPct;
    const headroomDeficitPct = Math.max(0, uPct - (safeUtil * 100));
    const reserveTightnessPct = Math.max(0, (uPct + hPct) - 100);

    const operatingPressureMetric = operatingPressure;
    const headroomDeficitMetric = headroomDeficitPct * 2;
    const reserveTightnessMetric = reserveTightnessPct * 2;

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(
        operatingPressureMetric,
        headroomDeficitMetric,
        reserveTightnessMetric
      ),
      metrics: [
        {
          label: "Operating Pressure",
          value: operatingPressureMetric,
          displayValue: fmtPct(uPct)
        },
        {
          label: "Headroom Deficit",
          value: headroomDeficitMetric,
          displayValue: fmtPct(headroomDeficitPct)
        },
        {
          label: "Reserve Tightness",
          value: reserveTightnessMetric,
          displayValue: fmtPct(hPct)
        }
      ],
      healthyMax: 70,
      watchMax: 85
    });

    let headroomStatus = "HEALTHY";
    if (statusPack.status === "WATCH") headroomStatus = "WATCH";
    if (statusPack.status === "RISK") {
      headroomStatus = overloadAgainstTarget > 0 ? "OVER TARGET" : "TIGHT";
    }

    let interpretation = `Current utilization is ${fmtPct(uPct)} with a desired reserve of ${fmtPct(hPct)}. That translates to a recommended maximum operating utilization of ${fmtPct(safeUtil * 100)} and a recommended maximum load of ${fmt(maxLoad, 1)} ${unit}.`;

    if (statusPack.status === "RISK") {
      interpretation += ` The operating point is already too close to, or beyond, the intended safe band. In engineering terms, the system is now consuming reserve that should have been preserved for bursts, failover, or growth, so resilience is materially reduced.`;
    } else if (statusPack.status === "WATCH") {
      interpretation += ` The system is still inside the target envelope, but reserve is tight enough that growth or transient peaks can erode the remaining margin faster than expected.`;
    } else {
      interpretation += ` The operating point remains in a controlled band, so reserve capacity is still available for bursts, transient degradation, and moderate growth.`;
    }

    let dominantConstraint = "";
    if (statusPack.dominant.label === "Operating Pressure") {
      dominantConstraint = "Operating pressure is the dominant limiter. The main concern is the current fraction of capacity already being consumed.";
    } else if (statusPack.dominant.label === "Headroom Deficit") {
      dominantConstraint = "Headroom deficit is the dominant limiter. The design is already overrunning the intended safe operating band rather than merely approaching it.";
    } else {
      dominantConstraint = "Reserve tightness is the dominant limiter. The biggest risk is not today’s load alone, but how little reserve remains once the desired headroom is honored.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = "Lower sustained load, add capacity, or reduce the required burst envelope before treating this target as safe. A system that has already consumed its reserve is much less tolerant of failure, spikes, or growth.";
    } else if (statusPack.status === "WATCH") {
      guidance = "The target is serviceable, but expansion planning should start before the remaining reserve is consumed. Validate whether the chosen headroom percentage truly reflects expected burst and failover conditions.";
    } else {
      guidance = "This headroom target is balanced. Use it as a practical safe operating ceiling for ongoing planning and monitoring rather than relying on raw maximum capacity alone.";
    }

    return {
      ok: true,
      uPct,
      hPct,
      cap,
      unit,
      currentLoad,
      maxLoad,
      remainingSafeCapacity,
      growthUntilLimitPct,
      overloadAgainstTarget,
      recommendedMaxUtilizationPct: safeUtil * 100,
      headroomStatus,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      operatingPressure,
      headroomDeficitPct,
      reserveTightnessPct,
      operatingPressureMetric,
      headroomDeficitMetric,
      reserveTightnessMetric
    };
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(STORAGE_KEY, {
      category: CATEGORY,
      step: STEP,
      data: {
        currentUtilizationPct: data.uPct,
        desiredHeadroomPct: data.hPct,
        currentCapacity: data.cap,
        unit: data.unit,
        currentLoad: data.currentLoad,
        recommendedMaxLoad: data.maxLoad,
        recommendedMaxUtilizationPct: data.recommendedMaxUtilizationPct,
        remainingSafeCapacity: data.remainingSafeCapacity,
        growthUntilLimitPct: data.growthUntilLimitPct,
        overloadAgainstTarget: data.overloadAgainstTarget,
        headroomStatus: data.headroomStatus
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
        { label: "Current Load", value: `${fmt(data.currentLoad, 1)} ${data.unit}` },
        { label: "Recommended Max Load", value: `${fmt(data.maxLoad, 1)} ${data.unit}` },
        { label: "Recommended Max Utilization", value: fmtPct(data.recommendedMaxUtilizationPct) },
        { label: "Headroom Status", value: data.headroomStatus }
      ],
      derivedRows: [
        { label: "Desired Headroom", value: fmtPct(data.hPct) },
        { label: "Remaining Safe Capacity", value: `${fmt(data.remainingSafeCapacity, 1)} ${data.unit}` },
        { label: "Growth Until Target Limit", value: fmtPct(data.growthUntilLimitPct) },
        { label: "Current Capacity", value: `${fmt(data.cap, 1)} ${data.unit}` },
        { label: "Overload Against Target", value: `${fmt(data.overloadAgainstTarget, 1)} ${data.unit}` },
        { label: "Current Utilization", value: fmtPct(data.uPct) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Operating Pressure",
          "Headroom Deficit",
          "Reserve Tightness"
        ],
        values: [
          Number(data.operatingPressureMetric.toFixed(1)),
          Number(data.headroomDeficitMetric.toFixed(1)),
          Number(data.reserveTightnessMetric.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.uPct),
          fmtPct(data.headroomDeficitPct),
          fmtPct(data.hPct)
        ],
        referenceValue: 70,
        healthyMax: 70,
        watchMax: 85,
        axisTitle: "Headroom Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(
            Math.max(
              data.operatingPressureMetric,
              data.headroomDeficitMetric,
              data.reserveTightnessMetric,
              85
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
    [els.u, els.h, els.cap, els.unit].forEach((el) => {
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
