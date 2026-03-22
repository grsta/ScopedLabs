(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "noise-floor-margin";
  const NEXT_URL = "/tools/wireless/client-density/";

  const $ = id => document.getElementById(id);

  const els = {
    sig: $("sig"),
    noise: $("noise"),
    target: $("target"),
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

  function qualityLabel(snr){
    if(snr >= 30) return "Excellent";
    if(snr >= 25) return "Good";
    if(snr >= 20) return "Fair";
    if(snr >= 15) return "Poor";
    return "Very Poor";
  }

  function loadPrior(){
    els.flowNote.style.display="none";
    els.flowNote.innerHTML="";

    let saved=null;
    try{
      saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||"null");
    }catch{}

    if(!saved || saved.category!==CATEGORY || saved.step!=="channel-overlap") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Channel reuse: <strong>${d.averageReuse ?? "—"}</strong>,
      Overlap risk: <strong>${d.overlapRiskPct ?? "—"}%</strong>.
      Use this step to verify whether RF conditions can support stable performance.
    `;

    els.flowNote.style.display="";
  }

  function calculate(){
    const sig=parseFloat(els.sig.value);
    const noise=parseFloat(els.noise.value);
    const target=parseFloat(els.target.value);

    if(!Number.isFinite(sig) || !Number.isFinite(noise) || !Number.isFinite(target)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const snr = sig - noise;
    const margin = snr - target;

    let status="MEETS TARGET";
    if(margin < 0) status="BELOW TARGET";

    const interpretation =
      snr >= 30
        ? "RF conditions are strong and can support high data rates with stable performance."
        : snr >= 25
          ? "RF conditions are generally healthy but may begin to limit peak throughput under load."
          : snr >= 20
            ? "RF conditions are marginal and will impact higher MCS rates and overall airtime efficiency."
            : "RF conditions are poor and will likely degrade throughput, roaming, and client stability.";

    els.results.innerHTML = [
      resultRow("Signal (RSSI)", `${sig.toFixed(1)} dBm`),
      resultRow("Noise Floor", `${noise.toFixed(1)} dBm`),
      resultRow("SNR", `${snr.toFixed(1)} dB (${qualityLabel(snr)})`),
      resultRow("Target SNR", `${target.toFixed(1)} dB`),
      resultRow("Margin", `${margin.toFixed(1)} dB`),
      resultRow("Result", status),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        snr,
        margin,
        status
      }
    }));

    showContinue();
  }

  function reset(){
    els.sig.value=-62;
    els.noise.value=-95;
    els.target.value=25;
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.sig, els.noise, els.target].forEach(el=>{
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