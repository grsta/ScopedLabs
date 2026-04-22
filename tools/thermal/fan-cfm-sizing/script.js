(() => {
  "use strict";

  const CATEGORY = "thermal";
  const STEP = "fan-cfm-sizing";
  const PRIOR_STEP = "airflow-requirement";
  const NEXT_URL = "/tools/thermal/hot-cold-aisle/";
  const LEGACY_STORAGE_KEY = "scopedlabs:pipeline:last-result";

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
    req: $("req"),
    fan: $("fan"),
    derate: $("derate"),
    red: $("red"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysisCopy") || $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  let chartRef = { current: null };
  let chartWrapRef = { current: null };

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

  function clearAnalysisBlock() {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function") {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
    } else if (els.analysisCopy) {
      els.analysisCopy.style.display = "none";
      els.analysisCopy.innerHTML = "";
    }
  }

  function clearChart() {
    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.clearChart === "function") {
      window.ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
      return;
    }

    if (chartRef.current) {
      try { chartRef.current.destroy(); } catch {}
      chartRef.current = null;
    }

    if (chartWrapRef.current && chartWrapRef.current.parentNode) {
      chartWrapRef.current.parentNode.removeChild(chartWrapRef.current);
      chartWrapRef.current = null;
    }
  }

  function renderEmpty() {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    }
    clearAnalysisBlock();
    clearChart();
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
    const airflowCFM = Number(data.airflowCFM);
    const status = data.status || data.classification;

    if (Number.isFinite(airflowCFM) && (!els.req.value || Number(els.req.value) === 800)) {
      els.req.value = String(Math.round(airflowCFM));
    }

    const parts = [];
    if (Number.isFinite(airflowCFM)) parts.push(`Required Airflow: ${Math.round(airflowCFM)} CFM`);
    if (status) parts.push(`Condition: ${status}`);

    if (!parts.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Step 6 — Using Airflow Requirement results:</strong><br>
      ${parts.join(" | ")}
      <br><br>
      This step converts airflow demand into real fan count after derating for restriction and adding optional redundancy.
    `;
  }

  function buildInterpretation(status, dominantConstraint, totalFans, marginPct, deratePct) {
    if (status === "HEALTHY") {
      return `Fan sizing is in a workable range. Required airflow is being met with reasonable hardware count, and the current derating assumption still leaves usable delivery margin for normal restriction losses.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Fan bank complexity") {
        return `The airflow target is achievable, but the fan count is starting to become a system-management issue. More fans can solve the thermal problem, but they also raise wiring, noise, failure-point, and maintenance complexity.`;
      }

      if (dominantConstraint === "Restriction derating") {
        return `The design is being driven mainly by airflow loss through restriction. That means the real limiter is not just raw fan rating, but how much usable CFM survives after grills, filters, panel impedance, or cabinet losses.`;
      }

      return `Delivered airflow margin is becoming tight. The model still closes, but small real-world losses can erase the remaining headroom and push the system into an under-cooled condition.`;
    }

    if (dominantConstraint === "Delivered airflow margin") {
      return `The fan bank is too tight against required airflow. On paper the count may close, but the design leaves too little real delivery margin once restriction, fan tolerance, and aging are taken into account.`;
    }

    if (dominantConstraint === "Restriction derating") {
      return `Restriction loss is now the dominant problem. The first thing that fails in the field is usually not the fan label rating—it is the mismatch between free-air CFM and actual installed airflow through a restricted path.`;
    }

    return `Fan count has climbed into a high-complexity range. Even if airflow is technically available, the hardware burden itself becomes a design risk because coordination, power draw, acoustics, and failure handling all get harder to manage.`;
  }

  function buildGuidance(status, dominantConstraint, marginPct, totalFans) {
    if (status === "HEALTHY") {
      return `Carry this fan-bank sizing forward, but verify that the selected fan model can still deliver the assumed effective CFM at real system impedance instead of free-air rating alone.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Restriction derating") {
        return `Reduce path resistance before adding more fans where possible. Better intake and exhaust geometry often improves usable airflow more efficiently than stacking additional fan count.`;
      }

      if (dominantConstraint === "Delivered airflow margin") {
        return `Increase delivery margin before locking the design. Even a modest increase in effective CFM per fan can materially improve thermal resilience.`;
      }

      return `Review whether the airflow target can be met with fewer, higher-performance fans or with lower restriction. This range is still workable, but complexity is beginning to cost you margin.`;
    }

    if (dominantConstraint === "Delivered airflow margin") {
      return `Increase effective delivered CFM before moving forward. The design needs more real airflow margin, not just a nominal match to required CFM.`;
    }

    if (dominantConstraint === "Restriction derating") {
      return `Treat airflow path cleanup as a primary fix. Derating is consuming too much usable capacity, so fan selection alone is unlikely to solve the installed-performance problem cleanly.`;
    }

    return `Rework the fan strategy before proceeding. Reduce complexity, increase per-fan usable airflow, or lower restriction so the system does not depend on an overly dense fan bank to remain stable.`;
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

    clearChart();
    hideContinue();
    renderFlowNote();
  }

  function calculate() {
    const reqRaw = safeNumber(els.req.value, NaN);
    const fanRaw = safeNumber(els.fan.value, NaN);
    const deratePctRaw = safeNumber(els.derate.value, NaN);
    const redundancy = safeNumber(els.red.value, 0);

    if (
      !Number.isFinite(reqRaw) || reqRaw <= 0 ||
      !Number.isFinite(fanRaw) || fanRaw <= 0 ||
      !Number.isFinite(deratePctRaw) || deratePctRaw < 0
    ) {
      if (els.results) {
        els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      }
      clearAnalysisBlock();
      hideContinue();
      clearStored();
      clearChart();
      return;
    }

    const req = clamp(reqRaw, 0.1, 1000000);
    const fan = clamp(fanRaw, 0.1, 1000000);
    const deratePct = clamp(deratePctRaw, 0, 95);
    const derate = deratePct / 100;

    const effFan = fan * (1 - derate);
    const baseFans = Math.max(1, Math.ceil(req / Math.max(1, effFan)));
    const totalFans = baseFans + redundancy;
    const provided = totalFans * effFan;
    const marginPct = ((provided - req) / req) * 100;

    let sizingOutcome = "Adequate";
    if (marginPct < 5) sizingOutcome = "Tight";
    if (marginPct > 25) sizingOutcome = "Overbuilt";

    const deliveryPressure = clamp(1.2 - (marginPct / 40), 0.25, 2.5);
    const restrictionPressure = clamp(deratePct / 20, 0.1, 3);
    const complexityPressure = clamp(totalFans / 6, 0.1, 3);

    const metrics = [
      {
        label: "Delivered Airflow Margin",
        value: deliveryPressure,
        displayValue: `${marginPct.toFixed(1)}% margin`
      },
      {
        label: "Restriction Derating",
        value: restrictionPressure,
        displayValue: `${deratePct.toFixed(0)}%`
      },
      {
        label: "Fan Bank Complexity",
        value: complexityPressure,
        displayValue: `${totalFans} fans`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Delivered Airflow Margin";

    if (window.ScopedLabsAnalyzer && typeof window.ScopedLabsAnalyzer.resolveStatus === "function") {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.6
      });

      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Delivered Airflow Margin";
    } else {
      const dominant = metrics.reduce((best, current) =>
        Number(current.value) > Number(best.value) ? current : best
      );
      dominantLabel = dominant.label;
      if (Number(dominant.value) > 1.6) status = "RISK";
      else if (Number(dominant.value) > 1.0) status = "WATCH";
    }

    const dominantConstraintMap = {
      "Delivered Airflow Margin": "Delivered airflow margin",
      "Restriction Derating": "Restriction derating",
      "Fan Bank Complexity": "Fan bank complexity"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Delivered airflow margin";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      totalFans,
      marginPct,
      deratePct
    );

    const guidance = buildGuidance(
      status,
      dominantConstraint,
      marginPct,
      totalFans
    );

    const summaryRows = [
      { label: "Required Airflow", value: `${req.toFixed(0)} CFM` },
      { label: "Fan Rated CFM", value: `${fan.toFixed(0)} CFM each` },
      { label: "Restriction Derate", value: `${deratePct.toFixed(0)}%` },
      { label: "Redundancy", value: redundancy ? `N+${redundancy}` : "None" }
    ];

    const derivedRows = [
      { label: "Effective CFM per Fan", value: `${effFan.toFixed(1)} CFM` },
      { label: "Base Fans Needed", value: `${baseFans}` },
      { label: "Total Fans", value: `${totalFans}` },
      { label: "Provided Airflow", value: `${provided.toFixed(0)} CFM` },
      { label: "Airflow Margin", value: `${marginPct.toFixed(1)}%` },
      { label: "Sizing Outcome", value: sizingOutcome }
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
        existingChartRef: chartRef,
        existingWrapRef: chartWrapRef,
        chart: {
          labels: [
            "Delivery Margin",
            "Restriction Loss",
            "Fan Complexity"
          ],
          values: [
            deliveryPressure,
            restrictionPressure,
            complexityPressure
          ],
          displayValues: [
            `${marginPct.toFixed(1)}% margin`,
            `${deratePct.toFixed(0)}%`,
            `${totalFans} fans`
          ],
          referenceValue: 1.0,
          healthyMax: 1.0,
          watchMax: 1.6,
          axisTitle: "Fan Sizing Pressure",
          referenceLabel: "Healthy Threshold",
          healthyLabel: "Healthy",
          watchLabel: "Watch",
          riskLabel: "Risk",
          chartMax: Math.max(
            2.4,
            Math.ceil(Math.max(deliveryPressure, restrictionPressure, complexityPressure, 1.6) * 1.15 * 10) / 10
          )
        }
      });
    }

    try {
      const payload = {
        category: CATEGORY,
        step: STEP,
        data: {
          requiredCFM: req,
          effectiveCFMPerFan: effFan,
          totalFans,
          providedCFM: provided,
          airflowMarginPct: marginPct,
          classification: status,
          sizingOutcome,
          dominantConstraint
        }
      };

      sessionStorage.setItem(FLOW_KEYS[STEP], JSON.stringify(payload));
      sessionStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
    } catch {}

    showContinue();
  }

  function reset() {
    els.req.value = 800;
    els.fan.value = 120;
    els.derate.value = 25;
    els.red.value = "0";
    clearStored();
    hideContinue();
    renderEmpty();
    renderFlowNote();
  }

  function bindInvalidation() {
    [els.req, els.fan, els.derate, els.red].forEach((el) => {
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
    bind();
    hideContinue();
    renderEmpty();
    renderFlowNote();
    invalidate();

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
