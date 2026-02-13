(() => {
  const $ = id => document.getElementById(id);

  function render(rows){
    const el = $("results");
    el.innerHTML = "";
    rows.forEach(r=>{
      const d=document.createElement("div");
      d.className="result-row";
      d.innerHTML=`<span class="result-label">${r.label}</span>
                   <span class="result-value">${r.value}</span>`;
      el.appendChild(d);
    });
  }

  function calc(){
    const trayW = parseFloat($("trayW").value);
    const trayD = parseFloat($("trayD").value);
    const cableDia = parseFloat($("cableDia").value);
    const count = parseInt($("count").value);
    const maxFill = parseFloat($("maxFill").value);

    const trayArea = trayW * trayD;
    const cableArea = Math.PI * Math.pow(cableDia/2,2);
    const totalCableArea = cableArea * count;

    const fillPct = (totalCableArea / trayArea) * 100;
    const status = fillPct <= maxFill ? "PASS" : "EXCEEDS LIMIT";

    render([
      {label:"Tray Area", value:`${trayArea.toFixed(2)} in²`},
      {label:"Total Cable Area", value:`${totalCableArea.toFixed(2)} in²`},
      {label:"Fill Percentage", value:`${fillPct.toFixed(1)} %`},
      {label:"Status", value:status}
    ]);
  }

  function reset(){
    $("trayW").value=12;
    $("trayD").value=4;
    $("cableDia").value=0.30;
    $("count").value=50;
    $("maxFill").value=50;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
