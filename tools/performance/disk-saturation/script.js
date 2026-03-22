(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "performance";
  const STEP = "disk-saturation";
  const NEXT_URL = "/tools/performance/network-congestion/";

  const $ = id => document.getElementById(id);

  const els = {
    riops: $("riops"),
    wiops: $("wiops"),
    iosz: $("iosz"),
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

    if(!saved || saved.category!==CATEGORY || saved.step!=="cpu-utilization-impact") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      CPU Utilization: <strong>${(d.cpuUtilization*100).toFixed(1)}%</strong>,
      Latency: <strong>${d.latency?.toFixed?.(1) ?? "—"} ms</strong>.
      This step evaluates storage bottlenecks.
    `;
    els.flowNote.style.display="";
  }

  function calc(){
    const riops=parseFloat(els.riops.value);
    const wiops=parseFloat(els.wiops.value);
    const iosz=parseFloat(els.iosz.value);
    const cap=parseFloat(els.cap.value);
    const util=parseFloat(els.util.value)/100;

    const totalIops = riops + wiops;
    const mbps = (totalIops * iosz) / 1024;

    const pct = (mbps / cap) * 100;
    const maxAtTarget = cap * util;

    const status = mbps <= maxAtTarget
      ? "WITHIN TARGET"
      : "SATURATED / RISK";

    const interpretation =
      pct < 50
        ? "Disk has significant headroom."
        : pct < 75
          ? "Disk utilization is moderate. Monitor growth."
          : pct < 90
            ? "Disk nearing saturation. Performance degradation likely."
            : "Disk is saturated. Storage is now a bottleneck.";

    els.results.innerHTML = [
      row("Total IOPS", totalIops.toFixed(0)),
      row("Throughput", `${mbps.toFixed(1)} MB/s`),
      row("Capacity", `${cap.toFixed(0)} MB/s`),
      row("Utilization", `${pct.toFixed(1)}%`),
      row("Target Limit", `${maxAtTarget.toFixed(0)} MB/s`),
      row("Status", status),
      row("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        throughput: mbps,
        utilization: pct/100,
        saturated: mbps > maxAtTarget
      }
    }));

    showContinue();
  }

  function reset(){
    els.riops.value=12000;
    els.wiops.value=6000;
    els.iosz.value=16;
    els.cap.value=1500;
    els.util.value=75;
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bind(){
    [els.riops, els.wiops, els.iosz, els.cap, els.util].forEach(el=>{
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
