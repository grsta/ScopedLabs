(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "link-budget";
  const NEXT_URL = "/tools/wireless/mesh-backhaul/";

  const $ = id => document.getElementById(id);

  const els = {
    ghz: $("ghz"),
    dist: $("dist"),
    tx: $("tx"),
    txg: $("txg"),
    rxg: $("rxg"),
    loss: $("loss"),
    sens: $("sens"),
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

    if(!saved || saved.category!==CATEGORY || saved.step!=="ap-capacity") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Recommended APs: <strong>${d.recommended ?? "—"}</strong>,
      Throughput demand: <strong>${d.totalDemand ?? "—"} Mbps</strong>.
      Use this step to validate whether links can sustain required signal levels.
    `;

    els.flowNote.style.display="";
  }

  function fspl(distFt, ghz){
    const dkm = (distFt * 0.3048) / 1000;
    const fmhz = ghz * 1000;
    return 32.44 + 20*Math.log10(Math.max(1e-6, dkm)) + 20*Math.log10(Math.max(1e-6, fmhz));
  }

  function calculate(){
    const ghz=parseFloat(els.ghz.value);
    const dist=parseFloat(els.dist.value);
    const tx=parseFloat(els.tx.value);
    const txg=parseFloat(els.txg.value);
    const rxg=parseFloat(els.rxg.value);
    const loss=parseFloat(els.loss.value);
    const sens=parseFloat(els.sens.value);

    if(!Number.isFinite(ghz) || !Number.isFinite(dist)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const path = fspl(dist, ghz);
    const rssi = tx + txg + rxg - path - loss;
    const margin = rssi - sens;

    let status="OK";
    if(margin < 10) status="MARGINAL";
    if(margin < 0) status="FAIL";

    const interpretation =
      margin >= 20
        ? "Strong link margin. This design should tolerate environmental variation."
        : margin >= 10
          ? "Moderate link margin. Expect performance variation under interference."
          : margin >= 0
            ? "Low margin. Link stability may degrade in real-world conditions."
            : "Link below receiver sensitivity. Design is not viable.";

    els.results.innerHTML = [
      resultRow("FSPL", `${path.toFixed(1)} dB`),
      resultRow("Estimated RSSI", `${rssi.toFixed(1)} dBm`),
      resultRow("Sensitivity", `${sens.toFixed(1)} dBm`),
      resultRow("Link Margin", `${margin.toFixed(1)} dB`),
      resultRow("Result", status),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        rssi,
        margin,
        status
      }
    }));

    showContinue();
  }

  function reset(){
    els.ghz.value=5.0;
    els.dist.value=300;
    els.tx.value=20;
    els.txg.value=3;
    els.rxg.value=3;
    els.loss.value=5;
    els.sens.value=-67;
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.ghz, els.dist, els.tx, els.txg, els.rxg, els.loss, els.sens].forEach(el=>{
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