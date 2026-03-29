const LANE = "v1";
const PREVIOUS_STEP = "TODO_PREVIOUS_STEP";
const STEP = "survivability";
const CATEGORY = "video-storage";
const FLOW_KEYS = {
  // TODO: replace with real per-step flow keys
};

(() => {
  const $ = (id) => document.getElementById(id);

  const yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const els = {
    baselineRetention: $("baselineRetention"),
    capacityLossPct: $("capacityLossPct"),
    targetRetention: $("targetRetention"),
    stressWritePct: $("stressWritePct"),
    degradedDays: $("degradedDays"),
    reserveHeadroomPct: $("reserveHeadroomPct"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy"),
    flowNote: $("flow-note"),
    completionWrap: $("completion-wrap")
  };

  let chartRef = { current: null };
  let chartWrapRef = { current: null };

  function safeNumber(value, fallback = 0) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.safeNumber === "function"
    ) {
      return window.ScopedLabsAnalyzer.safeNumber(value, fallback);
    }
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function clamp(v, min, max) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clamp === "function"
    ) {
      return window.ScopedLabsAnalyzer.clamp(v, min, max);
    }
    return Math.min(max, Math.max(min, v));
  }

  function round(v, d = 2) {
    const p = Math.pow(10, d);
    return Math.round(v * p) / p;
  }

  function fmtDays(v) {
    return `${round(v, 2)} days`;
  }

  function fmtPct(v) {
    return `${round(v, 1)}%`;
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

  function hideCompletion() {
    if (els.completionWrap) els.completionWrap.style.display = "none";
  }

  function showCompletion() {
    if (els.completionWrap) els.completionWrap.style.display = "";
  }

  function renderEmpty() {
    if (els.results) {
      els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    }
    clearAnalysisBlock();
    clearChart();
    hideCompletion();
  }

  function invalidate() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.invalidate === "function"
    ) {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        category: "video-storage",
        step: "survivability",
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      renderEmpty();
    }
    clearChart();
    hideCompletion();
  }

  function importFromRaid() {
    const q = new URLSearchParams(window.location.search);
    if (q.get("source") !== "raid") return;

    const importedTargetDays = Number(q.get("targetDays"));
    const requiredStorageGb = Number(q.get("requiredStorageGb"));
    const usableTb = Number(q.get("usableTb"));

    if (Number.isFinite(importedTargetDays) && importedTargetDays > 0) {
      els.baselineRetention.value = String(importedTargetDays);
      els.targetRetention.value = String(importedTargetDays);
    }

    if (Number.isFinite(requiredStorageGb) && requiredStorageGb > 0 && Number.isFinite(usableTb) && usableTb > 0) {
      const usableGb = usableTb * 1000;
      const lossPct = Math.max(0, (1 - (usableGb / requiredStorageGb)) * 100);
      els.capacityLossPct.value = round(lossPct, 1);
    }

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.renderFlowNote === "function"
    ) {
      window.ScopedLabsAnalyzer.renderFlowNote({
        flowEl: els.flowNote,
        category: "video-storage",
        step: "survivability",
        title: "System Context",
        intro:
          "Imported from RAID Impact. This final step checks how degraded capacity and rebuild stress compress the promised retention window.",
        customRows: [
          {
            label: "Imported target",
            value: Number.isFinite(importedTargetDays) && importedTargetDays > 0 ? `${importedTargetDays} days` : "—"
          },
          {
            label: "Required storage",
            value: Number.isFinite(requiredStorageGb) && requiredStorageGb > 0 ? `${(requiredStorageGb / 1000).toFixed(2)} TB` : "—"
          },
          {
            label: "Net usable array",
            value: Number.isFinite(usableTb) && usableTb > 0 ? `${usableTb.toFixed(2)} TB` : "—"
          }
        ]
      });
    } else if (els.flowNote) {
      els.flowNote.hidden = false;
      if (Number.isFinite(requiredStorageGb) && requiredStorageGb > 0 && Number.isFinite(usableTb) && usableTb > 0) {
        els.flowNote.textContent =
          `Imported from RAID Impact. Required storage: ${(requiredStorageGb / 1000).toFixed(2)} TB. Net usable array: ${usableTb.toFixed(2)} TB. Review values and click Calculate.`;
      } else {
        els.flowNote.textContent = "Imported from RAID Impact. Review values and click Calculate.";
      }
    }
  }

  function buildInterpretation(status, dominantConstraint, effectiveDays, targetDays, daysLost) {
    if (status === "HEALTHY") {
      return `Degraded capacity reduces effective retention, but the design still remains in a controlled range. The storage plan retains enough margin that temporary degradation does not immediately collapse the retention promise.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Goal fit pressure") {
        return `The main concern is how close degraded retention is to the actual target. The design may still work, but it is operating near a retention cliff where modest additional stress could cause it to miss the promise.`;
      }

      if (dominantConstraint === "Capacity loss pressure") {
        return `Usable capacity loss is now large enough that degradation meaningfully compresses retention. The system can still survive, but reserve margin is being consumed faster than is comfortable.`;
      }

      return `Write-stress during degradation is starting to matter. Rebuild or verification load is now amplifying the retention hit enough that degraded-state performance deserves explicit attention.`;
    }

    if (dominantConstraint === "Goal fit pressure") {
      return `Effective retention falls too close to — or below — the required goal once the degraded condition is applied. The design is now too dependent on ideal recovery timing to be considered comfortable.`;
    }

    if (dominantConstraint === "Capacity loss pressure") {
      return `Capacity loss during degradation is severe enough to become the primary survivability issue. Even if the healthy-state design looks acceptable, the degraded-state retention window is now too compressed to ignore.`;
    }

    return `Degraded write stress is materially shrinking effective retention. The array may recover eventually, but the combination of capacity loss and rebuild penalty is now strong enough to threaten the retention promise during the event itself.`;
  }

  function buildGuidance(status, dominantConstraint) {
    if (status === "HEALTHY") {
      return `The pipeline closes in a workable state. Keep reserve margin disciplined and recovery time short so degraded conditions remain inside the modelled survivability envelope.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Goal fit pressure") {
        return `Increase baseline retention margin or reduce degraded-state exposure before the design grows further. The current retention promise is being carried too close to the edge under failure conditions.`;
      }

      if (dominantConstraint === "Capacity loss pressure") {
        return `Reduce degraded capacity loss or increase healthy-state headroom. The storage plan is still viable, but failure-state shrinkage is now consuming a meaningful amount of retention margin.`;
      }

      return `Account for degraded write penalties more deliberately in planning. Recovery behavior is now important enough that it should not be treated as background noise.`;
    }

    if (dominantConstraint === "Goal fit pressure") {
      return `Do not trust the current retention promise under degraded conditions without more headroom. Increase baseline retention or reduce loss assumptions before deployment.`;
    }

    if (dominantConstraint === "Capacity loss pressure") {
      return `Reduce degradation severity or increase healthy-state capacity before relying on this design. The storage system is losing too much usable retention when it enters a degraded state.`;
    }

    return `Shorten degraded duration, reduce write-stress, or add retention headroom. The current design is too sensitive to failure-state conditions to treat survivability as acceptable.`;
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

  function compute() {
    const baselineDays = Math.max(0.1, safeNumber(els.baselineRetention.value, 30));
    const lossPct = clamp(safeNumber(els.capacityLossPct.value, 0), 0, 95);
    const targetDays = Math.max(0.1, safeNumber(els.targetRetention.value, baselineDays));
    const stressPct = clamp(safeNumber(els.stressWritePct.value, 0), 0, 200);
    const degradedDays = clamp(safeNumber(els.degradedDays.value, 0), 0, 365);
    const headroomPct = clamp(safeNumber(els.reserveHeadroomPct.value, 0), 0, 200);

    const capMult = 1 - (lossPct / 100);
    const writeMult = 1 + (stressPct / 100);

    const effectiveDays = baselineDays * capMult / writeMult;
    const daysLost = Math.max(0, baselineDays - effectiveDays);

    const strictRequiredBaseline = targetDays * writeMult / Math.max(0.001, capMult);
    const headroomBaseline = targetDays * (1 + headroomPct / 100);

    const burnRate = (baselineDays / Math.max(0.001, effectiveDays)) - 1;
    const degradedImpact = Math.max(0, burnRate * degradedDays);

    const meets = effectiveDays >= targetDays;
    const marginRatio = effectiveDays / targetDays;

    const goalFitPressure = targetDays / effectiveDays;
    const capacityLossPressure = lossPct / 12;
    const degradedStressPressure = (stressPct / 10) + (degradedDays / 5);

    const metrics = [
      {
        label: "Goal fit pressure",
        value: goalFitPressure,
        displayValue: `${effectiveDays.toFixed(2)} days`
      },
      {
        label: "Capacity loss pressure",
        value: capacityLossPressure,
        displayValue: `${lossPct.toFixed(1)}%`
      },
      {
        label: "Degraded stress pressure",
        value: degradedStressPressure,
        displayValue: `${stressPct.toFixed(1)}% / ${degradedDays.toFixed(1)}d`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Goal fit pressure";

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
      dominantLabel = resolved?.dominant?.label || "Goal fit pressure";
    }

    const dominantConstraintMap = {
      "Goal fit pressure": "Goal fit pressure",
      "Capacity loss pressure": "Capacity loss pressure",
      "Degraded stress pressure": "Degraded stress pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Goal fit pressure";

    const risk =
      !meets ? "FAIL (below goal)" :
      marginRatio < 1.1 || lossPct >= 20 || stressPct >= 15 ? "WARNING (fragile margin)" :
      "OK";

    const summaryRows = [
      { label: "Baseline retention", value: fmtDays(baselineDays) },
      { label: "Effective retention (degraded)", value: fmtDays(effectiveDays) },
      { label: "Days lost (effective)", value: fmtDays(daysLost) },
      { label: "Meets retention goal?", value: meets ? "YES" : "NO" }
    ];

    const derivedRows = [
      { label: "Recommended baseline (strict)", value: fmtDays(strictRequiredBaseline) },
      { label: "Recommended baseline (headroom target)", value: fmtDays(headroomBaseline) },
      { label: "Headroom margin required", value: fmtDays(Math.max(0, strictRequiredBaseline - baselineDays)) },
      { label: "Degraded period impact", value: degradedDays > 0 ? `${fmtDays(degradedImpact)} equivalent retention burned` : "—" },
      { label: "Risk flag", value: risk }
    ];

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      effectiveDays,
      targetDays,
      daysLost
    );

    const guidance = buildGuidance(
      status,
      dominantConstraint
    );

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
        labels: ["Goal Fit", "Capacity Loss", "Degraded Stress"],
        values: [goalFitPressure, capacityLossPressure, degradedStressPressure],
        displayValues: [
          `${effectiveDays.toFixed(2)} days`,
          `${lossPct.toFixed(1)}%`,
          `${stressPct.toFixed(1)}% / ${degradedDays.toFixed(1)}d`
        ],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.5,
        axisTitle: "Survivability Pressure",
        referenceLabel: "Healthy Threshold",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          3,
          Math.ceil(Math.max(goalFitPressure, capacityLossPressure, degradedStressPressure, 1.5) * 1.15 * 10) / 10
        )
      });
    }

    showCompletion();
  }

  function reset() {
    els.baselineRetention.value = "30";
    els.capacityLossPct.value = "12";
    els.targetRetention.value = "30";
    els.stressWritePct.value = "8";
    els.degradedDays.value = "2";
    els.reserveHeadroomPct.value = "15";
    renderEmpty();
    hideCompletion();
    importFromRaid();
  }

  els.calc.addEventListener("click", compute);
  els.reset.addEventListener("click", reset);

  ["baselineRetention", "capacityLossPct", "targetRetention", "stressWritePct", "degradedDays", "reserveHeadroomPct"].forEach((id) => {
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
        compute();
      }
    }
  });

  renderEmpty();
  hideCompletion();
  importFromRaid();
})();

function renderFlowNote() {
  // TODO: implement upstream flow-note carry-over
}


function calc() {
  // TODO: implement calculate handler
}


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
