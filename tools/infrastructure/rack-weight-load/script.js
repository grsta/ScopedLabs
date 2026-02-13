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
    const count=parseFloat($("count").value);
    const each=parseFloat($("each").value);
    const cap=parseFloat($("cap").value);

    const total=count*each;
    const status= total<=cap ? "WITHIN CAPACITY" : "OVER CAPACITY";

    render([
      {label:"Devices", value: count},
      {label:"Total Weight", value: `${total.toFixed(0)} lbs`},
      {label:"Rack Capacity", value: `${cap.toFixed(0)} lbs`},
      {label:"Status", value: status}
    ]);
  }

  function reset(){
    $("count").value=20;
    $("each").value=35;
    $("cap").value=3000;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
