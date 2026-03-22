(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "latency-vs-throughput";
  const NEXT_URL = "/tools/performance/queue-depth/";

  const $ = id => document.getElementById(id);

  const els = {
    baseLat: $("baseLat"),
    t0: $("t0"),
    t1: $("t1"),
    cap: $("cap"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  function resultRow(label, value){
    return `
      <div class="result-row">
        <div class="result-label">${label}</div>
        <div class="result-value">${value}</div>
      </div>
    `;
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

    if(!saved || saved.category!==CATEGORY || saved.step!=="response-time-sla") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      SLA Target: <strong>${d.sla ?? "—"} ms</strong>,
      Current Latency: <strong>${d.currentLatency ?? "—"} ms</strong>.
      This step evaluates how load affects latency growth.
    `;
    els.flowNote.style.display="";
  }

  function estLatency(base, util){
    const denom = Math.max(0.02, 1 - util);
    return base / denom;
  }

  function calculate(){
    const baseLat=parseFloat(els.baseLat.value);
    const t0=parseFloat(els.t0.value);
    const t1=parseFloat(els.t1.value);
    const cap=parseFloat(els.cap.value);

    if(!Number.isFinite(baseLat) || !Number.isFinite(cap)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const u0 = Math.min(0.98, t0/cap);
    const u1 = Math.min(0.98, t1/cap);

    const l0 = estLatency(baseLat, u0);
    const l1 = estLatency(baseLat, u1);

    const growth = (l1/l0 - 1) * 100;

    const interpretation =
      growth < 20
        ? "System is operating in a stable region with predictable latency."
        : growth < 100
          ? "Latency is increasing rapidly. System is approaching saturation."
          : "System is near collapse. Small increases in load will cause major latency spikes.";

    els.results.innerHTML = [
      resultRow("Current Utilization", `${(u0*100).toFixed(1)}%`),
      resultRow("Latency @ Current", `${l0.toFixed(1)} ms`),
      resultRow("Target Utilization", `${(u1*100).toFixed(1)}%`),
      resultRow("Latency @ Target", `${l1.toFixed(1)} ms`),
      resultRow("Latency Growth", `${growth.toFixed(1)}%`),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        utilization: u1,
        latency: l1,
        growth
      }
    }));

    showContinue();
  }

  function reset(){
    els.baseLat.value=25;
    els.t0.value=1200;
    els.t1.value=1800;
    els.cap.value=2000;
    els.results.innerHTML="";
    clearStored();
    hideContinue();
  }

  function bindInvalidation(){
    [els.baseLat, els.t0, els.t1, els.cap].forEach(el=>{
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init(){
    hideContinue();
    loadPrior();
    bindInvalidation();

    els.calc.onclick=calculate;
    els.reset.onclick=reset;
    els.continueBtn.onclick=()=>window.location.href=NEXT_URL;
  }

  init();
})();
