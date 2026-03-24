(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "bottleneck-analyzer";
  const PREVIOUS_STEP = "cache-hit-ratio";
  const NEXT_URL = "/tools/performance/headroom-target/";

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    cpu: $("cpu"),
    ram: $("ram"),
    disk: $("disk"),
    net: $("net"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy"),
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

  function num(value) {
    return ScopedLabsAnalyzer.safeNumber(value, NaN);
  }

  function fmt(value, digits = 1) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtPct(value, digits = 1) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function applyDefaults() {
    els.cpu.value = String(DEFAULTS.cpu);
    els.ram.value = String(DEFAULTS.ram);
    els.disk.value = String(DEFAULTS.disk);
    els.net.value = String(DEFAULTS.net);
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysis,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continueBtn,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: STORAGE_KEY,
      category: CATEGORY,
      step: STEP,
      emptyMessage: "Enter values and press Analyze."
    });
  }

  function loadPrior() {
    const flow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: STORAGE_KEY,
      category: CATEGORY,
      step: STEP,
      title: "Carried over context",
      intro: "This step estimates which subsystem is most likely to become the active bottleneck after cache efficiency has reduced some portion of repeated backend demand."
    });

    if (!flow || !flow.data || flow.step !== PREVIOUS_STEP) return;

    const d = flow.data || {};

    const cacheHitRatioPct =
      num(d.cacheHitRatioPct) ??
      (Number.isFinite(num(d.cacheHit)) ? num(d.cacheHit) * 100 : NaN);

    const missRequestsPerSecond =
      num(d.missRequestsPerSecond) ??
      num(d.backendLoadRps) ??
      num(d.backendLoad);

    const cacheStatus =
      d.cacheStatus ||
      d.status ||
      (Number.isFinite(cacheHitRatioPct)
        ? cacheHitRatioPct >= 90 ? "EXCELLENT"
        : cacheHitRatioPct >= 80 ? "GOOD"
        : cacheHitRatioPct >= 65 ? "MODERATE"
        : "WEAK"
        : "—");

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

    if (Number.isFinite(missRequestsPerSecond)) {
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
  }

  function getInputs() {
    const cpu = num(els.cpu.value);
    const ram = num(els.ram.value);
    const disk = num(els.disk.value);
    const net = num(els.net.value);

    const metrics = [
      { name: "CPU", val: cpu },
      { name: "Memory", val: ram },
      { name: "Disk", val: disk },
      { name: "Network", val: net }
    ];

    const invalid = metrics.some((m) => !Number.isFinite(m.val) || m.val < 0 || m.val > 100);
    if (invalid) {
      return { ok: false, message: "Enter valid utilization values from 0 to 100 and press Analyze." };
    }

    return { ok: true, metrics };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const metrics = input.metrics;
    const byWorst = [...metrics].sort((a, b) => b.val - a.val);

    const worst = byWorst[0];
    const second = byWorst[1];
    const spread = worst.val - second.val;
    const avgUtil = metrics.reduce((sum, m) => sum + m.val, 0) / metrics.length;

    let balanceStatus = "BALANCED";
    if (spread >= 20) balanceStatus = "STRONGLY SKEWED";
    else if (spread >= 10) balanceStatus = "MODERATELY SKEWED";

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: worst.val,
      metrics: metrics.map((m) => ({
        label: m.name,
        value: m.val,
        displayValue: fmtPct(m.val)
      })),
      healthyMax: 60,
      watchMax: 80
    });

    let interpretation = `The highest-utilization subsystem is ${worst.name} at ${fmtPct(worst.val)}, followed by ${second.name} at ${fmtPct(second.val)}. That means ${worst.name.toLowerCase()} is currently carrying the largest share of load pressure and is the most likely active performance bottleneck.`;

    if (statusPack.status === "RISK") {
      interpretation += ` This is no longer just a mild imbalance. ${worst.name} is operating in a critical pressure band where saturation, queueing, or response-time collapse become much more likely before the other subsystems do.`;
    } else if (statusPack.status === "WATCH") {
      interpretation += ` The environment is still functioning, but ${worst.name.toLowerCase()} is now elevated enough that it should be treated as the first subsystem to investigate as demand rises.`;
    } else {
      interpretation += ` Overall pressure is still in a controlled range, but ${worst.name.toLowerCase()} remains the first place where capacity risk will emerge if load increases.`;
    }

    let dominantConstraint = `${worst.name} is the dominant limiter because it is the highest-utilization subsystem in the current profile.`;
    if (spread >= 20) {
      dominantConstraint += ` The ${fmt(spread, 1)}-point gap over ${second.name} indicates a strongly skewed load pattern, so tuning lower-utilization components first is unlikely to materially improve performance.`;
    } else if (spread >= 10) {
      dominantConstraint += ` The ${fmt(spread, 1)}-point gap over ${second.name} shows a meaningful lead, so ${worst.name.toLowerCase()} is the clearest near-term investigation target.`;
    } else {
      dominantConstraint += ` The gap to ${second.name} is only ${fmt(spread, 1)} points, so the system is comparatively balanced and the bottleneck may shift more easily as workloads change.`;
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = `Investigate ${worst.name.toLowerCase()} first before optimizing anything else. Validate saturation, queue depth, scheduler pressure, or dependency contention in that subsystem before assuming the rest of the platform is the real problem.`;
    } else if (statusPack.status === "WATCH") {
      guidance = `Treat ${worst.name.toLowerCase()} as the leading tuning target and confirm whether the measured utilization reflects sustained demand or short burst behavior.`;
    } else {
      guidance = `No severe bottleneck is indicated yet, but ${worst.name.toLowerCase()} should remain the first subsystem reviewed during capacity planning and headroom sizing.`;
    }

    return {
      ok: true,
      metrics,
      worst,
      second,
      spread,
      avgUtil,
      balanceStatus,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function writeFlow(data) {
    ScopedLabsAnalyzer.writeFlow(STORAGE_KEY, {
      category: CATEGORY,
      step: STEP,
      data: {
        cpuUtilizationPct: data.metrics.find((m) => m.name === "CPU").val,
        memoryUtilizationPct: data.metrics.find((m) => m.name === "Memory").val,
        diskUtilizationPct: data.metrics.find((m) => m.name === "Disk").val,
        networkUtilizationPct: data.metrics.find((m) => m.name === "Network").val,
        highestSubsystem: data.worst.name,
        highestUtilizationPct: data.worst.val,
        secondHighestSubsystem: data.second.name,
        secondHighestUtilizationPct: data.second.val,
        bottleneckGapPts: data.spread,
        averageUtilizationPct: data.avgUtil,
        balanceStatus: data.balanceStatus,
        bottleneckStatus: data.status
      }
    });
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
    ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continueBtn);
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Highest Utilization", value: `${data.worst.name} (${fmtPct(data.worst.val)})` },
        { label: "Second Highest", value: `${data.second.name} (${fmtPct(data.second.val)})` },
        { label: "Likely Bottleneck", value: data.worst.name },
        { label: "Average Utilization", value: fmtPct(data.avgUtil) }
      ],
      derivedRows: [
        { label: "CPU Utilization", value: fmtPct(data.metrics.find((m) => m.name === "CPU").val) },
        { label: "Memory Utilization", value: fmtPct(data.metrics.find((m) => m.name === "Memory").val) },
        { label: "Disk Utilization", value: fmtPct(data.metrics.find((m) => m.name === "Disk").val) },
        { label: "Network Utilization", value: fmtPct(data.metrics.find((m) => m.name === "Network").val) },
        { label: "Bottleneck Gap", value: `${fmt(data.spread, 1)} pts` },
        { label: "Load Balance", value: data.balanceStatus }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: data.metrics.map((m) => m.name),
        values: data.metrics.map((m) => Number(m.val.toFixed(1))),
        displayValues: data.metrics.map((m) => fmtPct(m.val)),
        referenceValue: 60,
        healthyMax: 60,
        watchMax: 80,
        axisTitle: "Subsystem Utilization (%)",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(Math.max(...data.metrics.map((m) => m.val), 80) * 1.1)
        )
      }
    });

    writeFlow(data);
    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continueBtn);
  }

  function calc() {
    const data = calculateModel();
    if (!data.ok) {
      renderError(data.message);
      return;
    }
    renderSuccess(data);
  }

  function reset() {
    applyDefaults();
    loadPrior();
    invalidate();
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
    bind();
    loadPrior();
    invalidate();
  }

  window.addEventListener("DOMContentLoaded", init);
})();
