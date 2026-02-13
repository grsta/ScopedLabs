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
    const w=parseFloat($("w").value);
    const d=parseFloat($("d").value);
    const clients=parseFloat($("clients").value);
    const cpa=parseFloat($("cpa").value);
    const factor=parseFloat($("factor").value);

    const area = w*d; // sq ft
    const baseAps = Math.max(1, Math.ceil(clients / Math.max(1, cpa)));
    const adjusted = Math.max(1, Math.ceil(baseAps * Math.max(0.5, Math.min(1.5, factor))));
    const density = clients / Math.max(1, area);

    render([
      {label:"Area", value:`${area.toFixed(0)} sq ft`},
      {label:"Client Density", value:`${density.toFixed(4)} clients/sq ft`},
      {label:"Base APs (by clients/AP)", value:`${baseAps}`},
      {label:"Coverage Factor", value:`${factor.toFixed(2)}×`},
      {label:"Recommended AP Count", value:`${adjusted}`},
      {label:"Note", value:"Coverage factor accounts for walls, attenuation, and capacity headroom. Validate with RF survey."}
    ]);
  }

  function reset(){
    $("w").value=120;
    $("d").value=80;
    $("clients").value=200;
    $("cpa").value=35;
    $("factor").value=1.0;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();

