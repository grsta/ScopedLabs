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

  function speedup(workers, p){
    // Amdahl's law: S = 1 / ((1-p) + p/workers)
    return 1 / ((1 - p) + (p / workers));
  }

  function calc(){
    const base=parseFloat($("base").value);
    const w0=parseFloat($("w0").value);
    const w1=parseFloat($("w1").value);
    const p=parseFloat($("p").value)/100;
    const oh=parseFloat($("oh").value)/100;

    const s0 = speedup(w0, p);
    const s1 = speedup(w1, p);

    const rel = (s1 / s0);
    const rawTarget = base * rel;

    const target = rawTarget * (1 - oh);

    render([
      {label:"Baseline Throughput", value:`${base.toFixed(0)} req/s`},
      {label:"Theoretical Scale Gain", value:`${(rel*100).toFixed(1)}%`},
      {label:"Raw Target Throughput", value:`${rawTarget.toFixed(0)} req/s`},
      {label:"After Overhead", value:`${target.toFixed(0)} req/s`},
      {label:"Note", value:"Real scaling depends on lock contention, I/O waits, and cache behavior. Use this as planning guidance."}
    ]);
  }

  function reset(){
    $("base").value=1200;
    $("w0").value=4;
    $("w1").value=12;
    $("p").value=85;
    $("oh").value=8;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
