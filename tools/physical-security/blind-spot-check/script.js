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

  function deg2rad(x){ return x * Math.PI / 180; }

  function calc(){
    const w=parseFloat($("w").value);
    const d=parseFloat($("d").value);
    const hfov=parseFloat($("hfov").value);
    const dist=parseFloat($("dist").value);
    const cams=Math.max(1, Math.floor(parseFloat($("cams").value)));
    const overlap=parseFloat($("overlap").value)/100;

    // coverage width at distance for one camera
    const half = Math.tan(deg2rad(hfov/2)) * dist;
    const cov = half * 2; // feet

    // effective coverage accounting for overlap between adjacent cameras
    const effectivePerCam = cov * (1 - overlap);
    const totalCoverage = effectivePerCam * cams;

    const gap = w - totalCoverage;

    const status = gap <= 0 ? "COVERED (with overlap)" :
                   gap <= (0.1*w) ? "MINOR GAPS POSSIBLE" :
                   "BLIND SPOTS LIKELY";

    render([
      {label:"Coverage Width per Camera", value:`${cov.toFixed(1)} ft @ ${dist.toFixed(0)} ft`},
      {label:"Overlap Target", value:`${(overlap*100).toFixed(0)}%`},
      {label:"Total Effective Coverage", value:`${totalCoverage.toFixed(1)} ft`},
      {label:"Area Width", value:`${w.toFixed(1)} ft`},
      {label:"Estimated Gap", value: gap <= 0 ? "0 ft (overlapped)" : `${gap.toFixed(1)} ft`},
      {label:"Result", value: status},
      {label:"Note", value:"Planning estimate only. Real coverage depends on lens, angle, obstructions, and required pixel density."}
    ]);
  }

  function reset(){
    $("w").value=120;
    $("d").value=80;
    $("hfov").value=90;
    $("dist").value=60;
    $("cams").value=2;
    $("overlap").value=15;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();

