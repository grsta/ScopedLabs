// Anti-Passback Zones planner (rule-of-thumb)
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

  function calc() {
    const entrances = Math.max(0, n("entrances"));
    const interior = Math.max(0, n("interiorAreas"));
    const floors = Math.max(1, n("floors"));
    const strategy = $("strategy").value; // minimal|balanced|strict
    const type = $("type").value;         // soft|hard

    // Baseline: one perimeter zone for "outside" and one "inside".
    // Most systems model APB as (outside <-> inside) plus optional interior zones.
    let zones = 2;

    // Add interior zones depending on strategy
    if (strategy === "balanced") {
      zones += Math.round(interior * 0.6); // only key interiors
      zones += floors > 1 ? Math.round((floors - 1) * 0.5) : 0;
    } else if (strategy === "strict") {
      zones += interior;                   // each interior area
      zones += (floors - 1);               // add per-floor segmentation
    }

    zones = Math.max(2, zones);

    // Doors that should be paired (IN/OUT readers)
    // perimeter: entrances typically need both directions if enforcing strict APB
    const pairingFactor = type === "hard" ? 1.0 : 0.6;
    const pairedEntrances = Math.round(entrances * pairingFactor);

    // Hygiene guidance
    const tips = [];
    tips.push("Start with perimeter APB only unless you have a specific threat model (tailgating, shared badges).");
    tips.push("Hard APB requires reliable IN/OUT reads; avoid it on doors with frequent piggybacking or missed reads.");
    tips.push("Use anti-passback exemptions for reception/visitor workflows and emergency egress.");
    tips.push("If strict: ensure every transition between zones has controlled readers in both directions.");

    const note =
      type === "hard"
        ? "Hard APB is enforcement-heavy: missed reads cause lockouts. Plan exemptions and monitoring."
        : "Soft APB is usually safer operationally: logs anomalies without disrupting people flow.";

    render([
      { label: "Recommended Zones", value: `${zones}` },
      { label: "APB Type", value: type.toUpperCase() },
      { label: "Strategy", value: strategy.toUpperCase() },
      { label: "Entrances (perimeter)", value: `${entrances}` },
      { label: "Interior Areas", value: `${interior}` },
      { label: "Floors", value: `${floors}` },
      { label: "Suggested Paired Entrances (IN/OUT)", value: `${pairedEntrances}` },
      { label: "Notes", value: note },
      { label: "Best Practices", value: tips.join(" ") }
    ]);
  }

  function reset() {
    $("entrances").value = 6;
    $("interiorAreas").value = 4;
    $("floors").value = 2;
    $("strategy").value = "minimal";
    $("type").value = "soft";
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
