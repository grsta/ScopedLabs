(() => {
  const $ = id => document.getElementById(id);
  const KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/blind-spot-check/";

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
      if(parsed.step !== "camera-coverage-area"){ note.style.display="none"; return; }

      const d = parsed.data;

      if(d.effWidth){
        $("dist").value = Math.round(d.dist);
        $("hfov").value = Math.round(d.hfov);
      }

      note.innerHTML = `
        <strong>Flow context:</strong>
        Effective coverage width <strong>${d.effWidth.toFixed(1)} ft</strong>.
        This step converts coverage into spacing and camera count across the perimeter.
      `;

      note.style.display = "block";

    }catch{
      note.style.display="none";
    }
  }

  function classifySpacing(ratio){
    if(ratio < 0.8) return "Tight Spacing";
    if(ratio <= 1.0) return "Balanced Spacing";
    return "Wide Spacing";
  }

  function interpretation(type){
    if(type === "Tight Spacing"){
      return "Cameras are closer than necessary, increasing cost but improving redundancy and reducing blind spots.";
    }
    if(type === "Balanced Spacing"){
      return "Spacing is well balanced for continuous coverage and efficient deployment.";
    }
    return "Spacing is too wide. This increases the risk of blind spots and weak overlap.";
  }

  function calc(){
    const len = parseFloat($("len").value);
    const dist = parseFloat($("dist").value);
    const hfov = parseFloat($("hfov").value);
    const ov = parseFloat($("ov").value) / 100;

    const width = 2 * Math.tan(deg2rad(hfov/2)) * dist;
    const spacing = width * (1 - ov);
    const cams = Math.max(1, Math.ceil(len / spacing));
    const actualSpacing = len / cams;

    const ratio = actualSpacing / width;
    const spacingType = classifySpacing(ratio);
    const interp = interpretation(spacingType);

    render([
      {label:"Coverage Width per Camera", value:`${width.toFixed(1)} ft`},
      {label:"Recommended Spacing", value:`${spacing.toFixed(1)} ft`},
      {label:"Actual Spacing", value:`${actualSpacing.toFixed(1)} ft`},
      {label:"Perimeter Length", value:`${len.toFixed(0)} ft`},
      {label:"Estimated Cameras Needed", value:`${cams}`},
      {label:"Spacing Classification", value:spacingType},
      {label:"Interpretation", value:interp}
    ]);

    sessionStorage.setItem(KEY, JSON.stringify({
      category:"physical-security",
      step:"camera-spacing",
      data:{
        len,
        dist,
        hfov,
        width,
        spacing,
        cams
      }
    }));

    showContinue();
  }

  function reset(){
    $("len").value=300;
    $("dist").value=60;
    $("hfov").value=90;
    $("ov").value=15;
    $("results").innerHTML="";
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  function invalidate(){
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  ["len","dist","hfov","ov"].forEach(id=>{
    $(id).addEventListener("input", invalidate);
  });

  $("calc").onclick = calc;
  $("reset").onclick = reset;

  $("continue").onclick = () => {
    window.location.href = NEXT_URL;
  };

  showFlowNote();
})();
