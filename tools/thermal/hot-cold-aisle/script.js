const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "hot-cold-aisle";
  const PRIOR_STEP = "fan-cfm-sizing";
  const NEXT_URL = "/tools/thermal/ambient-rise/";

  const $ = (id) => document.getElementById(id);

  const els = {
    racks: $("racks"),
    kw: $("kw"),
    cooling: $("cooling"),
    contain: $("contain"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  function safeNumber(value, fallback = 0) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.safeNumber === "function"
    ) {
      return window.ScopedLabsAnalyzer.safeNumber(value, fallback);
    }

    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clamp === "function"
    ) {
      return window.ScopedLabsAnalyzer.clamp(value, min, max);
    }

    return Math.min(max, Math.max(min, value));
  }

  function readSaved() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function clearStored() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function hideContinue() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.hideContinue === "function"
    ) {
      window.ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
      return;
    }

    els.continueWrap.style.display = "none";
    els.continueBtn.disabled = true;
  }

  function showContinue() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.showContinue === "function"
    ) {
      window.ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
      return;
    }

    els.continueWrap.style.display = "";
    els.continueBtn.disabled = false;
  }

  function renderEmpty() {
    els.results.innerHTML = `<div class="muted">Enter values and press Evaluate.</div>`;

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function"
    ) {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
    } else if (els.analysisCopy) {
      els.analysisCopy.style.display = "none";
      els.analysisCopy.innerHTML = "";
    }
  }

  function renderFlowNote() {
    const saved = readSaved();

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderFlowNote === "function"
    ) {
      window.ScopedLabsAnalyzer.renderFlowNote({
        flowEl: els.flowNote,
        category: CATEGORY,
        step: STEP,
        title: "System Context",
        intro:
          "This step translates fan sizing and airflow delivery into physical rack orientation, containment choice, and cooling-layout strategy.",
        customRows:
          saved &&
          saved.category === CATEGORY &&
          saved.step === PRIOR_STEP
            ? [
                {
                  label: "Prior Step",
                  value: "Fan CFM Sizing"
                },
                {
                  label: "Provided Airflow",
                  value:
                    saved.data && Number.isFinite(Number(saved.data.providedCFM))
                      ? `${Number(saved.data.providedCFM).toFixed(0)} CFM`
                      : "—"
                },
                {
                  label: "Fan Strategy",
                  value:
                    saved.data?.sizingOutcome ??
                    saved.data?.classification ??
                    "—"
                }
              ]
            : null
      });
      return;
    }

    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";
  }

  function buildInterpretation(status, dominantConstraint, totalKW, racks, cooling, contain) {
    if (status === "HEALTHY") {
      return `The physical layout strategy is still in a manageable range for the projected IT load. Rack orientation and airflow separation should be straightforward to maintain as long as the chosen cooling delivery method is aligned with aisle direction.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Containment requirement") {
        return `The projected load is high enough that containment is becoming important rather than optional. Without tighter hot/cold separation, mixing losses can erode the airflow benefit gained in previous steps.`;
      }

      if (dominantConstraint === "Cooling delivery alignment") {
        return `The main risk is alignment between the chosen cooling-delivery method and the aisle layout. A workable rack plan can still underperform if supply and return paths are fighting the physical orientation.`;
      }

      return `Rack density is moving into a range where layout quality becomes part of the thermal system instead of just a room-planning detail. At this point, poor aisle discipline can create uneven temperatures even if total airflow looks adequate on paper.`;
    }

    if (dominantConstraint === "Containment requirement") {
      return `The environment is carrying enough thermal load that containment has become a primary control measure. The physical layout must now actively prevent hot/cold mixing, not just suggest a best practice.`;
    }

    if (dominantConstraint === "Cooling delivery alignment") {
      return `The chosen cooling strategy is now the limiting factor. Even with a proper hot/cold aisle concept, poor alignment between rack faces and cooling delivery can leave parts of the room under-supplied or recirculating warm air.`;
    }

    return `Total rack load is high enough that layout execution becomes a thermal risk in its own right. The first problem in the field is usually not the concept of hot/cold aisles—it is inconsistent aisle discipline, bypass, and return-path contamination under higher density.`;
  }

  function buildGuidance(status, dominantConstraint, totalKW, containMode) {
    if (status === "HEALTHY") {
      return `Carry this layout strategy forward and validate the resulting ambient rise next. Keep rack fronts consistently aligned and protect the intended cold-air path so later temperature estimates remain realistic.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Containment requirement") {
        return `Move toward formal containment before load grows further. Containment will preserve the airflow work already done upstream and reduce the chance of hot/cold mixing weakening the design.`;
      }

      if (dominantConstraint === "Cooling delivery alignment") {
        return `Review rack orientation against the actual supply and return pattern in the room. Layout and cooling method need to reinforce each other instead of simply coexisting.`;
      }

      return `Treat aisle discipline as part of the thermal design. Keep fronts facing fronts, backs facing backs, and minimize bypass openings so the airflow model holds up in practice.`;
    }

    if (containMode === "none") {
      return `Do not leave this environment without containment if the current load assumptions are real. The layout now needs stronger hot/cold separation before the next thermal step will be trustworthy.`;
    }

    if (dominantConstraint === "Cooling delivery alignment") {
      return `Rework the relationship between rack rows and cooling supply before proceeding. A misaligned delivery strategy will undermine containment and increase recirculation risk under load.`;
    }

    return `Tighten physical airflow control before moving forward. Use stricter containment, better rack alignment, and cleaner return-path separation so the room behaves like the thermal model expects.`;
  }

  function invalidate() {
    clearStored();

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.invalidate === "function"
    ) {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        continueWrapEl: els.continueWrap,
        continueBtnEl: els.continueBtn,
        category: CATEGORY,
        step: STEP,
        emptyMessage: "Enter values and press Evaluate."
      });
      return;
    }

    clearAnalysis();
    hideContinue();
    els.results.innerHTML = `<div class="muted">Enter values and press Evaluate.</div>`;
  }

  function clearAnalysis() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function"
    ) {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
    } else if (els.analysisCopy) {
      els.analysisCopy.style.display = "none";
      els.analysisCopy.innerHTML = "";
    }
  }

  function calculate() {
    const racksRaw = safeNumber(els.racks.value, NaN);
    const kwRaw = safeNumber(els.kw.value, NaN);
    const cooling = els.cooling.value;
    const contain = els.contain.value;

    if (
      !Number.isFinite(racksRaw) ||
      !Number.isFinite(kwRaw) ||
      racksRaw <= 0 ||
      kwRaw <= 0
    ) {
      els.results.innerHTML = `<div class="muted">Enter valid values and press Evaluate.</div>`;
      clearAnalysis();
      hideContinue();
      clearStored();
      return;
    }

    const racks = clamp(racksRaw, 1, 100000);
    const kw = clamp(kwRaw, 0.1, 100000);
    const totalKW = racks * kw;

    let layout = "Cold aisles facing each other, hot aisles facing each other.";
    let containRec = "Containment optional.";
    let delivery = "";
    let layoutClass = "Standard hot/cold aisle layout";

    if (contain === "cold") containRec = "Implement Cold Aisle Containment (CAC).";
    if (contain === "hot") containRec = "Implement Hot Aisle Containment (HAC).";

    if (cooling === "perimeter") {
      delivery = "Ensure cold air reaches cold aisles and hot return air is drawn cleanly away from rack exhaust.";
    } else if (cooling === "inrow") {
      delivery = "Align rack rows tightly with in-row cooling so supply air feeds cold aisles directly.";
      layoutClass = "Row-coupled cooling layout";
    } else if (cooling === "overhead") {
      delivery = "Distribute supply air above cold aisles and preserve a clear path for hot-air return.";
      layoutClass = "Overhead delivery layout";
    }

    if (racks >= 20 || totalKW >= 80) {
      layout = "Use disciplined hot/cold aisle rows with consistent rack fronts, controlled bypass openings, and stronger separation between supply and return paths.";
    }

    const containmentPressure =
      contain === "none"
        ? clamp(totalKW / 25, 0.25, 3)
        : contain === "cold"
          ? clamp(totalKW / 45, 0.2, 2.2)
          : clamp(totalKW / 50, 0.2, 2.0);

    const coolingAlignmentPressure =
      cooling === "perimeter"
        ? clamp(totalKW / 55, 0.2, 2.4)
        : cooling === "overhead"
          ? clamp(totalKW / 50, 0.2, 2.2)
          : clamp(totalKW / 65, 0.2, 1.8);

    const densityPressure = clamp((racks * kw) / 45, 0.2, 3);

    const metrics = [
      {
        label: "Containment Requirement",
        value: containmentPressure,
        displayValue: contain === "none" ? "None" : contain === "cold" ? "CAC" : "HAC"
      },
      {
        label: "Cooling Delivery Alignment",
        value: coolingAlignmentPressure,
        displayValue:
          cooling === "perimeter"
            ? "Perimeter"
            : cooling === "inrow"
              ? "In-row"
              : "Overhead"
      },
      {
        label: "Rack Density Pressure",
        value: densityPressure,
        displayValue: `${totalKW.toFixed(1)} kW total`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Containment Requirement";

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.75
      });

      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Containment Requirement";
    } else {
      const dominant = metrics.reduce((best, current) =>
        Number(current.value) > Number(best.value) ? current : best
      );
      dominantLabel = dominant.label;
      if (Number(dominant.value) > 1.75) status = "RISK";
      else if (Number(dominant.value) > 1.0) status = "WATCH";
    }

    const dominantConstraintMap = {
      "Containment Requirement": "Containment requirement",
      "Cooling Delivery Alignment": "Cooling delivery alignment",
      "Rack Density Pressure": "Rack density pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Containment requirement";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      totalKW,
      racks,
      cooling,
      contain
    );

    const guidance = buildGuidance(
      status,
      dominantConstraint,
      totalKW,
      contain
    );

    const summaryRows = [
      { label: "Rack Count", value: `${racks.toFixed(0)}` },
      { label: "Avg Rack Load", value: `${kw.toFixed(1)} kW` },
      { label: "Total IT Load", value: `${totalKW.toFixed(1)} kW` },
      {
        label: "Cooling Delivery",
        value:
          cooling === "perimeter"
            ? "Perimeter CRAC / CRAH"
            : cooling === "inrow"
              ? "In-row cooling"
              : "Overhead cooling"
      }
    ];

    const derivedRows = [
      { label: "Recommended Layout", value: layout },
      { label: "Layout Class", value: layoutClass },
      { label: "Containment Strategy", value: containRec },
      { label: "Cooling Delivery Guidance", value: delivery }
    ];

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderOutput === "function"
    ) {
      window.ScopedLabsAnalyzer.renderOutput({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        summaryRows,
        derivedRows,
        status,
        interpretation,
        dominantConstraint,
        guidance
      });
    } else {
      els.results.innerHTML = `
        ${summaryRows.map((row) => `
          <div class="result-row">
            <div class="result-label">${row.label}</div>
            <div class="result-value">${row.value}</div>
          </div>
        `).join("")}
        ${derivedRows.map((row) => `
          <div class="result-row">
            <div class="result-label">${row.label}</div>
            <div class="result-value">${row.value}</div>
          </div>
        `).join("")}
      `;

      if (els.analysisCopy) {
        els.analysisCopy.style.display = "";
        els.analysisCopy.innerHTML = `
          <div class="results">
            <div class="result-row">
              <div class="result-label">Status</div>
              <div class="result-value">${status}</div>
            </div>
            <div class="result-row">
              <div class="result-label">Dominant Constraint</div>
              <div class="result-value">${dominantConstraint}</div>
            </div>
            <div class="result-row">
              <div class="result-label">Engineering Interpretation</div>
              <div class="result-value">${interpretation}</div>
            </div>
            <div class="result-row">
              <div class="result-label">Actionable Guidance</div>
              <div class="result-value">${guidance}</div>
            </div>
          </div>
        `;
      }
    }

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        category: CATEGORY,
        step: STEP,
        data: {
          totalKW,
          layout,
          layoutClass,
          containment: containRec,
          coolingDelivery: delivery,
          classification: status,
          dominantConstraint
        }
      })
    );

    showContinue();
  }

  function reset() {
    els.racks.value = 10;
    els.kw.value = 5;
    els.cooling.value = "perimeter";
    els.contain.value = "none";
    clearStored();
    hideContinue();
    renderEmpty();
    renderFlowNote();
  }

  function bindInvalidation() {
    [els.racks, els.kw, els.cooling, els.contain].forEach((el) => {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    hideContinue();
    renderFlowNote();
    renderEmpty();
    bindInvalidation();

    els.calc.onclick = calculate;
    els.reset.onclick = reset;
    els.continueBtn.onclick = () => {
      window.location.href = NEXT_URL;
    };
  }

  init();
})();


function calc() {
  // TODO: implement calculate handler
}


window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});


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
  const body = document.body;
  const category = String(body?.dataset?.category || "").trim().toLowerCase();
  const signedIn = hasStoredAuth();
  const unlocked = getUnlockedCategories().includes(category);

  const lockedCard = document.getElementById("lockedCard");
  const toolCard = document.getElementById("toolCard");

  if (signedIn && unlocked) {
    if (lockedCard) lockedCard.style.display = "none";
    if (toolCard) toolCard.style.display = "";
    return true;
  }

  if (lockedCard) lockedCard.style.display = "";
  if (toolCard) toolCard.style.display = "none";
  return false;
}


function writeFlow(data) {
  ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP] || STEP, {
    category: CATEGORY,
    step: STEP,
    data
  });
}
