(() => {
  "use strict";

  const CATEGORY = "wireless";
  const STEP = "link-budget";
  const PREVIOUS_STEP = "ap-capacity";
  const NEXT_URL = "/tools/wireless/mesh-backhaul/";
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
    ghz: $("ghz"),
    dist: $("dist"),
    tx: $("tx"),
    txg: $("txg"),
    rxg: $("rxg"),
    loss: $("loss"),
    sens: $("sens"),
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

    clearChart();
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
      <strong>Using AP Capacity results:</strong><br>
      Recommended APs: ${
        d.recommended != null ? String(d.recommended) :
        d.recommendedApCount != null ? String(d.recommendedApCount) : "—"
      } | Throughput Demand: ${
        d.totalDemand != null ? `${Number(d.totalDemand).toFixed(1)} Mbps` :
        d.totalDemandMbps != null ? `${Number(d.totalDemandMbps).toFixed(1)} Mbps` : "—"
      }
      <br><br>
      This step verifies whether the modeled RF path still has enough received signal and margin to support the capacity plan built in the prior step.
    `;
  }

  function fspl(distFt, ghz) {
    const dkm = (distFt * 0.3048) / 1000;
    const fmhz = ghz * 1000;
    return 32.44 + 20 * Math.log10(Math.max(1e-6, dkm)) + 20 * Math.log10(Math.max(1e-6, fmhz));
  }

  function buildInterpretation(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `The modeled link margin remains in a comfortable range, so the planned RF path should tolerate normal environmental variation without immediately threatening service quality.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Path loss pressure") {
        return `Distance and frequency are starting to push the path loss high enough that the link is no longer especially forgiving. The design may still work, but it is beginning to depend on cleaner-than-average conditions.`;
      }

      if (dominantConstraint === "Loss budget pressure") {
        return `Additional system losses are starting to consume a meaningful share of the budget. The link can still close, but the design now has less protection against real-world installation imperfections.`;
      }

      return `Receiver margin is becoming tight enough that the path may fluctuate under interference, obstruction, or environmental change. The design is still workable, but no longer comfortably robust.`;
    }

    if (dominantConstraint === "Path loss pressure") {
      return `The propagation path itself is now the main problem. Distance and operating frequency are consuming too much of the budget, so the link is becoming fragile before other variables even get involved.`;
    }

    if (dominantConstraint === "Loss budget pressure") {
      return `System losses are eating too much of the available budget. Even if the basic free-space path looks possible, the practical implementation is now too vulnerable to small additional losses.`;
    }

    return `Link margin is too low for a comfortable design. Even if the path occasionally works, the RF budget is now too tight to assume stable service under normal real-world variation.`;
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `Carry this result into Mesh Backhaul, but keep some margin in reserve for fading, obstruction changes, and installation variance.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Path loss pressure") {
        return `Shorten the path, reduce frequency burden, or improve antenna strategy before freezing the design. The path loss is becoming influential enough to matter.`;
      }

      if (dominantConstraint === "Loss budget pressure") {
        return `Reduce cable, connector, or miscellaneous loss assumptions where possible. The link budget is being squeezed by implementation overhead more than it should be.`;
      }

      return `Increase margin before relying on this link for critical service. The design is workable, but it is beginning to depend on favorable conditions.`;
    }

    if (dominantConstraint === "Path loss pressure") {
      return `Do not trust this path as comfortably viable without shortening distance, changing RF assumptions, or increasing usable gain.`;
    }

    if (dominantConstraint === "Loss budget pressure") {
      return `Rework the implementation loss budget before moving forward. The design is too sensitive to practical loss accumulation.`;
    }

    return `Increase received margin before deployment. The current link budget is too fragile to treat as operationally safe.`;
  }

  function calculate() {
    const ghz = clamp(safeNumber(els.ghz.value, NaN), 0.1, 100);
    const dist = clamp(safeNumber(els.dist.value, NaN), 0.1, 1000000);
    const tx = clamp(safeNumber(els.tx.value, NaN), -50, 100);
    const txg = clamp(safeNumber(els.txg.value, NaN), -20, 100);
    const rxg = clamp(safeNumber(els.rxg.value, NaN), -20, 100);
    const loss = clamp(safeNumber(els.loss.value, NaN), 0, 200);
    const sens = clamp(safeNumber(els.sens.value, NaN), -120, 20);

    if (
      !Number.isFinite(ghz) ||
      !Number.isFinite(dist) ||
      !Number.isFinite(tx) ||
      !Number.isFinite(txg) ||
      !Number.isFinite(rxg) ||
      !Number.isFinite(loss) ||
      !Number.isFinite(sens)
    ) {
      els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      clearAnalysisBlock();
      hideContinue();
      clearStored();
      clearChart();
      return;
    }

    const path = fspl(dist, ghz);
    const rssi = tx + txg + rxg - path - loss;
    const margin = rssi - sens;

    let result = "OK";
    if (margin < 10) result = "MARGINAL";
    if (margin < 0) result = "FAIL";

    const pathLossPressure = path / 110;
    const lossBudgetPressure = Math.max(0.2, loss / 5);
    const marginPressure =
      margin >= 20 ? 0.7 :
      margin >= 10 ? 1.0 :
      margin >= 0 ? 1.6 :
      2.3;

    const metrics = [
      {
        label: "Path loss pressure",
        value: pathLossPressure,
        displayValue: `${path.toFixed(1)} dB`
      },
      {
        label: "Loss budget pressure",
        value: lossBudgetPressure,
        displayValue: `${loss.toFixed(1)} dB`
      },
      {
        label: "Margin pressure",
        value: marginPressure,
        displayValue: `${margin.toFixed(1)} dB`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Path loss pressure";

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
      dominantLabel = resolved?.dominant?.label || "Path loss pressure";
    }

    const dominantConstraintMap = {
      "Path loss pressure": "Path loss pressure",
      "Loss budget pressure": "Loss budget pressure",
      "Margin pressure": "Margin pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Path loss pressure";

    const interpretation = buildInterpretation(status, dominantConstraint);
    const guidance = buildGuidance(status, dominantConstraint);

    const summaryRows = [
      { label: "FSPL", value: `${path.toFixed(1)} dB` },
      { label: "Estimated RSSI", value: `${rssi.toFixed(1)} dBm` },
      { label: "Receiver Sensitivity", value: `${sens.toFixed(1)} dBm` },
      { label: "Link Margin", value: `${margin.toFixed(1)} dB` }
    ];

    const derivedRows = [
      { label: "Result", value: result },
      { label: "Planning Basis", value: "Free-space path loss estimate" }
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
        labels: ["Path Loss", "System Losses", "Margin Pressure"],
        values: [pathLossPressure, lossBudgetPressure, marginPressure],
        displayValues: [
          `${path.toFixed(1)} dB`,
          `${loss.toFixed(1)} dB`,
          `${margin.toFixed(1)} dB`
        ],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.5,
        axisTitle: "Link Pressure",
        referenceLabel: "Healthy Threshold",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          3,
          Math.ceil(Math.max(pathLossPressure, lossBudgetPressure, marginPressure, 1.5) * 1.15 * 10) / 10
        )
      });
    }

    try {
      const payload = {
        category: CATEGORY,
        step: STEP,
        data: {
          rssi: Number(rssi.toFixed(1)),
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
    els.ghz.value = "5.0";
    els.dist.value = "300";
    els.tx.value = "20";
    els.txg.value = "3";
    els.rxg.value = "3";
    els.loss.value = "5";
    els.sens.value = "-67";
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    clearAnalysisBlock();
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation() {
    [els.ghz, els.dist, els.tx, els.txg, els.rxg, els.loss, els.sens].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    hideContinue();
    loadPrior();
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
