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
    const racks=parseInt($("racks").value,10);
    const kw=parseFloat($("kw").value);
    const cooling=$("cooling").value;
    const contain=$("contain").value;

    let layout="Cold aisles facing each other, hot aisles facing each other.";
    let containRec="Containment optional.";

    if(contain==="cold") containRec="Implement Cold Aisle Containment (CAC).";
    if(contain==="hot") containRec="Implement Hot Aisle Containment (HAC).";

    let delivery="";
    if(cooling==="perimeter") delivery="Ensure cold air paths to cold aisles; manage return air above hot aisles.";
    if(cooling==="inrow") delivery="Align racks so in-row units feed cold aisles directly.";
    if(cooling==="overhead") delivery="Place perforated tiles or diffusers above cold aisles.";

    const totalKW = racks * kw;

    render([
      {label:"Total IT Load", value:`${totalKW.toFixed(1)} kW`},
      {label:"Recommended Layout", value:layout},
      {label:"Containment", value:containRec},
      {label:"Cooling Delivery", value:delivery},
      {label:"Note", value:"Hot/cold aisle alignment reduces mixing and improves cooling efficiency."}
    ]);
  }

  function reset(){
    $("racks").value=10;
    $("kw").value=5;
    $("cooling").value="perimeter";
    $("contain").value="none";
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();

