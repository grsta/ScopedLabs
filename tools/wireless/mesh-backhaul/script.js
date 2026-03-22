(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "mesh-backhaul";
  const NEXT_URL = "/tools/wireless/ptp-wireless-link/";

  const $ = id => document.getElementById(id);

  const els = {
    base: $("base"),
    hops: $("hops"),
    ovh: $("ovh"),
    ded: $("ded"),
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
    els.results.innerHTML="";
  }

  function loadPrior(){
    els.flowNote.style.display="none";
    els.flowNote.innerHTML="";

    let saved=null;
    try{
      saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||"null");
    }catch{}

    if(!saved || saved.category!==CATEGORY || saved.step!=="link-budget") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Link RSSI: <strong>${d.rssi ?? "—"} dBm</strong>,
      Margin: <strong>${d.margin ?? "—"} dB</strong>.
      This step evaluates how multi-hop mesh impacts usable throughput.
    `;

    els.flowNote.style.display="";
  }

  function calculate(){
    const base=parseFloat(els.base.value);
    const hops=Math.max(0, parseInt(els.hops.value,10));
    const ovh=parseFloat(els.ovh.value)/100;
    const ded=els.ded.value==="yes";

    if(!Number.isFinite(base)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const hopFactor = ded ? 0.75 : 0.50;
    const afterHops = base * Math.pow(hopFactor, Math.max(1, hops));
    const hopApplied = hops === 0 ? base : afterHops;

    const effective = hopApplied * (1 - Math.max(0, Math.min(0.7, ovh)));

    let status="OK";
    if(effective < 150) status="MARGINAL";
    if(effective < 50) status="POOR";

    const interpretation =
      hops === 0
        ? "No mesh hops. Performance is limited only by link quality and overhead."
        : ded
          ? "Dedicated backhaul helps preserve throughput across hops, but capacity still degrades with each relay."
          : "Shared-radio mesh significantly reduces throughput per hop due to airtime reuse and contention.";

    els.results.innerHTML = [
      resultRow("Base Link", `${base.toFixed(0)} Mbps`),
      resultRow("Hops", `${hops}`),
      resultRow("Dedicated Backhaul", ded ? "Yes" : "No"),
      resultRow("After Hops", `${hopApplied.toFixed(0)} Mbps`),
      resultRow("After Overhead", `${effective.toFixed(0)} Mbps`),
      resultRow("Result", status),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        effective,
        hops,
        status
      }
    }));

    showContinue();
  }

  function reset(){
    els.base.value=600;
    els.hops.value=2;
    els.ovh.value=25;
    els.ded.value="no";
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.base, els.hops, els.ovh, els.ded].forEach(el=>{
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
