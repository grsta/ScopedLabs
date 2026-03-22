(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "hot-cold-aisle";
  const NEXT_URL = "/tools/thermal/ambient-rise/";

  const $ = id => document.getElementById(id);

  const els = {
    racks: $("racks"),
    kw: $("kw"),
    cooling: $("cooling"),
    contain: $("contain"),
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
    els.results.innerHTML=`<div class="muted">Enter values and press Evaluate.</div>`;
  }

  function loadPrior(){
    els.flowNote.style.display="none";
    els.flowNote.innerHTML="";

    let saved=null;
    try{
      saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||"null");
    }catch{}

    if(!saved || saved.category!==CATEGORY || saved.step!=="fan-cfm-sizing") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Provided Airflow: <strong>${d.providedCFM ?? "—"} CFM</strong>.
      This step defines how that airflow should be directed physically.
    `;

    els.flowNote.style.display="";
  }

  function calculate(){
    const racks=parseInt(els.racks.value,10);
    const kw=parseFloat(els.kw.value);
    const cooling=els.cooling.value;
    const contain=els.contain.value;

    if(!Number.isFinite(racks) || !Number.isFinite(kw)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const totalKW = racks * kw;

    let layout="Cold aisles facing each other, hot aisles facing each other.";
    let containRec="Containment optional.";

    if(contain==="cold") containRec="Implement Cold Aisle Containment (CAC).";
    if(contain==="hot") containRec="Implement Hot Aisle Containment (HAC).";

    let delivery="";
    if(cooling==="perimeter") delivery="Ensure cold air reaches cold aisles; return hot air overhead.";
    if(cooling==="inrow") delivery="Align racks with in-row cooling feeding cold aisles.";
    if(cooling==="overhead") delivery="Distribute supply air directly above cold aisles.";

    const interpretation =
      totalKW < 20
        ? "Lower-density environment. Basic hot/cold aisle alignment is usually sufficient."
        : totalKW < 50
          ? "Moderate density. Containment improves efficiency and prevents mixing."
          : "High-density deployment. Proper containment and airflow separation are critical.";

    els.results.innerHTML = [
      resultRow("Total IT Load", `${totalKW.toFixed(1)} kW`),
      resultRow("Recommended Layout", layout),
      resultRow("Containment Strategy", containRec),
      resultRow("Cooling Delivery", delivery),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        totalKW,
        layout,
        containment: containRec
      }
    }));

    showContinue();
  }

  function reset(){
    els.racks.value=10;
    els.kw.value=5;
    els.cooling.value="perimeter";
    els.contain.value="none";
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.racks, els.kw, els.cooling, els.contain].forEach(el=>{
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

