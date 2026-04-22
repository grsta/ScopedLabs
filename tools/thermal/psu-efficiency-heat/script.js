(() => {
  "use strict";

  const CATEGORY = "thermal";
  const STEP = "psu-efficiency-heat";
  const PRIOR_STEP = "heat-load-estimator";
  const NEXT_URL = "/tools/thermal/btu-converter/";
  const LEGACY_STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const W_TO_BTU = 3.412141633;

  const FLOW_KEYS = {
    "heat-load-estimator": "scopedlabs:pipeline:thermal:heat-load-estimator",
    "psu-efficiency-heat": "scopedlabs:pipeline:thermal:psu-efficiency-heat",
    "btu-converter": "scopedlabs:pipeline:thermal:btu-converter",
    "rack-thermal-density": "scopedlabs:pipeline:thermal:rack-thermal-density",
    "airflow-requirement": "scopedlabs:pipeline:thermal:airflow-requirement",
    "fan-cfm-sizing": "scopedlabs:pipeline:thermal:fan-cfm-sizing",
    "hot-cold-aisle": "scopedlabs:pipeline:thermal:hot-cold-aisle",
    "ambient-rise": "scopedlabs:pipeline:thermal:ambient-rise",
    "exhaust-temperature": "scopedlabs:pipeline:thermal:exhaust-temperature",
    "room-cooling-capacity": "scopedlabs:pipeline:thermal:room-cooling-capacity"
  };

  const $ = (id) => document.getElementById(id);

  const els = {
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard"),
    load: $("load"),
    eff: $("eff"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  function safeNumber(value, fallback = 0) {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.safeNumber === "function") {
      return window.ScopedLabsAnalyzer.safeNumber(value, fallback);
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(value, min, max) {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.clamp === "function") {
      return window.ScopedLabsAnalyzer.clamp(value, min, max);
    }
    return Math.min(max, Math.max(min, value));
  }

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

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }

  function readSaved() {
    try {
      const primary = JSON.parse(sessionStorage.getItem(FLOW_KEYS[PRIOR_STEP]) || "null");
      if (primary && primary.category === CATEGORY && primary.step === PRIOR_STEP) {
        return primary;
      }
    } catch {}

    try {
      const legacy = JSON.parse(sessionStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      if (legacy && legacy.category === CATEGORY && legacy.step === PRIOR_STEP) {
        return legacy;
      }
    } catch {}

    return null;
  }

  function clearStored() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
    } catch {}
    try {
      const legacy = JSON.parse(sessionStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      if (legacy && legacy.category === CATEGORY && legacy.step === STEP) {
        sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {}
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
  }

  function renderEmpty() {
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function") {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
    } else if (els.analysisCopy) {
      els.analysisCopy.style.display = "none";
      els.analysisCopy.innerHTML = "";
    }
  }

  function renderFlowNote() {
    const saved = readSaved();

    if (!els.flowNote) return;

    if (!saved || saved.category !== CATEGORY || saved.step !== PRIOR_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    const data = saved.data || {};
    const heatLoadW = Number(data.heatLoadW);
    const heatLoadBtuHr = Number(data.heatLoadBtuHr);

    if (Number.isFinite(heatLoadW) && (!els.load.value || Number(els.load.value) === 800)) {
      els.load.value = String(Math.round(heatLoadW));
    }

    const parts = [];
    if (Number.isFinite(heatLoadW)) parts.push(`Working Heat Load: ${Math.round(heatLoadW)} W`);
    if (Number.isFinite(heatLoadBtuHr)) parts.push(`Thermal Output: ${Math.round(heatLoadBtuHr)} BTU/hr`);

    if (!parts.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Step 2 — Using Heat Load results:</strong><br>
      ${parts.join(" | ")}
      <br><br>
      This step adds the thermal penalty created by power-supply inefficiency so downstream airflow and cooling work from a more realistic heat basis.
    `;
  }

  function buildInterpretation(status, dominantConstraint, loss, effPct, load) {
    if (status === "HEALTHY") {
      return `PSU losses remain relatively modest for the current output load. Efficiency is high enough that the additional thermal burden is present but still manageable in the broader cooling design.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Efficiency penalty") {
        return `The main concern is the percentage of power lost through conversion inefficiency. Even with a reasonable load level, poorer PSU efficiency is now adding enough heat that it should be carried through the remaining thermal steps deliberately.`;
      }

      if (dominantConstraint === "Heat loss magnitude") {
        return `The absolute heat loss is large enough that it becomes a real input to rack and airflow planning rather than a minor correction. This is where efficiency losses stop being background noise and start affecting temperature behavior.`;
      }

      return `The combination of output load and PSU loss is beginning to matter thermally. The design can still work, but ignoring conversion losses from here would make downstream airflow and cooling assumptions too optimistic.`;
    }

    if (dominantConstraint === "Efficiency penalty") {
      return `PSU inefficiency is now a major thermal contributor. The system is spending enough power on conversion loss that the added heat becomes a first-order design input rather than a small correction factor.`;
    }

    if (dominantConstraint === "Heat loss magnitude") {
      return `The magnitude of wasted power is high enough to materially change the thermal profile of the system. In practice, this means airflow and cooling capacity sized only to output load would likely come up short.`;
    }

    return `High output load combined with conversion loss is creating a significant thermal burden. That raises operational risk because the wasted power is injected directly into the environment that the cooling system must now manage.`;
  }

  function buildGuidance(status, dominantConstraint, loss, effPct) {
    if (status === "HEALTHY") {
      return `Carry this loss value forward into BTU and airflow planning so the remaining pipeline reflects real conversion losses instead of idealized power delivery.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Efficiency penalty") {
        return `Confirm that the assumed PSU efficiency matches the actual operating range of the hardware. Small efficiency differences can create meaningful thermal changes once the system scales.`;
      }

      if (dominantConstraint === "Heat loss magnitude") {
        return `Include the full loss value in downstream cooling calculations and avoid sizing from output load alone. The thermal overhead is now large enough to influence design margin.`;
      }

      return `Keep this inefficiency load in the model and verify that all later steps use the same corrected heat basis. Mixed assumptions will make the final thermal picture look cleaner than reality.`;
    }

    if (effPct < 85) {
      return `Treat PSU efficiency as a thermal design issue, not just an electrical one. Improving conversion efficiency may reduce heat more cleanly than trying to absorb the penalty downstream with extra airflow alone.`;
    }

    return `Proceed using the corrected heat-loss value, but reassess the PSU assumptions if the resulting thermal burden feels excessive. At this level, conversion loss must be treated as part of the core cooling requirement.`;
  }

  function invalidate() {
    clearStored();

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.invalidate === "function") {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        category: CATEGORY,
        step: STEP,
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      renderEmpty();
    }

    hideContinue();
    renderFlowNote();
  }

  function calculate() {
    const loadRaw = safeNumber(els.load.value, NaN);
    const effPctRaw = safeNumber(els.eff.value, NaN);

    if (
      !Number.isFinite(loadRaw) ||
      !Number.isFinite(effPctRaw) ||
      loadRaw <= 0 ||
      effPctRaw <= 0 ||
      effPctRaw > 100
    ) {
      els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      hideContinue();
      clearStored();

      if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function") {
        window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
      }
      return;
    }

    const load = clamp(loadRaw, 0.1, 100000000);
    const effPct = clamp(effPctRaw, 1, 100);
    const eff = effPct / 100;

    const input = load / Math.max(0.01, eff);
    const loss = input - load;
    const btu = loss * W_TO_BTU;

    const metrics = [
      {
        label: "Heat Loss Magnitude",
        value: loss / 150,
        displayValue: `${loss.toFixed(0)} W`
      },
      {
        label: "Efficiency Penalty",
        value: (100 - effPct) / 8,
        displayValue: `${(100 - effPct).toFixed(1)}%`
      },
      {
        label: "Output Load Pressure",
        value: load / 2000,
        displayValue: `${load.toFixed(0)} W`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Heat Loss Magnitude";

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.resolveStatus === "function") {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.8
      });

      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Heat Loss Magnitude";
    } else {
      const dominant = metrics.reduce((best, current) =>
        Number(current.value) > Number(best.value) ? current : best
      );
      dominantLabel = dominant.label;
      if (Number(dominant.value) > 1.8) status = "RISK";
      else if (Number(dominant.value) > 1.0) status = "WATCH";
    }

    const dominantConstraintMap = {
      "Heat Loss Magnitude": "Heat loss magnitude",
      "Efficiency Penalty": "Efficiency penalty",
      "Output Load Pressure": "Output load pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Heat loss magnitude";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      loss,
      effPct,
      load
    );

    const guidance = buildGuidance(
      status,
      dominantConstraint,
      loss,
      effPct
    );

    const summaryRows = [
      { label: "Output Load", value: `${load.toFixed(0)} W` },
      { label: "PSU Efficiency", value: `${effPct.toFixed(1)}%` },
      { label: "PSU Input Power", value: `${input.toFixed(0)} W` }
    ];

    const derivedRows = [
      { label: "Heat Loss", value: `${loss.toFixed(0)} W` },
      { label: "Heat Loss", value: `${btu.toFixed(0)} BTU/hr` },
      { label: "Thermal Basis", value: "Conversion inefficiency added" }
    ];

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.renderOutput === "function") {
      window.ScopedLabsAnalyzer.renderOutput({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        summaryRows,
        derivedRows,
        status,
        interpretation,
        dominantConstraint,
        guidance,
        existingChartRef: null,
        existingWrapRef: null,
        chart: {
          labels: [
            "Heat Loss",
            "Efficiency Penalty",
            "Output Load"
          ],
          values: [
            Number((loss / 150).toFixed(2)),
            Number(((100 - effPct) / 8).toFixed(2)),
            Number((load / 2000).toFixed(2))
          ],
          displayValues: [
            `${loss.toFixed(0)} W`,
            `${(100 - effPct).toFixed(1)}%`,
            `${load.toFixed(0)} W`
          ],
          referenceValue: 1.0,
          healthyMax: 1.0,
          watchMax: 1.8,
          axisTitle: "PSU Loss Pressure",
          referenceLabel: "Comfort Band",
          healthyLabel: "Healthy",
          watchLabel: "Watch",
          riskLabel: "Risk",
          chartMax: Math.max(3, Number((loss / 150).toFixed(2)) + 0.5)
        }
      });
    }

    try {
      const payload = {
        category: CATEGORY,
        step: STEP,
        data: {
          outputLoadW: Number(load.toFixed(0)),
          inputPowerW: Number(input.toFixed(0)),
          heatLossW: Number(loss.toFixed(0)),
          heatLossBtuHr: Number(btu.toFixed(0)),
          efficiencyPct: Number(effPct.toFixed(1)),
          status,
          dominantConstraint
        }
      };

      sessionStorage.setItem(FLOW_KEYS[STEP], JSON.stringify(payload));
      sessionStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
    } catch {}

    showContinue();
  }

  function reset() {
    els.load.value = 800;
    els.eff.value = 92;
    clearStored();
    hideContinue();
    renderEmpty();
    renderFlowNote();
  }

  function bindInvalidation() {
    [els.load, els.eff].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function bind() {
    bindInvalidation();

    if (els.calc) els.calc.addEventListener("click", calculate);
    if (els.reset) els.reset.addEventListener("click", reset);
    if (els.continueBtn) {
      els.continueBtn.addEventListener("click", () => {
        window.location.href = NEXT_URL;
      });
    }
  }

  function boot() {
    hideContinue();
    renderFlowNote();
    renderEmpty();
    bind();

    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
  }

  window.addEventListener("DOMContentLoaded", () => {
    let unlocked = unlockCategoryPage();
    if (unlocked) boot();

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked && els.toolCard && !els.toolCard.dataset.initialized) {
        els.toolCard.dataset.initialized = "true";
        boot();
      }
    }, 400);
  });
})();
