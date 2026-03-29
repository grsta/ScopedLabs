const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const STEP = "rack-ru-planner";
const CATEGORY = "infrastructure";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿(() => {
  const $ = (id) => document.getElementById(id);
  const FLOW_KEY = "scopedlabs:pipeline:last-result";
  const CURRENT_CATEGORY = "infrastructure";
  const CURRENT_STEP = "rack-ru-planner";

  let cachedFlow = null;
  let hasResult = false;

  const els = {
    total: $("total"),
    used: $("used"),
    reserve: $("reserve"),
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
      title: "Room Context",
      intro:
        "This step checks whether the rack plan only fits on paper or still leaves usable reserve for growth, service access, and future hardware additions.",
      customRows: (() => {
        const source = ScopedLabsAnalyzer.getUpstreamFlow({
          flowKey: FLOW_KEY,
          category: CURRENT_CATEGORY,
          step: CURRENT_STEP,
          cachedFlow
        });

        if (!source || !source.data) return null;

        const d = source.data;
        const rows = [];

        if (typeof d.total === "number") {
          rows.push({ label: "Room Size", value: `${d.total.toFixed(0)} sq ft` });
        }

        if (typeof d.density === "string") {
          rows.push({ label: "Planning Density", value: d.density });
        }

        if (typeof d.status === "string") {
          rows.push({ label: "Previous Status", value: d.status });
        }

        return rows.length ? rows : null;
      })()
    });
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      continueWrapEl: els.continueWrap,
      continueBtnEl: els.continue,
      flowKey: FLOW_KEY,
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      emptyMessage: "Run calculation."
    });

    hasResult = false;
    refreshFlowNote();
  }

  function calc() {
    const total = Math.max(1, ScopedLabsAnalyzer.safeNumber(els.total.value, 1));
    const used = Math.max(0, ScopedLabsAnalyzer.safeNumber(els.used.value, 0));
    const reservePct = ScopedLabsAnalyzer.clamp(
      ScopedLabsAnalyzer.safeNumber(els.reserve.value, 20),
      0,
      80
    );

    const free = total - used;
    const reserved = total * (reservePct / 100);
    const available = free - reserved;
    const usedPct = (used / total) * 100;
    const postReserveUtil = ((used + reserved) / total) * 100;
    const growthHeadroom = Math.max(0, (available / total) * 100);

    let status = "HEALTHY";
    if (available < 2 || postReserveUtil > 95) {
      status = "RISK";
    } else if (available < 6 || postReserveUtil > 80) {
      status = "WATCH";
    }

    let capacityClass = "Comfortable rack reserve";
    if (available < 2 || postReserveUtil > 95) {
      capacityClass = "Effectively full rack";
    } else if (available < 6 || postReserveUtil > 80) {
      capacityClass = "Tight rack reserve";
    } else if (growthHeadroom > 35) {
      capacityClass = "Expansion-friendly rack";
    }

    let dominantConstraint = "Balanced rack utilization";
    if (available < 2) {
      dominantConstraint = "Immediate expansion capacity";
    } else if (postReserveUtil > 90) {
      dominantConstraint = "Reserve consumption";
    } else if (usedPct > 75) {
      dominantConstraint = "Installed equipment density";
    }

    let interpretation = "";
    if (status === "RISK") {
      interpretation =
        "The rack is effectively full once real growth reserve is respected. Expansion will become difficult before the raw free RU figure suggests, because reserve and service margin have already been consumed.";
    } else if (status === "WATCH") {
      interpretation =
        "The rack is workable, but reserve is tightening. The current deployment may fit, although modest adds or late-stage hardware changes will consume usable headroom faster than the visible free RU count suggests.";
    } else {
      interpretation =
        "The rack remains inside a manageable capacity envelope. Current utilization and growth reserve still leave usable room before rack space becomes the first deployment limiter.";
    }

    let guidance = "";
    if (status === "HEALTHY") {
      guidance =
        "Maintain the current rack plan, but keep realistic reserve policy in place. The next pressure increase will usually appear in growth reserve before it appears in absolute rack fullness.";
    } else if (status === "WATCH") {
      guidance =
        "Validate near-term equipment additions and cable/service access before locking this rack as complete. Watch what tightens first: usable reserve, service margin, or late-stage device additions.";
    } else {
      guidance =
        `Rework the rack plan. The primary limiter is ${dominantConstraint.toLowerCase()}, not just nominal free RU. Reduce density, add another rack, or lower the fill target before hardening the deployment layout.`;
    }

    const summaryRows = [
      { label: "Total Rack RU", value: `${total}` },
      { label: "Used RU", value: `${used}` },
      { label: "Free RU", value: `${free.toFixed(1)}` },
      { label: "Reserved for Growth", value: `${reserved.toFixed(1)} RU` },
      { label: "Available RU After Reserve", value: `${available.toFixed(1)} RU` },
      { label: "Capacity Status", value: status }
    ];

    const derivedRows = [
      { label: "Raw Utilization", value: `${usedPct.toFixed(1)} %` },
      { label: "Post-Reserve Utilization", value: `${postReserveUtil.toFixed(1)} %` },
      { label: "Growth Headroom", value: `${growthHeadroom.toFixed(1)} %` },
      { label: "Capacity Class", value: capacityClass }
    ];

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysisCopy,
      summaryRows,
      derivedRows,
      status,
      interpretation,
      dominantConstraint,
      guidance,
      chart: null
    });

    ScopedLabsAnalyzer.writeFlow(FLOW_KEY, {
      category: CURRENT_CATEGORY,
      step: CURRENT_STEP,
      data: {
        total,
        used,
        free,
        available,
        status
      }
    });

    ScopedLabsAnalyzer.showContinue(els.continueWrap, els.continue);
    hasResult = true;
  }

  function reset() {
    els.total.value = 42;
    els.used.value = 18;
    els.reserve.value = 20;
    invalidate();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["total", "used", "reserve"].forEach((id) => {
    $(id).addEventListener("input", invalidate);
    $(id).addEventListener("change", invalidate);
  });

  els.continue.addEventListener("click", () => {
    if (!hasResult) return;
    window.location.href = "/tools/infrastructure/equipment-spacing/";
  });

  refreshFlowNote();
  invalidate();
})();


function renderFlowNote() {
  // TODO: implement upstream flow-note carry-over
}


window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});
