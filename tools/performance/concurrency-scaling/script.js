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
    els.continueWrap.style.display="none";
    els.continueBtn.disabled=true;
  }

  function showContinue(){
    els.continueWrap.style.display="";
    els.continueBtn.disabled=false;
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
    let saved=null;
    try{
      saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||"null");
    }catch{}

    if(!saved || saved.category!==CATEGORY || saved.step!=="queue-depth") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Queue Depth: <strong>${d.queueDepth?.toFixed?.(2) ?? "—"}</strong>,
      Utilization: <strong>${(d.utilization*100).toFixed(1)}%</strong>.
      This step evaluates scaling behavior.
    `;
    els.flowNote.style.display="";
  }

  function speedup(workers, p){
    return 1 / ((1 - p) + (p / workers));
  }

  function calc(){
    const base=parseFloat(els.base.value);
    const w0=parseFloat(els.w0.value);
    const w1=parseFloat(els.w1.value);
    const p=parseFloat(els.p.value)/100;
    const oh=parseFloat(els.oh.value)/100;

    const s0 = speedup(w0, p);
    const s1 = speedup(w1, p);

    const rel = (s1 / s0);
    const rawTarget = base * rel;
    const target = rawTarget * (1 - oh);

    const interpretation =
      rel < 1.2
        ? "Limited scaling benefit. System likely bottlenecked by non-parallel work."
        : rel < 2
          ? "Moderate scaling. Gains are present but diminishing."
          : "Strong scaling improvement. System benefits from parallelization.";

    els.results.innerHTML = [
      row("Baseline Throughput", `${base.toFixed(0)} req/s`),
      row("Scaling Gain", `${(rel*100).toFixed(1)}%`),
      row("Raw Target", `${rawTarget.toFixed(0)} req/s`),
      row("After Overhead", `${target.toFixed(0)} req/s`),
      row("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        throughput: target,
        scalingGain: rel
      }
    }));

    showContinue();
  }

  function reset(){
    els.base.value=1200;
    els.w0.value=4;
    els.w1.value=12;
    els.p.value=85;
    els.oh.value=8;
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bind(){
    [els.base, els.w0, els.w1, els.p, els.oh].forEach(el=>{
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init(){
    hideContinue();
    loadPrior();
    bind();

    els.calc.onclick=calc;
    els.reset.onclick=reset;
    els.continueBtn.onclick=()=>window.location.href=NEXT_URL;
  }

  init();
})();
