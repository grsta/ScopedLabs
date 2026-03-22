(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "psu-efficiency-heat";
  const NEXT_URL = "/tools/thermal/btu-converter/";
  const W_TO_BTU = 3.412141633;

  const $ = id => document.getElementById(id);

  const els = {
    load: $("load"),
    eff: $("eff"),
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
    els.flowNote.style.display="none";
    els.flowNote.innerHTML="";

    let saved=null;
    try{
      saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||"null");
    }catch{}

    if(!saved || saved.category!==CATEGORY || saved.step!=="heat-load-estimator") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Heat Load: <strong>${d.heatLoadW ?? "—"} W</strong> /
      <strong>${d.heatLoadBtuHr ?? "—"} BTU/hr</strong>.
      This step accounts for additional heat from power inefficiency.
    `;

    els.flowNote.style.display="";
  }

  function calculate(){
    const load=parseFloat(els.load.value);
    const eff=parseFloat(els.eff.value)/100;

    if(!Number.isFinite(load) || !Number.isFinite(eff)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const input = load / Math.max(0.01, eff);
    const loss = input - load;
    const btu = loss * W_TO_BTU;

    const interpretation =
      loss < 100
        ? "Low PSU losses. Efficiency is high and additional thermal impact is minimal."
        : loss < 300
          ? "Moderate PSU losses. Heat contribution should be included in rack and airflow planning."
          : "High PSU losses. Inefficiency is adding significant thermal load and will impact cooling requirements.";

    els.results.innerHTML = [
      resultRow("Output Load", `${load.toFixed(0)} W`),
      resultRow("PSU Input Power", `${input.toFixed(0)} W`),
      resultRow("Heat Loss", `${loss.toFixed(0)} W`),
      resultRow("Heat Loss", `${btu.toFixed(0)} BTU/hr`),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        inputPowerW: input,
        heatLossW: loss,
        heatLossBtuHr: btu
      }
    }));

    showContinue();
  }

  function reset(){
    els.load.value=800;
    els.eff.value=92;
    els.results.innerHTML=`<div class="muted">Enter values and press Calculate.</div>`;
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.load, els.eff].forEach(el=>{
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
