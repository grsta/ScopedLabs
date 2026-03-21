(() => {
  const $ = (id) => document.getElementById(id);

  let hasFreshResult = false;

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

  function hideContinue() {
    const wrap = $("continue-wrap");
    const btn = $("continue");
    if (wrap) wrap.style.display = "none";
    if (btn) btn.disabled = true;
    hasFreshResult = false;
  }

  function showContinue() {
    const wrap = $("continue-wrap");
    const btn = $("continue");
    if (wrap) wrap.style.display = "block";
    if (btn) btn.disabled = false;
    hasFreshResult = true;
  }

  function getInputState() {
    return {
      doorType: $("doorType").value,
      life: $("life").value,
      powerLoss: $("powerLoss").value,
      fire: $("fire").value,
      threat: $("threat").value
    };
  }

  function getDoorTypeLabel(value) {
    const map = {
      interior: "Interior",
      perimeter: "Perimeter / Exterior",
      stairwell: "Stairwell / Exit",
      it: "IT / Critical"
    };
    return map[value] || value;
  }

  function getLifeLabel(value) {
    const map = {
      high: "High",
      med: "Medium",
      low: "Low"
    };
    return map[value] || value;
  }

  function getThreatLabel(value) {
    const map = {
      low: "Low",
      med: "Medium",
      high: "High"
    };
    return map[value] || value;
  }

  function getPowerLabel(value) {
    const map = {
      frequent: "Frequent Issues",
      normal: "Normal",
      rare: "UPS / Generator"
    };
    return map[value] || value;
  }

  function getFireLabel(value) {
    return value === "yes" ? "Yes" : "No";
  }

  function calc() {
    const { doorType, life, powerLoss, fire, threat } = getInputState();

    let score = 0;
    const drivers = [];

    if (doorType === "stairwell") {
      score += 3;
      drivers.push("stairwell/egress use pushes toward fail-safe");
    }
    if (doorType === "interior") {
      score += 1;
      drivers.push("interior opening slightly favors egress flexibility");
    }
    if (doorType === "perimeter") {
      score -= 1;
      drivers.push("perimeter opening increases security pressure");
    }
    if (doorType === "it") {
      score -= 3;
      drivers.push("critical room use strongly favors secure behavior");
    }

    if (life === "high") {
      score += 3;
      drivers.push("life safety priority is high");
    }
    if (life === "med") {
      score += 1;
      drivers.push("life safety still matters");
    }
    if (life === "low") {
      score -= 2;
      drivers.push("security priority outweighs egress bias");
    }

    if (powerLoss === "frequent") {
      score += 2;
      drivers.push("outage risk increases fail-safe pressure");
    }
    if (powerLoss === "rare") {
      score -= 1;
      drivers.push("backup power reduces outage concern");
    }

    if (fire === "yes") {
      score += 1;
      drivers.push("fire integration supports safe release behavior");
    }

    if (threat === "high") {
      score -= 3;
      drivers.push("high threat level pushes toward fail-secure");
    }
    if (threat === "med") {
      score -= 1;
      drivers.push("moderate threat adds security pressure");
    }

    let rec = "";
    let rationale = "";
    let risk = "";
    let hardwareTendency = "";
    let deploymentFit = "";
    let dominantFactor = drivers[0] || "mixed criteria";

    if (score >= 2) {
      rec = "FAIL-SAFE";
      rationale = "Life safety, egress, and outage behavior outweigh the need to stay locked during power loss.";
      risk = "Primary risk is reduced security during outage or release events if the opening is not otherwise supervised.";
      hardwareTendency = "More commonly aligns with maglocks and other release-on-power-loss approaches, subject to code and egress requirements.";
      deploymentFit = "Best fit for interior egress paths, stairwell-related openings, and areas where occupant release behavior matters most.";
    } else if (score <= -2) {
      rec = "FAIL-SECURE";
      rationale = "Security retention during power loss outweighs the convenience of automatic unlock behavior.";
      risk = "Primary risk is creating a bad door behavior choice if free egress, fire release, or backup power strategy are not designed correctly.";
      hardwareTendency = "Often aligns with electric strikes, secure openings, critical rooms, and perimeter-controlled doors.";
      deploymentFit = "Best fit for perimeter openings, critical rooms, restricted spaces, and doors where retained security is the priority.";
    } else {
      rec = "MIXED / CONDITIONAL";
      rationale = "Inputs are balanced enough that code requirements, locking hardware, and operating policy should drive the final decision.";
      risk = "Primary risk is inconsistent door behavior across similar openings, which creates confusion for installers, operators, and users.";
      hardwareTendency = "Hardware choice should follow code path, free egress method, and how the opening is expected to behave on alarm or outage.";
      deploymentFit = "Best fit for review with a standardized door schedule before hardware is finalized.";
    }

    if (life === "high") dominantFactor = "life safety requirements";
    else if (threat === "high") dominantFactor = "security threat level";
    else if (powerLoss === "frequent") dominantFactor = "power outage sensitivity";
    else if (doorType === "stairwell") dominantFactor = "stairwell / egress use";
    else if (doorType === "it") dominantFactor = "critical room protection";

    const guidance = [
      "Verify final behavior against local code, fire/life safety requirements, and AHJ expectations.",
      "Do not assume fail-secure is acceptable unless free egress and fire-release behavior are clearly addressed.",
      "If the door must remain secure during outages, confirm UPS or generator strategy before finalizing hardware.",
      "Keep behavior consistent across similar door types unless there is a documented reason not to."
    ].join(" ");

    render([
      { label: "Recommendation", value: rec },
      { label: "Why", value: rationale },
      { label: "Dominant Factor", value: dominantFactor },
      { label: "Deployment Fit", value: deploymentFit },
      { label: "Hardware Direction", value: hardwareTendency },
      { label: "Primary Risk", value: risk },
      { label: "Guidance", value: guidance },
      { label: "Score", value: String(score) }
    ]);

    const payload = {
      recommendation: rec,
      score,
      dominantFactor,
      doorType,
      doorTypeLabel: getDoorTypeLabel(doorType),
      life,
      lifeLabel: getLifeLabel(life),
      powerLoss,
      powerLossLabel: getPowerLabel(powerLoss),
      fire,
      fireLabel: getFireLabel(fire),
      threat,
      threatLabel: getThreatLabel(threat)
    };

    sessionStorage.setItem("ac_fail_mode", rec);
    sessionStorage.setItem("ac_fail_score", String(score));
    sessionStorage.setItem("ac_fail_payload", JSON.stringify(payload));

    showContinue();
  }

  function reset() {
    $("doorType").value = "interior";
    $("life").value = "high";
    $("powerLoss").value = "normal";
    $("fire").value = "yes";
    $("threat").value = "low";

    $("results").innerHTML = `<div class="muted">Run the evaluation to see results.</div>`;

    sessionStorage.removeItem("ac_fail_mode");
    sessionStorage.removeItem("ac_fail_score");
    sessionStorage.removeItem("ac_fail_payload");

    hideContinue();
  }

  function markStale() {
    if (!hasFreshResult) return;
    hideContinue();
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  ["doorType", "life", "powerLoss", "fire", "threat"].forEach((id) => {
    const el = $(id);
    if (el) {
      el.addEventListener("change", markStale);
      el.addEventListener("input", markStale);
    }
  });

  $("continue").addEventListener("click", () => {
    if (!hasFreshResult) return;
    window.location.href = "/tools/access-control/reader-type-selector/";
  });

  reset();
})();
