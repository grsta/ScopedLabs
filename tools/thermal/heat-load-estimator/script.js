(() => {
  const $ = id => document.getElementById(id);
  const W_TO_BTU = 3.412141633;

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
    const w=parseFloat($("w").value);
    const qty=parseFloat($("qty").value);
    const util=parseFloat($("util").value)/100;
    const m=parseFloat($("m").value)/100;

    const raw = w * qty;
    const avg = raw * util;
    const withMargin = avg * (1 + m);

    const btu = withMargin * W_TO_BTU;

    render([
      {label:"Nameplate Total", value:`${raw.toFixed(0)} W`},
      {label:"Avg @ Utilization", value:`${avg.toFixed(0)} W`},
      {label:"With Safety Margin", value:`${withMargin.toFixed(0)} W`},
      {label:"Heat Load", value:`${btu.toFixed(0)} BTU/hr`},
      {label:"Note", value:"Most electrical power consumed becomes heat. Validate with measured draw where possible."}
    ]);
  }

  function reset(){
    $("w").value=350;
    $("qty").value=10;
    $("util").value=70;
    $("m").value=15;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
