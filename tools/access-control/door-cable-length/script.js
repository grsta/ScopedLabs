// Door Cable Length Estimator
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
    rows.forEach((r) => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      el.appendChild(div);
    });
  }

  function setCableEnabledFromRuns() {
    const isMulti = $("runs").value === "multi";
    $("cables").disabled = !isMulti;

    // Optional: if switching to single, keep the value sane (doesn't matter in calc anyway)
    if (!isMulti) $("cables").value = 1;
  }

  function calc() {
    const distance = Math.max(0, n("distance"));
    const routing = parseFloat($("routing").value);
    const slack = Math.max(0, n("slack"));
    const doors = Math.max(1, n("doors"));
    const runs = $("runs").value; // single|multi
    const cables = Math.max(1, Math.floor(n("cables")));

    const routed = distance * (Number.isFinite(routing) ? routing : 1.3);
    const perDoorSingle = routed + slack;

    const perDoorTotal = runs === "multi" ? perDoorSingle * cables : perDoorSingle;
    const totalAllDoors = perDoorTotal * doors;

    const note =
      runs === "multi"
        ? "Multiple cable estimate assumes each cable follows the same routed path. Adjust if you home-run some devices differently."
        : "Single cable estimate assumes a combined/structured cable where practical.";

    render([
      { label: "Routed Distance (per door)", value: `${routed.toFixed(1)} ft` },
      { label: "Slack / Service Loop", value: `${slack.toFixed(1)} ft` },
      { label: "Estimated Run (single cable)", value: `${perDoorSingle.toFixed(1)} ft` },

      { label: "Separate Runs", value: runs === "multi" ? `YES (${cables} cables)` : "NO" },
      { label: "Estimated Total per Door", value: `${perDoorTotal.toFixed(1)} ft` },
      { label: "Door Count", value: `${doors}` },
      { label: "Estimated Total Cable", value: `${totalAllDoors.toFixed(1)} ft` },

      { label: "Notes", value: note }
    ]);
  }

  function reset() {
    $("distance").value = 120;
    $("routing").value = "1.30";
    $("slack").value = 15;
    $("doors").value = 8;
    $("runs").value = "single";
    $("cables").value = 4;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;

    // IMPORTANT: apply enabled/disabled state based on current runs value
    setCableEnabledFromRuns();
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  // Keep the field relevant and consistent whenever runs changes
  $("runs").addEventListener("change", () => {
    setCableEnabledFromRuns();
  });

  reset();
})();
