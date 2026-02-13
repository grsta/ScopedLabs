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
    const condDia=parseFloat($("condDia").value);
    const cableDia=parseFloat($("cableDia").value);
    const count=parseInt($("count").value);
    const limit=parseFloat($("limit").value);

    const conduitArea=Math.PI*Math.pow(condDia/2,2);
    const cableArea=Math.PI*Math.pow(cableDia/2,2)*count;
    const fillPct=(cableArea/conduitArea)*100;

    render([
      {label:"Conduit Area",value:`${conduitArea.toFixed(2)} in²`},
      {label:"Cable Area",value:`${cableArea.toFixed(2)} in²`},
      {label:"Fill Percentage",value:`${fillPct.toFixed(1)} %`},
      {label:"Status",value: fillPct<=limit ? "PASS" : "EXCEEDS LIMIT"}
    ]);
  }

  function reset(){
    $("condDia").value=1.0;
    $("cableDia").value=0.30;
    $("count").value=3;
    $("limit").value=40;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
