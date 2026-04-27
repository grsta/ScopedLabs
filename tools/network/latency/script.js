const LANE = "v1";
const PREVIOUS_STEP = "oversubscription";
const STEP = "latency";
const CATEGORY = "network";
(() => {
  "use strict";

  const FLOW_KEYS = {
    poe: "scopedlabs:pipeline:network:poe-budget",
    bandwidth: "scopedlabs:pipeline:network:bandwidth",
    oversub: "scopedlabs:pipeline:network:oversubscription",
    latency: "scopedlabs:pipeline:network:latency"
  };

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
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard"),
    continueWrap: $("next-step-row")
  };

  let initialized = false;

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

  function getStoredFlow(key) {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
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

  function syncResultsForExport() {
    if (!els.results || !els.out || els.results === els.out) return;
    els.results.innerHTML = els.out.innerHTML;
  }

  function refreshExportReady() {
    syncResultsForExport();

    if (window.ScopedLabsExport && typeof window.ScopedLabsExport.refresh === "function") {
      window.ScopedLabsExport.refresh();
    }
  }

  function invalidateExport(message = "Inputs changed. Run the calculator again to refresh export.") {
    syncResultsForExport();

    if (window.ScopedLabsExport && typeof window.ScopedLabsExport.invalidate === "function") {
      window.ScopedLabsExport.invalidate(message);
    }
  }

  function clearOwnState() {
    try {
      sessionStorage.removeItem(FLOW_KEYS.latency);
    } catch {}
  }

  function renderFlowContext() {
    const flow = getStoredFlow(FLOW_KEYS.oversub);

    if (!flow || !flow.data) {
      els.flowNote.hidden = false;
      els.flowNote.innerHTML = `
        <strong>Step 4 — Network pipeline:</strong><br>
        This is the final step of the Network pipeline. Use carried-forward transport assumptions to judge whether the design still feels responsive in practice.
      `;
      return null;
    }

    const data = flow.data;
    const peakUtil = ScopedLabsAnalyzer.safeNumber(
      data.peakUtilizationPct ?? data.coreUtilPct ?? data.transportUtilizationPct,
      NaN
    );
    const demandMbps = ScopedLabsAnalyzer.safeNumber(
      data.peakTotalMbps ?? data.coreDemandMbps,
      NaN
    );
    const transportMbps = ScopedLabsAnalyzer.safeNumber(
      data.wanMbps ?? data.uplinkMbps ?? data.transportMbps,
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
      els.flowNote.innerHTML = `<strong>Step 4 → Using Oversubscription results:</strong><br>${note.join(" | ")}`;
    }

    return flow;
  }

  function invalidate({ clearFlow = true } = {}) {
    if (clearFlow) clearOwnState();

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.out,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS.latency,
      category: "network",
      step: "latency",
      emptyMessage: "Run the calculator to see total latency, dominant contributors, and practical guidance."
    });

    renderFlowContext();
    invalidateExport();
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

    if ([encodeMs, switchMs, uplinkMs, wanMs, decodeMs, renderMs, bufferMs, targetMs].some((v) => !Number.isFinite(v))) {
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

    const networkTransportMs = input.contributors
      .filter((x) => ["Switching / routing", "Uplink / aggregation", "WAN / VPN transport"].includes(x.label))
      .reduce((sum, s) => sum + s.value, 0);

    const processingMs = input.contributors
      .filter((x) => ["Source / encode", "Decode / processing", "Client render"].includes(x.label))
      .reduce((sum, s) => sum + s.value, 0);

    const budgetUsePct = targetMs > 0 ? (totalMs / targetMs) * 100 : 0;
    const overTargetMs = Math.max(0, totalMs - targetMs);
    const reserveMs = Math.max(0, targetMs - totalMs);

    const perStageHealthyMax = Math.max(targetMs / 4, 1);
    const perStageWatchMax = Math.max(targetMs / 2, 1);

    const stageStatusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: dominant.value,
      metrics: input.contributors.map((item) => ({
        label: item.label,
        value: item.value,
        displayValue: fmtMs(item.value)
      })),
      healthyMax: perStageHealthyMax,
      watchMax: perStageWatchMax
    });

    const budgetStatus =
      budgetUsePct > 100 ? "RISK" :
      budgetUsePct > 85 ? "WATCH" :
      "HEALTHY";

    const statusRank = {
      HEALTHY: 0,
      WATCH: 1,
      RISK: 2
    };

    const statusPack = {
      ...stageStatusPack,
      status:
        statusRank[budgetStatus] > statusRank[stageStatusPack.status]
          ? budgetStatus
          : stageStatusPack.status
    };

    let interpretation = `Total modeled latency is ${fmtMs(totalMs)} against a target budget of ${fmtMs(targetMs)}. ${dominant.label} is the single largest contributor at ${fmtMs(dominant.value)}, which means that stage will shape how responsive the workflow feels before smaller contributors do.`;

    if (budgetUsePct > 100) {
      interpretation += ` The total path is over target by ${fmtMs(overTargetMs)}, so the overall latency budget is exhausted even if no single stage appears extreme by itself.`;
    } else if (budgetUsePct > 85) {
      interpretation += ` The total path is using ${fmtPct(budgetUsePct)} of the latency budget, so remaining margin is thin even before real-world jitter or client variation is added.`;
    }

    if (statusPack.status === "RISK") {
      interpretation += " The dominant stage is consuming too much of the latency budget by itself, which means the path is already fragile before the smaller contributors are even added. In practice, users will usually experience noticeable sluggishness because the largest delay source is oversized, not because the path is uniformly slow.";
    } else if (statusPack.status === "WATCH") {
      interpretation += " The path may still remain inside the total budget, but the dominant stage is already large enough to erode responsiveness margin on its own. That usually means the workflow still works, but it starts feeling less immediate once real transport variation, client performance, or additional buffering is introduced.";
    } else {
      interpretation += " The dominant stage remains inside a controlled band, so no single contributor is disproportionately consuming the latency budget. That keeps the design more balanced and easier to tune if requirements change later.";
    }

    let dominantConstraint = `${dominant.label} is the dominant limiter. In practice, reducing smaller stages first will not materially improve perceived responsiveness until this largest contributor is addressed or validated.`;

    if (networkTransportMs > processingMs) {
      dominantConstraint += " The network/transport side is currently consuming more of the path than source and client processing, so the design feels constrained more by movement through the network than by endpoint render behavior.";
    } else {
      dominantConstraint += " Endpoint processing and rendering are consuming more of the path than pure transport, so the biggest gains may come from codec, decode, or display changes rather than link upgrades alone.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = `Reduce ${dominant.label.toLowerCase()} first. That stage is too large relative to the per-stage comfort band, so the system is carrying an oversized contributor that will dominate the user experience even if the total path still appears mathematically acceptable.`;
    } else if (statusPack.status === "WATCH") {
      guidance = `Validate whether ${dominant.label.toLowerCase()} is realistic and worth optimizing. The path is still workable, but the dominant stage is now large enough that it can become the first source of perceived sluggishness as the environment gets less ideal.`;
    } else {
      guidance = `This latency profile is balanced. Keep the dominant stage visible during design review, because that is still the first place where latency risk will grow if buffering, transport delay, or client processing expands later.`;
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
      perStageHealthyMax,
      perStageWatchMax,
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
    syncResultsForExport();
    invalidateExport("Calculation could not run. Review inputs and try again.");
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.latency, {
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
        referenceValue: data.perStageHealthyMax,
        healthyMax: data.perStageHealthyMax,
        watchMax: data.perStageWatchMax,
        axisTitle: "Latency Contribution (ms)",
        referenceLabel: "Per-Stage Comfort Target",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(Math.max(...data.input.contributors.map((x) => x.value), data.perStageWatchMax) * 1.18)
        )
      }
    });

    writeFlow(data);
    refreshExportReady();

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
    invalidate({ clearFlow: false });
  }

  function initTool() {
    if (initialized) return;
    initialized = true;

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
      el.addEventListener("input", () => invalidate({ clearFlow: true }));
      el.addEventListener("change", () => invalidate({ clearFlow: true }));
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

    reset();
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
    let unlocked = unlockCategoryPage();
    if (unlocked) initTool();

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked) initTool();
    }, 400);
  });
})();
