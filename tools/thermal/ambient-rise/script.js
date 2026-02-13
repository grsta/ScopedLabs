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
    const watts=parseFloat($("w").value);
    const cfm=parseFloat($("cfm").value);
    const k=parseFloat($("k").value);

    const btu = watts * 3.412;
    // ΔT = BTU/hr / (k * CFM)
    const dt = btu / (k * Math.max(1, cfm));

    render([
      {label:"Heat Load", value:`${watts.toFixed(0)} W`},
      {label:"Heat Load", value:`${btu.toFixed(0)} BTU/hr`},
      {label:"Available Airflow", value:`${cfm.toFixed(0)} CFM`},
      {label:"Estimated ΔT", value:`${dt.toFixed(1)} °F`},
      {label:"Note", value:"Planning estimate. Recirculation and hot spots can create higher local temperature rise."}
    ]);
  }

  function reset(){
    $("w").value=3500;
    $("cfm").value=800;
    $("k").value="1.08";
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
