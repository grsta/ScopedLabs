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
    const res=parseFloat($("res").value);
    const hfov=parseFloat($("hfov").value);
    const dist=parseFloat($("dist").value);
    const tppf=parseFloat($("tppf").value);
    const tw=parseFloat($("tw").value);

    // scene width at distance (ft): W = 2*tan(hfov/2)*dist
    const sceneW = 2 * Math.tan(deg2rad(hfov/2)) * dist;

    const ppf = res / sceneW;

    // distance where target width gets desired PPF:
    // ppf = res / (2*tan(hfov/2)*dist) -> dist = res / (2*tan(hfov/2)*ppf)
    const distForTppf = res / (2 * Math.tan(deg2rad(hfov/2)) * tppf);

    const pixelsOnTarget = ppf * tw;

    render([
      {label:"Scene Width @ Distance", value:`${sceneW.toFixed(1)} ft`},
      {label:"Pixel Density (PPF)", value:`${ppf.toFixed(1)} px/ft`},
      {label:"Pixels on Target Width", value:`${pixelsOnTarget.toFixed(0)} px`},
      {label:"Distance for Target PPF", value:`${distForTppf.toFixed(1)} ft`},
      {label:"Note", value:"Typical targets: detect ~20 PPF, observe ~40 PPF, recognize ~80 PPF, identify ~120+ PPF (varies by standard)."}
    ]);
  }

  function reset(){
    $("res").value=3840;
    $("hfov").value=90;
    $("dist").value=60;
    $("tppf").value=80;
    $("tw").value=10;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
