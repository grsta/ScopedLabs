(() => {
  const FLOW_KEYS = {
    poe: "scopedlabs:pipeline:network:poe-budget",
    bandwidth: "scopedlabs:pipeline:network:bandwidth",
    oversub: "scopedlabs:pipeline:network:oversubscription",
    latency: "scopedlabs:pipeline:network:latency"
  };

  const DEFAULTS = {
    devices: 16,
    bitrate: 4,
    peakFactor: 1.5,
    overheadPct: 12,
    otherTraffic: 25,
    uplinkMbps: 1000,
    safeUtil: 70
  };

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    devices: $("devices"),
    bitrate: $("bitrate"),
    peakFactor: $("peakFactor"),
    overheadPct: $("overheadPct"),
    otherTraffic: $("otherTraffic"),
    uplinkMbps: $("uplinkMbps"),
    safeUtil: $("safeUtil"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("next-step-row"),
    continueBtn: $("to-oversubscription")
  };

  function fmtMbps(value) {
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toFixed(1)} Mbps` : "—";
  }

  function fmtPct(value) {
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toFixed(1)}%` : "—";
  }

  function applyDefaults() {
    els.devices.value = String(DEFAULTS.devices);
    els.bitrate.value = String(DEFAULTS.bitrate);
    els.peakFactor.value = String(DEFAULTS.peakFactor);
    els.overheadPct.value = String(DEFAULTS.overheadPct);
    els.otherTraffic.value = String(DEFAULTS.otherTraffic);
    els.uplinkMbps.value = String(DEFAULTS.uplinkMbps);
    els.safeUtil.value = String(DEFAULTS.safeUtil);
  }

  function getStoredFlow(key) {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function clearDownstreamState() {
    try {
      sessionStorage.removeItem(FLOW_KEYS.bandwidth);
      sessionStorage.removeItem(FLOW_KEYS.oversub);
      sessionStorage.removeItem(FLOW_KEYS.latency);
    } catch {}
  }

  function renderFlowContext() {
    if (!els.flowNote) return null;

    const flow = getStoredFlow(FLOW_KEYS.poe);
    const validUpstream =
      flow &&
      flow.category === "network" &&
      flow.step === "poe-budget" &&
      flow.data;

    if (!validUpstream) {
      els.flowNote.hidden = false;
      els.flowNote.innerHTML = `
        <strong>Step 2 — Network pipeline:</strong><br>
        After confirming edge power, estimate the traffic those devices place on the network before checking aggregation pressure.
      `;
      return null;
    }

    const data = flow.data || {};
    const poeBudgetW = ScopedLabsAnalyzer.safeNumber(data.poeBudgetW, NaN);
    const safeBudgetW = ScopedLabsAnalyzer.safeNumber(data.safeBudgetW, NaN);
    const headroomW = ScopedLabsAnalyzer.safeNumber(data.poeHeadroomW ?? data.headroomW, NaN);
    const utilPct = ScopedLabsAnalyzer.safeNumber(data.poeUtilPct ?? data.utilizationPct, NaN);
    const poweredDevices = ScopedLabsAnalyzer.safeNumber(
      data.poweredDevices ?? data.devices ?? data.modeledDevices,
      NaN
    );
    const status =
      typeof data.poeStatus === "string"
        ? data.poeStatus
        : typeof data.status === "string"
        ? data.status
        : "";

    const parts = [];
    if (Number.isFinite(poeBudgetW)) parts.push(`PoE Budget: ${poeBudgetW.toFixed(0)} W`);
    if (Number.isFinite(safeBudgetW)) parts.push(`Safe Budget: ${safeBudgetW.toFixed(0)} W`);
    if (Number.isFinite(headroomW)) parts.push(`PoE Headroom: ${headroomW.toFixed(0)} W`);
    if (Number.isFinite(utilPct)) parts.push(`PoE Util: ${utilPct.toFixed(0)}%`);
    if (Number.isFinite(poweredDevices)) parts.push(`Powered Devices: ${Math.round(poweredDevices)}`);
    if (status) parts.push(`PoE Status: ${String(status).toUpperCase()}`);

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = parts.length
      ? `<strong>Step 2 — Using PoE results:</strong><br>${parts.join(" | ")}`
      : `
        <strong>Step 2 — Network pipeline:</strong><br>
        After confirming edge power, estimate the traffic those devices place on the network before checking aggregation pressure.
      `;

    return flow;
  }

  function maybePrefillFromUpstream(upstream) {
    if (!upstream || !upstream.data) return;

    const poweredDevices = ScopedLabsAnalyzer.safeNumber(
      upstream.data.poweredDevices ??
      upstream.data.devices ??
      upstream.data.modeledDevices,
      NaN
    );

    if (Number.isFinite(poweredDevices) && poweredDevices > 0) {
      els.devices.value = String(Math.round(poweredDevices));
    }
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) clearDownstreamState();

    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    renderFlowContext();
  }

  function getInputs() {
    const devices = ScopedLabsAnalyzer.safeNumber(els.devices.value, NaN);
    const bitrate = ScopedLabsAnalyzer.safeNumber(els.bitrate.value, NaN);
    const peakFactor = ScopedLabsAnalyzer.safeNumber(els.peakFactor.value, NaN);
    const overheadPct = ScopedLabsAnalyzer.safeNumber(els.overheadPct.value, NaN);
    const otherTraffic = ScopedLabsAnalyzer.safeNumber(els.otherTraffic.value, NaN);
    const uplinkMbps = ScopedLabsAnalyzer.safeNumber(els.uplinkMbps.value, NaN);
    const safeUtil = ScopedLabsAnalyzer.clamp(
      ScopedLabsAnalyzer.safeNumber(els.safeUtil.value, NaN),
      1,
      99
    );

    if ([devices, bitrate, peakFactor, overheadPct, otherTraffic, uplinkMbps, safeUtil].some((v) => !Number.isFinite(v))) {
      return { ok: false, message: "Enter valid numeric values." };
    }

    if (devices <= 0) return { ok: false, message: "Active streams / devices must be greater than 0." };
    if (bitrate < 0) return { ok: false, message: "Average Mbps per stream / device cannot be negative." };
    if (peakFactor < 1) return { ok: false, message: "Peak factor must be at least 1." };
    if (overheadPct < 0) return { ok: false, message: "Protocol overhead cannot be negative." };
    if (otherTraffic < 0) return { ok: false, message: "Other traffic allowance cannot be negative." };
    if (uplinkMbps <= 0) return { ok: false, message: "Current uplink capacity must be greater than 0 Mbps." };

    return { ok: true, devices, bitrate, peakFactor, overheadPct, otherTraffic, uplinkMbps, safeUtil };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const { devices, bitrate, peakFactor, overheadPct, otherTraffic, uplinkMbps, safeUtil } = input;
    const overheadMultiplier = 1 + (overheadPct / 100);

    const avgStream = devices * bitrate;
    const peakStream = avgStream * peakFactor;
    const avgWithOverhead = avgStream * overheadMultiplier;
    const peakWithOverhead = peakStream * overheadMultiplier;
    const avgTotal = avgWithOverhead + otherTraffic;
    const peakTotal = peakWithOverhead + otherTraffic;

    const utilAvg = (avgTotal / uplinkMbps) * 100;
    const utilPeak = (peakTotal / uplinkMbps) * 100;
    const burstDeltaPct = ((peakTotal - avgTotal) / uplinkMbps) * 100;
    const protocolAndBackgroundPct = ((peakTotal - peakStream) / uplinkMbps) * 100;
    const recUplink = peakTotal / (safeUtil / 100);
    const shortfallMbps = Math.max(0, recUplink - uplinkMbps);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: utilPeak,
      metrics: [
        { label: "Average Load", value: utilAvg, displayValue: fmtPct(utilAvg) },
        { label: "Peak Load", value: utilPeak, displayValue: fmtPct(utilPeak) },
        { label: "Burst Delta", value: burstDeltaPct, displayValue: fmtPct(burstDeltaPct) }
      ],
      healthyMax: safeUtil,
      watchMax: Math.min(100, safeUtil + 15)
    });

    const dominantLabel = statusPack.dominant.label;

    let interpretation = "";
    let dominantConstraint = "";
    let guidance = "";

    if (statusPack.status === "RISK") {
      interpretation = `Peak modeled traffic reaches ${fmtMbps(peakTotal)} on a ${fmtMbps(uplinkMbps)} uplink, which pushes the design into a congestion-prone band. Under burst conditions, queueing delay, retransmits, and user-visible slowdown become more likely because the link is being consumed faster than comfortable headroom can absorb.`;
      dominantConstraint = `${dominantLabel} is the limiting factor. The current link is being pressured hardest by peak demand rather than steady-state average traffic, so the failure mode shows up first during bursts, synchronized device activity, or background tasks that overlap production traffic.`;
      guidance = shortfallMbps > 0
        ? `Resize the uplink toward at least ${fmtMbps(recUplink)} if you want to hold peak conditions near your ${safeUtil.toFixed(0)}% target. If that is not practical, reduce modeled demand, split traffic across more uplinks, or isolate heavy traffic classes before moving to oversubscription analysis.`
        : `Even though the current link technically fits the traffic, the pressure pattern is too aggressive for comfortable operation. Reduce burst demand, segment traffic, or tighten assumptions before moving downstream in the design chain.`;
    } else if (statusPack.status === "WATCH") {
      interpretation = `Average modeled demand stays reasonable, but peak loading reaches ${fmtPct(utilPeak)} of the uplink. This is still operable, but margin is getting thin enough that burst traffic, retries, client churn, or future adds can start consuming the remaining headroom faster than expected.`;
      dominantConstraint = `${dominantLabel} is the dominant limiter. The design is not failing outright yet, but the network is being shaped more by transient peak behavior than by comfortable sustained utilization, which makes future growth and unexpected spikes harder to absorb cleanly.`;
      guidance = `Validate the peak assumptions and compare this result against your actual aggregation design next. If this uplink will also carry management traffic, backups, or growth, consider stepping up link capacity now rather than waiting until the operating band is consistently tight.`;
    } else {
      interpretation = `Average load is ${fmtMbps(avgTotal)} and peak load is ${fmtMbps(peakTotal)} on a ${fmtMbps(uplinkMbps)} uplink. That leaves usable operating margin under the selected assumptions, so the link is less likely to become the first point of visible performance degradation during normal bursts.`;
      dominantConstraint = `${dominantLabel} is still the highest-pressure metric, but it remains inside a controlled band. In practice, this means the design is being governed by normal demand behavior rather than by a chronic capacity shortfall.`;
      guidance = `This uplink sizing is aligned with your selected headroom target. Continue into Oversubscription next to verify that the aggregation layer does not reintroduce pressure once multiple edge segments are combined upstream.`;
    }

    return {
      ok: true,
      input,
      avgStream,
      peakStream,
      avgWithOverhead,
      peakWithOverhead,
      avgTotal,
      peakTotal,
      utilAvg,
      utilPeak,
      burstDeltaPct,
      protocolAndBackgroundPct,
      recUplink,
      shortfallMbps,
      status: statusPack.status,
      dominant: statusPack.dominant,
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
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.bandwidth, {
      category: "network",
      step: "bandwidth",
      data: {
        devices: data.input.devices,
        avgPerDeviceMbps: data.input.bitrate,
        peakFactor: data.input.peakFactor,
        overheadPct: data.input.overheadPct,
        otherTrafficMbps: data.input.otherTraffic,
        uplinkMbps: data.input.uplinkMbps,
        targetUtilizationPct: data.input.safeUtil,
        averageTotalMbps: Number(data.avgTotal.toFixed(2)),
        peakTotalMbps: Number(data.peakTotal.toFixed(2)),
        averageUtilizationPct: Number(data.utilAvg.toFixed(1)),
        peakUtilizationPct: Number(data.utilPeak.toFixed(1)),
        recommendedUplinkMbps: Number(data.recUplink.toFixed(2)),
        bandwidthStatus: data.status
      }
    });
  }

  function renderSuccess(data) {
    const safeUtil = data.input.safeUtil;
    const watchMax = Math.min(100, safeUtil + 15);

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Average modeled traffic", value: fmtMbps(data.avgStream) },
        { label: "Peak modeled traffic", value: fmtMbps(data.peakStream) },
        { label: "Average total incl. overhead + other traffic", value: fmtMbps(data.avgTotal) },
        { label: "Peak total incl. overhead + other traffic", value: fmtMbps(data.peakTotal) }
      ],
      derivedRows: [
        { label: "Uplink utilization (average)", value: fmtPct(data.utilAvg) },
        { label: "Uplink utilization (peak)", value: fmtPct(data.utilPeak) },
        { label: "Burst delta on uplink", value: fmtPct(data.burstDeltaPct) },
        { label: "Protocol + background share", value: fmtPct(data.protocolAndBackgroundPct) },
        { label: "Recommended uplink at target utilization", value: fmtMbps(data.recUplink) },
        { label: "Additional uplink needed", value: fmtMbps(data.shortfallMbps) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: ["Average Load", "Peak Load", "Burst Delta"],
        values: [
          Number(data.utilAvg.toFixed(1)),
          Number(data.utilPeak.toFixed(1)),
          Number(data.burstDeltaPct.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.utilAvg),
          fmtPct(data.utilPeak),
          fmtPct(data.burstDeltaPct)
        ],
        referenceValue: safeUtil,
        healthyMax: safeUtil,
        watchMax,
        axisTitle: "Uplink Pressure (%)",
        referenceLabel: `Target Utilization (${safeUtil.toFixed(0)}%)`,
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(Math.max(data.utilPeak, data.utilAvg, data.burstDeltaPct, safeUtil, watchMax) * 1.18)
        )
      }
    });

    writeFlow(data);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
  }

  function calculate() {
    const data = calculateModel();
    if (!data.ok) {
      renderError(data.message);
      return;
    }
    renderSuccess(data);
  }

  function reset() {
    applyDefaults();
    const upstream = renderFlowContext();
    maybePrefillFromUpstream(upstream);
    invalidate({ clearFlow: false });
  }

  function bindInvalidation() {
    [
      els.devices,
      els.bitrate,
      els.peakFactor,
      els.overheadPct,
      els.otherTraffic,
      els.uplinkMbps,
      els.safeUtil
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", () => invalidate({ clearFlow: true }));
      el.addEventListener("change", () => invalidate({ clearFlow: true }));
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    bindInvalidation();
    els.calc?.addEventListener("click", calculate);
    els.reset?.addEventListener("click", reset);

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const target = e.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT")) {
        e.preventDefault();
        calculate();
      }
    });

    reset();
  });
})();