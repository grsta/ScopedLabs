(() => {
  const $ = id => document.getElementById(id);

  function baseRate(snr){
    if(snr >= 35) return 1200;
    if(snr >= 30) return 900;
    if(snr >= 25) return 650;
    if(snr >= 20) return 400;
    if(snr >= 15) return 200;
    return 100;
  }

  function widthMultiplier(w){
    if(w==20) return 0.25;
    if(w==40) return 0.5;
    if(w==80) return 1;
    if(w==160) return 2;
    return 1;
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

  function calc(){
    const snr=parseFloat($("snr").value);
    const width=parseInt($("width").value,10);
    const clients=Math.max(1, parseInt($("clients").value,10));
    const util=parseFloat($("util").value)/100;

    const phy = baseRate(snr) * widthMultiplier(width);
    const usable = phy * Math.max(0.3, util);
    const perClient = usable / clients;

    render([
      {label:"Estimated PHY Rate", value:`${phy.toFixed(0)} Mbps`},
      {label:"Usable Throughput", value:`${usable.toFixed(0)} Mbps`},
      {label:"Clients Sharing AP", value:`${clients}`},
      {label:"Per-Client Avg Throughput", value:`${perClient.toFixed(1)} Mbps`},
      {label:"Note", value:"Planning estimate only. Real rates depend on MCS, airtime efficiency, and interference."}
    ]);
  }

  function reset(){
    $("snr").value=28;
    $("width").value="80";
    $("clients").value=20;
    $("util").value=60;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
