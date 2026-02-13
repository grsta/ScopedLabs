(() => {
  const $ = id => document.getElementById(id);

  // FSPL = 32.44 + 20log10(d_km) + 20log10(f_MHz)
  function fspl(distFt, ghz){
    const dkm = (distFt * 0.3048) / 1000;
    const fmhz = ghz * 1000;
    return 32.44 + 20*Math.log10(Math.max(1e-6, dkm)) + 20*Math.log10(Math.max(1e-6, fmhz));
  }

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

  function throughputGuess(snr){
    // very rough mapping (Mbps) for planning only
    if(snr >= 35) return 700;
    if(snr >= 30) return 550;
    if(snr >= 25) return 400;
    if(snr >= 20) return 250;
    if(snr >= 15) return 120;
    return 50;
  }

  function calc(){
    const dist=parseFloat($("dist").value);
    const ghz=parseFloat($("ghz").value);
    const tx=parseFloat($("tx").value);
    const txg=parseFloat($("txg").value);
    const rxg=parseFloat($("rxg").value);
    const loss=parseFloat($("loss").value);
    const noise=parseFloat($("noise").value);
    const target=parseFloat($("snr").value);

    const path = fspl(dist, ghz);
    const rssi = tx + txg + rxg - path - loss;
    const snr = rssi - noise;
    const margin = snr - target;

    let status="OK";
    if(margin < 10) status="MARGINAL";
    if(margin < 0) status="FAIL";

    const est = throughputGuess(snr);

    render([
      {label:"FSPL", value:`${path.toFixed(1)} dB`},
      {label:"Estimated RSSI", value:`${rssi.toFixed(1)} dBm`},
      {label:"Noise Floor", value:`${noise.toFixed(1)} dBm`},
      {label:"Estimated SNR", value:`${snr.toFixed(1)} dB`},
      {label:"SNR Margin vs Target", value:`${margin.toFixed(1)} dB`},
      {label:"Estimated Throughput (rough)", value:`~${est} Mbps`},
      {label:"Result", value:status},
      {label:"Note", value:"Planning-only. Fresnel clearance, alignment, weather fade, and interference can change real performance."}
    ]);
  }

  function reset(){
    $("dist").value=1500;
    $("ghz").value=5.8;
    $("tx").value=23;
    $("txg").value=16;
    $("rxg").value=16;
    $("loss").value=4;
    $("noise").value=-95;
    $("snr").value=25;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
