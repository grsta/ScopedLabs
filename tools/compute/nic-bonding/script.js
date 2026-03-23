(() => {
  const $ = (id) => document.getElementById(id);

  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "compute";
  const CURRENT_STEP = "nic-bonding";

  let cachedFlow = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    links: $("links"),
    speed: $("speed"),
    mode: $("mode"),
    hash: $("hash"),
    flows: $("flows"),
    util: $("util"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
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
        "This final networking step checks whether link bonding improves real aggregate throughput, or whether single-flow limits still dominate despite more physical links."
    });
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      emptyMessage: "Enter values and press Calculate."
    });

    refreshFlowNote();
  }

  function calc() {
    const links = Math.max(1, Math.floor(ScopedLabsAnalyzer.safeNumber(els.links.value, 1)));
    const speed = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.speed.value, 1));
    const mode = els.mode.value;
    const hash = els.hash.value;
    const flows = Math.max(1, Math.floor(ScopedLabsAnalyzer.safeNumber(els.flows.value, 1)));
    const util = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.util.value, 80), 10, 100) / 100;

    const totalRaw = links * speed;
    let aggregate = speed;
    let perFlowCap = speed;
    let behavior = "";
    let redundancy = "Single-link active redundancy";
    let balanceEfficiency = 0.35;

    if (mode === "active-backup") {
      aggregate = speed;
      perFlowCap = speed;
      redundancy = links > 1 ? `${links - 1} standby link(s)` : "No standby links";
      balanceEfficiency = 0.20;
      behavior = "One active link carries traffic while the remaining links sit in standby for failover.";
    } else if (mode === "lacp" || mode === "balance-xor") {
      const hashDepth = hash === "l34" ? 1.0 : hash === "l23" ? 0.85 : 0.65;
      const usedLinks = Math.min(links, Math.max(1, Math.floor(Math.sqrt(flows) * hashDepth)));
      aggregate = usedLinks * speed;
      perFlowCap = speed;
      redundancy = links > 1 ? "Loss of one link reduces total pool but preserves service" : "No meaningful path redundancy";
      balanceEfficiency = aggregate / Math.max(totalRaw, 0.001);
      behavior = `Traffic spreads by hash policy (${hash}). Multiple flows can aggregate, but a single flow usually remains pinned to one member.`;
    } else if (mode === "round-robin") {
      aggregate = totalRaw * 0.85;
      perFlowCap = totalRaw * 0.85;
      redundancy = links > 1 ? "Links can all forward, but packet ordering risk rises" : "No meaningful path redundancy";
      balanceEfficiency = 0.85;
      behavior = "Packets are distributed across all links. Aggregate throughput rises, but reordering risk and compatibility constraints increase sharply.";
    }

    const targetUsable = aggregate * util;

    const oversubscriptionPressure = ScopedLabsAnalyzer.clamp((targetUsable / Math.max(totalRaw, 0.001)) * 100, 0, 180);
    const singleFlowConstraint = ScopedLabsAnalyzer.clamp((speed / Math.max(targetUsable, 0.001)) * 100 * 1.1, 0, 180);
    const distributionStress = ScopedLabsAnalyzer.clamp((1 - balanceEfficiency) * 140, 0, 180);

    const metrics = [
      {
        label: "Aggregate Pressure",
        value: oversubscriptionPressure,
        displayValue: `${Math.round(oversubscriptionPressure)}%`
      },
      {
        label: "Single-Flow Constraint",
        value: singleFlowConstraint,
        displayValue: `${Math.round(singleFlowConstraint)}%`
      },
      {
        label: "Distribution Stress",
        value: distributionStress,
        displayValue: `${Math.round(distributionStress)}%`
      }
    ];

    const compositeScore = Math.round(
      (oversubscriptionPressure * 0.35) +
      (singleFlowConstraint * 0.40) +
      (distributionStress * 0.25)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let dominantConstraint = "Balanced bonding profile";
    if (analyzer.dominant.label === "Aggregate Pressure") {
      dominantConstraint = "Total bonded capacity envelope";
    } else if (analyzer.dominant.label === "Single-Flow Constraint") {
      dominantConstraint = "Per-flow throughput ceiling";
    } else if (analyzer.dominant.label === "Distribution Stress") {
      dominantConstraint = "Flow distribution inefficiency";
    }

    let bondingClass = "Balanced";
    if (mode === "active-backup") bondingClass = "Redundancy-first";
    if (mode === "lacp" || mode === "balance-xor") bondingClass = "Multi-flow aggregate";
    if (mode === "round-robin") bondingClass = "High-throughput / high-risk";

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The bonding design is likely to create false expectations. Aggregate link count may look strong on paper, but single-flow limits or poor flow distribution will become the first operational bottleneck.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The design is workable, but its real benefit depends heavily on traffic shape. Multi-flow workloads may spread acceptably, while large single flows will still behave much closer to a single-link design.";
    } else {
      interpretation =
        "The bonding profile is operating inside a manageable envelope. Aggregate capacity, flow distribution, and redundancy behavior are aligned well enough for the modeled workload mix.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Keep the current bonding mode, but validate real traffic patterns before assuming linear scale. The next pressure increase will usually show up in per-flow limitations before it shows up in total link utilization.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate whether the workload is truly multi-flow. Watch what fails first: large single transfers, uneven hash distribution, or unrealistic expectations around aggregate bandwidth.";
    } else {
      guidance =
        `Rework the bonding approach. The primary limiter is ${dominantConstraint.toLowerCase()}, not raw link count. Change the mode, improve traffic distribution, or redesign around fewer larger links if single-flow throughput matters.`;
    }

    const notes = [
      "Most LACP designs increase total capacity across many flows, not the speed of one large TCP flow.",
      "Hash policy and traffic diversity determine whether additional links are actually used.",
      "Redundancy value depends on switch config, upstream paths, and whether failure domains are truly separated."
    ].join(" ");

    const summaryRows = [
      { label: "Mode", value: mode.toUpperCase() },
      { label: "Links × Speed", value: `${links} × ${speed} Gbps` },
      { label: "Raw Total Capacity", value: `${totalRaw.toFixed(2)} Gbps` },
      { label: "Estimated Aggregate", value: `${aggregate.toFixed(2)} Gbps` },
      { label: "Target Usable", value: `${targetUsable.toFixed(2)} Gbps` },
      { label: "Single-Flow Cap", value: `${perFlowCap.toFixed(2)} Gbps` }
    ];

    const derivedRows = [
      { label: "Bonding Class", value: bondingClass },
      { label: "Redundancy Profile", value: redundancy },
      { label: "Behavior", value: behavior },
      { label: "Notes", value: notes }
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
        axisTitle: "Bonding Stress Magnitude",
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
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      data: {
        mode,
        aggregate,
        perFlowCap,
        status: analyzer.status
      }
    });
  }

  function reset() {
    els.links.value = 2;
    els.speed.value = "10";
    els.mode.value = "active-backup";
    els.hash.value = "l2";
    els.flows.value = 20;
    els.util.value = 80;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["links", "speed", "mode", "hash", "flows", "util"].forEach((id) => {
    const el = $(id);
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  refreshFlowNote();
  invalidate();
})();
