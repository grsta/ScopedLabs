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
    const ppf=parseFloat($("ppf").value);
    const fw=parseFloat($("fw").value);

    // pixels per foot across scene width
    const pixelsPerFoot = res / (2 * Math.tan(deg2rad(hfov/2)));

    // distance where face width spans ppf pixels
    const dist = (ppf / pixelsPerFoot) * (1);

    render([
      {label:"Horizontal Resolution", value:`${res.toFixed(0)} px`},
      {label:"Target Pixels per Face", value:`${ppf.toFixed(0)} px`},
      {label:"Estimated Recognition Distance", value:`${dist.toFixed(1)} ft`},
      {label:"Note", value:"Typical recognition targets: 200–300 px/face. Lighting and angle matter."}
    ]);
  }

  function reset(){
    $("res").value=3840;
    $("hfov").value=90;
    $("ppf").value=250;
    $("fw").value=0.6;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
