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
    const riops=parseFloat($("riops").value);
    const wiops=parseFloat($("wiops").value);
    const iosz=parseFloat($("iosz").value); // KB
    const cap=parseFloat($("cap").value);   // MB/s
    const util=parseFloat($("util").value)/100;

    const totalIops = riops + wiops;
    const mbps = (totalIops * iosz) / 1024; // (IO/s * KB) => KB/s => MB/s

    const pct = (mbps / cap) * 100;
    const maxAtTarget = cap * util;

    const status = mbps <= maxAtTarget ? "WITHIN TARGET" : "SATURATED / RISK";

    render([
      {label:"Total IOPS", value: totalIops.toFixed(0)},
      {label:"Estimated Throughput", value: `${mbps.toFixed(1)} MB/s`},
      {label:"Device Capacity", value: `${cap.toFixed(0)} MB/s`},
      {label:"Estimated Utilization", value: `${pct.toFixed(1)} %`},
      {label:"Target Throughput @ Util", value: `${maxAtTarget.toFixed(0)} MB/s`},
      {label:"Status", value: status},
      {label:"Note", value:"This is a simplification; queue depth, latency, and mixed workloads affect real saturation."}
    ]);
  }

  function reset(){
    $("riops").value=12000;
    $("wiops").value=6000;
    $("iosz").value=16;
    $("cap").value=1500;
    $("util").value=75;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
