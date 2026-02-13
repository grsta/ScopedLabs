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
    const w=parseFloat($("w").value);
    const d=parseFloat($("d").value);
    const fc=parseFloat($("fc").value);
    const uf=parseFloat($("uf").value)/100;
    const llf=parseFloat($("llf").value)/100;

    const area = w*d; // sq ft
    // Lumens needed: lumens = fc * area / (UF * LLF)
    const lumens = (fc * area) / Math.max(0.05, (uf*llf));

    render([
      {label:"Area", value:`${area.toFixed(0)} sq ft`},
      {label:"Target Illumination", value:`${fc.toFixed(2)} fc`},
      {label:"Utilization Factor", value:`${(uf*100).toFixed(0)}%`},
      {label:"Light Loss Factor", value:`${(llf*100).toFixed(0)}%`},
      {label:"Estimated Lumens Required", value:`${lumens.toFixed(0)} lm`},
      {label:"Note", value:"This is a planning estimate. Fixture optics, mounting height, and surface reflectance affect results."}
    ]);
  }

  function reset(){
    $("w").value=60;
    $("d").value=40;
    $("fc").value=2.0;
    $("uf").value=70;
    $("llf").value=80;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
