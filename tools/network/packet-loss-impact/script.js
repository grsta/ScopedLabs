(() => {
  const DEFAULTS = {
    baseline: 100,
    lossPct: 1,
    rtt: 30,
    traffic: "video",
    proto: "tcp"
  };

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    baseline: $("baseline"),
    lossPct: $("lossPct"),
    rtt: $("rtt"),
    traffic: $("traffic"),
    proto: $("proto"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy")
  };

  function fmt(value, decimals = 2) {
    if (!Number.isFinite(value)) return "—";
    const cleaned = Math.abs(value) < 1e-9 ? 0 : value;
    return cleaned.toFixed(decimals);
  }

  function fmtMbps(value, decimals = 2) {
    return Number.isFinite(value) ? `${value.toFixed(decimals)} Mbps` : "—";
  }

  function fmtPct(value, decimals = 2) {
    return Number.isFinite(value) ? `${value.toFixed(decimals)}%` : "—";
  }

  function safeNum(el, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(el?.value, fallback);
  }

  function applyDefaults() {
    els.baseline.value = String(DEFAULTS.baseline);
    els.lossPct.value = String(DEFAULTS.lossPct);
    els.rtt.value = String(DEFAULTS.rtt);
    els.traffic.value = DEFAULTS.traffic;
    els.proto.value = DEFAULTS.proto;
  }

  function invalidate() {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  function getInputs() {
    const baseline = safeNum(els.baseline);
    const lossPct = ScopedLabsAnalyzer.clamp(safeNum(els.lossPct), 0, 100);
    const rtt = Math.max(0, safeNum(els.rtt));
    const traffic = String(els.traffic?.value || "video");
    const proto = String(els.proto?.value || "tcp");

    if ([baseline, lossPct, rtt].some((v) => !Number.isFinite(v))) {
      return { ok: false, message: "Enter valid numeric values." };
    }

    if (baseline <= 0) {
      return { ok: false, message: "Baseline Throughput must be greater than 0 Mbps." };
    }

    return {
      ok: true,
      baseline,
      lossPct,
      rtt,
      traffic,
      proto
    };
  }

  function trafficSensitivity(traffic) {
    if (traffic === "voice") return 1.35;
    if (traffic === "video") return 1.1;
    return 0.85;
  }

  function protocolSensitivity(proto) {
    return proto === "udp" ? 1.15 : 1.0;
  }

  function experienceLabel(status, proto) {
    if (proto === "udp") {
      if (status === "RISK") return "Poor / visible or audible impairment likely";
      if (status === "WATCH") return "Degraded / artifacts or instability possible";
      return "Controlled / generally acceptable";
    }

    if (status === "RISK") return "Poor / retransmit drag likely user-visible";
    if (status === "WATCH") return "Degraded / reduced responsiveness likely";
    return "Controlled / loss impact manageable";
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const { baseline, lossPct, rtt, traffic, proto } = input;
    const loss = lossPct / 100;

    const K = 6.0;
    let delivered;
    if (proto === "udp") {
      delivered = baseline * (1 - loss);
    } else {
      const penalty = 1 / (1 + loss * (rtt / 1000) * K);
      delivered = baseline * (1 - loss) * penalty;
    }

    delivered = Math.max(0, delivered);

    const lostMbps = Math.max(0, baseline - delivered);
    const deliveredPct = baseline > 0 ? (delivered / baseline) * 100 : 0;
    const throughputLossPct = baseline > 0 ? (lostMbps / baseline) * 100 : 0;

    const sensitivity = trafficSensitivity(traffic) * protocolSensitivity(proto);

    const lossPressure = lossPct * sensitivity * 10;
    const retransmitPressure =
      proto === "tcp"
        ? lossPct * Math.max(1, rtt / 20) * trafficSensitivity(traffic) * 3.5
        : lossPct * trafficSensitivity(traffic) * 6;
    const throughputPressure = throughputLossPct * 2.5;

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: Math.max(lossPressure, retransmitPressure, throughputPressure),
      metrics: [
        {
          label: "Loss Pressure",
          value: lossPressure,
          displayValue: fmtPct(lossPct)
        },
        {
          label: "RTT Retransmit Pressure",
          value: retransmitPressure,
          displayValue: proto === "tcp" ? `${fmt(rtt, 0)} ms RTT` : "Real-time sensitivity"
        },
        {
          label: "Throughput Loss",
          value: throughputPressure,
          displayValue: fmtPct(throughputLossPct)
        }
      ],
      healthyMax: 35,
      watchMax: 70
    });

    const experienceRisk = experienceLabel(statusPack.status, proto);
    const dominantLabel = statusPack.dominant.label;

    let interpretation = `With ${fmtPct(lossPct)} packet loss on a ${fmt(rtt, 0)} ms RTT path, estimated delivered throughput falls to ${fmtMbps(delivered)} from a ${fmtMbps(baseline)} baseline.`;

    if (proto === "udp") {
      interpretation += ` For ${traffic} traffic over UDP, loss is exposed directly to the application, so damage usually appears as missing audio, visible artifacts, or stream instability rather than hidden recovery.`;
    } else {
      interpretation += ` For ${traffic} traffic over TCP, the transport can hide some loss through retransmissions, but the tradeoff is lower goodput and added delay pressure as RTT stretches recovery time.`;
    }

    if (statusPack.status === "RISK") {
      interpretation += ` The dominant pressure is already in a risk band, so this is no longer a minor impairment. The link is now behaving in a way users are likely to describe as bad quality, buffering, or sluggish response rather than merely imperfect conditions.`;
    } else if (statusPack.status === "WATCH") {
      interpretation += ` The path is still usable, but the dominant loss-related pressure is large enough that peak periods or additional congestion can push the experience from acceptable into clearly degraded.`;
    } else {
      interpretation += ` The path remains inside a controlled band, so packet loss exists but is not yet dominating the user experience under the entered assumptions.`;
    }

    let dominantConstraint = "";
    if (dominantLabel === "Loss Pressure") {
      dominantConstraint = `Loss percentage itself is the dominant limiter. The path quality is poor enough that fixing raw loss rate will matter more than chasing throughput estimates alone.`;
    } else if (dominantLabel === "RTT Retransmit Pressure") {
      dominantConstraint = `RTT retransmit pressure is the dominant limiter. The combination of loss and round-trip delay is making recovery expensive, so performance degrades faster than the raw loss percentage alone suggests.`;
    } else {
      dominantConstraint = `Throughput loss is the dominant limiter. The path is shedding enough effective bandwidth that applications feel constrained even before you account for secondary user-experience effects.`;
    }

    let guidance = "";
    if (statusPack.status === "RISK") {
      guidance = `Treat this as a path-quality problem first. Check physical errors, Wi-Fi RF quality, congestion, and queueing behavior before assuming the application is at fault. ${
        traffic === "voice"
          ? "Voice paths should usually stay around or below 0.3% loss."
          : traffic === "video"
          ? "Video paths usually behave best around or below 0.5% loss."
          : "Even general data traffic can become painful when loss and RTT reinforce each other."
      }`;
    } else if (statusPack.status === "WATCH") {
      guidance = `The path is workable but soft. Validate whether the loss is bursty or sustained, because intermittent loss spikes often hurt real traffic more than the average value alone implies.`;
    } else {
      guidance = `This loss level is manageable under the current assumptions. Keep monitoring during busy periods, because packet loss often becomes meaningful only when it stacks with congestion or RF instability.`;
    }

    return {
      ok: true,
      input,
      delivered,
      lostMbps,
      deliveredPct,
      throughputLossPct,
      lossPressure,
      retransmitPressure,
      throughputPressure,
      experienceRisk,
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
        { label: "Packet Loss", value: fmtPct(input.lossPct) },
        { label: "RTT", value: `${fmt(input.rtt, 0)} ms` },
        { label: "Estimated Delivered Throughput", value: fmtMbps(data.delivered) }
      ],
      derivedRows: [
        { label: "Estimated Lost Throughput", value: fmtMbps(data.lostMbps) },
        { label: "Delivered Share of Baseline", value: fmtPct(data.deliveredPct) },
        { label: "Throughput Loss", value: fmtPct(data.throughputLossPct) },
        { label: "Traffic Type", value: input.traffic.toUpperCase() },
        { label: "Protocol", value: input.proto.toUpperCase() },
        { label: "Experience Risk", value: data.experienceRisk }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Loss Pressure",
          "RTT Retransmit Pressure",
          "Throughput Loss"
        ],
        values: [
          Number(data.lossPressure.toFixed(1)),
          Number(data.retransmitPressure.toFixed(1)),
          Number(data.throughputPressure.toFixed(1))
        ],
        displayValues: [
          fmtPct(input.lossPct),
          input.proto === "tcp" ? `${fmt(input.rtt, 0)} ms RTT` : "Real-time sensitivity",
          fmtPct(data.throughputLossPct)
        ],
        referenceValue: 35,
        healthyMax: 35,
        watchMax: 70,
        axisTitle: "Loss Impact Pressure",
        referenceLabel: "Comfort Band",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          100,
          Math.ceil(
            Math.max(
              data.lossPressure,
              data.retransmitPressure,
              data.throughputPressure,
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
    [els.baseline, els.lossPct, els.rtt, els.traffic, els.proto].forEach((el) => {
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
