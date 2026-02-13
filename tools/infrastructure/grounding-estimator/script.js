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

  function sizeFromAmps(amps, mat){
    // Simplified rule-of-thumb mapping
    if(mat==="cu"){
      if(amps<=60) return "10 AWG";
      if(amps<=100) return "8 AWG";
      if(amps<=200) return "6 AWG";
      if(amps<=400) return "4 AWG";
      return "2 AWG or larger";
    } else {
      if(amps<=60) return "8 AWG Al";
      if(amps<=100) return "6 AWG Al";
      if(amps<=200) return "4 AWG Al";
      if(amps<=400) return "2 AWG Al";
      return "1/0 Al or larger";
    }
  }

  function calc(){
    const amps=parseFloat($("amps").value);
    const mat=$("mat").value;
    const res=parseFloat($("res").value);

    const size=sizeFromAmps(amps,mat);

    render([
      {label:"Circuit Current", value:`${amps.toFixed(0)} A`},
      {label:"Material", value: mat==="cu"?"Copper":"Aluminum"},
      {label:"Suggested Ground Conductor", value:size},
      {label:"Target Resistance", value:`${res.toFixed(1)} Ω`},
      {label:"Note", value:"Use NEC/CEC tables for final sizing. Consider multiple ground rods or ground ring if resistance target is not met."}
    ]);
  }

  function reset(){
    $("amps").value=60;
    $("mat").value="cu";
    $("res").value=5;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
