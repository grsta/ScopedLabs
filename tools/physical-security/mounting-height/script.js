(() => {
  const $ = id => document.getElementById(id);
  function rad2deg(x){ return x*180/Math.PI; }
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
    const h=parseFloat($("h").value);
    const dist=parseFloat($("dist").value);
    const th=parseFloat($("th").value);
    const vfov=parseFloat($("vfov").value);

    const drop = h - th;
    const tilt = rad2deg(Math.atan2(drop, dist)); // degrees downward to hit target height at distance

    // approximate vertical coverage span at that distance
    const span = 2 * Math.tan(deg2rad(vfov/2)) * dist;

    render([
      {label:"Vertical Drop (mount - target)", value:`${drop.toFixed(2)} ft`},
      {label:"Suggested Down-Tilt", value:`${tilt.toFixed(1)}°`},
      {label:"Vertical Coverage Span @ Distance", value:`${span.toFixed(1)} ft`},
      {label:"Note", value:"Verify with actual lens VFOV, install constraints, and desired face/plate angles."}
    ]);
  }

  function reset(){
    $("h").value=12;
    $("dist").value=40;
    $("th").value=5.5;
    $("vfov").value=55;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
