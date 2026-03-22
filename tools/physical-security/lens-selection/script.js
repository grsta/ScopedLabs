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

  // ✅ TRUE carry-over + usage
  function showFlowNote(){
    const note = $("flow-note");
    if (!note) return;

    prev = null;

    try{
      const raw = sessionStorage.getItem(KEY);
      if(!raw){
        note.style.display="none";
        return;
      }

      const parsed = JSON.parse(raw);

      if(parsed.step !== "pixel-density"){
        note.style.display="none";
        return;
      }

      prev = parsed.data;

      const dist = Number(prev.dist || 0);
      const ppf = Number(prev.ppf || 0);
      const level = prev.level || prev.classification || "";

      if(dist > 0){
        $("dist").value = Math.round(dist);
      }

      let msg = `<strong>Flow context:</strong> `;

      if(level){
        msg += `Pixel density = <strong>${level}</strong>. `;
      } else if(ppf){
        msg += `Pixel density = <strong>${ppf.toFixed(1)} PPF</strong>. `;
      }

      msg += `Lens selection will adjust based on required detail level.`;

      note.innerHTML = msg;
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

  function adjustForPPF(focal){
    if(!prev) return focal;

    const ppf = Number(prev.ppf || 0);

    // 🔥 REAL PIPELINE LOGIC
    if(ppf < 40){
      return focal * 1.4; // tighten
    }
    if(ppf < 80){
      return focal * 1.2;
    }
    if(ppf > 120){
      return focal * 0.9; // allow wider
    }

    return focal;
  }

  function calc(){
    const dist = parseFloat($("dist").value);
    const tw = parseFloat($("tw").value);
    const sw = parseFloat($("sw").value);

    let focal = (sw * dist) / tw;

    // ✅ APPLY PIXEL DENSITY INFLUENCE
    focal = adjustForPPF(focal);

    const lensClass = classifyLens(focal);
    const interp = interpretation(focal);

    let guidance = "Verify with manufacturer FOV charts.";

    if(prev){
      const ppf = Number(prev.ppf || 0);

      if(ppf < 40){
        guidance = "Pixel density is low — tighter lens recommended to improve detail.";
      } else if(ppf > 120){
        guidance = "Pixel density is high — wider lens may be acceptable.";
      }
    }

    render([
      {label:"Adjusted Focal Length", value:`${focal.toFixed(1)} mm`},
      {label:"Suggested Lens Class", value:lensClass},
      {label:"Interpretation", value:interp},
      {label:"Design Guidance", value:guidance}
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