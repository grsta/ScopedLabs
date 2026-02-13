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
    const equip=parseFloat($("equip").value);
    const factor=parseFloat($("factor").value);
    const growth=parseFloat($("growth").value);

    const base = equip * factor;
    const total = base * (1 + growth/100);

    render([
      {label:"Equipment Footprint", value:`${equip.toFixed(0)} sq ft`},
      {label:"Clearance Factor", value:`${factor.toFixed(1)}×`},
      {label:"Base Room Size", value:`${base.toFixed(0)} sq ft`},
      {label:"Growth Reserve", value:`${growth.toFixed(0)}%`},
      {label:"Estimated Room Size", value:`${total.toFixed(0)} sq ft`}
    ]);
  }

  function reset(){
    $("equip").value=250;
    $("factor").value=2.0;
    $("growth").value=20;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();

