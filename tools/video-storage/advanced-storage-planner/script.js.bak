(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    cams: $("cams"),
    avgMbps: $("avgMbps"),
    motionPct: $("motionPct"),
    peakMult: $("peakMult"),
    usableTb: $("usableTb"),
    targetDays: $("targetDays"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysisCopy: $("analysis-copy")
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

  function mbpsToGBPerDayDecimal(mbps) {
    return ((mbps * 1_000_000) / 8) * 86400 / 1_000_000_000;
  }

  function statusFromResolver(metrics) {
    if (
      window.ScopedLabsAnalyzer &&
      typeof window.ScopedLabsAnalyzer.resolveStatus === "function"
    ) {
      const resolved = window.ScopedLabsAnalyzer.resolveStatus({
        metrics,
        healthyMax: 1.0,
        watchMax: 1.25
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
    if (Number(dominant.value) > 1.25) status = "RISK";
    else if (Number(dominant.value) > 1.0) status = "WATCH";

    return {
      status,
      dominantLabel: dominant.label
    };
  }

  function buildInterpretation(status, dominantConstraint, retentionAvgDays, retentionPeakDays, peakMult) {
    if (status === "HEALTHY") {
      return `Average and peak retention both remain on the safe side of the target, so the current storage plan still has usable headroom. Peak behavior is present, but it is not compressing retention hard enough to undermine the design.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Peak retention pressure") {
        return `The design is starting to lean on peak behavior. Average retention may still look acceptable, but burst conditions are compressing usable retention enough that the system is getting closer to a real planning edge.`;
      }

      if (dominantConstraint === "Average retention pressure") {
        return `The baseline storage plan itself is getting tight. Even without extreme spikes, the average ingest rate is close enough to the retention target that future bitrate drift or added cameras could erode margin quickly.`;
      }

      return `Peak scene behavior is becoming a meaningful planning factor. The system may be acceptable on paper, but spike conditions now have enough leverage to reduce storage confidence if assumptions drift.`;
    }

    if (dominantConstraint === "Peak retention pressure") {
      return `Peak behavior is forcing retention below a comfortable planning boundary. The system may appear fine in average-state math, but spike-driven ingest is strong enough to create a real retention cliff under heavier conditions.`;
    }

    if (dominantConstraint === "Average retention pressure") {
      return `The baseline storage plan is under too much pressure. Even before peak behavior is considered, the average ingest rate is already consuming retention margin aggressively enough to make the target unreliable.`;
    }

    return `Bitrate surge behavior is severe enough that storage planning cannot rely on average-state assumptions alone. The design is now vulnerable to real-world scene complexity, codec spikes, or motion-heavy periods compressing retention too far.`;
  }

  function buildGuidance(status, dominantConstraint, maxPerCamMbpsAtTarget, retentionPeakDays, targetDays) {
    if (status === "HEALTHY") {
      return `Carry this as a viable planning point, but preserve discipline around future bitrate growth, camera count expansion, and codec changes. You currently have margin, and the goal is to keep it from quietly disappearing.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Peak retention pressure") {
        return `Increase usable storage or reduce worst-case bitrate behavior before the design grows further. Peak retention is already close enough to the edge that small real-world changes can push it below target.`;
      }

      if (dominantConstraint === "Average retention pressure") {
        return `Reduce sustained average ingest or increase usable storage so the baseline plan stops leaning so hard on the target boundary.`;
      }

      return `Treat peak behavior as part of the real design envelope, not an afterthought. The storage plan should remain comfortable even when scenes become more complex than the average case.`;
    }

    if (dominantConstraint === "Average retention pressure") {
      return `Increase usable storage, lower sustained bitrate, reduce camera count, or shorten the required retention target. The average-state design itself is not carrying enough headroom right now.`;
    }

    if (dominantConstraint === "Peak retention pressure") {
      return `Bring peak ingest under control or add storage headroom before relying on this plan. Peak compression is currently strong enough to undermine the retention target under harder conditions.`;
    }

    return `Rework the peak-behavior assumption before deployment. The current design is too sensitive to spikes, which means the real system is likely to retain less than the planning model suggests.`;
  }

  function renderFallback(summaryRows, derivedRows, status, dominantConstraint, interpretation, guidance) {
    if (els.results) {
      els.results.innerHTML = `
        ${summaryRows.map((row) => `
          <div class="result-row">
            <div class="result-label">${row.label}</div>
            <div class="result-value">${row.value}</div>
          </div>
        `).join("")}
        ${derivedRows.map((row) => `
          <div class="result-row">
            <div class="result-label">${row.label}</div>
            <div class="result-value">${row.value}</div>
          </div>
        `).join("")}
      `;
    }

    if (els.analysisCopy) {
      els.analysisCopy.style.display = "";
      els.analysisCopy.innerHTML = `
        <div class="results">
          <div class="result-row">
            <div class="result-label">Status</div>
            <div class="result-value">${status}</div>
          </div>
          <div class="result-row">
            <div class="result-label">Dominant Constraint</div>
            <div class="result-value">${dominantConstraint}</div>
          </div>
          <div class="result-row">
            <div class="result-label">Engineering Interpretation</div>
            <div class="result-value">${interpretation}</div>
          </div>
          <div class="result-row">
            <div class="result-label">Actionable Guidance</div>
            <div class="result-value">${guidance}</div>
          </div>
        </div>
      `;
    }
  }

  function calculate() {
    const camsRaw = safeNumber(els.cams.value, NaN);
    const avgMbpsRaw = safeNumber(els.avgMbps.value, NaN);
    const motionPctRaw = safeNumber(els.motionPct.value, NaN);
    const peakMultRaw = safeNumber(els.peakMult.value, NaN);
    const usableTbRaw = safeNumber(els.usableTb.value, NaN);
    const targetDaysRaw = safeNumber(els.targetDays.value, NaN);

    if (
      !Number.isFinite(camsRaw) || camsRaw <= 0 ||
      !Number.isFinite(avgMbpsRaw) || avgMbpsRaw <= 0 ||
      !Number.isFinite(motionPctRaw) || motionPctRaw <= 0 ||
      !Number.isFinite(peakMultRaw) || peakMultRaw < 1 ||
      !Number.isFinite(usableTbRaw) || usableTbRaw <= 0 ||
      !Number.isFinite(targetDaysRaw) || targetDaysRaw <= 0
    ) {
      if (els.results) {
        els.results.innerHTML = `<div class="muted">Enter valid values and press Calculate.</div>`;
      }
      clearAnalysisBlock();
      clearChart();
      return;
    }

    const cams = Math.max(1, Math.floor(clamp(camsRaw, 1, 100000)));
    const avgMbps = clamp(avgMbpsRaw, 0.01, 100000);
    const motionPct = clamp(motionPctRaw, 1, 100);
    const peakMult = clamp(peakMultRaw, 1, 20);
    const usableTb = clamp(usableTbRaw, 0.01, 100000);
    const targetDays = Math.max(1, Math.floor(clamp(targetDaysRaw, 1, 100000)));

    const duty = motionPct / 100;

    const totalAvgMbps = cams * avgMbps * duty;
    const totalPeakMbps = cams * (avgMbps * peakMult) * duty;

    const avgGBday = mbpsToGBPerDayDecimal(totalAvgMbps);
    const peakGBday = mbpsToGBPerDayDecimal(totalPeakMbps);

    const usableGB = usableTb * 1000;

    const retentionAvgDays = usableGB / Math.max(0.00001, avgGBday);
    const retentionPeakDays = usableGB / Math.max(0.00001, peakGBday);

    const avgMarginDays = retentionAvgDays - targetDays;
    const peakMarginDays = retentionPeakDays - targetDays;

    const avgGBdayMax = usableGB / targetDays;
    const maxTotalMbpsAtTarget = avgGBdayMax * 1_000_000_000 * 8 / (86400 * 1_000_000);
    const maxPerCamMbpsAtTarget = (maxTotalMbpsAtTarget / cams) / duty;

    const avgRetentionPressure = targetDays / retentionAvgDays;
    const peakRetentionPressure = targetDays / retentionPeakDays;
    const peakSurgePressure = peakMult / 1.5;

    const metrics = [
      {
        label: "Average Retention Pressure",
        value: avgRetentionPressure,
        displayValue: `${retentionAvgDays.toFixed(1)} days`
      },
      {
        label: "Peak Retention Pressure",
        value: peakRetentionPressure,
        displayValue: `${retentionPeakDays.toFixed(1)} days`
      },
      {
        label: "Peak Surge Behavior",
        value: peakSurgePressure,
        displayValue: `${peakMult.toFixed(2)}x`
      }
    ];

    const resolved = statusFromResolver(metrics);
    const status = resolved.status;

    const dominantConstraintMap = {
      "Average Retention Pressure": "Average retention pressure",
      "Peak Retention Pressure": "Peak retention pressure",
      "Peak Surge Behavior": "Peak surge behavior"
    };

    const dominantConstraint =
      dominantConstraintMap[resolved.dominantLabel] || "Average retention pressure";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      retentionAvgDays,
      retentionPeakDays,
      peakMult
    );

    const guidance = buildGuidance(
      status,
      dominantConstraint,
      maxPerCamMbpsAtTarget,
      retentionPeakDays,
      targetDays
    );

    const summaryRows = [
      { label: "Camera Count", value: `${cams}` },
      { label: "Average Bitrate / Cam", value: `${avgMbps.toFixed(2)} Mbps` },
      { label: "Motion / Duty", value: `${motionPct.toFixed(0)}%` },
      { label: "Usable Storage", value: `${usableTb.toFixed(1)} TB` }
    ];

    const derivedRows = [
      { label: "Total Average Bitrate", value: `${totalAvgMbps.toFixed(2)} Mbps` },
      { label: "Total Peak Bitrate", value: `${totalPeakMbps.toFixed(2)} Mbps` },
      { label: "Average Ingest", value: `${avgGBday.toFixed(1)} GB/day` },
      { label: "Peak Ingest", value: `${peakGBday.toFixed(1)} GB/day` },
      { label: "Retention (Average)", value: `${retentionAvgDays.toFixed(1)} days` },
      { label: "Retention (Peak)", value: `${retentionPeakDays.toFixed(1)} days` },
      { label: "Target Retention", value: `${targetDays} days` },
      { label: "Margin vs Target (Avg)", value: `${avgMarginDays.toFixed(1)} days` },
      { label: "Margin vs Target (Peak)", value: `${peakMarginDays.toFixed(1)} days` },
      { label: `Max Total Avg Bitrate @ ${targetDays}d`, value: `${maxTotalMbpsAtTarget.toFixed(2)} Mbps` },
      { label: `Max Per-Cam Avg Bitrate @ ${targetDays}d`, value: `${maxPerCamMbpsAtTarget.toFixed(2)} Mbps` }
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
          "Avg Retention Pressure",
          "Peak Retention Pressure",
          "Peak Surge Behavior"
        ],
        values: [
          avgRetentionPressure,
          peakRetentionPressure,
          peakSurgePressure
        ],
        displayValues: [
          `${retentionAvgDays.toFixed(1)} days`,
          `${retentionPeakDays.toFixed(1)} days`,
          `${peakMult.toFixed(2)}x`
        ],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.25,
        axisTitle: "Retention Pressure",
        referenceLabel: "Target Boundary",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          1.8,
          Math.ceil(Math.max(avgRetentionPressure, peakRetentionPressure, peakSurgePressure, 1.25) * 1.15 * 10) / 10
        )
      });
    }
  }

  function reset() {
    els.cams.value = "16";
    els.avgMbps.value = "4";
    els.motionPct.value = "100";
    els.peakMult.value = "1.5";
    els.usableTb.value = "40";
    els.targetDays.value = "30";
    renderEmpty();
  }

  function bindInvalidation() {
    [
      els.cams,
      els.avgMbps,
      els.motionPct,
      els.peakMult,
      els.usableTb,
      els.targetDays
    ].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init() {
    renderEmpty();
    bindInvalidation();

    if (els.calc) els.calc.addEventListener("click", calculate);
    if (els.reset) els.reset.addEventListener("click", reset);
  }

  init();
})();
