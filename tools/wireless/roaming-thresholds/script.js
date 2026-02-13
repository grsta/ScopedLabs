(() => {
  const $ = id => document.getElementById(id);

  function render(rows){
    const el=$("results");
    el.innerHTML="";
    rows.forEach(r=>{
      const d=document.createElement("div");
      d.className="result-row";
      d.innerHTML=`<span class="result-label">${r.label}</span>
                   <span class="result-value">${r.value}</span>`;
      el.appendChild(d);
    });
  }

  function calc(){
    const min=parseFloat($("min").value);
    const pref=parseFloat($("pref").value);
    const snr=parseFloat($("snr").value);
    const band=$("band").value;

    const roamTrigger = min + 3;      // start roaming a bit before minimum
    const stickyLow = min - 5;        // force roam / deauth if supported

    render([
      {label:"Preferred RSSI", value:`${pref.toFixed(0)} dBm`},
      {label:"Roam Trigger RSSI", value:`${roamTrigger.toFixed(0)} dBm`},
      {label:"Minimum Service RSSI", value:`${min.toFixed(0)} dBm`},
      {label:"Low-RSSI Cutoff", value:`${stickyLow.toFixed(0)} dBm`},
      {label:"Target SNR", value:`${snr.toFixed(0)} dB`},
      {label:"Band Steering", value: band==="5" ? "Prefer 5/6 GHz" : "Allow 2.4 GHz"},
      {label:"Note", value:"Exact behavior depends on vendor roaming and band-steering algorithms."}
    ]);
  }

  function reset(){
    $("min").value=-67;
    $("pref").value=-60;
    $("snr").value=25;
    $("band").value="5";
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
