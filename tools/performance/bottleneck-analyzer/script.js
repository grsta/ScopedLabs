(() => {

  const $ = id => document.getElementById(id);

  function render(rows){
    const el = $("results");
    el.innerHTML = "";
    rows.forEach(r=>{
      const d=document.createElement("div");
      d.className="result-row";
      d.innerHTML = `<span class="result-label">${r.label}</span>
                     <span class="result-value">${r.value}</span>`;
      el.appendChild(d);
    });
  }

  function calc(){
    const metrics = [
      {name:"CPU", val:parseFloat($("cpu").value)},
      {name:"Memory", val:parseFloat($("ram").value)},
      {name:"Disk", val:parseFloat($("disk").value)},
      {name:"Network", val:parseFloat($("net").value)}
    ];

    metrics.sort((a,b)=>b.val-a.val);
    const worst = metrics[0];

    render([
      {label:"Highest Utilization", value:`${worst.name} (${worst.val.toFixed(1)}%)`},
      {label:"Likely Bottleneck", value: worst.val>=80 ? "CRITICAL" : worst.val>=65 ? "WARNING" : "NORMAL"},
      {label:"Recommendation", value:`Investigate ${worst.name} subsystem first`}
    ]);
  }

  function reset(){
    $("cpu").value=70;
    $("ram").value=65;
    $("disk").value=55;
    $("net").value=40;
    $("results").innerHTML="";
  }

  $("calc").onclick = calc;
  $("reset").onclick = reset;

})();
