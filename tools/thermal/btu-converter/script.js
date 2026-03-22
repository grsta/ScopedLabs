(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "btu-converter";
  const NEXT_URL = "/tools/thermal/rack-thermal-density/";

  const $ = id => document.getElementById(id);

  const els = {
    w: $("w"),
    btu: $("btu"),
    tons: $("tons"),
    mode: $("mode"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    flowNote: $("flow-note"),
    continueWrap: $("continue-wrap"),
    continueBtn: $("continue")
  };

  const W_TO_BTU = 3.412141633;
  const TON_TO_BTU = 12000;

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
    els.results.innerHTML = `<div class="muted">Enter values and press Convert.</div>`;
  }

  function loadPrior(){
    els.flowNote.style.display="none";
    els.flowNote.innerHTML="";

    let saved=null;
    try{
      saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||"null");
    }catch{}

    if(!saved || saved.category!==CATEGORY || saved.step!=="psu-efficiency-heat") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      PSU Heat Loss: <strong>${d.heatLossW ?? "—"} W</strong> /
      <strong>${d.heatLossBtuHr ?? "—"} BTU/hr</strong>.
      This step converts total system heat into HVAC planning units.
    `;

    els.flowNote.style.display="";
  }

  function convert(){
    const mode=els.mode.value;

    let w=parseFloat(els.w.value);
    let btu=parseFloat(els.btu.value);
    let tons=parseFloat(els.tons.value);

    if(mode==="watts"){
      btu = w * W_TO_BTU;
      tons = btu / TON_TO_BTU;
    } else if(mode==="btu"){
      w = btu / W_TO_BTU;
      tons = btu / TON_TO_BTU;
    } else {
      btu = tons * TON_TO_BTU;
      w = btu / W_TO_BTU;
    }

    els.w.value = isFinite(w) ? w.toFixed(0) : "";
    els.btu.value = isFinite(btu) ? btu.toFixed(0) : "";
    els.tons.value = isFinite(tons) ? tons.toFixed(2) : "";

    const interpretation =
      btu < 5000
        ? "Low cooling requirement. Standard ventilation may be sufficient."
        : btu < 20000
          ? "Moderate cooling requirement. Dedicated airflow and cooling should be considered."
          : "High cooling requirement. HVAC sizing becomes critical for maintaining safe operating temperatures.";

    els.results.innerHTML = [
      resultRow("Watts", `${w.toFixed(0)} W`),
      resultRow("BTU/hr", `${btu.toFixed(0)} BTU/hr`),
      resultRow("Cooling Tons", `${tons.toFixed(2)} tons`),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        watts: w,
        btu,
        tons
      }
    }));

    showContinue();
  }

  function reset(){
    els.w.value=3500;
    els.btu.value=11942;
    els.tons.value=1.00;
    els.mode.value="watts";
    els.results.innerHTML=`<div class="muted">Enter values and press Convert.</div>`;
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.w, els.btu, els.tons, els.mode].forEach(el=>{
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init(){
    hideContinue();
    loadPrior();
    bindInvalidation();

    els.calc.onclick=convert;
    els.reset.onclick=reset;
    els.continueBtn.onclick=()=>window.location.href=NEXT_URL;
  }

  init();
})();
