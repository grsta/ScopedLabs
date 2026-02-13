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
    const ppp=parseFloat($("ppp").value);
    const pw=parseFloat($("pw").value);

    const pixelsPerFoot = res / (2 * Math.tan(deg2rad(hfov/2)));
    const dist = (ppp / pixelsPerFoot) * (1/pw);

    render([
      {label:"Horizontal Resolution", value:`${res.toFixed(0)} px`},
      {label:"Pixels per Plate Target", value:`${ppp.toFixed(0)} px`},
      {label:"Estimated Capture Distance", value:`${dist.toFixed(1)} ft`},
      {label:"Note", value:"Reflective plates, shutter speed, and lighting strongly affect real-world performance."}
    ]);
  }

  function reset(){
    $("res").value=3840;
    $("hfov").value=50;
    $("ppp").value=130;
    $("pw").value=1.0;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
