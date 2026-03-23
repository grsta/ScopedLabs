(() => {
  "use strict";

  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    edgeDownMbps: $("edgeDownMbps"),
    edgeUpMbps: $("edgeUpMbps"),
    aggDownMbps: $("aggDownMbps"),
    aggUpMbps: $("aggUpMbps"),
    coreDemandMbps: $("coreDemandMbps"),
    wanMbps: $("wanMbps"),
    overheadPct: $("overheadPct"),
    targetUtilPct: $("targetUtilPct"),
    calc: $("calc"),
    reset: $("reset"),
    out: $("out"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard"),
    continueWrap: $("next-step-row"),
    continueBtn: $("next-step-btn")
  };

  const DEFAULTS = {
    edgeDownMbps: 2400,
    edgeUpMbps: 1000,
    aggDownMbps: 8000,
    aggUpMbps: 2000,
    coreDemandMbps: 1200,
    wanMbps: 1000,
    overheadPct: 15,
    targetUtilPct: 70
  };

  function fmt(v, d = 1) {
    return Number.isFinite(v) ? v.toFixed(d) : "—";
  }

  function fmtMbps(v, d = 1) {
    return Number.isFinite(v) ? `${v.toFixed(d)} Mbps` : "—";
  }

  function fmtPct(v, d = 1) {
    return Number.isFinite(v) ? `${v.toFixed(d)}%` : "—";
  }

  function fmtRatio(v) {
    return Number.isFinite(v) ? `${v.toFixed(2)} : 1` : "—";
  }

  function safeNum(el, fallback = NaN) {
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
    els.edgeDownMbps.value = String(DEFAULTS.edgeDownMbps);
    els.edgeUpMbps.value = String(DEFAULTS.edgeUpMbps);
    els.aggDownMbps.value = String(DEFAULTS.aggDownMbps);
    els.aggUpMbps.value = String(DEFAULTS.aggUpMbps);
    els.coreDemandMbps.value = String(DEFAULTS.coreDemandMbps);
    els.wanMbps.value = String(DEFAULTS.wanMbps);
    els.overheadPct.value = String(DEFAULTS.overheadPct);
    els.targetUtilPct.value = String(DEFAULTS.targetUtilPct);
  }

  function renderFlowContext() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEY,
      category: "network",
      step: "oversubscription",
      title: "System Context",
      intro: "This is step 3 of the Network pipeline. Use Bandwidth results here to test whether peak demand still fits through the uplink hierarchy with usable headroom."
    });

    if (!flow || !flow.data) return null;

    const peakTotalMbps = ScopedLabsAnalyzer.safeNumber(
      flow.data.peakTotalMbps ?? flow.data.bandwidthPeakMbps,
      NaN
    );

    const recommendedUplinkMbps = ScopedLabsAnalyzer.safeNumber(
      flow.data.recommendedUplinkMbps,
      NaN
    );

    const actualUplinkMbps = ScopedLabsAnalyzer.safeNumber(
      flow.data.uplinkMbps,
      NaN
    );

    const peakUtilPct = ScopedLabsAnalyzer.safeNumber(
      flow.data.peakUtilizationPct,
      NaN
    );

    if (Number.isFinite(peakTotalMbps) && peakTotalMbps > 0) {
      els.coreDemandMbps.value = String(Math.round(peakTotalMbps));
    }

    if (Number.isFinite(actualUplinkMbps) && actualUplinkMbps > 0) {
      els.wanMbps.value = String(Math.round(actualUplinkMbps));
      els.edgeUpMbps.value = String(Math.round(actualUplinkMbps));
    }

    if (Number.isFinite(recommendedUplinkMbps) && recommendedUplinkMbps > 0) {
      els.aggUpMbps.value = String(Math.round(recommendedUplinkMbps));
    }

    if (
      Number.isFinite(peakTotalMbps) &&
      peakTotalMbps > 0 &&
      Number.isFinite(actualUplinkMbps) &&
      actualUplinkMbps > 0
    ) {
      const parts = [
        `Peak demand: <strong>${fmt(peakTotalMbps, 1)} Mbps</strong>`,
        `Current uplink: <strong>${fmt(actualUplinkMbps, 1)} Mbps</strong>`
      ];

      if (Number.isFinite(recommendedUplinkMbps) && recommendedUplinkMbps > 0) {
        parts.push(`Recommended uplink: <strong>${fmt(recommendedUplinkMbps, 1)} Mbps</strong>`);
      }

      if (Number.isFinite(peakUtilPct)) {
        parts.push(`Peak utilization: <strong>${fmt(peakUtilPct, 1)}%</strong>`);
      }

      els.flowNote.hidden = false;
      els.flowNote.innerHTML = `Step 3 → Using Bandwidth results:<br>${parts.join(" | ")}`;
    }

    return flow;
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.out,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEY,
      category: "network",
      step: "oversubscription",
      emptyMessage: "Run the estimator to see oversubscription ratios, congestion risk, and carried-forward demand context."
    });
  }

  function getInputs() {
    const edgeDownRaw = safeNum(els.edgeDownMbps);
    const edgeUp = safeNum(els.edgeUpMbps);
    const aggDownRaw = safeNum(els.aggDownMbps);
    const aggUp = safeNum(els.aggUpMbps);
    const coreDemandRaw = safeNum(els.coreDemandMbps);
    const wanMbps = safeNum(els.wanMbps);
    const overheadPct = ScopedLabsAnalyzer.clamp(safeNum(els.overheadPct), 0, 60);
    const targetUtilPct = ScopedLabsAnalyzer.clamp(safeNum(els.targetUtilPct), 10, 95);

    if (
      [edgeDownRaw, edgeUp, aggDownRaw, aggUp, coreDemandRaw, wanMbps, overheadPct, targetUtilPct]
        .some((v) => !Number.isFinite(v))
    ) {
      return { ok: false, message: "Enter valid numeric values." };
    }

    if (edgeUp <= 0 || aggUp <= 0 || wanMbps <= 0) {
      return { ok: false, message: "Uplink and transport capacities must be greater than 0." };
    }

    if (edgeDownRaw < 0 || aggDownRaw < 0 || coreDemandRaw < 0) {
      return { ok: false, message: "Demand values cannot be negative." };
    }

    return {
      ok: true,
      edgeDownRaw,
      edgeUp,
      aggDownRaw,
      aggUp,
      coreDemandRaw,
      wanMbps,
      overheadPct,
      targetUtilPct
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const overheadMult = 1 + (input.overheadPct / 100);

    const edgeDown = input.edgeDownRaw * overheadMult;
    const aggDown = input.aggDownRaw * overheadMult;
    const coreDemand = input.coreDemandRaw * overheadMult;

    const edgeRatio = edgeDown / input.edgeUp;
    const aggRatio = aggDown / input.aggUp;
    const coreRatio = coreDemand / input.wanMbps;

    const edgeUtil = edgeRatio * 100;
    const aggUtil = aggRatio * 100;
    const coreUtil = coreRatio * 100;

    const safeEdgeCap = input.edgeUp * (input.targetUtilPct / 100);
    const safeAggCap = input.aggUp * (input.targetUtilPct / 100);
    const safeCoreCap = input.wanMbps * (input.targetUtilPct / 100);

    const edgeHeadroom = safeEdgeCap - edgeDown;
    const aggHeadroom = safeAggCap - aggDown;
    const coreHeadroom = safeCoreCap - coreDemand;

    const recommendedEdge = edgeDown / (input.targetUtilPct / 100);
    const recommendedAgg = aggDown / (input.targetUtilPct / 100);
    const recommendedCore = coreDemand / (input.targetUtilPct / 100);

    const dominantMetric = [
      { label: "Access Layer", value: edgeUtil, ratio: edgeRatio, headroom: edgeHeadroom },
      { label: "Aggregation Layer", value: aggUtil, ratio: aggRatio, headroom: aggHeadroom },
      { label: "Core / WAN", value: coreUtil, ratio: coreRatio, headroom: coreHeadroom }
    ].sort((a, b) => b.value - a.value)[0];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: dominantMetric.value,
      metrics: [
        { label: "Access Layer", value: edgeUtil, displayValue: fmtPct(edgeUtil) },
        { label: "Aggregation Layer", value: aggUtil, displayValue: fmtPct(aggUtil) },
        { label: "Core / WAN", value: coreUtil, displayValue: fmtPct(coreUtil) }
      ],
      healthyMax: input.targetUtilPct,
      watchMax: 95
    });

    let interpretation = `After applying ${fmt(input.overheadPct, 0)}% reserve, the modeled peak loads are ${fmtMbps(edgeDown)}, ${fmtMbps(aggDown)}, and ${fmtMbps(coreDemand)} across the access, aggregation, and core/WAN boundaries. ${dominantMetric.label} is carrying the highest pressure at ${fmtPct(dominantMetric.value)}, so that layer will hit queueing and congestion symptoms first under burst conditions.`;

    if (statusPack.status === "RISK") {
      interpretation += " The dominant layer is beyond a comfortable operating band, which means this is no longer just an abstract oversubscription ratio issue. In practice, the path is being asked to push more peak demand through the uplink hierarchy than the design can absorb cleanly.";
    } else if (statusPack.status === "WATCH") {
      interpretation += " The hierarchy is still operable, but the dominant layer is now tight enough that retries, burst overlap, or modest growth can push it into visible congestion behavior faster than expected.";
    } else {
      interpretation += " The modeled peak demand remains inside a controlled band, so the hierarchy still has usable room for burst behavior without immediately turning oversubscription into a performance problem.";
    }

    let dominantConstraint = `${dominantMetric.label} is the dominant limiter. That means this design is constrained first by the layer where peak utilization is highest, not by the raw oversubscription label elsewhere in the stack.`;

    if (dominantMetric.headroom < 0) {
      dominantConstraint += " That layer is already beyond the selected target operating band, so the design is effectively borrowing from margin that should have been reserved for burst behavior and transient spikes.";
    } else {
      dominantConstraint += " That layer still has some operating margin, but it is the first place where future demand or overhead increases will start eroding performance headroom.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = `Reduce pressure at ${dominantMetric.label.toLowerCase()} first or increase upstream capacity there. The model wants about ${
        dominantMetric.label === "Access Layer"
          ? fmtMbps(recommendedEdge)
          : dominantMetric.label === "Aggregation Layer"
          ? fmtMbps(recommendedAgg)
          : fmtMbps(recommendedCore)
      } at that boundary to stay near the ${fmt(input.targetUtilPct, 0)}% planning target.`;
    } else if (statusPack.status === "WATCH") {
      guidance = `The design is workable but tight. Validate whether the dominant layer’s demand assumption is realistic and compare the next step in the pipeline, because latency usually gets worse quickly once this kind of oversubscription pressure starts creating queueing.`;
    } else {
      guidance = "This oversubscription profile is balanced for the assumptions entered here. Continue into Latency next to verify that the transport path still feels responsive once delay contributors are added on top of the capacity model.";
    }

    return {
      ok: true,
      input,
      edgeDown,
      aggDown,
      coreDemand,
      edgeRatio,
      aggRatio,
      coreRatio,
      edgeUtil,
      aggUtil,
      coreUtil,
      edgeHeadroom,
      aggHeadroom,
      coreHeadroom,
      recommendedEdge,
      recommendedAgg,
      recommendedCore,
      dominantMetric,
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
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEY, {
      category: "network",
      step: "oversubscription",
      data: {
        edgeUtilPct: Number(data.edgeUtil.toFixed(1)),
        aggUtilPct: Number(data.aggUtil.toFixed(1)),
        coreUtilPct: Number(data.coreUtil.toFixed(1)),
        coreDemandMbps: Number(data.coreDemand.toFixed(1)),
        wanMbps: Number(data.input.wanMbps.toFixed(1)),
        targetUtilPct: Number(data.input.targetUtilPct.toFixed(0)),
        oversubscriptionStatus: data.status
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
        { label: "Access ratio", value: fmtRatio(data.edgeRatio) },
        { label: "Aggregation ratio", value: fmtRatio(data.aggRatio) },
        { label: "Core / WAN ratio", value: fmtRatio(data.coreRatio) },
        { label: "Dominant layer", value: data.dominantMetric.label }
      ],
      derivedRows: [
        { label: "Access utilization", value: fmtPct(data.edgeUtil) },
        { label: "Aggregation utilization", value: fmtPct(data.aggUtil) },
        { label: "Core / WAN utilization", value: fmtPct(data.coreUtil) },
        { label: "Access headroom at target band", value: fmtMbps(data.edgeHeadroom) },
        { label: "Aggregation headroom at target band", value: fmtMbps(data.aggHeadroom) },
        { label: "Core / WAN headroom at target band", value: fmtMbps(data.coreHeadroom) },
        { label: "Recommended access capacity", value: fmtMbps(data.recommendedEdge) },
        { label: "Recommended aggregation capacity", value: fmtMbps(data.recommendedAgg) },
        { label: "Recommended core / WAN capacity", value: fmtMbps(data.recommendedCore) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: ["Access Layer", "Aggregation Layer", "Core / WAN"],
        values: [
          Number(data.edgeUtil.toFixed(1)),
          Number(data.aggUtil.toFixed(1)),
          Number(data.coreUtil.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.edgeUtil),
          fmtPct(data.aggUtil),
          fmtPct(data.coreUtil)
        ],
        referenceValue: data.input.targetUtilPct,
        healthyMax: data.input.targetUtilPct,
        watchMax: 95,
        axisTitle: "Peak Utilization (%)",
        referenceLabel: `Target Utilization (${fmt(data.input.targetUtilPct, 0)}%)`,
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          110,
          Math.ceil(
            Math.max(data.edgeUtil, data.aggUtil, data.coreUtil, 95) * 1.12
          )
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
    renderFlowContext();
    invalidate();
  }

  function bindInvalidation() {
    [
      els.edgeDownMbps,
      els.edgeUpMbps,
      els.aggDownMbps,
      els.aggUpMbps,
      els.coreDemandMbps,
      els.wanMbps,
      els.overheadPct,
      els.targetUtilPct
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function initTool() {
    bindInvalidation();

    els.calc?.addEventListener("click", calculate);
    els.reset?.addEventListener("click", reset);

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
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
    if (unlocked) {
      initTool();
    }

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked && !els.toolCard.dataset.initialized) {
        els.toolCard.dataset.initialized = "true";
        initTool();
      }
    }, 400);
  });
})();