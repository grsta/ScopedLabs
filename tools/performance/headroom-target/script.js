(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "headroom-target";
  const PREVIOUS_STEP = "bottleneck-analyzer";
  const NEXT_URL = "/tools/performance/";

  const $ = (id) => document.getElementById(id);

  const els = {
    u: $("u"),
    h: $("h"),
    cap: $("cap"),
    unit: $("unit"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  const DEFAULTS = {
    u: 60,
    h: 25,
    cap: 1000,
    unit: "req/s"
  };

  function row(label, value) {
    return `<div class="result-row">
      <span class="result-label">${label}</span>
      <span class="result-value">${value}</span>
    </div>`;
  }

  function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function fmt(value, digits = 1) {
    const n = num(value);
    return n === null ? "—" : n.toFixed(digits);
  }

  function render(rows) {
    els.results.innerHTML = rows.join("");
  }

  function showContinue() {
    els.continueWrap.style.display = "";
    els.continueBtn.disabled = false;
  }

  function hideContinue() {
    els.continueWrap.style.display = "none";
    els.continueBtn.disabled = true;
  }

  function clearStored() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function setDefaultResults() {
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  function getSaved() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
  }

  function hideFlowNote() {
    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";
  }

  function showFlowNote(html) {
    els.flowNote.innerHTML = html;
    els.flowNote.style.display = "";
  }

  function resetInputsToDefaults() {
    els.u.value = DEFAULTS.u;
    els.h.value = DEFAULTS.h;
    els.cap.value = DEFAULTS.cap;
    els.unit.value = DEFAULTS.unit;
  }

  function invalidate() {
    clearStored();
    hideContinue();
    setDefaultResults();
  }

  function loadPrior() {
    const saved = getSaved();

    hideFlowNote();

    if (!saved || saved.category !== CATEGORY || saved.step !== PREVIOUS_STEP) {
      return;
    }

    const d = saved.data || {};

    const highestSubsystem = d.highestSubsystem || "—";
    const highestUtilizationPct =
      num(d.highestUtilizationPct) ??
      num(d.highestUtilization);
    const secondHighestSubsystem = d.secondHighestSubsystem || "—";
    const secondHighestUtilizationPct =
      num(d.secondHighestUtilizationPct);
    const bottleneckSeverity =
      d.bottleneckSeverity ||
      d.severity ||
      "—";
    const bottleneckGapPts =
      num(d.bottleneckGapPts) ??
      num(d.spread);
    const averageUtilizationPct =
      num(d.averageUtilizationPct);
    const balanceStatus =
      d.balanceStatus ||
      "—";

    if (highestUtilizationPct !== null) {
      els.u.value = String(Math.round(highestUtilizationPct));

      if (highestUtilizationPct >= 90) {
        els.h.value = "30";
      } else if (highestUtilizationPct >= 80) {
        els.h.value = "25";
      } else if (highestUtilizationPct >= 70) {
        els.h.value = "20";
      } else {
        els.h.value = "15";
      }
    }

    if (highestSubsystem === "CPU") {
      els.unit.value = "req/s";
      els.cap.value = "1000";
    } else if (highestSubsystem === "Network") {
      els.unit.value = "Mbps";
      els.cap.value = "1000";
    } else if (highestSubsystem === "Disk") {
      els.unit.value = "IOPS";
      els.cap.value = "10000";
    } else if (highestSubsystem === "Memory") {
      els.unit.value = "req/s";
      els.cap.value = "1000";
    }

    const parts = [];

    if (highestSubsystem !== "—" && highestUtilizationPct !== null) {
      parts.push(`Likely Bottleneck: <strong>${highestSubsystem} (${fmt(highestUtilizationPct, 1)}%)</strong>`);
    }

    if (secondHighestSubsystem !== "—" && secondHighestUtilizationPct !== null) {
      parts.push(`Second Highest: <strong>${secondHighestSubsystem} (${fmt(secondHighestUtilizationPct, 1)}%)</strong>`);
    }

    if (bottleneckSeverity !== "—") {
      parts.push(`Severity: <strong>${bottleneckSeverity}</strong>`);
    }

    if (bottleneckGapPts !== null) {
      parts.push(`Gap: <strong>${fmt(bottleneckGapPts, 1)} pts</strong>`);
    }

    if (averageUtilizationPct !== null) {
      parts.push(`Average Utilization: <strong>${fmt(averageUtilizationPct, 1)}%</strong>`);
    }

    if (balanceStatus !== "—") {
      parts.push(`Load Balance: <strong>${balanceStatus}</strong>`);
    }

    showFlowNote(`
      <strong>Carried over context</strong><br>
      ${parts.join(", ")}.
      This final step converts the identified bottleneck into a safer operating target by reserving headroom for bursts, failover conditions, and future growth.
    `);
  }

  function calc() {
    const uPct = parseFloat(els.u.value);
    const hPct = parseFloat(els.h.value);
    const cap = parseFloat(els.cap.value);
    const unit = els.unit.value;

    if (
      !Number.isFinite(uPct) || uPct < 0 || uPct > 100 ||
      !Number.isFinite(hPct) || hPct < 0 || hPct >= 100 ||
      !Number.isFinite(cap) || cap <= 0
    ) {
      els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      hideContinue();
      return;
    }

    const u = uPct / 100;
    const h = hPct / 100;

    const safeUtil = 1 - h;
    const currentLoad = cap * u;
    const maxLoad = cap * safeUtil;
    const remainingSafeCapacity = maxLoad - currentLoad;
    const growthUntilLimitPct = maxLoad > 0 ? (remainingSafeCapacity / maxLoad) * 100 : 0;
    const overloadAgainstTarget = currentLoad > maxLoad ? currentLoad - maxLoad : 0;

    let status = "HEALTHY";
    if (currentLoad > maxLoad) {
      status = "OVER TARGET";
    } else if (uPct >= (safeUtil * 100) - 5) {
      status = "TIGHT";
    } else if (uPct >= (safeUtil * 100) - 15) {
      status = "WATCH";
    }

    let interpretation = "";
    if (status === "OVER TARGET") {
      interpretation = `Current utilization already exceeds the recommended safe operating target. In engineering terms, this system is consuming reserved headroom and has reduced tolerance for bursts, failover, or growth. Capacity relief or load redistribution should be prioritized.`;
    } else if (status === "TIGHT") {
      interpretation = `The system is operating close to its recommended limit. There is still some usable reserve, but remaining headroom is narrow enough that demand spikes or subsystem degradation could push performance into an unstable range.`;
    } else if (status === "WATCH") {
      interpretation = `The current operating point is still inside the target envelope, but meaningful growth will reduce margin. This is generally acceptable for steady-state use, though expansion planning should begin before the safe utilization ceiling is reached.`;
    } else {
      interpretation = `Headroom is currently healthy. The system remains below the recommended operating target, leaving reserve capacity for bursts, transient failures, and future growth without immediately entering a stressed utilization band.`;
    }

    render([
      row("Current Load", `${currentLoad.toFixed(1)} ${unit}`),
      row("Desired Headroom", `${hPct.toFixed(0)}%`),
      row("Recommended Max Load", `${maxLoad.toFixed(1)} ${unit}`),
      row("Recommended Max Utilization", `${(safeUtil * 100).toFixed(0)}%`),
      row("Remaining Safe Capacity", `${remainingSafeCapacity.toFixed(1)} ${unit}`),
      row("Growth Until Target Limit", `${growthUntilLimitPct.toFixed(1)}%`),
      row("Headroom Status", status),
      row("Engineering Interpretation", interpretation)
    ]);

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        currentUtilizationPct: uPct,
        desiredHeadroomPct: hPct,
        currentCapacity: cap,
        unit: unit,
        currentLoad: currentLoad,
        recommendedMaxLoad: maxLoad,
        recommendedMaxUtilizationPct: safeUtil * 100,
        remainingSafeCapacity: remainingSafeCapacity,
        growthUntilLimitPct: growthUntilLimitPct,
        overloadAgainstTarget: overloadAgainstTarget,
        headroomStatus: status
      }
    }));

    showContinue();
  }

  function reset() {
    resetInputsToDefaults();
    clearStored();
    hideContinue();
    setDefaultResults();
    loadPrior();
  }

  function bind() {
    [els.u, els.h, els.cap, els.unit].forEach((el) => {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    els.calc.addEventListener("click", calc);
    els.reset.addEventListener("click", reset);
    els.continueBtn.addEventListener("click", () => {
      window.location.href = NEXT_URL;
    });
  }

  function init() {
    hideContinue();
    setDefaultResults();
    loadPrior();
    bind();
  }

  init();
})();
