(() => {
  const $ = (id) => document.getElementById(id);

  const els = {
    devices: $("devices"),
    bitrate: $("bitrate"),
    peakFactor: $("peakFactor"),
    overheadPct: $("overheadPct"),
    otherTraffic: $("otherTraffic"),
    uplinkMbps: $("uplinkMbps"),
    safeUtil: $("safeUtil"),

    calc: $("calc"),
    reset: $("reset"),

    resultsCard: $("resultsCard"),
    errorCard: $("errorCard"),
    errorMsg: $("errorMsg"),

    avgLoad: $("avgLoad"),
    peakLoad: $("peakLoad"),
    avgTotal: $("avgTotal"),
    peakTotal: $("peakTotal"),
    utilAvg: $("utilAvg"),
    utilPeak: $("utilPeak"),
    recUplink: $("recUplink"),
  };

  const defaults = {
    devices: 16,
    bitrate: 4,
    peakFactor: 1.5,
    overheadPct: 12,
    otherTraffic: 25,
    uplinkMbps: 1000,
    safeUtil: 70,
  };

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : NaN;
  }

  function fmtMbps(x) {
    if (!Number.isFinite(x)) return "—";
    return `${x.toFixed(2)} Mbps`;
  }

  function fmtPct(x) {
    if (!Number.isFinite(x)) return "—";
    return `${x.toFixed(1)}%`;
  }

  function showError(msg) {
    els.errorMsg.textContent = msg;
    els.errorCard.style.display = "";
    els.resultsCard.style.display = "none";
  }

  function showResults() {
    els.errorCard.style.display = "none";
    els.resultsCard.style.display = "";
  }

  function calculate() {
    const devices = num(els.devices.value);
    const bitrate = num(els.bitrate.value);
    const peakFactor = num(els.peakFactor.value);
    const overheadPct = num(els.overheadPct.value);
    const otherTraffic = num(els.otherTraffic.value);
    const uplinkMbps = num(els.uplinkMbps.value);
    const safeUtil = num(els.safeUtil.value);

    // validation
    if (!(devices > 0)) return showError("Enter a valid stream count (devices). Example: 16");
    if (!(bitrate >= 0)) return showError("Enter a valid bitrate per stream (Mbps). Example: 4");
    if (!(peakFactor >= 1)) return showError("Peak factor must be ≥ 1. Example: 1.5");
    if (!(overheadPct >= 0)) return showError("Overhead must be ≥ 0%. Example: 12");
    if (!(otherTraffic >= 0)) return showError("Other traffic must be ≥ 0 Mbps. Example: 25");
    if (!(uplinkMbps > 0)) return showError("Uplink capacity must be > 0 Mbps. Example: 1000");
    if (!(safeUtil > 0 && safeUtil < 100)) return showError("Target utilization must be 1–99%. Example: 70");

    const overheadMult = 1 + (overheadPct / 100);

    const avgStream = devices * bitrate;
    const peakStream = avgStream * peakFactor;

    const avgWithOverhead = avgStream * overheadMult;
    const peakWithOverhead = peakStream * overheadMult;

    const avgTotal = avgWithOverhead + otherTraffic;
    const peakTotal = peakWithOverhead + otherTraffic;

    const utilAvg = (avgTotal / uplinkMbps) * 100;
    const utilPeak = (peakTotal / uplinkMbps) * 100;

    const recUplink = peakTotal / (safeUtil / 100);

    els.avgLoad.textContent = fmtMbps(avgStream);
    els.peakLoad.textContent = fmtMbps(peakStream);
    els.avgTotal.textContent = fmtMbps(avgTotal);
    els.peakTotal.textContent = fmtMbps(peakTotal);
    els.utilAvg.textContent = fmtPct(utilAvg);
    els.utilPeak.textContent = fmtPct(utilPeak);
    els.recUplink.textContent = fmtMbps(recUplink);

    showResults();
  }

  function reset() {
    els.devices.value = defaults.devices;
    els.bitrate.value = defaults.bitrate;
    els.peakFactor.value = defaults.peakFactor;
    els.overheadPct.value = defaults.overheadPct;
    els.otherTraffic.value = defaults.otherTraffic;
    els.uplinkMbps.value = defaults.uplinkMbps;
    els.safeUtil.value = defaults.safeUtil;

    els.resultsCard.style.display = "none";
    els.errorCard.style.display = "none";
  }

  window.addEventListener("DOMContentLoaded", () => {
    els.calc.addEventListener("click", calculate);
    els.reset.addEventListener("click", reset);
  });
})();

