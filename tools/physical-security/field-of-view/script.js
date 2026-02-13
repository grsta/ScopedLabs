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
    const hfov=parseFloat($("hfov").value);
    const vfov=parseFloat($("vfov").value);
    const dist=parseFloat($("dist").value);

    const width = 2 * Math.tan(deg2rad(hfov/2)) * dist;
    const height = 2 * Math.tan(deg2rad(vfov/2)) * dist;

    render([
      {label:"Coverage Width", value:`${width.toFixed(1)} ft`},
      {label:"Coverage Height", value:`${height.toFixed(1)} ft`},
      {label:"Distance", value:`${dist.toFixed(0)} ft`}
    ]);
  }

  function reset(){
    $("hfov").value=90;
    $("vfov").value=55;
    $("dist").value=60;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
