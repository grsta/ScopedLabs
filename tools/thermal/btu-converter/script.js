(() => {
  const $ = id => document.getElementById(id);

  const W_TO_BTU = 3.412141633;     // BTU/hr per watt
  const TON_TO_BTU = 12000;         // 1 ton cooling = 12,000 BTU/hr

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

  function convert(){
    const mode=$("mode").value;

    let w=parseFloat($("w").value);
    let btu=parseFloat($("btu").value);
    let tons=parseFloat($("tons").value);

    if(mode==="watts"){
      btu = w * W_TO_BTU;
      tons = btu / TON_TO_BTU;
    } else if(mode==="btu"){
      w = btu / W_TO_BTU;
      tons = btu / TON_TO_BTU;
    } else {
      btu = tons * TON_TO_BTU;
      w = btu / W_TO_BTU;
    }

    $("w").value = isFinite(w) ? w.toFixed(0) : "";
    $("btu").value = isFinite(btu) ? btu.toFixed(0) : "";
    $("tons").value = isFinite(tons) ? tons.toFixed(2) : "";

    render([
      {label:"Watts", value:`${w.toFixed(0)} W`},
      {label:"BTU/hr", value:`${btu.toFixed(0)} BTU/hr`},
      {label:"Cooling Tons", value:`${tons.toFixed(2)} tons`},
      {label:"Note", value:"1 ton = 12,000 BTU/hr. BTU conversion uses 3.412 BTU/hr per watt."}
    ]);
  }

  function reset(){
    $("w").value=3500;
    $("btu").value=11942;
    $("tons").value=1.00;
    $("mode").value="watts";
    $("results").innerHTML="";
  }

  $("calc").onclick=convert;
  $("reset").onclick=reset;
})();
