(() => {
  const $ = (id) => document.getElementById(id);

  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "compute";
  const CURRENT_STEP = "raid-rebuild-time";

  let hasResult = false;
  let cachedFlow = null;
  let upstream = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    driveTb: $("driveTb"),
    mbps: $("mbps"),
    load: $("load"),
    raid: $("raid"),
    verify: $("verify"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

  function refreshFlowNote() {
    cachedFlow = ScopedLabsAnalyzer.renderFlowNote({
      flowEl: els.flowNote,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      cachedFlow,
      title: "System Context",
      intro:
        "This step checks how long the platform stays vulnerable after a disk failure and whether rebuild exposure starts colliding with recovery expectations.",
      customRows: (() => {
        const source = ScopedLabsAnalyzer.getUpstreamFlow({
          flowKey: FLOW_KEY,
          category: CURRENT_CATEGORY,
          step: CURRENT_STEP,
          cachedFlow
        });

        upstream = source ? (source.data || {}) : null;

        if (!source || !source.data) return null;

        const d = source.data;
        const rows = [];

        if (source.step === "power-thermal") {
          if (typeof d.totalW === "number") {
            rows.push({ label: "Power Load", value: `${d.totalW.toFixed(0)} W` });
          }
          if (typeof d.tons === "number") {
            rows.push({ label: "Cooling", value: `${d.tons.toFixed(2)} tons` });
          }
          if (typeof d.pressure === "string") {
            rows.push({ label: "Thermal Pressure", value: d.pressure });
          }
          return rows.length ? rows : null;
        }

        rows.push({ label: "Previous Step", value: source.step });
        return rows;
      })()
    });
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continue,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP
    });

    hasResult = false;
    refreshFlowNote();
  }

  function calc() {
    const driveTb = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.driveTb.value, 0));
    const mbps = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.mbps.value, 1));
    const loadFactor = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.load.value, 1));
    const raid = els.raid.value;
    const verify = els.verify.value;

    const effMbps = mbps * loadFactor;

    let penalty = 1.0;
    if (raid === "6") penalty = 1.15;
    if (raid === "5") penalty = 1.05;

    const totalMB = driveTb * 1_000_000;
    let hours = (totalMB / effMbps) * penalty / 3600;

    if (verify === "yes") hours *= 2;

    const exposurePressure = ScopedLabsAnalyzer.clamp((hours / 24) * 100, 0, 180);
    const parityStress = raid === "10" ? 35 : raid === "5" ? 70 : 90;
    const verifyStress = verify === "yes" ? 85 : 35;

    const metrics = [
      {
        label: "Exposure Pressure",
        value: exposurePressure,
        displayValue: `${Math.round(exposurePressure)}%`
      },
      {
        label: "Parity Stress",
        value: parityStress,
        displayValue: `${Math.round(parityStress)}%`
      },
      {
        label: "Verify Stress",
        value: verifyStress,
        displayValue: `${Math.round(verifyStress)}%`
      }
    ];

    const compositeScore = Math.round(
      (exposurePressure * 0.55) +
      (parityStress * 0.25) +
      (verifyStress * 0.20)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let risk = "Low";
    if (hours > 24) risk = "Elevated";
    if (hours > 48) risk = "High";
    if (hours > 72) risk = "Critical";

    let dominantConstraint = "Balanced rebuild profile";
    if (analyzer.dominant.label === "Exposure Pressure") {
      dominantConstraint = "Extended failure exposure window";
    } else if (analyzer.dominant.label === "Parity Stress") {
      dominantConstraint = "Parity reconstruction overhead";
    } else if (analyzer.dominant.label === "Verify Stress") {
      dominantConstraint = "Post-rebuild verification burden";
    }

    let crossCheck = "Rebuild duration appears aligned with a manageable recovery profile";
    if (upstream && typeof upstream.pressure === "string" && upstream.pressure.includes("Extreme")) {
      crossCheck = "Thermal and power pressure are already elevated, so sustained rebuild load could amplify infrastructure stress";
    } else if (hours > 48) {
      crossCheck = "The rebuild window is long enough that a second failure materially increases operational exposure";
    } else if (verify === "yes") {
      crossCheck = "The verify pass is materially extending the time spent in a degraded recovery state";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The array is staying in a vulnerable state for too long. Rebuild duration, parity overhead, or verification burden will keep the system exposed long enough that a second issue becomes a meaningful operational threat.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The rebuild profile is workable, but exposure is tightening. The system should recover, although parity overhead and extended degraded operation are consuming more safety margin than the raw hours figure suggests.";
    } else {
      interpretation =
        "The rebuild profile remains inside a manageable operating envelope. Current drive size, rebuild speed, and recovery overhead leave room to restore protection without making rebuild exposure the first major risk driver.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Maintain rebuild monitoring and verify that actual controller throughput stays near the modeled range. The first meaningful pressure increase will usually appear in rebuild duration before it appears in nominal array capacity.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate actual rebuild throughput under load and review whether verification needs to run inline. Watch what fails first: rebuild hours, parity overhead, or degraded-performance duration.";
    } else {
      guidance =
        `Re-architect the array recovery profile. The primary limiter is ${dominantConstraint.toLowerCase()}, not just raw drive size. Reduce rebuild exposure with faster media, narrower fault domains, or a design that shortens degraded-state duration.`;
    }

    const summaryRows = [
      { label: "Rebuild Time", value: `${hours.toFixed(1)} hrs` },
      { label: "Effective Rebuild Speed", value: `${effMbps.toFixed(0)} MB/s` },
      { label: "RAID Type", value: `RAID ${raid}` },
      { label: "Verify Pass", value: verify === "yes" ? "Enabled" : "Disabled" },
      { label: "Risk Level", value: risk },
      { label: "Drive Size", value: `${driveTb.toFixed(1)} TB` }
    ];

    const derivedRows = [
      { label: "Cross-Check", value: crossCheck },
      { label: "Parity Penalty", value: `${penalty.toFixed(2)}×` },
      { label: "Exposure Class", value: hours > 72 ? "Critical exposure" : hours > 48 ? "High exposure" : hours > 24 ? "Elevated exposure" : "Manageable exposure" }
    ];

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows,
      derivedRows,
      status: analyzer.status,
      interpretation,
      dominantConstraint,
      guidance,
      chart: {
        labels: metrics.map((m) => m.label),
        values: metrics.map((m) => m.value),
        displayValues: metrics.map((m) => m.displayValue),
        referenceValue: 65,
        healthyMax: 65,
        watchMax: 85,
        axisTitle: "RAID Rebuild Risk Magnitude",
        referenceLabel: "Healthy Margin Floor",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          120,
          Math.ceil(Math.max(...metrics.map((m) => m.value), 85) * 1.08)
        )
      }
    });

    ScopedLabsAnalyzer.writeFlow(FLOW_KEY, {
      category: "compute",
      step: "raid-rebuild-time",
      data: {
        hours,
        risk,
        crossCheck,
        status: analyzer.status
      }
    });

    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continue);
    hasResult = true;
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.driveTb.value = 16;
    els.mbps.value = 120;
    els.load.value = "0.7";
    els.raid.value = "5";
    els.verify.value = "no";
    invalidate();
  });

  ["driveTb", "mbps", "load", "raid", "verify"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/compute/backup-window/";
  });

  refreshFlowNote();
  ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continue);
})();