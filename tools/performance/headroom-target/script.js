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
    const u=parseFloat($("u").value)/100;
    const h=parseFloat($("h").value)/100;
    const cap=parseFloat($("cap").value);
    const unit=$("unit").value;

    const safeUtil = 1 - h;
    const maxLoad = cap * safeUtil;

    const currentLoad = cap * u;

    render([
      {label:"Current Load", value:`${currentLoad.toFixed(1)} ${unit}`},
      {label:"Desired Headroom", value:`${(h*100).toFixed(0)}%`},
      {label:"Recommended Max Load", value:`${maxLoad.toFixed(1)} ${unit}`},
      {label:"Recommended Max Utilization", value:`${(safeUtil*100).toFixed(0)}%`}
    ]);
  }

  function reset(){
    $("u").value=60;
    $("h").value=25;
    $("cap").value=1000;
    $("unit").value="req/s";
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
