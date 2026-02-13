// Fail-Safe vs Fail-Secure helper (guidance)
(() => {
  const $ = (id) => document.getElementById(id);

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
    const doorType = $("doorType").value;
    const life = $("life").value;
    const powerLoss = $("powerLoss").value;
    const fire = $("fire").value;
    const threat = $("threat").value;

    // Scoring: positive -> fail-safe, negative -> fail-secure
    let score = 0;

    // Door type tendencies
    if (doorType === "stairwell") score += 3;
    if (doorType === "interior") score += 1;
    if (doorType === "perimeter") score -= 1;
    if (doorType === "it") score -= 3;

    // Life safety
    if (life === "high") score += 3;
    if (life === "med") score += 1;
    if (life === "low") score -= 2;

    // Power loss environment
    if (powerLoss === "frequent") score += 2; // don't lock people in during outages
    if (powerLoss === "rare") score -= 1;     // can afford secure behavior if backed

    // Fire integration: if yes, fail-secure can still unlock on fire, but fail-safe aligns naturally
    if (fire === "yes") score += 1;

    // Threat model
    if (threat === "high") score -= 3;
    if (threat === "med") score -= 1;

    let rec = "FAIL-SAFE";
    let rationale = "Unlocks on power loss. Common for egress paths and many interior doors where life safety is dominant.";
    if (score <= -2) {
      rec = "FAIL-SECURE";
      rationale = "Stays locked on power loss (still allows free mechanical egress if code-compliant). Common for high-security and perimeter control.";
    } else if (score > -2 && score < 2) {
      rec = "DEPENDS (Mixed)";
      rationale = "Inputs point to competing priorities. Choose based on code requirements, risk tolerance, and power backup strategy.";
    }

    const cautions = [
      "Always follow local fire/life safety code and AHJ requirements.",
      "Ensure free egress is maintained (mechanical egress, request-to-exit, and fire unlock where required).",
      "Maglocks typically require fire alarm release + egress sensing; strikes/mortise may behave differently.",
      "If using fail-secure on critical doors, plan UPS/generator to avoid lockout during outages."
    ].join(" ");

    render([
      { label: "Recommendation", value: rec },
      { label: "Why", value: rationale },
      { label: "Score (info)", value: `${score}` },
      { label: "Cautions", value: cautions }
    ]);
  }

  function reset() {
    $("doorType").value = "interior";
    $("life").value = "high";
    $("powerLoss").value = "normal";
    $("fire").value = "yes";
    $("threat").value = "low";
    $("results").innerHTML = `<div class="muted">Enter values and press Evaluate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
