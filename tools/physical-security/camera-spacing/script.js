(() => {
  const $ = id => document.getElementById(id);

  function deg2rad(x){ return x*Math.PI/180; }

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
    const len=parseFloat($("len").value);
    const dist=parseFloat($("dist").value);
    const hfov=parseFloat($("hfov").value);
    const ov=parseFloat($("ov").value)/100;

    const width = 2 * Math.tan(deg2rad(hfov/2)) * dist; // coverage width at distance
    const spacing = width * (1 - ov); // effective spacing while keeping overlap
    const cams = Math.max(1, Math.ceil(len / spacing));

    render([
      {label:"Coverage Width per Camera", value:`${width.toFixed(1)} ft @ ${dist.toFixed(0)} ft`},
      {label:"Overlap Target", value:`${(ov*100).toFixed(0)}%`},
      {label:"Recommended Spacing", value:`${spacing.toFixed(1)} ft`},
      {label:"Perimeter Length", value:`${len.toFixed(0)} ft`},
      {label:"Estimated Cameras Needed", value:`${cams}`}
    ]);
  }

  function reset(){
    $("len").value=300;
    $("dist").value=60;
    $("hfov").value=90;
    $("ov").value=15;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
