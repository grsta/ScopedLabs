(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "ambient-rise";
  const NEXT_URL = "/tools/thermal/exhaust-temperature/";

  const $ = id => document.getElementById(id);

  const els = {
    w: $("w"),
    cfm: $("cfm"),
    k: $("k"),
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
    els.results.innerHTML=`<div class="muted">Enter values and press Calculate.</div>`;
  }

  function loadPrior(){
    els.flowNote.style.display="none";
    els.flowNote.innerHTML="";

    let saved=null;
    try{
      saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||"null");
    }catch{}

    if(!saved || saved.category!==CATEGORY || saved.step!=="hot-cold-aisle") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Layout Strategy: <strong>${d.layout ?? "—"}</strong>.
      This step evaluates resulting temperature rise from airflow and layout.
    `;

    els.flowNote.style.display="";
  }

  function calculate(){
    const watts=parseFloat(els.w.value);
    const cfm=parseFloat(els.cfm.value);
    const k=parseFloat(els.k.value);

    if(!Number.isFinite(watts) || !Number.isFinite(cfm)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const btu = watts * 3.412;
    const dt = btu / (k * Math.max(1, cfm));

    let classification = "Low temperature rise";
    if(dt > 10) classification = "Moderate temperature rise";
    if(dt > 20) classification = "High temperature rise";
    if(dt > 35) classification = "Extreme temperature rise";

    const interpretation =
      dt < 10
        ? "Cooling is effective. Temperature rise is well controlled."
        : dt < 20
          ? "Acceptable temperature rise for most environments."
          : dt < 35
            ? "High temperature rise. Airflow or cooling improvements recommended."
            : "Excessive temperature rise. System is likely under-cooled.";

    els.results.innerHTML = [
      resultRow("Heat Load", `${watts.toFixed(0)} W`),
      resultRow("Heat Load", `${btu.toFixed(0)} BTU/hr`),
      resultRow("Airflow", `${cfm.toFixed(0)} CFM`),
      resultRow("Estimated ΔT", `${dt.toFixed(1)} °F`),
      resultRow("Status", classification),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        deltaT: dt,
        classification
      }
    }));

    showContinue();
  }

  function reset(){
    els.w.value=3500;
    els.cfm.value=800;
    els.k.value="1.08";
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.w, els.cfm, els.k].forEach(el=>{
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