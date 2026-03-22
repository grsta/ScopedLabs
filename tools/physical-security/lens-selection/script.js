(() => {
  const $ = id => document.getElementById(id);
  const KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/face-recognition-range/";

  let prev = null;

  function render(rows){
    const el = $("results");
    el.innerHTML = "";
    rows.forEach(r=>{
      const d = document.createElement("div");
      d.className = "result-row";
      d.innerHTML = `<span class="result-label">${r.label}</span>
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
    if (!note) return;

    prev = null;

    try{
      const raw = sessionStorage.getItem(KEY);
      if(!raw){
        note.style.display = "none";
        note.innerHTML = "";
        return;
      }

      const parsed = JSON.parse(raw);
      if(!parsed || parsed.category !== "physical-security" || parsed.step !== "pixel-density"){
        note.style.display = "none";
        note.innerHTML = "";
        return;
      }

      const d = parsed.data || {};
      prev = d;

      const dist = Number(d.dist || 0);
      const ppf = typeof d.ppf === "number" ? d.ppf : Number(d.ppf || 0);
      const level = d.level || d.classification || "";

      if (dist > 0) {
        $("dist").value = String(Math.round(dist));
      }

      let msg = `<strong>Flow context:</strong> `;

      if (level) {
        msg += `Pixel density classified as <strong>${level}</strong>. `;
      } else if (ppf > 0) {
        msg += `Pixel density calculated at <strong>${ppf.toFixed(1)} PPF</strong>. `;
      } else {
        msg += `Pixel density data detected. `;
      }

      msg += `This step converts that requirement into a physical lens selection.`;

      note.innerHTML = msg;
      note.style.display = "block";

    }catch{
      note.style.display = "none";
      note.innerHTML = "";
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

  function designGuidance(focal, tw){
    if (focal < 4 && tw > 20) {
      return "This lens choice favors broad scene width. Good for general awareness, but verify that target detail remains acceptable at the intended distance.";
    }
    if (focal >= 8 && tw < 10) {
      return "This is a tighter lens direction suited for detail-driven viewing. Confirm the narrowed field does not clip important scene context.";
    }
    return "Use this focal length as a planning baseline, then confirm with manufacturer FOV charts and a scene test at the real mounting distance.";
  }

  function calc(){
    const dist = parseFloat($("dist").value);
    const tw = parseFloat($("tw").value);
    const sw = parseFloat($("sw").value);

    const focal = (sw * dist) / tw;
    const lensClass = classifyLens(focal);
    const interp = interpretation(focal);
    const guide = designGuidance(focal, tw);

    render([
      {label:"Estimated Focal Length", value:`${focal.toFixed(1)} mm`},
      {label:"Suggested Lens Class", value:lensClass},
      {label:"Interpretation", value:interp},
      {label:"Design Guidance", value:guide}
    ]);

    sessionStorage.setItem(KEY, JSON.stringify({
      category:"physical-security",
      step:"lens-selection",
      data:{
        focal,
        lensClass,
        dist,
        tw,
        sw,
        interp,
        guide
      }
    }));

    showContinue();
  }

  function reset(){
    $("dist").value = 80;
    $("tw").value = 20;
    $("sw").value = 6.4;
    $("results").innerHTML = `<div class="muted">Enter values and press Suggest Lens.</div>`;
    sessionStorage.removeItem(KEY);
    hideContinue();
    showFlowNote();
  }

  function invalidate(){
    sessionStorage.removeItem(KEY);
    hideContinue();
    showFlowNote();
  }

  ["dist","tw","sw"].forEach(id=>{
    const el = $(id);
    if(el) {
      el.addEventListener("input", invalidate);
      el.addEventListener("change", invalidate);
    }
  });

  $("calc").onclick = calc;
  $("reset").onclick = reset;

  $("continue").onclick = () => {
    window.location.href = NEXT_URL;
  };

  showFlowNote();
})();
