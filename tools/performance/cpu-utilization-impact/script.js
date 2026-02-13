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

  function blowup(lat, u){
    // simple queueing-inspired blowup: L' = L / (1 - u)
    // u in [0,1)
    const denom = Math.max(0.01, 1 - u);
    return lat / denom;
  }

  function calc(){
    const u = parseFloat($("u").value)/100;
    const u2 = parseFloat($("u2").value)/100;
    const lat = parseFloat($("lat").value);
    const head = parseFloat($("head").value)/100;

    const cur = blowup(lat, Math.min(0.99, u));
    const tgt = blowup(lat, Math.min(0.99, u2));

    const safeUtil = 1 - head;

    render([
      {label:"Baseline Latency", value:`${lat.toFixed(1)} ms`},
      {label:"Estimated Latency @ Current", value:`${cur.toFixed(1)} ms`},
      {label:"Estimated Latency @ Target", value:`${tgt.toFixed(1)} ms`},
      {label:"Recommended Max Util (headroom)", value:`${(safeUtil*100).toFixed(0)}%`},
      {label:"Note", value:"This is a simplified approximation; real systems depend on queueing, burstiness, and scheduling."}
    ]);
  }

  function reset(){
    $("u").value=65;
    $("u2").value=85;
    $("lat").value=25;
    $("head").value=20;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
