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
    const cur=parseFloat($("cur").value);
    const peak=parseFloat($("peak").value);
    const cap=parseFloat($("cap").value);
    const util=parseFloat($("util").value)/100;

    const curPct=(cur/cap)*100;
    const peakPct=(peak/cap)*100;

    const maxAtTarget=cap*util;

    const risk = peak > maxAtTarget ? "HIGH" :
                 cur > maxAtTarget ? "MEDIUM" : "LOW";

    render([
      {label:"Current Utilization", value:`${curPct.toFixed(1)}%`},
      {label:"Peak Utilization", value:`${peakPct.toFixed(1)}%`},
      {label:"Target Throughput @ Util", value:`${maxAtTarget.toFixed(0)} Mbps`},
      {label:"Congestion Risk", value:risk},
      {label:"Note", value:"Sustained operation above target utilization increases latency and packet loss."}
    ]);
  }

  function reset(){
    $("cur").value=600;
    $("peak").value=900;
    $("cap").value=1000;
    $("util").value=75;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
