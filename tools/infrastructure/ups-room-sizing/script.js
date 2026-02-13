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
    const ups=parseFloat($("ups").value);
    const batt=parseFloat($("batt").value);
    const areaEach=parseFloat($("areaEach").value);
    const factor=parseFloat($("factor").value);

    const totalCab=ups + batt;
    const baseArea=totalCab * areaEach;
    const finalArea=baseArea * factor;

    render([
      {label:"Total Cabinets", value: totalCab},
      {label:"Base Area", value:`${baseArea.toFixed(0)} sq ft`},
      {label:"Clearance Factor", value:`${factor.toFixed(1)}×`},
      {label:"Estimated UPS Room Size", value:`${finalArea.toFixed(0)} sq ft`}
    ]);
  }

  function reset(){
    $("ups").value=2;
    $("batt").value=4;
    $("areaEach").value=20;
    $("factor").value=1.5;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();

