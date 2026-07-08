(() => {
  "use strict";

  const CATEGORY = "compute";
  const STEP = "power-thermal";
  const LANE = "v1";
  const PREVIOUS_STEP = "gpu-vram";
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

  let upstream = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };
  let currentPowerThermalExportResult = null;

  const els = {
    nodes: $("nodes"),
    watts: $("watts"),
    peak: $("peak"),
    overhead: $("overhead"),
    rackKw: $("rackKw"),
    circuitVoltage: $("circuitVoltage"),
    circuitAmps: $("circuitAmps"),
    coolingTons: $("coolingTons"),
    rackKw: $("rackKw"),
    circuitVoltage: $("circuitVoltage"),
    circuitAmps: $("circuitAmps"),
    coolingTons: $("coolingTons"),
    results: $("results"),
    powerThermalSummaryCard: $("computePowerThermalSummaryCard"),
    powerThermalSummary: $("computePowerThermalSummary"),
    powerThermalReferencesCard: $("computePowerThermalReferencesCard"),
    powerThermalReferences: $("computePowerThermalReferences"),
    powerThermalActionsCard: $("computePowerThermalActionsCard"),
    powerThermalActions: $("computePowerThermalActions"),
    powerThermalDecisionScheduleCard: $("computePowerThermalDecisionScheduleCard"),
    powerThermalDecisionSchedule: $("computePowerThermalDecisionSchedule"),
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

    const lines = [];
    if (upstream.gpu === "none") {
      lines.push(`GPU Requirement: <strong>Not Required</strong>`);
      lines.push(`Pipeline Path: <strong>CPU-only system</strong>`);
    } else {
      if (typeof upstream.vram === "number") lines.push(`Estimated VRAM: <strong>${Number(upstream.vram).toFixed(2)} GB</strong>`);
      if (typeof upstream.gpuClass === "string") lines.push(`GPU Class: <strong>${upstream.gpuClass}</strong>`);
      if (typeof upstream.status === "string") lines.push(`GPU Status: <strong>${upstream.status}</strong>`);
    }

    if (!lines.length) {
      els.flowNote.hidden = true;
      els.flowNote.innerHTML = "";
      return;
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Flow Context</strong><br>
      ${lines.join(" | ")}
      <br><br>
      This step checks whether the compute profile — including any GPU path — still fits inside a practical rack power and cooling envelope.
    `;
  }

  function hideContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "none";
    if (els.continue) els.continue.disabled = true;
  }

  function showContinue() {
    if (els.continueWrap) els.continueWrap.style.display = "flex";
    if (els.continue) els.continue.disabled = false;
  }



  function showPowerThermalCard(card, mount, html) {
    if (!card || !mount || !html) return false;
    mount.innerHTML = html;
    card.hidden = false;
    return true;
  }

  function resolvePowerThermalNextRoute(status) {
    return {
      routeIntent: status === "RISK" ? "planner-review-before-summary" : "continue-to-summary",
      nextTool: "summary",
      nextHref: "/tools/compute/summary/"
    };
  }

  function renderPowerThermalSharedOutput(result) {
    const assistant = window.ScopedLabsComputeAssistant || window.ScopedLabsComputeAssistantContract || {};
    if (typeof assistant.renderPowerThermalSummaryCard === "function") {
      showPowerThermalCard(els.powerThermalSummaryCard, els.powerThermalSummary, assistant.renderPowerThermalSummaryCard(result));
    }
    if (typeof assistant.renderPowerThermalRecommendationReferences === "function") {
      showPowerThermalCard(els.powerThermalReferencesCard, els.powerThermalReferences, assistant.renderPowerThermalRecommendationReferences(result));
    }
    if (typeof assistant.renderPowerThermalRecommendedActions === "function") {
      showPowerThermalCard(els.powerThermalActionsCard, els.powerThermalActions, assistant.renderPowerThermalRecommendedActions(result));
    }
    if (typeof assistant.renderPowerThermalDecisionSchedule === "function") {
      showPowerThermalCard(els.powerThermalDecisionScheduleCard, els.powerThermalDecisionSchedule, assistant.renderPowerThermalDecisionSchedule(result));
    }
  }

  function buildPowerThermalExportPayload() {
    const result = currentPowerThermalExportResult || {};
    const sections = [];
    [
      ["Power / Thermal Result Summary", els.powerThermalSummaryCard],
      ["Recommendation References", els.powerThermalReferencesCard],
      ["Assistant Recommended Actions", els.powerThermalActionsCard],
      ["Power / Thermal Decision Schedule", els.powerThermalDecisionScheduleCard]
    ].forEach(function (item) {
      if (item[1] && !item[1].hidden) sections.push({ title: item[0], html: item[1].innerHTML });
    });
    return {
      title: "Compute Power & Thermal Assessment",
      summary: result.summary || "",
      status: result.status || "",
      sections
    };
  }

  window.ScopedLabsComputePowerThermalExport = {
    buildPayload: buildPowerThermalExportPayload
  };

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
      sessionStorage.removeItem(FLOW_KEYS["raid-rebuild-time"]);
      sessionStorage.removeItem(FLOW_KEYS["backup-window"]);
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

    hideContinue();
    refreshFlowNote();
  }

  function calculate() {
    const nodes = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.nodes.value, 1));
    const watts = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.watts.value, 0));
    const peak = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.peak.value, 1));
    const overhead = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.overhead.value, 0));
    const rackKw = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.rackKw.value, 5));
    const circuitVoltage = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.circuitVoltage.value, 208));
    const circuitAmps = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.circuitAmps.value, 24));
    const coolingTonsAvailable = Math.max(0.1, ScopedLabsAnalyzer.safeNumber(els.coolingTons.value, 3));

    const baseWatts = nodes * watts;
    const peakWatts = baseWatts * peak;
    const totalW = peakWatts * (1 + overhead / 100);
    const btu = totalW * 3.412141633;
    const tons = btu / 12000;
    const amps120 = totalW / 120;
    const amps208 = totalW / 208;
    const circuitAmpsUsed = totalW / circuitVoltage;
    const rackPowerLimitW = rackKw * 1000;

    let gpuNote = "GPU not included in this step.";
    if (upstream) {
      if (upstream.gpu === "none") {
        gpuNote = "GPU was intentionally skipped for this design.";
      } else if (typeof upstream.vram === "number") {
        gpuNote = `GPU is part of this design path (estimated VRAM ${Number(upstream.vram).toFixed(2)} GB). Add actual GPU board wattage into node power if not already included.`;
      }
    }

    const rackPowerPressure = ScopedLabsAnalyzer.clamp((totalW / rackPowerLimitW) * 100, 0, 180);
    const coolingPressure = ScopedLabsAnalyzer.clamp((tons / coolingTonsAvailable) * 100, 0, 180);
    const circuitPressure = ScopedLabsAnalyzer.clamp((circuitAmpsUsed / circuitAmps) * 100, 0, 180);

    const metrics = [
      {
        label: "Rack Power Pressure",
        value: rackPowerPressure,
        displayValue: `${Math.round(rackPowerPressure)}%`
      },
      {
        label: "Cooling Pressure",
        value: coolingPressure,
        displayValue: `${Math.round(coolingPressure)}%`
      },
      {
        label: "Circuit Pressure",
        value: circuitPressure,
        displayValue: `${Math.round(circuitPressure)}%`
      }
    ];

    const compositeScore = Math.round(
      (rackPowerPressure * 0.4) +
      (coolingPressure * 0.35) +
      (circuitPressure * 0.25)
    );

    const analyzer = ScopedLabsAnalyzer.resolveStatus({
      compositeScore,
      metrics,
      healthyMax: 65,
      watchMax: 85
    });

    let pressure = "Normal";
    if (totalW > 5000) pressure = "High Rack Load";
    if (totalW > 10000) pressure = "Extreme Rack Load";

    let insight = "Cooling requirements are manageable.";
    if (tons > 3) insight = "Dedicated cooling likely required.";
    if (tons > 6) insight = "Data center-grade cooling required.";

    let dominantConstraint = "Balanced power profile";
    if (analyzer.dominant.label === "Rack Power Pressure") {
      dominantConstraint = "Rack power envelope";
    } else if (analyzer.dominant.label === "Cooling Pressure") {
      dominantConstraint = "Cooling capacity envelope";
    } else if (analyzer.dominant.label === "Circuit Pressure") {
      dominantConstraint = "Electrical circuit loading";
    }

    let crossCheck = "Power and cooling appear reasonably aligned with the modeled compute profile";
    if (upstream && upstream.gpu === "none") {
      crossCheck = "This path is CPU-only, so thermal load is being driven by host power rather than accelerator hardware";
    } else if (upstream && typeof upstream.vram === "number") {
      crossCheck = "GPU hardware is in the design path, so node wattage should include real accelerator board draw";
    }

    let interpretation = "";
    if (analyzer.status === "RISK") {
      interpretation =
        "The deployment is crowding its usable rack power or cooling envelope too tightly. Electrical loading, thermal rejection, or peak draw behavior will begin collapsing deployment margin before the platform has room to scale cleanly.";
    } else if (analyzer.status === "WATCH") {
      interpretation =
        "The thermal profile is workable, but infrastructure reserve is tightening. The design should run, although higher peak draw, warmer intake conditions, or denser expansion will consume headroom faster than the average watt figure suggests.";
    } else {
      interpretation =
        "The current power and cooling profile remains inside a manageable operating envelope. Rack load, thermal rejection, and circuit draw still leave usable deployment margin before infrastructure becomes the first likely scaling wall.";
    }

    let guidance = "";
    if (analyzer.status === "HEALTHY") {
      guidance =
        "Maintain the current rack plan, but keep real measured peak draw in view as the system grows. The next pressure increase will usually appear in cooling reserve or branch circuit loading before it appears in raw node count.";
    } else if (analyzer.status === "WATCH") {
      guidance =
        "Validate branch circuits, breaker loading policy, and room cooling reserve before locking deployment. Watch what fails first: circuit draw, hot-aisle temperature, or peak-load excursions during full-system activity.";
    } else {
      guidance =
        `Rework the deployment power plan. The primary limiter is ${dominantConstraint.toLowerCase()}, not raw compute count. Reduce per-node draw, split the rack load, or increase electrical and cooling capacity before scaling further.`;
    }

    const summaryRows = [
      { label: "Total Power", value: `${totalW.toFixed(0)} W` },
      { label: "Heat Load", value: `${btu.toFixed(0)} BTU/hr` },
      { label: "Cooling", value: `${tons.toFixed(2)} tons` },
      { label: "Rack Limit", value: `${rackKw.toFixed(1)} kW` },
      { label: "Circuit Load", value: `${circuitAmpsUsed.toFixed(1)} A @ ${circuitVoltage.toFixed(0)} V` },
      { label: "Cooling Capacity", value: `${coolingTonsAvailable.toFixed(1)} tons` },
      { label: "208V Current", value: `${amps208.toFixed(1)} A` },
      { label: "120V Current", value: `${amps120.toFixed(1)} A` },
      { label: "Thermal Pressure", value: pressure }
    ];

    const derivedRows = [
      { label: "Insight", value: insight },
      { label: "GPU Context", value: gpuNote },
      { label: "Cross-Check", value: crossCheck }
    ];

    const powerThermalResult = {
      status: analyzer.status,
      summary: totalW.toFixed(0) + " W / " + tons.toFixed(2) + " cooling tons; " + pressure,
      inputs: { nodes, watts, peak, overhead, rackKw, circuitVoltage, circuitAmps, coolingTonsAvailable },
      outputs: { totalW, btu, tons, amps120, amps208, circuitAmpsUsed, rackPowerLimitW, rackPowerPressure, coolingPressure, circuitPressure, dominantConstraint, pressure },
      plannerRouting: resolvePowerThermalNextRoute(analyzer.status)
    };
    currentPowerThermalExportResult = powerThermalResult;
    renderPowerThermalSharedOutput(powerThermalResult);

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
        axisTitle: "Power & Thermal Stress Magnitude",
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
      step: "power-thermal",
      data: {
        totalW,
        btu,
        tons,
        pressure,
        insight,
        gpuNote,
        status: analyzer.status
      }
    });

    saveComputeLedgerResult({
      label: "Power & Thermal",
      summary: totalW.toFixed(0) + " W / " + tons.toFixed(2) + " cooling tons; " + pressure,
      status: analyzer.status,
      summaryStatus: analyzer.status,
      keySavedResult: totalW.toFixed(0) + " W / " + analyzer.status,
      outputs: {
        totalW,
        btu,
        tons,
        pressure,
        insight,
        gpuNote,
        dominantConstraint
      }
    });

    showContinue();
  }

  els.calc.addEventListener("click", calculate);

  if (els.continue) {
    els.continue.addEventListener("click", function () {
      const routing = currentPowerThermalExportResult && currentPowerThermalExportResult.plannerRouting || {};
      window.location.href = routing.nextHref || els.continue.getAttribute("data-compute-continue-href") || "/tools/compute/summary/";
    });
  }

  els.reset.addEventListener("click", () => {
    els.nodes.value = 10;
    els.watts.value = 450;
    els.peak.value = "1.15";
    els.overhead.value = 8;
    if (els.rackKw) els.rackKw.value = 5;
    if (els.circuitVoltage) els.circuitVoltage.value = "208";
    if (els.circuitAmps) els.circuitAmps.value = 24;
    if (els.coolingTons) els.coolingTons.value = 3;
    if (els.rackKw) els.rackKw.value = 5;
    if (els.circuitVoltage) els.circuitVoltage.value = "208";
    if (els.circuitAmps) els.circuitAmps.value = 24;
    if (els.coolingTons) els.coolingTons.value = 3;
    invalidate();
  });

  ["nodes", "watts", "peak", "overhead", "rackKw", "circuitVoltage", "circuitAmps", "coolingTons"].forEach((id) => {
    const el = $(id);
    if (!el) return;
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