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

  function fmtHours(h){
    if(!isFinite(h) || h<=0) return "—";
    const days=Math.floor(h/24);
    const rem=h - days*24;
    const hrs=Math.floor(rem);
    const mins=Math.round((rem-hrs)*60);
    if(days>0) return `${days}d ${hrs}h ${mins}m`;
    return `${hrs}h ${mins}m`;
  }

  function calc(){
    const fuel=parseFloat($("fuel").value);
    const rate=parseFloat($("rate").value);
    const load=parseFloat($("load").value);
    const reserve=parseFloat($("reserve").value);

    const usableFuel = fuel * (1 - reserve/100);
    const effRate = rate * load;

    const hours = usableFuel / effRate;

    render([
      {label:"Usable Fuel", value:`${usableFuel.toFixed(1)} gal`},
      {label:"Effective Burn Rate", value:`${effRate.toFixed(2)} gal/hr`},
      {label:"Estimated Runtime", value: fmtHours(hours)},
      {label:"Note", value:"Consumption varies by generator model and load. Use manufacturer curves when available."}
    ]);
  }

  function reset(){
    $("fuel").value=100;
    $("rate").value=4.0;
    $("load").value="0.75";
    $("reserve").value=10;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
