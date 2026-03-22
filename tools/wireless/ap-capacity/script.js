(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "ap-capacity";
  const NEXT_URL = "/tools/wireless/link-budget/";

  const $ = id => document.getElementById(id);

  const els = {
    clients: $("clients"),
    mbps: $("mbps"),
    util: $("util"),
    apcap: $("apcap"),
    maxc: $("maxc"),
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

    if(!saved || saved.category!==CATEGORY || saved.step!=="client-density") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Estimated AP Count: <strong>${d.apCount ?? "—"}</strong>,
      Client Density: <strong>${d.density ?? "—"}</strong>.
      This step refines capacity based on throughput demand.
    `;

    els.flowNote.style.display="";
  }

  function calculate(){
    const clients=parseFloat(els.clients.value);
    const mbps=parseFloat(els.mbps.value);
    const util=parseFloat(els.util.value)/100;
    const apcap=parseFloat(els.apcap.value);
    const maxc=parseFloat(els.maxc.value);

    if(!Number.isFinite(clients) || !Number.isFinite(mbps)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const totalDemand = clients * mbps;
    const usablePerAP = apcap * Math.max(0.05, util);

    const byThroughput = Math.max(1, Math.ceil(totalDemand / usablePerAP));
    const byClients = Math.max(1, Math.ceil(clients / Math.max(1, maxc)));

    const recommended = Math.max(byThroughput, byClients);

    const interpretation =
      recommended <= byClients
        ? "Client count is the limiting factor. Airtime contention will dominate."
        : "Throughput demand is the limiting factor. Capacity planning is bandwidth-driven.";

    els.results.innerHTML = [
      resultRow("Total Client Demand", `${totalDemand.toFixed(1)} Mbps`),
      resultRow("Usable per AP", `${usablePerAP.toFixed(1)} Mbps`),
      resultRow("APs (Throughput)", `${byThroughput}`),
      resultRow("APs (Client Limit)", `${byClients}`),
      resultRow("Recommended AP Count", `${recommended}`),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        totalDemand,
        recommended,
        byThroughput,
        byClients
      }
    }));

    showContinue();
  }

  function reset(){
    els.clients.value=150;
    els.mbps.value=3;
    els.util.value=60;
    els.apcap.value=300;
    els.maxc.value=35;
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.clients, els.mbps, els.util, els.apcap, els.maxc].forEach(el=>{
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