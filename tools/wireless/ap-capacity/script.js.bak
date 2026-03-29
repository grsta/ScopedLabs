(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "ap-capacity";
  const NEXT_URL = "/tools/wireless/link-budget/";

  const $ = (id) => document.getElementById(id);

  const els = {
    clients: $("clients"),
    mbps: $("mbps"),
    util: $("util"),
    apcap: $("apcap"),
    maxc: $("maxc"),
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
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continueBtn) els.continueBtn.disabled = true;
  }

  function showContinue() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.showContinue === "function"
    ) {
      window.ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
      return;
    }
    if (els.continueWrap) els.continueWrap.style.display = "";
    if (els.continueBtn) els.continueBtn.disabled = false;
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
    } else if (els.analysisCopy) {
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
    if (els.results) {
      els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    }
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
    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch {}

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
          "This step converts client demand into AP count so the next link-budget stage starts from a realistic cell-sizing target.",
        customRows:
          saved && saved.category === CATEGORY && saved.step === "client-density"
            ? [
                {
                  label: "Prior Step",
                  value: "Client Density"
                },
                {
                  label: "Estimated AP Count",
                  value:
                    saved.data && Number.isFinite(Number(saved.data.apCount))
                      ? `${Number(saved.data.apCount).toFixed(0)}`
                      : "—"
                },
                {
                  label: "Client Density",
                  value: saved.data?.density ?? "—"
                }
              ]
            : null
      });
      return;
    }

    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";
  }

  function buildInterpretation(status, dominantConstraint, recommended, byThroughput, byClients) {
    if (status === "HEALTHY") {
      return `The recommended AP count stays in a manageable range, and the design is not yet being strained hard by either throughput or client load. This gives you a reasonable planning baseline for coverage and link-budget work.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Client density pressure") {
        return `The main limiter is user concentration per AP. Airtime contention and scheduler overhead are starting to matter more than raw radio throughput, so client distribution becomes the critical design concern.`;
      }

      if (dominantConstraint === "Throughput demand pressure") {
        return `Aggregate bandwidth demand is starting to drive the AP count harder than user count alone. The design may still work, but throughput assumptions now have enough influence that conservative planning is warranted.`;
      }

      return `Utilization target is beginning to compress your usable AP headroom. The design can still close, but the plan is no longer especially forgiving if traffic or client behavior drifts upward.`;
    }

    if (dominantConstraint === "Client density pressure") {
      return `Client concentration is now the dominant problem. Even if the radios can move enough aggregate traffic, too many users per AP will push contention, airtime sharing, and quality instability into real design risk.`;
    }

    if (dominantConstraint === "Throughput demand pressure") {
      return `Total client demand is now driving AP count into a higher-pressure range. The network can still be built, but bandwidth assumptions are heavy enough that cell sizing and spectrum planning need more deliberate margin.`;
    }

    return `The target utilization is too aggressive for the present demand shape. The design is now leaning too hard on ideal AP loading instead of giving the WLAN enough operational breathing room.`;
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `Carry this AP count forward into link-budget planning, but keep some spare capacity in mind for roaming behavior, burst traffic, and uneven client distribution.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Client density pressure") {
        return `Reduce users per AP where possible or plan additional APs in dense zones. The design is becoming client-density limited before it is truly radio-capacity limited.`;
      }

      if (dominantConstraint === "Throughput demand pressure") {
        return `Validate the throughput assumption against realistic peak behavior, not just average expectations. Aggregate bandwidth is now influential enough to change the AP count materially.`;
      }

      return `Use a less aggressive utilization target or add capacity margin before locking the design. The plan is still viable, but it is starting to depend on optimistic loading.`;
    }

    if (dominantConstraint === "Client density pressure") {
      return `Add APs or reduce cell load before treating this design as comfortable. Contention is now the main failure mode, and it will show up before the radios appear fully saturated on paper.`;
    }

    if (dominantConstraint === "Throughput demand pressure") {
      return `Increase capacity margin before moving forward. The radio plan is carrying too much throughput burden to rely on nominal assumptions alone.`;
    }

    return `Lower the utilization target or scale the AP count upward before design freeze. The current plan is too dependent on near-limit AP loading.`;
  }

  function renderFallback(summaryRows, derivedRows, status, dominantConstraint, interpretation, guidance) {
    if (els.results) {
      els.results.innerHTML = `
        ${summaryRows.map((row) => `
          <div class="result-row">
            <div class="result-label">${row.label}</div>
            <div class="result-value">${row.value}</div>
          </div>
        `).join("")}
        ${derivedRows.map((row) => `
          <div class="result-row">
            <div class="result-label">${row.label}</div>
            <div class="result-value">${row.value}</div>
          </div>
        `).join("")}
      `;
    }

    if (els.analysisCopy) {
      els.analysisCopy.style.display = "";
      els.analysisCopy.innerHTML = `
        <div class="results">
          <div class="result-row">
            <div class="result-label">Status</div>
            <div class="result-value">${status}</div>
          </div>
          <div class="result-row">
            <div class="result-label">Dominant Constraint</div>
            <div class="result-value">${dominantConstraint}</div>
          </div>
          <div class="result-row">
            <div class="result-label">Engineering Interpretation</div>
            <div class="result-value">${interpretation}</div>
          </div>
          <div class="result-row">
            <div class="result-label">Actionable Guidance</div>
            <div class="result-value">${guidance}</div>
          </div>
        </div>
      `;
    }
  }

  function calculate() {
    const clients = clamp(safeNumber(els.clients.value, NaN), 0, 1000000);
    const mbps = clamp(safeNumber(els.mbps.value, NaN), 0, 100000);
    const utilPct = clamp(safeNumber(els.util.value, NaN), 1, 100);
    const apcap = clamp(safeNumber(els.apcap.value, NaN), 0, 100000);
    const maxc = clamp(safeNumber(els.maxc.value, NaN), 1, 100000);

    if (
      !Number.isFinite(clients) || clients <= 0 ||
      !Number.isFinite(mbps) || mbps <= 0 ||
      !Number.isFinite(utilPct) || utilPct <= 0 ||
      !Number.isFinite(apcap) || apcap <= 0 ||
      !Number.isFinite(maxc) || maxc <= 0
    ) {
      if (els.results) {
        els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      }
      clearAnalysisBlock();
      hideContinue();
      clearStored();
      clearChart();
      return;
    }

    const util = utilPct / 100;
    const totalDemand = clients * mbps;
    const usablePerAP = apcap * Math.max(0.05, util);

    const byThroughput = Math.max(1, Math.ceil(totalDemand / usablePerAP));
    const byClients = Math.max(1, Math.ceil(clients / Math.max(1, maxc)));
    const recommended = Math.max(byThroughput, byClients);

    const throughputPressure = byThroughput / 4;
    const clientDensityPressure = byClients / 4;
    const utilizationPressure = 60 / utilPct;

    const metrics = [
      {
        label: "Throughput demand pressure",
        value: throughputPressure,
        displayValue: `${byThroughput} APs`
      },
      {
        label: "Client density pressure",
        value: clientDensityPressure,
        displayValue: `${byClients} APs`
      },
      {
        label: "Utilization target pressure",
        value: utilizationPressure,
        displayValue: `${utilPct.toFixed(0)}%`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Throughput demand pressure";

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
      dominantLabel = resolved?.dominant?.label || "Throughput demand pressure";
    } else {
      const dominant = metrics.reduce((best, current) =>
        Number(current.value) > Number(best.value) ? current : best
      );
      dominantLabel = dominant.label;
      if (Number(dominant.value) > 1.5) status = "RISK";
      else if (Number(dominant.value) > 1.0) status = "WATCH";
    }

    const dominantConstraintMap = {
      "Throughput demand pressure": "Throughput demand pressure",
      "Client density pressure": "Client density pressure",
      "Utilization target pressure": "Utilization target pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Throughput demand pressure";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      recommended,
      byThroughput,
      byClients
    );

    const guidance = buildGuidance(status, dominantConstraint);

    const summaryRows = [
      { label: "Total Client Demand", value: `${totalDemand.toFixed(1)} Mbps` },
      { label: "Usable per AP", value: `${usablePerAP.toFixed(1)} Mbps` },
      { label: "APs (Throughput)", value: `${byThroughput}` }
    ];

    const derivedRows = [
      { label: "APs (Client Limit)", value: `${byClients}` },
      { label: "Recommended AP Count", value: `${recommended}` },
      { label: "Planning Basis", value: byClients >= byThroughput ? "Client-limited design" : "Throughput-limited design" }
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
      renderFallback(
        summaryRows,
        derivedRows,
        status,
        dominantConstraint,
        interpretation,
        guidance
      );
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
        labels: [
          "Throughput Demand",
          "Client Density",
          "Utilization Target"
        ],
        values: [
          throughputPressure,
          clientDensityPressure,
          utilizationPressure
        ],
        displayValues: [
          `${byThroughput} APs`,
          `${byClients} APs`,
          `${utilPct.toFixed(0)}%`
        ],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.5,
        axisTitle: "Capacity Pressure",
        referenceLabel: "Healthy Threshold",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          3,
          Math.ceil(Math.max(throughputPressure, clientDensityPressure, utilizationPressure, 1.5) * 1.15 * 10) / 10
        )
      });
    }

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        totalDemand,
        recommended,
        byThroughput,
        byClients,
        status,
        dominantConstraint
      }
    }));

    showContinue();
  }

  function reset() {
    els.clients.value = 150;
    els.mbps.value = 3;
    els.util.value = 60;
    els.apcap.value = 300;
    els.maxc.value = 35;
    clearStored();
    hideContinue();
    renderEmpty();
    loadPrior();
  }

  function bindInvalidation() {
    [els.clients, els.mbps, els.util, els.apcap, els.maxc].forEach(el => {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    hideContinue();
    renderEmpty();
    loadPrior();
    bindInvalidation();

    els.calc.addEventListener("click", calculate);
    els.reset.addEventListener("click", reset);
    els.continueBtn.addEventListener("click", () => {
      window.location.href = NEXT_URL;
    });
  }

  init();
})();