(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "roaming-thresholds";

  const $ = id => document.getElementById(id);

  const els = {
    min: $("min"),
    pref: $("pref"),
    snr: $("snr"),
    band: $("band"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy"),
    flowNote: $("flow-note"),
    completionWrap: $("completion-wrap")
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

  function hideCompletion() {
    if (els.completionWrap) els.completionWrap.style.display = "none";
  }

  function showCompletion() {
    if (els.completionWrap) els.completionWrap.style.display = "";
  }

  function renderEmpty() {
    els.results.innerHTML = `<div class="muted">Enter values and press Suggest.</div>`;
    clearAnalysisBlock();
    hideCompletion();
  }

  function invalidate() {
    clearStored();
    hideCompletion();

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.invalidate === "function"
    ) {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        category: CATEGORY,
        step: STEP,
        emptyMessage: "Enter values and press Suggest."
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

    if (!saved || saved.category !== CATEGORY || saved.step !== "ptp-wireless-link") return;

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
          "PtP Wireless Link validated whether the path closes with enough SNR and throughput. Use this final step to translate that RF quality into practical roaming behavior for the WLAN.",
        customRows: [
          {
            label: "Link SNR",
            value: d.snr != null ? `${d.snr} dB` : "—"
          },
          {
            label: "Estimated Throughput",
            value: d.throughput != null ? `${d.throughput} Mbps` : "—"
          }
        ]
      });
      return;
    }

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Link SNR: <strong>${d.snr ?? "—"} dB</strong>,
      Throughput: <strong>${d.throughput ?? "—"} Mbps</strong>.
      Use this step to finalize roaming behavior across the network.
    `;
    els.flowNote.style.display = "";
  }

  function buildInterpretation(status, dominantConstraint, roamTrigger, stickyLow, targetSnr) {
    if (status === "HEALTHY") {
      return `The suggested thresholds land in a balanced zone where clients should be encouraged to leave weakening cells without forcing constant, jittery roaming behavior. This is a solid finishing point for a general enterprise WLAN design.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Roam aggressiveness pressure") {
        return `The main concern is how aggressively clients are being pushed to roam. The design may still work, but thresholds are now sharp enough that some devices could roam more often than desired if the environment is busy or uneven.`;
      }

      if (dominantConstraint === "Sticky client pressure") {
        return `The thresholds are starting to tolerate too much weak-signal behavior. The WLAN can still function, but some clients may hold onto a poor AP longer than is healthy for airtime efficiency.`;
      }

      return `Band preference is beginning to shape roaming behavior more strongly. The policy is still workable, but the combination of thresholds and steering may need closer validation across mixed clients.`;
    }

    if (dominantConstraint === "Roam aggressiveness pressure") {
      return `The design is pushing roaming too hard. Clients may be forced to transition before they have a stable next cell, which can create unnecessary roaming churn instead of improving user experience.`;
    }

    if (dominantConstraint === "Sticky client pressure") {
      return `The design is too permissive for weak-signal behavior. Sticky clients are likely to remain attached longer than they should, consuming more airtime and dragging down cell efficiency.`;
    }

    return `The threshold policy is now too dependent on band behavior rather than balanced RF decision points. It needs a more stable compromise between coverage, client behavior, and handoff timing.`;
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `The wireless v1 lane closes in a workable state. Use these thresholds as your starting policy and validate them against real client behavior during deployment.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Roam aggressiveness pressure") {
        return `Back off the roaming trigger slightly before broad deployment. The current settings are workable, but they may be too eager for mixed-client environments.`;
      }

      if (dominantConstraint === "Sticky client pressure") {
        return `Tighten the lower thresholds so weak clients are encouraged to move sooner. The current policy is starting to tolerate too much lingering on weak cells.`;
      }

      return `Validate band steering and threshold interaction in the field. The policy still works, but it is becoming more sensitive to client behavior differences.`;
    }

    if (dominantConstraint === "Roam aggressiveness pressure") {
      return `Reduce roaming aggressiveness before deployment. The current settings are likely to cause unnecessary transitions instead of smoother mobility.`;
    }

    if (dominantConstraint === "Sticky client pressure") {
      return `Raise the roaming discipline before deployment. The current settings allow too much weak-signal attachment to treat the design as comfortable.`;
    }

    return `Rebalance threshold and band preference strategy before rollout. The current roaming policy is too polarized to assume stable behavior across real devices.`;
  }

  function calculate() {
    const min = clamp(safeNumber(els.min.value, NaN), -90, -40);
    const pref = clamp(safeNumber(els.pref.value, NaN), -90, -40);
    const targetSnr = clamp(safeNumber(els.snr.value, NaN), 0, 80);
    const band = els.band.value;

    if (!Number.isFinite(min) || !Number.isFinite(pref) || !Number.isFinite(targetSnr)) {
      els.results.innerHTML = `
        <div class="result-row">
          <div class="result-label">Status</div>
          <div class="result-value">Invalid input</div>
        </div>
      `;
      clearAnalysisBlock();
      clearStored();
      hideCompletion();
      return;
    }

    const correctedPref = Math.max(min + 2, pref);
    const roamTrigger = min + 3;
    const stickyLow = min - 5;

    const bandText = band === "5" ? "Prefer 5/6 GHz" : "Allow 2.4 GHz";

    const interpretationText =
      roamTrigger > -65
        ? "Aggressive roaming thresholds will push clients to move quickly but may increase roaming events."
        : roamTrigger > -70
          ? "Balanced roaming thresholds suitable for most enterprise environments."
          : "Relaxed thresholds may cause sticky clients and delayed roaming.";

    const roamAggressivenessPressure =
      roamTrigger >= -62 ? 2.0 :
      roamTrigger >= -65 ? 1.4 :
      roamTrigger >= -68 ? 1.0 :
      0.8;

    const stickyClientPressure =
      stickyLow <= -75 ? 1.9 :
      stickyLow <= -72 ? 1.4 :
      stickyLow <= -70 ? 1.0 :
      0.8;

    const bandPolicyPressure =
      band === "5" ? 1.0 : 1.3;

    const metrics = [
      {
        label: "Roam aggressiveness pressure",
        value: roamAggressivenessPressure,
        displayValue: `${roamTrigger.toFixed(0)} dBm`
      },
      {
        label: "Sticky client pressure",
        value: stickyClientPressure,
        displayValue: `${stickyLow.toFixed(0)} dBm`
      },
      {
        label: "Band policy pressure",
        value: bandPolicyPressure,
        displayValue: bandText
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Roam aggressiveness pressure";

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
      dominantLabel = resolved?.dominant?.label || "Roam aggressiveness pressure";
    }

    const dominantConstraintMap = {
      "Roam aggressiveness pressure": "Roam aggressiveness pressure",
      "Sticky client pressure": "Sticky client pressure",
      "Band policy pressure": "Band policy pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Roam aggressiveness pressure";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      roamTrigger,
      stickyLow,
      targetSnr
    );

    const guidance = buildGuidance(status, dominantConstraint);

    const summaryRows = [
      { label: "Preferred RSSI", value: `${correctedPref.toFixed(0)} dBm` },
      { label: "Roam Trigger RSSI", value: `${roamTrigger.toFixed(0)} dBm` },
      { label: "Minimum Service RSSI", value: `${min.toFixed(0)} dBm` },
      { label: "Low-RSSI Cutoff", value: `${stickyLow.toFixed(0)} dBm` }
    ];

    const derivedRows = [
      { label: "Target SNR", value: `${targetSnr.toFixed(0)} dB` },
      { label: "Band Steering", value: bandText },
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
        roamTrigger: Number(roamTrigger.toFixed(0)),
        stickyLow: Number(stickyLow.toFixed(0)),
        preferredRssi: Number(correctedPref.toFixed(0)),
        targetSnr: Number(targetSnr.toFixed(0)),
        bandPreference: bandText,
        status,
        dominantConstraint
      }
    }));

    showCompletion();
  }

  function reset() {
    els.min.value = "-67";
    els.pref.value = "-60";
    els.snr.value = "25";
    els.band.value = "5";
    renderEmpty();
    clearStored();
    hideCompletion();
    loadPrior();
  }

  function bindInvalidation() {
    [els.min, els.pref, els.snr, els.band].forEach(el => {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    hideCompletion();
    loadPrior();
    renderEmpty();
    bindInvalidation();

    els.calc.onclick = calculate;
    els.reset.onclick = reset;
  }

  init();

  function hideCompletion() {
    if (els.completionWrap) els.completionWrap.style.display = "none";
  }

  function showCompletion() {
    if (els.completionWrap) els.completionWrap.style.display = "";
  }
})();
