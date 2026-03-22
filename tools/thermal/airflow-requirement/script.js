(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "airflow-requirement";
  const NEXT_URL = "/tools/thermal/fan-cfm-sizing/";

  const $ = id => document.getElementById(id);

  const els = {
    w: $("w"),
    dt: $("dt"),
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

    if(!saved || saved.category!==CATEGORY || saved.step!=="rack-thermal-density") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Rack Heat Density: <strong>${d.perRU ?? "—"} BTU/hr/RU</strong>.
      Use this to determine airflow needed to remove concentrated heat.
    `;

    els.flowNote.style.display="";
  }

  function calculate(){
    const watts=parseFloat(els.w.value);
    const dt=parseFloat(els.dt.value);
    const k=parseFloat(els.k.value);

    if(!Number.isFinite(watts) || !Number.isFinite(dt)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const btu = watts * 3.412;
    const cfm = btu / (k * Math.max(0.1, dt));

    let classification = "Low airflow requirement";
    if(cfm > 500) classification = "Moderate airflow requirement";
    if(cfm > 1500) classification = "High airflow requirement";
    if(cfm > 3000) classification = "Extreme airflow requirement";

    const interpretation =
      cfm < 500
        ? "Airflow demand is low. Standard fan configurations are typically sufficient."
        : cfm < 1500
          ? "Moderate airflow required. Fan sizing and airflow path become important."
          : cfm < 3000
            ? "High airflow required. Careful fan selection and airflow design are needed."
            : "Extreme airflow required. Advanced cooling strategies or containment may be necessary.";

    els.results.innerHTML = [
      resultRow("Heat Load", `${watts.toFixed(0)} W`),
      resultRow("Heat Load", `${btu.toFixed(0)} BTU/hr`),
      resultRow("Allowed ΔT", `${dt.toFixed(1)} °F`),
      resultRow("Required Airflow", `${cfm.toFixed(0)} CFM`),
      resultRow("Status", classification),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        airflowCFM: cfm,
        heatBTU: btu,
        classification
      }
    }));

    showContinue();
  }

  function reset(){
    els.w.value=3500;
    els.dt.value=15;
    els.k.value="1.08";
    els.results.innerHTML=`<div class="muted">Enter values and press Calculate.</div>`;
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.w, els.dt, els.k].forEach(el=>{
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
