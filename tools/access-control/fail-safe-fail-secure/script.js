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

    let score = 0;

    if (doorType === "stairwell") score += 3;
    if (doorType === "interior") score += 1;
    if (doorType === "perimeter") score -= 1;
    if (doorType === "it") score -= 3;

    if (life === "high") score += 3;
    if (life === "med") score += 1;
    if (life === "low") score -= 2;

    if (powerLoss === "frequent") score += 2;
    if (powerLoss === "rare") score -= 1;

    if (fire === "yes") score += 1;

    if (threat === "high") score -= 3;
    if (threat === "med") score -= 1;

    let rec, rationale, risk;

    if (score >= 2) {
      rec = "FAIL-SAFE";
      rationale = "Life safety and egress requirements dominate. Door should unlock on power loss.";
      risk = "Security exposure during outages.";
    } else if (score <= -2) {
      rec = "FAIL-SECURE";
      rationale = "Security priority dominates. Door should remain locked on power loss.";
      risk = "Potential lock-in risk if egress is not properly designed.";
    } else {
      rec = "MIXED / CONDITIONAL";
      rationale = "Competing priorities. Final decision depends on code requirements and system design.";
      risk = "Design inconsistency if not standardized across openings.";
    }

    const guidance = `
      Always verify with local code and AHJ.
      Ensure mechanical egress is always available.
      Consider fire alarm release requirements.
      Plan UPS if using fail-secure on critical doors.
    `;

    render([
      { label: "Recommendation", value: rec },
      { label: "Why", value: rationale },
      { label: "Primary Risk", value: risk },
      { label: "Guidance", value: guidance },
      { label: "Score", value: score }
    ]);

    // SAVE FOR PIPELINE
    sessionStorage.setItem("ac_fail_mode", rec);

    // ENABLE CONTINUE
    $("continue-wrap").style.display = "block";
  }

  function reset() {
    $("results").innerHTML = `<div class="muted">Run the evaluation to see results.</div>`;
    $("continue-wrap").style.display = "none";
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  // CONTINUE BUTTON
  $("continue").addEventListener("click", () => {
    window.location.href = "/tools/access-control/reader-type-selector/";
  });

})();
