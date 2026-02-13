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
    const req=parseFloat($("req").value);
    const fan=parseFloat($("fan").value);
    const derate=parseFloat($("derate").value)/100;
    const red=parseInt($("red").value,10);

    const effFan = fan * (1 - derate);
    const n = Math.max(1, Math.ceil(req / Math.max(1, effFan)));
    const total = n + red;
    const provided = total * effFan;

    render([
      {label:"Effective CFM per Fan", value:`${effFan.toFixed(1)} CFM`},
      {label:"Fans Needed (base)", value:`${n}`},
      {label:"Redundancy Added", value:`${red ? `N+${red}` : "None"}`},
      {label:"Total Fans", value:`${total}`},
      {label:"Estimated Provided Airflow", value:`${provided.toFixed(0)} CFM`},
      {label:"Note", value:"Derating accounts for filters, grills, and duct restrictions. Validate with fan curves."}
    ]);
  }

  function reset(){
    $("req").value=800;
    $("fan").value=120;
    $("derate").value=25;
    $("red").value="0";
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
