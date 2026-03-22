(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "rack-thermal-density";
  const NEXT_URL = "/tools/thermal/airflow-requirement/";
  const KW_TO_BTU = 3412.14;

  const $ = id => document.getElementById(id);

  const els = {
    kw: $("kw"),
    ru: $("ru"),
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

    if(!saved || saved.category!==CATEGORY || saved.step!=="btu-converter") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      System Heat: <strong>${d.btu ?? "—"} BTU/hr</strong> /
      <strong>${d.tons ?? "—"} tons</strong>.
      This step evaluates how concentrated that heat is within a rack.
    `;

    els.flowNote.style.display="";
  }

  function calculate(){
    const kw=parseFloat(els.kw.value);
    const ru=parseFloat(els.ru.value);

    if(!Number.isFinite(kw) || !Number.isFinite(ru)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const btu = kw * KW_TO_BTU;
    const perRU = btu / Math.max(1, ru);

    let classification = "Low density";
    if(perRU > 500) classification = "Moderate density";
    if(perRU > 1000) classification = "High density";
    if(perRU > 2000) classification = "Extreme density";

    const interpretation =
      perRU < 500
        ? "Thermal load is spread out. Standard airflow is typically sufficient."
        : perRU < 1000
          ? "Moderate density. Airflow planning begins to matter."
          : perRU < 2000
            ? "High density. Directed airflow and containment strategies are recommended."
            : "Extreme density. Advanced cooling such as rear-door heat exchangers or liquid cooling may be required.";

    els.results.innerHTML = [
      resultRow("Rack Load", `${kw.toFixed(2)} kW`),
      resultRow("Total Heat", `${btu.toFixed(0)} BTU/hr`),
      resultRow("Heat per RU", `${perRU.toFixed(0)} BTU/hr/RU`),
      resultRow("Density Class", classification),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        rackKW: kw,
        totalBTU: btu,
        perRU,
        classification
      }
    }));

    showContinue();
  }

  function reset(){
    els.kw.value=8;
    els.ru.value=42;
    els.results.innerHTML=`<div class="muted">Enter values and press Calculate.</div>`;
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.kw, els.ru].forEach(el=>{
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
