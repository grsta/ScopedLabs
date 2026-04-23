(() => {
  "use strict";

  const CATEGORY = "wireless";
  const STEP = "ptp-wireless-link";
  const PREVIOUS_STEP = "mesh-backhaul";
  const NEXT_URL = "/tools/wireless/roaming-thresholds/";
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
    dist: $("dist"),
    ghz: $("ghz"),
    tx: $("tx"),
    txg: $("txg"),
    rxg: $("rxg"),
    loss: $("loss"),
    noise: $("noise"),
    snr: $("snr"),
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
      <strong>Using Mesh Backhaul results:</strong><br>
      Effective Throughput: ${d.effective != null ? `${d.effective} Mbps` : "—"} | Mesh Hops: ${d.hops != null ? `${d.hops}` : "—"}
      <br><br>
      This step validates whether the longer PtP path still closes with enough signal and SNR margin to support the backhaul plan.
    `;
  }

  function fspl(distFt, ghz) {
    const dkm = (distFt * 0.3048) / 1000;
    const fmhz = ghz * 1000;
    return 32.44 + 20 * Math.log10(Math.max(1e-6, dkm)) + 20 * Math.log10(Math.max(1e-6, fmhz));
  }

  function throughputGuess(snr) {
    if (snr >= 35) return 700;
    if (snr >= 30) return 550;
    if (snr >= 25) return 400;
    if (snr >= 20) return 250;
    if (snr >= 15) return 120;
    return 50;
  }

  function viabilityLabel(margin) {
    if (margin >= 20) return "Strong";
    if (margin >= 10) return "Moderate";
    if (margin >= 0) return "Marginal";
    return "Failing";
  }

  function buildInterpretation(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `The PtP path closes with comfortable SNR margin, so the modeled link should have enough headroom to support stable service and realistic throughput under normal variation.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Path loss pressure") {
        return `Distance and frequency are starting to drive path loss high enough that the link is no longer especially forgiving. The path may still work, but it is becoming more sensitive to alignment and environmental change.`;
      }

      if (dominantConstraint === "Loss budget pressure") {
        return `System losses are starting to consume a meaningful share of the budget. The free-space path can still close, but practical implementation margin is thinning out.`;
      }

      return `SNR margin is getting tight enough that the link could swing noticeably under interference, weather, or installation variance. The design is workable, but not comfortably robust.`;
    }

    if (dominantConstraint === "Path loss pressure") {
      return `The propagation path itself is now the dominant problem. Distance and operating frequency are consuming too much of the available budget to treat the link as comfortable.`;
    }

    if (dominantConstraint === "Loss budget pressure") {
      return `Losses outside the ideal path are now too expensive. Even if the raw RF path looks viable, the practical implementation is too vulnerable to small additional losses.`;
    }

    return `SNR margin is too low for a comfortable PtP design. The link may occasionally pass traffic, but it is too fragile to assume stable real-world performance.`;
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `Carry this result into Roaming Thresholds, but keep some margin in reserve for weather, interference, and alignment variance so the link stays inside the modeled envelope.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Path loss pressure") {
        return `Shorten the path, reduce frequency burden, or improve antenna strategy before finalizing the design. Path loss is already influencing reliability materially.`;
      }

      if (dominantConstraint === "Loss budget pressure") {
        return `Reduce connector, cable, or implementation losses where possible. The budget is being squeezed by practical overhead more than it should be.`;
      }

      return `Increase margin before relying on this path for critical service. The design still works, but it is beginning to depend on favorable conditions.`;
    }

    if (dominantConstraint === "Path loss pressure") {
      return `Do not trust this path as comfortably viable without shortening distance, improving gain, or changing the RF plan.`;
    }

    if (dominantConstraint === "Loss budget pressure") {
      return `Rework the implementation loss budget before moving forward. The design is too sensitive to practical loss accumulation.`;
    }

    return `Increase received margin before deployment. The current PtP link budget is too fragile to treat as operationally safe.`;
  }

  function calculate() {
    const dist = clamp(safeNumber(els.dist.value, NaN), 0.1, 1000000);
    const ghz = clamp(safeNumber(els.ghz.value, NaN), 0.1, 100);
    const tx = clamp(safeNumber(els.tx.value, NaN), -50, 100);
    const txg = clamp(safeNumber(els.txg.value, NaN), -20, 100);
    const rxg = clamp(safeNumber(els.rxg.value, NaN), -20, 100);
    const loss = clamp(safeNumber(els.loss.value, NaN), 0, 200);
    const noise = clamp(safeNumber(els.noise.value, NaN), -140, 20);
    const target = clamp(safeNumber(els.snr.value, NaN), 0, 80);

    if (
      !Number.isFinite(dist) ||
      !Number.isFinite(ghz) ||
      !Number.isFinite(tx) ||
      !Number.isFinite(txg) ||
      !Number.isFinite(rxg) ||
      !Number.isFinite(loss) ||
      !Number.isFinite(noise) ||
      !Number.isFinite(target)
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
    const snr = rssi - noise;
    const margin = snr - target;
    const est = throughputGuess(snr);

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
      { label: "Estimated SNR", value: `${snr.toFixed(1)} dB` },
      { label: "Target SNR", value: `${target.toFixed(1)} dB` }
    ];

    const derivedRows = [
      { label: "SNR Margin", value: `${margin.toFixed(1)} dB (${viabilityLabel(margin)})` },
      { label: "Estimated Throughput", value: `~${est} Mbps` },
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
        axisTitle: "PtP Pressure",
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
          snr: Number(snr.toFixed(1)),
          margin: Number(margin.toFixed(1)),
          throughput: est,
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
    els.dist.value = "1500";
    els.ghz.value = "5.8";
    els.tx.value = "23";
    els.txg.value = "16";
    els.rxg.value = "16";
    els.loss.value = "4";
    els.noise.value = "-95";
    els.snr.value = "25";
    renderEmpty();
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation() {
    [els.dist, els.ghz, els.tx, els.txg, els.rxg, els.loss, els.noise, els.snr].forEach((el) => {
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
