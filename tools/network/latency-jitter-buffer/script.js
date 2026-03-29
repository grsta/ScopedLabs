(() => {
  const DEFAULTS = {
    avgJitter: 20,
    variation: 10,
    margin: 20
  };

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    avgJitter: $("avgJitter"),
    variation: $("variation"),
    margin: $("margin"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy")
  };

  function fmtMs(v, d = 1) {
    return Number.isFinite(v) ? `${v.toFixed(d)} ms` : "—";
  }

  function fmtPct(v, d = 1) {
    return Number.isFinite(v) ? `${v.toFixed(d)}%` : "—";
  }

  function readNumber(el, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(el?.value, fallback);
  }

  function applyDefaults() {
    els.avgJitter.value = String(DEFAULTS.avgJitter);
    els.variation.value = String(DEFAULTS.variation);
    els.margin.value = String(DEFAULTS.margin);
  }

  function invalidate() {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  function getInputs() {
    const avgJitter = readNumber(els.avgJitter);
    const variation = readNumber(els.variation);
    const margin = readNumber(els.margin);

    if ([avgJitter, variation, margin].some((v) => !Number.isFinite(v))) {
      return { ok: false, message: "Enter valid numeric values." };
    }

    if (avgJitter < 0) return { ok: false, message: "Average jitter cannot be negative." };
    if (variation < 0) return { ok: false, message: "Jitter variation cannot be negative." };
    if (margin < 0) return { ok: false, message: "Safety margin cannot be negative." };

    return {
      ok: true,
      avgJitter,
      variation,
      margin
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const { avgJitter, variation, margin } = input;

    const jitterEnvelope = avgJitter + variation;
    const recommendedBuffer = jitterEnvelope * (1 + margin / 100);
    const addedLatency = recommendedBuffer;
    const marginContribution = recommendedBuffer - jitterEnvelope;
    const variationShare = recommendedBuffer > 0 ? (variation / recommendedBuffer) * 100 : 0;
    const marginShare = recommendedBuffer > 0 ? (marginContribution / recommendedBuffer) * 100 : 0;

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: recommendedBuffer,
      metrics: [
        {
          label: "Average Jitter",
          value: avgJitter,
          displayValue: fmtMs(avgJitter)
        },
        {
          label: "Variation Pressure",
          value: variation,
          displayValue: fmtMs(variation)
        },
        {
          label: "Recommended Buffer",
          value: recommendedBuffer,
          displayValue: fmtMs(recommendedBuffer)
        }
      ],
      healthyMax: 40,
      watchMax: 80
    });

    const dominantLabel = statusPack.dominant.label;

    let interpretation = `The recommended jitter buffer is ${fmtMs(recommendedBuffer)} based on ${fmtMs(avgJitter)} of average jitter, ${fmtMs(variation)} of variation, and a ${fmtPct(margin, 0)} safety margin. Because the jitter buffer directly adds playback or transport delay, the real design question is not just whether the stream survives jitter, but how much responsiveness is sacrificed to get that stability.`;

    if (statusPack.status === "RISK") {
      interpretation += " The buffer requirement is now large enough that the design is being driven more by instability protection than by low-latency behavior. In practice, this usually means the path may stop stuttering, but it starts feeling noticeably delayed.";
    } else if (statusPack.status === "WATCH") {
      interpretation += " The buffer size is still workable, but it is no longer lightweight. This is the range where the design often feels stable enough, yet responsiveness starts becoming a tradeoff rather than a free benefit.";
    } else {
      interpretation += " The recommended buffer remains in a controlled band, so the path can absorb moderate jitter without forcing a heavy added-latency penalty.";
    }

    let dominantConstraint = `${dominantLabel} is the dominant limiter. That means the final buffer recommendation is being shaped most by ${
      dominantLabel === "Recommended Buffer"
        ? "the total protection requirement"
        : dominantLabel === "Variation Pressure"
        ? "jitter volatility rather than average network behavior"
        : "the baseline jitter floor itself"
    }.`;

    if (variation > avgJitter) {
      dominantConstraint += " Variation exceeds the average jitter floor, which usually signals an unstable path where moment-to-moment spikes are harder to tame than the steady-state condition.";
    } else {
      dominantConstraint += " Average jitter remains the larger component, which usually points to a path that is consistently soft rather than wildly unstable.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = "Treat this as a path-quality problem first, not just a player-buffer problem. Reducing jitter and its variation upstream will usually produce a better user experience than simply accepting a very large buffer.";
    } else if (statusPack.status === "WATCH") {
      guidance = "The recommendation is serviceable, but review whether this workflow can tolerate the added delay. If not, focus on reducing jitter spikes before increasing the safety margin further.";
    } else {
      guidance = "This buffer recommendation is balanced. Keep the safety margin modest unless the path is known to be bursty, because unnecessary reserve turns directly into user-visible delay.";
    }

    return {
      ok: true,
      input,
      jitterEnvelope,
      recommendedBuffer,
      addedLatency,
      marginContribution,
      variationShare,
      marginShare,
      status: statusPack.status,
      interpretation,
      dominantConstraint,
      guidance
    };
  }

  function renderError(message) {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">${message}</div>`;
  }

  function renderSuccess(data) {
    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Average jitter", value: fmtMs(data.input.avgJitter) },
        { label: "Jitter variation", value: fmtMs(data.input.variation) },
        { label: "Safety margin", value: fmtPct(data.input.margin, 0) },
        { label: "Recommended jitter buffer", value: fmtMs(data.recommendedBuffer) }
      ],
      derivedRows: [
        { label: "Estimated added latency", value: fmtMs(data.addedLatency) },
        { label: "Pre-margin jitter envelope", value: fmtMs(data.jitterEnvelope) },
        { label: "Margin contribution", value: fmtMs(data.marginContribution) },
        { label: "Variation share of final buffer", value: fmtPct(data.variationShare) },
        { label: "Margin share of final buffer", value: fmtPct(data.marginShare) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Average Jitter",
          "Variation Pressure",
          "Recommended Buffer"
        ],
        values: [
          Number(data.input.avgJitter.toFixed(1)),
          Number(data.input.variation.toFixed(1)),
          Number(data.recommendedBuffer.toFixed(1))
        ],
        displayValues: [
          fmtMs(data.input.avgJitter),
          fmtMs(data.input.variation),
          fmtMs(data.recommendedBuffer)
        ],
        referenceValue: 40,
        healthyMax: 40,
        watchMax: 80,
        axisTitle: "Buffer Pressure (ms)",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(
            Math.max(
              data.input.avgJitter,
              data.input.variation,
              data.recommendedBuffer,
              80
            ) * 1.18
          )
        )
      }
    });
  }

  function calculate() {
    const data = calculateModel();
    if (!data.ok) {
      renderError(data.message);
      return;
    }
    renderSuccess(data);
  }

  function reset() {
    applyDefaults();
    invalidate();
  }

  function bindInvalidation() {
    [els.avgJitter, els.variation, els.margin].forEach((el) => {
      if (!el) return;
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
  const year = document.querySelector("[data-year]");
  if (year) year.textContent = new Date().getFullYear();
    bindInvalidation();

    els.calc?.addEventListener("click", calculate);
    els.reset?.addEventListener("click", reset);

    document.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;
      const target = e.target;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT")) {
        e.preventDefault();
        calculate();
      }
    });

    reset();
  });
})();



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
