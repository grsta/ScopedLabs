(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "concurrency-scaling";
  const NEXT_URL = "/tools/performance/cpu-utilization-impact/";

  const $ = id => document.getElementById(id);

  const els = {
    base: $("base"),
    w0: $("w0"),
    w1: $("w1"),
    p: $("p"),
    oh: $("oh"),
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

  function speedup(workers, parallelFraction){
    return 1 / ((1 - parallelFraction) + (parallelFraction / workers));
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

    if(!saved || saved.category !== CATEGORY || saved.step !== "queue-depth") return;

    const d = saved.data || {};

    const queueDepth = Number(d.queueDepth);
    const utilization = Number(d.utilization);
    const responseTime = Number(d.responseTime);
    const workers = Number(d.workers);
    const capacity = Number(d.capacity);

    // Carry over real values into inputs
    if (Number.isFinite(capacity) && capacity > 0) {
      els.base.value = Math.round(capacity);
    }

    if (Number.isFinite(workers) && workers > 0) {
      els.w0.value = Math.round(workers);
      const nextWorkers = Math.max(Math.round(workers) + 2, Math.round(workers * 2));
      els.w1.value = nextWorkers;
    }

    // Use utilization band to suggest an overhead default
    if (Number.isFinite(utilization)) {
      let suggestedOverhead = 8;
      if (utilization >= 0.90) suggestedOverhead = 15;
      else if (utilization >= 0.75) suggestedOverhead = 10;
      else if (utilization <= 0.50) suggestedOverhead = 5;
      els.oh.value = suggestedOverhead;
    }

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Queue Depth: <strong>${Number.isFinite(queueDepth) ? queueDepth.toFixed(2) : "—"}</strong>,
      Utilization: <strong>${Number.isFinite(utilization) ? (utilization * 100).toFixed(1) : "—"}%</strong>,
      Response Time: <strong>${Number.isFinite(responseTime) ? responseTime.toFixed(2) : "—"} ms</strong>,
      Capacity: <strong>${Number.isFinite(capacity) ? capacity.toFixed(0) : "—"} req/s</strong>,
      Workers: <strong>${Number.isFinite(workers) ? workers.toFixed(0) : "—"}</strong>.
      These values were used to seed the concurrency model.
    `;
    els.flowNote.style.display = "";
  }

  function calc(){
    const base = parseFloat(els.base.value);
    const w0 = Math.max(1, parseFloat(els.w0.value));
    const w1 = Math.max(1, parseFloat(els.w1.value));
    const p = Math.max(0, Math.min(1, parseFloat(els.p.value) / 100));
    const oh = Math.max(0, Math.min(0.95, parseFloat(els.oh.value) / 100));

    if(!Number.isFinite(base) || !Number.isFinite(w0) || !Number.isFinite(w1) || !Number.isFinite(p) || !Number.isFinite(oh)){
      els.results.innerHTML = row("Status", "Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const s0 = speedup(w0, p);
    const s1 = speedup(w1, p);

    const rel = s1 / s0;
    const rawTarget = base * rel;
    const target = rawTarget * (1 - oh);
    const efficiency = (rel / (w1 / w0)) * 100;

    const interpretation =
      rel < 1.2
        ? "Limited scaling benefit. The workload is likely constrained by serial work, locks, or a shared bottleneck."
        : rel < 2
          ? "Moderate scaling. Additional workers help, but diminishing returns are already visible."
          : "Strong scaling improvement. The workload is benefiting meaningfully from parallelism.";

    els.results.innerHTML = [
      row("Baseline Throughput", `${base.toFixed(0)} req/s`),
      row("Current Workers", `${w0.toFixed(0)}`),
      row("Target Workers", `${w1.toFixed(0)}`),
      row("Scaling Gain", `${(rel * 100).toFixed(1)}%`),
      row("Raw Target", `${rawTarget.toFixed(0)} req/s`),
      row("After Overhead", `${target.toFixed(0)} req/s`),
      row("Scaling Efficiency", `${efficiency.toFixed(1)}%`),
      row("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        baselineThroughput: base,
        currentWorkers: w0,
        targetWorkers: w1,
        parallelFraction: p,
        overheadPct: oh * 100,
        throughput: target,
        scalingGain: rel,
        scalingEfficiencyPct: efficiency
      }
    }));

    showContinue();
  }

  function reset(){
    els.base.value = 1200;
    els.w0.value = 4;
    els.w1.value = 12;
    els.p.value = 85;
    els.oh.value = 8;
    els.results.innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bind(){
    [els.base, els.w0, els.w1, els.p, els.oh].forEach(el => {
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
