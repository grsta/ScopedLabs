(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";

  const els = {
    doorType: $("doorType"),
    life: $("life"),
    powerLoss: $("powerLoss"),
    fire: $("fire"),
    threat: $("threat"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    nextRow: $("continue-wrap"),
    nextBtn: $("continue"),
  };

  function showContinue() {
    if (els.nextRow) els.nextRow.style.display = "block";
    if (els.nextBtn) els.nextBtn.disabled = false;
  }

  function hideContinue() {
    if (els.nextRow) els.nextRow.style.display = "none";
    if (els.nextBtn) els.nextBtn.disabled = true;
  }

  function render(rows) {
    if (!els.results) return;
    els.results.innerHTML = "";

    rows.forEach((r) => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      els.results.appendChild(div);
    });
  }

  function readValue(el) {
    return el ? String(el.value).trim() : "";
  }

  function getDoorTypeLabel(value) {
    return {
      interior: "Interior",
      perimeter: "Perimeter / Exterior",
      stairwell: "Stairwell / Exit",
      it: "IT / Critical"
    }[value] || value;
  }

  function getLifeLabel(value) {
    return {
      high: "High",
      med: "Medium",
      low: "Low"
    }[value] || value;
  }

  function getThreatLabel(value) {
    return {
      low: "Low",
      med: "Medium",
      high: "High"
    }[value] || value;
  }

  function getPowerLabel(value) {
    return {
      frequent: "Frequent Issues",
      normal: "Normal",
      rare: "UPS / Generator"
    }[value] || value;
  }

  function getFireLabel(value) {
    return value === "yes" ? "Yes" : "No";
  }

  function savePipelineResult(payload) {
    try {
      const wrapped = {
        category: "access-control",
        step: "fail-safe-fail-secure",
        ts: Date.now(),
        data: payload,
      };
      sessionStorage.setItem(FLOW_KEY, JSON.stringify(wrapped));
    } catch (err) {
      console.warn("Could not save pipeline payload:", err);
    }
  }

  function invalidatePipelineResult() {
    try {
      const raw = sessionStorage.getItem(FLOW_KEY);
      if (!raw) {
        hideContinue();
        return;
      }

      const parsed = JSON.parse(raw);
      if (
        parsed &&
        parsed.category === "access-control" &&
        parsed.step === "fail-safe-fail-secure"
      ) {
        sessionStorage.removeItem(FLOW_KEY);
      }
    } catch (err) {
      console.warn("Could not invalidate pipeline payload:", err);
    }

    hideContinue();
  }

  function clearResults() {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">Run the evaluation to see results.</div>`;
    }
    hideContinue();
  }

  function calculate() {
    const doorType = readValue(els.doorType);
    const life = readValue(els.life);
    const powerLoss = readValue(els.powerLoss);
    const fire = readValue(els.fire);
    const threat = readValue(els.threat);

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

    let recommendation = "";
    let rationale = "";
    let primaryRisk = "";
    let hardwareDirection = "";
    let deploymentFit = "";
    let dominantFactor = "Mixed criteria";

    if (score >= 2) {
      recommendation = "FAIL-SAFE";
      rationale = "Life safety, egress behavior, and outage conditions outweigh the need to remain locked on power loss.";
      primaryRisk = "Security exposure during outage or release events if the opening is not otherwise supervised.";
      hardwareDirection = "Usually aligns more naturally with release-on-power-loss behavior and openings where safe release is the priority.";
      deploymentFit = "Best fit for interior egress paths, stairwell-related openings, and spaces where occupant release matters most.";
    } else if (score <= -2) {
      recommendation = "FAIL-SECURE";
      rationale = "Retaining security during power loss outweighs the convenience of automatic unlock behavior.";
      primaryRisk = "Improper egress or bad fire behavior if the opening is not designed correctly around code and release requirements.";
      hardwareDirection = "Often aligns with perimeter openings, critical rooms, and doors where retained security matters most.";
      deploymentFit = "Best fit for restricted spaces, perimeter doors, and critical rooms where staying secure is the priority.";
    } else {
      recommendation = "MIXED / CONDITIONAL";
      rationale = "Inputs are balanced enough that code path, locking hardware, and operating policy should determine the final choice.";
      primaryRisk = "Inconsistent door behavior across similar openings if standards are not set early.";
      hardwareDirection = "Final hardware choice should follow code, free egress method, and alarm/outage behavior.";
      deploymentFit = "Best fit for review against a standardized door schedule before hardware is finalized.";
    }

    if (life === "high") dominantFactor = "Life safety requirements";
    else if (threat === "high") dominantFactor = "Security threat level";
    else if (powerLoss === "frequent") dominantFactor = "Power outage sensitivity";
    else if (doorType === "stairwell") dominantFactor = "Stairwell / egress use";
    else if (doorType === "it") dominantFactor = "Critical room protection";

    const guidance = [
      "Verify final behavior against local code, fire/life safety requirements, and AHJ expectations.",
      "Do not assume fail-secure is acceptable unless free egress and fire-release behavior are clearly addressed.",
      "If the opening must remain secure during outages, confirm UPS or generator strategy before finalizing hardware.",
      "Keep behavior consistent across similar door types unless there is a documented reason not to."
    ].join(" ");

    render([
      { label: "Recommendation", value: recommendation },
      { label: "Why", value: rationale },
      { label: "Dominant Factor", value: dominantFactor },
      { label: "Deployment Fit", value: deploymentFit },
      { label: "Hardware Direction", value: hardwareDirection },
      { label: "Primary Risk", value: primaryRisk },
      { label: "Guidance", value: guidance },
      { label: "Score", value: String(score) }
    ]);

    savePipelineResult({
      source: "Fail-Safe / Fail-Secure",
      recommendation,
      score,
      dominantFactor,
      deploymentFit,
      hardwareDirection,
      primaryRisk,
      doorType,
      doorTypeLabel: getDoorTypeLabel(doorType),
      life,
      lifeLabel: getLifeLabel(life),
      powerLoss,
      powerLossLabel: getPowerLabel(powerLoss),
      fire,
      fireLabel: getFireLabel(fire),
      threat,
      threatLabel: getThreatLabel(threat),
    });

    showContinue();
  }

  function resetAll() {
    if (els.doorType) els.doorType.value = "interior";
    if (els.life) els.life.value = "high";
    if (els.powerLoss) els.powerLoss.value = "normal";
    if (els.fire) els.fire.value = "yes";
    if (els.threat) els.threat.value = "low";

    clearResults();
    invalidatePipelineResult();
  }

  if (els.calc) els.calc.addEventListener("click", calculate);
  if (els.reset) els.reset.addEventListener("click", resetAll);

  [els.doorType, els.life, els.powerLoss, els.fire, els.threat].forEach((el) => {
    if (!el) return;

    el.addEventListener("input", invalidatePipelineResult);
    el.addEventListener("change", invalidatePipelineResult);

    el.addEventListener("keydown", (e) => {
      if (e.key === "Enter") calculate();
    });
  });

  if (els.nextBtn) {
    els.nextBtn.addEventListener("click", () => {
      window.location.href = "/tools/access-control/reader-type-selector/";
    });
  }

  clearResults();
})();
