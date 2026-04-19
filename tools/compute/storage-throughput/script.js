(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "storage-throughput";
  const LANE = "v1";
  const PREVIOUS_STEP = "storage-iops";

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
  let iopsContext = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    iops: $("iops"),
    kb: $("kb"),
    readPct: $("readPct"),
    writePct: $("writePct"),
    overhead: $("overhead"),
    results: $("results"),
    flowNote: $("flow-note"),
    analysisCopy: $("analysis-copy"),
    continueWrap: $("continue-wrap"),
    continue: $("continue"),
    calc: $("calc"),
    reset: $("reset"),
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard")
  };

  function hasStoredAuth() {
    try {
      const k = Object.keys(localStorage).find((x) => x.startsWith("sb-"));
      if (!k) return false;
      const raw = JSON.parse(localStorage.getItem(k));
      return !!(
        raw?.access_token ||
        raw?.currentSession?.access_token ||
        (Array.isArray(raw) ? raw[0]?.access_token : null)
      );
    } catch {
      return false;
    }
  }

  function getUnlockedCategories() {
    try {
      const raw = localStorage.getItem("sl_unlocked_categories");
      if (!raw) return [];
      return raw.split(",").map((x) => String(x).trim().toLowerCase()).filter(Boolean);
    } catch {
      return [];
    }
  }

  function unlockCategoryPage() {
    const category = String(document.body?.dataset?.category || "").trim().toLowerCase();
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    if (signedIn && unlocked) {
      if (els.lockedCard) els.lockedCard.style.display = "none";
      if (els.toolCard) els.toolCard.style.display = "";
      return true;
    }

    if (els.lockedCard) els.lockedCard.style.display = "";
    if (els.toolCard) els.toolCard.style.display = "none";
    return false;
  }

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
      iopsContext = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      iopsContext = null;
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      iopsContext = null;
      return;
    }

    iopsContext = parsed.data || {};

    const rows = [];
    if (typeof iopsContext.finalIops === "number") rows.push(`Required IOPS: <strong>${Math.round(iopsContext.finalIops)}</strong>`);
    if (typeof iopsContext.storagePressure === "string") rows.push(`Storage Pressure: <strong>${iopsContext.storagePressure}</strong>`);
    if (typeof iopsContext.primaryConstraint === "string") rows.push(`Primary Constraint: <strong>${iopsContext.primaryConstraint}</strong>`);
    if (typeof iopsContext.status === "string") rows.push(`IOPS Status: <strong>${iopsContext.status}</strong>`);

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
      This step checks whether throughput becomes the next practical storage limiter after the random IOPS profile already defined upstream.
    `;
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
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
    const iops = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.iops.value, 0));
    const kb = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.kb.value, 1));
    const readPct = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.readPct.value, 0), 0, 100);
    const writePct = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.writePct.value, 0), 0, 100);
    const overhead = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.overhead.value, 0));

    const pctTotal = Math.max(readPct + writePct, 1);
    const normalizedReadPct = (readPct / pctTotal) * 100;
    const normalizedWritePct = (writePct / pctTotal) * 100;

    const readIops = iops * (normalizedReadPct / 100);
    const writeIops = iops * (normalizedWritePct / 100);

    const readMBps = (readIops * kb) / 1024;
    const writeMBps = (writeIops * kb) / 1024;
    const baseMBps = readMBps + writeMBps;
    const finalMBps = baseMBps * (1 + overhead / 100);

    const seqBias = Math.min(160, (kb / 128) * 100);
    const throughputPressure = Math.min(160, finalMBps / 20);
    const overheadStress = Math.min(160, overhead * 2.2);

    const metrics = [
      {
        label: "Throughput Pressure",
        value: throughputPressure,
        displayValue: `${Math.round(throughputPressure)}%`
      },
      {
        label: "Sequential Bias",
        value: seqBias,
        displayValue: `${Math.round(seqBias)}%`
      },
      {
        label: "Overhead Stress",
        value: overheadStress,
        displayValue: `${Math.round(overheadStress)}%`
      }
    ];

    const compositeScore = Math.round(
      (throughputPressure * 0.50) +
      (seqBias * 0.30) +
      (overheadStress * 0.20)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let throughputClass = "Balanced";
    if (finalMBps > 500) throughputClass = "High Throughput Demand";
    if (finalMBps > 1500) throughputClass = "Extreme Throughput Demand";

    let workloadPattern = "Mixed / General";
    if (kb >= 128 && finalMBps > 300) {
      workloadPattern = "Sequential throughput-heavy";
    } else if (iopsContext && typeof iopsContext.finalIops === "number" && iopsContext.finalIops > 20000 && finalMBps < 300) {
      workloadPattern = "Random IOPS-heavy";
    } else if (kb <= 16 && iops > 10000) {
      workloadPattern = "Small-block random";
    }

    let dominantConstraint = "Balanced storage flow";
    if (analyzer.dominant.label === "Throughput Pressure") {
      dominantConstraint = "Media throughput ceiling";
    } else if (analyzer.dominant.label === "Sequential Bias") {
      dominantConstraint = "Large-block transfer profile";
    } else if (analyzer.dominant.label === "Overhead Stress") {
      dominantConstraint = "Protocol / filesystem overhead";
    }

    let crossCheck = "IOPS and throughput appear reasonably aligned";
    if (iopsContext && typeof iopsContext.finalIops === "number") {
      if (iopsContext.finalIops > 20000 && finalMBps < 300) {
        crossCheck = "High IOPS with modest MB/s suggests a random workload where latency still matters more than raw throughput";
      } else if (finalMBps > 1000 && iopsContext.finalIops < 5000) {
        crossCheck = "Throughput demand is outrunning IOPS density, which points toward a sequential or large-block transfer profile";
      } else if (iopsContext.status === "RISK" && analyzer.status !== "RISK") {
        crossCheck = "IOPS pressure may still dominate before throughput becomes the true first bottleneck";
      }
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The storage path is crowding its usable throughput envelope. Large-block transfer demand, protocol overhead, or sustained movement of data will begin reducing margin before the rest of the compute stack can scale cleanly.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The throughput profile is workable, but reserve is tightening. The design should operate, although larger block sizes, sequential bursts, or transport overhead will consume available margin faster than the base MB/s figure implies.";
    } else {
      interpretation =
        "The throughput requirement remains inside a manageable operating envelope. Current transfer demand and overhead leave room for normal burst behavior without making throughput the first likely scaling wall.";
    }

    let guidance = "A balanced storage design should maintain throughput reserve above sustained transfer demand.";
    if (analyzer.status === "WATCH") {
      guidance =
        "Validate controller path, transport layer, and future block-size growth before locking hardware. This is where sequential load can force a move to faster media or a wider storage path sooner than expected.";
    }
    if (analyzer.status === "RISK") {
      guidance =
        `Rework the throughput plan before continuing. The primary limiter is ${dominantConstraint.toLowerCase()}, so scaling headroom will collapse there first. Reduce transfer size, raise available bandwidth, or move to faster media and transport.`;
    }

    const summaryRows = [
      { label: "Read Throughput", value: `${readMBps.toFixed(1)} MB/s` },
      { label: "Write Throughput", value: `${writeMBps.toFixed(1)} MB/s` },
      { label: "Base Throughput", value: `${baseMBps.toFixed(1)} MB/s` },
      { label: "Estimated Required Throughput", value: `${finalMBps.toFixed(1)} MB/s` },
      { label: "Read / Write Mix", value: `${normalizedReadPct.toFixed(0)}% / ${normalizedWritePct.toFixed(0)}%` },
      { label: "Avg I/O Size", value: `${kb.toFixed(0)} KB` }
    ];

    const derivedRows = [
      { label: "Throughput Class", value: throughputClass },
      { label: "Workload Pattern", value: workloadPattern },
      { label: "Cross-Check", value: crossCheck }
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
        axisTitle: "Storage Throughput Magnitude",
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
        finalMBps,
        throughputClass,
        workloadPattern,
        crossCheck,
        status: analyzer.status
      }
    });

    hasResult = true;
    showContinue();
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.iops.value = 5000;
    els.kb.value = 32;
    els.readPct.value = 70;
    els.writePct.value = 30;
    els.overhead.value = 15;
    invalidate();
  });

  ["iops", "kb", "readPct", "writePct", "overhead"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/compute/vm-density/";
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    unlockCategoryPage();
    setTimeout(() => {
      unlockCategoryPage();
    }, 400);

    refreshFlowNote();
    hideContinue();
  });
})();