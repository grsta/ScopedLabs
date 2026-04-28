(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const els = {
    lockedCard: $("lockedCard"),
    toolCard: $("toolCard"),
    baseline: $("baseline"),
    fromCodec: $("fromCodec"),
    toCodec: $("toCodec"),
    hours: $("hours"),
    days: $("days"),
    cams: $("cams"),
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

  function clamp(value, min, max) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.clamp === "function"
    ) {
      return window.ScopedLabsAnalyzer.clamp(value, min, max);
    }

    return Math.min(max, Math.max(min, value));
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

  function eff(codec) {
    if (codec === "av1") return 0.60;
    if (codec === "h265") return 0.70;
    if (codec === "vp9") return 0.75;
    return 1.00;
  }

  function gbFromMbps(mbps, hours) {
    const bits = mbps * 1_000_000 * (hours * 3600);
    const bytes = bits / 8;
    return bytes / 1_000_000_000;
  }

  function resolveStatus(metrics) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.35
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
    if (Number(dominant.value) > 1.35) status = "RISK";
    else if (Number(dominant.value) > 1.0) status = "WATCH";

    return {
      status,
      dominantLabel: dominant.label
    };
  }

  function buildInterpretation(status, dominantConstraint, savingsPct, oldGB, newGB) {
    const isSavings = savingsPct >= 0;
    const absPct = Math.abs(savingsPct);
    const oldLabel = Number.isFinite(oldGB) ? oldGB.toFixed(1) : "0.0";
    const newLabel = Number.isFinite(newGB) ? newGB.toFixed(1) : "0.0";

    if (!isSavings) {
      if (status === "HEALTHY") {
        return `The target codec increases estimated storage instead of reducing it. Baseline storage is about ${oldLabel} GB and target storage is about ${newLabel} GB, so this should be treated as a storage increase rather than a savings opportunity.`;
      }

      if (status === "WATCH") {
        return `The target codec increases storage demand by about ${absPct.toFixed(1)}%. That may be acceptable for compatibility, quality, or workflow reasons, but the storage plan should carry the increase explicitly instead of presenting it as savings.`;
      }

      return `The target codec creates a significant storage increase. This comparison should be treated as a capacity penalty, not an efficiency gain, and downstream storage planning should use the larger target storage value.`;
    }

    if (status === "HEALTHY") {
      return `The codec change produces storage savings without pushing the design into a fragile edge case. Baseline storage is about ${oldLabel} GB and target storage is about ${newLabel} GB, so the change is useful while still remaining straightforward to plan around.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Codec delta strength") {
        return `The primary story here is the size of the codec efficiency change itself. Savings exist, but they should still be validated against quality, playback, and recorder support before being treated as fully bankable.`;
      }

      if (dominantConstraint === "Retention burden") {
        return `Retention length is making the codec difference more important. Even modest efficiency gains now accumulate into a noticeable storage impact because the archive window is long enough for small stream differences to compound.`;
      }

      return `Camera scale is amplifying the codec decision. The per-camera change may look modest, but the fleet-wide effect is large enough that codec choice becomes a real storage-planning lever.`;
    }

    if (dominantConstraint === "Retention burden") {
      return `Long retention is turning codec efficiency into a major storage driver. The choice of codec now materially changes how much retained data the system must carry over time.`;
    }

    if (dominantConstraint === "Camera fleet scale") {
      return `Camera count is the main reason this codec decision matters so much. Even moderate per-stream efficiency changes are being magnified into a large aggregate storage burden across the deployment.`;
    }

    return `The difference between the current and target codec is large enough to create a significant storage swing. This is no longer a minor tuning choice — it is a structural efficiency decision that can materially alter capacity planning.`;
  }

  function buildGuidance(status, dominantConstraint, savingsPct) {
    const isSavings = savingsPct >= 0;
    const absPct = Math.abs(savingsPct);

    if (!isSavings) {
      if (status === "HEALTHY") {
        return `Use the target codec only if compatibility, quality, or workflow needs justify the added storage. Otherwise, keep the more efficient baseline codec or revise bitrate assumptions.`;
      }

      if (status === "WATCH") {
        return `The target codec increases storage by about ${absPct.toFixed(1)}%, so validate the larger capacity requirement before treating this codec path as acceptable.`;
      }

      return `Do not treat this as an optimization path. The target codec materially increases retained storage demand, so the storage plan should be reworked around the larger footprint or the codec choice should be revisited.`;
    }

    if (status === "HEALTHY") {
      return `Use the target codec estimate as a practical storage-planning alternative, but validate encoder support, quality acceptance, and playback workflow before assuming the savings are fully bankable.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Retention burden") {
        return `Prioritize codec validation if long retention is a hard requirement. The archive window is now long enough that codec efficiency can materially change total storage demand.`;
      }

      if (dominantConstraint === "Camera fleet scale") {
        return `Model the codec decision at full deployment scale before locking the storage plan. Fleet size is large enough that even moderate efficiency changes deserve a deliberate validation pass.`;
      }

      return `Treat the savings as useful but not magical. Combine codec choice with bitrate tuning, retention review, and storage policy rather than expecting codec migration alone to solve every capacity issue.`;
    }

    if (dominantConstraint === "Codec delta strength") {
      return `Validate the migration path seriously. The savings are large enough that codec choice can reshape storage planning, but only if the operational workflow can support the target codec cleanly.`;
    }

    if (dominantConstraint === "Retention burden") {
      return `Use the more efficient codec path or reduce retention burden. The current archive horizon is making codec efficiency too important to ignore.`;
    }

    return `Rework the storage plan around the codec outcome rather than treating codec as a cosmetic setting. The efficiency difference is large enough to change real capacity decisions.`;
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
    const baselineRaw = safeNumber(els.baseline.value, NaN);
    const hoursRaw = safeNumber(els.hours.value, NaN);
    const daysRaw = safeNumber(els.days.value, NaN);
    const camsRaw = safeNumber(els.cams.value, NaN);

    const fromCodec = els.fromCodec.value;
    const toCodec = els.toCodec.value;

    if (
      !Number.isFinite(baselineRaw) || baselineRaw <= 0 ||
      !Number.isFinite(hoursRaw) || hoursRaw < 0 ||
      !Number.isFinite(daysRaw) || daysRaw < 0 ||
      !Number.isFinite(camsRaw) || camsRaw < 1
    ) {
      if (els.results) {
        els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      }
      clearAnalysisBlock();
      clearChart();
      return;
    }

    const baseline = clamp(baselineRaw, 0.01, 100000);
    const hours = clamp(hoursRaw, 0, 24);
    const days = clamp(daysRaw, 0, 3650);
    const cams = Math.max(1, Math.floor(clamp(camsRaw, 1, 100000)));

    const newMbps = baseline * (eff(toCodec) / eff(fromCodec));

    const perCamHours = hours * days;
    const oldGB = gbFromMbps(baseline, perCamHours) * cams;
    const newGB = gbFromMbps(newMbps, perCamHours) * cams;

    const savingsGB = oldGB - newGB;
    const savingsPct = oldGB > 0 ? (savingsGB / oldGB) * 100 : 0;
    const isStorageSavings = savingsGB >= 0;
    const storageChangeLabel = isStorageSavings ? "Estimated Savings" : "Estimated Increase";
    const storageChangeValue = isStorageSavings
      ? `${savingsGB.toFixed(1)} GB saved (${savingsPct.toFixed(1)}%)`
      : `${Math.abs(savingsGB).toFixed(1)} GB increase (${Math.abs(savingsPct).toFixed(1)}%)`;
    const codecDeltaDisplay = isStorageSavings
      ? `${savingsPct.toFixed(1)}% savings`
      : `${Math.abs(savingsPct).toFixed(1)}% increase`;

    const codecDeltaStrength = Math.abs(1 - (eff(toCodec) / eff(fromCodec))) * 3;
    const retentionBurden = Math.max(0.1, days / 30);
    const fleetScale = Math.max(0.1, cams / 8);

    const metrics = [
      {
        label: "Codec Delta Strength",
        value: codecDeltaStrength,
        displayValue: codecDeltaDisplay
      },
      {
        label: "Retention Burden",
        value: retentionBurden,
        displayValue: `${days.toFixed(0)} days`
      },
      {
        label: "Camera Fleet Scale",
        value: fleetScale,
        displayValue: `${cams} cams`
      }
    ];

    const resolved = resolveStatus(metrics);
    const status = resolved.status;

    const dominantConstraintMap = {
      "Codec Delta Strength": "Codec delta strength",
      "Retention Burden": "Retention burden",
      "Camera Fleet Scale": "Camera fleet scale"
    };

    const dominantConstraint =
      dominantConstraintMap[resolved.dominantLabel] || "Codec delta strength";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      savingsPct,
      oldGB,
      newGB
    );

    const guidance = buildGuidance(
      status,
      dominantConstraint,
      savingsPct
    );

    const summaryRows = [
      { label: "Baseline Bitrate", value: `${baseline.toFixed(2)} Mbps (${fromCodec.toUpperCase()})` },
      { label: "Target Bitrate", value: `${newMbps.toFixed(2)} Mbps (${toCodec.toUpperCase()})` },
      { label: "Hours × Days × Cams", value: `${hours.toFixed(1)}h × ${days.toFixed(0)}d × ${cams}` }
    ];

    const derivedRows = [
      { label: "Storage (Baseline)", value: `${oldGB.toFixed(1)} GB` },
      { label: "Storage (Target)", value: `${newGB.toFixed(1)} GB` },
      { label: "Storage Change", value: storageChangeValue },
      { label: "Planning Basis", value: "Rule-of-thumb codec efficiency comparison" }
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
          "Codec Delta",
          "Retention Burden",
          "Fleet Scale"
        ],
        values: [
          codecDeltaStrength,
          retentionBurden,
          fleetScale
        ],
        displayValues: [
          codecDeltaDisplay,
          `${days.toFixed(0)} days`,
          `${cams} cams`
        ],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.35,
        axisTitle: "Codec Change Pressure",
        referenceLabel: "Healthy Threshold",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          3,
          Math.ceil(Math.max(codecDeltaStrength, retentionBurden, fleetScale, 1.35) * 1.15 * 10) / 10
        )
      });
    }
  }

  function reset() {
    els.baseline.value = 4.0;
    els.fromCodec.value = "h264";
    els.toCodec.value = "h265";
    els.hours.value = 24;
    els.days.value = 30;
    els.cams.value = 8;
    renderEmpty();
  }

  function bindInvalidation() {
    [els.baseline, els.fromCodec, els.toCodec, els.hours, els.days, els.cams].forEach((el) => {
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
