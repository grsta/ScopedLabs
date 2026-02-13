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
    const tin=parseFloat($("tin").value);
    const watts=parseFloat($("w").value);
    const cfm=parseFloat($("cfm").value);
    const k=parseFloat($("k").value);

    const btu = watts * 3.412;
    const dt = btu / (k * Math.max(1, cfm));
    const tout = tin + dt;

    render([
      {label:"Inlet Temp", value:`${tin.toFixed(1)} °F`},
      {label:"Heat Load", value:`${watts.toFixed(0)} W (${btu.toFixed(0)} BTU/hr)`},
      {label:"Airflow", value:`${cfm.toFixed(0)} CFM`},
      {label:"Estimated ΔT", value:`${dt.toFixed(1)} °F`},
      {label:"Estimated Exhaust Temp", value:`${tout.toFixed(1)} °F`},
      {label:"Note", value:"Planning estimate. Real exhaust temperature depends on mixing, ducting, and recirculation."}
    ]);
  }

  function reset(){
    $("tin").value=72;
    $("w").value=3500;
    $("cfm").value=900;
    $("k").value="1.08";
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
