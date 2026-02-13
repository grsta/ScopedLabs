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
    const weight=parseFloat($("weight").value);
    const w=parseFloat($("w").value);
    const d=parseFloat($("d").value);
    const rating=parseFloat($("rating").value);

    const areaSqFt=(w/12)*(d/12);
    const psf=weight/areaSqFt;
    const status= psf<=rating ? "WITHIN LIMIT" : "EXCEEDS RATING";

    render([
      {label:"Rack Footprint Area", value:`${areaSqFt.toFixed(2)} sq ft`},
      {label:"Calculated Load", value:`${psf.toFixed(1)} psf`},
      {label:"Floor Rating", value:`${rating} psf`},
      {label:"Status", value:status}
    ]);
  }

  function reset(){
    $("weight").value=2500;
    $("w").value=24;
    $("d").value=42;
    $("rating").value=150;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
