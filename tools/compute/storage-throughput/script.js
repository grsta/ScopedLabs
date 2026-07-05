(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "storage-throughput";
  const LANE = "v1";
  const PREVIOUS_STEP = "storage-iops";
  const State = window.ScopedLabsComputePlanState;

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
        availableMBps: $("availableMBps"),
    peakMultiplier: $("peakMultiplier"),
    growthPct: $("growthPct"),
    datasetTB: $("datasetTB"),
    transferWindowHours: $("transferWindowHours"),
    transportPath: $("transportPath"),
    mediaTier: $("mediaTier"),
    workloadType: $("workloadType"),
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


  function saveComputeLedgerResult(payload) {
    if (!State || typeof State.recordToolResult !== "function") return null;

    try {
      return State.recordToolResult(STEP, payload);
    } catch {
      return null;
    }
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

  function storageThroughputLabel(map, value, fallback) {
    return map[value] || fallback || "Unspecified";
  }

  function storageThroughputTransportLabel(value) {
    return storageThroughputLabel({
      "10g": "10 GbE / shared path",
      "25g": "25 GbE / faster shared path",
      "40g": "40 GbE / storage fabric",
      "100g": "100 GbE / high-speed fabric",
      local: "Local storage bus",
      "san-nas": "SAN / NAS array path",
      "cloud-object": "Cloud / object storage path"
    }, value, "Unspecified transport path");
  }

  function storageThroughputMediaLabel(value) {
    return storageThroughputLabel({
      hdd: "HDD / spinning disk",
      "sata-ssd": "SATA / SAS SSD",
      nvme: "NVMe / high-performance tier",
      "shared-array": "Shared storage array",
      "object-cloud": "Object / cloud-backed storage"
    }, value, "Unspecified media tier");
  }

  function storageThroughputWorkloadLabel(value) {
    return storageThroughputLabel({
      backup: "Backup",
      restore: "Restore",
      "file-transfer": "File transfer",
      "analytics-read": "Analytics read",
      "vm-datastore": "VM datastore",
      archive: "Archive / retention"
    }, value, "Unspecified workload type");
  }

  function formatStorageThroughputMBps(value) {
    return Number(value || 0).toFixed(1) + " MB/s";
  }

  function calc() {
    const iops = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.iops.value, 0));
    const kb = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.kb.value, 1));
    const readPct = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.readPct.value, 0), 0, 100);
    const writePct = ScopedLabsAnalyzer.clamp(ScopedLabsAnalyzer.safeNumber(els.writePct.value, 0), 0, 100);
    const overhead = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.overhead.value, 0));
    const availableThroughputMBps = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.availableMBps.value, 0));
    const peakMultiplier = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.peakMultiplier.value, 1));
    const growthPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.growthPct.value, 0));
    const datasetTB = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.datasetTB.value, 0));
    const transferWindowHours = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.transferWindowHours.value, 0.1));
    const transportPath = String(els.transportPath.value || "10g");
    const mediaTier = String(els.mediaTier.value || "sata-ssd");
    const workloadType = String(els.workloadType.value || "vm-datastore");

    const transportPathLabel = storageThroughputTransportLabel(transportPath);
    const mediaTierLabel = storageThroughputMediaLabel(mediaTier);
    const workloadTypeLabel = storageThroughputWorkloadLabel(workloadType);

    const pctTotal = Math.max(readPct + writePct, 1);
    const normalizedReadPct = (readPct / pctTotal) * 100;
    const normalizedWritePct = (writePct / pctTotal) * 100;

    const readIops = iops * (normalizedReadPct / 100);
    const writeIops = iops * (normalizedWritePct / 100);

    const readMBps = (readIops * kb) / 1024;
    const writeMBps = (writeIops * kb) / 1024;
    const baseMBps = readMBps + writeMBps;
    const overheadAdjustedMBps = baseMBps * (1 + overhead / 100);
    const burstAdjustedMBps = overheadAdjustedMBps * peakMultiplier;
    const growthAdjustedMBps = burstAdjustedMBps * (1 + growthPct / 100);

    const transferWindowRequiredMBps = datasetTB > 0
      ? (datasetTB * 1024 * 1024) / (transferWindowHours * 3600)
      : 0;

    const requiredThroughputMBps = Math.max(growthAdjustedMBps, transferWindowRequiredMBps);
    const throughputUtilizationPct = availableThroughputMBps > 0
      ? (requiredThroughputMBps / availableThroughputMBps) * 100
      : 0;

    const headroomMBps = availableThroughputMBps > 0 ? availableThroughputMBps - requiredThroughputMBps : 0;
    const deficitMBps = availableThroughputMBps > 0 ? Math.max(0, requiredThroughputMBps - availableThroughputMBps) : 0;

    const seqBias = Math.min(160, (kb / 128) * 100);
    const utilizationPressure = availableThroughputMBps > 0 ? Math.min(160, throughputUtilizationPct) : Math.min(160, requiredThroughputMBps / 20);
    const windowPressure = requiredThroughputMBps > 0 ? Math.min(160, (transferWindowRequiredMBps / requiredThroughputMBps) * 100) : 0;
    const overheadStress = Math.min(160, overhead * 2.2);

    let status = "GOOD";
    if (availableThroughputMBps <= 0) {
      status = "WATCH";
    } else if (requiredThroughputMBps > availableThroughputMBps) {
      status = "RISK";
    } else if (
      throughputUtilizationPct >= 75 ||
      headroomMBps < Math.max(100, requiredThroughputMBps * 0.25) ||
      transferWindowRequiredMBps >= growthAdjustedMBps * 0.90
    ) {
      status = "WATCH";
    }

    let throughputClass = "Balanced throughput demand";
    if (requiredThroughputMBps > 500) throughputClass = "High throughput demand";
    if (requiredThroughputMBps > 1500) throughputClass = "Extreme throughput demand";

    let workloadPattern = "Mixed / general throughput";
    if (transferWindowRequiredMBps >= growthAdjustedMBps && datasetTB > 0) {
      workloadPattern = "Window-bound bulk transfer";
    } else if (kb >= 128 && requiredThroughputMBps > 300) {
      workloadPattern = "Sequential throughput-heavy";
    } else if (iops > 10000 && kb <= 16) {
      workloadPattern = "Small-block random throughput";
    } else if (transportPath === "cloud-object") {
      workloadPattern = "Cloud/object path sensitive";
    }

    let dominantConstraint = "Balanced storage flow";
    if (availableThroughputMBps > 0 && requiredThroughputMBps > availableThroughputMBps) {
      dominantConstraint = transportPathLabel + " ceiling";
    } else if (transferWindowRequiredMBps >= growthAdjustedMBps && transferWindowRequiredMBps > 0) {
      dominantConstraint = "Transfer window requirement";
    } else if (mediaTier === "hdd" && requiredThroughputMBps > 300) {
      dominantConstraint = "Media tier throughput ceiling";
    } else if (overhead >= 25) {
      dominantConstraint = "Protocol / filesystem overhead";
    } else if (kb >= 128) {
      dominantConstraint = "Large-block transfer profile";
    }

    let crossCheck = "IOPS and throughput appear reasonably aligned";
    if (iopsContext && typeof iopsContext.finalIops === "number") {
      if (iopsContext.finalIops > 20000 && requiredThroughputMBps < 300) {
        crossCheck = "High upstream IOPS with modest MB/s suggests random workload pressure where latency may still matter more than raw throughput.";
      } else if (requiredThroughputMBps > 1000 && iopsContext.finalIops < 5000) {
        crossCheck = "Throughput demand is outrunning IOPS density, which points toward sequential or large-block transfer behavior.";
      } else if (iopsContext.status === "RISK" && status !== "RISK") {
        crossCheck = "Upstream IOPS pressure may still dominate before throughput becomes the first bottleneck.";
      }
    }

    const interpretation = status === "RISK"
      ? "Required throughput exceeds the entered available storage path ceiling. Rework the media tier, transport path, transfer window, burst/growth assumptions, or dataset movement plan before carrying this result forward."
      : status === "WATCH"
        ? "The throughput plan is usable for planning, but reserve is tightening. Validate the available path, transfer window, media tier, and protocol overhead before locking hardware."
        : "Required throughput fits inside the entered available path with usable planning margin. Carry this throughput target forward with the selected transport path and media tier assumptions.";

    const guidance = status === "RISK"
      ? "Increase available path throughput, widen the transfer window, reduce dataset movement, lower overhead, or move to a faster media/transport tier before continuing."
      : status === "WATCH"
        ? "Validate controller path, transport layer, future block-size growth, and transfer-window assumptions before locking hardware."
        : "Maintain throughput reserve above sustained transfer demand and verify the selected path under the expected block size and workload type.";

    const metrics = [
      { label: "Utilization Pressure", value: utilizationPressure, displayValue: Math.round(utilizationPressure) + "%" },
      { label: "Transfer Window Pressure", value: windowPressure, displayValue: Math.round(windowPressure) + "%" },
      { label: "Sequential Bias", value: seqBias, displayValue: Math.round(seqBias) + "%" },
      { label: "Overhead Stress", value: overheadStress, displayValue: Math.round(overheadStress) + "%" }
    ];

    const summaryRows = [
      { label: "Read Throughput", value: formatStorageThroughputMBps(readMBps) },
      { label: "Write Throughput", value: formatStorageThroughputMBps(writeMBps) },
      { label: "Base Throughput", value: formatStorageThroughputMBps(baseMBps) },
      { label: "Burst / Growth Required", value: formatStorageThroughputMBps(growthAdjustedMBps) },
      { label: "Transfer Window Required", value: formatStorageThroughputMBps(transferWindowRequiredMBps) },
      { label: "Estimated Required Throughput", value: formatStorageThroughputMBps(requiredThroughputMBps) },
      { label: "Available Path Throughput", value: availableThroughputMBps > 0 ? formatStorageThroughputMBps(availableThroughputMBps) : "Not provided" },
      { label: "Headroom / Deficit", value: availableThroughputMBps > 0 ? formatStorageThroughputMBps(headroomMBps) : "Not provided" },
      { label: "Utilization", value: availableThroughputMBps > 0 ? throughputUtilizationPct.toFixed(0) + "%" : "Not provided" }
    ];

    const derivedRows = [
      { label: "Throughput Class", value: throughputClass },
      { label: "Workload Pattern", value: workloadPattern },
      { label: "Transport Path", value: transportPathLabel },
      { label: "Media Tier", value: mediaTierLabel },
      { label: "Workload Type", value: workloadTypeLabel },
      { label: "Dominant Constraint", value: dominantConstraint },
      { label: "Cross-Check", value: crossCheck }
    ];

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows,
      derivedRows,
      status,
      interpretation,
      dominantConstraint,
      guidance,
      chart: {
        labels: metrics.map((m) => m.label),
        values: metrics.map((m) => m.value),
        displayValues: metrics.map((m) => m.displayValue),
        referenceValue: 70,
        healthyMax: 70,
        watchMax: 90,
        axisTitle: "Storage Throughput Planning Pressure",
        referenceLabel: "Planning Margin Target",
        healthyLabel: "Good",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(120, Math.ceil(Math.max(...metrics.map((m) => m.value), 90) * 1.08))
      }
    });

    const flowPayload = {
      finalMBps: requiredThroughputMBps,
      requiredThroughputMBps,
      availableThroughputMBps,
      throughputUtilizationPct,
      utilizationPct: throughputUtilizationPct,
      headroomMBps,
      deficitMBps,
      transferWindowRequiredMBps,
      transferWindowHours,
      datasetTB,
      transportPath,
      transportPathLabel,
      mediaTier,
      mediaTierLabel,
      workloadType,
      workloadTypeLabel,
      throughputClass,
      workloadPattern,
      crossCheck,
      dominantConstraint,
      status,
      blockSizeKb: kb,
      overheadPct: overhead,
      peakMultiplier,
      growthPct,
      readMBps,
      writeMBps,
      baseMBps,
      burstAdjustedMBps,
      growthAdjustedMBps,
      upstreamRequiredIops: iopsContext && typeof iopsContext.finalIops === "number" ? iopsContext.finalIops : iops
    };

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: flowPayload
    });

    saveComputeLedgerResult({
      label: "Storage Throughput",
      summary: formatStorageThroughputMBps(requiredThroughputMBps) + " required; " + workloadPattern,
      status,
      summaryStatus: status,
      keySavedResult: formatStorageThroughputMBps(requiredThroughputMBps) + " / " + status,
      outputs: flowPayload
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
    els.availableMBps.value = 1000;
    els.peakMultiplier.value = 1.25;
    els.growthPct.value = 20;
    els.datasetTB.value = 2;
    els.transferWindowHours.value = 4;
    els.transportPath.value = "10g";
    els.mediaTier.value = "sata-ssd";
    els.workloadType.value = "vm-datastore";
    invalidate();
  });

  ["iops", "kb", "readPct", "writePct", "overhead", "availableMBps", "peakMultiplier", "growthPct", "datasetTB", "transferWindowHours", "transportPath", "mediaTier", "workloadType"].forEach((id) => {
    const input = $(id);
    if (!input) return;
    input.addEventListener("input", invalidate);
    input.addEventListener("change", invalidate);
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