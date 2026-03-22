(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "exhaust-temperature";
  const NEXT_URL = "/tools/thermal/room-cooling-capacity/";

  const $ = id => document.getElementById(id);

  const els = {
    tin: $("tin"),
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

    if(!saved || saved.category!==CATEGORY || saved.step!=="ambient-rise") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Temperature Rise: <strong>${d.deltaT ?? "—"} °F</strong>.
      This step evaluates final exhaust conditions.
    `;

    els.flowNote.style.display="";
  }

  function calculate(){
    const tin=parseFloat(els.tin.value);
    const watts=parseFloat(els.w.value);
    const cfm=parseFloat(els.cfm.value);
    const k=parseFloat(els.k.value);

    if(!Number.isFinite(tin) || !Number.isFinite(watts)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const btu = watts * 3.412;
    const dt = btu / (k * Math.max(1, cfm));
    const tout = tin + dt;

    let classification="Safe";
    if(tout > 95) classification="Warm";
    if(tout > 110) classification="Hot";
    if(tout > 130) classification="Critical";

    const interpretation =
      tout < 95
        ? "Exhaust temperatures are within typical operating ranges."
        : tout < 110
          ? "Elevated exhaust temperatures. Monitor airflow and cooling performance."
          : tout < 130
            ? "High exhaust temperatures. Cooling improvements recommended."
            : "Critical exhaust temperature. System likely under-cooled.";

    els.results.innerHTML = [
      resultRow("Inlet Temp", `${tin.toFixed(1)} °F`),
      resultRow("Heat Load", `${watts.toFixed(0)} W (${btu.toFixed(0)} BTU/hr)`),
      resultRow("Airflow", `${cfm.toFixed(0)} CFM`),
      resultRow("ΔT", `${dt.toFixed(1)} °F`),
      resultRow("Exhaust Temp", `${tout.toFixed(1)} °F`),
      resultRow("Status", classification),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        exhaustTemp: tout,
        deltaT: dt
      }
    }));

    showContinue();
  }

  function reset(){
    els.tin.value=72;
    els.w.value=3500;
    els.cfm.value=900;
    els.k.value="1.08";
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.tin, els.w, els.cfm, els.k].forEach(el=>{
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
