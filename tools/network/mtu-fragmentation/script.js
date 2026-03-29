(() => {
  const DEFAULTS = {
    mtu: 1500,
    ipver: "4",
    l4: "tcp",
    extra: 0,
    payload: 1400
  };

  const chartRef = { current: null };
  const chartWrapRef = { current: null };

  const $ = (id) => document.getElementById(id);

  const els = {
    mtu: $("mtu"),
    ipver: $("ipver"),
    l4: $("l4"),
    extra: $("extra"),
    payload: $("payload"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    analysis: $("analysis-copy")
  };

  function fmtBytes(v, d = 0) {
    return Number.isFinite(v) ? `${v.toFixed(d)} bytes` : "—";
  }

  function fmtPct(v, d = 1) {
    return Number.isFinite(v) ? `${v.toFixed(d)}%` : "—";
  }

  function readNumber(el, fallback = NaN) {
    return ScopedLabsAnalyzer.safeNumber(el?.value, fallback);
  }

  function applyDefaults() {
    els.mtu.value = String(DEFAULTS.mtu);
    els.ipver.value = DEFAULTS.ipver;
    els.l4.value = DEFAULTS.l4;
    els.extra.value = String(DEFAULTS.extra);
    els.payload.value = String(DEFAULTS.payload);
  }

  function invalidate() {
    ScopedLabsAnalyzer.clearChart(chartRef, chartWrapRef);
    ScopedLabsAnalyzer.clearAnalysisBlock(els.analysis);
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  function getInputs() {
    const mtu = readNumber(els.mtu);
    const extra = readNumber(els.extra);
    const payload = readNumber(els.payload);
    const ipver = String(els.ipver?.value || "4");
    const l4 = String(els.l4?.value || "tcp");

    if ([mtu, extra, payload].some((v) => !Number.isFinite(v))) {
      return { ok: false, message: "Enter valid numeric values." };
    }

    if (mtu < 576) return { ok: false, message: "MTU must be at least 576 bytes." };
    if (extra < 0) return { ok: false, message: "Extra overhead cannot be negative." };
    if (payload < 0) return { ok: false, message: "Test payload cannot be negative." };

    return { ok: true, mtu, extra, payload, ipver, l4 };
  }

  function calculateModel() {
    const input = getInputs();
    if (!input.ok) return input;

    const { mtu, extra, payload, ipver, l4 } = input;

    const ipHdr = ipver === "6" ? 40 : 20;
    const l4Hdr = l4 === "udp" ? 8 : 20;
    const totalHdr = ipHdr + l4Hdr + extra;

    const maxPayload = Math.max(0, mtu - totalHdr);
    const willFragment = payload > maxPayload;
    const overflowBytes = Math.max(0, payload - maxPayload);
    const overheadPct = mtu > 0 ? (totalHdr / mtu) * 100 : 0;
    const payloadFitPct = maxPayload > 0 ? (payload / maxPayload) * 100 : 0;
    const usablePayloadPct = mtu > 0 ? (maxPayload / mtu) * 100 : 0;

    const statusPack = ScopedLabsAnalyzer.resolveStatus({
      compositeScore: payloadFitPct,
      metrics: [
        {
          label: "Header Pressure",
          value: overheadPct,
          displayValue: fmtPct(overheadPct)
        },
        {
          label: "Payload Fit",
          value: payloadFitPct,
          displayValue: fmtPct(payloadFitPct)
        },
        {
          label: "Overflow Beyond Ceiling",
          value: overflowBytes,
          displayValue: fmtBytes(overflowBytes)
        }
      ],
      healthyMax: 100,
      watchMax: 110
    });

    let interpretation = `With an MTU of ${fmtBytes(mtu)}, the effective no-fragment payload ceiling is ${fmtBytes(maxPayload)} after ${fmtBytes(totalHdr)} of total protocol and encapsulation overhead.`;

    if (willFragment) {
      interpretation += ` The test payload of ${fmtBytes(payload)} exceeds that ceiling, so fragmentation pressure is real. In practice, this usually means either fragmentation, packet drops on DF-constrained paths, or inconsistent performance across overlays and VPNs where hidden overhead already consumes part of the frame.`;
    } else if (payloadFitPct >= 90) {
      interpretation += ` The payload still fits, but margin is thin. That means the path is technically workable while remaining vulnerable to extra encapsulation, option headers, or path-MTU mismatches that were not explicitly modeled here.`;
    } else {
      interpretation += ` The payload fits with usable headroom, so the design is less likely to run into surprise fragmentation as long as additional overhead layers are limited and path MTU remains consistent.`;
    }

    let dominantConstraint = "";
    if (overflowBytes > 0) {
      dominantConstraint = `Overflow beyond the payload ceiling is the dominant limiter. The requested packet is simply larger than the path can comfortably carry without fragmentation once all headers are counted.`;
    } else if (overheadPct >= 15) {
      dominantConstraint = `Header and encapsulation pressure are the dominant limiter. Even if the test packet still fits, overhead is consuming a meaningful share of the MTU and reducing flexibility for future encapsulation or option growth.`;
    } else {
      dominantConstraint = `Payload fit is currently controlled. The path still has usable room between the requested packet and the calculated payload ceiling, so fragmentation risk is being managed rather than merely avoided by luck.`;
    }

    let guidance = "";
    if (willFragment) {
      guidance = `Reduce payload size, lower MSS, or raise effective path MTU before assuming the transport is healthy. If this traffic crosses overlays, VPNs, or tunnels, validate real path MTU rather than trusting interface MTU alone.`;
    } else if (payloadFitPct >= 90) {
      guidance = `The packet fits, but the path is tight. Leave more headroom if this traffic will cross encapsulated or mixed networks, because small hidden overhead increases can erase the remaining margin quickly.`;
    } else {
      guidance = `This payload sizing is in a comfortable band. Keep an eye on extra overhead when introducing tunnels, VPNs, or additional encapsulation layers, because that is the fastest way to turn a clean path into a fragmentation problem.`;
    }

    return {
      ok: true,
      input,
      ipHdr,
      l4Hdr,
      totalHdr,
      maxPayload,
      willFragment,
      overflowBytes,
      overheadPct,
      payloadFitPct,
      usablePayloadPct,
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
        { label: "MTU", value: fmtBytes(data.input.mtu) },
        { label: "IP header", value: fmtBytes(data.ipHdr) },
        { label: "Transport header", value: `${fmtBytes(data.l4Hdr)} (${data.input.l4.toUpperCase()})` },
        { label: "Total overhead", value: fmtBytes(data.totalHdr) }
      ],
      derivedRows: [
        { label: "Max payload without fragmentation", value: fmtBytes(data.maxPayload) },
        { label: "Test payload", value: fmtBytes(data.input.payload) },
        { label: "Fragmentation risk", value: data.willFragment ? "YES" : "NO" },
        { label: "Overflow beyond ceiling", value: fmtBytes(data.overflowBytes) },
        { label: "Header pressure vs MTU", value: fmtPct(data.overheadPct) },
        { label: "Usable payload share of MTU", value: fmtPct(data.usablePayloadPct) }
      ],
      status: data.status,
      interpretation: data.interpretation,
      dominantConstraint: data.dominantConstraint,
      guidance: data.guidance,
      chart: {
        labels: [
          "Total Overhead",
          "No-Fragment Ceiling",
          "Test Payload",
          "Overflow Beyond Ceiling"
        ],
        values: [
          Number(data.totalHdr.toFixed(1)),
          Number(data.maxPayload.toFixed(1)),
          Number(data.input.payload.toFixed(1)),
          Number(data.overflowBytes.toFixed(1))
        ],
        displayValues: [
          fmtBytes(data.totalHdr),
          fmtBytes(data.maxPayload),
          fmtBytes(data.input.payload),
          fmtBytes(data.overflowBytes)
        ],
        referenceValue: data.maxPayload,
        healthyMax: data.maxPayload,
        watchMax: data.maxPayload * 1.1,
        axisTitle: "Payload Pressure (bytes)",
        referenceLabel: "No-Fragment Payload Ceiling",
        healthyLabel: "Healthy",
        watchLabel: "Watch",
        riskLabel: "Risk",
        chartMax: Math.max(
          1600,
          Math.ceil(
            Math.max(
              data.totalHdr,
              data.maxPayload,
              data.input.payload,
              data.maxPayload * 1.1
            ) * 1.08
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
    [els.mtu, els.ipver, els.l4, els.extra, els.payload].forEach((el) => {
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
