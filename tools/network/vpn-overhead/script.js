(() => {
  const DEFAULTS = {
    baseline: 200,
    enc: "openvpn",
    mode: "udp",
    offload: "no"
  };

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    baseline: $("baseline"),
    enc: $("enc"),
    mode: $("mode"),
    offload: $("offload"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy")
  };

  function safeNum(el, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(el?.value, fallback);
  }

  function fmt(value, decimals = 1) {
    if (!Number.isFinite(value)) return "—";
    return value.toFixed(decimals);
  }

  function fmtMbps(value, decimals = 1) {
    return Number.isFinite(value) ? `${value.toFixed(decimals)} Mbps` : "—";
  }

  function fmtPct(value, decimals = 1) {
    return Number.isFinite(value) ? `${value.toFixed(decimals)}%` : "—";
  }

  function fmtBytes(value, decimals = 0) {
    return Number.isFinite(value) ? `${value.toFixed(decimals)} bytes` : "—";
  }

  function applyDefaults() {
    els.baseline.value = String(DEFAULTS.baseline);
    els.enc.value = DEFAULTS.enc;
    els.mode.value = DEFAULTS.mode;
    els.offload.value = DEFAULTS.offload;
  }

  function invalidate() {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  function getInputs() {
    const baseline = safeNum(els.baseline);
    const enc = String(els.enc?.value || "openvpn");
    const mode = String(els.mode?.value || "udp");
    const offload = String(els.offload?.value || "no");

    if (!Number.isFinite(baseline) || baseline <= 0) {
      return { ok: false, message: "Enter baseline throughput > 0." };
    }

    return {
      ok: true,
      baseline,
      enc,
      mode,
      offload
    };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const { baseline, enc, mode, offload } = input;

    let overheadPct = 15;
    if (enc === "wireguard") overheadPct = 8;
    if (enc === "ipsec") overheadPct = 12;

    if (mode === "tcp") overheadPct += 5;
    if (offload === "yes") overheadPct -= 3;

    overheadPct = Math.max(2, overheadPct);

    let mtuLoss = 60;
    if (enc === "wireguard") mtuLoss = 40;
    if (enc === "ipsec") mtuLoss = 56;
    if (mode === "tcp") mtuLoss += 12;
    if (offload === "yes") mtuLoss = Math.max(32, mtuLoss - 4);

    const delivered = baseline * (1 - overheadPct / 100);
    const lost = baseline - delivered;
    const deliveredPct = baseline > 0 ? (delivered / baseline) * 100 : 0;

    const mtuPressure = Math.min((mtuLoss / 120) * 100, 100);
    const overheadPressure = overheadPct * 3.2;
    const throughputLossPressure = (lost / baseline) * 100 * 3.4;

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(overheadPressure, throughputLossPressure, mtuPressure),
      metrics: [
        {
          label: "Encapsulation Overhead",
          value: overheadPressure,
          displayValue: fmtPct(overheadPct)
        },
        {
          label: "Throughput Loss",
          value: throughputLossPressure,
          displayValue: fmtMbps(lost)
        },
        {
          label: "MTU Reduction Pressure",
          value: mtuPressure,
          displayValue: fmtBytes(mtuLoss)
        }
      ],
      healthyMax: 35,
      watchMax: 70
    });

    const dominantLabel = statusPack.dominant.label;

    let interpretation = `Estimated delivered throughput is ${fmtMbps(delivered)} from a baseline of ${fmtMbps(baseline)} with roughly ${fmtPct(overheadPct)} tunnel overhead and an estimated MTU reduction of ${fmtBytes(mtuLoss)}.`;

    if (enc === "wireguard") {
      interpretation += " WireGuard stays comparatively lean, so the tunnel is being shaped more by path behavior and baseline link capacity than by heavy encapsulation overhead.";
    } else if (enc === "ipsec") {
      interpretation += " IPsec is moderate in overhead, but it still consumes enough header space and crypto processing budget to matter on tighter links or smaller-MTU paths.";
    } else {
      interpretation += " OpenVPN is one of the heavier options in practical deployments, so goodput loss and MTU pressure can become noticeable sooner than many people expect.";
    }

    if (mode === "tcp") {
      interpretation += " TCP tunnel mode adds extra penalty because the design becomes more sensitive to retransmit inefficiency and head-of-line behavior.";
    }

    if (statusPack.status === "RISK") {
      interpretation += " The dominant pressure is already in a risk band, so this tunnel choice is no longer just a small efficiency tax. It is large enough to materially affect throughput planning or trigger fragmentation-related pain if MTU tuning is ignored.";
    } else if (statusPack.status === "WATCH") {
      interpretation += " The tunnel remains workable, but the dominant overhead pressure is high enough that real-world performance can drift away from the raw line-rate expectation under load.";
    } else {
      interpretation += " The tunnel overhead remains in a controlled band, so the design still has reasonable efficiency under the entered assumptions.";
    }

    let dominantConstraint = "";
    if (dominantLabel === "Encapsulation Overhead") {
      dominantConstraint = "Encapsulation overhead is the dominant limiter. The main cost comes from the protocol stack itself, so efficiency loss is being driven more by tunnel choice than by MTU pressure alone.";
    } else if (dominantLabel === "Throughput Loss") {
      dominantConstraint = "Throughput loss is the dominant limiter. The practical problem is not just theoretical header overhead, but the amount of usable goodput the tunnel is taking away from the link.";
    } else {
      dominantConstraint = "MTU reduction pressure is the dominant limiter. The most likely real-world pain point is fragmentation, MSS mismatch, or hidden path-MTU trouble rather than headline throughput alone.";
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = "Validate MTU and MSS behavior immediately, and do not assume the raw link speed will survive the tunnel intact. If this is performance-sensitive traffic, compare a leaner tunnel profile or enable offload where supported.";
    } else if (statusPack.status === "WATCH") {
      guidance = "The tunnel is serviceable, but check whether the application mix can tolerate the goodput loss and MTU penalty. Interactive and high-throughput workloads usually expose VPN inefficiency faster than casual traffic.";
    } else {
      guidance = "This tunnel profile is balanced. Keep an eye on MTU only if the path crosses mixed providers, overlays, or devices with inconsistent MSS handling.";
    }

    return {
      ok: true,
      input,
      overheadPct,
      delivered,
      lost,
      deliveredPct,
      mtuLoss,
      overheadPressure,
      throughputLossPressure,
      mtuPressure,
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
    const { input } = data;

    ScopedLabsAnalyzer.renderOutput({
      resultsEl: els.results,
      analysisEl: els.analysis,
      existingChartRef: chartRef,
      existingWrapRef: chartWrapRef,
      summaryRows: [
        { label: "Baseline Throughput", value: fmtMbps(input.baseline) },
        { label: "Estimated Overhead", value: fmtPct(data.overheadPct) },
        { label: "Delivered Throughput", value: fmtMbps(data.delivered) },
        { label: "Estimated MTU Reduction", value: fmtBytes(data.mtuLoss) }
      ],
      derivedRows: [
        { label: "Throughput Lost", value: fmtMbps(data.lost) },
        { label: "Delivered Share of Baseline", value: fmtPct(data.deliveredPct) },
        { label: "Encryption Type", value: input.enc.toUpperCase() },
        { label: "Tunnel Mode", value: input.mode.toUpperCase() },
        { label: "Hardware Offload", value: input.offload.toUpperCase() }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Encapsulation Overhead",
          "Throughput Loss",
          "MTU Reduction Pressure"
        ],
        values: [
          Number(data.overheadPressure.toFixed(1)),
          Number(data.throughputLossPressure.toFixed(1)),
          Number(data.mtuPressure.toFixed(1))
        ],
        displayValues: [
          fmtPct(data.overheadPct),
          fmtMbps(data.lost),
          fmtBytes(data.mtuLoss)
        ],
        referenceValue: 35,
        healthyMax: 35,
        watchMax: 70,
        axisTitle: "VPN Overhead Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(
            Math.max(
              data.overheadPressure,
              data.throughputLossPressure,
              data.mtuPressure,
              70
            ) * 1.12
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
    [els.baseline, els.enc, els.mode, els.offload].forEach((el) => {
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


function runLegacyProGate() {
  if (typeof unlockCategoryPage === "function") {
    unlockCategoryPage();
  }
}

window.addEventListener("DOMContentLoaded", runLegacyProGate);
window.addEventListener("load", runLegacyProGate);
window.addEventListener("pageshow", runLegacyProGate);
setTimeout(runLegacyProGate, 300);
setTimeout(runLegacyProGate, 900);
