(() => {
  const byId = (id) => document.getElementById(id);

  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const baselineRetentionEl = byId("baselineRetention");
  const capacityLossPctEl = byId("capacityLossPct");
  const targetRetentionEl = byId("targetRetention");
  const stressWritePctEl = byId("stressWritePct");
  const degradedDaysEl = byId("degradedDays");
  const reserveHeadroomPctEl = byId("reserveHeadroomPct");

  const calcBtn = byId("calc");
  const resetBtn = byId("reset");

  const outBaseline = byId("outBaseline");
  const outEffective = byId("outEffective");
  const outDaysLost = byId("outDaysLost");
  const outMeetsGoal = byId("outMeetsGoal");
  const outRecommended = byId("outRecommended");
  const outHeadroomNeed = byId("outHeadroomNeed");
  const outDegradedImpact = byId("outDegradedImpact");
  const outRisk = byId("outRisk");
  const outNarrative = byId("outNarrative");
  const statusText = byId("statusText");

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

  const setText = (el, txt) => {
    el.textContent = txt;
  };

  function importFromRaid() {
    const q = new URLSearchParams(window.location.search);

    if (q.get("source") !== "raid") return;

    const targetDays = readNum(targetRetentionEl, 30);
    const importedTargetDays = Number(q.get("targetDays"));
    const requiredStorageGb = Number(q.get("requiredStorageGb"));
    const usableTb = Number(q.get("usableTb"));

    if (Number.isFinite(importedTargetDays) && importedTargetDays > 0) {
      baselineRetentionEl.value = String(importedTargetDays);
      targetRetentionEl.value = String(importedTargetDays);
    }

    if (Number.isFinite(requiredStorageGb) && requiredStorageGb > 0 && Number.isFinite(usableTb) && usableTb > 0) {
      const usableGb = usableTb * 1000;
      const lossPct = Math.max(0, (1 - (usableGb / requiredStorageGb)) * 100);
      capacityLossPctEl.value = round(lossPct, 1);
    }

    const note = byId("flow-note");
    if (note) {
      note.hidden = false;

      if (Number.isFinite(requiredStorageGb) && requiredStorageGb > 0 && Number.isFinite(usableTb) && usableTb > 0) {
        note.textContent =
          `Imported from RAID Impact. Required storage: ${(requiredStorageGb / 1000).toFixed(2)} TB. Net usable array: ${usableTb.toFixed(2)} TB. Review values and click Calculate.`;
      } else {
        note.textContent = "Imported from RAID Impact. Review values and click Calculate.";
      }
    }
  }

  function compute() {
    const baselineDays = Math.max(0.1, readNum(baselineRetentionEl, 30));
    const lossPct = clamp(readNum(capacityLossPctEl, 0), 0, 95);
    const targetDays = Math.max(0.1, readNum(targetRetentionEl, baselineDays));
    const stressPct = clamp(readNum(stressWritePctEl, 0), 0, 200);
    const degradedDays = clamp(readNum(degradedDaysEl, 0), 0, 365);
    const headroomPct = clamp(readNum(reserveHeadroomPctEl, 0), 0, 200);

    const capMult = 1 - (lossPct / 100);
    const writeMult = 1 + (stressPct / 100);

    const effectiveDays = baselineDays * capMult / writeMult;
    const daysLost = Math.max(0, baselineDays - effectiveDays);

    const strictRequiredBaseline = targetDays * writeMult / Math.max(0.001, capMult);
    const headroomBaseline = targetDays * (1 + headroomPct / 100);

    const burnRate = (baselineDays / Math.max(0.001, effectiveDays)) - 1;
    const degradedImpact = Math.max(0, burnRate * degradedDays);

    const meets = effectiveDays >= targetDays;
    const nearCliff = effectiveDays < targetDays * 1.1;
    const highLoss = lossPct >= 20;
    const highStress = stressPct >= 15;

    let risk = "OK";
    if (!meets) risk = "FAIL (below goal)";
    else if (nearCliff || highLoss || highStress) risk = "WARNING (fragile margin)";

    setText(outBaseline, fmtDays(baselineDays));
    setText(outEffective, fmtDays(effectiveDays));
    setText(outDaysLost, fmtDays(daysLost));
    setText(outMeetsGoal, meets ? "YES" : "NO");

    const impliedHeadroomNeed = Math.max(0, strictRequiredBaseline - baselineDays);

    setText(
      outRecommended,
      `${fmtDays(strictRequiredBaseline)} (strict) • ${fmtDays(headroomBaseline)} (headroom target)`
    );
    setText(
      outHeadroomNeed,
      `${fmtDays(impliedHeadroomNeed)} needed to meet goal under loss/stress`
    );

    setText(
      outDegradedImpact,
      degradedDays > 0 ? `${fmtDays(degradedImpact)} equivalent retention burned` : "—"
    );
    setText(outRisk, risk);

    const narrative = [];
    narrative.push(
      `With ${fmtPct(lossPct)} usable capacity loss and ${fmtPct(stressPct)} write penalty, effective retention becomes ${fmtDays(effectiveDays)}.`
    );

    if (!meets) {
      narrative.push(
        `This fails the ${fmtDays(targetDays)} retention goal. To survive this degraded state, baseline retention should be about ${fmtDays(strictRequiredBaseline)} or capacity/load assumptions should improve.`
      );
    } else if (nearCliff) {
      narrative.push(
        `This still meets the ${fmtDays(targetDays)} goal, but it is operating near a retention cliff. Additional margin is recommended.`
      );
    } else {
      narrative.push(
        `This meets the ${fmtDays(targetDays)} goal with workable margin. Maintaining disciplined headroom will help preserve that over time.`
      );
    }

    if (degradedDays > 0) {
      narrative.push(
        `Over a degraded period of ${fmtDays(degradedDays)}, this model estimates about ${fmtDays(degradedImpact)} of equivalent retention burn.`
      );
    }

    setText(outNarrative, narrative.join(" "));
    setText(statusText, "Calculated.");
  }

  function reset() {
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
  }

  calcBtn.addEventListener("click", compute);
  resetBtn.addEventListener("click", reset);

  ["baselineRetention", "capacityLossPct", "targetRetention", "stressWritePct", "degradedDays", "reserveHeadroomPct"].forEach((id) => {
    const el = byId(id);
    if (el) {
      el.addEventListener("input", () => {
        statusText.textContent = "Values changed. Recalculate.";
      });
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
        e.preventDefault();
        compute();
      }
    }
  });

  reset();
  importFromRaid();
})();
