(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "queue-depth";
  const NEXT_URL = "/tools/performance/concurrency-scaling/";

  const $ = id => document.getElementById(id);

  const els = {
    lambda: $("lambda"),
    mu: $("mu"),
    k: $("k"),
    svc: $("svc"),
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

    if(!saved || saved.category!==CATEGORY || saved.step!=="latency-vs-throughput") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Utilization: <strong>${(d.utilization*100).toFixed(1)}%</strong>,
      Latency: <strong>${d.latency?.toFixed?.(1) ?? "—"} ms</strong>.
      This step evaluates backlog formation.
    `;
    els.flowNote.style.display="";
  }

  function calc(){
    const lambda=parseFloat(els.lambda.value);
    const mu=parseFloat(els.mu.value);
    const k=Math.max(1, Math.floor(parseFloat(els.k.value)));
    const svc=parseFloat(els.svc.value);

    const capacity = mu * k;
    const rho = lambda / capacity;

    let q;
    if(rho >= 1){
      q = Infinity;
    } else {
      q = (rho*rho) / (1 - rho);
    }

    let rt;
    if(!isFinite(q)){
      rt = Infinity;
    } else {
      const waitMs = (q / lambda) * 1000;
      rt = svc + waitMs;
    }

    const interpretation =
      !isFinite(q)
        ? "System is overloaded. Queue will grow without bound."
        : q < 5
          ? "Minimal queuing. System is operating efficiently."
          : q < 20
            ? "Moderate queueing. Latency is beginning to accumulate."
            : "Heavy queueing. System is under significant load and delay is increasing rapidly.";

    els.results.innerHTML = [
      row("Total Capacity", `${capacity.toFixed(0)} req/s`),
      row("Utilization (ρ)", `${rho.toFixed(3)}`),
      row("Queue Depth", isFinite(q) ? q.toFixed(2) : "RUNAWAY"),
      row("Response Time", isFinite(rt) ? `${rt.toFixed(2)} ms` : "UNBOUNDED"),
      row("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        queueDepth: q,
        utilization: rho,
        responseTime: rt
      }
    }));

    showContinue();
  }

  function reset(){
    els.lambda.value=900;
    els.mu.value=1200;
    els.k.value=1;
    els.svc.value=4;
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bind(){
    [els.lambda, els.mu, els.k, els.svc].forEach(el=>{
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