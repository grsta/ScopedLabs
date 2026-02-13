// Failure Days Lost estimator
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

  function overwriteFactor(mode) {
    // how quickly the system "eats" retention when recording resumes
    if (mode === "fast") return 1.25;
    if (mode === "slow") return 0.85;
    return 1.0;
  }

  function calc() {
    const retentionDays = Math.max(0, n("retentionDays"));
    const gapHours = Math.max(0, n("gapHours"));
    const restoreHours = Math.max(0, n("restoreHours"));
    const overwrite = $("overwrite").value;

    if (retentionDays <= 0) {
      render([{ label: "Error", value: "Enter Total Retention (days) > 0" }]);
      return;
    }

    const totalDownHours = gapHours + restoreHours;

    // direct loss: the actual gap is unrecorded time
    const gapDays = gapHours / 24;

    // indirect loss: when recording resumes, higher bitrate/motion overwrites faster
    // Simple model: effective retention shrinks by overwrite factor during the recovery window
    const effRetention = retentionDays / overwriteFactor(overwrite);

    // how much of the retention window is "consumed" while down (time keeps moving)
    const downDays = totalDownHours / 24;

    // Remaining usable retention after outage window passes
    const remaining = Math.max(0, effRetention - downDays);

    // total days “missing coverage” in a retention window sense:
    // - gap itself is missing
    // - plus the loss of retention window due to time + overwrite factor
    const lossFromRetention = Math.max(0, retentionDays - remaining);
    const totalLostDays = lossFromRetention; // already includes time passing

    let severity = "LOW";
    if (totalLostDays >= 7) severity = "HIGH";
    else if (totalLostDays >= 2) severity = "MEDIUM";

    render([
      { label: "Retention (configured)", value: `${retentionDays.toFixed(1)} days` },
      { label: "Downtime Window", value: `${totalDownHours.toFixed(1)} hours (${downDays.toFixed(2)} days)` },
      { label: "Recording Gap", value: `${gapHours.toFixed(1)} hours (${gapDays.toFixed(2)} days unrecorded)` },
      { label: "Overwrite Risk", value: overwrite.toUpperCase() },

      { label: "Estimated Effective Retention", value: `${effRetention.toFixed(1)} days` },
      { label: "Estimated Retention Remaining", value: `${remaining.toFixed(1)} days` },
      { label: "Estimated Days Lost", value: `${totalLostDays.toFixed(2)} days` },
      { label: "Risk Level", value: severity },

      { label: "Notes", value: "This is a planning estimate. Real impact depends on bitrate/motion and whether storage rebuild/reindex delays recording." }
    ]);
  }

  function reset() {
    $("retentionDays").value = 30;
    $("gapHours").value = 8;
    $("restoreHours").value = 4;
    $("overwrite").value = "normal";
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
