(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "infrastructure";
  const CURRENT_STEP = "equipment-spacing";

  let cachedFlow = null;
  let hasResult = false;

  const els = {
    rows: $("rows"),
    racksPer: $("racksPer"),
    rackW: $("rackW"),
    rackD: $("rackD"),
    cold: $("cold"),
    hot: $("hot"),
    end: $("end"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

  function refreshFlowNote() {
    cachedFlow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      cachedFlow,
      title: "Infrastructure Context",
      intro:
        "This step checks whether the layout is simply fitting racks on paper or still preserving serviceability, aisle usability, and future layout flexibility."
    });
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continue,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      emptyMessage: "Run calculation."
    });

    hasResult = false;
    refreshFlowNote();
  }

  function calc() {
    const rows = Math.max(1, Math.floor(ScopedLabsAnalyzer.safeNumber(els.rows.value, 1)));
    const racksPer = Math.max(1, Math.floor(ScopedLabsAnalyzer.safeNumber(els.racksPer.value, 1)));
    const rackW = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.rackW.value, 1));
    const rackD = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.rackD.value, 1));
    const cold = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.cold.value, 0));
    const hot = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.hot.value, 0));
    const end = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.end.value, 0));

    const lengthIn = racksPer * rackW + 2 * end;

    let widthIn = 0;
    for (let i = 0; i < rows; i++) {
      widthIn += rackD;
      if (i < rows - 1) {
        widthIn += (i % 2 === 0) ? cold : hot;
      }
    }

    const lengthFt = lengthIn / 12;
    const widthFt = widthIn / 12;
    const areaSqFt = lengthFt * widthFt;

    const coldAisleFt = cold / 12;
    const hotAisleFt = hot / 12;
    const endClearFt = end / 12;
    const rackFootprintSqFt = (rows * racksPer * rackW * rackD) / 144;
    const layoutEfficiency = areaSqFt > 0 ? (rackFootprintSqFt / areaSqFt) * 100 : 0;

    const serviceMargin = Math.min(coldAisleFt, hotAisleFt, endClearFt);
    const growthPadding = Math.max(0, (areaSqFt - rackFootprintSqFt) / Math.max(areaSqFt, 1) * 100);

    const healthyAisle = 4.0;
    const watchAisle = 3.0;

    let status = "HEALTHY";
    if (serviceMargin < watchAisle || growthPadding < 15 || layoutEfficiency > 70) {
      status = "RISK";
    } else if (serviceMargin < healthyAisle || growthPadding < 25 || layoutEfficiency > 55) {
      status = "WATCH";
    }

    let layout = "Balanced";
    if (serviceMargin < watchAisle || widthFt < 10) layout = "Tight";
    else if (growthPadding > 35 && widthFt > 20) layout = "Spacious";

    let dominantConstraint = "Balanced equipment layout";
    if (serviceMargin < coldAisleFt && serviceMargin <= hotAisleFt) {
      dominantConstraint = "End or service clearance";
    } else if (coldAisleFt <= hotAisleFt && coldAisleFt <= serviceMargin) {
      dominantConstraint = "Cold aisle width";
    } else if (hotAisleFt <= coldAisleFt && hotAisleFt <= serviceMargin) {
      dominantConstraint = "Hot aisle width";
    }

    let insight = "Layout is within a workable deployment standard.";
    if (status === "WATCH") {
      insight = "The layout fits, but aisle margin or expansion room is tightening. Service access and airflow flexibility will become harder as density increases.";
    }
    if (status === "RISK") {
      insight = "The layout is crowding usable deployment margin. Even if racks fit dimensionally, serviceability and future adjustment space are becoming the real constraint.";
    }

    let guidance = "Maintain this layout, but preserve future rack-growth and access planning in the room design.";
    if (status === "WATCH") {
      guidance = "Validate technician access, door swing, and cable/service approach before locking this room plan. Watch what tightens first: aisle usability, end clearance, or growth room.";
    }
    if (status === "RISK") {
      guidance = `Rework the room plan. The primary limiter is ${dominantConstraint.toLowerCase()}, not raw floor area. Increase aisle or end clearance, reduce row density, or enlarge the room before finalizing deployment.`;
    }

    const summaryRows = [
      { label: "Room Length", value: `${lengthFt.toFixed(1)} ft` },
      { label: "Room Width", value: `${widthFt.toFixed(1)} ft` },
      { label: "Floor Area", value: `${areaSqFt.toFixed(0)} sq ft` },
      { label: "Layout Density", value: layout },
      { label: "Status", value: status }
    ];

    const derivedRows = [
      { label: "Rack Footprint", value: `${rackFootprintSqFt.toFixed(0)} sq ft` },
      { label: "Layout Efficiency", value: `${layoutEfficiency.toFixed(1)} %` },
      { label: "Service Margin", value: `${serviceMargin.toFixed(1)} ft` },
      { label: "Growth Padding", value: `${growthPadding.toFixed(1)} %` }
    ];

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      summaryRows,
      derivedRows,
      status,
      interpretation: insight,
      dominantConstraint,
      guidance,
      chart: null
    });

    ScopedLabsAnalyzer.writeFlow(FLOW_KEY, {
      category: "infrastructure",
      step: "equipment-spacing",
      data: {
        lengthFt,
        widthFt,
        areaSqFt,
        layout,
        status
      }
    });

    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continue);
    hasResult = true;
  }

  function reset() {
    els.rows.value = 2;
    els.racksPer.value = 6;
    els.rackW.value = 24;
    els.rackD.value = 42;
    els.cold.value = 48;
    els.hot.value = 48;
    els.end.value = 36;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["rows", "racksPer", "rackW", "rackD", "cold", "hot", "end"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/infrastructure/rack-weight-load/";
  });

  refreshFlowNote();
  invalidate();
})();
