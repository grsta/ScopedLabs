(() => {
  "use strict";

  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const DEFAULTS = {
    encodeMs: 80,
    switchMs: 5,
    uplinkMs: 10,
    wanMs: 40,
    decodeMs: 60,
    renderMs: 30,
    bufferMs: 20,
    targetMs: 300
  };

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    encodeMs: $("encodeMs"),
    switchMs: $("switchMs"),
    uplinkMs: $("uplinkMs"),
    wanMs: $("wanMs"),
    decodeMs: $("decodeMs"),
    renderMs: $("renderMs"),
    bufferMs: $("bufferMs"),
    targetMs: $("targetMs"),
    calc: $("calc"),
    reset: $("reset"),
    out: $("out"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard"),
    continueWrap: $("next-step-row")
  };

  function fmt(v, d = 0) {
    return Number.isFinite(v) ? v.toFixed(d) : "—";
  }

  function fmtMs(v, d = 0) {
    return Number.isFinite(v) ? `${v.toFixed(d)} ms` : "—";
  }

  function fmtPct(v, d = 1) {
    return Number.isFinite(v) ? `${v.toFixed(d)}%` : "—";
  }

  function readNumber(el, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(el?.value, fallback);
  }

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
      return raw
        .split(",")
        .map((x) => String(x).trim().toLowerCase())
        .filter(Boolean);
    } catch {
      return [];
    }
  }

  function unlockCategoryPage() {
    const category = String(document.body?.dataset?.category || "").trim().toLowerCase();
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }

  function applyDefaults() {
    els.encodeMs.value = String(DEFAULTS.encodeMs);
    els.switchMs.value = String(DEFAULTS.switchMs);
    els.uplinkMs.value = String(DEFAULTS.uplinkMs);
    els.wanMs.value = String(DEFAULTS.wanMs);
    els.decodeMs.value = String(DEFAULTS.decodeMs);
    els.renderMs.value = String(DEFAULTS.renderMs);
    els.bufferMs.value = String(DEFAULTS.bufferMs);
    els.targetMs.value = String(DEFAULTS.targetMs);
  }

  function renderFlowContext() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEY,
      category: "network",
      step: "latency",
      title: "System Context",
      intro: "This is the final step of the Network pipeline. Use carried-forward transport assumptions to judge whether the design still feels responsive in practice."
    });

    if (!flow || !flow.data) return null;

    const data = flow.data;
    const peakUtil =
      ScopedLabsAnalyzer.safeNumber(
        data.peakUtilizationPct ??
        data.coreUtilPct ??
        data.transportUtilizationPct,
        NaN
      );

    const demandMbps =
      ScopedLabsAnalyzer.safeNumber(
        data.peakTotalMbps ??
        data.coreDemandMbps,
        NaN
      );

    const transportMbps =
      ScopedLabsAnalyzer.safeNumber(
        data.wanMbps ??
        data.uplinkMbps ??
        data.transportMbps,
        NaN
      );

    if (Number.isFinite(peakUtil)) {
      if (peakUtil > 90) {
        els.wanMs.value = "70";
        els.bufferMs.value = "40";
      } else if (peakUtil > 75) {
        els.wanMs.value = "55";
        els.bufferMs.value = "30";
      } else {
        els.wanMs.value = "40";
        els.bufferMs.value = "20";
      }
    }

    if (Number.isFinite(demandMbps) && Number.isFinite(transportMbps)) {
      const note = [];
      if (Number.isFinite(peakUtil)) note.push(`Peak transport pressure: <strong>${fmt(peakUtil, 1)}%</strong>`);
      note.push(`Demand: <strong>${fmt(demandMbps, 1)} Mbps</strong>`);
      note.push(`Transport capacity: <strong>${fmt(transportMbps, 1)} Mbps</strong>`);
      els.flowNote.hidden = false;
      els.flowNote.innerHTML = `Step 4 → Using upstream network assumptions:<br>${note.join(" | ")}`;
    }

    return flow;
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.out,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEY,
      category: "network",
      step: "latency",
      emptyMessage: "Run the calculator to see total latency, dominant contributors, and practical guidance."
    });
  }

  function getInputs() {
    const encodeMs = readNumber(els.encodeMs);
    const switchMs = readNumber(els.switchMs);
    const uplinkMs = readNumber(els.uplinkMs);
    const wanMs = readNumber(els.wanMs);
    const decodeMs = readNumber(els.decodeMs);
    const renderMs = readNumber(els.renderMs);
    const bufferMs = readNumber(els.bufferMs);
    const targetMs = readNumber(els.targetMs);

    if (
      [encodeMs, switchMs, uplinkMs, wanMs, decodeMs, renderMs, bufferMs, targetMs]
        .some((v) => !Number.isFinite(v))
    ) {
      return { ok: false, message: "Enter valid values." };
    }

    const contributors = [
      { label: "Source / encode", value: Math.max(0, encodeMs) },
      { label: "Switching / routing", value: Math.max(0, switchMs) },
      { label: "Uplink / aggregation", value: Math.max(0, uplinkMs) },
      { label: "WAN / VPN transport", value: Math.max(0, wanMs) },
      { label: "Decode / processing", value: Math.max(0, decodeMs) },
      { label: "Client render", value: Math.max(0, renderMs) },
      { label: "Jitter buffer / reserve", value: Math.max(0, bufferMs) }
    ];

    return {
      ok: true,
      contributors,
      targetMs: Math.max(0, targetMs)
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const totalMs = input.contributors.reduce((sum, s) => sum + s.value, 0);
    const targetMs = input.targetMs;
    const dominant = [...input.contributors].sort((a, b) => b.value - a.value)[0];
    const dominantPct = totalMs > 0 ? (dominant.value / totalMs) * 100 : 0;
    const networkTransportMs =
      input.contributors
        .filter((x) => ["Switching / routing", "Uplink / aggregation", "WAN / VPN transport"].includes(x.label))
        .reduce((sum, s) => sum + s.value, 0);
    const processingMs =
      input.contributors
        .filter((x) => ["Source / encode", "Decode / processing", "Client render"].includes(x.label))
        .reduce((sum, s) => sum + s.value, 0);

    const budgetUsePct = targetMs > 0 ? (totalMs / targetMs) * 100 : 0;
    const overTargetMs = Math.max(0, totalMs - targetMs);
    const reserveMs = Math.max(0, targetMs - totalMs);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: budgetUsePct,
      metrics: [
        { label: "Budget Consumption", value: budgetUsePct, displayValue: fmtPct(budgetUsePct) },
        { label: "Dominant Stage Share", value: dominantPct, displayValue: fmtPct(dominantPct) },
        { label: "Transport Stack Share", value: totalMs > 0 ? (networkTransportMs / totalMs) * 100 : 0, displayValue: fmtPct(totalMs > 0 ? (networkTransportMs / totalMs) * 100 : 0) }
      ],
      healthyMax: 100,
      watchMax: 125
    });

    let interpretation = `Total modeled latency is ${fmtMs(totalMs)} against a target budget of ${fmtMs(targetMs)}. ${dominant.label} is the single largest contributor at ${fmtMs(dominant.value)}, which means that stage will shape how responsive the workflow feels before smaller contributors do.`;

    if (statusPack.status === "RISK") {
      interpretation += ` The full path is now consuming ${fmtPct(budgetUsePct)} of the selected budget, so delay is no longer just a tuning issue. At this level, operators will usually experience noticeable sluggishness, especially when buffering, decode delay, and WAN transport stack together.`;
    } else if (statusPack.status === "WATCH") {
      interpretation += ` The design is still usable, but it is running close enough to the budget that burst conditions, client rendering differences, or added processing stages can push the experience from acceptable to frustrating.`;
    } else {
      interpretation += ` The path remains inside the target budget, which means the design still has usable responsiveness margin for the assumptions entered here.`;
    }

    let dominantConstraint = `${dominant.label} is the dominant limiter. In practice, reducing smaller stages first will not materially improve perceived responsiveness until this largest contributor is addressed or validated.`;

    if (networkTransportMs > processingMs) {
      dominantConstraint += " The network/transport side is currently consuming more of the path than source and client processing, so the design feels constrained more by movement through the network than by endpoint render behavior.";
    } else {
      dominantConstraint += " Endpoint processing and rendering are consuming more of the path than pure transport, so the biggest gains may come from codec, decode, or display changes rather than link upgrades alone.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = `Trim the largest stage first, then re-test the full path. Focus on ${dominant.label.toLowerCase()} before chasing smaller contributors. If this is a live-view workflow, the current budget use is aggressive enough that users will likely describe it as slow rather than merely delayed.`;
    } else if (statusPack.status === "WATCH") {
      guidance = `The budget is serviceable but tight. Validate whether ${dominant.label.toLowerCase()} is realistic, and review transport assumptions from the upstream pipeline step before committing to the design.`;
    } else {
      guidance = `This path is in a controlled band. Keep the dominant stage visible during design reviews, because that is the first place latency risk will grow if the system expands or buffering assumptions change.`;
    }

    return {
      ok: true,
      input,
      totalMs,
      targetMs,
      dominant,
      dominantPct,
      networkTransportMs,
      processingMs,
      budgetUsePct,
      overTargetMs,
      reserveMs,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.out.innerHTML = `<div class="muted">${message}</div>`;
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEY, {
      category: "network",
      step: "latency",
      data: {
        totalLatencyMs: Number(data.totalMs.toFixed(0)),
        targetLatencyMs: Number(data.targetMs.toFixed(0)),
        dominantLatencyStage: data.dominant.label,
        dominantLatencyMs: Number(data.dominant.value.toFixed(0)),
        budgetConsumptionPct: Number(data.budgetUsePct.toFixed(1)),
        latencyStatus: data.status
      }
    });
  }

  function renderSuccess(data) {
    const transportSharePct = data.totalMs > 0 ? (data.networkTransportMs / data.totalMs) * 100 : 0;

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.out,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Total latency", value: fmtMs(data.totalMs) },
        { label: "Target latency budget", value: fmtMs(data.targetMs) },
        { label: "Dominant stage", value: data.dominant.label },
        { label: "Dominant stage contribution", value: fmtMs(data.dominant.value) }
      ],
      derivedRows: [
        { label: "Budget consumption", value: fmtPct(data.budgetUsePct) },
        { label: "Dominant stage share", value: fmtPct(data.dominantPct) },
        { label: "Transport stack total", value: fmtMs(data.networkTransportMs) },
        { label: "Processing stack total", value: fmtMs(data.processingMs) },
        { label: "Reserve inside budget", value: fmtMs(data.reserveMs) },
        { label: "Over target", value: fmtMs(data.overTargetMs) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: data.input.contributors.map((x) => x.label),
        values: data.input.contributors.map((x) => Number(x.value.toFixed(1))),
        displayValues: data.input.contributors.map((x) => fmtMs(x.value)),
        referenceValue: Math.max(data.targetMs / 4, 1),
        healthyMax: Math.max(data.targetMs / 4, 1),
        watchMax: Math.max(data.targetMs / 2, 1),
        axisTitle: "Latency Contribution (ms)",
        referenceLabel: "Per-Stage Comfort Target",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(
            Math.max(
              ...data.input.contributors.map((x) => x.value),
              data.targetMs / 2
            ) * 1.18
          )
        )
      }
    });

    writeFlow(data);

    if (els.continueWrap) {
      els.continueWrap.style.display = "flex";
    }
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
    renderFlowContext();
    invalidate();
  }

  function initTool() {
    renderFlowContext();
    invalidate();

    [
      els.encodeMs,
      els.switchMs,
      els.uplinkMs,
      els.wanMs,
      els.decodeMs,
      els.renderMs,
      els.bufferMs,
      els.targetMs
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

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
  }

  window.addEventListener("DOMContentLoaded", () => {
    let unlocked = unlockCategoryPage();
    if (unlocked) {
      initTool();
      reset();
    }

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked) {
        initTool();
        reset();
      }
    }, 400);
  });
})();
