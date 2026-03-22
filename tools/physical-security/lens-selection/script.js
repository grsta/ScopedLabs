(() => {
  const $ = id => document.getElementById(id);
  const KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/face-recognition-range/";

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

  // ✅ carry-over from pixel density
  function showFlowNote(){
    const note = $("flow-note");

    try{
      const raw = sessionStorage.getItem(KEY);
      if(!raw){ note.style.display="none"; return; }

      const parsed = JSON.parse(raw);

      if(parsed.step !== "pixel-density"){
        note.style.display="none";
        return;
      }

      prev = parsed.data;

      if(prev.dist) $("dist").value = Math.round(prev.dist);

      note.innerHTML = `
        <strong>Flow context:</strong>
        Pixel density result: <strong>${prev.level}</strong>.
        This step converts that requirement into a real lens selection.
      `;

      note.style.display="block";

    }catch{
      note.style.display="none";
    }
  }

  function classifyLens(focal){
    if(focal < 3) return "Ultra-Wide (2.8mm)";
    if(focal < 5) return "Wide (4mm)";
    if(focal < 8) return "Mid (6mm)";
    if(focal < 12) return "Telephoto (8–12mm)";
    return "Long Range (12mm+)";
  }

  function interpretation(focal){
    if(focal < 4){
      return "Wide coverage, but reduced detail at distance.";
    }
    if(focal < 8){
      return "Balanced field of view and detail.";
    }
    if(focal < 12){
      return "Narrower view with improved target detail.";
    }
    return "Highly focused view for long-range identification.";
  }

  function calc(){
    const dist=parseFloat($("dist").value);
    const tw=parseFloat($("tw").value);
    const sw=parseFloat($("sw").value);

    const focal = (sw * dist) / tw;

    const lensClass = classifyLens(focal);
    const interp = interpretation(focal);

    render([
      {label:"Estimated Focal Length", value:`${focal.toFixed(1)} mm`},
      {label:"Suggested Lens Class", value:lensClass},
      {label:"Interpretation", value:interp},
      {label:"Design Note", value:"Confirm using manufacturer FOV charts and scene testing."}
    ]);

    sessionStorage.setItem(KEY, JSON.stringify({
      category:"physical-security",
      step:"lens-selection",
      data:{
        focal,
        lensClass,
        dist,
        tw
      }
    }));

    showContinue();
  }

  function reset(){
    $("dist").value=80;
    $("tw").value=20;
    $("sw").value=6.4;
    $("results").innerHTML="";
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  function invalidate(){
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  ["dist","tw","sw"].forEach(id=>{
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
