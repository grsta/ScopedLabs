(() => {
  const $ = id => document.getElementById(id);
  const KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/lens-selection/";

  function deg2rad(x){ return x*Math.PI/180; }

  let prev = null;

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

  function showContinue(){
    $("continue").style.display="inline-block";
  }

  function hideContinue(){
    $("continue").style.display="none";
  }

  // ✅ carry-over from blind spot check
  function showFlowNote(){
    const note = $("flow-note");

    try{
      const raw = sessionStorage.getItem(KEY);
      if(!raw){ note.style.display="none"; return; }

      const parsed = JSON.parse(raw);

      if(parsed.step !== "blind-spot-check"){
        note.style.display="none";
        return;
      }

      prev = parsed.data;

      if(prev.dist) $("dist").value = Math.round(prev.dist);
      if(prev.hfov) $("hfov").value = Math.round(prev.hfov);

      note.innerHTML = `
        <strong>Flow context:</strong>
        Blind spot check result: <strong>${prev.status}</strong>.
        This step verifies whether that layout also delivers sufficient detail (PPF).
      `;

      note.style.display="block";

    }catch{
      note.style.display="none";
    }
  }

  function classify(ppf){
    if(ppf < 20) return "Below Detection";
    if(ppf < 40) return "Detection";
    if(ppf < 80) return "Observation";
    if(ppf < 120) return "Recognition";
    return "Identification";
  }

  function interpretation(level){
    if(level === "Below Detection") return "Insufficient detail. Only motion awareness.";
    if(level === "Detection") return "Basic detection possible, but limited detail.";
    if(level === "Observation") return "General activity monitoring is achievable.";
    if(level === "Recognition") return "Faces/features recognizable.";
    return "Strong identification capability.";
  }

  function calc(){
    const res=parseFloat($("res").value);
    const hfov=parseFloat($("hfov").value);
    const dist=parseFloat($("dist").value);
    const tppf=parseFloat($("tppf").value);
    const tw=parseFloat($("tw").value);

    const sceneW = 2 * Math.tan(deg2rad(hfov/2)) * dist;
    const ppf = res / sceneW;
    const distForTppf = res / (2 * Math.tan(deg2rad(hfov/2)) * tppf);
    const pixelsOnTarget = ppf * tw;

    const level = classify(ppf);
    const interp = interpretation(level);

    render([
      {label:"Scene Width", value:`${sceneW.toFixed(1)} ft`},
      {label:"Pixel Density", value:`${ppf.toFixed(1)} px/ft`},
      {label:"Performance Level", value:level},
      {label:"Pixels on Target", value:`${pixelsOnTarget.toFixed(0)} px`},
      {label:"Distance for Target PPF", value:`${distForTppf.toFixed(1)} ft`},
      {label:"Interpretation", value:interp}
    ]);

    sessionStorage.setItem(KEY, JSON.stringify({
      category:"physical-security",
      step:"pixel-density",
      data:{
        ppf,
        level,
        dist,
        hfov
      }
    }));

    showContinue();
  }

  function reset(){
    $("res").value=3840;
    $("hfov").value=90;
    $("dist").value=60;
    $("tppf").value=80;
    $("tw").value=10;
    $("results").innerHTML="";
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  function invalidate(){
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  ["res","hfov","dist","tppf","tw"].forEach(id=>{
    const el = $(id);
    if(el) el.addEventListener("input", invalidate);
  });

  $("calc").onclick=calc;
  $("reset").onclick=reset;

  $("continue").onclick = () => {
    window.location.href = NEXT_URL;
  };

  showFlowNote();
})();
