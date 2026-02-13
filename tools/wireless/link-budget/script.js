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

  // FSPL (dB) using distance in km and frequency in MHz:
  // FSPL = 32.44 + 20log10(d_km) + 20log10(f_MHz)
  function fspl(distFt, ghz){
    const dkm = (distFt * 0.3048) / 1000;
    const fmhz = ghz * 1000;
    return 32.44 + 20*Math.log10(Math.max(1e-6, dkm)) + 20*Math.log10(Math.max(1e-6, fmhz));
  }

  function calc(){
    const ghz=parseFloat($("ghz").value);
    const dist=parseFloat($("dist").value);
    const tx=parseFloat($("tx").value);
    const txg=parseFloat($("txg").value);
    const rxg=parseFloat($("rxg").value);
    const loss=parseFloat($("loss").value);
    const sens=parseFloat($("sens").value);

    const path = fspl(dist, ghz);
    const rssi = tx + txg + rxg - path - loss;
    const margin = rssi - sens;

    let status="OK";
    if(margin < 10) status="MARGINAL";
    if(margin < 0) status="FAIL (below sensitivity)";

    render([
      {label:"FSPL", value:`${path.toFixed(1)} dB`},
      {label:"Estimated RSSI", value:`${rssi.toFixed(1)} dBm`},
      {label:"Sensitivity", value:`${sens.toFixed(1)} dBm`},
      {label:"Link Margin", value:`${margin.toFixed(1)} dB`},
      {label:"Result", value:status},
      {label:"Note", value:"FSPL assumes clear line-of-sight. Walls/foliage/fading can significantly reduce RSSI."}
    ]);
  }

  function reset(){
    $("ghz").value=5.0;
    $("dist").value=300;
    $("tx").value=20;
    $("txg").value=3;
    $("rxg").value=3;
    $("loss").value=5;
    $("sens").value=-67;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
