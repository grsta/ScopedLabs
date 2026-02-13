(() => {
  // --- helpers ---
  const $ = (sel) => document.querySelector(sel);

  // Try multiple possible selectors (so template variations don't break JS)
  const pick = (...selectors) => {
    for (const s of selectors) {
      const el = $(s);
      if (el) return el;
    }
    return null;
  };

  const toNum = (el) => {
    if (!el) return NaN;
    const v = parseFloat(el.value);
    return Number.isFinite(v) ? v : NaN;
  };

  // module-scope refs
  let resultsEl = null;
  let init = null; // stores initial input values for reset

  const renderError = (msg) => {
    if (!resultsEl) return;
    resultsEl.innerHTML = `<div class="result-error">${escapeHtml(msg)}</div>`;
  };

  const renderHint = (msg) => {
    if (!resultsEl) return;
    resultsEl.innerHTML = `<div class="result-hint">${escapeHtml(msg)}</div>`;
  };

  const escapeHtml = (s) =>
    String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const renderResultsList = ({
    whNeeded,
    whAfterEfficiency,
    requiredWh,
    requiredAh,
    voltage,
  }) => {
    if (!resultsEl) return;

    // Real HTML list so it never collapses into a "sentence"
    resultsEl.innerHTML = `
      <ul class="result-list">
        <li><strong>Watt-hours needed (load):</strong> ${whNeeded.toFixed(1)} Wh</li>
        <li><strong>After efficiency loss:</strong> ${whAfterEfficiency.toFixed(1)} Wh</li>
        <li><strong>After DoD limit:</strong> ${requiredWh.toFixed(1)} Wh</li>
        <li><strong>Battery Bank Size:</strong> ${requiredAh.toFixed(1)} Ah @ ${Number(voltage).toFixed(0)}V</li>
      </ul>
    `;
  };

  const boot = () => {
    // Buttons
    const calcBtn = pick("#calculate", "#calc", "#btn-calc", "button[data-action='calc']");
    const resetBtn = pick("#reset", "#btn-reset", "button[data-action='reset']");

    // Results container (your page currently shows a single wrapped sentence here)
    resultsEl = pick("#results", "#result", "#output", "#resultsBox", ".results");

    // Inputs (support common naming variants)
    const loadEl = pick("#load", "#watts", "#loadWatts", "input[name='load']", "input[name='watts']");
    const runtimeEl = pick("#runtime", "#hours", "#runtimeHours", "input[name='runtime']", "input[name='hours']");
    const voltageEl = pick("#voltage", "#v", "#systemVoltage", "input[name='voltage']");
    const dodEl = pick("#dod", "#depth", "#depthOfDischarge", "input[name='dod']");
    const effEl = pick("#efficiency", "#eff", "#systemEfficiency", "input[name='efficiency']");

    // Hard diagnostics (so we stop “beating a dead horse”)
    if (!resultsEl) console.error("Battery Bank Sizer: results element not found (#results/#result/#output/#resultsBox/.results)");
    if (!calcBtn) console.error("Battery Bank Sizer: Calculate button not found (#calculate/#calc/#btn-calc/[data-action='calc'])");
    if (!resetBtn) console.warn("Battery Bank Sizer: Reset button not found (#reset/#btn-reset/[data-action='reset'])");

    // Capture initial values so Reset returns to defaults (not blanks)
    init = {
      load: loadEl ? loadEl.value : "",
      hours: runtimeEl ? runtimeEl.value : "",
      voltage: voltageEl ? voltageEl.value : "",
      dod: dodEl ? dodEl.value : "",
      eff: effEl ? effEl.value : "",
    };

    const doCalc = () => {
      const load = toNum(loadEl);
      const hours = toNum(runtimeEl);
      const voltage = toNum(voltageEl);
      const dod = toNum(dodEl);
      const eff = toNum(effEl);

      if ([load, hours, voltage, dod, eff].some((n) => !Number.isFinite(n))) {
        return renderError("Please enter valid numbers in all fields.");
      }
      if (voltage <= 0) return renderError("System Voltage must be > 0.");
      if (dod <= 0 || dod > 100) return renderError("Max Depth of Discharge must be between 1 and 100.");
      if (eff <= 0 || eff > 100) return renderError("System Efficiency must be between 1 and 100.");

      const whNeeded = load * hours;
      const effFactor = eff / 100;
      const whAfterEfficiency = whNeeded / effFactor;
      const dodFactor = dod / 100;
      const requiredWh = whAfterEfficiency / dodFactor;
      const requiredAh = requiredWh / voltage;

      renderResultsList({ whNeeded, whAfterEfficiency, requiredWh, requiredAh, voltage });
    };

    const doReset = () => {
      if (loadEl) loadEl.value = init.load;
      if (runtimeEl) runtimeEl.value = init.hours;
      if (voltageEl) voltageEl.value = init.voltage;
      if (dodEl) dodEl.value = init.dod;
      if (effEl) effEl.value = init.eff;

      renderHint("Enter your inputs and press Calculate.");
    };

    if (calcBtn) calcBtn.addEventListener("click", doCalc);
    if (resetBtn) resetBtn.addEventListener("click", doReset);

    // initial hint
    if (resultsEl) renderHint("Enter your inputs and press Calculate.");
    console.log("Battery Bank Sizer: JS booted ✅");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
