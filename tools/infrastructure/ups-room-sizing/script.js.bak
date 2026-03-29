(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "infrastructure";
  const CURRENT_STEP = "ups-room-sizing";

  let cachedFlow = null;
  let hasResult = false;

  const els = {
    ups: $("ups"),
    batt: $("batt"),
    areaEach: $("areaEach"),
    factor: $("factor"),
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
      title: "Structural Context",
      intro:
        "This step checks whether the UPS room is only fitting nominal equipment footprint or still preserving enough access, service, and expansion margin for real deployment.",
      customRows: (() => {
        const source = ScopedLabsAnalyzer.getUpstreamFlow({
          flowKey: FLOW_KEY,
          category: CURRENT_CATEGORY,
          step: CURRENT_STEP,
          cachedFlow
        });

        if (!source || !source.data) return null;

        const d = source.data;
        const rows = [];

        if (typeof d.psf === "number") {
          rows.push({ label: "Floor Load", value: `${d.psf.toFixed(1)} psf` });
        }

        if (typeof d.status === "string") {
          rows.push({ label: "Load Status", value: d.status });
        }

        return rows.length ? rows : null;
      })()
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
    const ups = Math.max(0, Math.floor(ScopedLabsAnalyzer.safeNumber(els.ups.value, 0)));
    const batt = Math.max(0, Math.floor(ScopedLabsAnalyzer.safeNumber(els.batt.value, 0)));
    const areaEach = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.areaEach.value, 0));
    const factor = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.factor.value, 1));

    const totalCab = ups + batt;
    const baseArea = totalCab * areaEach;
    const finalArea = baseArea * factor;

    const clearanceArea = Math.max(0, finalArea - baseArea);
    const densityPct = finalArea > 0 ? (baseArea / finalArea) * 100 : 0;
    const reservePct = Math.max(0, 100 - densityPct);

    let status = "HEALTHY";
    if (factor < 1.3 || reservePct < 15 || densityPct > 75) {
      status = "RISK";
    } else if (factor < 1.6 || reservePct < 25 || densityPct > 60) {
      status = "WATCH";
    }

    let density = "Balanced";
    if (factor < 1.35 || densityPct > 70) density = "Tight";
    else if (factor > 2.0 && reservePct > 35) density = "Spacious";

    let dominantConstraint = "Balanced UPS room sizing";
    if (factor < 1.4) {
      dominantConstraint = "Clearance / service allowance";
    } else if (reservePct < 20) {
      dominantConstraint = "Future expansion reserve";
    } else if (densityPct > 65) {
      dominantConstraint = "Cabinet density concentration";
    }

    let interpretation = "";
    if (status === "RISK") {
      interpretation =
        "The UPS room plan is crowding usable deployment margin too tightly. Even if the cabinet count fits numerically, service clearances and future battery or UPS changes will become the first practical limitation.";
    } else if (status === "WATCH") {
      interpretation =
        "The UPS room sizing is workable, but reserve is tightening. The current cabinet plan may fit, although service access and growth margin are being consumed faster than the raw room total suggests.";
    } else {
      interpretation =
        "The UPS room sizing remains inside a manageable planning envelope. Cabinet footprint, clearance allowance, and reserve still leave useful room before space becomes the first infrastructure limiter.";
    }

    let guidance = "";
    if (status === "HEALTHY") {
      guidance =
        "Maintain this room baseline, but keep battery growth, service clearances, and replacement access explicit in the final layout. The next pressure increase will usually appear in reserve consumption before total room size looks obviously undersized.";
    } else if (status === "WATCH") {
      guidance =
        "Validate maintenance access, battery replacement path, and future cabinet growth before locking the room size. Watch what tightens first: clearances, reserve area, or cabinet density.";
    } else {
      guidance =
        `Rework the UPS room plan. The primary limiter is ${dominantConstraint.toLowerCase()}, not just total cabinet count. Increase room area, raise clearance allowance, or preserve more reserve before finalizing deployment.`;
    }

    const summaryRows = [
      { label: "Total Cabinets", value: `${totalCab}` },
      { label: "Base Equipment Area", value: `${baseArea.toFixed(0)} sq ft` },
      { label: "Clearance Factor", value: `${factor.toFixed(1)}×` },
      { label: "Estimated Room Size", value: `${finalArea.toFixed(0)} sq ft` },
      { label: "Layout Density", value: density }
    ];

    const derivedRows = [
      { label: "Clearance / Service Area", value: `${clearanceArea.toFixed(0)} sq ft` },
      { label: "Cabinet Density", value: `${densityPct.toFixed(1)} %` },
      { label: "Reserve Area", value: `${reservePct.toFixed(1)} %` },
      { label: "Primary Constraint", value: dominantConstraint }
    ];

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      summaryRows,
      derivedRows,
      status,
      interpretation,
      dominantConstraint,
      guidance,
      chart: null
    });

    ScopedLabsAnalyzer.writeFlow(FLOW_KEY, {
      category: "infrastructure",
      step: "ups-room-sizing",
      data: {
        totalCab,
        baseArea,
        finalArea,
        density,
        status
      }
    });

    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continue);
    hasResult = true;
  }

  function reset() {
    els.ups.value = 2;
    els.batt.value = 4;
    els.areaEach.value = 20;
    els.factor.value = 1.5;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["ups", "batt", "areaEach", "factor"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/infrastructure/generator-runtime/";
  });

  refreshFlowNote();
  invalidate();
})();

