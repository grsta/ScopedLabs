/* ScopedLabs — UPS Runtime Estimator
   Analyzer + pipeline-aware version for Power V1
*/
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "power";
  const STEP = "ups-runtime";
  const PREVIOUS_STEP = "load-growth";
  const NEXT_URL = "/tools/power/battery-bank-sizer/";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const els = {
    loadW: $("loadW"),
    upsVA: $("upsVA"),
    pf: $("pf"),
    batteryWh: $("batteryWh"),
    effPct: $("effPct"),
    deratePct: $("deratePct"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    nextRow: $("next-step-row")
  };

  let importedPayload = null;

  function num(el, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(el?.value, fallback);
  }

  function fmt0(n) {
    return Number.isFinite(n) ? Math.round(n).toLocaleString() : "—";
  }

  function fmt1(n) {
    return Number.isFinite(n) ? (Math.round(n * 10) / 10).toFixed(1) : "—";
  }

  function fmtPct(n, digits = 1) {
    return Number.isFinite(n) ? `${n.toFixed(digits)}%` : "—";
  }

  function fmtWatts(n, digits = 0) {
    return Number.isFinite(n) ? `${n.toFixed(digits)} W` : "—";
  }

  function fmtWh(n, digits = 0) {
    return Number.isFinite(n) ? `${n.toFixed(digits)} Wh` : "—";
  }

  function fmtHours(n, digits = 2) {
    return Number.isFinite(n) ? `${n.toFixed(digits)} hrs` : "—";
  }

  function fmtMinutes(n) {
    return Number.isFinite(n) ? `${Math.round(n)} min` : "—";
  }

  function hideContinue() {
    if (els.nextRow) els.nextRow.style.display = "none";
  }

  function showContinue() {
    if (els.nextRow) els.nextRow.style.display = "flex";
  }

  function readPipelineInput() {
    try {
      const raw = sessionStorage.getItem(FLOW_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data) return null;
      return parsed;
    } catch (err) {
      console.warn("Could not read pipeline payload:", err);
      return null;
    }
  }

  function writePipelineResult(payload) {
    try {
      sessionStorage.setItem(
        FLOW_KEY,
        JSON.stringify({
          category: CATEGORY,
          step: STEP,
          ts: Date.now(),
          data: payload
        })
      );
    } catch (err) {
      console.warn("Could not save pipeline payload:", err);
    }
  }

  function renderFlowNote() {
    const incoming = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEY,
      category: CATEGORY,
      step: STEP,
      title: "Pipeline Import",
      intro: "This step checks whether the projected design load can actually be supported by the proposed UPS and usable battery energy."
    });

    if (!incoming || !incoming.data || incoming.step !== PREVIOUS_STEP) return;

    importedPayload = incoming;
    const data = incoming.data || {};
    const loadW =
      Number(data.recommendedCapacityWatts) ||
      Number(data.designLoadWatts) ||
      Number(data.baseLoadWatts) ||
      0;

    if (loadW > 0 && els.loadW && (!els.loadW.value || Number(els.loadW.value) === 250)) {
      els.loadW.value = String(Math.round(loadW));
    }

    const lines = [];
    if (Number.isFinite(Number(data.baseLoadWatts))) {
      lines.push(`Base load <strong>${fmt0(Number(data.baseLoadWatts))} W</strong>`);
    }
    if (Number.isFinite(Number(data.designLoadWatts))) {
      lines.push(`Projected design load <strong>${fmt0(Number(data.designLoadWatts))} W</strong>`);
    }
    if (Number.isFinite(Number(data.growthPct))) {
      lines.push(`Growth <strong>${fmt1(Number(data.growthPct))}%</strong>`);
    }
    if (Number.isFinite(Number(data.headroomPct))) {
      lines.push(`Headroom <strong>${fmt1(Number(data.headroomPct))}%</strong>`);
    }

    if (els.flowNote && lines.length) {
      els.flowNote.innerHTML = `
        <strong>Pipeline Import</strong><br>
        Imported from Load Growth.<br>
        ${lines.join("<br>")}
        <br><br>
        Review values and click <strong>Calculate</strong>.
      `;
      els.flowNote.hidden = false;
    }
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEY,
      category: CATEGORY,
      step: STEP,
      emptyMessage: "Enter values and calculate."
    });
    hideContinue();
    renderFlowNote();
  }

  function getInputs() {
    const loadW = num(els.loadW);
    const upsVA = num(els.upsVA);
    const pf = ScopedLabsAnalyzer.clamp(num(els.pf), 0.5, 1.0);
    const batteryWh = num(els.batteryWh);
    const effPct = ScopedLabsAnalyzer.clamp(num(els.effPct), 50, 98);
    const deratePct = ScopedLabsAnalyzer.clamp(num(els.deratePct), 50, 100);

    if (
      !Number.isFinite(loadW) || loadW <= 0 ||
      !Number.isFinite(upsVA) || upsVA <= 0 ||
      !Number.isFinite(batteryWh) || batteryWh <= 0
    ) {
      return {
        ok: false,
        message: "Load W, UPS VA, and Battery Wh must be greater than 0."
      };
    }

    return {
      ok: true,
      loadW,
      upsVA,
      pf,
      batteryWh,
      effPct,
      deratePct
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const upsWattCap = input.upsVA * input.pf;
    const loadPct = (input.loadW / upsWattCap) * 100;
    const usableWh = input.batteryWh * (input.effPct / 100) * (input.deratePct / 100);
    const runtimeHrs = usableWh / input.loadW;
    const runtimeMin = runtimeHrs * 60;
    const runtimeMarginTo30 = runtimeMin - 30;

    const overloadMetric = loadPct > 100 ? 100 : loadPct;
    const runtimeTightnessMetric =
      runtimeMin >= 30 ? Math.max(0, 100 - runtimeMin) :
      runtimeMin >= 10 ? 60 + (30 - runtimeMin) * 2 :
      Math.min(100, 85 + (10 - runtimeMin));
    const energyMarginMetric =
      input.batteryWh > 0 ? Math.min((usableWh / input.batteryWh) * 100, 100) : 0;

    const metrics = [
      {
        label: "Load Pressure",
        value: Number(overloadMetric.toFixed(1)),
        displayValue: fmtPct(loadPct, 1)
      },
      {
        label: "Runtime Tightness",
        value: Number(runtimeTightnessMetric.toFixed(1)),
        displayValue: fmtMinutes(runtimeMin)
      },
      {
        label: "Usable Energy Loss",
        value: Number((100 - energyMarginMetric).toFixed(1)),
        displayValue: fmtWh(usableWh)
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(overloadMetric, runtimeTightnessMetric, 100 - energyMarginMetric),
      metrics,
      healthyMax: 60,
      watchMax: 85
    });

    let runtimeClass = "Healthy Runtime Margin";
    if (input.loadW > upsWattCap) {
      runtimeClass = "UPS Overload Risk";
    } else if (runtimeMin < 10) {
      runtimeClass = "Thin Runtime Margin";
    } else if (runtimeMin < 30) {
      runtimeClass = "Tight Runtime Margin";
    }

    let interpretation = `A ${fmtWatts(input.loadW)} design load against a ${fmt0(input.upsVA)} VA UPS at power factor ${fmt1(input.pf)} yields about ${fmtWatts(upsWattCap)} of usable UPS watt capacity. With ${fmtWh(input.batteryWh)} installed battery, ${fmtPct(input.effPct, 0)} inverter efficiency, and ${fmtPct(input.deratePct, 0)} battery derate, usable battery energy is about ${fmtWh(usableWh)} and estimated runtime is about ${fmtMinutes(runtimeMin)} (${fmtHours(runtimeHrs)}).`;

    if (input.loadW > upsWattCap) {
      interpretation += ` The design load exceeds usable UPS watt capacity, so runtime math becomes secondary to overload risk. This is not a safe operating point.`;
    } else if (runtimeMin < 10) {
      interpretation += ` Runtime is very limited, so even short outages or degraded batteries can collapse resilience quickly.`;
    } else if (runtimeMin < 30) {
      interpretation += ` Runtime is workable for brief outages, but the buffer is not generous. Aging batteries, cold rooms, or load spikes can erode this quickly.`;
    } else {
      interpretation += ` Runtime margin is reasonably healthy for planning purposes, assuming the battery condition and environmental assumptions are realistic.`;
    }

    let dominantConstraint = "";
    if (loadPct > 100) {
      dominantConstraint = "Load pressure is the dominant limiter. The projected demand is outrunning usable UPS watt capacity before battery runtime even becomes the main issue.";
    } else if (runtimeMin < 30) {
      dominantConstraint = "Runtime tightness is the dominant limiter. Available battery energy is not creating much outage headroom once the projected design load is applied.";
    } else if ((100 - energyMarginMetric) > 20) {
      dominantConstraint = "Usable energy loss is the dominant limiter. Efficiency and battery derate assumptions are materially reducing how much of the installed battery energy actually reaches the load.";
    } else {
      dominantConstraint = "The UPS design assumptions are balanced. Capacity, usable energy, and runtime margin remain in a practical range.";
    }

    let guidance = "";
    if (loadPct > 100) {
      guidance = "Reduce projected load, increase UPS size, or revisit the power factor assumption before treating this runtime result as deployable.";
    } else if (runtimeMin < 10) {
      guidance = "Treat this as a weak runtime design. Increase battery energy, reduce load, or relax outage expectations before moving on to battery-bank sizing.";
    } else if (runtimeMin < 30) {
      guidance = "The design is workable but tight. Validate whether 10–30 minutes really meets the operating goal before carrying this into final battery sizing.";
    } else {
      guidance = "This is a workable UPS runtime baseline. Continue to Battery Bank Sizer next so stored energy planning stays aligned with the validated design load.";
    }

    return {
      ok: true,
      ...input,
      upsWattCap,
      loadPct,
      usableWh,
      runtimeHrs,
      runtimeMin,
      runtimeMarginTo30,
      runtimeClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    hideContinue();
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Usable UPS Watt Capacity", value: fmtWatts(data.upsWattCap) },
        { label: "Load as % of Capacity", value: fmtPct(data.loadPct, 1) },
        { label: "Estimated Runtime", value: `${fmtMinutes(data.runtimeMin)} (${fmtHours(data.runtimeHrs)})` },
        { label: "Runtime Result", value: data.runtimeClass }
      ],
      derivedRows: [
        { label: "Estimated Load", value: fmtWatts(data.loadW) },
        { label: "UPS Rating", value: `${fmt0(data.upsVA)} VA` },
        { label: "Power Factor", value: fmt1(data.pf) },
        { label: "Installed Battery Energy", value: fmtWh(data.batteryWh) },
        { label: "Usable Battery Energy", value: fmtWh(data.usableWh) },
        { label: "Inverter Efficiency", value: fmtPct(data.effPct, 0) },
        { label: "Battery Derate", value: fmtPct(data.deratePct, 0) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Load Pressure",
          "Runtime Tightness",
          "Usable Energy Loss"
        ],
        values: [
          Number(Math.min(data.loadPct > 100 ? 100 : data.loadPct, 100).toFixed(1)),
          Number((
            data.runtimeMin >= 30 ? Math.max(0, 100 - data.runtimeMin) :
            data.runtimeMin >= 10 ? 60 + (30 - data.runtimeMin) * 2 :
            Math.min(100, 85 + (10 - data.runtimeMin))
          ).toFixed(1)),
          Number((100 - ((data.usableWh / data.batteryWh) * 100)).toFixed(1))
        ],
        displayValues: [
          fmtPct(data.loadPct, 1),
          fmtMinutes(data.runtimeMin),
          fmtWh(data.usableWh)
        ],
        referenceValue: 60,
        healthyMax: 60,
        watchMax: 85,
        axisTitle: "Runtime Risk Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: 100
      }
    });

    writePipelineResult({
      source: "UPS Runtime",
      loadW: data.loadW,
      upsVA: data.upsVA,
      powerFactor: data.pf,
      batteryWh: data.batteryWh,
      effPct: data.effPct,
      deratePct: data.deratePct,
      usableWh: data.usableWh,
      upsWattCap: data.upsWattCap,
      loadPct: data.loadPct,
      runtimeHrs: data.runtimeHrs,
      runtimeMin: data.runtimeMin,
      requiredUsableWh: data.usableWh,
      targetRuntimeHours: data.runtimeHrs,
      designLoadWatts: data.loadW,
      importedFrom: importedPayload?.step || null,
      interpretation: data.interpretation,
      guidance: data.guidance
    });

    showContinue();
  }

  function calculate() {
    const data = calculateModel();
    if (!data.ok) {
      renderError(data.message);
      return;
    }
    renderSuccess(data);
  }

  function resetAll() {
    if (els.loadW) els.loadW.value = "250";
    if (els.upsVA) els.upsVA.value = "1500";
    if (els.pf) els.pf.value = "0.90";
    if (els.batteryWh) els.batteryWh.value = "300";
    if (els.effPct) els.effPct.value = "85";
    if (els.deratePct) els.deratePct.value = "80";
    importedPayload = null;
    invalidate();
  }

  function wire() {
    const btnCalc = els.calc;
    const btnReset = els.reset;

    if (!btnCalc || !btnReset) {
      renderError("UPS Runtime tool wiring failed: missing #calc or #reset button IDs in the HTML.");
      return;
    }

    btnCalc.addEventListener("click", calculate);
    btnReset.addEventListener("click", resetAll);

    [els.loadW, els.upsVA, els.pf, els.batteryWh, els.effPct, els.deratePct].forEach((el) => {
      if (!el) return;

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          calculate();
        }
      });

      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    renderFlowNote();
    hideContinue();
    invalidate();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();