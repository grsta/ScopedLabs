(() => {
  const FLOW_KEYS = {
    poe: "scopedlabs:pipeline:network:poe-budget",
    bandwidth: "scopedlabs:pipeline:network:bandwidth",
    oversub: "scopedlabs:pipeline:network:oversubscription",
    latency: "scopedlabs:pipeline:network:latency"
  };

  const DEFAULTS = {
    poeBudgetW: 370,
    marginPct: 20,
    poeStandard: "at",
    poePorts: 16,
    camsCount: 12,
    camsW: 12,
    apsCount: 2,
    apsW: 15,
    phonesCount: 0,
    phonesW: 5,
    otherCount: 0,
    otherW: 10
  };

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    poeBudgetW: $("poeBudgetW"),
    marginPct: $("marginPct"),
    poeStandard: $("poeStandard"),
    poePorts: $("poePorts"),
    camsCount: $("camsCount"),
    camsW: $("camsW"),
    apsCount: $("apsCount"),
    apsW: $("apsW"),
    phonesCount: $("phonesCount"),
    phonesW: $("phonesW"),
    otherCount: $("otherCount"),
    otherW: $("otherW"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("next-step-row"),
    continueBtn: $("to-bandwidth")
  };

  function safeNum(el, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(el?.value, fallback);
  }

  function fmtW(x) {
    return Number.isFinite(x) ? `${x.toFixed(1)} W` : "—";
  }

  function fmtPct(x) {
    return Number.isFinite(x) ? `${x.toFixed(1)}%` : "—";
  }

  function fmtCount(x) {
    return Number.isFinite(x) ? `${Math.round(x)}` : "—";
  }

  function applyDefaults() {
    els.poeBudgetW.value = String(DEFAULTS.poeBudgetW);
    els.marginPct.value = String(DEFAULTS.marginPct);
    els.poeStandard.value = DEFAULTS.poeStandard;
    els.poePorts.value = String(DEFAULTS.poePorts);
    els.camsCount.value = String(DEFAULTS.camsCount);
    els.camsW.value = String(DEFAULTS.camsW);
    els.apsCount.value = String(DEFAULTS.apsCount);
    els.apsW.value = String(DEFAULTS.apsW);
    els.phonesCount.value = String(DEFAULTS.phonesCount);
    els.phonesW.value = String(DEFAULTS.phonesW);
    els.otherCount.value = String(DEFAULTS.otherCount);
    els.otherW.value = String(DEFAULTS.otherW);
  }

  function clearNetworkPipelineState() {
    try {
      Object.values(FLOW_KEYS).forEach((key) => sessionStorage.removeItem(key));
    } catch {}
  }

  function renderFlowContext() {
    if (!els.flowNote) return;
    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Start here for the Network pipeline.</strong><br>
      Confirm switch power headroom before estimating traffic demand.
    `;
  }

  function invalidate() {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
    renderFlowContext();
  }

  function getInputs() {
    const poeBudgetW = safeNum(els.poeBudgetW);
    const marginPct = ScopedLabsAnalyzer.clamp(safeNum(els.marginPct), 0, 80);
    const poePorts = Math.max(0, Math.floor(safeNum(els.poePorts)));
    const camsCount = Math.max(0, Math.floor(safeNum(els.camsCount)));
    const camsW = Math.max(0, safeNum(els.camsW));
    const apsCount = Math.max(0, Math.floor(safeNum(els.apsCount)));
    const apsW = Math.max(0, safeNum(els.apsW));
    const phonesCount = Math.max(0, Math.floor(safeNum(els.phonesCount)));
    const phonesW = Math.max(0, safeNum(els.phonesW));
    const otherCount = Math.max(0, Math.floor(safeNum(els.otherCount)));
    const otherW = Math.max(0, safeNum(els.otherW));
    const poeStandard = String(els.poeStandard?.value || "at");

    const required = [
      poeBudgetW, marginPct, poePorts,
      camsCount, camsW,
      apsCount, apsW,
      phonesCount, phonesW,
      otherCount, otherW
    ];

    if (required.some((v) => !Number.isFinite(v) || v < 0)) {
      return { ok: false, message: "Enter valid non-negative values." };
    }

    return {
      ok: true,
      poeBudgetW,
      marginPct,
      poePorts,
      camsCount,
      camsW,
      apsCount,
      apsW,
      phonesCount,
      phonesW,
      otherCount,
      otherW,
      poeStandard
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const totalDevices = input.camsCount + input.apsCount + input.phonesCount + input.otherCount;

    const totalDrawW =
      (input.camsCount * input.camsW) +
      (input.apsCount * input.apsW) +
      (input.phonesCount * input.phonesW) +
      (input.otherCount * input.otherW);

    const safeBudgetW = input.poeBudgetW * (1 - (input.marginPct / 100));
    const headroomW = safeBudgetW - totalDrawW;
    const utilPct = input.poeBudgetW > 0 ? (totalDrawW / input.poeBudgetW) * 100 : 0;
    const safeBandPct = input.poeBudgetW > 0 ? (safeBudgetW / input.poeBudgetW) * 100 : 0;
    const portWarn = input.poePorts > 0 && totalDevices > input.poePorts;
    const portsRemaining = input.poePorts - totalDevices;

    const standardComforts = { af: 12.95, at: 25.5, bt: 60 };
    const perPortComfort = standardComforts[input.poeStandard] || 25.5;
    const averagePerDeviceW = totalDevices > 0 ? totalDrawW / totalDevices : 0;
    const portPowerPressurePct = perPortComfort > 0 ? (averagePerDeviceW / perPortComfort) * 100 : 0;

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: utilPct,
      metrics: [
        { label: "Switch Budget Pressure", value: utilPct, displayValue: fmtPct(utilPct) },
        { label: "Safe-Band Pressure", value: safeBudgetW > 0 ? (totalDrawW / safeBudgetW) * 100 : 0, displayValue: safeBudgetW > 0 ? fmtPct((totalDrawW / safeBudgetW) * 100) : "—" },
        { label: "Per-Port Load Pressure", value: portPowerPressurePct, displayValue: fmtPct(portPowerPressurePct) }
      ],
      healthyMax: safeBandPct,
      watchMax: 95
    });

    let interpretation = `Estimated PoE draw is ${fmtW(totalDrawW)} against a switch budget of ${fmtW(input.poeBudgetW)}. After holding back a ${fmtPct(input.marginPct)} planning reserve, the usable safe budget is ${fmtW(safeBudgetW)}.`;

    if (statusPack.status === "RISK") {
      interpretation += " The modeled load is now too close to, or beyond, the safe operating band. In practice, this is where IR, heaters, startup events, or accessory modules can push the switch into unstable behavior or force load shedding long before the nameplate budget looks fully consumed.";
    } else if (statusPack.status === "WATCH") {
      interpretation += " The design is still workable on paper, but margin is thin enough that field behavior and seasonal draw variation can start consuming the remaining reserve faster than expected.";
    } else {
      interpretation += " The design remains inside a controlled planning band, so the switch still has usable reserve for normal real-world variance under the assumptions entered here.";
    }

    let dominantConstraint = statusPack.dominant.label === "Per-Port Load Pressure"
      ? "Per-port load pressure is the dominant limiter. That means the issue is not just total switch budget, but how aggressively each powered endpoint is being assumed relative to the selected PoE standard."
      : statusPack.dominant.label === "Safe-Band Pressure"
      ? "Safe-band pressure is the dominant limiter. The total design is consuming the reserved planning margin too quickly, even if it has not fully exhausted the raw switch budget yet."
      : "Switch budget pressure is the dominant limiter. The overall switch power envelope is the first hard limit that will constrain this design under peak draw conditions.";

    if (portWarn) {
      dominantConstraint += " Device count also exceeds the available powered port count, so the design is not physically supportable as entered even before power headroom is considered.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = "Reduce powered load, split endpoints across switches, or move to a larger PoE budget before deployment. If cameras use IR, heaters, or high-draw accessories, validate field worst-case draw instead of relying on typical idle numbers.";
    } else if (statusPack.status === "WATCH") {
      guidance = "The design is serviceable but tight. Keep reserve higher if endpoints can surge, and verify whether your watt assumptions reflect realistic field behavior rather than nominal specs.";
    } else {
      guidance = "This PoE plan is balanced. Continue into Bandwidth next so the traffic model is built on a switch design that already has power headroom under control.";
    }

    return {
      ok: true,
      input,
      totalDevices,
      totalDrawW,
      safeBudgetW,
      headroomW,
      utilPct,
      safeBandPct,
      portWarn,
      portsRemaining,
      averagePerDeviceW,
      portPowerPressurePct,
      status: statusPack.status,
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
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS.poe, {
      category: "network",
      step: "poe-budget",
      data: {
        poeBudgetW: Number(data.input.poeBudgetW.toFixed(1)),
        safeBudgetW: Number(data.safeBudgetW.toFixed(1)),
        poeHeadroomW: Number(data.headroomW.toFixed(1)),
        poeUtilPct: Number(data.utilPct.toFixed(1)),
        poweredDevices: Number(data.totalDevices),
        poeStatus: data.status
      }
    });
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Total device draw", value: fmtW(data.totalDrawW) },
        { label: "Safe budget (after margin)", value: fmtW(data.safeBudgetW) },
        { label: "Headroom", value: fmtW(data.headroomW) },
        { label: "Powered devices", value: fmtCount(data.totalDevices) }
      ],
      derivedRows: [
        { label: "Utilization (vs switch budget)", value: fmtPct(data.utilPct) },
        { label: "Ports used", value: fmtCount(data.input.poePorts) },
        { label: "Ports remaining", value: fmtCount(data.portsRemaining) },
        { label: "Average watts per device", value: fmtW(data.averagePerDeviceW) },
        { label: "Per-port load pressure", value: fmtPct(data.portPowerPressurePct) },
        { label: "Port-count warning", value: data.portWarn ? "YES" : "NO" }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: ["Total Device Draw", "Safe Budget", "Headroom"],
        values: [
          Number(data.totalDrawW.toFixed(1)),
          Number(data.safeBudgetW.toFixed(1)),
          Number(Math.max(0, data.headroomW).toFixed(1))
        ],
        displayValues: [
          fmtW(data.totalDrawW),
          fmtW(data.safeBudgetW),
          fmtW(Math.max(0, data.headroomW))
        ],
        referenceValue: data.safeBudgetW,
        healthyMax: data.safeBudgetW,
        watchMax: data.input.poeBudgetW,
        axisTitle: "PoE Capacity (W)",
        referenceLabel: "Safe Budget",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(
            Math.max(data.totalDrawW, data.safeBudgetW, data.input.poeBudgetW) * 1.12
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
    clearNetworkPipelineState();
    applyDefaults();
    renderFlowContext();
    invalidate();
  }

  function bindInvalidation() {
    [
      els.poeBudgetW,
      els.marginPct,
      els.poeStandard,
      els.poePorts,
      els.camsCount,
      els.camsW,
      els.apsCount,
      els.apsW,
      els.phonesCount,
      els.phonesW,
      els.otherCount,
      els.otherW
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

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
  });
})();