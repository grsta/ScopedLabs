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

  function estLatency(base, util){
    // simple queueing-style blowup: L = base / (1 - util)
    const denom = Math.max(0.02, 1 - util);
    return base / denom;
  }

  function calc(){
    const baseLat=parseFloat($("baseLat").value);
    const t0=parseFloat($("t0").value);
    const t1=parseFloat($("t1").value);
    const cap=parseFloat($("cap").value);

    const u0 = Math.min(0.98, t0/cap);
    const u1 = Math.min(0.98, t1/cap);

    const l0 = estLatency(baseLat, u0);
    const l1 = estLatency(baseLat, u1);

    render([
      {label:"Current Utilization", value:`${(u0*100).toFixed(1)}%`},
      {label:"Estimated Latency @ Current", value:`${l0.toFixed(1)} ms`},
      {label:"Target Utilization", value:`${(u1*100).toFixed(1)}%`},
      {label:"Estimated Latency @ Target", value:`${l1.toFixed(1)} ms`},
      {label:"Latency Increase", value:`${((l1/l0-1)*100).toFixed(1)}%`},
      {label:"Note", value:"This is a simplified approximation; real latency depends on burstiness and queueing discipline."}
    ]);
  }

  function reset(){
    $("baseLat").value=25;
    $("t0").value=1200;
    $("t1").value=1800;
    $("cap").value=2000;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
