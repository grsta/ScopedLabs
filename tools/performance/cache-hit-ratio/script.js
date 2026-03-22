(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "cache-hit-ratio";
  const NEXT_URL = "/tools/performance/bottleneck-analyzer/";

  const $ = id => document.getElementById(id);

  const els = {
    rps: $("rps"),
    hit: $("hit"),
    hitLat: $("hitLat"),
    missLat: $("missLat"),
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

    els.flowNote.style.display="none";
    els.flowNote.innerHTML="";

    if(!saved || saved.category!==CATEGORY || saved.step!=="network-congestion") return;

    const d=saved.data||{};

    const peakTraffic = Number(d.peakTrafficMbps);
    const congestionRisk = d.congestionRisk;
    const util = Number(d.utilization);

    // PREFILL VALUES
    if(Number.isFinite(peakTraffic)){
      els.rps.value = Math.round(peakTraffic * 5); // scale proxy
    }

    if(congestionRisk === "HIGH"){
      els.hit.value = 92;
    } else if(congestionRisk === "MEDIUM"){
      els.hit.value = 88;
    }

    // FLOW NOTE (REAL CONTEXT)
    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Peak Traffic: <strong>${Number.isFinite(peakTraffic) ? peakTraffic.toFixed(0) : "—"} Mbps</strong>,
      Network Utilization: <strong>${Number.isFinite(util) ? (util*100).toFixed(1) : "—"}%</strong>,
      Congestion Risk: <strong>${congestionRisk ?? "—"}</strong>.
      Cache effectiveness is now evaluated as a mitigation layer to reduce backend load and stabilize performance.
    `;
    els.flowNote.style.display="";
  }

  function calc(){
    const rps=parseFloat(els.rps.value);
    const hit=parseFloat(els.hit.value)/100;
    const hitLat=parseFloat(els.hitLat.value);
    const missLat=parseFloat(els.missLat.value);

    const miss = 1-hit;
    const avgLat = (hit*hitLat) + (miss*missLat);

    const missRps = rps*miss;
    const hitRps = rps*hit;

    const reduction = ((missLat - avgLat) / missLat) * 100;

    const interpretation =
      hit > 0.9
        ? "Cache is highly effective and significantly reducing backend load."
        : hit > 0.75
          ? "Cache provides moderate benefit but backend load is still substantial."
          : "Cache effectiveness is low. Backend systems remain heavily loaded.";

    els.results.innerHTML = [
      row("Hit Requests/sec", hitRps.toFixed(0)),
      row("Miss Requests/sec", missRps.toFixed(0)),
      row("Avg Latency", `${avgLat.toFixed(2)} ms`),
      row("Latency Reduction", `${reduction.toFixed(1)}%`),
      row("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        cacheHit: hit,
        avgLatency: avgLat,
        backendLoad: missRps
      }
    }));

    showContinue();
  }

  function reset(){
    els.rps.value=5000;
    els.hit.value=85;
    els.hitLat.value=2;
    els.missLat.value=40;
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bind(){
    [els.rps, els.hit, els.hitLat, els.missLat].forEach(el=>{
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
