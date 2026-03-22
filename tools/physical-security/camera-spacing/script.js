(() => {
  const $ = id => document.getElementById(id);
  const KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/blind-spot-check/";

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

      if(parsed.step !== "camera-coverage-area"){
        note.style.display="none";
        return;
      }

      const d = parsed.data;

      if(d.effWidth){
        $("effWidth").value = d.effWidth.toFixed(1);
      }

      note.innerHTML = `
        <strong>Flow context:</strong>
        Effective coverage width from previous step:
        <strong>${d.effWidth.toFixed(1)} ft</strong>.
        Spacing will be based on usable coverage after overlap.
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
      return "High redundancy. More cameras than necessary but minimal risk of gaps.";
    }
    if(type === "Balanced Spacing"){
      return "Good balance between efficiency and continuous coverage.";
    }
    return "Spacing too wide. Expect coverage gaps or weak overlap.";
  }

  function calc(){
    const effWidth = parseFloat($("effWidth").value);
    const sceneWidth = parseFloat($("sceneWidth").value);
    const safety = parseFloat($("safety").value) / 100;

    const adjustedWidth = effWidth * (1 - safety);
    const cams = Math.max(1, Math.ceil(sceneWidth / adjustedWidth));
    const actualSpacing = sceneWidth / cams;

    const ratio = actualSpacing / effWidth;
    const type = classifySpacing(ratio);
    const interp = interpretation(type);

    render([
      {label:"Effective Coverage Width", value:`${effWidth.toFixed(1)} ft`},
      {label:"Adjusted Spacing Width", value:`${adjustedWidth.toFixed(1)} ft`},
      {label:"Camera Count", value:`${cams}`},
      {label:"Actual Spacing", value:`${actualSpacing.toFixed(1)} ft`},
      {label:"Spacing Classification", value:type},
      {label:"Interpretation", value:interp}
    ]);

    sessionStorage.setItem(KEY, JSON.stringify({
      category:"physical-security",
      step:"camera-spacing",
      data:{
        effWidth,
        sceneWidth,
        cams,
        actualSpacing
      }
    }));

    showContinue();
  }

  function reset(){
    $("effWidth").value=40;
    $("sceneWidth").value=200;
    $("safety").value=10;
    $("results").innerHTML="";
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  function invalidate(){
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  ["effWidth","sceneWidth","safety"].forEach(id=>{
    $(id).addEventListener("input", invalidate);
  });

  $("calc").onclick = calc;
  $("reset").onclick = reset;

  $("continue").onclick = () => {
    window.location.href = NEXT_URL;
  };

  showFlowNote();
})();
