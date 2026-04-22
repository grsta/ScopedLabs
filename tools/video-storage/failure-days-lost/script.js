(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const els = {
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard"),
    retentionDays: $("retentionDays"),
    gapHours: $("gapHours"),
    restoreHours: $("restoreHours"),
    overwrite: $("overwrite"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy")
  };

  let chartRef = { current: null };
  let chartWrapRef = { current: null };

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

  function clamp(x, lo, hi) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clamp === "function"
    ) {
      return window.ScopedLabsAnalyzer.clamp(x, lo, hi);
    }
    return Math.min(hi, Math.max(lo, x));
  }

  function clearAnalysisBlock() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clearAnalysisBlock === "function"
    ) {
      window.ScopedLabsAnalyzer.clearAnalysisBlock(els.analysisCopy);
    } else if (els.analysisCopy) {
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
    if (els.results) {
      els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    }
    clearAnalysisBlock();
    clearChart();
  }

  function invalidate() {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.invalidate === "function"
    ) {
      window.ScopedLabsAnalyzer.invalidate({
        resultsEl: els.results,
        analysisEl: els.analysisCopy,
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      renderEmpty();
    }
    clearChart();
  }

  function overwriteFactor(mode) {
    if (mode === "fast") return 1.25;
    if (mode === "slow") return 0.85;
    return 1.0;
  }

  function resolveStatus(metrics) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.5
      });

      return {
        status: resolved?.status || "HEALTHY",
        dominantLabel: resolved?.dominant?.label || metrics[0].label
      };
    }

    const dominant = metrics.reduce((best, current) =>
      Number(current.value) > Number(best.value) ? current : best
    );

    let status = "HEALTHY";
    if (Number(dominant.value) > 1.5) status = "RISK";
    else if (Number(dominant.value) > 1.0) status = "WATCH";

    return {
      status,
      dominantLabel: dominant.label
    };
  }

  function buildInterpretation(status, dominantConstraint, totalLostDays, gapDays, remaining) {
    if (status === "HEALTHY") {
      return `The outage window reduces usable retention, but the loss remains in a manageable range. Recovery time and overwrite pressure are not yet compressing the archive window hard enough to create a major planning problem.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Downtime burden") {
        return `The main issue is the total amount of time the system is unavailable. Even with normal overwrite behavior, enough retention time is being consumed that the event becomes operationally noticeable.`;
      }

      if (dominantConstraint === "Overwrite pressure") {
        return `Overwrite behavior is starting to amplify the outage. Once recording resumes, the system is effectively burning through retention fast enough that recovery impact matters more than the gap alone.`;
      }

      return `The raw recording gap is large enough to matter. Missing footage is no longer just a small blind spot — it is becoming a material loss event when viewed across the retention window.`;
    }

    if (dominantConstraint === "Downtime burden") {
      return `The recovery window is long enough that retention loss becomes a real operational risk. Even if recording eventually resumes, the system has already consumed too much archive time to treat this as a minor incident.`;
    }

    if (dominantConstraint === "Overwrite pressure") {
      return `Fast overwrite behavior is turning the outage into a much larger retention problem. The system is effectively eating through recoverable history quickly enough that the incident can erase more archive value than the gap alone suggests.`;
    }

    return `The direct recording gap itself is severe enough to create a meaningful loss event. At this point, the missing coverage window and the compressed retention horizon together make the failure hard to dismiss as routine.`;
  }

  function buildGuidance(status, dominantConstraint, totalLostDays) {
    if (status === "HEALTHY") {
      return `Use this as a planning estimate and keep recovery workflow disciplined. Even when loss is manageable, faster failover and faster restore still improve real-world archive resilience.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Downtime burden") {
        return `Reduce total downtime through faster failover, spare hardware, or quicker rebuild processes. The outage length is now the main reason retention value is being lost.`;
      }

      if (dominantConstraint === "Overwrite pressure") {
        return `Treat overwrite speed as part of the recovery plan. High-motion or high-bitrate systems may need more protective margin because resumed recording can consume archive history faster than expected.`;
      }

      return `Tighten incident response and restoration workflow before the system scales further. The current failure profile is already large enough to affect retained evidence value.`;
    }

    if (dominantConstraint === "Downtime burden") {
      return `Shorten recovery time before trusting the current design. The system needs better resilience or faster service restoration to avoid losing too much usable retention during failures.`;
    }

    if (dominantConstraint === "Overwrite pressure") {
      return `Plan for higher recovery protection under fast-overwrite conditions. The current environment is too vulnerable to losing archive value once recording resumes after an outage.`;
    }

    return `Treat this as a serious resilience issue. Reduce recording gaps, accelerate recovery, or increase effective retention margin so outage events do not erase so much usable history.`;
  }

  function renderFallback(summaryRows, derivedRows, status, dominantConstraint, interpretation, guidance) {
    if (els.results) {
      els.results.innerHTML = `
        ${summaryRows.map((row) => `
          <div class="result-row">
            <span class="result-label">${row.label}</span>
            <span class="result-value">${row.value}</span>
          </div>
        `).join("")}
        ${derivedRows.map((row) => `
          <div class="result-row">
            <span class="result-label">${row.label}</span>
            <span class="result-value">${row.value}</span>
          </div>
        `).join("")}
      `;
    }

    if (els.analysisCopy) {
      els.analysisCopy.style.display = "";
      els.analysisCopy.innerHTML = `
        <div class="results-grid">
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

  function calculate() {
    const retentionDaysRaw = safeNumber(els.retentionDays.value, NaN);
    const gapHoursRaw = safeNumber(els.gapHours.value, NaN);
    const restoreHoursRaw = safeNumber(els.restoreHours.value, NaN);
    const overwrite = els.overwrite.value;

    if (
      !Number.isFinite(retentionDaysRaw) || retentionDaysRaw <= 0 ||
      !Number.isFinite(gapHoursRaw) || gapHoursRaw < 0 ||
      !Number.isFinite(restoreHoursRaw) || restoreHoursRaw < 0
    ) {
      if (els.results) {
        els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      }
      clearAnalysisBlock();
      clearChart();
      return;
    }

    const retentionDays = clamp(retentionDaysRaw, 0.1, 36500);
    const gapHours = clamp(gapHoursRaw, 0, 100000);
    const restoreHours = clamp(restoreHoursRaw, 0, 100000);

    const totalDownHours = gapHours + restoreHours;
    const gapDays = gapHours / 24;
    const downDays = totalDownHours / 24;

    const effRetention = retentionDays / overwriteFactor(overwrite);
    const remaining = Math.max(0, effRetention - downDays);
    const lossFromRetention = Math.max(0, retentionDays - remaining);
    const totalLostDays = lossFromRetention;

    const downtimeBurden = totalLostDays / 2.5;
    const overwritePressure = overwrite === "fast" ? 1.65 : overwrite === "slow" ? 0.75 : 1.0;
    const directGapPressure = gapDays / 1.5;

    const metrics = [
      {
        label: "Downtime burden",
        value: downtimeBurden,
        displayValue: `${totalLostDays.toFixed(2)} days`
      },
      {
        label: "Overwrite pressure",
        value: overwritePressure,
        displayValue: overwrite.toUpperCase()
      },
      {
        label: "Direct gap pressure",
        value: directGapPressure,
        displayValue: `${gapDays.toFixed(2)} days`
      }
    ];

    const resolved = resolveStatus(metrics);
    const status = resolved.status;

    const dominantConstraintMap = {
      "Downtime burden": "Downtime burden",
      "Overwrite pressure": "Overwrite pressure",
      "Direct gap pressure": "Direct gap pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[resolved.dominantLabel] || "Downtime burden";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      totalLostDays,
      gapDays,
      remaining
    );

    const guidance = buildGuidance(
      status,
      dominantConstraint,
      totalLostDays
    );

    const summaryRows = [
      { label: "Retention (configured)", value: `${retentionDays.toFixed(1)} days` },
      { label: "Downtime Window", value: `${totalDownHours.toFixed(1)} hours (${downDays.toFixed(2)} days)` },
      { label: "Recording Gap", value: `${gapHours.toFixed(1)} hours (${gapDays.toFixed(2)} days)` },
      { label: "Overwrite Risk", value: overwrite.toUpperCase() }
    ];

    const derivedRows = [
      { label: "Estimated Effective Retention", value: `${effRetention.toFixed(1)} days` },
      { label: "Estimated Retention Remaining", value: `${remaining.toFixed(1)} days` },
      { label: "Estimated Days Lost", value: `${totalLostDays.toFixed(2)} days` },
      { label: "Planning Basis", value: "Outage + restore + overwrite estimate" }
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
        guidance,
        existingChartRef: null,
        existingWrapRef: null
      });
    } else {
      renderFallback(
        summaryRows,
        derivedRows,
        status,
        dominantConstraint,
        interpretation,
        guidance
      );
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
        labels: [
          "Downtime Burden",
          "Overwrite Pressure",
          "Direct Gap"
        ],
        values: [
          downtimeBurden,
          overwritePressure,
          directGapPressure
        ],
        displayValues: [
          `${totalLostDays.toFixed(2)} days`,
          overwrite.toUpperCase(),
          `${gapDays.toFixed(2)} days`
        ],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.5,
        axisTitle: "Loss Pressure",
        referenceLabel: "Healthy Threshold",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          4,
          Math.ceil(Math.max(downtimeBurden, overwritePressure, directGapPressure, 1.5) * 1.15 * 10) / 10
        )
      });
    }
  }

  function reset() {
    els.retentionDays.value = 30;
    els.gapHours.value = 8;
    els.restoreHours.value = 4;
    els.overwrite.value = "normal";
    renderEmpty();
  }

  function bindInvalidation() {
    [els.retentionDays, els.gapHours, els.restoreHours, els.overwrite].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function bind() {
    bindInvalidation();

    if (els.calc) els.calc.addEventListener("click", calculate);
    if (els.reset) els.reset.addEventListener("click", reset);
  }

  function boot() {
    const unlocked = unlockCategoryPage();
    if (!unlocked) return;

    renderEmpty();
    bindInvalidation();

    if (els.calc) els.calc.addEventListener("click", calculate);
    if (els.reset) els.reset.addEventListener("click", reset);

    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
  }

  window.addEventListener("DOMContentLoaded", boot);
})();