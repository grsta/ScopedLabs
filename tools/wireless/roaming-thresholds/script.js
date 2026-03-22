(() => {
  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const CATEGORY = "wireless";
  const STEP = "roaming-thresholds";

  const $ = id => document.getElementById(id);

  const els = {
    min: $("min"),
    pref: $("pref"),
    snr: $("snr"),
    band: $("band"),
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
    els.results.innerHTML="";
  }

  function loadPrior(){
    els.flowNote.style.display="none";
    els.flowNote.innerHTML="";

    let saved=null;
    try{
      saved=JSON.parse(sessionStorage.getItem(STORAGE_KEY)||"null");
    }catch{}

    if(!saved || saved.category!==CATEGORY || saved.step!=="ptp-wireless-link") return;

    const d=saved.data||{};

    els.flowNote.innerHTML = `
      <strong>Carried over context</strong><br>
      Link SNR: <strong>${d.snr ?? "—"} dB</strong>,
      Throughput: <strong>${d.throughput ?? "—"} Mbps</strong>.
      Use this step to finalize roaming behavior across the network.
    `;

    els.flowNote.style.display="";
  }

  function calculate(){
    const min=parseFloat(els.min.value);
    const pref=parseFloat(els.pref.value);
    const snr=parseFloat(els.snr.value);
    const band=els.band.value;

    if(!Number.isFinite(min) || !Number.isFinite(pref)){
      els.results.innerHTML = resultRow("Status","Invalid input");
      clearStored();
      return;
    }

    const roamTrigger = min + 3;
    const stickyLow = min - 5;

    const interpretation =
      roamTrigger > -65
        ? "Aggressive roaming thresholds will push clients to move quickly but may increase roaming events."
        : roamTrigger > -70
          ? "Balanced roaming thresholds suitable for most enterprise environments."
          : "Relaxed thresholds may cause sticky clients and delayed roaming.";

    els.results.innerHTML = [
      resultRow("Preferred RSSI", `${pref.toFixed(0)} dBm`),
      resultRow("Roam Trigger RSSI", `${roamTrigger.toFixed(0)} dBm`),
      resultRow("Minimum Service RSSI", `${min.toFixed(0)} dBm`),
      resultRow("Low-RSSI Cutoff", `${stickyLow.toFixed(0)} dBm`),
      resultRow("Target SNR", `${snr.toFixed(0)} dB`),
      resultRow("Band Steering", band==="5" ? "Prefer 5/6 GHz" : "Allow 2.4 GHz"),
      resultRow("Engineering Interpretation", interpretation)
    ].join("");

    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: CATEGORY,
      step: STEP,
      data: {
        roamTrigger,
        stickyLow
      }
    }));
  }

  function reset(){
    els.min.value=-67;
    els.pref.value=-60;
    els.snr.value=25;
    els.band.value="5";
    els.results.innerHTML="";
    clearStored();
    loadPrior();
  }

  function bindInvalidation(){
    [els.min, els.pref, els.snr, els.band].forEach(el=>{
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
