// Access Level Sizing (practical planning estimate)
(() => {
  const $ = (id) => document.getElementById(id);

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
  }

  function clamp(x, lo, hi) {
    return Math.min(hi, Math.max(lo, x));
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

  function complexityFactor(c) {
    if (c === "simple") return 0.85;
    if (c === "complex") return 1.25;
    return 1.0;
  }

  function calc() {
    const roles = Math.max(1, n("roles"));
    const areas = Math.max(1, n("areas"));
    const schedules = Math.max(1, n("schedules"));
    const doorGroups = Math.max(0, n("doorGroups"));
    const complexity = $("complexity").value;

    // Base “matrix” idea:
    // most orgs end up with access levels approximating (role × area) with schedules layered in
    // but door groups + real life exceptions add some overhead.
    const base = roles * areas;

    // schedule adds some, but not multiplicative in real systems (you reuse schedules)
    const scheduleLift = 1 + clamp((schedules - 1) * 0.15, 0, 0.75); // up to +75%

    // door groups add administrative overhead (more combinations)
    const groupLift = 1 + clamp(doorGroups * 0.04, 0, 0.6); // up to +60%

    const raw = base * scheduleLift * groupLift * complexityFactor(complexity);

    // Recommended ranges
    const recommended = Math.max(1, Math.round(raw));
    const low = Math.max(1, Math.round(recommended * 0.75));
    const high = Math.max(1, Math.round(recommended * 1.25));

    // Hygiene guidance
    const tips = [
      "Keep levels role-based (avoid per-user levels).",
      "Use door groups/area groups to reduce combinatorics.",
      "Use schedules as reusable objects (don’t clone per level unless required).",
      "Document exceptions separately (VIP/after-hours contractors) to prevent level sprawl."
    ].join(" ");

    render([
      { label: "Base Matrix (roles × areas)", value: `${base.toFixed(0)}` },
      { label: "Schedule Lift", value: `× ${scheduleLift.toFixed(2)}` },
      { label: "Door Group Lift", value: `× ${groupLift.toFixed(2)}` },
      { label: "Complexity", value: complexity.toUpperCase() },

      { label: "Recommended Access Levels", value: `${recommended}` },
      { label: "Suggested Range", value: `${low} – ${high}` },
      { label: "Notes", value: "Estimate tool. Final count depends on policy exceptions and how aggressively you group doors/areas." },
      { label: "Best Practices", value: tips }
    ]);
  }

  function reset() {
    $("roles").value = 6;
    $("areas").value = 8;
    $("schedules").value = 4;
    $("doorGroups").value = 0;
    $("complexity").value = "normal";
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
