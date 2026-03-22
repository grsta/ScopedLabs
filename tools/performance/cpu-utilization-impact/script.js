(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "cpu-utilization-impact";
  const NEXT_URL = "/tools/performance/disk-saturation/";

  const $ = id => document.getElementById(id);

  const els = {
    u: $("u"),
    u2: $("u2"),
    lat: $("lat"),
    head: $("head"),
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
    els.results.innerHTML=`<div class="muted">Enter values and press Calculate.</div>`;
  }

  function loadPrior(){
    let saved=null;
    try{
      saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||"null");
    }catch{}

    if(!saved || saved.category!==CATEGORY || saved.step!=="concurrency-scaling") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Scaled Throughput: <strong>${d.throughput?.toFixed?.(0) ?? "—"} req/s</strong>,
      Scaling Gain: <strong>${(d.scalingGain*100).toFixed(1)}%</strong>.
      This step evaluates CPU saturation limits.
    `;
    els.flowNote.style.display="";
  }

  function blowup(lat, u){
    const denom = Math.max(0.01, 1 - u);
    return lat / denom;
  }

  function calc(){
    const u = parseFloat(els.u.value)/100;
    const u2 = parseFloat(els.u2.value)/100;
    const lat = parseFloat(els.lat.value);
    const head = parseFloat(els.head.value)/100;

    const cur = blowup(lat, Math.min(0.99, u));
    const tgt = blowup(lat, Math.min(0.99, u2));
    const safeUtil = 1 - head;

    const interpretation =
      u2 < 0.7
        ? "CPU has comfortable headroom. System is stable."
        : u2 < 0.85
          ? "CPU utilization is rising. Monitor for contention and latency growth."
          : "CPU nearing saturation. Expect rapid latency increase and reduced system stability.";

    els.results.innerHTML = [
      row("Baseline Latency", `${lat.toFixed(1)} ms`),
      row("Latency @ Current", `${cur.toFixed(1)} ms`),
      row("Latency @ Target", `${tgt.toFixed(1)} ms`),
      row("Recommended Max Util", `${(safeUtil*100).toFixed(0)}%`),
      row("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        cpuUtilization: u2,
        latency: tgt,
        safeUtilization: safeUtil
      }
    }));

    showContinue();
  }

  function reset(){
    els.u.value=65;
    els.u2.value=85;
    els.lat.value=25;
    els.head.value=20;
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bind(){
    [els.u, els.u2, els.lat, els.head].forEach(el=>{
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