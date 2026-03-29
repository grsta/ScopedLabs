const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "rack-thermal-density";
  const PRIOR_STEP = "btu-converter";
  const NEXT_URL = "/tools/thermal/airflow-requirement/";
  const KW_TO_BTU = 3412.14;

  const $ = (id) => document.getElementById(id);

  const els = {
    kw: $("kw"),
    ru: $("ru"),
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
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;

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
          "This step evaluates how concentrated the translated thermal load is within a rack so downstream airflow sizing reflects not just total heat, but how tightly that heat is packed.",
        customRows:
          saved &&
          saved.category === CATEGORY &&
          saved.step === PRIOR_STEP
            ? [
                {
                  label: "Prior Step",
                  value: "BTU Converter"
                },
                {
                  label: "System Heat",
                  value:
                    saved.data && Number.isFinite(Number(saved.data.btu))
                      ? `${Number(saved.data.btu).toFixed(0)} BTU/hr`
                      : "—"
                },
                {
                  label: "Cooling Tons",
                  value:
                    saved.data && Number.isFinite(Number(saved.data.tons))
                      ? `${Number(saved.data.tons).toFixed(2)} tons`
                      : "—"
                }
              ]
            : null
      });
      return;
    }

    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";
  }

  function buildInterpretation(status, dominantConstraint, perRU, btu, ru) {
    if (status === "HEALTHY") {
      return `Heat load is relatively spread out across the rack height, so airflow planning remains straightforward. Standard front-to-back airflow and ordinary containment discipline should usually be enough to keep thermal conditions manageable at this density.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Heat concentration per RU") {
        return `Thermal load is becoming concentrated enough that airflow quality starts to matter more than total airflow quantity alone. The rack can still be cooled effectively, but placement, bypass control, and directed movement now make a bigger difference.`;
      }

      if (dominantConstraint === "Total rack heat burden") {
        return `Total thermal output is large enough that rack-level cooling decisions start to matter more. Even if the per-RU concentration is not extreme, the rack is carrying enough heat to justify tighter airflow planning.`;
      }

      return `Rack height is contributing to concentration pressure. With less vertical space to distribute heat, the thermal design becomes more sensitive to how evenly air is delivered through the occupied rack volume.`;
    }

    if (dominantConstraint === "Heat concentration per RU") {
      return `Thermal load is concentrated enough per rack unit that density itself becomes the main design challenge. At this point, the first thing that usually breaks down in practice is not total fan rating, but the ability to move air evenly through a tight, high-heat rack.`;
    }

    if (dominantConstraint === "Total rack heat burden") {
      return `The rack is carrying a high enough total heat burden that downstream airflow and containment decisions become critical. Even a moderate modeling error from here can produce a noticeably hotter operating condition.`;
    }

    return `Rack height is too limited relative to the current thermal load, which drives concentration upward. This raises operational risk because high-density heat tends to create localized hotspots before the room as a whole appears overloaded.`;
  }

  function buildGuidance(status, dominantConstraint, perRU, ru) {
    if (status === "HEALTHY") {
      return `Carry this density result into airflow sizing and use it as a check on how aggressively air needs to be directed through the rack. The next step is translating density into required airflow, not just total room cooling.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Heat concentration per RU") {
        return `Begin treating rack airflow as a directed-cooling problem. Improve blanking, reduce bypass openings, and plan for stronger front-to-back control so concentration does not turn into local hot spots.`;
      }

      if (dominantConstraint === "Rack height constraint") {
        return `Review how much usable rack height is actually available for thermal distribution. Dense loading in limited RU space often benefits more from airflow discipline than from simply adding more nominal cooling.`;
      }

      return `Use the next airflow step conservatively and assume the rack will need cleaner separation and better distribution than a low-density cabinet.`;
    }

    if (perRU >= 2000) {
      return `Treat this as a high-density rack thermal problem. Stronger airflow control, tighter containment, and possibly more advanced cooling methods should be considered before relying on standard cabinet assumptions.`;
    }

    if (dominantConstraint === "Rack height constraint") {
      return `Reduce concentration or improve delivery control before moving forward. The current heat-per-RU profile is too tight to rely on casual airflow management.`;
    }

    return `Proceed using this density as a serious design constraint. Downstream airflow and fan sizing should assume the rack needs more deliberate cooling discipline than a typical low-density installation.`;
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
        emptyMessage: "Enter values and press Calculate."
      });
      return;
    }

    hideContinue();
    renderEmpty();
  }

  function calculate() {
    const kwRaw = safeNumber(els.kw.value, NaN);
    const ruRaw = safeNumber(els.ru.value, NaN);

    if (
      !Number.isFinite(kwRaw) ||
      !Number.isFinite(ruRaw) ||
      kwRaw <= 0 ||
      ruRaw <= 0
    ) {
      els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      hideContinue();
      clearStored();

      if (
        window.ScopedLabsAnalyzer &&
        typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function"
      ) {
        window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
      }
      return;
    }

    const kw = clamp(kwRaw, 0.1, 1000000);
    const ru = clamp(ruRaw, 1, 100000);
    const btu = kw * KW_TO_BTU;
    const perRU = btu / Math.max(1, ru);

    let classification = "Low density";
    if (perRU > 500) classification = "Moderate density";
    if (perRU > 1000) classification = "High density";
    if (perRU > 2000) classification = "Extreme density";

    const metrics = [
      {
        label: "Heat Concentration per RU",
        value: perRU / 1000,
        displayValue: `${perRU.toFixed(0)} BTU/hr/RU`
      },
      {
        label: "Total Rack Heat Burden",
        value: kw / 8,
        displayValue: `${kw.toFixed(1)} kW`
      },
      {
        label: "Rack Height Constraint",
        value: 42 / ru,
        displayValue: `${ru.toFixed(0)} RU`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Heat Concentration per RU";

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.8
      });

      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Heat Concentration per RU";
    } else {
      const dominant = metrics.reduce((best, current) =>
        Number(current.value) > Number(best.value) ? current : best
      );
      dominantLabel = dominant.label;
      if (Number(dominant.value) > 1.8) status = "RISK";
      else if (Number(dominant.value) > 1.0) status = "WATCH";
    }

    const dominantConstraintMap = {
      "Heat Concentration per RU": "Heat concentration per RU",
      "Total Rack Heat Burden": "Total rack heat burden",
      "Rack Height Constraint": "Rack height constraint"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Heat concentration per RU";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      perRU,
      btu,
      ru
    );

    const guidance = buildGuidance(
      status,
      dominantConstraint,
      perRU,
      ru
    );

    const summaryRows = [
      { label: "Rack Load", value: `${kw.toFixed(2)} kW` },
      { label: "Rack Height", value: `${ru.toFixed(0)} RU` },
      { label: "Total Heat", value: `${btu.toFixed(0)} BTU/hr` }
    ];

    const derivedRows = [
      { label: "Heat per RU", value: `${perRU.toFixed(0)} BTU/hr/RU` },
      { label: "Density Class", value: classification },
      { label: "Thermal Basis", value: "Rack heat concentration" }
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
          rackKW: Number(kw.toFixed(2)),
          totalBTU: Number(btu.toFixed(0)),
          perRU: Number(perRU.toFixed(0)),
          classification,
          status,
          dominantConstraint
        }
      })
    );

    showContinue();
  }

  function reset() {
    els.kw.value = 8;
    els.ru.value = 42;
    clearStored();
    hideContinue();
    renderEmpty();
    renderFlowNote();
  }

  function bindInvalidation() {
    [els.kw, els.ru].forEach((el) => {
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
