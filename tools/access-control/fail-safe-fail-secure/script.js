(() => {
  "use strict";

  const CATEGORY = "access-control";
  const STEP = "fail-safe-fail-secure";
  const LANE = "v1";

  const FLOW_KEYS = {
    "fail-safe-fail-secure": "scopedlabs:pipeline:access-control:fail-safe-fail-secure",
    "reader-type-selector": "scopedlabs:pipeline:access-control:reader-type-selector",
    "lock-power-budget": "scopedlabs:pipeline:access-control:lock-power-budget",
    "panel-capacity": "scopedlabs:pipeline:access-control:panel-capacity",
    "access-level-sizing": "scopedlabs:pipeline:access-control:access-level-sizing"
  };

  const $ = (id) => document.getElementById(id);

  const els = {
    doorType: $("doorType"),
    life: $("life"),
    powerLoss: $("powerLoss"),
    fire: $("fire"),
    threat: $("threat"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.continueBtn) els.continueBtn.disabled = false;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continueBtn) els.continueBtn.disabled = true;
  }

  function render(rows) {
    els.results.innerHTML = rows.map((r) => `
      <div class="result-row">
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      </div>
    `).join("");
  }

  function savePipelineResult(payload) {
    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: payload
    });
  }

  function invalidatePipelineResult() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["reader-type-selector"]);
      sessionStorage.removeItem(FLOW_KEYS["lock-power-budget"]);
      sessionStorage.removeItem(FLOW_KEYS["panel-capacity"]);
      sessionStorage.removeItem(FLOW_KEYS["access-level-sizing"]);
    } catch {}
    hideContinue();
  }

  function clearResults() {
    els.results.innerHTML = `<div class="muted">Run the evaluation to see results.</div>`;
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    hideContinue();
  }

  function getConfidence(score) {
    const abs = Math.abs(score);
    if (abs >= 4) return "HIGH";
    if (abs >= 2) return "MEDIUM";
    return "LOW";
  }

  function getScoreMeaning(score) {
    if (score >= 3) return "Strong bias toward life safety behavior.";
    if (score >= 1) return "Moderate lean toward life safety.";
    if (score <= -3) return "Strong bias toward security retention.";
    if (score <= -1) return "Moderate lean toward security.";
    return "Balanced conditions — requires design judgment.";
  }

  function buildInterpretation(recommendation, score, doorType, fire, threat) {
    if (recommendation === "FAIL-SAFE") {
      return `This door leans toward fail-safe behavior because egress reliability and release behavior matter more than retaining the secured state through power loss. That is especially true when the door type or fire/alarm conditions increase life-safety sensitivity.`;
    }

    if (recommendation === "FAIL-SECURE") {
      return `This door leans toward fail-secure behavior because the security consequence of releasing during outage is higher than the benefit of automatic unlock. That usually happens on perimeter or critical doors where threat pressure and asset protection outweigh convenience.`;
    }

    return `The door conditions are balanced enough that neither fail-safe nor fail-secure wins cleanly on logic alone. This is where code requirements, occupancy, emergency egress, and actual operational use should drive the final hardware choice.`;
  }

  function buildGuidance(recommendation, doorType, fire) {
    if (recommendation === "FAIL-SAFE") {
      return "Confirm that the lock hardware, release path, and fire-alarm behavior all support safe egress under loss-of-power conditions before moving into reader and power design.";
    }

    if (recommendation === "FAIL-SECURE") {
      return "Verify egress method and code treatment carefully. A fail-secure choice is only acceptable if safe exit remains intact under the door’s actual use case and authority requirements.";
    }

    return "Do not finalize lock type yet. Escalate this door for code review and operational review before choosing reader placement or power assumptions.";
  }

  function calculate() {
    const doorType = els.doorType.value;
    const life = els.life.value;
    const powerLoss = els.powerLoss.value;
    const fire = els.fire.value;
    const threat = els.threat.value;

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

    let recommendation, rationale, risk;

    if (score >= 2) {
      recommendation = "FAIL-SAFE";
      rationale = "Life safety and egress reliability outweigh the need to stay locked during power loss.";
      risk = "Exposure during outage or release conditions.";
    } else if (score <= -2) {
      recommendation = "FAIL-SECURE";
      rationale = "Security retention outweighs automatic release behavior.";
      risk = "Improper egress if not designed correctly.";
    } else {
      recommendation = "CONDITIONAL";
      rationale = "Balanced inputs require code-driven and operational decision.";
      risk = "Inconsistent behavior across doors.";
    }

    const confidence = getConfidence(score);
    const scoreMeaning = getScoreMeaning(score);
    const interpretation = buildInterpretation(recommendation, score, doorType, fire, threat);
    const guidance = buildGuidance(recommendation, doorType, fire);

    render([
      { label: "Recommendation", value: recommendation },
      { label: "Confidence", value: confidence },
      { label: "Why", value: rationale },
      { label: "Score Meaning", value: scoreMeaning },
      { label: "Primary Risk", value: risk },
      { label: "Score", value: score },
      { label: "Engineering Interpretation", value: interpretation },
      { label: "Actionable Guidance", value: guidance }
    ]);

    savePipelineResult({
      recommendation,
      score,
      confidence,
      doorType,
      life,
      powerLoss,
      fire,
      threat
    });

    showContinue();
  }

  function resetAll() {
    els.doorType.value = "interior";
    els.life.value = "high";
    els.powerLoss.value = "normal";
    els.fire.value = "yes";
    els.threat.value = "low";
    clearResults();
    invalidatePipelineResult();
  }

  els.calc.addEventListener("click", calculate);
  els.reset.addEventListener("click", resetAll);

  [els.doorType, els.life, els.powerLoss, els.fire, els.threat].forEach((el) => {
    el.addEventListener("change", invalidatePipelineResult);
    el.addEventListener("input", invalidatePipelineResult);
  });

  els.continueBtn.addEventListener("click", () => {
    window.location.href = "/tools/access-control/reader-type-selector/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
    clearResults();
  });
})();