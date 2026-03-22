(() => {
  const $ = id => document.getElementById(id);
  const KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/pixel-density/";

  function deg2rad(x){ return x * Math.PI / 180; }

  let prev = null;

  function render(rows){
    const el = $("results");
    el.innerHTML = "";
    rows.forEach(r=>{
      const d=document.createElement("div");
      d.className="result-row";
      d.innerHTML=`<span class="result-label">${r.label}</span>
                   <span class="result-value">${r.value}</span>`;
      el.appendChild(d);
    });
  }

  function showContinue(){
    $("continue").style.display = "inline-block";
  }

  function hideContinue(){
    $("continue").style.display = "none";
  }

  function showFlowNote(){
    const note = $("flow-note");

    try{
      const raw = sessionStorage.getItem(KEY);
      if(!raw){
        note.style.display="none";
        note.innerHTML = "";
        return;
      }

      const parsed = JSON.parse(raw);
      if(parsed.step !== "camera-spacing"){
        note.style.display="none";
        note.innerHTML = "";
        return;
      }

      prev = parsed.data;

      if(prev.cams) $("cams").value = prev.cams;
      if(prev.dist) $("dist").value = Math.round(prev.dist);
      if(prev.hfov) $("hfov").value = Math.round(prev.hfov);

      note.innerHTML = `
        <strong>Flow context:</strong>
        Layout includes <strong>${prev.cams}</strong> cameras with spacing
        <strong>${(prev.spacing ?? prev.actualSpacing ?? 0).toFixed(1)} ft</strong>.
        This step validates whether blind spots still remain before moving into pixel density.
      `;

      note.style.display = "block";

    }catch{
      note.style.display="none";
      note.innerHTML = "";
    }
  }

  function classify(gap, width){
    if(gap <= 0) return "FULL COVERAGE";
    if(gap <= 0.1 * width) return "MINOR GAPS";
    return "BLIND SPOTS";
  }

  function interpretation(status){
    if(status === "FULL COVERAGE"){
      return "Coverage is continuous with overlap. No blind spots expected.";
    }
    if(status === "MINOR GAPS"){
      return "Small gaps may exist depending on real-world alignment, edge performance, and installation tolerances.";
    }
    return "Coverage gaps are likely. Additional cameras, tighter spacing, or a wider effective footprint are required.";
  }

  function guidance(status){
    if(status === "FULL COVERAGE"){
      return "Layout is acceptable from a pure coverage standpoint. Next, confirm that the same layout also provides enough target detail through pixel density.";
    }
    if(status === "MINOR GAPS"){
      return "Coverage is close, but field conditions may expose weak spots. Verify corner conditions and overlap assumptions before finalizing.";
    }
    return "Do not lock this layout yet. Reduce spacing, increase camera count, or revisit upstream coverage assumptions before moving forward.";
  }

  function calc(){
    const w = parseFloat($("w").value);
    const d = parseFloat($("d").value);
    const hfov = parseFloat($("hfov").value);
    const dist = parseFloat($("dist").value);
    const cams = Math.max(1, Math.floor(parseFloat($("cams").value)));
    const overlap = parseFloat($("overlap").value) / 100;

    const cov = 2 * Math.tan(deg2rad(hfov / 2)) * dist;
    const eff = cov * (1 - overlap);
    const total = eff * cams;

    const gap = w - total;
    const status = classify(gap, w);
    const interp = interpretation(status);
    const guide = guidance(status);

    render([
      {label:"Coverage per Camera", value:`${cov.toFixed(1)} ft`},
      {label:"Effective Coverage", value:`${eff.toFixed(1)} ft`},
      {label:"Total Coverage", value:`${total.toFixed(1)} ft`},
      {label:"Area Width", value:`${w.toFixed(1)} ft`},
      {label:"Area Depth", value:`${d.toFixed(1)} ft`},
      {label:"Gap", value: gap <= 0 ? "0 ft" : `${gap.toFixed(1)} ft`},
      {label:"Result", value:status},
      {label:"Interpretation", value:interp},
      {label:"Design Guidance", value:guide}
    ]);

    sessionStorage.setItem(KEY, JSON.stringify({
      category:"physical-security",
      step:"blind-spot-check",
      data:{
        w,
        d,
        hfov,
        dist,
        cams,
        overlap,
        cov,
        eff,
        total,
        gap,
        status,
        interp,
        guide
      }
    }));

    showContinue();
  }

  function reset(){
    $("w").value = 120;
    $("d").value = 80;
    $("hfov").value = 90;
    $("dist").value = 60;
    $("cams").value = 2;
    $("overlap").value = 15;
    $("results").innerHTML = "";
    sessionStorage.removeItem(KEY);
    hideContinue();
    showFlowNote();
  }

  function invalidate(){
    sessionStorage.removeItem(KEY);
    hideContinue();
    showFlowNote();
  }

  ["w","d","hfov","dist","cams","overlap"].forEach(id=>{
    const el = $(id);
    if(el) el.addEventListener("input", invalidate);
    if(el) el.addEventListener("change", invalidate);
  });

  $("calc").onclick = calc;
  $("reset").onclick = reset;

  $("continue").onclick = () => {
    window.location.href = NEXT_URL;
  };

  showFlowNote();
})();

