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
    const ov=parseFloat($("ov").value)/100;

    const halfW = Math.tan(deg2rad(hfov/2))*dist;
    const halfH = Math.tan(deg2rad(vfov/2))*dist;

    const width = halfW*2;
    const height = halfH*2;

    const effWidth = width*(1-ov);
    const effHeight = height*(1-ov);

    const area = width*height;
    const effArea = effWidth*effHeight;

    render([
      {label:"Coverage Width", value:`${width.toFixed(1)} ft`},
      {label:"Coverage Height", value:`${height.toFixed(1)} ft`},
      {label:"Coverage Area", value:`${area.toFixed(0)} sq ft`},
      {label:"Overlap Reserve", value:`${(ov*100).toFixed(0)}%`},
      {label:"Effective Width", value:`${effWidth.toFixed(1)} ft`},
      {label:"Effective Area", value:`${effArea.toFixed(0)} sq ft`}
    ]);
  }

  function reset(){
    $("hfov").value=90;
    $("vfov").value=55;
    $("dist").value=60;
    $("ov").value=15;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
