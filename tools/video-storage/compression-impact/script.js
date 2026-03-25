// Compression Impact
(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    baseline: $("baseline"),
    quality: $("quality"),
    motion: $("motion"),
    gop: $("gop"),
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

  function qFactor(q) {
    if (q === "high") return 1.25;
    if (q === "low") return 0.80;
    return 1.00;
  }

  function mFactor(m) {
    if (m === "high") return 1.35;
    if (m === "low") return 0.80;
    return 1.00;
  }

  function gopFactor(gopSec) {
    const g = clamp(gopSec, 0.5, 10);
    if (g <= 1) return 1.15;
    if (g <= 2) return 1.00;
    if (g <= 4) return 0.92;
    return 0.88;
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

  function buildInterpretation(status, dominantConstraint, deltaPct, newMbps, baseline) {
    if (status === "HEALTHY") {
      return `The compression change stays in a manageable range. Stream tuning is affecting storage demand, but not in a way that suggests unusual planning risk if the resulting image quality is still acceptable.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Motion-driven bitrate pressure") {
        return `Motion level is becoming the main reason compression impact matters. Under higher motion, the stream is less forgiving, so tuning choices begin to widen storage outcomes more than they would in static scenes.`;
      }

      if (dominantConstraint === "Quality bias pressure") {
        return `The selected quality posture is driving a noticeable storage outcome. The stream may still be valid, but the cost of better visual quality is now large enough to show up clearly in retained footage volume.`;
      }

      return `Keyframe behavior is starting to matter more. GOP choice is now contributing enough to the final bitrate that compression tuning should be treated as a real storage lever instead of a minor encoder detail.`;
    }

    if (dominantConstraint === "Motion-driven bitrate pressure") {
      return `Motion pressure is high enough that compression tuning becomes critical. Under harder scenes, the stream is likely to expand enough that storage outcomes can move materially away from the baseline assumption.`;
    }

    if (dominantConstraint === "Quality bias pressure") {
      return `Quality choice is now the primary reason storage demand is shifting. The resulting bitrate change is large enough that this is no longer a cosmetic image preference — it is a real capacity-planning decision.`;
    }

    return `Keyframe interval is exerting a strong effect on final bitrate. The stream is now sensitive enough to encoder structure that storage planning should not assume small GOP changes are harmless.`;
  }

  function buildGuidance(status, dominantConstraint, deltaPct) {
    if (status === "HEALTHY") {
      return `Use the adjusted bitrate as a reasonable planning value, but validate quality acceptance and encoder behavior before standardizing the profile across all cameras.`;
    }

    if (status === "WATCH") {
      if (dominantConstraint === "Motion-driven bitrate pressure") {
        return `Test the stream under real scene activity before locking the profile. Motion is now influential enough that lab-like assumptions may understate storage impact.`;
      }

      if (dominantConstraint === "Quality bias pressure") {
        return `Review whether the quality target is worth the extra retained storage. The current tuning choice is materially changing long-horizon storage burden.`;
      }

      return `Treat GOP as part of the storage design, not just an encoder setting. The current interval has enough influence that it should be chosen deliberately alongside retention and quality goals.`;
    }

    if (dominantConstraint === "Motion-driven bitrate pressure") {
      return `Tune for worst-case scene behavior before trusting the storage plan. The stream is currently too sensitive to motion for average-state assumptions alone to be safe.`;
    }

    if (dominantConstraint === "Quality bias pressure") {
      return `Reduce quality bias or increase downstream storage headroom. The current compression posture is pushing the stream far enough away from baseline to matter operationally.`;
    }

    return `Rework keyframe interval and overall stream policy before deployment. Encoder structure is now influential enough to materially change retained storage demand.`;
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

  function calculate() {
    const baselineRaw = safeNumber(els.baseline.value, NaN);
    const gopRaw = safeNumber(els.gop.value, NaN);
    const hoursRaw = safeNumber(els.hours.value, NaN);
    const daysRaw = safeNumber(els.days.value, NaN);
    const camsRaw = safeNumber(els.cams.value, NaN);

    const quality = els.quality.value;
    const motion = els.motion.value;

    if (
      !Number.isFinite(baselineRaw) || baselineRaw <= 0 ||
      !Number.isFinite(gopRaw) || gopRaw <= 0 ||
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
    const gop = clamp(gopRaw, 0.5, 10);
    const hours = clamp(hoursRaw, 0, 24);
    const days = clamp(daysRaw, 0, 3650);
    const cams = Math.max(1, Math.floor(clamp(camsRaw, 1, 100000)));

    const factor = qFactor(quality) * mFactor(motion) * gopFactor(gop);
    const newMbps = baseline * factor;

    const totalHours = hours * days;
    const oldGB = gbFromMbps(baseline, totalHours) * cams;
    const newGB = gbFromMbps(newMbps, totalHours) * cams;

    const deltaGB = newGB - oldGB;
    const deltaPct = oldGB > 0 ? (deltaGB / oldGB) * 100 : 0;

    const qualityPressure =
  quality === "high" ? 1.55 :
  quality === "med" ? 1.00 :
  0.78;

const motionPressure =
  motion === "high" ? 1.85 :
  motion === "med" ? 1.00 :
  0.75;

let gopPressure = 1.00;
if (gop <= 1) gopPressure = 1.55;
else if (gop <= 2) gopPressure = 1.15;
else if (gop <= 4) gopPressure = 0.95;
else gopPressure = 0.80;

const metrics = [
  {
    label: "Quality Bias Pressure",
    value: qualityPressure,
    displayValue: quality.toUpperCase()
  },
  {
    label: "Motion-driven Bitrate Pressure",
    value: motionPressure,
    displayValue: motion.toUpperCase()
  },
  {
    label: "Keyframe Interval Pressure",
    value: gopPressure,
    displayValue: `${gop.toFixed(1)}s`
  }
];

const resolved = resolveStatus(metrics);
    const status = resolved.status;

    const dominantConstraintMap = {
      "Quality Bias Pressure": "Quality bias pressure",
      "Motion-driven Bitrate Pressure": "Motion-driven bitrate pressure",
      "Keyframe Interval Pressure": "Keyframe interval pressure"
    };

    const dominantConstraint =
      dominantConstraintMap[resolved.dominantLabel] || "Quality bias pressure";

    const interpretation = buildInterpretation(
      status,
      dominantConstraint,
      deltaPct,
      newMbps,
      baseline
    );

    const guidance = buildGuidance(
      status,
      dominantConstraint,
      deltaPct
    );

    const summaryRows = [
      { label: "Baseline Bitrate", value: `${baseline.toFixed(2)} Mbps` },
      { label: "Adjusted Bitrate", value: `${newMbps.toFixed(2)} Mbps` },
      { label: "Compression Multiplier", value: `× ${factor.toFixed(2)}` },
      { label: "Hours × Days × Cams", value: `${hours.toFixed(1)}h × ${days.toFixed(0)}d × ${cams}` }
    ];

    const derivedRows = [
      { label: "Storage (Baseline)", value: `${oldGB.toFixed(1)} GB` },
      { label: "Storage (Adjusted)", value: `${newGB.toFixed(1)} GB` },
      { label: "Change", value: `${deltaGB.toFixed(1)} GB (${deltaPct.toFixed(1)}%)` },
      { label: "Planning Basis", value: "Quality + motion + GOP tuning model" }
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
          "Quality Bias",
          "Motion Pressure",
          "Keyframe Pressure"
        ],
        values: [
          qualityPressure,
          motionPressure,
          gopPressure
        ],
        displayValues: [
          quality.toUpperCase(),
          motion.toUpperCase(),
          `${gop.toFixed(1)}s`
        ],
        referenceValue: 1.0,
        healthyMax: 1.0,
        watchMax: 1.45,
        axisTitle: "Compression Pressure",
        referenceLabel: "Healthy Threshold",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          2.5,
          Math.ceil(Math.max(qualityPressure, motionPressure, gopPressure, 1.85) * 1.15 * 10) / 10
        )
      });
    }
  }

  function reset() {
    els.baseline.value = 4.0;
    els.quality.value = "med";
    els.motion.value = "med";
    els.gop.value = 2;
    els.hours.value = 24;
    els.days.value = 30;
    els.cams.value = 8;
    renderEmpty();
  }

  function bindInvalidation() {
    [els.baseline, els.quality, els.motion, els.gop, els.hours, els.days, els.cams].forEach((el) => {
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
