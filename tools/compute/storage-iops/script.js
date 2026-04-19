(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "storage-iops";
  const LANE = "v1";
  const PREVIOUS_STEP = "ram-sizing";

  const FLOW_KEYS = {
    "cpu-sizing": "scopedlabs:pipeline:compute:cpu-sizing",
    "ram-sizing": "scopedlabs:pipeline:compute:ram-sizing",
    "storage-iops": "scopedlabs:pipeline:compute:storage-iops",
    "storage-throughput": "scopedlabs:pipeline:compute:storage-throughput",
    "vm-density": "scopedlabs:pipeline:compute:vm-density",
    "gpu-vram": "scopedlabs:pipeline:compute:gpu-vram",
    "power-thermal": "scopedlabs:pipeline:compute:power-thermal",
    "raid-rebuild-time": "scopedlabs:pipeline:compute:raid-rebuild-time",
    "backup-window": "scopedlabs:pipeline:compute:backup-window"
  };

  const $ = (id) => document.getElementById(id);

  let hasResult = false;
  let ramContext = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    tps: $("tps"),
    reads: $("reads"),
    writes: $("writes"),
    penalty: $("penalty"),
    headroom: $("headroom"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset")
  };

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.continue) els.continue.disabled = false;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continue) els.continue.disabled = true;
  }

  function refreshFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      ramContext = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      ramContext = null;
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      ramContext = null;
      return;
    }

    const data = parsed.data || {};
    ramContext = data;

    const rows = [];
    if (typeof data.ram === "number") rows.push(`Recommended RAM: <strong>${data.ram} GB</strong>`);
    if (typeof data.totalRequired === "number") rows.push(`Estimated Total: <strong>${Number(data.totalRequired).toFixed(1)} GB</strong>`);
    if (typeof data.status === "string") rows.push(`Memory Status: <strong>${data.status}</strong>`);
    if (typeof data.dominantConstraint === "string") rows.push(`Primary Constraint: <strong>${data.dominantConstraint}</strong>`);

    if (!rows.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      ${rows.join(" | ")}
      <br><br>
      This step checks whether storage performance becomes the next practical bottleneck after the memory profile already defined upstream.
    `;
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
      sessionStorage.removeItem(FLOW_KEYS["storage-throughput"]);
      sessionStorage.removeItem(FLOW_KEYS["vm-density"]);
      sessionStorage.removeItem(FLOW_KEYS["gpu-vram"]);
      sessionStorage.removeItem(FLOW_KEYS["power-thermal"]);
      sessionStorage.removeItem(FLOW_KEYS["raid-rebuild-time"]);
      sessionStorage.removeItem(FLOW_KEYS["backup-window"]);
    } catch {}

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: null,
      continueBtnEl: null,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      flowKey: FLOW_KEYS[STEP],
      category: CATEGORY,
      step: STEP,
      lane: LANE
    });

    hasResult = false;
    hideContinue();
    refreshFlowNote();
  }

  function calc() {
    const tps = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.tps.value, 0));
    const reads = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.reads.value, 0));
    const writes = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.writes.value, 0));
    const penalty = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.penalty.value, 1));
    const headroomPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.headroom.value, 0));

    const readIops = tps * reads;
    const baseWriteIops = tps * writes;
    const writeIops = baseWriteIops * penalty;
    const subtotal = readIops + writeIops;
    const reserveIops = subtotal * (headroomPct / 100);
    const finalIops = subtotal + reserveIops;

    const writePenaltyStress = Math.min(160, ((penalty - 1) / 5) * 100);
    const capacityPressure = Math.min(160, finalIops / 600);
    const burstExposure = Math.min(160, (reserveIops / Math.max(finalIops, 1)) * 100 * 2.4);

    const metrics = [
      {
        label: "Capacity Pressure",
        value: capacityPressure,
        displayValue: `${Math.round(capacityPressure)}%`
      },
      {
        label: "Write Penalty Stress",
        value: writePenaltyStress,
        displayValue: `${Math.round(writePenaltyStress)}%`
      },
      {
        label: "Burst Exposure",
        value: burstExposure,
        displayValue: `${Math.round(burstExposure)}%`
      }
    ];

    const compositeScore = Math.round(
      (capacityPressure * 0.50) +
      (writePenaltyStress * 0.30) +
      (burstExposure * 0.20)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let storagePressure = "Balanced";
    if (finalIops > 10000) storagePressure = "High IOPS Demand";
    if (finalIops > 50000) storagePressure = "Extreme IOPS Demand";

    let dominantConstraint = "Balanced storage profile";
    if (analyzer.dominant.label === "Capacity Pressure") {
      dominantConstraint = "Storage performance ceiling";
    } else if (analyzer.dominant.label === "Write Penalty Stress") {
      dominantConstraint = "RAID write amplification";
    } else if (analyzer.dominant.label === "Burst Exposure") {
      dominantConstraint = "Peak transaction volatility";
    }

    let primaryConstraint = "Balanced";
    if (ramContext && typeof ramContext.status === "string" && ramContext.status === "RISK" && analyzer.status !== "RISK") {
      primaryConstraint = "Memory pressure may still dominate";
    } else if (analyzer.status === "RISK") {
      primaryConstraint = "Storage is likely primary bottleneck";
    } else if (analyzer.status === "WATCH") {
      primaryConstraint = "Storage headroom is tightening";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The workload is crowding the storage layer too tightly. Queue depth, write amplification, or burst behavior will begin degrading responsiveness before the rest of the compute stack has room to scale cleanly.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The storage profile is workable, but reserve is narrowing. The design should run, although higher write activity, RAID penalty, or sustained spikes will reduce margin faster than the raw IOPS number suggests.";
    } else {
      interpretation =
        "The storage requirement remains inside a manageable operating envelope. Current read/write demand and reserve allowance leave room for normal burst behavior without making storage the first likely scaling wall.";
    }

    let guidance = "A balanced storage design should maintain headroom above normal peaks.";
    if (analyzer.status === "WATCH") {
      guidance =
        "Validate controller cache, disk tier, and future write growth before locking hardware. This is where RAID penalty and sustained transaction spikes can force an early move to faster media.";
    }
    if (analyzer.status === "RISK") {
      guidance =
        `Rework the storage plan before continuing. The primary limiter is ${dominantConstraint.toLowerCase()}, so performance will tighten there first. Reduce write amplification, raise media performance, or increase available IOPS headroom.`;
    }

    const summaryRows = [
      { label: "Read IOPS", value: `${readIops.toFixed(0)}` },
      { label: "Base Write IOPS", value: `${baseWriteIops.toFixed(0)}` },
      { label: "Write IOPS (penalized)", value: `${writeIops.toFixed(0)}` },
      { label: "Subtotal IOPS", value: `${subtotal.toFixed(0)}` },
      { label: "Reserve / Headroom", value: `${reserveIops.toFixed(0)} IOPS` },
      { label: "Estimated Required IOPS", value: `${finalIops.toFixed(0)}` }
    ];

    const derivedRows = [
      { label: "Storage Pressure", value: storagePressure },
      { label: "Primary Constraint", value: primaryConstraint },
      { label: "RAID Penalty", value: `×${penalty}` }
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
        axisTitle: "Storage Stress Magnitude",
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

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        readIops,
        writeIops,
        subtotal,
        finalIops,
        storagePressure,
        primaryConstraint,
        status: analyzer.status
      }
    });

    hasResult = true;
    showContinue();
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.tps.value = 2000;
    els.reads.value = 2;
    els.writes.value = 1;
    els.penalty.value = "4";
    els.headroom.value = 30;
    invalidate();
  });

  ["tps", "reads", "writes", "penalty", "headroom"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/compute/storage-throughput/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    refreshFlowNote();
    hideContinue();
  });
})();