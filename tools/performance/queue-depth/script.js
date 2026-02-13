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
    const lambda=parseFloat($("lambda").value);
    const mu=parseFloat($("mu").value);
    const k=Math.max(1, Math.floor(parseFloat($("k").value)));
    const svc=parseFloat($("svc").value);

    const capacity = mu * k;
    const rho = lambda / capacity;

    // crude expected queue depth approximation
    // for rho<1: Q ≈ rho^2 / (1-rho); for rho>=1: runaway
    let q;
    if(rho >= 1){
      q = Infinity;
    } else {
      q = (rho*rho) / (1 - rho);
    }

    // approximate response time
    let rt;
    if(!isFinite(q)){
      rt = Infinity;
    } else {
      const waitMs = (q / lambda) * 1000; // seconds -> ms
      rt = svc + waitMs;
    }

    render([
      {label:"Total Service Capacity", value:`${capacity.toFixed(0)} req/s`},
      {label:"Utilization (ρ)", value:`${rho.toFixed(3)}`},
      {label:"Estimated Queue Depth", value: isFinite(q) ? q.toFixed(2) : "RUNAWAY (ρ ≥ 1)"},
      {label:"Estimated Response Time", value: isFinite(rt) ? `${rt.toFixed(2)} ms` : "UNBOUNDED"},
      {label:"Note", value:"This is a simplified single-queue approximation for planning. Real systems vary."}
    ]);
  }

  function reset(){
    $("lambda").value=900;
    $("mu").value=1200;
    $("k").value=1;
    $("svc").value=4;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
