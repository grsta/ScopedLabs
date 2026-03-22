(() => {
  const $ = id => document.getElementById(id);
  const KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/camera-spacing/";

  function deg2rad(x){ return x * Math.PI / 180; }

  function render(rows){
    const el = $("results");
    el.innerHTML = "";
    rows.forEach(r=>{
      const d = document.createElement("div");
      d.className = "result-row";
      d.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
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
      if(!raw){ note.style.display="none"; return; }

      const parsed = JSON.parse(raw);
      if(parsed.step !== "field-of-view"){ note.style.display="none"; return; }

      const d = parsed.data;

      if(d.dist) $("dist").value = Math.round(d.dist);
      if(d.hfov) $("hfov").value = Math.round(d.hfov);

      note.innerHTML = `
        <strong>Flow context:</strong>
        Field of view results detected —
        estimated width <strong>${d.sceneWidth.toFixed(1)} ft</strong>.
        This step converts that into real usable coverage and overlap planning.
      `;
      note.style.display = "block";
    }catch{
      note.style.display="none";
    }
  }

  function classifyOverlap(ov){
    if(ov < 0.1) return "Low Overlap (risk of gaps)";
    if(ov < 0.25) return "Balanced Overlap";
    return "High Overlap (redundant coverage)";
  }

  function interpretation(effWidth, width){
    const ratio = effWidth / width;

    if(ratio < 0.75){
      return "High overlap reduces usable coverage significantly but improves redundancy and reduces blind spots.";
    }
    if(ratio < 0.9){
      return "Balanced overlap provides good coverage continuity while maintaining efficiency.";
    }
    return "Low overlap maximizes coverage but increases risk of coverage gaps between cameras.";
  }

  function calc(){
    const hfov = parseFloat($("hfov").value);
    const vfov = parseFloat($("vfov").value);
    const dist = parseFloat($("dist").value);
    const ov = parseFloat($("ov").value) / 100;

    const halfW = Math.tan(deg2rad(hfov/2)) * dist;
    const halfH = Math.tan(deg2rad(vfov/2)) * dist;

    const width = halfW * 2;
    const height = halfH * 2;

    const effWidth = width * (1 - ov);
    const effHeight = height * (1 - ov);

    const area = width * height;
    const effArea = effWidth * effHeight;

    const overlapClass = classifyOverlap(ov);
    const interp = interpretation(effWidth, width);

    render([
      {label:"Coverage Width", value:`${width.toFixed(1)} ft`},
      {label:"Coverage Height", value:`${height.toFixed(1)} ft`},
      {label:"Coverage Area", value:`${area.toFixed(0)} sq ft`},
      {label:"Effective Width", value:`${effWidth.toFixed(1)} ft`},
      {label:"Effective Area", value:`${effArea.toFixed(0)} sq ft`},
      {label:"Overlap Classification", value:overlapClass},
      {label:"Interpretation", value:interp}
    ]);

    sessionStorage.setItem(KEY, JSON.stringify({
      category:"physical-security",
      step:"camera-coverage-area",
      data:{
        width,
        height,
        effWidth,
        effArea,
        dist,
        hfov
      }
    }));

    showContinue();
  }

  function reset(){
    $("hfov").value=90;
    $("vfov").value=55;
    $("dist").value=60;
    $("ov").value=15;
    $("results").innerHTML="";
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  function invalidate(){
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  ["hfov","vfov","dist","ov"].forEach(id=>{
    $(id).addEventListener("input", invalidate);
  });

  $("calc").onclick = calc;
  $("reset").onclick = reset;

  $("continue").onclick = () => {
    window.location.href = NEXT_URL;
  };

  showFlowNote();
})();