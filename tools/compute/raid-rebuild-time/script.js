(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "raid-rebuild-time";
  const LANE = "v1";
  const PREVIOUS_STEP = "power-thermal";

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

  function refreshFlowNote() {
    const raw = sessionStorage.getItem(FLOW_KEYS[PREVIOUS_STEP]);
    if (!raw) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstream = null;
      return;
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstream = null;
      return;
    }

    if (!parsed || parsed.category !== CATEGORY || parsed.step !== PREVIOUS_STEP) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      upstream = null;
      return;
    }

    upstream = parsed.data || {};

    const rows = [];
    if (typeof upstream.totalW === "number") rows.push(`Power Load: <strong>${upstream.totalW.toFixed(0)} W</strong>`);
    if (typeof upstream.tons === "number") rows.push(`Cooling: <strong>${upstream.tons.toFixed(2)} tons</strong>`);
    if (typeof upstream.pressure === "string") rows.push(`Thermal Pressure: <strong>${upstream.pressure}</strong>`);

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
      This step checks how long the platform remains exposed after a disk failure and whether rebuild behavior starts colliding with the infrastructure profile already modeled upstream.
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
      sessionStorage.removeItem(FLOW_KEYS["backup-window"]);
    } catch {}

    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      flowKey: FLOW_KEYS[STEP],
      category: CATEGORY,
      step: STEP,
      lane: LANE,
      emptyMessage: "Enter values and press Calculate."
    });

    hideContinue();
    refreshFlowNote();
  }

  function calculate() {
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

    ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP], {
      category: "compute",
      step: "raid-rebuild-time",
      data: {
        hours,
        rebuildHours: hours,
        risk,
        crossCheck,
        status: analyzer.status,
        protectionClass: hours > 72 ? "Critical exposure" : hours > 48 ? "High exposure" : hours > 24 ? "Elevated exposure" : "Manageable exposure"
      }
    });

    showContinue();
  }

  els.calc.addEventListener("click", calculate);

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

  window.addEventListener("DOMContentLoaded", () => {
    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();

    const unlocked = unlockCategoryPage();
    if (!unlocked) return;

    refreshFlowNote();
    hideContinue();
  });
})();