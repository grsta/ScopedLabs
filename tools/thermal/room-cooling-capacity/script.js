(() => {
  const $ = id => document.getElementById(id);
  const W_TO_BTU = 3.412141633;
  const TON_BTU = 12000;

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
    const m=parseFloat($("m").value)/100;

    const w2 = w * (1 + m);
    const btu = w2 * W_TO_BTU;
    const tons = btu / TON_BTU;

    render([
      {label:"Base Heat Load", value:`${w.toFixed(0)} W`},
      {label:"With Margin", value:`${w2.toFixed(0)} W`},
      {label:"Cooling Required", value:`${btu.toFixed(0)} BTU/hr`},
      {label:"Cooling Required", value:`${tons.toFixed(2)} tons`},
      {label:"Note", value:"Capacity planning only. Consider redundancy, latent load, and heat sources outside IT load."}
    ]);
  }

  function reset(){
    $("w").value=12000;
    $("m").value=20;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
