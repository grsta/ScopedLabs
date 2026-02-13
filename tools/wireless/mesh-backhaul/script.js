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
    const base=parseFloat($("base").value);
    const hops=Math.max(0, parseInt($("hops").value,10));
    const ovh=parseFloat($("ovh").value)/100;
    const ded=$("ded").value==="yes";

    // simple model:
    // - shared radio mesh often halves throughput per hop (airtime reuse)
    // - dedicated backhaul less severe; use ~0.75 per hop as planner
    const hopFactor = ded ? 0.75 : 0.50;
    const afterHops = base * Math.pow(hopFactor, Math.max(1, hops)); // hops>=1 hurts; hops=0 keep base? handle below
    const hopApplied = hops === 0 ? base : afterHops;

    const effective = hopApplied * (1 - Math.max(0, Math.min(0.7, ovh)));

    let status="OK";
    if(effective < 150) status="MARGINAL";
    if(effective < 50) status="POOR";

    render([
      {label:"Base Link", value:`${base.toFixed(0)} Mbps`},
      {label:"Hops", value:`${hops}`},
      {label:"Dedicated Backhaul", value:ded ? "Yes" : "No"},
      {label:"After Hops", value:`${hopApplied.toFixed(0)} Mbps`},
      {label:"After Overhead", value:`${effective.toFixed(0)} Mbps`},
      {label:"Result", value:status},
      {label:"Note", value:"Mesh performance varies widely with RF conditions. Wired backhaul is always preferred when possible."}
    ]);
  }

  function reset(){
    $("base").value=600;
    $("hops").value=2;
    $("ovh").value=25;
    $("ded").value="no";
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
