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
    const clients=parseFloat($("clients").value);
    const mbps=parseFloat($("mbps").value);
    const util=parseFloat($("util").value)/100;
    const apcap=parseFloat($("apcap").value);
    const maxc=parseFloat($("maxc").value);

    const totalDemand = clients * mbps;              // Mbps
    const usablePerAP = apcap * Math.max(0.05, util);

    const byThroughput = Math.max(1, Math.ceil(totalDemand / usablePerAP));
    const byClients = Math.max(1, Math.ceil(clients / Math.max(1, maxc)));

    const recommended = Math.max(byThroughput, byClients);

    render([
      {label:"Total Client Demand", value:`${totalDemand.toFixed(1)} Mbps`},
      {label:"Usable per AP (utilized)", value:`${usablePerAP.toFixed(1)} Mbps`},
      {label:"APs by Throughput", value:`${byThroughput}`},
      {label:"APs by Client Limit", value:`${byClients}`},
      {label:"Recommended AP Count", value:`${recommended}`},
      {label:"Note", value:"Planning estimate. Real capacity depends on RF, channel width, MCS, interference, and airtime overhead."}
    ]);
  }

  function reset(){
    $("clients").value=150;
    $("mbps").value=3;
    $("util").value=60;
    $("apcap").value=300;
    $("maxc").value=35;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
