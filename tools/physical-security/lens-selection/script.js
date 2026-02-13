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
    const dist=parseFloat($("dist").value);
    const tw=parseFloat($("tw").value);
    const sw=parseFloat($("sw").value);

    // thin-lens approximation: focal = (sensor_width * distance) / target_width
    const focal = (sw * dist) / tw;

    let classHint;
    if(focal < 3) classHint="Ultra-Wide (2.8mm)";
    else if(focal < 5) classHint="Wide (4mm)";
    else if(focal < 8) classHint="Mid (6mm)";
    else if(focal < 12) classHint="Telephoto (8–12mm)";
    else classHint="Long Range (12mm+)";

    render([
      {label:"Estimated Focal Length", value:`${focal.toFixed(1)} mm`},
      {label:"Suggested Lens Class", value:classHint},
      {label:"Note", value:"Verify using manufacturer FOV tables and required pixel density."}
    ]);
  }

  function reset(){
    $("dist").value=80;
    $("tw").value=20;
    $("sw").value=6.4;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
