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
    const load=parseFloat($("load").value);
    const eff=parseFloat($("eff").value)/100;

    const input = load / Math.max(0.01, eff);
    const loss = input - load;
    const btu = loss * W_TO_BTU;

    render([
      {label:"Output Load", value:`${load.toFixed(0)} W`},
      {label:"PSU Input Power", value:`${input.toFixed(0)} W`},
      {label:"Heat Loss", value:`${loss.toFixed(0)} W`},
      {label:"Heat Loss", value:`${btu.toFixed(0)} BTU/hr`},
      {label:"Note", value:"Higher-efficiency PSUs reduce wasted heat and cooling burden."}
    ]);
  }

  function reset(){
    $("load").value=800;
    $("eff").value=92;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
