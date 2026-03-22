(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "client-density";
  const NEXT_URL = "/tools/wireless/ap-capacity/";

  const $ = id => document.getElementById(id);

  const els = {
    w: $("w"),
    d: $("d"),
    clients: $("clients"),
    cpa: $("cpa"),
    factor: $("factor"),
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

    if(!saved || saved.category!==CATEGORY || saved.step!=="noise-floor-margin") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      SNR: <strong>${d.snr ?? "—"} dB</strong>,
      Margin: <strong>${d.margin ?? "—"} dB</strong>.
      Use this to determine realistic client loading expectations.
    `;

    els.flowNote.style.display="";
  }

  function calculate(){
    const w=parseFloat(els.w.value);
    const d=parseFloat(els.d.value);
    const clients=parseFloat(els.clients.value);
    const cpa=parseFloat(els.cpa.value);
    const factor=parseFloat(els.factor.value);

    if(!Number.isFinite(w) || !Number.isFinite(d) || !Number.isFinite(clients)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const area = w * d;
    const baseAps = Math.max(1, Math.ceil(clients / Math.max(1, cpa)));
    const adjusted = Math.max(1, Math.ceil(baseAps * Math.max(0.5, Math.min(1.5, factor))));
    const density = clients / Math.max(1, area);

    const interpretation =
      density < 0.01
        ? "Low client density. Coverage will dominate over capacity."
        : density < 0.03
          ? "Moderate density. Balanced coverage and capacity design."
          : density < 0.06
            ? "High density. Capacity planning and airtime management are critical."
            : "Very high density. Expect contention-heavy environment requiring careful RF and AP tuning.";

    els.results.innerHTML = [
      resultRow("Area", `${area.toFixed(0)} sq ft`),
      resultRow("Client Density", `${density.toFixed(4)} clients/sq ft`),
      resultRow("Base APs (clients/AP)", `${baseAps}`),
      resultRow("Coverage Factor", `${factor.toFixed(2)}×`),
      resultRow("Recommended AP Count", `${adjusted}`),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        area,
        density,
        apCount: adjusted,
        clients
      }
    }));

    showContinue();
  }

  function reset(){
    els.w.value=120;
    els.d.value=80;
    els.clients.value=200;
    els.cpa.value=35;
    els.factor.value=1.0;
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.w, els.d, els.clients, els.cpa, els.factor].forEach(el=>{
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

