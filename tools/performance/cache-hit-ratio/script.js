(() => {
  const $ = id => document.getElementById(id);

  function render(rows){
    const el = $("results");
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
    const rps=parseFloat($("rps").value);
    const hit=parseFloat($("hit").value)/100;
    const hitLat=parseFloat($("hitLat").value);
    const missLat=parseFloat($("missLat").value);

    const miss = 1-hit;
    const avgLat = (hit*hitLat) + (miss*missLat);

    const missRps = rps*miss;
    const hitRps = rps*hit;

    render([
      {label:"Hit Requests/sec", value: hitRps.toFixed(0)},
      {label:"Miss Requests/sec", value: missRps.toFixed(0)},
      {label:"Avg Latency", value: `${avgLat.toFixed(2)} ms`},
      {label:"Miss Penalty", value: `${(missLat-hitLat).toFixed(2)} ms per miss`}
    ]);
  }

  function reset(){
    $("rps").value=5000;
    $("hit").value=85;
    $("hitLat").value=2;
    $("missLat").value=40;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
