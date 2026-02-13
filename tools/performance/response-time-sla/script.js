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

  function status(lat, sla){
    if(lat <= sla) return "PASS";
    if(lat <= sla*1.1) return "RISK";
    return "FAIL";
  }

  function calc(){
    const cur=parseFloat($("cur").value);
    const tgt=parseFloat($("tgt").value);
    const sla=parseFloat($("sla").value);
    const eb=parseFloat($("eb").value);

    render([
      {label:"SLA Threshold", value:`${sla.toFixed(1)} ms`},
      {label:"Current Avg", value:`${cur.toFixed(1)} ms (${status(cur,sla)})`},
      {label:"Target Avg", value:`${tgt.toFixed(1)} ms (${status(tgt,sla)})`},
      {label:"Error Budget", value:`${eb.toFixed(2)}%`},
      {label:"Note", value:"SLA compliance often uses percentiles (p95/p99). This tool is a simple average check."}
    ]);
  }

  function reset(){
    $("cur").value=120;
    $("tgt").value=180;
    $("sla").value=200;
    $("eb").value=1;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
