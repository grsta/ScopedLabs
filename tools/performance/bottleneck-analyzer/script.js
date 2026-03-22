(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "bottleneck-analyzer";
  const PREVIOUS_STEP = "cache-hit-ratio";
  const NEXT_URL = "/tools/performance/headroom-target/";

  const $ = (id) => document.getElementById(id);

  const els = {
    cpu: $("cpu"),
    ram: $("ram"),
    disk: $("disk"),
    net: $("net"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  const DEFAULTS = {
    cpu: 70,
    ram: 65,
    disk: 55,
    net: 40
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

  function hideContinue() {
    els.continueWrap.style.display = "none";
    els.continueBtn.disabled = true;
  }

  function showContinue() {
    els.continueWrap.style.display = "";
    els.continueBtn.disabled = false;
  }

  function clearStored() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function setDefaultResults() {
    els.results.innerHTML = `<div class="muted">Enter values and press Analyze.</div>`;
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
    els.cpu.value = DEFAULTS.cpu;
    els.ram.value = DEFAULTS.ram;
    els.disk.value = DEFAULTS.disk;
    els.net.value = DEFAULTS.net;
  }

  function getSaved() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    } catch {
      return null;
    }
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

    const cacheHitRatioPct =
      num(d.cacheHitRatioPct) ??
      (num(d.cacheHit) !== null ? num(d.cacheHit) * 100 : null);

    const avgLatencyMs =
      num(d.avgLatencyMs) ??
      num(d.avgLatency);

    const missRequestsPerSecond =
      num(d.missRequestsPerSecond) ??
      num(d.backendLoadRps) ??
      num(d.backendLoad);

    const hitRequestsPerSecond =
      num(d.hitRequestsPerSecond);

    const latencyReductionPct =
      num(d.latencyReductionPct) ??
      num(d.reductionPct);

    const backendLoadReductionPct =
      num(d.backendLoadReductionPct) ??
      cacheHitRatioPct;

    const cacheStatus =
      d.cacheStatus ||
      d.status ||
      (
        cacheHitRatioPct !== null
          ? cacheHitRatioPct >= 90 ? "EXCELLENT"
          : cacheHitRatioPct >= 80 ? "GOOD"
          : cacheHitRatioPct >= 65 ? "MODERATE"
          : "WEAK"
          : "—"
      );

    if (cacheStatus === "EXCELLENT") {
      els.cpu.value = "42";
      els.ram.value = "48";
      els.disk.value = "36";
      els.net.value = "30";
    } else if (cacheStatus === "GOOD") {
      els.cpu.value = "56";
      els.ram.value = "60";
      els.disk.value = "46";
      els.net.value = "38";
    } else if (cacheStatus === "MODERATE") {
      els.cpu.value = "70";
      els.ram.value = "68";
      els.disk.value = "58";
      els.net.value = "46";
    } else if (cacheStatus === "WEAK") {
      els.cpu.value = "84";
      els.ram.value = "76";
      els.disk.value = "66";
      els.net.value = "54";
    }

    if (missRequestsPerSecond !== null) {
      if (missRequestsPerSecond <= 500) {
        els.cpu.value = "40";
        els.ram.value = "46";
        els.disk.value = "34";
        els.net.value = "28";
      } else if (missRequestsPerSecond <= 1500) {
        els.cpu.value = "55";
        els.ram.value = "58";
        els.disk.value = "45";
        els.net.value = "36";
      } else if (missRequestsPerSecond <= 3000) {
        els.cpu.value = "68";
        els.ram.value = "66";
        els.disk.value = "56";
        els.net.value = "44";
      } else {
        els.cpu.value = "82";
        els.ram.value = "74";
        els.disk.value = "64";
        els.net.value = "52";
      }
    }

    const parts = [];

    if (cacheHitRatioPct !== null) {
      parts.push(`Cache Hit Ratio: <strong>${fmt(cacheHitRatioPct, 1)}%</strong>`);
    }

    if (hitRequestsPerSecond !== null) {
      parts.push(`Hit Requests: <strong>${fmt(hitRequestsPerSecond, 0)} req/s</strong>`);
    }

    if (missRequestsPerSecond !== null) {
      parts.push(`Miss Requests: <strong>${fmt(missRequestsPerSecond, 0)} req/s</strong>`);
    }

    if (avgLatencyMs !== null) {
      parts.push(`Average Latency: <strong>${fmt(avgLatencyMs, 2)} ms</strong>`);
    }

    if (latencyReductionPct !== null) {
      parts.push(`Latency Reduction: <strong>${fmt(latencyReductionPct, 1)}%</strong>`);
    }

    if (backendLoadReductionPct !== null) {
      parts.push(`Backend Load Reduction: <strong>${fmt(backendLoadReductionPct, 1)}%</strong>`);
    }

    parts.push(`Cache Status: <strong>${cacheStatus}</strong>`);

    showFlowNote(`
      <strong>Carried over context</strong><br>
      ${parts.join(", ")}.
      This step now estimates which subsystem is most likely to become the active bottleneck after cache efficiency has reduced some portion of repeated backend demand.
    `);
  }

  function getSeverity(value) {
    if (value >= 90) return "CRITICAL";
    if (value >= 75) return "HIGH";
    if (value >= 60) return "ELEVATED";
    return "NORMAL";
  }

  function getInterpretation(worst, second, spread, avgUtil) {
    if (worst.val >= 90) {
      return `${worst.name} is operating at ${worst.val.toFixed(1)}%, which indicates a critical saturation point. In engineering terms, this subsystem is the dominant performance limiter and should be investigated before tuning lower-utilization components.`;
    }

    if (worst.val >= 75) {
      return `${worst.name} is the leading constraint at ${worst.val.toFixed(1)}%. The gap to the next-highest subsystem is ${spread.toFixed(1)} points, suggesting ${worst.name} is currently the clearest bottleneck under present load.`;
    }

    if (worst.val >= 60) {
      return `${worst.name} is the highest-utilization subsystem, but overall pressure is still moderate. With average utilization at ${avgUtil.toFixed(1)}%, the environment appears serviceable, though ${worst.name} should be watched first as demand rises.`;
    }

    return `No severe bottleneck is indicated yet. ${worst.name} is still the highest-utilization subsystem, but the overall utilization profile remains relatively balanced. Capacity headroom likely still exists across the platform.`;
  }

  function calc() {
    const metrics = [
      { name: "CPU", val: parseFloat(els.cpu.value) },
      { name: "Memory", val: parseFloat(els.ram.value) },
      { name: "Disk", val: parseFloat(els.disk.value) },
      { name: "Network", val: parseFloat(els.net.value) }
    ];

    const invalid = metrics.some((m) => !Number.isFinite(m.val) || m.val < 0 || m.val > 100);

    if (invalid) {
      els.results.innerHTML = `<div class="muted">Enter valid utilization values from 0 to 100 and press Analyze.</div>`;
      hideContinue();
      return;
    }

    const byWorst = [...metrics].sort((a, b) => b.val - a.val);

    const worst = byWorst[0];
    const second = byWorst[1];
    const severity = getSeverity(worst.val);
    const spread = worst.val - second.val;
    const avgUtil = metrics.reduce((sum, m) => sum + m.val, 0) / metrics.length;

    let balanceStatus = "BALANCED";
    if (spread >= 20) balanceStatus = "STRONGLY SKEWED";
    else if (spread >= 10) balanceStatus = "MODERATELY SKEWED";

    const interpretation = getInterpretation(worst, second, spread, avgUtil);

    els.results.innerHTML = [
      row("Highest Utilization", `${worst.name} (${worst.val.toFixed(1)}%)`),
      row("Second Highest", `${second.name} (${second.val.toFixed(1)}%)`),
      row("Likely Bottleneck", `${worst.name} - ${severity}`),
      row("Bottleneck Gap", `${spread.toFixed(1)} pts`),
      row("Load Balance", balanceStatus),
      row("Average Utilization", `${avgUtil.toFixed(1)}%`),
      row("Recommendation", `Investigate ${worst.name} subsystem first`),
      row("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        cpuUtilizationPct: metrics.find((m) => m.name === "CPU").val,
        memoryUtilizationPct: metrics.find((m) => m.name === "Memory").val,
        diskUtilizationPct: metrics.find((m) => m.name === "Disk").val,
        networkUtilizationPct: metrics.find((m) => m.name === "Network").val,
        highestSubsystem: worst.name,
        highestUtilizationPct: worst.val,
        secondHighestSubsystem: second.name,
        secondHighestUtilizationPct: second.val,
        bottleneckSeverity: severity,
        bottleneckGapPts: spread,
        averageUtilizationPct: avgUtil,
        balanceStatus: balanceStatus
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
    [els.cpu, els.ram, els.disk, els.net].forEach((el) => {
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
