(() => {
  "use strict";

  const CATEGORY = "power";
  const STEP = "load-growth";
  const LANE = "v1";
  const PREVIOUS_STEP = "va-watts-amps";

  const FLOW_KEYS = {
    "va-watts-amps": "scopedlabs:pipeline:power:va-watts-amps",
    "load-growth": "scopedlabs:pipeline:power:load-growth",
    "ups-runtime": "scopedlabs:pipeline:power:ups-runtime",
    "battery-bank-sizer": "scopedlabs:pipeline:power:battery-bank-sizer"
  };

  const NEXT_URL = "/tools/power/ups-runtime/";
  const $ = (id) => document.getElementById(id);

  const els = {
    baseLoad: $("baseLoad"),
    growthPct: $("growthPct"),
    years: $("years"),
    headroomPct: $("headroomPct"),
    flowNote: $("flow-note"),
    resultsCard: $("resultsCard"),
    errorCard: $("errorCard"),
    errorText: $("errorText"),
    finalLoad: $("finalLoad"),
    totalIncrease: $("totalIncrease"),
    recommendedCapacity: $("recommendedCapacity"),
    notes: $("notes"),
    analysis: $("analysis-copy"),
    calc: $("calc"),
    reset: $("reset"),
    continueWrap: $("next-step-row"),
    continueBtn: $("continue"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  function hasStoredAuth() {
    try {
      const k = Object.keys(localStorage).find((x) => x.startsWith("sb-"));
      if (!k) return false;
      const raw = JSON.parse(localStorage.getItem(k));
      return !!(
        raw?.access_token ||
        raw?.currentSession?.access_token ||
        (Array.isArray(raw) ? raw[0]?.access_token : null)
      );
    } catch {
      return false;
    }
  }

  function getUnlockedCategories() {
    try {
      const raw = localStorage.getItem("sl_unlocked_categories");
      if (!raw) return [];
      return raw.split(",").map((x) => String(x).trim().toLowerCase()).filter(Boolean);
    } catch {
      return [];
    }
  }

  function unlockCategoryPage() {
    const category = String(document.body?.dataset?.category || "").trim().toLowerCase();
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }

  function toNum(raw) {
    return ScopedLabsAnalyzer.safeNumber(
      raw === null || raw === undefined ? "" : String(raw).trim().replace(/,/g, ""),
      NaN
    );
  }

  function fmt(n, decimals = 2) {
    if (!Number.isFinite(n)) return "—";
    return n.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
  }

  function fmtKw(n, decimals = 2) {
    return Number.isFinite(n) ? `${fmt(n, decimals)} kW` : "—";
  }

  function fmtPct(n, decimals = 1) {
    return Number.isFinite(n) ? `${fmt(n, decimals)}%` : "—";
  }

  function hideContinue() {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.hideContinue === "function") {
      window.ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
      return;
    }
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function showContinue() {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.showContinue === "function") {
      window.ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
      return;
    }
    if (els.continueWrap) els.continueWrap.style.display = "flex";
  }

  function clearTable() {
    const tbody = document.querySelector("#yearTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
  }

  function addRow(year, projected, delta, deltaPct) {
    const tbody = document.querySelector("#yearTable tbody");
    if (!tbody) return;

    const tr = document.createElement("tr");

    const tdYear = document.createElement("td");
    tdYear.textContent = String(year);

    const tdProj = document.createElement("td");
    tdProj.textContent = fmtKw(projected);

    const tdDelta = document.createElement("td");
    tdDelta.textContent = fmtKw(delta);

    const tdPct = document.createElement("td");
    tdPct.textContent = fmtPct(deltaPct);

    tr.appendChild(tdYear);
    tr.appendChild(tdProj);
    tr.appendChild(tdDelta);
    tr.appendChild(tdPct);

    tbody.appendChild(tr);
  }

  function showError(msg) {
    if (els.resultsCard) els.resultsCard.hidden = true;
    if (els.errorCard) els.errorCard.hidden = false;
    if (els.errorText) els.errorText.textContent = msg;
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    hideContinue();
  }

  function clearError() {
    if (els.errorCard) els.errorCard.hidden = true;
    if (els.errorText) els.errorText.textContent = "";
  }

  function showResults() {
    if (els.errorCard) els.errorCard.hidden = true;
    if (els.resultsCard) els.resultsCard.hidden = false;
  }

  function readPipelineInput() {
    try {
      const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.data) return null;
      return parsed;
    } catch (err) {
      console.warn("Could not read pipeline payload:", err);
      return null;
    }
  }

  function savePipelineResult(payload) {
    try {
      sessionStorage.setItem(
        FLOW_KEYS[STEP],
        JSON.stringify({
          category: CATEGORY,
          step: STEP,
          ts: Date.now(),
          data: payload
        })
      );
    } catch (err) {
      console.warn("Could not save pipeline payload:", err);
    }
  }

  function invalidatePipelineResult() {
    try {
      const raw = sessionStorage.getItem(FLOW_KEYS[STEP]);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.category === CATEGORY && parsed.step === STEP) {
        sessionStorage.removeItem(FLOW_KEYS[STEP]);
      }
    } catch (err) {
      console.warn("Could not invalidate pipeline payload:", err);
    }
  }

  function renderFlowNote() {
    const incoming = readPipelineInput();

    if (!incoming || incoming.category !== CATEGORY || !els.flowNote) {
      if (els.flowNote) {
        els.flowNote.hidden = true;
        els.flowNote.innerHTML = "";
      }
      return;
    }

    const data = incoming.data || {};

    ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEYS[STEP],
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      title: "Flow Context",
      intro: "This step projects future load so UPS runtime and battery sizing use realistic design demand."
    });

    if (
      incoming.step === PREVIOUS_STEP &&
      els.baseLoad &&
      (!els.baseLoad.value || els.baseLoad.value.trim() === "") &&
      Number.isFinite(Number(data.baseLoadKw))
    ) {
      els.baseLoad.value = Number(data.baseLoadKw).toFixed(3);
    }

    if (incoming.step === PREVIOUS_STEP) {
      const watts = Number(data.watts);
      const kw = Number(data.baseLoadKw);
      const volts = Number(data.volts);
      const pf = Number(data.powerFactor);

      const lines = [];
      lines.push("Imported from VA / Watts / Amps.");
      if (Number.isFinite(watts)) lines.push(`Load: <strong>${fmt(watts, 0)} W</strong>`);
      if (Number.isFinite(kw)) lines.push(`Converted load: <strong>${fmt(kw, 3)} kW</strong>`);
      if (Number.isFinite(volts)) lines.push(`Voltage: <strong>${fmt(volts, 0)} V</strong>`);
      if (Number.isFinite(pf)) lines.push(`Power factor: <strong>${fmt(pf, 2)}</strong>`);

      els.flowNote.innerHTML = `
        <strong>Flow Context</strong><br>
        ${lines.join("<br>")}
        <br><br>
        Review values and click <strong>Calculate</strong>.
      `;
      els.flowNote.hidden = false;
    }
  }

  function invalidate() {
    clearTable();
    clearError();
    invalidatePipelineResult();
    hideContinue();
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);

    if (els.resultsCard) els.resultsCard.hidden = true;
    if (els.notes) els.notes.textContent = "";

    renderFlowNote();
  }

  function getInputs() {
    const baseLoad = toNum(els.baseLoad?.value);
    const growthPct = toNum(els.growthPct?.value);
    const years = Math.floor(toNum(els.years?.value));
    const headroomPctRaw = toNum(els.headroomPct?.value);

    if (!Number.isFinite(baseLoad) || baseLoad < 0) {
      return { ok: false, message: "Enter a valid Current Load (kW). Example: 12.5" };
    }

    if (!Number.isFinite(growthPct) || growthPct < 0) {
      return { ok: false, message: "Enter a valid Annual Growth (%). Example: 6" };
    }

    if (!Number.isFinite(years) || years < 1 || years > 50) {
      return { ok: false, message: "Enter a valid Time Horizon (Years) between 1 and 50." };
    }

    const headroomPct = Number.isFinite(headroomPctRaw) && headroomPctRaw >= 0 ? headroomPctRaw : 0;

    return {
      ok: true,
      baseLoad,
      growthPct,
      years,
      headroomPct,
      g: growthPct / 100,
      h: headroomPct / 100
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const yearly = [];
    yearly.push({ year: 0, projected: input.baseLoad, delta: 0, deltaPct: 0 });

    for (let y = 1; y <= input.years; y++) {
      const projected = input.baseLoad * Math.pow(1 + input.g, y);
      const delta = projected - input.baseLoad;
      const deltaPct = input.baseLoad === 0 ? 0 : (delta / input.baseLoad) * 100;
      yearly.push({ year: y, projected, delta, deltaPct });
    }

    const finalLoad = input.baseLoad * Math.pow(1 + input.g, input.years);
    const totalIncrease = finalLoad - input.baseLoad;
    const totalIncreasePct = input.baseLoad === 0 ? 0 : (totalIncrease / input.baseLoad) * 100;
    const recommendedCapacity = finalLoad * (1 + input.h);

    const baseLoadWatts = input.baseLoad * 1000;
    const finalLoadWatts = finalLoad * 1000;
    const recommendedCapacityWatts = recommendedCapacity * 1000;
    const averageAnnualAddedKw = input.years > 0 ? totalIncrease / input.years : 0;
    const averageAnnualAddedWatts = averageAnnualAddedKw * 1000;
    const threeYearCheck = input.baseLoad * Math.pow(1 + input.g, Math.min(3, input.years));
    const fiveYearCheck = input.baseLoad * Math.pow(1 + input.g, Math.min(5, input.years));
    const continuousDesignKw = recommendedCapacity * 1.25;
    const continuousDesignWatts = continuousDesignKw * 1000;

    const growthPressureMetric = ScopedLabsAnalyzer.clamp(input.growthPct * 4, 0, 100);
    const planningHorizonMetric = ScopedLabsAnalyzer.clamp((input.years / 10) * 100, 0, 100);
    const headroomMetric = ScopedLabsAnalyzer.clamp(input.headroomPct * 2, 0, 100);

    const metrics = [
      {
        label: "Growth Pressure",
        value: growthPressureMetric,
        displayValue: fmtPct(input.growthPct)
      },
      {
        label: "Planning Horizon",
        value: planningHorizonMetric,
        displayValue: `${input.years} years`
      },
      {
        label: "Headroom Buffer",
        value: headroomMetric,
        displayValue: fmtPct(input.headroomPct)
      }
    ];

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(growthPressureMetric, planningHorizonMetric, headroomMetric),
      metrics,
      healthyMax: 20,
      watchMax: 45
    });

    let growthClass = "Balanced Expansion Planning";
    if (input.growthPct >= 10) growthClass = "Aggressive Growth Planning";
    else if (input.growthPct >= 5 || input.years >= 5) growthClass = "Moderate Growth Planning";
    else if (input.growthPct === 0) growthClass = "Static Load Planning";

    let interpretation = `A current load of ${fmtKw(input.baseLoad)} growing at ${fmtPct(input.growthPct)} for ${input.years} year${input.years === 1 ? "" : "s"} projects to about ${fmtKw(finalLoad)} by the end of the planning horizon. With ${fmtPct(input.headroomPct)} planning headroom, the recommended design capacity rises to about ${fmtKw(recommendedCapacity)}.`;

    if (input.growthPct >= 10) {
      interpretation += ` Growth is aggressive enough that today's measured load is no longer a safe proxy for future sizing. Infrastructure selected only on present load will age out quickly.`;
    } else if (input.years >= 5) {
      interpretation += ` The long planning horizon materially compounds even moderate annual growth, so future capacity drift becomes a practical design concern.`;
    } else if (input.headroomPct >= 20) {
      interpretation += ` Headroom policy is doing a meaningful amount of the sizing work, which is appropriate when phased expansion risk matters more than initial cost.`;
    } else {
      interpretation += ` Growth and buffer remain in a practical range, so the recommended design load stays reasonably proportional to today's connected demand.`;
    }

    let dominantConstraint = "";
    if (growthPressureMetric >= planningHorizonMetric && growthPressureMetric >= headroomMetric && input.growthPct >= 5) {
      dominantConstraint = "Growth pressure is the dominant limiter. Annual expansion rate is what most strongly pushes the final design load above today's baseline.";
    } else if (planningHorizonMetric >= headroomMetric && input.years >= 5) {
      dominantConstraint = "Planning horizon is the dominant limiter. Compound growth over a longer deployment life is driving more of the final capacity requirement.";
    } else if (headroomMetric > 20) {
      dominantConstraint = "Headroom buffer is the dominant limiter. Design capacity is being intentionally pushed upward to preserve future flexibility.";
    } else {
      dominantConstraint = "The load-planning assumptions are balanced. Growth rate, time horizon, and headroom remain in a practical range.";
    }

    let guidance = "";
    if (input.growthPct >= 10) {
      guidance = "Use the recommended capacity, not today's load, as the upstream design input for UPS runtime and battery sizing. Aggressive growth will otherwise undercut resilience planning.";
    } else if (input.years >= 5) {
      guidance = "Review whether the time horizon matches the real refresh cycle. Long planning windows can justify larger upstream infrastructure even with moderate annual growth.";
    } else if (input.headroomPct >= 20) {
      guidance = "Confirm that the added headroom is intentional. If budget pressure is high, this buffer may be worth revisiting before carrying it forward.";
    } else {
      guidance = "This is a workable projected design load. Continue to UPS Runtime next so backup sizing reflects future demand instead of present-day baseline only.";
    }

    const notes = [];
    notes.push(`Model: compound growth (Load × (1 + g)^years).`);
    notes.push(`Average added load: ${fmt(averageAnnualAddedKw)} kW/year.`);
    notes.push(`3-year check: ${fmtKw(threeYearCheck)}. 5-year check: ${fmtKw(fiveYearCheck)}.`);
    if (input.headroomPct > 0) {
      notes.push(`Headroom applied: ${fmtPct(input.headroomPct)}.`);
    }
    notes.push(
      `Engineering planning note: recommended capacity is ${fmtKw(recommendedCapacity)}, while a more conservative 125% continuous-design reference would be about ${fmtKw(continuousDesignKw)}.`
    );

    return {
      ok: true,
      ...input,
      yearly,
      finalLoad,
      totalIncrease,
      totalIncreasePct,
      recommendedCapacity,
      baseLoadWatts,
      finalLoadWatts,
      recommendedCapacityWatts,
      averageAnnualAddedKw,
      averageAnnualAddedWatts,
      threeYearCheck,
      fiveYearCheck,
      continuousDesignKw,
      continuousDesignWatts,
      designLoadWatts: recommendedCapacityWatts,
      growthClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      notesText: notes.join(" ")
    };
  }

  function renderSuccess(data) {
    clearTable();

    data.yearly.forEach((row) => {
      addRow(row.year, row.projected, row.delta, row.deltaPct);
    });

    if (els.finalLoad) els.finalLoad.textContent = fmtKw(data.finalLoad);
    if (els.totalIncrease) {
      els.totalIncrease.textContent = `${fmtKw(data.totalIncrease)} (${fmtPct(data.totalIncreasePct)})`;
    }
    if (els.recommendedCapacity) {
      els.recommendedCapacity.textContent = fmtKw(data.recommendedCapacity);
    }
    if (els.notes) els.notes.textContent = data.notesText;

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      summaryRows: [
        { label: "Projected Load (Final Year)", value: fmtKw(data.finalLoad) },
        { label: "Total Increase", value: `${fmtKw(data.totalIncrease)} (${fmtPct(data.totalIncreasePct)})` },
        { label: "Recommended Capacity", value: fmtKw(data.recommendedCapacity) }
      ],
      derivedRows: [
        { label: "Growth Classification", value: data.growthClass },
        { label: "3-Year Check", value: fmtKw(data.threeYearCheck) },
        { label: "5-Year Check", value: fmtKw(data.fiveYearCheck) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance
    });

    savePipelineResult({
      baseLoadKw: data.baseLoad,
      baseLoadWatts: data.baseLoadWatts,
      growthPct: data.growthPct,
      years: data.years,
      headroomPct: data.headroomPct,
      finalLoadKw: data.finalLoad,
      finalLoadWatts: data.finalLoadWatts,
      totalIncreaseKw: data.totalIncrease,
      totalIncreasePct: data.totalIncreasePct,
      recommendedCapacityKw: data.recommendedCapacity,
      recommendedCapacityWatts: data.recommendedCapacityWatts,
      averageAnnualAddedKw: data.averageAnnualAddedKw,
      averageAnnualAddedWatts: data.averageAnnualAddedWatts,
      threeYearCheckKw: data.threeYearCheck,
      fiveYearCheckKw: data.fiveYearCheck,
      continuousDesignKw: data.continuousDesignKw,
      continuousDesignWatts: data.continuousDesignWatts,
      designLoadWatts: data.designLoadWatts,
      status: data.growthClass,
      interpretation: data.interpretation,
      guidance: data.guidance
    });

    clearError();
    showResults();
    showContinue();
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) {
      showError(data.message);
      return;
    }
    renderSuccess(data);
  }

  function reset() {
    clearTable();
    clearError();
    invalidatePipelineResult();

    ["baseLoad", "growthPct", "years", "headroomPct"].forEach((id) => {
      const el = $(id);
      if (el) el.value = "";
    });

    if (els.resultsCard) els.resultsCard.hidden = true;
    if (els.notes) els.notes.textContent = "";
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    hideContinue();

    if (els.flowNote) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
    }

    renderFlowNote();
  }

  function wire() {
    if (!els.calc || !els.reset) {
      showError("Load Growth tool wiring failed: missing #calc or #reset button IDs in the HTML.");
      return;
    }

    els.calc.addEventListener("click", calc);
    els.reset.addEventListener("click", reset);

    ["baseLoad", "growthPct", "years", "headroomPct"].forEach((id) => {
      const el = $(id);
      if (!el) return;

      el.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          calc();
        }
      });

      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    renderFlowNote();
    hideContinue();
  }

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    unlockCategoryPage();
    setTimeout(() => {
      unlockCategoryPage();
    }, 400);

    wire();
  });
})();
