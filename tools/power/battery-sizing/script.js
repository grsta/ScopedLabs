(() => {
  const $ = (id) => document.getElementById(id);

  function toNum(el) {
    const v = parseFloat(el?.value);
    return Number.isFinite(v) ? v : NaN;
  }

  function render(msg) {
    const r = $("results");
    if (!r) return;
    r.innerHTML = msg;
  }

  function calc() {
    const voltage = parseFloat($("voltage").value);
    const watts = toNum($("watts"));
    const amps = toNum($("amps"));
    const hours = toNum($("hours"));
    const effPct = toNum($("eff"));

    if (!Number.isFinite(voltage) || voltage <= 0)
      return render("⚠ Enter system voltage.");

    if (!Number.isFinite(hours) || hours <= 0)
      return render("⚠ Enter runtime hours.");

    if (!Number.isFinite(effPct) || effPct <= 0)
      return render("⚠ Enter efficiency percent.");

    let loadWatts = watts;

    if (!Number.isFinite(loadWatts) && Number.isFinite(amps)) {
      loadWatts = voltage * amps;
    }

    if (!Number.isFinite(loadWatts) || loadWatts <= 0)
      return render("⚠ Enter either Load Watts or Load Amps.");

    const eff = effPct / 100;

    // Wh required
    const requiredWh = (loadWatts * hours) / eff;

    // Convert to Ah
    const requiredAh = requiredWh / voltage;

    render(`
      <ul class="result-list">
        <li><strong>Load Power:</strong> ${loadWatts.toFixed(1)} W</li>
        <li><strong>Runtime:</strong> ${hours.toFixed(2)} hours</li>
        <li><strong>System Voltage:</strong> ${voltage} V</li>
        <li><strong>Efficiency Used:</strong> ${(effPct).toFixed(0)} %</li>
        <li><strong>Required Capacity:</strong> ${requiredWh.toFixed(0)} Wh</li>
        <li><strong>Estimated Battery Size:</strong> ${requiredAh.toFixed(1)} Ah</li>
      </ul>
    `);
  }

  function reset() {
    ["watts","amps","hours","eff"].forEach(id => {
      const el = $(id);
      if (el) el.value = "";
    });
    render("Enter values and press Calculate.");
  }

  function boot() {
    const calcBtn = $("calc");
    const resetBtn = $("reset");

    if (!calcBtn) return;

    calcBtn.addEventListener("click", calc);
    if (resetBtn) resetBtn.addEventListener("click", reset);

    console.log("Battery Sizing loaded ✅");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();

