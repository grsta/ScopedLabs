// Lock Power Budget Calculator
(() => {
  const $ = (id) => document.getElementById(id);

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
  }

  function render(rows) {
    const el = $("results");
    el.innerHTML = "";
    rows.forEach(r => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      el.appendChild(div);
    });
  }

  function suggestedAmps(lockType, voltage) {
    // loose defaults (installer-friendly)
    // NOTE: actual draw varies by make/model; user can override via input.
    if (lockType === "mag") return voltage === 24 ? 0.25 : 0.50;
    if (lockType === "mortise") return voltage === 24 ? 0.25 : 0.40;
    if (lockType === "bolt") return voltage === 24 ? 0.20 : 0.35;
    return voltage === 24 ? 0.18 : 0.35; // strike
  }

  function calc() {
    const lockType = $("lockType").value;
    const voltage = parseInt($("voltage").value, 10);
    const amps = Math.max(0, n("amps"));
    const locks = Math.max(1, Math.floor(n("locks")));
    const simul = Math.max(1, Math.floor(n("simul")));
    const headroom = Math.max(0, n("headroom"));

    const peakLocks = Math.min(locks, simul);
    const peakAmps = peakLocks * amps;

    const reqAmps = peakAmps * (1 + headroom / 100);
    const watts = reqAmps * voltage;

    const note =
      "Budget for peak simultaneous unlocks. If maglocks are normally energized, include continuous draw separately.";

    render([
      { label: "Voltage", value: `${voltage} VDC` },
      { label: "Lock Type", value: lockType.toUpperCase() },
      { label: "Current per Lock", value: `${amps.toFixed(2)} A` },

      { label: "Total Locks", value: `${locks}` },
      { label: "Peak Simultaneous", value: `${peakLocks}` },

      { label: "Peak Load (no headroom)", value: `${peakAmps.toFixed(2)} A` },
      { label: "Headroom", value: `${headroom.toFixed(0)} %` },

      { label: "Required Supply (est.)", value: `${reqAmps.toFixed(2)} A` },
      { label: "Equivalent Power", value: `${watts.toFixed(1)} W` },

      { label: "Notes", value: note }
    ]);
  }

  function reset() {
    $("lockType").value = "strike";
    $("voltage").value = "12";
    $("amps").value = 0.35;
    $("locks").value = 8;
    $("simul").value = 2;
    $("headroom").value = 25;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  // Convenience: update suggested amps when lock type/voltage changes
  function applySuggested() {
    const lockType = $("lockType").value;
    const voltage = parseInt($("voltage").value, 10);
    const suggested = suggestedAmps(lockType, voltage);
    // Only overwrite if current is 0 or matches old suggestion-ish
    // Keep it simple: always set to suggestion on change.
    $("amps").value = suggested.toFixed(2);
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  $("lockType").addEventListener("change", applySuggested);
  $("voltage").addEventListener("change", applySuggested);

  reset();
})();
