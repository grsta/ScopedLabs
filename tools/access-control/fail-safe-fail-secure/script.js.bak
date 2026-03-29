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
    els.results.innerHTML = rows.map(r => `
      <div class="result-row">
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      </div>
    `).join("");
  }

  function savePipelineResult(payload) {
    sessionStorage.setItem(FLOW_KEY, JSON.stringify({
      category: "access-control",
      step: "fail-safe-fail-secure",
      ts: Date.now(),
      data: payload
    }));
  }

  function invalidatePipelineResult() {
    sessionStorage.removeItem(FLOW_KEY);
    hideContinue();
  }

  function clearResults() {
    els.results.innerHTML = `<div class="muted">Run the evaluation to see results.</div>`;
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

    render([
      { label: "Recommendation", value: recommendation },
      { label: "Confidence", value: confidence },
      { label: "Why", value: rationale },
      { label: "Score Meaning", value: scoreMeaning },
      { label: "Primary Risk", value: risk },
      { label: "Score", value: score }
    ]);

    savePipelineResult({
      recommendation,
      score,
      confidence
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

  [els.doorType, els.life, els.powerLoss, els.fire, els.threat].forEach(el => {
    el.addEventListener("change", invalidatePipelineResult);
  });

  els.nextBtn.addEventListener("click", () => {
    window.location.href = "/tools/access-control/reader-type-selector/";
  });

  clearResults();
})();