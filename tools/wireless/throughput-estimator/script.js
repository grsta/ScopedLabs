(() => {
  const $ = id => document.getElementById(id);

  const els = {
    snr: $("snr"),
    width: $("width"),
    clients: $("clients"),
    util: $("util"),
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
    els.results.innerHTML = `<div class="muted">Enter values and press Estimate.</div>`;
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
        emptyMessage: "Enter values and press Estimate."
      });
    } else {
      renderEmpty();
    }
    clearChart();
  }

  function baseRate(snr){
    if (snr >= 35) return 1200;
    if (snr >= 30) return 900;
    if (snr >= 25) return 650;
    if (snr >= 20) return 400;
    if (snr >= 15) return 200;
    return 100;
  }

  function widthMultiplier(w){
    if (w === 20) return 0.25;
    if (w === 40) return 0.5;
    if (w === 80) return 1;
    if (w === 160) return 2;
    return 1;
  }

  function buildInterpretation(status, dominantConstraint, usable, perClient, clients) {
    if (status === "HEALTHY") {
      return `The estimated usable throughput remains in a workable range for the selected SNR, width, and sharing level. Client demand is being divided efficiently enough that the AP should still feel reasonably healthy under this planning load.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Client sharing pressure") {
        return `The main limiter is how many users are sharing the AP. Even if the radio conditions are decent, client contention is starting to reduce per-user experience enough that density becomes the key concern.`;
      }

      if (dominantConstraint === "SNR pressure") {
        return `Signal quality is starting to cap throughput before client sharing is even considered. The design can still work, but the RF layer is no longer generous enough to ignore link quality assumptions.`;
      }

      return `Utilization policy is starting to squeeze the usable throughput budget. The design is still workable, but operational headroom is becoming thin enough that burst traffic may feel more constrained.`;
    }

    if (dominantConstraint === "Client sharing pressure") {
      return `Too many users are competing for the available throughput. Even with a reasonable PHY rate, client sharing is now the dominant reason the AP experience will feel slower than the headline radio number suggests.`;
    }

    if (dominantConstraint === "SNR pressure") {
      return `RF quality is too weak to support a comfortable throughput outcome. The link may still function, but the radio is now limiting usable throughput hard enough that client experience will likely degrade.`;
    }

    return `The design is too dependent on utilization optimism. Even if the PHY rate looks attractive, too little practical airtime is being left available for stable real-world throughput.`;
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `Use this as a planning-grade throughput estimate, but still validate real performance against application mix, airtime fairness, and interference during deployment.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Client sharing pressure") {
        return `Reduce the number of simultaneously active users per AP or increase AP density before relying on the present per-client rate.`;
      }

      if (dominantConstraint === "SNR pressure") {
        return `Improve RF quality or lower expectations for the present channel plan. Signal quality is already starting to constrain throughput materially.`;
      }

      return `Leave more operational headroom in the utilization assumption before scaling this design further.`;
    }

    if (dominantConstraint === "Client sharing pressure") {
      return `Treat this as an overloaded sharing model. Add AP capacity or reduce concurrent demand before trusting the result.`;
    }

    if (dominantConstraint === "SNR pressure") {
      return `Fix the RF layer before assuming this throughput is comfortable. Better coverage, cleaner spectrum, or lower width expectations may be needed.`;
    }

    return `Use a more conservative utilization target before deployment. The current plan is too dependent on optimistic airtime availability.`;
  }

  function renderFallback(summaryRows, derivedRows, status, dominantConstraint, interpretation, guidance) {
    els.results.innerHTML = summaryRows.concat(derivedRows).map((row) => `
      <div class="result-row">
        <span class="result-label">${row.label}</span>
        <span class="result-value">${row.value}</span>
      </div>
    `).join("");

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

  function calc(){
    const snr = clamp(safeNumber(els.snr.value, NaN), -10, 80);
    const width = parseInt(els.width.value, 10);
    const clients = Math.max(1, parseInt(els.clients.value, 10));
    const util = clamp(safeNumber(els.util.value, NaN), 1, 100) / 100;

    if (!Number.isFinite(snr) || !Number.isFinite(width) || !Number.isFinite(clients) || !Number.isFinite(util)) {
      els.results.innerHTML = `<div class="muted">Enter valid values and press Estimate.</div>`;
      clearAnalysisBlock();
      clearChart();
      return;
    }

    const phy = baseRate(snr) * widthMultiplier(width);
    const usable = phy * Math.max(0.3, util);
    const perClient = usable / clients;

    const snrPressure =
      snr >= 30 ? 0.7 :
      snr >= 25 ? 1.0 :
      snr >= 20 ? 1.5 :
      2.2;

    const clientSharingPressure = clients / 15;
    const utilizationPressure = 60 / (util * 100);

    const metrics = [
      {
        label: "SNR pressure",
        value: snrPressure,
        displayValue: `${snr.toFixed(0)} dB`
      },
      {
        label: "Client sharing pressure",
        value: clientSharingPressure,
        displayValue: `${clients}`
      },
      {
        label: "Utilization pressure",
        value: utilizationPressure,
        displayValue: `${(util * 100).toFixed(0)}%`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "SNR pressure";

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
      dominantLabel = resolved?.dominant?.label || "SNR pressure";
    }

    const dominantConstraintMap = {
      "SNR pressure": "SNR pressure",
      "Client sharing pressure": "Client sharing pressure",
      "Utilization pressure": "Utilization pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "SNR pressure";

    const interpretation = buildInterpretation(status, dominantConstraint, usable, perClient, clients);
    const guidance = buildGuidance(status, dominantConstraint);

    const summaryRows = [
      {label:"Estimated PHY Rate", value:`${phy.toFixed(0)} Mbps`},
      {label:"Usable Throughput", value:`${usable.toFixed(0)} Mbps`},
      {label:"Clients Sharing AP", value:`${clients}`},
      {label:"Per-Client Avg Throughput", value:`${perClient.toFixed(1)} Mbps`}
    ];

    const derivedRows = [
      {label:"Planning Note", value:"Planning estimate only. Real rates depend on MCS, airtime efficiency, and interference."}
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
      renderFallback(summaryRows, derivedRows, status, dominantConstraint, interpretation, guidance);
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
        labels: ["SNR Pressure", "Client Sharing", "Utilization"],
        values: [snrPressure, clientSharingPressure, utilizationPressure],
        displayValues: [
          `${snr.toFixed(0)} dB`,
          `${clients}`,
          `${(util * 100).toFixed(0)}%`
        ],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.5,
        axisTitle: "Throughput Pressure",
        referenceLabel: "Healthy Threshold",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          3,
          Math.ceil(Math.max(snrPressure, clientSharingPressure, utilizationPressure, 1.5) * 1.15 * 10) / 10
        )
      });
    }
  }

  function reset(){
    els.snr.value = 28;
    els.width.value = "80";
    els.clients.value = 20;
    els.util.value = 60;
    renderEmpty();
  }

  els.calc.onclick = calc;
  els.reset.onclick = reset;

  [els.snr, els.width, els.clients, els.util].forEach((el) => {
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  renderEmpty();
})();


window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});
