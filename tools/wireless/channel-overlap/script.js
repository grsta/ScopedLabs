(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "channel-overlap";
  const NEXT_URL = "/tools/wireless/noise-floor-margin/";

  const $ = (id) => document.getElementById(id);

  const els = {
    band: $("band"),
    width: $("width"),
    aps: $("aps"),
    ch: $("ch"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  function resultRow(label, value) {
    return `
      <div class="result-row">
        <div class="result-label">${label}</div>
        <div class="result-value">${value}</div>
      </div>
    `;
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

  function safeNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : NaN;
  }

  function bandLabel(value) {
    if (value === "24") return "2.4 GHz";
    if (value === "5") return "5 GHz";
    if (value === "6") return "6 GHz";
    return value;
  }

  function suggestedChannels(band, width) {
    if (band === "24") {
      if (width === "20") return 3;
      return 1;
    }

    if (band === "5") {
      if (width === "20") return 9;
      if (width === "40") return 4;
      if (width === "80") return 2;
      return 1;
    }

    if (width === "20") return 24;
    if (width === "40") return 12;
    if (width === "80") return 6;
    return 3;
  }

  function classifyReuse(reuse) {
    if (reuse <= 1.5) return "Low reuse pressure";
    if (reuse <= 2.25) return "Moderate reuse pressure";
    if (reuse <= 3.0) return "High reuse pressure";
    return "Severe reuse pressure";
  }

  function classifyChannelPlan(provided, suggested) {
    if (provided >= suggested) return "Channel pool aligned";
    if (provided >= Math.max(1, suggested * 0.7)) return "Channel pool constrained";
    return "Channel pool undersized";
  }

  function buildInterpretation({ band, width, aps, ch, reuse, reuseClass, planClass, priorRadiusFt }) {
    const bandText =
      band === "24"
        ? "2.4 GHz has very limited clean channel reuse, so overlap problems appear quickly as AP count rises."
        : band === "5"
          ? "5 GHz usually offers the most practical enterprise compromise between reuse flexibility and client compatibility."
          : "6 GHz gives the cleanest reuse potential, but that advantage only holds if client support and channel-width choices stay realistic.";

    const widthText =
      width === "20"
        ? "A 20 MHz plan gives you the best chance of preserving channel count and containing co-channel contention."
        : width === "40"
          ? "At 40 MHz, capacity can improve in the right conditions, but channel availability drops enough that reuse pressure climbs sooner."
          : width === "80"
            ? "At 80 MHz, you are trading channel reuse for per-cell throughput, so overlap risk rises fast in denser deployments."
            : "At 160 MHz, channel reuse collapses quickly outside very specialized designs, so broad multi-AP layouts usually struggle.";

    const countText =
      aps <= ch
        ? "Your AP count is still within the available channel pool, which is a healthy starting point for reuse."
        : `With ${aps.toFixed(0)} APs sharing ${ch.toFixed(0)} channels, multiple cells will inevitably contend on the same channel.`;

    const radiusText =
      Number.isFinite(priorRadiusFt)
        ? `The prior coverage step estimated about ${priorRadiusFt.toFixed(1)} ft of cell radius, so larger cells will make this reuse pressure more visible in the field if power and placement are not tightened.`
        : "Without a validated coverage radius, reuse pressure should be treated as a planning estimate only.";

    const classText =
      reuse <= 1.5
        ? "This layout is in a reasonable planning zone for channel reuse."
        : reuse <= 2.25
          ? "This layout is workable, but AP placement and power tuning will matter more."
          : reuse <= 3.0
            ? "This layout is entering a contention-heavy zone where client airtime efficiency can degrade."
            : "This layout is likely to suffer meaningful co-channel contention unless channel width, power, or AP layout is tightened.";

    return `${bandText} ${widthText} ${countText} ${radiusText} ${planClass}. ${reuseClass}. ${classText}`;
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

    if (!saved || saved.category !== CATEGORY || saved.step !== "coverage-radius") return;

    const data = saved.data || {};
    const band = data.bandLabel || data.band || "Unknown";
    const environment = data.environmentLabel || data.environment || "Unknown";
    const radiusFt = Number(data.estimatedRadiusFt);
    const areaSqFt = Number(data.estimatedCellAreaSqFt);

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Coverage Radius estimated <strong>${Number.isFinite(radiusFt) ? radiusFt.toFixed(1) : "—"} ft</strong> radius
      and <strong>${Number.isFinite(areaSqFt) ? areaSqFt.toFixed(0) : "—"} sq ft</strong> cell area
      for <strong>${band}</strong> in <strong>${environment}</strong>.
      Use this step to check whether that coverage plan is likely to create unhealthy channel reuse.
    `;
    els.flowNote.style.display = "";
  }

  function autoDefaults() {
    const suggested = suggestedChannels(els.band.value, els.width.value);
    els.ch.value = String(suggested);
  }

  function calculate() {
    const band = els.band.value;
    const width = els.width.value;
    const aps = Math.max(1, safeNumber(els.aps.value));
    const ch = Math.max(1, safeNumber(els.ch.value));

    if (!Number.isFinite(aps) || !Number.isFinite(ch)) {
      els.results.innerHTML = [
        resultRow("Status", "Invalid input"),
        resultRow("Engineering Interpretation", "Enter valid numeric values for AP count and available channels so reuse pressure can be estimated correctly.")
      ].join("");
      hideContinue();
      clearStoredResult();
      return;
    }

    let priorRadiusFt = NaN;
    let priorAreaSqFt = NaN;

    try {
      const prior = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
      if (prior && prior.category === CATEGORY && prior.step === "coverage-radius" && prior.data) {
        priorRadiusFt = Number(prior.data.estimatedRadiusFt);
        priorAreaSqFt = Number(prior.data.estimatedCellAreaSqFt);
      }
    } catch (err) {
      priorRadiusFt = NaN;
      priorAreaSqFt = NaN;
    }

    const suggested = suggestedChannels(band, width);
    const reuse = aps / ch;
    const reuseClass = classifyReuse(reuse);
    const planClass = classifyChannelPlan(ch, suggested);
    const overlapRiskPct = Math.min(100, Math.max(0, ((reuse - 1) / 3) * 100));
    const interpretation = buildInterpretation({
      band,
      width,
      aps,
      ch,
      reuse,
      reuseClass,
      planClass,
      priorRadiusFt
    });

    els.results.innerHTML = [
      resultRow("Band / Width", `${bandLabel(band)} / ${width} MHz`),
      resultRow("AP Count", `${aps.toFixed(0)}`),
      resultRow("Channels Provided", `${ch.toFixed(0)}`),
      resultRow("Suggested Channels (Typical)", `${suggested}`),
      resultRow("Average Reuse (APs per Channel)", `${reuse.toFixed(2)}`),
      resultRow("Status", reuseClass),
      resultRow("Channel Plan", planClass),
      resultRow("Overlap Risk", `${overlapRiskPct.toFixed(0)}%`),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    const payload = {
      category: CATEGORY,
      step: STEP,
      data: {
        band,
        bandLabel: bandLabel(band),
        channelWidthMhz: Number(width),
        apCount: Number(aps.toFixed(0)),
        availableChannels: Number(ch.toFixed(0)),
        suggestedChannels: suggested,
        averageReuse: Number(reuse.toFixed(2)),
        reuseClass,
        channelPlanClass: planClass,
        overlapRiskPct: Number(overlapRiskPct.toFixed(0)),
        priorRadiusFt: Number.isFinite(priorRadiusFt) ? Number(priorRadiusFt.toFixed(1)) : null,
        priorCellAreaSqFt: Number.isFinite(priorAreaSqFt) ? Number(priorAreaSqFt.toFixed(0)) : null
      }
    };

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    showContinue();
  }

  function resetForm() {
    els.band.value = "5";
    els.width.value = "20";
    els.aps.value = "8";
    els.ch.value = "4";
    clearStoredResult();
    hideContinue();
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    loadPriorContext();
  }

  function bindInvalidation() {
    [els.band, els.width, els.aps, els.ch].forEach((el) => {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    els.band.addEventListener("change", autoDefaults);
    els.width.addEventListener("change", autoDefaults);
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
