(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    amps: $("amps"),
    mat: $("mat"),
    res: $("res"),
    results: $("results"),
    analysisCopy: $("analysis-copy"),
    calc: $("calc"),
    reset: $("reset")
  };

  function sizeFromAmps(amps, mat) {
    if (mat === "cu") {
      if (amps <= 60) return "10 AWG";
      if (amps <= 100) return "8 AWG";
      if (amps <= 200) return "6 AWG";
      if (amps <= 400) return "4 AWG";
      return "2 AWG or larger";
    }

    if (amps <= 60) return "8 AWG Al";
    if (amps <= 100) return "6 AWG Al";
    if (amps <= 200) return "4 AWG Al";
    if (amps <= 400) return "2 AWG Al";
    return "1/0 Al or larger";
  }

  function invalidate() {
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  function calc() {
    const amps = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.amps.value, 0));
    const mat = els.mat.value;
    const res = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.res.value, 5));

    const size = sizeFromAmps(amps, mat);

    const currentPressure = ScopedLabsAnalyzer.clamp((amps / 400) * 100, 0, 180);
    const resistanceStress = res <= 2 ? 90 : res <= 5 ? 65 : res <= 10 ? 45 : 30;
    const materialConstraint = mat === "al" ? 65 : 40;

    const metrics = [
      {
        label: "Current Sizing Pressure",
        value: currentPressure,
        displayValue: `${Math.round(currentPressure)}%`
      },
      {
        label: "Resistance Target Stress",
        value: resistanceStress,
        displayValue: `${Math.round(resistanceStress)}%`
      },
      {
        label: "Material Constraint",
        value: materialConstraint,
        displayValue: `${Math.round(materialConstraint)}%`
      }
    ];

    const compositeScore = Math.round(
      (currentPressure * 0.45) +
      (resistanceStress * 0.35) +
      (materialConstraint * 0.20)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let resistanceClass = "Standard grounding target";
    if (res <= 2) resistanceClass = "Aggressive low-resistance target";
    else if (res <= 5) resistanceClass = "Strong commercial target";
    else if (res <= 10) resistanceClass = "Typical grounding target";
    else resistanceClass = "Loose / high-resistance target";

    let dominantConstraint = "Balanced grounding profile";
    if (analyzer.dominant.label === "Current Sizing Pressure") {
      dominantConstraint = "Grounding conductor current scale";
    } else if (analyzer.dominant.label === "Resistance Target Stress") {
      dominantConstraint = "Ground electrode performance target";
    } else if (analyzer.dominant.label === "Material Constraint") {
      dominantConstraint = "Conductor material and installation practicality";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "This grounding objective is no longer a simple conductor-size exercise. Current scale, resistance target, or material choice are pushing the design toward a more engineered grounding solution than a basic rule-of-thumb installation.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The grounding plan is workable, but it is tightening beyond a simple default installation. The conductor may be straightforward to size, although the resistance target or material choice could still drive field complexity.";
    } else {
      interpretation =
        "The grounding profile remains inside a manageable planning envelope. Current, material, and resistance target are aligned well enough for preliminary sizing without immediately forcing a specialized grounding approach.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Use this as a planning baseline, then verify final conductor sizing against NEC or CEC tables and confirm resistance with site testing. The next pressure increase will usually appear in electrode performance before conductor size becomes the hard problem.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate the electrode approach early. Watch what tightens first: conductor installation practicality, resistance target achievement, or the need for multiple rods, rings, or a more deliberate grounding grid.";
    } else {
      guidance =
        `Treat this as an engineered grounding problem, not just a sizing lookup. The primary limiter is ${dominantConstraint.toLowerCase()}, so final design should include code-table verification, site conditions, and likely a stronger electrode strategy.`;
    }

    const summaryRows = [
      { label: "Circuit Current", value: `${amps.toFixed(0)} A` },
      { label: "Material", value: mat === "cu" ? "Copper" : "Aluminum" },
      { label: "Suggested Ground Conductor", value: size },
      { label: "Target Ground Resistance", value: `${res.toFixed(1)} Ω` },
      { label: "Grounding Class", value: resistanceClass }
    ];

    const derivedRows = [
      { label: "Primary Constraint", value: dominantConstraint },
      { label: "Final Design Note", value: "Verify final sizing with NEC/CEC tables and field-test actual resistance." },
      { label: "Electrode Strategy Hint", value: res <= 5 ? "Multiple rods, ring, or enhanced grounding may be needed." : "Standard electrode arrangements may be sufficient depending on soil and code." }
    ];

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      summaryRows,
      derivedRows,
      status: analyzer.status,
      interpretation,
      dominantConstraint,
      guidance,
      chart: null
    });
  }

  function reset() {
    els.amps.value = 60;
    els.mat.value = "cu";
    els.res.value = 5;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["amps", "mat", "res"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  invalidate();
})();
