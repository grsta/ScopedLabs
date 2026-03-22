(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "heat-load-estimator";
  const NEXT_URL = "/tools/thermal/psu-efficiency-heat/";
  const W_TO_BTU = 3.412141633;

  const $ = (id) => document.getElementById(id);

  const els = {
    w: $("w"),
    qty: $("qty"),
    util: $("util"),
    m: $("m"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  function resultRow(label, value) {
    return `
      <div class="result-row">
        <div class="result-label">${label}</div>
        <div class="result-value">${value}</div>
      </div>
    `;
  }

  function hideContinue() {
    els.continueWrap.style.display = "none";
    els.continueBtn.disabled = true;
  }

  function showContinue() {
    els.continueWrap.style.display = "";
    els.continueBtn.disabled = false;
  }

  function clearStored() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function invalidate() {
    clearStored();
    hideContinue();
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  function loadPrior() {
    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";
  }

  function calculate() {
    const w = parseFloat(els.w.value);
    const qty = parseFloat(els.qty.value);
    const utilPct = parseFloat(els.util.value);
    const marginPct = parseFloat(els.m.value);

    if (!Number.isFinite(w) || !Number.isFinite(qty) || !Number.isFinite(utilPct) || !Number.isFinite(marginPct)) {
      els.results.innerHTML = resultRow("Status", "Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const util = utilPct / 100;
    const margin = marginPct / 100;

    const raw = w * qty;
    const avg = raw * util;
    const withMargin = avg * (1 + margin);
    const btu = withMargin * W_TO_BTU;

    let classification = "Moderate thermal load";
    if (withMargin >= 10000) classification = "Very high thermal load";
    else if (withMargin >= 5000) classification = "High thermal load";
    else if (withMargin >= 2000) classification = "Elevated thermal load";

    const interpretation =
      withMargin < 2000
        ? "This is a relatively light thermal load. Small rooms or low-density deployments may handle it without aggressive airflow engineering, but downstream validation still matters."
        : withMargin < 5000
          ? "This is a moderate heat load. Airflow planning and rack layout will start to matter, especially if equipment is concentrated into a small footprint."
          : withMargin < 10000
            ? "This is a high thermal load. Rack density, airflow delivery, and room cooling capacity should all be treated as active design constraints."
            : "This is a very high thermal load. Thermal design is now a primary engineering concern, and airflow plus room cooling must be validated carefully in the next steps.";

    els.results.innerHTML = [
      resultRow("Nameplate Total", `${raw.toFixed(0)} W`),
      resultRow("Avg @ Utilization", `${avg.toFixed(0)} W`),
      resultRow("With Safety Margin", `${withMargin.toFixed(0)} W`),
      resultRow("Heat Load", `${btu.toFixed(0)} BTU/hr`),
      resultRow("Status", classification),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        devicePowerW: Number(w.toFixed(0)),
        quantity: Number(qty.toFixed(0)),
        utilizationPct: Number(utilPct.toFixed(0)),
        safetyMarginPct: Number(marginPct.toFixed(0)),
        nameplateTotalW: Number(raw.toFixed(0)),
        averageLoadW: Number(avg.toFixed(0)),
        heatLoadW: Number(withMargin.toFixed(0)),
        heatLoadBtuHr: Number(btu.toFixed(0)),
        classification
      }
    }));

    showContinue();
  }

  function reset() {
    els.w.value = 350;
    els.qty.value = 10;
    els.util.value = 70;
    els.m.value = 15;
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation() {
    [els.w, els.qty, els.util, els.m].forEach((el) => {
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