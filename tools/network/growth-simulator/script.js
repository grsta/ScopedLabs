(() => {
  const DEFAULTS = {
    startMbps: 500,
    growthPct: 6,
    months: 18,
    peak: 1.15,
    overhead: 15,
    util: 70,
    uplink: 1
  };

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    startMbps: $("startMbps"),
    growthPct: $("growthPct"),
    months: $("months"),
    peak: $("peak"),
    overhead: $("overhead"),
    util: $("util"),
    uplink: $("uplink"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    tableWrap: $("tableWrap")
  };

  function fmtMbps(v) {
    return `${Number(v).toFixed(1)} Mbps`;
  }

  function fmtGbps(v) {
    return `${Number(v).toFixed(3)} Gbps`;
  }

  function fmtPct(v) {
    return `${Number(v).toFixed(1)}%`;
  }

  function applyDefaults() {
    els.startMbps.value = String(DEFAULTS.startMbps);
    els.growthPct.value = String(DEFAULTS.growthPct);
    els.months.value = String(DEFAULTS.months);
    els.peak.value = String(DEFAULTS.peak);
    els.overhead.value = String(DEFAULTS.overhead);
    els.util.value = String(DEFAULTS.util);
    els.uplink.value = String(DEFAULTS.uplink);
  }

  function clearTable() {
    els.tableWrap.innerHTML = `<div class="muted">Simulation output will appear here.</div>`;
  }

  function invalidate() {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">Enter values and press Simulate.</div>`;
    clearTable();
  }

  function buildTable(months, series, safeLimitGbps) {
    els.tableWrap.innerHTML = "";

    const table = document.createElement("table");
    table.className = "table";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th style="text-align:left;">Month</th>
        <th style="text-align:right;">Base (Mbps)</th>
        <th style="text-align:right;">Required (Mbps)</th>
        <th style="text-align:right;">Required (Gbps)</th>
        <th style="text-align:right;">Utilization</th>
        <th style="text-align:right;">Links Needed</th>
      </tr>
    `;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    for (let i = 0; i <= months; i++) {
      const s = series[i];
      const utilPct = safeLimitGbps > 0 ? (s.reqGbps / safeLimitGbps) * 100 : 0;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td style="text-align:left;">${i}</td>
        <td style="text-align:right;">${s.base.toFixed(1)}</td>
        <td style="text-align:right;">${s.req.toFixed(1)}</td>
        <td style="text-align:right;">${s.reqGbps.toFixed(3)}</td>
        <td style="text-align:right;">${utilPct.toFixed(1)}%</td>
        <td style="text-align:right;">${s.links}</td>
      `;
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);
    els.tableWrap.appendChild(table);
  }

  function estimateSaturationMonth(series, safeLimitGbps) {
    for (let i = 0; i < series.length; i++) {
      if (series[i].reqGbps > safeLimitGbps) return i;
    }
    return null;
  }

  function getInputs() {
    const startMbps = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.startMbps.value, NaN));
    const growthPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.growthPct.value, NaN));
    const months = Math.max(1, Math.floor(ScopedLabsAnalyzer.safeNumber(els.months.value, NaN)));
    const peak = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.peak.value, NaN));
    const overheadPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.overhead.value, NaN));
    const utilPct = ScopedLabsAnalyzer.clamp(
      ScopedLabsAnalyzer.safeNumber(els.util.value, NaN),
      10,
      100
    );
    const uplinkGbps = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.uplink.value, NaN));

    if ([startMbps, growthPct, months, peak, overheadPct, utilPct, uplinkGbps].some((v) => !Number.isFinite(v))) {
      return { ok: false, message: "Enter valid numeric values." };
    }

    return {
      ok: true,
      startMbps,
      growthPct,
      months,
      peak,
      overheadPct,
      utilPct,
      uplinkGbps
    };
  }

  function simulateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const {
      startMbps,
      growthPct,
      months,
      peak,
      overheadPct,
      utilPct,
      uplinkGbps
    } = input;

    const series = [];
    let base = startMbps;

    for (let m = 0; m <= months; m++) {
      const peakMbps = base * peak;
      const req = peakMbps * (1 + overheadPct / 100);
      const reqGbps = req / 1000;
      const neededAtTarget = reqGbps / (utilPct / 100);
      const links = Math.max(1, Math.ceil(neededAtTarget / uplinkGbps));

      series.push({ base, req, reqGbps, links });
      base = base * (1 + growthPct / 100);
    }

    const end = series[months];
    const start = series[0];
    const safeLimitGbps = uplinkGbps * (utilPct / 100);
    const safeLimitMbps = safeLimitGbps * 1000;
    const saturationMonth = estimateSaturationMonth(series, safeLimitGbps);

    const startUtilPct = safeLimitMbps > 0 ? (start.req / safeLimitMbps) * 100 : 0;
    const endUtilPct = safeLimitMbps > 0 ? (end.req / safeLimitMbps) * 100 : 0;
    const growthRatio = startMbps > 0 ? end.req / startMbps : 0;
    const requiredHeadroomGbps = end.reqGbps / (utilPct / 100);
    const upgradeGapGbps = Math.max(0, requiredHeadroomGbps - uplinkGbps);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: endUtilPct,
      metrics: [
        {
          label: "Start Load Pressure",
          value: startUtilPct,
          displayValue: fmtPct(startUtilPct)
        },
        {
          label: "End Load Pressure",
          value: endUtilPct,
          displayValue: fmtPct(endUtilPct)
        },
        {
          label: "Growth Expansion",
          value: growthRatio * 100,
          displayValue: `${growthRatio.toFixed(2)}x`
        }
      ],
      healthyMax: 85,
      watchMax: 100
    });

    const dominantLabel = statusPack.dominant.label;

    let interpretation = `Projected required bandwidth grows from ${fmtMbps(start.req)} today to ${fmtMbps(end.req)} by month ${months}. At your selected utilization target, that places the end-state demand at ${fmtPct(endUtilPct)} of the comfortable operating band for a ${uplinkGbps} Gbps uplink.`;

    if (growthRatio >= 2) {
      interpretation += " This is not a minor expansion. It represents a real capacity planning event where growth itself becomes a design pressure, not just daily traffic variance.";
    } else if (growthRatio >= 1.35) {
      interpretation += " The design remains workable early on, but growth is strong enough that capacity margin erodes meaningfully across the projection window.";
    } else {
      interpretation += " Growth is comparatively moderate, so the design pressure is driven more by current link sizing than by runaway demand expansion.";
    }

    let dominantConstraint = `${dominantLabel} is the dominant limiter. In practice, that means the future design will be constrained first by how close projected demand gets to your comfort band, rather than by today’s observed load alone.`;

    if (saturationMonth !== null) {
      dominantConstraint += ` The current design crosses the selected utilization threshold around month ${saturationMonth}, which means congestion risk starts rising before the end of the planning window.`;
    } else {
      dominantConstraint += " The projection does not cross the selected utilization threshold inside this window, so the current uplink remains serviceable under the modeled assumptions.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = `Plan for an uplink or aggregation change before month ${saturationMonth ?? months}. The modeled end-state really wants about ${fmtGbps(requiredHeadroomGbps)} of uplink capacity to stay near the ${utilPct.toFixed(0)}% operating target. If an outright upgrade is not practical, split traffic domains or reduce peak overlap before this growth becomes production pain.`;
    } else if (statusPack.status === "WATCH") {
      guidance = `The design is not failing immediately, but usable headroom is thinning. Validate the growth assumption against actual history and compare this result with Oversubscription or Latency tools if this uplink also carries bursty shared traffic.`;
    } else {
      guidance = `This projection stays inside a controlled band. Keep reviewing real utilization quarterly, and revisit sooner if demand composition changes faster than simple monthly growth suggests.`;
    }

    return {
      ok: true,
      input,
      series,
      start,
      end,
      safeLimitGbps,
      safeLimitMbps,
      saturationMonth,
      startUtilPct,
      endUtilPct,
      growthRatio,
      requiredHeadroomGbps,
      upgradeGapGbps,
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
    clearTable();
  }

  function renderSuccess(data) {
    const {
      input,
      start,
      end,
      safeLimitGbps,
      saturationMonth,
      startUtilPct,
      endUtilPct,
      growthRatio,
      requiredHeadroomGbps,
      upgradeGapGbps,
      status,
      interpretation,
      dominantConstraint,
      guidance
    } = data;

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Current required bandwidth", value: `${fmtMbps(start.req)} (${fmtGbps(start.reqGbps)})` },
        { label: "Projected end-month required bandwidth", value: `${fmtMbps(end.req)} (${fmtGbps(end.reqGbps)})` },
        { label: "Selected uplink", value: `${input.uplinkGbps} Gbps` },
        { label: "Comfort-band capacity at target utilization", value: fmtGbps(safeLimitGbps) }
      ],
      derivedRows: [
        { label: "Start load pressure", value: fmtPct(startUtilPct) },
        { label: "End load pressure", value: fmtPct(endUtilPct) },
        { label: "Growth expansion", value: `${growthRatio.toFixed(2)}x` },
        { label: "Recommended uplink at target utilization", value: fmtGbps(requiredHeadroomGbps) },
        { label: "Additional uplink needed", value: fmtGbps(upgradeGapGbps) },
        {
          label: "Saturation month",
          value: saturationMonth === null ? "Not reached in this window" : `Month ${saturationMonth}`
        }
      ],
      status,
      interpretation,
      dominantConstraint,
      guidance,
      chart: {
        labels: [
          "Start Load Pressure",
          "End Load Pressure",
          "Growth Expansion"
        ],
        values: [
          Number(startUtilPct.toFixed(1)),
          Number(endUtilPct.toFixed(1)),
          Number((growthRatio * 100).toFixed(1))
        ],
        displayValues: [
          fmtPct(startUtilPct),
          fmtPct(endUtilPct),
          `${growthRatio.toFixed(2)}x`
        ],
        referenceValue: 85,
        healthyMax: 85,
        watchMax: 100,
        axisTitle: "Growth Pressure",
        referenceLabel: "Healthy Margin Floor",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          110,
          Math.ceil(
            Math.max(startUtilPct, endUtilPct, growthRatio * 100, 100) * 1.12
          )
        )
      }
    });

    buildTable(data.input.months, data.series, data.safeLimitGbps);
  }

  function simulate() {
    const data = simulateModel();
    if (!data.ok) {
      renderError(data.message);
      return;
    }
    renderSuccess(data);
  }

  function reset() {
    applyDefaults();
    invalidate();
  }

  function bindInvalidation() {
    [
      els.startMbps,
      els.growthPct,
      els.months,
      els.peak,
      els.overhead,
      els.util,
      els.uplink
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    bindInvalidation();

    els.calc.addEventListener("click", simulate);
    els.reset.addEventListener("click", reset);

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const target = e.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT")) {
        e.preventDefault();
        simulate();
      }
    });

    reset();
  });
})();
