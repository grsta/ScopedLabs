// Door Count Planner (rule-of-thumb)
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

  function compFactor(c) {
    if (c === "moderate") return 1.15;
    if (c === "strict") return 1.35;
    return 1.0;
  }

  function calc() {
    const perimeter = Math.max(0, n("perimeter"));
    const zones = Math.max(0, n("zones"));
    const highsec = Math.max(0, n("highsec"));
    const compliance = $("compliance").value; // basic|moderate|strict
    const bothSides = $("bothSides").value;   // no|yes

    // Perimeter: usually 1 controlled door per entrance (some orgs only control after-hours).
    const perimeterDoors = perimeter;

    // Interior zones: rule-of-thumb 1–3 controlled doors per zone, based on compliance.
    const zoneBase = zones * 1.6 * compFactor(compliance);

    // High security: generally additional controls: mantrap/vestibule/secondary door
    const highsecAdd = highsec * (compliance === "strict" ? 2.0 : 1.3);

    // Total controlled doors (rounded)
    let doors = Math.round(perimeterDoors + zoneBase + highsecAdd);
    doors = Math.max(0, doors);

    // If controlling both sides / in-out, the reader count doubles-ish, not doors.
    const readerMultiplier = bothSides === "yes" ? 2 : 1;
    const readers = doors * readerMultiplier;

    // Suggest a range
    const low = Math.max(0, Math.round(doors * 0.8));
    const high = Math.max(0, Math.round(doors * 1.2));

    const tips = [
      "Start by controlling perimeter entrances + server/IT + sensitive storage areas.",
      "Add interior segmentation where policy requires least privilege.",
      "Remember: door hardware type (mag/strike/mortise) affects cabling and power budgeting.",
      "If you need anti-passback or occupancy: plan IN/OUT reads (reader multiplier grows quickly)."
    ].join(" ");

    render([
      { label: "Perimeter Doors (estimate)", value: `${perimeterDoors.toFixed(0)}` },
      { label: "Interior Zone Doors (estimate)", value: `${Math.round(zoneBase)}` },
      { label: "High-Security Additions", value: `${Math.round(highsecAdd)}` },

      { label: "Estimated Controlled Doors", value: `${doors}` },
      { label: "Suggested Range", value: `${low} – ${high}` },

      { label: "Control Both Sides", value: bothSides === "yes" ? "YES" : "NO" },
      { label: "Estimated Reader Count", value: `${readers}` },

      { label: "Notes", value: "This is a planning estimate. Validate with a floor plan walk and policy requirements." },
      { label: "Best Practices", value: tips }
    ]);
  }

  function reset() {
    $("perimeter").value = 8;
    $("zones").value = 6;
    $("highsec").value = 2;
    $("compliance").value = "basic";
    $("bothSides").value = "no";
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
