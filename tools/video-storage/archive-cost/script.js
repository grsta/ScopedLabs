// Archive Cost Estimator
(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    tb: $("tb"),
    costPerTb: $("costPerTb"),
    copies: $("copies"),
    growthPct: $("growthPct"),
    months: $("months"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy")
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

  function money(x) {
    if (!Number.isFinite(x)) return "—";
    return `$${x.toFixed(2)}`;
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
      try {
        chartRef.current.destroy();
      } catch {}
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
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.invalidate === "function"
    ) {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      renderEmpty();
    }

    clearChart();
  }

  function resolveStatus(metrics) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.5
      });

      return {
        status: resolved?.status || "HEALTHY",
        dominantLabel: resolved?.dominant?.label || metrics[0].label
      };
    }

    const dominant = metrics.reduce((best, current) =>
      Number(current.value) > Number(best.value) ? current : best
    );

    let status = "HEALTHY";
    if (Number(dominant.value) > 1.5) status = "RISK";
    else if (Number(dominant.value) > 1.0) status = "WATCH";

    return {
      status,
      dominantLabel: dominant.label
    };
  }

  function buildInterpretation(status, dominantConstraint, monthlyNow, monthlyEnd, totalCost, growthPct) {
    if (status === "HEALTHY") {
      return `Archive cost remains in a controlled range across the forecast window. Replication, growth, and billing scale are not yet compounding hard enough to turn the archive plan into a cost-management problem.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Growth pressure") {
        return `Monthly archive growth is beginning to compress cost stability. The current plan may still be workable, but compounding storage growth is now doing enough work that long-horizon spend becomes less forgiving.`;
      }

      if (dominantConstraint === "Replication burden") {
        return `Replication is becoming the main cost amplifier. The base storage footprint may be reasonable, but multiple copies are multiplying billed volume enough to make archive strategy a more meaningful cost decision.`;
      }

      return `The archive plan is drifting into a range where forecast spend matters operationally. Current monthly cost may still look manageable, but the longer planning window is starting to expose a heavier ownership burden.`;
    }

    if (dominantConstraint === "Growth pressure") {
      return `Storage growth is now the primary cost risk. Even if the starting archive footprint looks acceptable, compounding monthly expansion is large enough to turn a moderate plan into an expensive one over the forecast horizon.`;
    }

    if (dominantConstraint === "Replication burden") {
      return `Replication overhead is driving archive cost hard enough that billing volume itself becomes the dominant issue. The design may be technically sound, but the number of retained copies is materially changing the economics.`;
    }

    return `Forecast spend is high enough that archive storage is becoming a real lifecycle cost constraint. At this point, cost planning depends on deliberate retention policy and growth control instead of assuming archive volume will stay harmless.`;
  }

  function buildGuidance(status, dominantConstraint, totalCost, monthlyEnd, copies) {
    if (status === "HEALTHY") {
      return `Carry this as a workable archive plan, but keep watching retention scope, replication count, and monthly growth so the current cost shape does not quietly drift upward.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Growth pressure") {
        return `Model tighter retention policy or slower archive growth before the plan scales further. Monthly growth is already strong enough to materially change the cost curve over time.`;
      }

      if (dominantConstraint === "Replication burden") {
        return `Review whether every retained copy is operationally necessary. Reducing replication overhead can improve archive economics faster than trying to optimize storage price alone.`;
      }

      return `Forecast archive spend more deliberately before locking policy. The current design is still workable, but cost sensitivity is high enough that future change can become noticeable quickly.`;
    }

    if (dominantConstraint === "Growth pressure") {
      return `Reduce archive growth, shorten retention scope, or add policy controls before relying on this cost plan. Compounding growth is currently the main reason the forecast is becoming difficult to manage.`;
    }

    if (dominantConstraint === "Replication burden") {
      return `Rework replication strategy before scaling the archive tier. Too much billed duplication is making the archive plan more expensive than it needs to be.`;
    }

    return `Revisit long-term retention assumptions and archive policy before deployment. The forecasted ownership burden is now large enough that storage economics should be treated as a planning constraint, not a background detail.`;
  }

  function renderFallback(summaryRows, derivedRows, status, dominantConstraint, interpretation, guidance) {
    if (els.results) {
      els.results.innerHTML = `
        ${summaryRows.map((row) => `
          <div class="result-row">
            <span class="result-label">${row.label}</span>
            <span class="result-value">${row.value}</span>
          </div>
        `).join("")}
        ${derivedRows.map((row) => `
          <div class="result-row">
            <span class="result-label">${row.label}</span>
            <span class="result-value">${row.value}</span>
          </div>
        `).join("")}
      `;
    }

    if (els.analysisCopy) {
      els.analysisCopy.style.display = "";
      els.analysisCopy.innerHTML = `
        <div class="results">
          <div class="result-row">
            <span class="result-label">Status</span>
            <span class="result-value">${status}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Dominant Constraint</span>
            <span class="result-value">${dominantConstraint}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Engineering Interpretation</span>
            <span class="result-value">${interpretation}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Actionable Guidance</span>
            <span class="result-value">${guidance}</span>
          </div>
        </div>
      `;
    }
  }

  function calculate() {
    const tbRaw = safeNumber(els.tb.value, NaN);
    const costPerTbRaw = safeNumber(els.costPerTb.value, NaN);
    const copiesRaw = safeNumber(els.copies.value, NaN);
    const growthPctRaw = safeNumber(els.growthPct.value, NaN);
    const monthsRaw = safeNumber(els.months.value, NaN);

    if (
      !Number.isFinite(tbRaw) || tbRaw < 0 ||
      !Number.isFinite(costPerTbRaw) || costPerTbRaw < 0 ||
      !Number.isFinite(copiesRaw) || copiesRaw < 1 ||
      !Number.isFinite(growthPctRaw) || growthPctRaw < 0 ||
      !Number.isFinite(monthsRaw) || monthsRaw < 1
    ) {
      if (els.results) {
        els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      }
      clearAnalysisBlock();
      clearChart();
      return;
    }

    const tb = clamp(tbRaw, 0, 1000000);
    const costPerTb = clamp(costPerTbRaw, 0, 1000000);
    const copies = Math.max(1, Math.floor(clamp(copiesRaw, 1, 1000)));
    const growthPct = clamp(growthPctRaw, 0, 1000);
    const months = Math.max(1, Math.floor(clamp(monthsRaw, 1, 600)));

    const growth = growthPct / 100;

    let totalCost = 0;
    let lastMonthTb = tb;

    for (let m = 1; m <= months; m++) {
      const thisMonthTb = tb * Math.pow(1 + growth, (m - 1));
      lastMonthTb = thisMonthTb;
      totalCost += thisMonthTb * copies * costPerTb;
    }

    const billedNowTb = tb * copies;
    const monthlyNow = billedNowTb * costPerTb;

    const billedEndTb = lastMonthTb * copies;
    const monthlyEnd = billedEndTb * costPerTb;

    const avgMonthlyCost = totalCost / months;
    const costGrowthMultiplier = monthlyNow > 0 ? (monthlyEnd / monthlyNow) : 1;
    const forecastBurden = monthlyNow > 0 ? (avgMonthlyCost / monthlyNow) : 1;

    const metrics = [
      {
        label: "Growth Pressure",
        value: costGrowthMultiplier,
        displayValue: `${costGrowthMultiplier.toFixed(2)}x`
      },
      {
        label: "Replication Burden",
        value: copies,
        displayValue: `${copies} copy${copies === 1 ? "" : "ies"}`
      },
      {
        label: "Forecast Spend Pressure",
        value: forecastBurden,
        displayValue: money(avgMonthlyCost)
      }
    ];

    const resolved = resolveStatus(metrics);
    const status = resolved.status;

    const dominantConstraintMap = {
      "Growth Pressure": "Growth pressure",
      "Replication Burden": "Replication burden",
      "Forecast Spend Pressure": "Forecast spend pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[resolved.dominantLabel] || "Growth pressure";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      monthlyNow,
      monthlyEnd,
      totalCost,
      growthPct
    );

    const guidance = buildGuidance(
      status,
      dominantConstraint,
      totalCost,
      monthlyEnd,
      copies
    );

    const summaryRows = [
      { label: "Base Retained Storage", value: `${tb.toFixed(2)} TB` },
      { label: "Cost per TB / Month", value: money(costPerTb) },
      { label: "Replication Copies", value: `${copies}` },
      { label: "Growth per Month", value: `${growthPct.toFixed(1)}%` }
    ];

    const derivedRows = [
      { label: "Current Billed Storage", value: `${billedNowTb.toFixed(2)} TB` },
      { label: "Current Monthly Cost", value: money(monthlyNow) },
      { label: `Billed Storage (Month ${months})`, value: `${billedEndTb.toFixed(2)} TB` },
      { label: `Monthly Cost (Month ${months})`, value: money(monthlyEnd) },
      { label: `Total Cost (${months} months)`, value: money(totalCost) },
      { label: "Average Monthly Cost", value: money(avgMonthlyCost) }
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
          "Growth Pressure",
          "Replication Burden",
          "Forecast Spend"
        ],
        values: [
          costGrowthMultiplier,
          copies,
          forecastBurden
        ],
        displayValues: [
          `${costGrowthMultiplier.toFixed(2)}x`,
          `${copies} copy${copies === 1 ? "" : "ies"}`,
          money(avgMonthlyCost)
        ],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.5,
        axisTitle: "Cost Pressure",
        referenceLabel: "Healthy Threshold",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          3,
          Math.ceil(Math.max(costGrowthMultiplier, copies, forecastBurden, 1.5) * 1.15 * 10) / 10
        )
      });
    }
  }

  function reset() {
    els.tb.value = 20;
    els.costPerTb.value = 15;
    els.copies.value = 1;
    els.growthPct.value = 0;
    els.months.value = 12;
    renderEmpty();
  }

  function bindInvalidation() {
    [els.tb, els.costPerTb, els.copies, els.growthPct, els.months].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    renderEmpty();
    bindInvalidation();

    if (els.calc) els.calc.addEventListener("click", calculate);
    if (els.reset) els.reset.addEventListener("click", reset);
  }

  init();
})();
