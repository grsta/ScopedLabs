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
    const dt=parseFloat($("dt").value);        // °F
    const k=parseFloat($("k").value);          // 1.08 default

    // Convert watts to BTU/hr
    const btu = watts * 3.412;

    // CFM = BTU/hr / (k * ΔT)
    const cfm = btu / (k * Math.max(0.1, dt));

    render([
      {label:"Heat Load", value:`${watts.toFixed(0)} W`},
      {label:"Heat Load", value:`${btu.toFixed(0)} BTU/hr`},
      {label:"Allowed ΔT", value:`${dt.toFixed(1)} °F`},
      {label:"Estimated Airflow", value:`${cfm.toFixed(0)} CFM`},
      {label:"Note", value:"Planning estimate. Duct losses, fan curves, and recirculation can increase required airflow."}
    ]);
  }

  function reset(){
    $("w").value=3500;
    $("dt").value=15;
    $("k").value="1.08";
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
