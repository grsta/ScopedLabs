(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "thermal";
  const STEP = "fan-cfm-sizing";
  const NEXT_URL = "/tools/thermal/hot-cold-aisle/";

  const $ = id => document.getElementById(id);

  const els = {
    req: $("req"),
    fan: $("fan"),
    derate: $("derate"),
    red: $("red"),
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

    if(!saved || saved.category!==CATEGORY || saved.step!=="airflow-requirement") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Required Airflow: <strong>${d.airflowCFM ?? "—"} CFM</strong>.
      This step determines how many fans are required to meet that demand.
    `;

    els.flowNote.style.display="";
  }

  function calculate(){
    const req=parseFloat(els.req.value);
    const fan=parseFloat(els.fan.value);
    const derate=parseFloat(els.derate.value)/100;
    const red=parseInt(els.red.value,10);

    if(!Number.isFinite(req) || !Number.isFinite(fan)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const effFan = fan * (1 - derate);
    const n = Math.max(1, Math.ceil(req / Math.max(1, effFan)));
    const total = n + red;
    const provided = total * effFan;

    let classification = "Adequate";
    if(provided < req) classification = "Undersized";
    if(provided > req * 1.5) classification = "Overprovisioned";

    const interpretation =
      classification === "Undersized"
        ? "Airflow is insufficient. Additional fans or higher-performance units are required."
        : classification === "Overprovisioned"
          ? "Airflow exceeds requirements. This may improve cooling but increases noise and power usage."
          : "Fan configuration meets airflow requirements with reasonable efficiency.";

    els.results.innerHTML = [
      resultRow("Effective CFM per Fan", `${effFan.toFixed(1)} CFM`),
      resultRow("Fans Needed (base)", `${n}`),
      resultRow("Redundancy", red ? `N+${red}` : "None"),
      resultRow("Total Fans", `${total}`),
      resultRow("Provided Airflow", `${provided.toFixed(0)} CFM`),
      resultRow("Status", classification),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        totalFans: total,
        providedCFM: provided,
        classification
      }
    }));

    showContinue();
  }

  function reset(){
    els.req.value=800;
    els.fan.value=120;
    els.derate.value=25;
    els.red.value="0";
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.req, els.fan, els.derate, els.red].forEach(el=>{
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
