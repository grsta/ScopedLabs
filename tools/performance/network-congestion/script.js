(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "network-congestion";
  const NEXT_URL = "/tools/performance/cache-hit-ratio/";

  const $ = id => document.getElementById(id);

  const els = {
    cur: $("cur"),
    peak: $("peak"),
    cap: $("cap"),
    util: $("util"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  function row(label, value){
    return `<div class="result-row">
      <span class="result-label">${label}</span>
      <span class="result-value">${value}</span>
    </div>`;
  }

  function hideContinue(){
    els.continueWrap.style.display = "none";
    els.continueBtn.disabled = true;
  }

  function showContinue(){
    els.continueWrap.style.display = "";
    els.continueBtn.disabled = false;
  }

  function clearStored(){
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function invalidate(){
    clearStored();
    hideContinue();
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  function loadPrior(){
    let saved = null;
    try{
      saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "null");
    }catch{
      saved = null;
    }

    els.flowNote.style.display = "none";
    els.flowNote.innerHTML = "";

    if(!saved || saved.category !== CATEGORY || saved.step !== "disk-saturation") return;

    const d = saved.data || {};

    const throughput = Number(d.throughput);
    const utilization = Number(d.utilization);
    const targetUtilization = Number(d.targetUtilization);
    const capacityMBps = Number(d.capacityMBps);
    const saturated = Boolean(d.saturated);

    if (Number.isFinite(throughput) && throughput > 0) {
      els.cur.value = Math.round(throughput);
      els.peak.value = Math.round(throughput * (saturated ? 1.35 : 1.20));
    }

    if (Number.isFinite(capacityMBps) && capacityMBps > 0) {
      els.cap.value = Math.round(capacityMBps);
    }

    if (Number.isFinite(targetUtilization) && targetUtilization > 0) {
      els.util.value = Math.round(targetUtilization * 100);
    } else if (Number.isFinite(utilization) && utilization > 0) {
      els.util.value = Math.round(utilization * 100);
    }

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Disk Throughput: <strong>${Number.isFinite(throughput) ? throughput.toFixed(1) : "—"} MB/s</strong>,
      Disk Utilization: <strong>${Number.isFinite(utilization) ? (utilization * 100).toFixed(1) : "—"}%</strong>,
      Disk Capacity: <strong>${Number.isFinite(capacityMBps) ? capacityMBps.toFixed(0) : "—"} MB/s</strong>,
      Saturation Risk: <strong>${saturated ? "Yes" : "No"}</strong>.
      These values were used to seed the current traffic, peak traffic, and link target assumptions.
    `;
    els.flowNote.style.display = "";
  }

  function calc(){
    const cur = parseFloat(els.cur.value);
    const peak = parseFloat(els.peak.value);
    const cap = parseFloat(els.cap.value);
    const util = parseFloat(els.util.value) / 100;

    if(!Number.isFinite(cur) || !Number.isFinite(peak) || !Number.isFinite(cap) || !Number.isFinite(util) || cap <= 0){
      els.results.innerHTML = row("Status", "Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const curPct = (cur / cap) * 100;
    const peakPct = (peak / cap) * 100;
    const maxAtTarget = cap * util;

    const risk = peak > maxAtTarget ? "HIGH" :
                 cur > maxAtTarget ? "MEDIUM" : "LOW";

    const interpretation =
      peakPct < 60
        ? "Network has substantial headroom and congestion risk is low."
        : peakPct < 80
          ? "Network is carrying moderate load. Bursts may start affecting latency."
          : peakPct < 95
            ? "Network is nearing congestion. Throughput spikes may increase delay and drops."
            : "Network is effectively saturated. Congestion is likely to impact application performance.";

    els.results.innerHTML = [
      row("Current Utilization", `${curPct.toFixed(1)}%`),
      row("Peak Utilization", `${peakPct.toFixed(1)}%`),
      row("Target Throughput @ Util", `${maxAtTarget.toFixed(0)} Mbps`),
      row("Congestion Risk", risk),
      row("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        currentTrafficMbps: cur,
        peakTrafficMbps: peak,
        linkCapacityMbps: cap,
        utilization: peakPct / 100,
        targetUtilization: util,
        congestionRisk: risk
      }
    }));

    showContinue();
  }

  function reset(){
    els.cur.value = 600;
    els.peak.value = 900;
    els.cap.value = 1000;
    els.util.value = 75;
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bind(){
    [els.cur, els.peak, els.cap, els.util].forEach(el => {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init(){
    hideContinue();
    loadPrior();
    bind();

    els.calc.onclick = calc;
    els.reset.onclick = reset;
    els.continueBtn.onclick = () => window.location.href = NEXT_URL;
  }

  init();
})();
