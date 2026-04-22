(() => {
  "use strict";

  const CATEGORY = "video-storage";
  const STEP = "raid-impact";
  const PREVIOUS_STEP = "retention";
  const NEXT_URL = "/tools/video-storage/retention-survivability/";
  const LANE = "v1";

  const FLOW_KEYS = {
    bitrate: "scopedlabs:pipeline:video-storage:bitrate",
    storage: "scopedlabs:pipeline:video-storage:storage",
    retention: "scopedlabs:pipeline:video-storage:retention",
    raid: "scopedlabs:pipeline:video-storage:raid",
    survivability: "scopedlabs:pipeline:video-storage:survivability"
  };

  const LEGACY_STORAGE_KEY = "scopedlabs:pipeline:last-result";

  const $ = (id) => document.getElementById(id);

  const els = {
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard"),
    results: $("results"),
    analysisCopy: $("analysis-copy"),
    nextStepRow: $("next-step-row"),
    continueBtn: $("continue"),
    flowNote: $("flow-note"),
    raidLevel: $("raidLevel"),
    driveCount: $("driveCount"),
    driveSizeTb: $("driveSizeTb"),
    hotSpares: $("hotSpares"),
    overheadPct: $("overheadPct"),
    targetDays: $("targetDays"),
    requiredStorageGb: $("requiredStorageGb"),
    calc: $("calc"),
    reset: $("reset")
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

  function num(v) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.safeNumber === "function"
    ) {
      return window.ScopedLabsAnalyzer.safeNumber(v, 0);
    }
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function clamp(v, min, max) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clamp === "function"
    ) {
      return window.ScopedLabsAnalyzer.clamp(v, min, max);
    }
    return Math.min(Math.max(v, min), max);
  }

  function toTiBFromTB(tbDecimal) {
    const bytes = tbDecimal * 1e12;
    return bytes / (1024 ** 4);
  }

  function toGiBFromTB(tbDecimal) {
    const bytes = tbDecimal * 1e12;
    return bytes / (1024 ** 3);
  }

  function hideNext() {
    if (els.nextStepRow) els.nextStepRow.style.display = "none";
  }

  function showNext() {
    if (els.nextStepRow) els.nextStepRow.style.display = "flex";
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

  function toleranceText(level) {
    switch (level) {
      case "0":
        return { t: "0 drives (no redundancy)", cls: "flag-bad" };
      case "1":
        return { t: "1 per mirror set", cls: "flag-ok" };
      case "5":
        return { t: "1 drive", cls: "flag-ok" };
      case "6":
        return { t: "2 drives", cls: "flag-ok" };
      case "10":
        return { t: "1 per mirror pair (varies)", cls: "flag-ok" };
      default:
        return { t: "Varies", cls: "" };
    }
  }

  function clearStored() {
    try {
      sessionStorage.removeItem(FLOW_KEYS.raid);
    } catch {}
    try {
      const legacy = JSON.parse(sessionStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      if (legacy && legacy.category === CATEGORY && legacy.step === STEP) {
        sessionStorage.removeItem(LEGACY_STORAGE_KEY);
      }
    } catch {}
  }

  function readPreviousFlow() {
    try {
      const primary = JSON.parse(sessionStorage.getItem(FLOW_KEYS.retention) || "null");
      if (primary && primary.category === CATEGORY) return primary;
    } catch {}

    try {
      const legacy = JSON.parse(sessionStorage.getItem(LEGACY_STORAGE_KEY) || "null");
      if (legacy && legacy.category === CATEGORY && legacy.step === PREVIOUS_STEP) return legacy;
    } catch {}

    return null;
  }

  function renderFlowNote() {
    const imported = readPreviousFlow();

    if (!imported || !els.flowNote) {
      if (els.flowNote) {
        els.flowNote.hidden = true;
        els.flowNote.innerHTML = "";
      }
      return;
    }

    const data = imported.data || {};
    const targetDays = Number(data.targetDays);
    const storageGb = Number(
      data.storageGb ??
      data.storage_total_gb ??
      data.requiredStorageGb ??
      0
    );

    if (Number.isFinite(targetDays) && targetDays > 0) {
      els.targetDays.value = String(Math.round(targetDays));
    }

    if (Number.isFinite(storageGb) && storageGb > 0) {
      els.requiredStorageGb.value = storageGb.toFixed(1);
    }

    const parts = [];
    if (Number.isFinite(targetDays) && targetDays > 0) {
      parts.push(`Target Retention: ${Math.round(targetDays)} days`);
    }
    if (Number.isFinite(storageGb) && storageGb > 0) {
      parts.push(`Required Storage: ${(storageGb / 1000).toFixed(2)} TB`);
    }

    els.flowNote.hidden = false;
    els.flowNote.innerHTML = `
      <strong>Step 4 — Using Retention Planner results:</strong><br>
      ${parts.join(" | ")}
      <br><br>
      This step checks whether the selected RAID profile can actually support the required retention target once parity, mirroring, spares, and platform overhead are applied.
    `;
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
        category: CATEGORY,
        step: STEP,
        lane: LANE,
        emptyMessage: "Enter values and press Calculate."
      });
    } else {
      renderEmpty();
    }

    clearChart();
  }

  function buildInterpretation(status, dominantConstraint, fitRatio, active, level) {
    if (status === "HEALTHY") {
      return `The selected RAID profile remains in a workable planning range. Usable capacity, redundancy, and retention fit are aligned well enough that the array should support the intended storage target without leaning on unsafe assumptions.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Retention fit pressure") {
        return `The main issue is capacity fit against the required retention target. The array may still be viable, but usable storage is close enough to the requirement that overhead drift or future ingest growth could erode margin quickly.`;
      }

      if (dominantConstraint === "Failure exposure") {
        return `The capacity math may close, but the chosen RAID level is carrying more rebuild or failure exposure than is ideal for the array size. Reliability risk is starting to matter as much as raw capacity.`;
      }

      return `Capacity penalty from parity, mirroring, spares, and overhead is becoming meaningful. The array still works on paper, but the tradeoff between usable capacity and protection is now tight enough to deserve deliberate review.`;
    }

    if (dominantConstraint === "Retention fit pressure") {
      return `Usable capacity is under too much pressure relative to the imported retention target. The design may look close, but the storage margin is now tight enough that the array cannot be treated as comfortably sized.`;
    }

    if (dominantConstraint === "Failure exposure") {
      return `The dominant concern is survivability exposure, not just capacity. The selected RAID profile is now carrying enough rebuild or fault-tolerance risk that the storage design becomes operationally fragile under failure conditions.`;
    }

    return `The protection overhead is consuming enough of the raw array that usable capacity efficiency becomes a major design issue. The tradeoff between resilience and retention is no longer minor.`;
  }

  function buildGuidance(status, dominantConstraint, level, fitPass) {
    if (status === "HEALTHY") {
      return `Carry this array forward into survivability analysis, but keep the same overhead and ingest assumptions consistent. The current RAID choice looks workable, and the next question is how the design behaves during failure events.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Retention fit pressure") {
        return `Increase usable capacity, reduce required retention burden, or tighten ingest assumptions before locking the design. The current fit is workable but not comfortably forgiving.`;
      }

      if (dominantConstraint === "Failure exposure") {
        return `Review whether the chosen RAID level provides enough failure margin for the drive count and disk size. The capacity may fit, but rebuild exposure is now influential enough to matter.`;
      }

      return `Re-evaluate the balance between protection and usable capacity. The current design still works, but the efficiency penalty is large enough that a small change in RAID strategy could improve the outcome materially.`;
    }

    if (dominantConstraint === "Retention fit pressure") {
      return `Do not trust this array as comfortably sized for the imported target yet. Add capacity, reduce retention demand, or reduce ingest burden before moving forward.`;
    }

    if (dominantConstraint === "Failure exposure") {
      return `Choose a more resilient RAID profile or reduce rebuild exposure before deployment. The current fault-tolerance posture is too risky to treat as an afterthought.`;
    }

    return `Rework the array design before proceeding. The current capacity efficiency penalty is high enough that the protection tradeoff should be revisited deliberately.`;
  }

  function failureExposureScore(level, active) {
    if (level === "0") return 2.4;
    if (level === "1") return active >= 6 ? 1.15 : 0.95;
    if (level === "5") return active >= 10 ? 1.95 : 1.45;
    if (level === "6") return active >= 12 ? 1.15 : 0.85;
    if (level === "10") return active >= 12 ? 1.05 : 0.80;
    return 1.0;
  }

  function renderFallback(summaryRows, derivedRows, status, dominantConstraint, interpretation, guidance) {
    els.results.innerHTML = summaryRows.concat(derivedRows).map((row) => `
      <div class="result-row">
        <div class="k">${row.label}</div>
        <div class="v ${row.cls || ""}">${row.value}</div>
      </div>
    `).join("");

    if (els.analysisCopy) {
      els.analysisCopy.style.display = "";
      els.analysisCopy.innerHTML = `
        <div class="results-grid">
          <div class="result-row">
            <div class="k">Status</div>
            <div class="v">${status}</div>
          </div>
          <div class="result-row">
            <div class="k">Dominant Constraint</div>
            <div class="v">${dominantConstraint}</div>
          </div>
          <div class="result-row">
            <div class="k">Engineering Interpretation</div>
            <div class="v">${interpretation}</div>
          </div>
          <div class="result-row">
            <div class="k">Actionable Guidance</div>
            <div class="v">${guidance}</div>
          </div>
        </div>
      `;
    }
  }

  function calculate() {
    const level = els.raidLevel.value;
    const drives = Math.max(0, Math.floor(num(els.driveCount.value)));
    const spares = clamp(Math.floor(num(els.hotSpares.value)), 0, Math.max(0, drives - 1));
    const sizeTB = Math.max(0, num(els.driveSizeTb.value));
    const overheadPct = clamp(num(els.overheadPct.value), 0, 50);
    const targetDays = Math.max(1, Math.floor(num(els.targetDays.value)));
    const requiredStorageGb = Math.max(0, num(els.requiredStorageGb.value));

    const active = Math.max(0, drives - spares);

    if (active < 2 || sizeTB <= 0) {
      els.results.innerHTML = `
        <div class="result-row">
          <div class="k">Status</div>
          <div class="v flag-warn">Enter a valid drive count (>= 2 active) and drive size.</div>
        </div>
      `;
      clearAnalysisBlock();
      hideNext();
      clearStored();
      clearChart();
      return;
    }

    let usableTB = 0;
    let rule = "";

    if (level === "0") {
      usableTB = active * sizeTB;
      rule = "Usable = N × size";
    } else if (level === "1") {
      const pairs = Math.floor(active / 2);
      usableTB = pairs * sizeTB;
      rule = "Usable = floor(N / 2) × size";
    } else if (level === "5") {
      if (active < 3) {
        els.results.innerHTML = `
          <div class="result-row">
            <div class="k">Status</div>
            <div class="v flag-warn">RAID 5 requires at least 3 active drives.</div>
          </div>
        `;
        clearAnalysisBlock();
        hideNext();
        clearStored();
        clearChart();
        return;
      }
      usableTB = (active - 1) * sizeTB;
      rule = "Usable = (N - 1) × size";
    } else if (level === "6") {
      if (active < 4) {
        els.results.innerHTML = `
          <div class="result-row">
            <div class="k">Status</div>
            <div class="v flag-warn">RAID 6 requires at least 4 active drives.</div>
          </div>
        `;
        clearAnalysisBlock();
        hideNext();
        clearStored();
        clearChart();
        return;
      }
      usableTB = (active - 2) * sizeTB;
      rule = "Usable = (N - 2) × size";
    } else if (level === "10") {
      if (active < 4) {
        els.results.innerHTML = `
          <div class="result-row">
            <div class="k">Status</div>
            <div class="v flag-warn">RAID 10 requires at least 4 active drives.</div>
          </div>
        `;
        clearAnalysisBlock();
        hideNext();
        clearStored();
        clearChart();
        return;
      }
      const pairs = Math.floor(active / 2);
      usableTB = pairs * sizeTB;
      rule = "Usable = floor(N / 2) × size (striped mirrors)";
    }

    const rawTB = active * sizeTB;
    const usableAfterOverheadTB = usableTB * (1 - overheadPct / 100);

    const rawTiB = toTiBFromTB(rawTB);
    const usableTiB = toTiBFromTB(usableTB);
    const usableNetTiB = toTiBFromTB(usableAfterOverheadTB);

    const penaltyPct = rawTB > 0 ? (1 - usableTB / rawTB) * 100 : 0;
    const tol = toleranceText(level);

    const netUsableGiB = toGiBFromTB(usableAfterOverheadTB);
    const maxGiBPerDay = targetDays > 0 ? netUsableGiB / targetDays : 0;
    const maxGBPerDayDecimal = (maxGiBPerDay * (1024 ** 3)) / 1e9;

    let fitText = "No imported retention target.";
    let fitCls = "";
    let fitRatio = 0.9;
    let fitPass = true;

    if (requiredStorageGb > 0) {
      const netUsableGBDecimal = usableAfterOverheadTB * 1000;
      fitRatio = requiredStorageGb / Math.max(1, netUsableGBDecimal);

      if (netUsableGBDecimal >= requiredStorageGb) {
        fitText = `Pass — array can support imported retention target (${requiredStorageGb.toFixed(1)} GB required).`;
        fitCls = "flag-ok";
        fitPass = true;
      } else {
        fitText = `Shortfall — array is below imported retention target by ${(requiredStorageGb - netUsableGBDecimal).toFixed(1)} GB.`;
        fitCls = "flag-warn";
        fitPass = false;
      }
    }

    let riskNote = "Balanced for general workloads.";
    let riskCls = "flag-ok";

    if (level === "0") {
      riskNote = "High risk: any single drive failure means total data loss.";
      riskCls = "flag-bad";
    } else if (level === "5" && active >= 10) {
      riskNote = "Caution: large RAID 5 arrays increase rebuild exposure, especially with bigger disks.";
      riskCls = "flag-warn";
    } else if (level === "6") {
      riskNote = "Stronger rebuild safety than RAID 5 for larger arrays.";
      riskCls = "flag-ok";
    }

    const retentionFitPressure = requiredStorageGb > 0 ? fitRatio : Math.max(0.8, targetDays / 30);
    const exposurePressure = failureExposureScore(level, active);
    const efficiencyPenaltyPressure = Math.max(0.2, penaltyPct / 25);

    const metrics = [
      {
        label: "Retention fit pressure",
        value: retentionFitPressure,
        displayValue: requiredStorageGb > 0 ? `${fitRatio.toFixed(2)}x` : `${targetDays} days`
      },
      {
        label: "Failure exposure",
        value: exposurePressure,
        displayValue: tol.t
      },
      {
        label: "Efficiency penalty",
        value: efficiencyPenaltyPressure,
        displayValue: `${penaltyPct.toFixed(1)}%`
      }
    ];

    let status = "HEALTHY";
    let dominantLabel = "Retention fit pressure";

    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.6
      });
      status = resolved?.status || "HEALTHY";
      dominantLabel = resolved?.dominant?.label || "Retention fit pressure";
    }

    const dominantConstraintMap = {
      "Retention fit pressure": "Retention fit pressure",
      "Failure exposure": "Failure exposure",
      "Efficiency penalty": "Efficiency penalty"
    };

    const dominantConstraint =
      dominantConstraintMap[dominantLabel] || "Retention fit pressure";

    const interpretation = buildInterpretation(status, dominantConstraint, fitRatio, active, level);
    const guidance = buildGuidance(status, dominantConstraint, level, fitPass);

    const summaryRows = [
      { label: "Active drives (excluding spares)", value: String(active) },
      { label: "Raw capacity", value: `${rawTB.toFixed(1)} TB • ${rawTiB.toFixed(2)} TiB` },
      { label: "Usable capacity (rule)", value: `${usableTB.toFixed(1)} TB • ${usableTiB.toFixed(2)} TiB` },
      { label: "Usable after overhead", value: `${usableAfterOverheadTB.toFixed(1)} TB • ${usableNetTiB.toFixed(2)} TiB` }
    ];

    const derivedRows = [
      { label: "Capacity penalty vs raw", value: `${penaltyPct.toFixed(1)}%` },
      { label: "Fault tolerance", value: tol.t, cls: tol.cls },
      { label: "Rule", value: rule },
      { label: `Max daily ingest @ ${targetDays} days retention`, value: `${maxGBPerDayDecimal.toFixed(0)} GB/day` },
      { label: "Max daily ingest (GiB/day)", value: `${maxGiBPerDay.toFixed(0)} GiB/day` },
      { label: "Imported retention fit", value: fitText, cls: fitCls },
      { label: "Risk note", value: riskNote, cls: riskCls }
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
        labels: ["Retention Fit", "Failure Exposure", "Efficiency Penalty"],
        values: [retentionFitPressure, exposurePressure, efficiencyPenaltyPressure],
        displayValues: [
          requiredStorageGb > 0 ? `${fitRatio.toFixed(2)}x` : `${targetDays} days`,
          tol.t,
          `${penaltyPct.toFixed(1)}%`
        ],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.6,
        axisTitle: "RAID Pressure",
        referenceLabel: "Healthy Threshold",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          2.8,
          Math.ceil(Math.max(retentionFitPressure, exposurePressure, efficiencyPenaltyPressure, 1.6) * 1.15 * 10) / 10
        )
      });
    }

    const params = new URLSearchParams({
      source: "raid",
      raidLevel: String(level),
      driveCount: String(drives),
      driveSizeTb: String(sizeTB),
      hotSpares: String(spares),
      overheadPct: String(overheadPct),
      targetDays: String(targetDays),
      requiredStorageGb: String(requiredStorageGb),
      usableTb: usableAfterOverheadTB.toFixed(2)
    });

    if (els.continueBtn) {
      els.continueBtn.href = NEXT_URL + "?" + params.toString();
    }

    try {
      const payload = {
        category: CATEGORY,
        step: STEP,
        data: {
          raidLevel: String(level),
          activeDrives: active,
          rawTB: Number(rawTB.toFixed(1)),
          usableTB: Number(usableAfterOverheadTB.toFixed(2)),
          targetDays,
          requiredStorageGb: Number(requiredStorageGb.toFixed(1)),
          fitPass,
          status,
          dominantConstraint
        }
      };

      sessionStorage.setItem(FLOW_KEYS.raid, JSON.stringify(payload));
      sessionStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(payload));
    } catch {}

    showNext();
  }

  function reset() {
    els.raidLevel.value = "5";
    els.driveCount.value = "8";
    els.driveSizeTb.value = "10";
    els.hotSpares.value = "0";
    els.overheadPct.value = "8";
    els.targetDays.value = "30";
    els.requiredStorageGb.value = "0";

    renderEmpty();
    hideNext();
    renderFlowNote();
  }

  function bindInvalidation() {
    [
      els.raidLevel,
      els.driveCount,
      els.driveSizeTb,
      els.hotSpares,
      els.overheadPct,
      els.targetDays,
      els.requiredStorageGb
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function bind() {
    if (els.calc) els.calc.addEventListener("click", calculate);
    if (els.reset) els.reset.addEventListener("click", reset);

    bindInvalidation();

    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const t = e.target;
        if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
          e.preventDefault();
          calculate();
        }
      }
    });
  }

  function boot() {
    renderEmpty();
    hideNext();
    renderFlowNote();
    bind();

    const yearEl = document.querySelector("[data-year]");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  }

  window.addEventListener("DOMContentLoaded", () => {
    const unlocked = unlockCategoryPage();
    if (!unlocked) return;
    boot();
  });
})();
