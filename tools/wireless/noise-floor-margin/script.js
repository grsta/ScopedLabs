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

  function qualityLabel(snr){
    if(snr >= 30) return "Excellent";
    if(snr >= 25) return "Good";
    if(snr >= 20) return "Fair";
    if(snr >= 15) return "Poor";
    return "Very Poor";
  }

  function calc(){
    const sig=parseFloat($("sig").value);
    const noise=parseFloat($("noise").value);
    const target=parseFloat($("target").value);

    const snr = sig - noise;
    const margin = snr - target;

    let status="MEETS TARGET";
    if(margin < 0) status="BELOW TARGET";

    render([
      {label:"Signal (RSSI)", value:`${sig.toFixed(1)} dBm`},
      {label:"Noise Floor", value:`${noise.toFixed(1)} dBm`},
      {label:"SNR", value:`${snr.toFixed(1)} dB (${qualityLabel(snr)})`},
      {label:"Target SNR", value:`${target.toFixed(1)} dB`},
      {label:"Margin", value:`${margin.toFixed(1)} dB`},
      {label:"Result", value:status},
      {label:"Note", value:"Higher SNR generally enables higher MCS rates and more reliable roaming."}
    ]);
  }

  function reset(){
    $("sig").value=-62;
    $("noise").value=-95;
    $("target").value=25;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
