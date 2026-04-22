(() => {
  "use strict";

  const CATEGORY = "wireless";
  const STEP = "noise-floor-margin";
  const PREVIOUS_STEP = "channel-overlap";
  const NEXT_URL = "/tools/wireless/client-density/";
  const LANE = "v1";

  const FLOW_KEYS = {
    "coverage-radius": "scopedlabs:pipeline:wireless:coverage-radius",
    "channel-overlap": "scopedlabs:pipeline:wireless:channel-overlap",
    "noise-floor-margin": "scopedlabs:pipeline:wireless:noise-floor-margin",
    "client-density": "scopedlabs:pipeline:wireless:client-density",
    "ap-capacity": "scopedlabs:pipeline:wireless:ap-capacity",
    "link-budget": "scopedlabs:pipeline:wireless:link-budget",
    "mesh-backhaul": "scopedlabs:pipeline:wireless:mesh-backhaul",
    "ptp-wireless-link": "scopedlabs:pipeline:wireless:ptp-wireless-link",
    "roaming-thresholds": "scopedlabs:pipeline:wireless:roaming-thresholds"
  };

  const LEGACY_STORAGE_KEY = "scopedlabs:pipeline:last-result";

  const $ = (id) => document.getElementById(id);

  const els = {
    sig: $("sig"),
    noise: $("noise"),
    target: $("target"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  let chartRef = { current: null };
  let chartWrapRef = { current: null };

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

  function safeNumber(value, fallback = NaN) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.safeNumber === "function"
    ) {
      return window.ScopedLabsAnalyzer.safeNumber(value, fallback);
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
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

  function clearAnalysisBlock() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function"
    ) {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
      return;
    }
    if (els.analysisCopy) {
      els.analysisCopy.style.display = "none";
      els.analysisCopy.innerHTML = "";
    }
  }

  function clearChart() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clearChart === "function"
    ) {
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
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    clearAnalysisBlock();
    clearChart();
  }

  function invalidate() {
    clearStored();
    hideContinue();

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.invalidate === "function"
    ) {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        category: CATEGORY,
        step: STEP,
        lane: LANE,
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      renderEmpty();
    }
  }

  function qualityLabel(snr) {
    if (snr >= 30) return "Excellent";
    if (snr >= 25) return "Good";
    if (snr >= 20) return "Fair";
    if (snr >= 15) return "Poor";
    return "Very Poor";
  }

  function readPreviousFlow() {
    try {
      const primary = JSON.parse(sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]) || "null");
      if (primary && primary.category === CATEGORY) return primary;
    } catch {}

    try {
      const legacy = JSON.parse(sessionStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      if (legacy && legacy.category === CATEGORY && legacy.step === PREVIOUS_STEP) return legacy;
    } catch {}

    return null;
  }

  function loadPrior() {
    if (!els.flowNote) return;

    const saved = readPreviousFlow();

    if (!saved) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    const d = saved.data || {};

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Using Channel Overlap results:</strong><br>
      Channel Reuse: ${d.averageReuse != null ? `${d.averageReuse}` : "—"} | Overlap Risk: ${d.overlapRiskPct != null ? `${d.overlapRiskPct}%` : "—"}
      <br><br>
      This step verifies whether the RF environment still has enough signal-to-noise margin to support stable performance after the channel plan is considered.
    `;
  }

  function buildInterpretation(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `RF margin remains in a comfortable range, so the environment should support stable client behavior without immediately collapsing into low-rate operation. This is a healthy foundation for the next density step.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Target fit pressure") {
        return `The main issue is how closely the current SNR tracks the actual target. The link may still work, but the design is no longer especially forgiving if interference or signal variance increases.`;
      }

      if (dominantConstraint === "Noise pressure") {
        return `The noise floor is starting to consume too much usable RF headroom. Even with acceptable signal, elevated noise is now compressing the performance margin enough to matter.`;
      }

      return `Signal strength is starting to become a limiting factor. The design is still workable, but it is beginning to depend on cleaner-than-average RF conditions to stay comfortable.`;
    }

    if (dominantConstraint === "Target fit pressure") {
      return `The present SNR is too close to — or below — the target threshold. The design is now too dependent on ideal conditions to assume reliable higher-rate performance.`;
    }

    if (dominantConstraint === "Noise pressure") {
      return `The environment is too noisy for a comfortable design. Even if clients remain associated, throughput and stability are likely to degrade because the RF floor is consuming too much margin.`;
    }

    return `Signal strength is too weak relative to the target. The RF path may still function intermittently, but it is now too fragile to treat as a comfortable design baseline.`;
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `Carry this result into Client Density, but keep some RF reserve for interference swings, crowding, and environmental change so the model stays true in the field.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Target fit pressure") {
        return `Increase margin before loading the design too aggressively. The current RF state is workable, but the headroom above the target is starting to get thin.`;
      }

      if (dominantConstraint === "Noise pressure") {
        return `Improve the RF environment or channel plan before relying on higher client density. The noise floor is already consuming too much of the practical budget.`;
      }

      return `Improve received signal or reduce client expectations before scale-up. The design is viable, but not especially tolerant of change.`;
    }

    if (dominantConstraint === "Target fit pressure") {
      return `Do not assume stable client performance until the SNR clears the target with more margin. Tighten the design before moving forward.`;
    }

    if (dominantConstraint === "Noise pressure") {
      return `Reduce environmental noise or change the RF plan before deployment. The design is too vulnerable to interference at the current margin.`;
    }

    return `Increase signal quality before relying on this design. The current link margin is too low to support comfortable operation under real-world variation.`;
  }

  function calculate() {
    const sig = safeNumber(els.sig.value, NaN);
    const noise = safeNumber(els.noise.value, NaN);
    const target = safeNumber(els.target.value, NaN);

    if (!Number.isFinite(sig) || !Number.isFinite(noise) || !Number.isFinite(target)) {
      els.results.innerHTML = `<div class="muted">Enter valid numeric values and press Calculate.</div>`;
      clearAnalysisBlock();
      hideContinue();
      clearStored();
      clearChart();
      return;
    }

    const snr = sig - noise;
    const margin = snr - target;

    let result = "MEETS TARGET";
    if (margin < 0) result = "BELOW TARGET";

    const targetFitPressure =
      margin >= 15 ? 0.7 :
      margin >= 5 ? 1.0 :
      margin >= 0 ? 1.6 :
      2.3;

    const noisePressure =
      noise <= -95 ? 0.7 :
      noise <= -90 ? 1.0 :
      noise <= -85 ? 1.6 :
      2.2;

    const signalPressure =
      sig >= -60 ? 0.7 :
      sig >= -67 ? 1.0 :
      sig >= -72 ? 1.6 :
      2.2;

    const metrics = [
      {
        label: "Target fit pressure",
        value: targetFitPressure,
        displayValue: `${margin.toFixed(1)} dB`
      },
      {
        label: "Noise pressure",
        value: noisePressure,
        displayValue: `${noise.toFixed(1)} dBm`
      },
      {
        label: "Signal pressure",
        value: signalPressure,
        displayValue: `${sig.toFixed(1)} dBm`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Target fit pressure";

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.5
      });
      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Target fit pressure";
    }

    const dominantConstraintMap = {
      "Target fit pressure": "Target fit pressure",
      "Noise pressure": "Noise pressure",
      "Signal pressure": "Signal pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Target fit pressure";

    const interpretation = buildInterpretation(status, dominantConstraint);
    const guidance = buildGuidance(status, dominantConstraint);

    const summaryRows = [
      { label: "Signal (RSSI)", value: `${sig.toFixed(1)} dBm` },
      { label: "Noise Floor", value: `${noise.toFixed(1)} dBm` },
      { label: "SNR", value: `${snr.toFixed(1)} dB (${qualityLabel(snr)})` },
      { label: "Target SNR", value: `${target.toFixed(1)} dB` }
    ];

    const derivedRows = [
      { label: "Margin", value: `${margin.toFixed(1)} dB` },
      { label: "Result", value: result }
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
      const fallbackRows = summaryRows.concat(derivedRows, [
        { label: "Engineering Interpretation", value: interpretation },
        { label: "Actionable Guidance", value: guidance }
      ]);

      els.results.innerHTML = fallbackRows.map((row) => `
        <div class="result-row">
          <div class="result-label">${row.label}</div>
          <div class="result-value">${row.value}</div>
        </div>
      `).join("");
    }

    clearChart();

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderAnalyzerChart === "function"
    ) {
      window.ScopedLabsAnalyzer.renderAnalyzerChart({
        mountEl: els.results,
        existingChartRef: chartRef,
        existingWrapRef: chartWrapRef,
        labels: ["Target Fit", "Noise Floor", "Signal Strength"],
        values: [targetFitPressure, noisePressure, signalPressure],
        displayValues: [
          `${margin.toFixed(1)} dB`,
          `${noise.toFixed(1)} dBm`,
          `${sig.toFixed(1)} dBm`
        ],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.5,
        axisTitle: "RF Margin Pressure",
        referenceLabel: "Healthy Threshold",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          3,
          Math.ceil(Math.max(targetFitPressure, noisePressure, signalPressure, 1.5) * 1.15 * 10) / 10
        )
      });
    }

    try {
      const payload = {
        category: CATEGORY,
        step: STEP,
        data: {
          snr: Number(snr.toFixed(1)),
          margin: Number(margin.toFixed(1)),
          status: result,
          dominantConstraint
        }
      };

      sessionStorage.setItem(FLOW_KEYS[STEP], JSON.stringify(payload));
      sessionStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
    } catch {}

    showContinue();
  }

  function reset() {
    els.sig.value = "-62";
    els.noise.value = "-95";
    els.target.value = "25";
    renderEmpty();
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation() {
    [els.sig, els.noise, els.target].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    hideContinue();
    loadPrior();
    renderEmpty();
    bindInvalidation();

    els.calc.addEventListener("click", calculate);
    els.reset.addEventListener("click", reset);
    els.continueBtn.addEventListener("click", () => window.location.href = NEXT_URL);
  }

  function boot() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
    init();
  }

  window.addEventListener("DOMContentLoaded", () => {
    const unlocked = unlockCategoryPage();
    if (!unlocked) return;
    boot();
  });
})();