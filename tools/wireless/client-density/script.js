(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "client-density";
  const NEXT_URL = "/tools/wireless/ap-capacity/";

  const $ = id => document.getElementById(id);

  const els = {
    w: $("w"),
    d: $("d"),
    clients: $("clients"),
    cpa: $("cpa"),
    factor: $("factor"),
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
    } else if (els.analysisCopy) {
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

    if (!saved || saved.category !== CATEGORY || saved.step !== "noise-floor-margin") return;

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
          "Noise Floor Margin estimated whether the RF environment is clean enough to support reliable client service. Use that signal quality context here to judge how aggressive your client loading should be.",
        customRows: [
          {
            label: "SNR",
            value: d.snr != null ? `${d.snr} dB` : "—"
          },
          {
            label: "Margin",
            value: d.margin != null ? `${d.margin} dB` : "—"
          }
        ]
      });
      return;
    }

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      SNR: <strong>${d.snr ?? "—"} dB</strong>,
      Margin: <strong>${d.margin ?? "—"} dB</strong>.
      Use this to determine realistic client loading expectations.
    `;
    els.flowNote.style.display = "";
  }

  function densityClass(density) {
    if (density < 0.01) return "Low density";
    if (density < 0.03) return "Moderate density";
    if (density < 0.06) return "High density";
    return "Very high density";
  }

  function buildInterpretation(status, dominantConstraint, density, adjusted, area) {
    if (status === "HEALTHY") {
      return `Client density remains in a manageable range for the modeled area, so the estimated AP count gives you a workable planning baseline. Coverage and client sharing are still reasonably balanced instead of being dominated by crowding.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Client crowding pressure") {
        return `The main issue is user concentration per unit area. The site can still be designed successfully, but AP count is now being driven more by crowding behavior than by simple geometric coverage.`;
      }

      if (dominantConstraint === "Per-AP loading pressure") {
        return `Target clients per AP is starting to carry more design risk. The plan can still work, but a small change in user behavior or session intensity could make the per-cell experience noticeably less stable.`;
      }

      return `Coverage factor is beginning to influence the AP count in a meaningful way. The design is no longer purely a density exercise — propagation assumptions are now helping shape the result.`;
    }

    if (dominantConstraint === "Client crowding pressure") {
      return `User density is high enough that crowding becomes the main design problem. Even if broad coverage is achievable, client contention and airtime sharing are likely to become the limiting factors first.`;
    }

    if (dominantConstraint === "Per-AP loading pressure") {
      return `The per-AP client target is too aggressive for the present user volume. The site may look covered on paper, but the client experience is likely to degrade before the footprint appears underbuilt.`;
    }

    return `Coverage assumptions are now exerting too much influence on the AP count. The design is becoming sensitive enough to propagation and cell-shape uncertainty that it needs more conservative planning margin.`;
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `Carry this AP count into AP Capacity, but keep some margin for uneven client clustering, roaming behavior, and peak user bursts.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Client crowding pressure") {
        return `Add density-focused AP capacity in the busiest zones rather than relying only on broad uniform coverage. User clustering is already influencing the design meaningfully.`;
      }

      if (dominantConstraint === "Per-AP loading pressure") {
        return `Use a more conservative clients-per-AP target before freezing the design. The current loading assumption is becoming optimistic for a real deployment.`;
      }

      return `Review the coverage factor before proceeding. The design is workable, but it is beginning to depend on more favorable coverage behavior than you may want to assume.`;
    }

    if (dominantConstraint === "Client crowding pressure") {
      return `Increase AP density or split the load across more cells before moving forward. Client crowding is now the dominant constraint.`;
    }

    if (dominantConstraint === "Per-AP loading pressure") {
      return `Reduce clients-per-AP expectations or raise the AP count before deployment. The current plan is leaning too hard on optimistic sharing.`;
    }

    return `Tighten the coverage assumption and add margin before continuing. The present AP count is too sensitive to coverage optimism to treat as comfortable.`;
  }

  function calculate() {
    const widthFt = clamp(safeNumber(els.w.value, NaN), 0, 1000000);
    const depthFt = clamp(safeNumber(els.d.value, NaN), 0, 1000000);
    const clients = clamp(safeNumber(els.clients.value, NaN), 0, 1000000);
    const cpa = clamp(safeNumber(els.cpa.value, NaN), 1, 1000000);
    const factor = clamp(safeNumber(els.factor.value, NaN), 0.5, 1.5);

    if (
      !Number.isFinite(widthFt) || widthFt <= 0 ||
      !Number.isFinite(depthFt) || depthFt <= 0 ||
      !Number.isFinite(clients) || clients <= 0 ||
      !Number.isFinite(cpa) || cpa <= 0 ||
      !Number.isFinite(factor)
    ) {
      els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      clearAnalysisBlock();
      hideContinue();
      clearStored();
      return;
    }

    const area = widthFt * depthFt;
    const baseAps = Math.max(1, Math.ceil(clients / Math.max(1, cpa)));
    const adjusted = Math.max(1, Math.ceil(baseAps * factor));
    const density = clients / Math.max(1, area);

    const densityLabel = densityClass(density);
    const interpretationText =
      density < 0.01
        ? "Low client density. Coverage will dominate over capacity."
        : density < 0.03
          ? "Moderate density. Balanced coverage and capacity design."
          : density < 0.06
            ? "High density. Capacity planning and airtime management are critical."
            : "Very high density. Expect contention-heavy environment requiring careful RF and AP tuning.";

    const clientCrowdingPressure = density / 0.03;
    const perApLoadingPressure = (clients / adjusted) / cpa;
    const coverageFactorPressure = factor / 1.0;

    const metrics = [
      {
        label: "Client crowding pressure",
        value: clientCrowdingPressure,
        displayValue: `${density.toFixed(4)} clients/sq ft`
      },
      {
        label: "Per-AP loading pressure",
        value: perApLoadingPressure,
        displayValue: `${(clients / adjusted).toFixed(1)} clients/AP`
      },
      {
        label: "Coverage factor pressure",
        value: coverageFactorPressure,
        displayValue: `${factor.toFixed(2)}×`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Client crowding pressure";

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
      dominantLabel = resolved?.dominant?.label || "Client crowding pressure";
    }

    const dominantConstraintMap = {
      "Client crowding pressure": "Client crowding pressure",
      "Per-AP loading pressure": "Per-AP loading pressure",
      "Coverage factor pressure": "Coverage factor pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Client crowding pressure";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      density,
      adjusted,
      area
    );

    const guidance = buildGuidance(status, dominantConstraint);

    const summaryRows = [
      { label: "Area", value: `${area.toFixed(0)} sq ft` },
      { label: "Client Density", value: `${density.toFixed(4)} clients/sq ft` },
      { label: "Base APs (clients/AP)", value: `${baseAps}` }
    ];

    const derivedRows = [
      { label: "Coverage Factor", value: `${factor.toFixed(2)}×` },
      { label: "Recommended AP Count", value: `${adjusted}` },
      { label: "Density Class", value: densityLabel },
      { label: "Planner Note", value: interpretationText }
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
      els.results.innerHTML = summaryRows.concat(derivedRows).map(row => `
        <div class="result-row">
          <div class="result-label">${row.label}</div>
          <div class="result-value">${row.value}</div>
        </div>
      `).join("");

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

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        area,
        density,
        densityClass: densityLabel,
        apCount: adjusted,
        clients,
        status,
        dominantConstraint
      }
    }));

    showContinue();
  }

  function reset() {
    els.w.value = 120;
    els.d.value = 80;
    els.clients.value = 200;
    els.cpa.value = 35;
    els.factor.value = 1.0;
    renderEmpty();
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation() {
    [els.w, els.d, els.clients, els.cpa, els.factor].forEach(el => {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    hideContinue();
    renderEmpty();
    loadPrior();
    bindInvalidation();

    els.calc.onclick = calculate;
    els.reset.onclick = reset;
    els.continueBtn.onclick = () => window.location.href = NEXT_URL;
  }

  init();
})();
