(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "coverage-radius";
  const NEXT_URL = "/tools/wireless/ap-count/";

  const els = {
    band: document.getElementById("band"),
    environment: document.getElementById("environment"),
    eirp: document.getElementById("eirp"),
    targetRssi: document.getElementById("targetRssi"),
    clientClass: document.getElementById("clientClass"),
    calc: document.getElementById("calc"),
    reset: document.getElementById("reset"),
    results: document.getElementById("results"),
    flowNote: document.getElementById("flow-note"),
    continueWrap: document.getElementById("continue-wrap"),
    continueBtn: document.getElementById("continue")
  };

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

  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  function hideContinue() {
    els.continueWrap.style.display = "none";
    els.continueBtn.disabled = true;
  }

  function showContinue() {
    els.continueWrap.style.display = "";
    els.continueBtn.disabled = false;
  }

  function clearStoredResult() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function invalidate() {
    clearStoredResult();
    hideContinue();
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  function resultRow(label, value) {
    return `
      <div class="result-row">
        <div class="result-label">${label}</div>
        <div class="result-value">${value}</div>
      </div>
    `;
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

  function loadPriorContext() {
    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";

    let saved = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch (err) {
      saved = null;
    }

    if (!saved || saved.category !== CATEGORY || saved.step === STEP) return;

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Prior wireless step: ${saved.step}
    `;
    els.flowNote.style.display = "";
  }

  function calculate() {
    const band = els.band.value;
    const environment = els.environment.value;
    const eirp = safeNumber(els.eirp.value);
    const targetRssi = safeNumber(els.targetRssi.value);
    const clientClass = els.clientClass.value;

    if (!Number.isFinite(eirp) || !Number.isFinite(targetRssi)) {
      els.results.innerHTML = [
        resultRow("Status", "Invalid input"),
        resultRow(
          "Engineering Interpretation",
          "Enter valid numeric values for AP EIRP and target RSSI so the planning radius can be estimated correctly."
        )
      ].join("");
      hideContinue();
      clearStoredResult();
      return;
    }

    const availablePathLoss =
      eirp - targetRssi - ENVIRONMENT_LOSS[environment] - CLIENT_MARGIN[clientClass];

    let radiusFt = Math.pow(10, (availablePathLoss - BAND_BASE_LOSS[band]) / 20);

    if (!Number.isFinite(radiusFt) || radiusFt <= 0) {
      radiusFt = 1;
    }

    const diameterFt = radiusFt * 2;
    const cellAreaSqFt = Math.PI * radiusFt * radiusFt;
    const coverageClass = classifyRadius(radiusFt);
    const interpretation = buildInterpretation({
      band,
      environment,
      clientClass,
      radiusFt,
      targetRssi
    });

    els.results.innerHTML = [
      resultRow("Estimated Radius", `${radiusFt.toFixed(1)} ft`),
      resultRow("Estimated Diameter", `${diameterFt.toFixed(1)} ft`),
      resultRow("Estimated Cell Area", `${cellAreaSqFt.toFixed(0)} sq ft`),
      resultRow("Status", coverageClass),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    const payload = {
      category: CATEGORY,
      step: STEP,
      data: {
        band,
        bandLabel: getBandLabel(band),
        environment,
        environmentLabel: getEnvironmentLabel(environment),
        eirpDbm: eirp,
        targetRssiDbm: targetRssi,
        clientClass,
        clientClassLabel: getClientLabel(clientClass),
        estimatedRadiusFt: Number(radiusFt.toFixed(1)),
        estimatedDiameterFt: Number(diameterFt.toFixed(1)),
        estimatedCellAreaSqFt: Number(cellAreaSqFt.toFixed(0)),
        coverageClass
      }
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    showContinue();
  }

  function resetForm() {
    els.band.value = "5";
    els.environment.value = "office";
    els.eirp.value = "23";
    els.targetRssi.value = "-67";
    els.clientClass.value = "typical";
    clearStoredResult();
    hideContinue();
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  function bindInvalidation() {
    [els.band, els.environment, els.eirp, els.targetRssi, els.clientClass].forEach((el) => {
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
    hideContinue();
    loadPriorContext();
    bindInvalidation();
    bindActions();
  }

  init();
})();