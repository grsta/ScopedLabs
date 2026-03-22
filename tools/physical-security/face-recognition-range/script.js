(() => {
  const $ = id => document.getElementById(id);
  const KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/license-plate-range/";

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

  function showContinue(){ $("continue").style.display="inline-block"; }
  function hideContinue(){ $("continue").style.display="none"; }

  // 🔥 Carry over from Lens Selection
  function showFlowNote(){
    const note = $("flow-note");

    try{
      const raw = sessionStorage.getItem(KEY);
      if(!raw){ note.style.display="none"; return; }

      const parsed = JSON.parse(raw);

      if(parsed.step !== "lens-selection"){
        note.style.display="none";
        return;
      }

      prev = parsed.data;

      if(prev.dist) $("dist").value = Math.round(prev.dist);

      note.innerHTML = `
        <strong>Flow context:</strong>
        Lens selected: <strong>${prev.lensClass}</strong> (~${prev.focal.toFixed(1)}mm).
        This step determines maximum recognition distance with that lens.
      `;

      note.style.display="block";

    }catch{
      note.style.display="none";
    }
  }

  function calc(){
    const res=parseFloat($("res").value);
    const hfov=parseFloat($("hfov").value);
    const ppf=parseFloat($("ppf").value);
    const fw=parseFloat($("fw").value);

    // 🔥 CORRECT FORMULA
    const dist = (res * fw) / (2 * Math.tan(deg2rad(hfov/2)) * ppf);

    let classification = "Recognition";

    if(ppf >= 250) classification = "Strong Recognition";
    if(ppf >= 300) classification = "Identification";

    render([
      {label:"Required Pixels per Face", value:`${ppf} px`},
      {label:"Estimated Recognition Distance", value:`${dist.toFixed(1)} ft`},
      {label:"Classification", value:classification},
      {label:"Design Guidance", value:"Verify with real-world mounting angle, lighting, and motion."}
    ]);

    sessionStorage.setItem(KEY, JSON.stringify({
      category:"physical-security",
      step:"face-recognition-range",
      data:{ dist, classification }
    }));

    showContinue();
  }

  function reset(){
    $("res").value=3840;
    $("hfov").value=90;
    $("ppf").value=250;
    $("fw").value=0.6;
    $("dist").value=60;
    $("results").innerHTML="";
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  function invalidate(){
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  ["res","hfov","ppf","fw","dist"].forEach(id=>{
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
