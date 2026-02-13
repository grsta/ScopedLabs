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
    const total=parseFloat($("total").value);
    const used=parseFloat($("used").value);
    const reserve=parseFloat($("reserve").value);

    const free=total-used;
    const reserved=total*(reserve/100);
    const available=free-reserved;

    render([
      {label:"Total Rack RU", value: total},
      {label:"Used RU", value: used},
      {label:"Free RU", value: free},
      {label:"Reserved for Growth", value: reserved.toFixed(1)},
      {label:"Available RU After Reserve", value: available.toFixed(1)}
    ]);
  }

  function reset(){
    $("total").value=42;
    $("used").value=18;
    $("reserve").value=20;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
