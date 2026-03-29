const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const STEP = "power-thermal";
const CATEGORY = "compute";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿(() => {
  const $ = (id) => document.getElementById(id);

  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "compute";
  const CURRENT_STEP = "power-thermal";

  let hasResult = false;
  let cachedFlow = null;
  let upstream = null;
  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  const els = {
    nodes: $("nodes"),
    watts: $("watts"),
    peak: $("peak"),
    overhead: $("overhead"),
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
        "This step validates whether compute density and optional GPU inclusion create a rack power or cooling profile that becomes the next deployment limiter.",
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

        if (source.step === "gpu-vram") {
          if (d.gpu === "none") {
            rows.push({ label: "GPU Requirement", value: "Not Required" });
            rows.push({ label: "Pipeline Path", value: "CPU-only system" });
          } else {
            rows.push({ label: "GPU Step", value: "Included" });
            if (typeof d.vram === "number") {
              rows.push({ label: "Estimated VRAM", value: `${Number(d.vram).toFixed(2)} GB` });
            }
            if (typeof d.gpuClass === "string") {
              rows.push({ label: "GPU Class", value: d.gpuClass });
            }
          }
          return rows.length ? rows : null;
        }

        if (source.step === "vm-density") {
          if (d.vms != null) rows.push({ label: "VM Capacity", value: `${d.vms}` });
          if (d.limiting) rows.push({ label: "Primary Constraint", value: d.limiting });
          if (d.densityClass) rows.push({ label: "Density Class", value: d.densityClass });
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
      step: CURRENT_STEP,
      emptyMessage: "Run calculation."
    });

    hasResult = false;
    refreshFlowNote();
  }

  function calc() {
    const nodes = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.nodes.value, 1));
    const watts = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.watts.value, 0));
    const peak = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.peak.value, 1));
    const overhead = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.overhead.value, 0));

    const baseWatts = nodes * watts;
    const peakWatts = baseWatts * peak;
    const totalW = peakWatts * (1 + overhead / 100);
    const btu = totalW * 3.412141633;
    const tons = btu / 12000;
    const amps120 = totalW / 120;
    const amps208 = totalW / 208;

    let gpuNote = "GPU not included in this step.";
    if (upstream) {
      if (upstream.gpu === "none") {
        gpuNote = "GPU was intentionally skipped for this design.";
      } else if (typeof upstream.vram === "number") {
        gpuNote = `GPU is part of this design path (estimated VRAM ${Number(upstream.vram).toFixed(2)} GB). Add actual GPU board wattage into node power if not already included.`;
      } else if (typeof upstream.vms === "number") {
        gpuNote = "No GPU step payload was present; using VM density context only.";
      }
    }

    const rackPowerPressure = ScopedLabsAnalyzer.clamp((totalW / 5000) * 100, 0, 180);
    const coolingPressure = ScopedLabsAnalyzer.clamp((tons / 3) * 100, 0, 180);
    const circuitPressure = ScopedLabsAnalyzer.clamp((amps208 / 24) * 100, 0, 180);

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
    } else if (upstream && typeof upstream.vms === "number" && upstream.vms > 50) {
      crossCheck = "High virtualization density can hide aggregate rack power until multiple hosts reach load together";
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
      { label: "208V Current", value: `${amps208.toFixed(1)} A` },
      { label: "120V Current", value: `${amps120.toFixed(1)} A` },
      { label: "Thermal Pressure", value: pressure }
    ];

    const derivedRows = [
      { label: "Insight", value: insight },
      { label: "GPU Context", value: gpuNote },
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

    ScopedLabsAnalyzer.writeFlow(FLOW_KEY, {
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

    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continue);
    hasResult = true;
  }

  els.calc.addEventListener("click", calc);

  els.reset.addEventListener("click", () => {
    els.nodes.value = 10;
    els.watts.value = 450;
    els.peak.value = "1.15";
    els.overhead.value = 8;
    invalidate();
  });

  ["nodes", "watts", "peak", "overhead"].forEach((id) => {
    const el = $(id);
    if (!el) return;
    el.addEventListener("input", invalidate);
    el.addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/compute/raid-rebuild-time/";
  });

  refreshFlowNote();
  ScopedLabsAnalyzer.hideContinue(els.continueWrap, els.continue);
})();

function renderFlowNote() {
  // TODO: implement upstream flow-note carry-over
}


window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});


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
  const body = document.body;
  const category = String(body?.dataset?.category || "").trim().toLowerCase();
  const signedIn = hasStoredAuth();
  const unlocked = getUnlockedCategories().includes(category);

  const lockedCard = document.getElementById("lockedCard");
  const toolCard = document.getElementById("toolCard");

  if (signedIn && unlocked) {
    if (lockedCard) lockedCard.style.display = "none";
    if (toolCard) toolCard.style.display = "";
    return true;
  }

  if (lockedCard) lockedCard.style.display = "";
  if (toolCard) toolCard.style.display = "none";
  return false;
}
