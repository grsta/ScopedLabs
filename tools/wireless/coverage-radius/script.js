(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "coverage-radius";
  const NEXT_HREF = "/tools/wireless/ap-count/";

  const $ = (id) => document.getElementById(id);

  const base = {
    "24": { open: 180, office: 120, dense: 80 },
    "5":  { open: 140, office: 95,  dense: 65 },
    "6":  { open: 115, office: 80,  dense: 55 }
  };

  const envLabels = {
    open: "Open / Outdoor",
    office: "Office / Light walls",
    dense: "Dense / Many walls"
  };

  const bandLabels = {
    "24": "2.4 GHz",
    "5": "5 GHz",
    "6": "6 GHz"
  };

  const powerLabels = {
    low: "Low",
    med: "Medium",
    high: "High"
  };

  function render(rows) {
    const el = $("results");
    el.innerHTML = "";

    rows.forEach((row) => {
      const d = document.createElement("div");
      d.className = "result-row";
      d.innerHTML = `
        <span class="result-label">${row.label}</span>
        <span class="result-value">${row.value}</span>
      `;
      el.appendChild(d);
    });
  }

  function hideContinue() {
    $("continue-link").style.display = "none";
  }

  function showContinue() {
    $("continue-link").href = NEXT_HREF;
    $("continue-link").style.display = "";
  }

  function clearStoredResult() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function invalidate() {
    clearStoredResult();
    hideContinue();
    $("results").innerHTML = "";
  }

  function getCoverageClass(radius) {
    if (radius < 70) return "Tight cell";
    if (radius < 120) return "Moderate cell";
    return "Broad cell";
  }

  function getEngineeringInterpretation({ band, env, rssi, pwr, radius }) {
    const bandText =
      band === "24"
        ? "2.4 GHz tends to stretch farther, but it is usually the most interference-prone option and should not be mistaken for clean client capacity."
        : band === "5"
          ? "5 GHz is usually the balanced design choice for general enterprise coverage because it contains cells better while still delivering useful range."
          : "6 GHz is best treated as a higher-performance, shorter-reach design layer that usually needs tighter AP spacing and cleaner line-of-sight."

    const envText =
      env === "open"
        ? "An open environment supports larger planning cells, but mounting height and down-tilt still matter because overshooting the service area can hurt channel reuse."
        : env === "office"
          ? "Light-wall office layouts usually need more conservative spacing than open areas because partitions, furniture, and hallway geometry create uneven client experience."
          : "Dense interiors should be designed with tighter cells because wall loss and obstruction stacking will shrink usable edge coverage quickly."

    const rssiText =
      rssi >= -65
        ? "Your RSSI target is relatively strong, which is better for performance-sensitive designs but forces a smaller practical edge radius."
        : rssi <= -72
          ? "Your RSSI target is loose, which can expand planning radius, but edge clients may operate at lower data rates and consume more airtime."
          : "Your RSSI target is in a common planning range for usable client coverage without pushing the cell edge too aggressively."

    const powerText =
      pwr === "high"
        ? "Higher AP power can make the downlink look better on paper, but client devices still transmit weaker than the AP, so uplink balance should be verified before trusting the larger radius."
        : pwr === "low"
          ? "Lower AP power helps contain cell size and improve reuse, but it may require more APs to hold the same footprint."
          : "A medium power setting is a reasonable planning midpoint before detailed survey tuning."

    const classText =
      radius < 70
        ? "This result points toward a denser deployment pattern where client quality is being prioritized over broad area reach."
        : radius < 120
          ? "This result is a middle-ground planning cell that can often support balanced indoor layouts if channel plan and client count are kept under control."
          : "This result is a large planning cell, which may reduce AP count on paper but can create reuse, roaming, and airtime issues if capacity is not checked in the next steps."

    return `${bandText} ${envText} ${rssiText} ${powerText} ${classText}`;
  }

  function saveResult(payload) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }

  function loadPriorContext() {
    const flow = $("flow-note");
    flow.style.display = "none";
    flow.innerHTML = "";

    let saved = null;

    try {
      saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch (err) {
      saved = null;
    }

    if (!saved || saved.category !== CATEGORY || saved.step === STEP) return;

    flow.innerHTML = `
      <strong>Carried over context</strong><br>
      Prior wireless step: ${saved.step}
    `;
    flow.style.display = "";
  }

  function calc() {
    const band = $("band").value;
    const env = $("env").value;
    const rssi = parseFloat($("rssi").value);
    const pwr = $("pwr").value;

    if (!Number.isFinite(rssi)) {
      render([
        { label: "Status", value: "Enter a valid RSSI target" },
        { label: "Engineering Interpretation", value: "The estimator needs a numeric RSSI target so the planning radius can be tightened or relaxed correctly." }
      ]);
      hideContinue();
      clearStoredResult();
      return;
    }

    let radius = base[band][env];

    if (rssi > -65) radius *= 0.80;
    else if (rssi > -67) radius *= 0.90;
    else if (rssi < -72) radius *= 1.15;
    else if (rssi < -70) radius *= 1.08;

    if (pwr === "low") radius *= 0.85;
    if (pwr === "high") radius *= 1.10;

    const area = Math.PI * radius * radius;
    const coverageClass = getCoverageClass(radius);
    const interpretation = getEngineeringInterpretation({ band, env, rssi, pwr, radius });

    render([
      { label: "Estimated Radius", value: `${radius.toFixed(0)} ft` },
      { label: "Estimated Coverage Area", value: `${area.toFixed(0)} sq ft` },
      { label: "Coverage Class", value: coverageClass },
      { label: "Min RSSI Target", value: `${rssi.toFixed(0)} dBm` },
      { label: "Engineering Interpretation", value: interpretation }
    ]);

    saveResult({
      category: CATEGORY,
      step: STEP,
      data: {
        band,
        bandLabel: bandLabels[band],
        environment: env,
        environmentLabel: envLabels[env],
        minRssiDbm: rssi,
        powerLevel: pwr,
        powerLevelLabel: powerLabels[pwr],
        estimatedRadiusFt: Number(radius.toFixed(0)),
        estimatedAreaSqFt: Number(area.toFixed(0)),
        coverageClass
      }
    });

    showContinue();
  }

  function reset() {
    $("band").value = "24";
    $("env").value = "open";
    $("rssi").value = -67;
    $("pwr").value = "med";
    $("results").innerHTML = "";
    clearStoredResult();
    hideContinue();
  }

  function bindInvalidation() {
    ["band", "env", "rssi", "pwr"].forEach((id) => {
      const el = $(id);
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    loadPriorContext();
    hideContinue();
    bindInvalidation();
    $("calc").addEventListener("click", calc);
    $("reset").addEventListener("click", reset);
  }

  init();
})();