(() => {
  const $ = id => document.getElementById(id);
  const KW_TO_BTU = 3412.14;

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
    const kw=parseFloat($("kw").value);
    const ru=parseFloat($("ru").value);

    const btu = kw * KW_TO_BTU;
    const perRU = btu / Math.max(1, ru);

    render([
      {label:"Rack Load", value:`${kw.toFixed(2)} kW`},
      {label:"Total Heat", value:`${btu.toFixed(0)} BTU/hr`},
      {label:"Heat per RU", value:`${perRU.toFixed(0)} BTU/hr/RU`},
      {label:"Note", value:"High BTU/RU may require in-row or rear-door cooling."}
    ]);
  }

  function reset(){
    $("kw").value=8;
    $("ru").value=42;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
