(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "ptp-wireless-link";
  const NEXT_URL = "/tools/wireless/roaming-thresholds/";

  const $ = id => document.getElementById(id);

  const els = {
    dist: $("dist"),
    ghz: $("ghz"),
    tx: $("tx"),
    txg: $("txg"),
    rxg: $("rxg"),
    loss: $("loss"),
    noise: $("noise"),
    snr: $("snr"),
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

    if(!saved || saved.category!==CATEGORY || saved.step!=="mesh-backhaul") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Effective Throughput: <strong>${d.effective ?? "—"} Mbps</strong>,
      Hops: <strong>${d.hops ?? "—"}</strong>.
      This step validates long-distance link viability.
    `;

    els.flowNote.style.display="";
  }

  function fspl(distFt, ghz){
    const dkm = (distFt * 0.3048) / 1000;
    const fmhz = ghz * 1000;
    return 32.44 + 20*Math.log10(Math.max(1e-6, dkm)) + 20*Math.log10(Math.max(1e-6, fmhz));
  }

  function throughputGuess(snr){
    if(snr >= 35) return 700;
    if(snr >= 30) return 550;
    if(snr >= 25) return 400;
    if(snr >= 20) return 250;
    if(snr >= 15) return 120;
    return 50;
  }

  function calculate(){
    const dist=parseFloat(els.dist.value);
    const ghz=parseFloat(els.ghz.value);
    const tx=parseFloat(els.tx.value);
    const txg=parseFloat(els.txg.value);
    const rxg=parseFloat(els.rxg.value);
    const loss=parseFloat(els.loss.value);
    const noise=parseFloat(els.noise.value);
    const target=parseFloat(els.snr.value);

    if(!Number.isFinite(dist) || !Number.isFinite(ghz)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      hideContinue();
      clearStored();
      return;
    }

    const path = fspl(dist, ghz);
    const rssi = tx + txg + rxg - path - loss;
    const snr = rssi - noise;
    const margin = snr - target;
    const est = throughputGuess(snr);

    let status="OK";
    if(margin < 10) status="MARGINAL";
    if(margin < 0) status="FAIL";

    const interpretation =
      margin >= 20
        ? "Strong PtP link. High reliability expected."
        : margin >= 10
          ? "Moderate margin. Environmental factors may impact performance."
          : margin >= 0
            ? "Low margin. Link may be unstable."
            : "Link not viable at current parameters.";

    els.results.innerHTML = [
      resultRow("FSPL", `${path.toFixed(1)} dB`),
      resultRow("Estimated RSSI", `${rssi.toFixed(1)} dBm`),
      resultRow("Estimated SNR", `${snr.toFixed(1)} dB`),
      resultRow("SNR Margin", `${margin.toFixed(1)} dB`),
      resultRow("Estimated Throughput", `~${est} Mbps`),
      resultRow("Result", status),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        snr,
        margin,
        throughput: est
      }
    }));

    showContinue();
  }

  function reset(){
    els.dist.value=1500;
    els.ghz.value=5.8;
    els.tx.value=23;
    els.txg.value=16;
    els.rxg.value=16;
    els.loss.value=4;
    els.noise.value=-95;
    els.snr.value=25;
    els.results.innerHTML="";
    clearStored();
    hideContinue();
    loadPrior();
  }

  function bindInvalidation(){
    [els.dist, els.ghz, els.tx, els.txg, els.rxg, els.loss, els.noise, els.snr].forEach(el=>{
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