// Retention Survivability Estimator — ScopedLabs
// Deterministic planning math (no external data).
// Shows tool UI only when ?pro=1 (handled in HTML gate).

document.addEventListener("DOMContentLoaded", () => {
  const byId = (id) => document.getElementById(id);

  // Inputs
  const baselineRetentionEl = byId("baselineRetention");
  const capacityLossPctEl   = byId("capacityLossPct");
  const targetRetentionEl   = byId("targetRetention");
  const stressWritePctEl    = byId("stressWritePct");
  const degradedDaysEl      = byId("degradedDays");
  const reserveHeadroomPctEl= byId("reserveHeadroomPct");

  // Buttons
  const calcBtn  = byId("calc");
  const resetBtn = byId("reset");

  // Outputs
  const outBaseline      = byId("outBaseline");
  const outEffective     = byId("outEffective");
  const outDaysLost      = byId("outDaysLost");
  const outMeetsGoal     = byId("outMeetsGoal");
  const outRecommended   = byId("outRecommended");
  const outHeadroomNeed  = byId("outHeadroomNeed");
  const outDegradedImpact= byId("outDegradedImpact");
  const outRisk          = byId("outRisk");
  const outNarrative     = byId("outNarrative");
  const statusText       = byId("statusText");

  // If this page is in locked mode, these elements won't exist (because proView is hidden, but still in DOM).
  // We still guard in case of future refactors.
  const required = [
    baselineRetentionEl, capacityLossPctEl, targetRetentionEl,
    stressWritePctEl, degradedDaysEl, reserveHeadroomPctEl,
    calcBtn, resetBtn,
    outBaseline, outEffective, outDaysLost, outMeetsGoal,
    outRecommended, outHeadroomNeed, outDegradedImpact, outRisk,
    outNarrative, statusText
  ];
  if (required.some((x) => !x)) return;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const round = (v, d = 2) => {
    const p = Math.pow(10, d);
    return Math.round(v * p) / p;
  };
  const fmtDays = (v) => `${round(v, 2)} days`;
  const fmtPct = (v) => `${round(v, 1)}%`;

  const readNum = (el, fallback = 0) => {
    const v = Number(el.value);
    return Number.isFinite(v) ? v : fallback;
  };

  const setText = (el, txt) => { el.textContent = txt; };

  const compute = () => {
    const baselineDays = Math.max(0.1, readNum(baselineRetentionEl, 30));
    const lossPct = clamp(readNum(capacityLossPctEl, 0), 0, 95); // 95% max so we don't blow up
    const targetDays = Math.max(0.1, readNum(targetRetentionEl, baselineDays));
    const stressPct = clamp(readNum(stressWritePctEl, 0), 0, 200);
    const degradedDays = clamp(readNum(degradedDaysEl, 0), 0, 365);
    const headroomPct = clamp(readNum(reserveHeadroomPctEl, 0), 0, 200);

    // Model:
    // Retention is proportional to usable capacity / write rate.
    // - capacity loss reduces usable capacity (multiplier = 1 - loss)
    // - stress write penalty increases write rate (multiplier = 1 + stress)
    const capMult = 1 - (lossPct / 100);
    const writeMult = 1 + (stressPct / 100);

    const effectiveDays = baselineDays * capMult / writeMult;
    const daysLost = Math.max(0, baselineDays - effectiveDays);

    // Recommended baseline to still meet target under loss+stress:
    // target <= baseline * capMult / writeMult  => baseline >= target * writeMult / capMult
    const recommendedBaseline = targetDays * writeMult / capMult;

    // Headroom baseline recommendation (above goal) independent of loss/stress:
    const headroomBaseline = targetDays * (1 + headroomPct / 100);

    // Total days of retention "lost" across a degraded period:
    // This is a heuristic: during the degraded window, you're burning retention faster.
    // Equivalent extra-retention-consumed per day = (baseline/effective - 1) days/day
    // Multiply by degradedDays, clamp >=0
    const burnRate = (baselineDays / Math.max(0.001, effectiveDays)) - 1;
    const degradedImpact = Math.max(0, burnRate * degradedDays);

    // Risk flag logic (simple, but useful):
    // - FAIL if effective < target
    // - WARNING if effective is within 10% of target OR lossPct >= 20 OR stress >= 15
    const meets = effectiveDays >= targetDays;
    const nearCliff = effectiveDays < targetDays * 1.1;
    const highLoss = lossPct >= 20;
    const highStress = stressPct >= 15;

    let risk = "OK";
    if (!meets) risk = "FAIL (below goal)";
    else if (nearCliff || highLoss || highStress) risk = "WARNING (fragile margin)";

    // Output
    setText(outBaseline, fmtDays(baselineDays));
    setText(outEffective, fmtDays(effectiveDays));
    setText(outDaysLost, fmtDays(daysLost));
    setText(outMeetsGoal, meets ? "YES" : "NO");
    outMeetsGoal.classList.toggle("muted", true);

    // Show two baselines: strict required (loss+stress) and your general headroom suggestion
    const strictReq = recommendedBaseline;
    const impliedHeadroomNeed = Math.max(0, (strictReq - baselineDays));
    setText(outRecommended, `${fmtDays(strictReq)} (strict) • ${fmtDays(headroomBaseline)} (headroom target)`);
    setText(outHeadroomNeed, `${fmtDays(impliedHeadroomNeed)} needed to meet goal under loss/stress`);

    setText(outDegradedImpact, degradedDays > 0 ? `${fmtDays(degradedImpact)} equivalent retention burned` : "—");
    setText(outRisk, risk);

    // Narrative
    const narrative = [];
    narrative.push(`With ${fmtPct(lossPct)} usable capacity loss and ${fmtPct(stressPct)} write penalty, your effective retention becomes ${fmtDays(effectiveDays)}.`);
    if (!meets) {
      narrative.push(`This fails your ${fmtDays(targetDays)} goal. To survive this degraded state, baseline retention should be ~${fmtDays(strictReq)} (or increase capacity / reduce bitrate).`);
    } else if (nearCliff) {
      narrative.push(`You technically meet the ${fmtDays(targetDays)} goal, but you are operating near a retention cliff. Add margin or reduce expected loss/stress assumptions.`);
    } else {
      narrative.push(`You meet the ${fmtDays(targetDays)} goal with margin. Keep headroom disciplined so this remains true as systems age or expand.`);
    }
    if (degradedDays > 0) {
      narrative.push(`Over a ${fmtDays(degradedDays)} degraded period, this model estimates ~${fmtDays(degradedImpact)} additional “retention days” effectively consumed (heuristic).`);
    }

    setText(outNarrative, narrative.join(" "));

    statusText.textContent = "Calculated.";
  };

  const reset = () => {
    baselineRetentionEl.value = "30";
    capacityLossPctEl.value = "12";
    targetRetentionEl.value = "30";
    stressWritePctEl.value = "8";
    degradedDaysEl.value = "2";
    reserveHeadroomPctEl.value = "15";

    outBaseline.textContent = "—";
    outEffective.textContent = "—";
    outDaysLost.textContent = "—";
    outMeetsGoal.textContent = "—";
    outRecommended.textContent = "—";
    outHeadroomNeed.textContent = "—";
    outDegradedImpact.textContent = "—";
    outRisk.textContent = "—";
    outNarrative.textContent = "—";
    statusText.textContent = "Enter values and calculate.";
  };

  calcBtn.addEventListener("click", compute);
  resetBtn.addEventListener("click", reset);

  // Auto-run once so it looks “alive” in Pro mode
  compute();
});
