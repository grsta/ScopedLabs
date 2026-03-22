(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "room-cooling-capacity";

  const $ = id => document.getElementById(id);
  const W_TO_BTU = 3.412141633;
  const TON_BTU = 12000;

  const els = {
    w: $("w"),
    m: $("m"),
    calc: $("calc"),
    reset: $("reset"),
    results: $("results"),
    flowNote: $("flow-note")
  };

  function resultRow(label, value){
    return `
      <div class="result-row">
        <div class="result-label">${label}</div>
        <div class="result-value">${value}</div>
      </div>
    `;
  }

  function clearStored(){
    sessionStorage.removeItem(STORAGE_KEY);
  }

  function invalidate(){
    clearStored();
    els.results.innerHTML=`<div class="muted">Enter values and press Calculate.</div>`;
  }

  function loadPrior(){
    els.flowNote.style.display="none";
    els.flowNote.innerHTML="";

    let saved=null;
    try{
      saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||"null");
    }catch{}

    if(!saved || saved.category!==CATEGORY || saved.step!=="exhaust-temperature") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Exhaust Temp: <strong>${d.exhaustTemp ?? "—"} °F</strong>.
      Final step: validate cooling capacity against system heat load.
    `;

    els.flowNote.style.display="";
  }

  function calculate(){
    const w=parseFloat(els.w.value);
    const m=parseFloat(els.m.value)/100;

    if(!Number.isFinite(w)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      clearStored();
      return;
    }

    const w2 = w * (1 + m);
    const btu = w2 * W_TO_BTU;
    const tons = btu / TON_BTU;

    let classification="Adequate";
    if(tons > 10) classification="High Capacity Required";
    if(tons > 25) classification="Very High Capacity";
    if(tons > 50) classification="Extreme Cooling Requirement";

    const interpretation =
      tons < 5
        ? "Cooling requirement is modest. Standard HVAC systems can typically support this load."
        : tons < 15
          ? "Moderate cooling requirement. Dedicated cooling systems recommended."
          : tons < 30
            ? "High cooling requirement. Specialized HVAC or containment strategies needed."
            : "Extreme cooling requirement. Advanced cooling solutions required (CRAC, liquid, etc.).";

    els.results.innerHTML = [
      resultRow("Base Heat Load", `${w.toFixed(0)} W`),
      resultRow("With Margin", `${w2.toFixed(0)} W`),
      resultRow("Cooling Required", `${btu.toFixed(0)} BTU/hr`),
      resultRow("Cooling Required", `${tons.toFixed(2)} tons`),
      resultRow("Status", classification),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");
  }

  function reset(){
    els.w.value=12000;
    els.m.value=20;
    els.results.innerHTML="";
    clearStored();
    loadPrior();
  }

  function bindInvalidation(){
    [els.w, els.m].forEach(el=>{
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    });
  }

  function init(){
    loadPrior();
    bindInvalidation();

    els.calc.onclick=calculate;
    els.reset.onclick=reset;
  }

  init();
})();
