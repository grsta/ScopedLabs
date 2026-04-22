(() => {
  "use strict";

  const CATEGORY = "wireless";
  const STEP = "coverage-radius";
  const NEXT_URL = "/tools/wireless/channel-overlap/";
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

  const BAND_BASE_LOSS = {
    "2.4": 40,
    "5": 47,
    "6": 50
  };

  const ENVIRONMENT_LOSS = {
    open: 0,
    office: 10,
    dense: 18
  };

  const CLIENT_MARGIN = {
    robust: 0,
    typical: 4,
    weak: 8
  };

  const els = {
    band: document.getElementById("band"),
    environment: document.getElementById("environment"),
    eirp: document.getElementById("eirp"),
    targetRssi: document.getElementById("targetRssi"),
    clientClass: document.getElementById("clientClass"),
    calc: document.getElementById("calc"),
    reset: document.getElementById("reset"),
    results: document.getElementById("results"),
    analysisCopy: document.getElementById("analysis-copy"),
    flowNote: document.getElementById("flow-note"),
    continueWrap: document.getElementById("continue-wrap"),
    continueBtn: document.getElementById("continue")
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
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
  }

  function clearWirelessPipelineState() {
    try {
      Object.values(FLOW_KEYS).forEach((key) => sessionStorage.removeItem(key));
      sessionStorage.removeItem(LEGACY_STORAGE_KEY);
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

  function renderEmpty() {
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    clearAnalysisBlock();
  }

  function renderFlowNote() {
    if (!els.flowNote) return;
    els.flowNote.hidden = true;
    els.flowNote.innerHTML = "";
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      const legacy = JSON.parse(sessionStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      if (legacy && legacy.category === CATEGORY && legacy.step === STEP) {
        sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {}

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

  function getBandLabel(value) {
    if (value === "2.4") return "2.4 GHz";
    if (value === "5") return "5 GHz";
    if (value === "6") return "6 GHz";
    return value;
  }

  function getEnvironmentLabel(value) {
    if (value === "open") return "Open / Low Obstruction";
    if (value === "office") return "Office / Light Partitioning";
    if (value === "dense") return "Dense Interior / Heavy Obstruction";
    return value;
  }

  function getClientLabel(value) {
    if (value === "robust") return "Robust / Laptop";
    if (value === "typical") return "Typical Mixed Clients";
    if (value === "weak") return "Weak / Small Mobile Devices";
    return value;
  }

  function classifyRadius(radiusFt) {
    if (radiusFt < 35) return "Tight cell";
    if (radiusFt < 60) return "Moderate cell";
    return "Broad cell";
  }

  function buildInterpretation({ band, environment, clientClass, radiusFt, targetRssi }) {
    const bandText =
      band === "2.4"
        ? "2.4 GHz gives the longest reach, but larger cells usually come with more overlap and more interference pressure."
        : band === "5"
          ? "5 GHz usually lands in the practical middle ground for enterprise Wi-Fi because it balances coverage and cleaner reuse."
          : "6 GHz favors cleaner spectrum and better high-performance design, but the coverage footprint is usually tighter.";

    const envText =
      environment === "open"
        ? "Open areas can support larger planning cells, but that wider reach can make channel reuse harder if you overextend coverage."
        : environment === "office"
          ? "Office-style partitioning tends to break cells up unevenly, so this should be treated as a planning estimate rather than a guaranteed radius."
          : "Dense interiors usually demand much tighter AP spacing because walls, shelving, and obstruction stacks collapse edge performance fast.";

    const clientText =
      clientClass === "weak"
        ? "Because weaker client devices usually transmit and receive worse than the AP, the practical edge should be treated conservatively."
        : clientClass === "robust"
          ? "Stronger client assumptions can stretch a design on paper, but it is still wise to validate edge behavior against real mixed-device conditions."
          : "A mixed-client assumption is a good baseline for real deployments where phones, tablets, and laptops all share airtime.";

    const rssiText =
      targetRssi >= -65
        ? "Your RSSI target is fairly strong, which supports better edge performance but forces a smaller usable cell."
        : targetRssi <= -72
          ? "Your RSSI target is loose, which expands radius, but clients at the edge are more likely to fall into lower data rates and consume more airtime."
          : "Your RSSI target is in a practical planning range for general coverage modeling.";

    const classText =
      radiusFt < 35
        ? "This points toward a dense design where AP count will rise, but capacity and roaming behavior usually improve."
        : radiusFt < 60
          ? "This is a balanced planning result that should transition cleanly into AP count and capacity modeling."
          : "This is a broad planning cell, which may reduce AP count on paper, but it can also hide future problems with contention, overlap, and client edge quality.";

    return `${bandText} ${envText} ${clientText} ${rssiText} ${classText}`;
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `Carry this cell radius into Channel Overlap, but keep transmit power and placement disciplined so the broader cell does not quietly turn into a reuse problem.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Coverage sprawl pressure") {
        return `Tighten AP spacing or reduce cell ambition before moving forward. The design is still workable, but the footprint is getting broad enough that overlap and edge quality deserve caution.`;
      }

      if (dominantConstraint === "Client sensitivity pressure") {
        return `Keep the edge budget conservative before continuing. Weaker or mixed-client assumptions are already shrinking the practical cell enough that overconfidence would be risky.`;
      }

      return `Use a stronger edge target or tighter environment assumption before freezing the layout. The current radius is workable, but it is no longer especially forgiving.`;
    }

    if (dominantConstraint === "Coverage sprawl pressure") {
      return `Reduce the planned cell size before trusting the wider layout. The current radius is broad enough that reuse and edge instability are likely to become the next problems.`;
    }

    if (dominantConstraint === "Client sensitivity pressure") {
      return `Plan for the weakest clients, not the strongest ones. The design is too sensitive to client quality assumptions to rely on optimistic edge behavior.`;
    }

    return `Use a more conservative RSSI target or denser layout before continuing. The current edge assumption is too loose to treat as comfortable.`;
  }

  function calculate() {
    const band = els.band.value;
    const environment = els.environment.value;
    const eirp = safeNumber(els.eirp.value, NaN);
    const targetRssi = safeNumber(els.targetRssi.value, NaN);
    const clientClass = els.clientClass.value;

    if (!Number.isFinite(eirp) || !Number.isFinite(targetRssi)) {
      els.results.innerHTML = `<div class="muted">Enter valid numeric values and press Calculate.</div>`;
      clearAnalysisBlock();
      hideContinue();
      return;
    }

    const boundedEirp = clamp(eirp, 1, 50);
    const boundedTarget = clamp(targetRssi, -90, -40);

    const availablePathLoss =
      boundedEirp - boundedTarget - ENVIRONMENT_LOSS[environment] - CLIENT_MARGIN[clientClass];

    let radiusFt = Math.pow(10, (availablePathLoss - BAND_BASE_LOSS[band]) / 20);
    if (!Number.isFinite(radiusFt) || radiusFt <= 0) radiusFt = 1;

    const diameterFt = radiusFt * 2;
    const cellAreaSqFt = Math.PI * radiusFt * radiusFt;
    const coverageClass = classifyRadius(radiusFt);

    const coverageSprawlPressure = radiusFt / 60;
    const clientSensitivityPressure = (CLIENT_MARGIN[clientClass] + 2) / 6;
    const edgeRssiPressure =
      boundedTarget <= -72 ? 1.7 :
      boundedTarget <= -70 ? 1.3 :
      boundedTarget <= -67 ? 1.0 :
      0.8;

    const metrics = [
      {
        label: "Coverage sprawl pressure",
        value: coverageSprawlPressure,
        displayValue: `${radiusFt.toFixed(1)} ft`
      },
      {
        label: "Client sensitivity pressure",
        value: clientSensitivityPressure,
        displayValue: getClientLabel(clientClass)
      },
      {
        label: "Edge RSSI pressure",
        value: edgeRssiPressure,
        displayValue: `${boundedTarget} dBm`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Coverage sprawl pressure";

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
      dominantLabel = resolved?.dominant?.label || "Coverage sprawl pressure";
    }

    const dominantConstraintMap = {
      "Coverage sprawl pressure": "Coverage sprawl pressure",
      "Client sensitivity pressure": "Client sensitivity pressure",
      "Edge RSSI pressure": "Edge RSSI pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Coverage sprawl pressure";

    const interpretation = buildInterpretation({
      band,
      environment,
      clientClass,
      radiusFt,
      targetRssi: boundedTarget
    });

    const guidance = buildGuidance(status, dominantConstraint);

    const summaryRows = [
      { label: "Band", value: getBandLabel(band) },
      { label: "Environment", value: getEnvironmentLabel(environment) },
      { label: "Client Class", value: getClientLabel(clientClass) },
      { label: "AP EIRP / Target RSSI", value: `${boundedEirp.toFixed(0)} dBm / ${boundedTarget.toFixed(0)} dBm` }
    ];

    const derivedRows = [
      { label: "Estimated Radius", value: `${radiusFt.toFixed(1)} ft` },
      { label: "Estimated Diameter", value: `${diameterFt.toFixed(1)} ft` },
      { label: "Estimated Cell Area", value: `${cellAreaSqFt.toFixed(0)} sq ft` },
      { label: "Coverage Class", value: coverageClass }
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

    try {
      const payload = {
        category: CATEGORY,
        step: STEP,
        data: {
          band,
          bandLabel: getBandLabel(band),
          environment,
          environmentLabel: getEnvironmentLabel(environment),
          eirpDbm: boundedEirp,
          targetRssiDbm: boundedTarget,
          clientClass,
          clientClassLabel: getClientLabel(clientClass),
          estimatedRadiusFt: Number(radiusFt.toFixed(1)),
          estimatedDiameterFt: Number(diameterFt.toFixed(1)),
          estimatedCellAreaSqFt: Number(cellAreaSqFt.toFixed(0)),
          coverageClass,
          status,
          dominantConstraint
        }
      };

      sessionStorage.setItem(FLOW_KEYS[STEP], JSON.stringify(payload));
      sessionStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
    } catch {}

    showContinue();
  }

  function resetForm() {
    els.band.value = "5";
    els.environment.value = "office";
    els.eirp.value = "23";
    els.targetRssi.value = "-67";
    els.clientClass.value = "typical";

    clearWirelessPipelineState();
    hideContinue();
    renderEmpty();
    renderFlowNote();
  }

  function bindInvalidation() {
    [els.band, els.environment, els.eirp, els.targetRssi, els.clientClass].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function bindActions() {
    els.calc.addEventListener("click", calculate);
    els.reset.addEventListener("click", resetForm);
    els.continueBtn.addEventListener("click", () => {
      window.location.href = NEXT_URL;
    });
  }

  function init() {
    clearWirelessPipelineState();
    hideContinue();
    renderEmpty();
    renderFlowNote();
    bindInvalidation();
    bindActions();
  }

  function boot() {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
    init();
  }

  window.addEventListener("DOMContentLoaded", boot);
})();