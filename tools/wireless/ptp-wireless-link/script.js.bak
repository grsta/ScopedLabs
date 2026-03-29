(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "ptp-wireless-link";
  const NEXT_URL = "/tools/wireless/roaming-thresholds/";

  const $ = id => document.getElementById(id);

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
    continueBtn: $("continue")
  };

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

  function clearStored() {
    sessionStorage.removeItem(STORAGE_KEY);
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

  function renderEmpty() {
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    clearAnalysisBlock();
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
        continueWrapEl: els.continueWrap,
        continueBtnEl: els.continueBtn,
        category: CATEGORY,
        step: STEP,
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      renderEmpty();
    }
  }

  function loadPrior() {
    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";

    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch {}

    if (!saved || saved.category !== CATEGORY || saved.step !== "mesh-backhaul") return;

    const d = saved.data || {};

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
          "Mesh Backhaul estimated how much throughput survives relay penalties. Use this step to validate whether a longer PtP path still closes with enough signal and SNR margin.",
        customRows: [
          {
            label: "Effective throughput",
            value: d.effective != null ? `${d.effective} Mbps` : "—"
          },
          {
            label: "Mesh hops",
            value: d.hops != null ? `${d.hops}` : "—"
          }
        ]
      });
      return;
    }

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Effective Throughput: <strong>${d.effective ?? "—"} Mbps</strong>,
      Hops: <strong>${d.hops ?? "—"}</strong>.
      This step validates long-distance link viability.
    `;
    els.flowNote.style.display = "";
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

  function buildInterpretation(status, dominantConstraint, snr, margin, est) {
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

    const interpretation = buildInterpretation(status, dominantConstraint, snr, margin, est);
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

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        snr: Number(snr.toFixed(1)),
        margin: Number(margin.toFixed(1)),
        throughput: est,
        status: result,
        dominantConstraint
      }
    }));

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
    [els.dist, els.ghz, els.tx, els.txg, els.rxg, els.loss, els.noise, els.snr].forEach(el => {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    hideContinue();
    loadPrior();
    renderEmpty();
    bindInvalidation();

    els.calc.onclick = calculate;
    els.reset.onclick = reset;
    els.continueBtn.onclick = () => window.location.href = NEXT_URL;
  }

  init();
})();