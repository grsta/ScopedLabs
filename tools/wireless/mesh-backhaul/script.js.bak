(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "mesh-backhaul";
  const NEXT_URL = "/tools/wireless/ptp-wireless-link/";

  const $ = id => document.getElementById(id);

  const els = {
    base: $("base"),
    hops: $("hops"),
    ovh: $("ovh"),
    ded: $("ded"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  function safeNumber(value, fallback = 0) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.safeNumber === "function"
    ) {
      return window.ScopedLabsAnalyzer.safeNumber(value, fallback);
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clamp === "function"
    ) {
      return window.ScopedLabsAnalyzer.clamp(value, min, max);
    }
    return Math.min(max, Math.max(min, value));
  }

  function hideContinue() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.hideContinue === "function"
    ) {
      window.ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
      return;
    }
    els.continueWrap.style.display = "none";
    els.continueBtn.disabled = true;
  }

  function showContinue() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.showContinue === "function"
    ) {
      window.ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
      return;
    }
    els.continueWrap.style.display = "";
    els.continueBtn.disabled = false;
  }

  function clearStored() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function clearAnalysisBlock() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function"
    ) {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
      return;
    }
    if (els.analysisCopy) {
      els.analysisCopy.style.display = "none";
      els.analysisCopy.innerHTML = "";
    }
  }

  function clearChart() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clearChart === "function"
    ) {
      window.ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
      return;
    }

    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch {}
      chartRef.current = null;
    }

    if (chartWrapRef.current && chartWrapRef.current.parentNode) {
      chartWrapRef.current.parentNode.removeChild(chartWrapRef.current);
      chartWrapRef.current = null;
    }
  }

  function renderEmpty() {
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    clearAnalysisBlock();
    clearChart();
  }

  function invalidate() {
    clearStored();
    hideContinue();

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.invalidate === "function"
    ) {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        continueWrapEl: els.continueWrap,
        continueBtnEl: els.continueBtn,
        category: CATEGORY,
        step: STEP,
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      renderEmpty();
    }

    clearChart();
  }

  function loadPrior() {
    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";

    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch {}

    if (!saved || saved.category !== CATEGORY || saved.step !== "link-budget") return;

    const d = saved.data || {};

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderFlowNote === "function"
    ) {
      window.ScopedLabsAnalyzer.renderFlowNote({
        flowEl: els.flowNote,
        category: CATEGORY,
        step: STEP,
        title: "System Context",
        intro:
          "Link Budget estimated whether the RF path closes cleanly. Use this step to translate that link into realistic multi-hop mesh throughput.",
        customRows: [
          {
            label: "Link RSSI",
            value: d.rssi != null ? `${d.rssi} dBm` : "—"
          },
          {
            label: "Link Margin",
            value: d.margin != null ? `${d.margin} dB` : "—"
          }
        ]
      });
      return;
    }

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Link RSSI: <strong>${d.rssi ?? "—"} dBm</strong>,
      Margin: <strong>${d.margin ?? "—"} dB</strong>.
      This step evaluates how multi-hop mesh impacts usable throughput.
    `;
    els.flowNote.style.display = "";
  }

  function buildInterpretation(status, dominantConstraint, effective, hops, dedicated) {
    if (status === "HEALTHY") {
      return `Effective backhaul throughput remains in a workable range, so the mesh design is not yet collapsing under relay penalties. The topology still has room to support practical traffic without feeling immediately constrained by hop inefficiency.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Hop penalty pressure") {
        return `Hop count is becoming the main limiter. The design may still work, but each additional relay is now consuming enough capacity that multi-hop expansion deserves caution.`;
      }

      if (dominantConstraint === "Overhead pressure") {
        return `Protocol and contention overhead are starting to eat into usable backhaul materially. The link budget may be fine, but practical throughput is being compressed by mesh coordination costs.`;
      }

      return `Shared-medium behavior is starting to matter. The design is still viable, but the available backhaul is now sensitive enough to topology choices that it should be treated conservatively.`;
    }

    if (dominantConstraint === "Hop penalty pressure") {
      return `Relay depth is now the dominant problem. The mesh is losing too much usable throughput across hops to assume the downstream capacity will stay comfortable.`;
    }

    if (dominantConstraint === "Overhead pressure") {
      return `Mesh overhead is consuming too much of the base link. Even if the raw link looks healthy, the practical forwarding capacity is being reduced hard enough to threaten service expectations.`;
    }

    return `The topology is too dependent on shared-medium behavior. Without more efficient backhaul structure, the design is likely to feel slower than the raw link rate suggests.`;
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `Carry this result into the PTP step, but keep some reserve for burst traffic and control overhead so the mesh does not operate right at its practical edge.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Hop penalty pressure") {
        return `Reduce hop count where possible or redesign for fewer relays. Throughput is already degrading enough per hop that growth will become expensive quickly.`;
      }

      if (dominantConstraint === "Overhead pressure") {
        return `Reduce protocol/airtime overhead or increase base link quality before relying on the present design. Coordination cost is now too influential to ignore.`;
      }

      return `Prefer dedicated backhaul or tighter topology control before scaling this design further. The mesh is workable, but no longer especially forgiving.`;
    }

    if (dominantConstraint === "Hop penalty pressure") {
      return `Flatten the topology before deployment. The current number of hops is too expensive in usable throughput to treat as comfortable.`;
    }

    if (dominantConstraint === "Overhead pressure") {
      return `Reduce effective overhead or redesign the backhaul path before trusting the result. Too much throughput is being lost outside the raw RF link itself.`;
    }

    return `Move away from a shared-radio dependency or shorten the relay chain. The present mesh plan is too fragile to assume stable real-world performance.`;
  }

  function calculate() {
    const base = clamp(safeNumber(els.base.value, NaN), 1, 1000000);
    const hops = clamp(Math.floor(safeNumber(els.hops.value, NaN)), 0, 20);
    const ovhPct = clamp(safeNumber(els.ovh.value, NaN), 0, 70);
    const dedicated = els.ded.value === "yes";

    if (!Number.isFinite(base) || !Number.isFinite(hops) || !Number.isFinite(ovhPct)) {
      els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      clearAnalysisBlock();
      hideContinue();
      clearStored();
      clearChart();
      return;
    }

    const hopFactor = dedicated ? 0.75 : 0.50;
    const hopApplied = hops === 0 ? base : base * Math.pow(hopFactor, Math.max(1, hops));
    const effective = hopApplied * (1 - (ovhPct / 100));

    let result = "OK";
    if (effective < 150) result = "MARGINAL";
    if (effective < 50) result = "POOR";

    const hopPenaltyPressure = hops === 0 ? 0.6 : (Math.pow(1 / hopFactor, Math.max(1, hops)) / 3);
    const overheadPressure = 1 + (ovhPct / 25);
    const sharedMediumPressure = dedicated ? 0.9 : 1.6;

    const metrics = [
      {
        label: "Hop penalty pressure",
        value: hopPenaltyPressure,
        displayValue: `${hops} hop${hops === 1 ? "" : "s"}`
      },
      {
        label: "Overhead pressure",
        value: overheadPressure,
        displayValue: `${ovhPct.toFixed(0)}%`
      },
      {
        label: "Shared-medium pressure",
        value: sharedMediumPressure,
        displayValue: dedicated ? "Dedicated" : "Shared"
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Hop penalty pressure";

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.5
      });
      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Hop penalty pressure";
    }

    const dominantConstraintMap = {
      "Hop penalty pressure": "Hop penalty pressure",
      "Overhead pressure": "Overhead pressure",
      "Shared-medium pressure": "Shared-medium pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Hop penalty pressure";

    const interpretation = buildInterpretation(status, dominantConstraint, effective, hops, dedicated);
    const guidance = buildGuidance(status, dominantConstraint);

    const summaryRows = [
      { label: "Base Link", value: `${base.toFixed(0)} Mbps` },
      { label: "Hops", value: `${hops}` },
      { label: "Dedicated Backhaul", value: dedicated ? "Yes" : "No" },
      { label: "After Hops", value: `${hopApplied.toFixed(0)} Mbps` }
    ];

    const derivedRows = [
      { label: "After Overhead", value: `${effective.toFixed(0)} Mbps` },
      { label: "Result", value: result },
      { label: "Planning Basis", value: dedicated ? "Dedicated-radio mesh model" : "Shared-radio mesh model" }
    ];

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderOutput === "function"
    ) {
      window.ScopedLabsAnalyzer.renderOutput({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        summaryRows,
        derivedRows,
        status,
        interpretation,
        dominantConstraint,
        guidance
      });
    } else {
      const fallbackRows = summaryRows.concat(derivedRows, [
        { label: "Engineering Interpretation", value: interpretation },
        { label: "Actionable Guidance", value: guidance }
      ]);

      els.results.innerHTML = fallbackRows.map((row) => `
        <div class="result-row">
          <div class="result-label">${row.label}</div>
          <div class="result-value">${row.value}</div>
        </div>
      `).join("");
    }

    clearChart();

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderAnalyzerChart === "function"
    ) {
      window.ScopedLabsAnalyzer.renderAnalyzerChart({
        mountEl: els.results,
        existingChartRef: chartRef,
        existingWrapRef: chartWrapRef,
        labels: ["Hop Penalty", "Overhead", "Shared-Medium"],
        values: [hopPenaltyPressure, overheadPressure, sharedMediumPressure],
        displayValues: [
          `${hops} hop${hops === 1 ? "" : "s"}`,
          `${ovhPct.toFixed(0)}%`,
          dedicated ? "Dedicated" : "Shared"
        ],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.5,
        axisTitle: "Mesh Pressure",
        referenceLabel: "Healthy Threshold",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          3,
          Math.ceil(Math.max(hopPenaltyPressure, overheadPressure, sharedMediumPressure, 1.5) * 1.15 * 10) / 10
        )
      });
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        effective: Number(effective.toFixed(0)),
        hops,
        status: result,
        dominantConstraint
      }
    }));

    showContinue();
  }

  function reset() {
    els.base.value = "600";
    els.hops.value = "2";
    els.ovh.value = "25";
    els.ded.value = "no";
    renderEmpty();
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation() {
    [els.base, els.hops, els.ovh, els.ded].forEach(el => {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    hideContinue();
    loadPrior();
    bindInvalidation();

    els.calc.onclick = calculate;
    els.reset.onclick = reset;
    els.continueBtn.onclick = () => window.location.href = NEXT_URL;
  }

  init();
})();
