const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const STEP = "retention";
const CATEGORY = "video-storage";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

﻿// Retention Planner
(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";

  const $ = (id) => document.getElementById(id);

  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const els = {
    cams: $("cams"),
    bitrate: $("bitrate"),
    hours: $("hours"),
    days: $("days"),
    overhead: $("overhead"),
    results: $("results"),
    analysisCopy: $("analysis-copy"),
    nextStepRow: $("next-step-row"),
    toRaid: $("to-raid"),
    flowNote: $("flow-note"),
    calc: $("calc"),
    reset: $("reset")
  };

  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  function n(el) {
    const v = parseFloat(String(el?.value ?? "").trim());
    return Number.isFinite(v) ? v : 0;
  }

  function safeNumber(value, fallback = 0) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.safeNumber === "function"
    ) {
      return window.ScopedLabsAnalyzer.safeNumber(value, fallback);
    }
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  }

  function clamp(value, min, max) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clamp === "function"
    ) {
      return window.ScopedLabsAnalyzer.clamp(value, min, max);
    }
    return Math.min(Math.max(value, min), max);
  }

  function gbFromMbps(mbps, hours) {
    const bits = mbps * 1_000_000 * (hours * 3600);
    const bytes = bits / 8;
    return bytes / 1_000_000_000;
  }

  function hideNext() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.hideContinue === "function"
    ) {
      window.ScopedLabsAnalyzer.hideContinue(els.nextStepRow, els.toRaid);
      return;
    }
    if (els.nextStepRow) els.nextStepRow.style.display = "none";
    if (els.toRaid) els.toRaid.disabled = true;
  }

  function showNext() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.showContinue === "function"
    ) {
      window.ScopedLabsAnalyzer.showContinue(els.nextStepRow, els.toRaid);
      return;
    }
    if (els.nextStepRow) els.nextStepRow.style.display = "flex";
    if (els.toRaid) els.toRaid.disabled = false;
  }

  function clearStored() {
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function clearAnalysisBlock() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function"
    ) {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
      return;
    }
    if (els.analysisCopy) {
      els.analysisCopy.style.display = "none";
      els.analysisCopy.innerHTML = "";
    }
  }

  function clearChart() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clearChart === "function"
    ) {
      window.ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
      return;
    }

    if (chartRef.current) {
      try {
        chartRef.current.destroy();
      } catch {}
      chartRef.current = null;
    }

    if (chartWrapRef.current && chartWrapRef.current.parentNode) {
      chartWrapRef.current.parentNode.removeChild(chartWrapRef.current);
      chartWrapRef.current = null;
    }
  }

  function renderEmpty() {
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    clearAnalysisBlock();
    clearChart();
  }

  function invalidate() {
    clearStored();
    hideNext();

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.invalidate === "function"
    ) {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        continueWrapEl: els.nextStepRow,
        continueBtnEl: els.toRaid,
        category: "video-storage",
        step: "retention",
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      renderEmpty();
    }

    clearChart();
  }

  function importParams() {
    const q = new URLSearchParams(window.location.search);
    if (q.get("source") !== "storage") return;

    if (q.get("cams")) els.cams.value = q.get("cams");
    if (q.get("bitrate")) els.bitrate.value = q.get("bitrate");
    if (q.get("days")) els.days.value = q.get("days");

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderFlowNote === "function"
    ) {
      window.ScopedLabsAnalyzer.renderFlowNote({
        flowEl: els.flowNote,
        category: "video-storage",
        step: "retention",
        title: "System Context",
        intro:
          "Imported from Storage Calculator. Review the carried values, then confirm how much storage is required to hold the desired retention window.",
        customRows: [
          {
            label: "Imported cameras",
            value: q.get("cams") || "—"
          },
          {
            label: "Imported bitrate",
            value: q.get("bitrate") ? `${q.get("bitrate")} Mbps` : "—"
          },
          {
            label: "Imported retention target",
            value: q.get("days") ? `${q.get("days")} days` : "—"
          }
        ]
      });
    } else if (els.flowNote) {
      els.flowNote.hidden = false;
    }
  }

  function buildInterpretation(status, dominantConstraint, totalTb, days, cams) {
    if (status === "HEALTHY") {
      return `Required storage remains in a manageable range for the selected camera count, bitrate, and retention target. The design is not yet leaning too hard on overhead or retention burden, so the next RAID step can focus on protection tradeoffs rather than fighting an oversized storage target.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Retention burden") {
        return `The desired retention window is starting to become the main storage driver. The plan can still work, but longer archive time is now contributing enough to demand more deliberate capacity planning.`;
      }

      if (dominantConstraint === "Fleet scale burden") {
        return `Camera count is now amplifying storage demand meaningfully. Per-stream assumptions may look reasonable, but the aggregate fleet size is large enough that small bitrate changes can materially shift total required storage.`;
      }

      return `Overhead is starting to matter. The base storage math may close, but platform reserve and planning cushion are now large enough to influence the final capacity target in a non-trivial way.`;
    }

    if (dominantConstraint === "Retention burden") {
      return `The retention target is driving storage demand into a high-pressure range. At this point, archive duration is no longer a background preference — it is a primary capacity driver that must be justified against the rest of the design.`;
    }

    if (dominantConstraint === "Fleet scale burden") {
      return `The camera fleet itself is now the main reason storage demand is high. Even moderate per-camera rates are being multiplied into a large total requirement across the deployment.`;
    }

    return `The planning overhead is consuming enough additional capacity that the final storage requirement becomes materially heavier than the base ingest math alone would suggest.`;
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `Carry this storage requirement forward into RAID planning. The next step is deciding how much of the raw array must be reserved for protection while still preserving the required retention target.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Retention burden") {
        return `Review whether the full retention target is operationally necessary, or whether the design should add capacity before locking it in. The archive window is now one of the main reasons the storage plan is getting heavier.`;
      }

      if (dominantConstraint === "Fleet scale burden") {
        return `Validate the estimate at full deployment scale. Camera count is high enough that any future bitrate drift or camera additions could change the storage plan noticeably.`;
      }

      return `Keep using a conservative overhead model in the next step. The current requirement is still workable, but the margin contribution is now large enough that sloppy assumptions would understate true capacity needs.`;
    }

    if (dominantConstraint === "Retention burden") {
      return `Reduce retention demand or increase planned capacity before moving forward if the design is already tight. The required archive window is currently the main reason storage demand is becoming difficult to manage.`;
    }

    if (dominantConstraint === "Fleet scale burden") {
      return `Treat the deployment as a large aggregate storage problem, not a per-camera estimate repeated many times. Fleet size is now a first-order design factor.`;
    }

    return `Use the higher storage requirement deliberately in RAID sizing. The overhead component is no longer minor enough to ignore in protection planning.`;
  }

  function renderFallback(summaryRows, derivedRows, status, dominantConstraint, interpretation, guidance) {
    els.results.innerHTML = summaryRows.concat(derivedRows).map((row) => `
      <div class="result-row">
        <span class="result-label">${row.label}</span>
        <span class="result-value">${row.value}</span>
      </div>
    `).join("");

    if (els.analysisCopy) {
      els.analysisCopy.style.display = "";
      els.analysisCopy.innerHTML = `
        <div class="results">
          <div class="result-row">
            <span class="result-label">Status</span>
            <span class="result-value">${status}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Dominant Constraint</span>
            <span class="result-value">${dominantConstraint}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Engineering Interpretation</span>
            <span class="result-value">${interpretation}</span>
          </div>
          <div class="result-row">
            <span class="result-label">Actionable Guidance</span>
            <span class="result-value">${guidance}</span>
          </div>
        </div>
      `;
    }
  }

  function calc() {
    const cams = Math.max(1, n(els.cams));
    const bitrate = Math.max(0, n(els.bitrate));
    const hours = Math.max(0, n(els.hours));
    const days = Math.max(1, n(els.days));
    const overheadPct = Math.max(0, n(els.overhead));

    if (bitrate <= 0) {
      els.results.innerHTML = `<div class="result-row"><span class="result-label">Error</span><span class="result-value">Enter bitrate &gt; 0 Mbps</span></div>`;
      clearAnalysisBlock();
      hideNext();
      clearStored();
      clearChart();
      return;
    }

    const perCamGB = gbFromMbps(bitrate, hours * days);
    const baseTotal = perCamGB * cams;
    const overhead = baseTotal * (overheadPct / 100);
    const finalTotal = baseTotal + overhead;
    const finalTB = finalTotal / 1000;
    const perDayGB = gbFromMbps(bitrate, hours) * cams;

    const retentionBurden = days / 30;
    const fleetScaleBurden = cams / 16;
    const overheadPressure = 1 + (overheadPct / 25);

    const metrics = [
      {
        label: "Retention burden",
        value: retentionBurden,
        displayValue: `${days} days`
      },
      {
        label: "Fleet scale burden",
        value: fleetScaleBurden,
        displayValue: `${cams} cams`
      },
      {
        label: "Overhead pressure",
        value: overheadPressure,
        displayValue: `${overheadPct.toFixed(0)}%`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Retention burden";

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.5
      });
      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Retention burden";
    }

    const dominantConstraintMap = {
      "Retention burden": "Retention burden",
      "Fleet scale burden": "Fleet scale burden",
      "Overhead pressure": "Overhead pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Retention burden";

    const interpretation = buildInterpretation(status, dominantConstraint, finalTB, days, cams);
    const guidance = buildGuidance(status, dominantConstraint);

    const summaryRows = [
      { label: "Cameras", value: String(cams) },
      { label: "Bitrate per Camera", value: `${bitrate.toFixed(2)} Mbps` },
      { label: "Retention", value: `${days} days` },
      { label: "Daily Storage Requirement", value: `${perDayGB.toFixed(1)} GB/day` }
    ];

    const derivedRows = [
      { label: "Storage (Base)", value: `${baseTotal.toFixed(1)} GB` },
      { label: "Overhead Added", value: `${overhead.toFixed(1)} GB` },
      { label: "Total Storage Required", value: `${finalTotal.toFixed(1)} GB` },
      { label: "Equivalent", value: `${finalTB.toFixed(2)} TB` }
    ];

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderOutput === "function"
    ) {
      window.ScopedLabsAnalyzer.renderOutput({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        summaryRows,
        derivedRows,
        status,
        interpretation,
        dominantConstraint,
        guidance
      });
    } else {
      renderFallback(summaryRows, derivedRows, status, dominantConstraint, interpretation, guidance);
    }

    clearChart();

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderAnalyzerChart === "function"
    ) {
      window.ScopedLabsAnalyzer.renderAnalyzerChart({
        mountEl: els.results,
        existingChartRef: chartRef,
        existingWrapRef: chartWrapRef,
        labels: ["Retention Burden", "Fleet Scale", "Overhead Pressure"],
        values: [retentionBurden, fleetScaleBurden, overheadPressure],
        displayValues: [`${days} days`, `${cams} cams`, `${overheadPct.toFixed(0)}%`],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.5,
        axisTitle: "Storage Pressure",
        referenceLabel: "Healthy Threshold",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          3,
          Math.ceil(Math.max(retentionBurden, fleetScaleBurden, overheadPressure, 1.5) * 1.15 * 10) / 10
        )
      });
    }

    const params = new URLSearchParams({
      source: "retention",
      cams: String(cams),
      bitrate: String(bitrate),
      hours: String(hours),
      days: String(days),
      overhead: String(overheadPct),
      storage_total_gb: finalTotal.toFixed(1)
    });

    if (els.toRaid) {
      els.toRaid.href = "/tools/video-storage/raid-impact/?" + params.toString();
    }

    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        category: "video-storage",
        step: "retention",
        data: {
          cams,
          bitrateMbps: Number(bitrate.toFixed(2)),
          hoursPerDay: Number(hours.toFixed(1)),
          retentionDays: Number(days.toFixed(0)),
          overheadPct: Number(overheadPct.toFixed(0)),
          storageTotalGb: Number(finalTotal.toFixed(1)),
          storageTotalTb: Number(finalTB.toFixed(2)),
          status,
          dominantConstraint
        }
      })
    );

    showNext();
  }

  function reset() {
    els.cams.value = 16;
    els.bitrate.value = 4;
    els.hours.value = 24;
    els.days.value = 30;
    els.overhead.value = 10;
    renderEmpty();
    hideNext();
    importParams();
  }

  els.calc.addEventListener("click", calc);
  els.reset.addEventListener("click", reset);

  ["cams", "bitrate", "hours", "days", "overhead"].forEach((id) => {
    const el = $(id);
    if (el) {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
        e.preventDefault();
        calc();
      }
    }
  });

  renderEmpty();
  hideNext();
  importParams();
})();


function renderFlowNote() {
  // TODO: implement upstream flow-note carry-over
}


function writeFlow(data) {
  ScopedLabsAnalyzer.writeFlow(FLOW_KEYS[STEP] || STEP, {
    category: CATEGORY,
    step: STEP,
    data
  });
}


window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
});
