(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "backup-window";
  const LANE = "v1";
  const PREVIOUS_STEP = "raid-rebuild-time";

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

  let upstreamContext = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    dataTb: $("dataTb"),
    changePct: $("changePct"),
    type: $("type"),
    mbps: $("mbps"),
    savingsPct: $("savingsPct"),
    overheadPct: $("overheadPct"),
    results: $("results"),
    flowNote: $("flow-note"),
    completeWrap: $("complete-wrap"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continueBtn"),
    analysisCopy: $("analysis-copy"),
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

  function formatHours(hours) {
    if (!Number.isFinite(hours) || hours <= 0) return "0m";
    if (hours >= 1) {
      const whole = Math.floor(hours);
      const mins = Math.round((hours % 1) * 60);
      return `${whole}h ${mins}m`;
    }
    return `${Math.round(hours * 60)}m`;
  }

  function refreshFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstreamContext = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstreamContext = null;
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstreamContext = null;
      return;
    }

    const data = parsed.data || {};
    upstreamContext = data;

    const rows = [];
    if (Number.isFinite(Number(data.rebuildHours))) {
      rows.push(`RAID Rebuild: <strong>${formatHours(Number(data.rebuildHours))}</strong>`);
    }
    if (data.status) {
      rows.push(`Upstream Status: <strong>${String(data.status)}</strong>`);
    }
    if (data.protectionClass) {
      rows.push(`Protection Class: <strong>${String(data.protectionClass)}</strong>`);
    }
    if (data.crossCheck) {
      rows.push(`Cross-Check: <strong>${String(data.crossCheck)}</strong>`);
    }

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
      This final step checks whether backup timing still fits inside the broader resilience profile the compute platform already established.
    `;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
  }

  function invalidate() {
    try {
      sessionStorage.removeItem(FLOW_KEYS[STEP]);
    } catch {}

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      flowKey: FLOW_KEYS[STEP],
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Run calculation."
    });

    els.completeWrap.style.display = "none";
    hideContinue();
    refreshFlowNote();
  }

  function calculate() {
    const dataTb = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.dataTb.value, 0));
    const changePct = ScopedLabsAnalyzer.clamp(
      ScopedLabsAnalyzer.safeNumber(els.changePct.value, 0),
      0,
      100
    );
    const type = els.type.value;
    const mbps = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.mbps.value, 1));
    const savingsPct = ScopedLabsAnalyzer.clamp(
      ScopedLabsAnalyzer.safeNumber(els.savingsPct.value, 0),
      0,
      95
    );
    const overheadPct = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.overheadPct.value, 0));

    if (dataTb <= 0) {
      invalidate();
      return;
    }

    let sourceTb = dataTb;
    if (type === "inc") sourceTb = dataTb * (changePct / 100);
    if (type === "diff") sourceTb = dataTb * Math.min(1, (changePct / 100) * 2);

    const protectedTb = sourceTb * (1 - savingsPct / 100);
    const effectiveTb = protectedTb * (1 + overheadPct / 100);

    const totalMB = effectiveTb * 1000000;
    const seconds = totalMB / mbps;
    const hours = seconds / 3600;

    const referenceWindowHours = 8;
    const schedulePressure = ScopedLabsAnalyzer.clamp((hours / referenceWindowHours) * 100, 0, 160);

    let recoveryWindowHours = null;
    if (upstreamContext && Number.isFinite(Number(upstreamContext.rebuildHours))) {
      recoveryWindowHours = Math.max(4, Number(upstreamContext.rebuildHours));
    }

    const recoveryCollision = recoveryWindowHours
      ? ScopedLabsAnalyzer.clamp((hours / recoveryWindowHours) * 100, 0, 160)
      : ScopedLabsAnalyzer.clamp((hours / 12) * 100, 0, 160);

    const throughputDemand = ScopedLabsAnalyzer.clamp((effectiveTb / Math.max(hours, 0.01)) * 6, 0, 160);

    const metrics = [
      {
        label: "Schedule Pressure",
        value: schedulePressure,
        displayValue: `${Math.round(schedulePressure)}%`
      },
      {
        label: "Recovery Collision",
        value: recoveryCollision,
        displayValue: `${Math.round(recoveryCollision)}%`
      },
      {
        label: "Throughput Demand",
        value: throughputDemand,
        displayValue: `${Math.round(throughputDemand)}%`
      }
    ];

    const compositeScore = Math.round(
      (schedulePressure * 0.35) +
      (recoveryCollision * 0.45) +
      (throughputDemand * 0.20)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 35,
      watchMax: 65
    });

    let dominantConstraint = "Balanced protection profile";
    if (analyzer.dominant.label === "Schedule Pressure") {
      dominantConstraint = "Backup schedule envelope";
    } else if (analyzer.dominant.label === "Recovery Collision") {
      dominantConstraint = "Recovery overlap risk";
    } else if (analyzer.dominant.label === "Throughput Demand") {
      dominantConstraint = "Protection path throughput";
    }

    const backupCoveragePct = recoveryWindowHours && recoveryWindowHours > 0
      ? ScopedLabsAnalyzer.clamp((hours / recoveryWindowHours) * 100, 0, 250)
      : null;

    let protectionClass = "Balanced backup plan";
    if (hours > 8) protectionClass = "Extended backup window";
    if (hours > 16) protectionClass = "Critical backup window";

    let crossCheck = "Protection timing appears reasonably aligned with the modeled platform profile";
    if (upstreamContext && typeof upstreamContext.status === "string" && upstreamContext.status === "RISK" && analyzer.status !== "RISK") {
      crossCheck = "The upstream compute profile may still tighten before backup duration becomes the first operational limiter";
    } else if (backupCoveragePct !== null && backupCoveragePct > 100) {
      crossCheck = "Backup duration is overrunning the modeled recovery envelope";
    } else if (hours > referenceWindowHours) {
      crossCheck = "The backup window is extending beyond a typical operational protection schedule";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "Backup duration is now materially crowding the available recovery envelope. Recovery operations, backup completion, and restore confidence are no longer aligned under failure pressure.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "Backup duration is beginning to compete with recovery timing. The platform is still workable, but backup windows are consuming schedule margin that would otherwise absorb recovery events.";
    } else {
      interpretation =
        "Backup execution remains inside a workable operating envelope. The current data-change pattern and transport rate should allow protection jobs to complete without materially constraining recovery timing.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Maintain the current throughput target, keep incremental cadence tight, and monitor change-rate growth. Expansion pressure will first appear in backup duration and recovery overlap before it appears in raw storage consumption.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Reduce protected data per cycle, improve effective throughput, or split jobs by tier. Watch what fails first: overnight schedule margin, recovery overlap, or ingest contention on production storage.";
    } else {
      guidance =
        `Re-architect the backup plan. The primary limit is ${dominantConstraint.toLowerCase()}, not raw capacity. Increase throughput, segment datasets, shorten change scope, or move to a more aggressive tiered backup strategy before scaling further.`;
    }

    const summaryRows = [
      { label: "Backup Type", value: type.toUpperCase() },
      { label: "Source Data This Job", value: `${sourceTb.toFixed(2)} TB` },
      { label: "Protected Data After Savings", value: `${protectedTb.toFixed(2)} TB` },
      { label: "Effective Data with Overhead", value: `${effectiveTb.toFixed(2)} TB` },
      { label: "Effective Throughput", value: `${mbps.toFixed(0)} MB/s` },
      { label: "Backup Window", value: formatHours(hours) }
    ];

    const derivedRows = [
      { label: "Protection Class", value: protectionClass },
      { label: "Cross-Check", value: crossCheck },
      {
        label: "Backup vs Recovery Window",
        value: backupCoveragePct !== null
          ? `${backupCoveragePct.toFixed(0)}% of modeled recovery window`
          : "No modeled recovery window available"
      }
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
        referenceValue: 35,
        healthyMax: 35,
        watchMax: 65,
        axisTitle: "Backup Risk Magnitude",
        referenceLabel: "Healthy Margin Floor",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          120,
          Math.ceil(Math.max(...metrics.map((m) => m.value), 65) * 1.08)
        )
      }
    });

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: CATEGORY,
      step: STEP,
      data: {
        hours,
        backupHours: hours,
        protectionClass,
        crossCheck,
        status: analyzer.status,
        effectiveTb,
        throughputMbps: mbps
      }
    });

    els.completeWrap.style.display = "block";
    showContinue();
  }

  els.calc.addEventListener("click", calculate);

  els.reset.addEventListener("click", () => {
    els.dataTb.value = 10;
    els.changePct.value = 5;
    els.type.value = "inc";
    els.mbps.value = 250;
    els.savingsPct.value = 20;
    els.overheadPct.value = 15;
    invalidate();
  });

  ["dataTb", "changePct", "type", "mbps", "savingsPct", "overheadPct"].forEach((id) => {
    const el = $(id);
    const evt = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(evt, invalidate);
    el.addEventListener("change", invalidate);
  });

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    const unlocked = unlockCategoryPage();
    if (!unlocked) return;

    refreshFlowNote();
    hideContinue();
  });
})();