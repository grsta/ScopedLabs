(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "response-time-sla";
  const NEXT_URL = "/tools/performance/latency-vs-throughput/";

  const $ = id => document.getElementById(id);

  const els = {
    cur: $("cur"),
    tgt: $("tgt"),
    sla: $("sla"),
    eb: $("eb"),
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
    els.results.innerHTML = `<div class="muted">Enter values and press Check SLA.</div>`;
  }

  function status(lat, sla){
    if(lat <= sla) return "PASS";
    if(lat <= sla * 1.1) return "RISK";
    return "FAIL";
  }

  function calculate(){
    const cur=parseFloat(els.cur.value);
    const tgt=parseFloat(els.tgt.value);
    const sla=parseFloat(els.sla.value);
    const eb=parseFloat(els.eb.value);

    if(!Number.isFinite(cur) || !Number.isFinite(sla)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const interpretation =
      cur <= sla
        ? "Current system meets SLA requirements. Performance baseline is acceptable."
        : cur <= sla * 1.1
          ? "System is near SLA limits. Optimization may be required under load."
          : "System exceeds SLA. Performance bottlenecks must be identified and resolved.";

    els.results.innerHTML = [
      resultRow("SLA Threshold", `${sla.toFixed(1)} ms`),
      resultRow("Current Avg", `${cur.toFixed(1)} ms (${status(cur,sla)})`),
      resultRow("Target Avg", `${tgt.toFixed(1)} ms (${status(tgt,sla)})`),
      resultRow("Error Budget", `${eb.toFixed(2)} %`),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        sla,
        currentLatency: cur,
        targetLatency: tgt,
        errorBudget: eb
      }
    }));

    showContinue();
  }

  function reset(){
    els.cur.value=120;
    els.tgt.value=180;
    els.sla.value=200;
    els.eb.value=1;
    els.results.innerHTML="";
    clearStored();
    hideContinue();
  }

  function bindInvalidation(){
    [els.cur, els.tgt, els.sla, els.eb].forEach(el=>{
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init(){
    hideContinue();
    bindInvalidation();

    els.calc.onclick=calculate;
    els.reset.onclick=reset;
    els.continueBtn.onclick=()=>window.location.href=NEXT_URL;
  }

  init();
})();
