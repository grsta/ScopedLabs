(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const els = {
    locked: $("lockedCard"),
    tool: $("toolCard"),
    mtbf: $("mtbf"),
    mttr: $("mttr"),
    maintN: $("maintN"),
    maintH: $("maintH"),
    penalty: $("penalty"),
    arch: $("arch"),
    calc: $("calc"),
    reset: $("reset"),
    out: $("results"),
    analysis: $("analysis-copy")
  };

  const DEFAULTS = {
    mtbf: 200000,
    mttr: 4,
    maintN: 2,
    maintH: 1,
    penalty: 3,
    arch: "single"
  };

  function num(el, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(el?.value, fallback);
  }

  function fmt(value, digits = 2) {
    return Number.isFinite(value) ? value.toFixed(digits) : "—";
  }

  function fmtHours(value, digits = 2) {
    return Number.isFinite(value) ? `${value.toFixed(digits)} hrs` : "—";
  }

  function fmtPct(value, digits = 4) {
    return Number.isFinite(value) ? `${value.toFixed(digits)}%` : "—";
  }

  function architectureLabel(value) {
    if (value === "nplus1") return "N+1";
    if (value === "dual") return "Dual Independent";
    return "Single UPS";
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
    const category = String(document.body?.dataset?.category || "").trim().toLowerCase();
    const signedIn = hasStoredAuth();
    const unlocked = getUnlockedCategories().includes(category);

    if (signedIn && unlocked) {
      if (els.locked) els.locked.style.display = "none";
      if (els.tool) els.tool.style.display = "";
      return true;
    }

    if (els.locked) els.locked.style.display = "";
    if (els.tool) els.tool.style.display = "none";
    return false;
  }

  function invalidate() {
    ScopedLabsAnalyzer.invalidate({
      resultsEl: els.out,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      emptyMessage: "Run the model to see results."
    });
  }

  function applyDefaults() {
    if (els.mtbf) els.mtbf.value = String(DEFAULTS.mtbf);
    if (els.mttr) els.mttr.value = String(DEFAULTS.mttr);
    if (els.maintN) els.maintN.value = String(DEFAULTS.maintN);
    if (els.maintH) els.maintH.value = String(DEFAULTS.maintH);
    if (els.penalty) els.penalty.value = String(DEFAULTS.penalty);
    if (els.arch) els.arch.value = DEFAULTS.arch;
  }

  function getInputs() {
    const mtbf = num(els.mtbf);
    const mttr = num(els.mttr);
    const maintN = num(els.maintN);
    const maintH = num(els.maintH);
    const penaltyPct = num(els.penalty);
    const arch = els.arch?.value || "single";

    if (!Number.isFinite(mtbf) || mtbf <= 0) {
      return { ok: false, message: "Enter a valid UPS MTBF (hours)." };
    }
    if (!Number.isFinite(mttr) || mttr < 0) {
      return { ok: false, message: "Enter a valid repair time per failure." };
    }
    if (!Number.isFinite(maintN) || maintN < 0) {
      return { ok: false, message: "Enter a valid number of maintenance events per year." };
    }
    if (!Number.isFinite(maintH) || maintH < 0) {
      return { ok: false, message: "Enter a valid maintenance duration." };
    }
    if (!Number.isFinite(penaltyPct) || penaltyPct < 0 || penaltyPct > 100) {
      return { ok: false, message: "Enter a valid failover efficiency penalty (%)." };
    }

    return {
      ok: true,
      mtbf,
      mttr,
      maintN,
      maintH,
      penaltyPct,
      penalty: penaltyPct / 100,
      arch
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    let failureDowntime = (8760 / input.mtbf) * input.mttr;
    let maintenanceDowntime = input.maintN * input.maintH;

    if (input.arch === "nplus1") {
      failureDowntime *= 0.3;
      maintenanceDowntime *= 0.5;
    }

    if (input.arch === "dual") {
      failureDowntime *= 0.1;
      maintenanceDowntime *= 0.2;
    }

    const failoverPenaltyHours = input.penalty * 8760;
    const totalDowntime = failureDowntime + maintenanceDowntime + failoverPenaltyHours;
    const availability = ((8760 - totalDowntime) / 8760) * 100;

    const failureMetric = Math.min((failureDowntime / 10) * 100, 100);
    const maintenanceMetric = Math.min((maintenanceDowntime / 10) * 100, 100);
    const penaltyMetric = Math.min(input.penaltyPct * 2, 100);

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(failureMetric, maintenanceMetric, penaltyMetric),
      metrics: [
        {
          label: "Failure Downtime Pressure",
          value: failureMetric,
          displayValue: fmtHours(failureDowntime)
        },
        {
          label: "Maintenance Downtime Pressure",
          value: maintenanceMetric,
          displayValue: fmtHours(maintenanceDowntime)
        },
        {
          label: "Failover Penalty",
          value: penaltyMetric,
          displayValue: `${fmt(input.penaltyPct, 2)}%`
        }
      ],
      healthyMax: 20,
      watchMax: 45
    });

    let resilienceClass = "High Availability Design";
    if (availability < 99) resilienceClass = "Weak Availability Design";
    else if (availability < 99.9) resilienceClass = "Moderate Availability Design";
    else if (availability < 99.99) resilienceClass = "Strong Availability Design";

    let interpretation = `${architectureLabel(input.arch)} architecture produces about ${fmtHours(totalDowntime)} of modeled downtime per year, yielding approximately ${fmtPct(availability)} availability. Failure downtime contributes ${fmtHours(failureDowntime)}, maintenance contributes ${fmtHours(maintenanceDowntime)}, and failover penalty contributes ${fmtHours(failoverPenaltyHours)}.`;

    if (input.arch === "single") {
      interpretation += ` Single-path power keeps the model simple, but it leaves both maintenance and real failure events directly exposed to downtime.`;
    } else if (input.arch === "nplus1") {
      interpretation += ` N+1 redundancy materially reduces both failure and maintenance exposure, but it still leaves some shared-path operational dependence in play.`;
    } else {
      interpretation += ` Dual independent architecture strongly compresses direct downtime exposure, making it the most resilient option of the three when properly implemented.`;
    }

    let dominantConstraint = "";
    if (penaltyMetric >= failureMetric && penaltyMetric >= maintenanceMetric && input.penaltyPct > 2) {
      dominantConstraint = "Failover penalty is the dominant limiter. Operational inefficiency during transfer or degraded mode is eroding availability more than raw hardware events.";
    } else if (failureMetric >= maintenanceMetric && failureDowntime > 1) {
      dominantConstraint = "Failure downtime is the dominant limiter. Repair exposure after unplanned UPS events is the largest contributor to lost availability.";
    } else if (maintenanceDowntime > 1) {
      dominantConstraint = "Maintenance downtime is the dominant limiter. Planned service windows are still consuming meaningful availability budget.";
    } else {
      dominantConstraint = "Downtime contributors are reasonably controlled. Architecture choice and maintenance burden remain in a practical range.";
    }

    let guidance = "";
    if (input.arch === "single") {
      guidance = "If uptime is business-critical, compare this against N+1 or dual independent before finalizing the design. Single architecture usually becomes the limiting resilience choice fastest.";
    } else if (input.arch === "nplus1") {
      guidance = "Validate whether shared upstream dependencies still create hidden single points of failure. N+1 improves resilience, but implementation detail matters.";
    } else {
      guidance = "Use this as a strong availability baseline, but verify transfer logic, maintenance isolation, and real operating procedures so theoretical redundancy becomes real resilience.";
    }

    return {
      ok: true,
      ...input,
      failureDowntime,
      maintenanceDowntime,
      failoverPenaltyHours,
      totalDowntime,
      availability,
      resilienceClass,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance,
      failureMetric,
      maintenanceMetric,
      penaltyMetric
    };
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.out.innerHTML = `<div class="muted">⚠ ${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.out,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Architecture", value: architectureLabel(data.arch) },
        { label: "Total Downtime / Year", value: fmtHours(data.totalDowntime) },
        { label: "Availability", value: fmtPct(data.availability) },
        { label: "Availability Result", value: data.resilienceClass }
      ],
      derivedRows: [
        { label: "Failure Downtime", value: fmtHours(data.failureDowntime) },
        { label: "Maintenance Downtime", value: fmtHours(data.maintenanceDowntime) },
        { label: "Failover Penalty Impact", value: fmtHours(data.failoverPenaltyHours) },
        { label: "UPS MTBF", value: `${fmt(data.mtbf, 0)} hrs` },
        { label: "Repair Time per Failure", value: fmtHours(data.mttr) },
        { label: "Maintenance Events / Year", value: fmt(data.maintN, 0) },
        { label: "Maintenance Duration", value: fmtHours(data.maintH) },
        { label: "Failover Efficiency Penalty", value: `${fmt(data.penaltyPct, 2)}%` }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Failure Downtime Pressure",
          "Maintenance Downtime Pressure",
          "Failover Penalty"
        ],
        values: [
          Number(data.failureMetric.toFixed(1)),
          Number(data.maintenanceMetric.toFixed(1)),
          Number(data.penaltyMetric.toFixed(1))
        ],
        displayValues: [
          fmtHours(data.failureDowntime),
          fmtHours(data.maintenanceDowntime),
          `${fmt(data.penaltyPct, 2)}%`
        ],
        referenceValue: 20,
        healthyMax: 20,
        watchMax: 45,
        axisTitle: "Availability Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: 100
      }
    });
  }

  function calculate() {
    const data = calculateModel();
    if (!data.ok) return renderError(data.message);
    renderSuccess(data);
  }

  function resetForm() {
    applyDefaults();
    invalidate();
  }

  function bind() {
    ["mtbf", "mttr", "maintN", "maintH", "penalty", "arch"].forEach((id) => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });

    els.calc?.addEventListener("click", calculate);
    els.reset?.addEventListener("click", resetForm);
  }

  function boot() {
    applyDefaults();
    bind();
    invalidate();

    const year = document.querySelector("[data-year]");
    if (year) year.textContent = new Date().getFullYear();
  }

  window.addEventListener("DOMContentLoaded", () => {
    let unlocked = unlockCategoryPage();
    if (unlocked) boot();

    setTimeout(() => {
      unlocked = unlockCategoryPage();
      if (unlocked && els.tool && !els.tool.dataset.initialized) {
        els.tool.dataset.initialized = "true";
        boot();
      }
    }, 400);
  });
})();