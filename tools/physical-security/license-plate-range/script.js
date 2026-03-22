(() => {
  const $ = id => document.getElementById(id);
  const KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/";

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

  // 🔥 carry over from Face Recognition
  function showFlowNote(){
    const note = $("flow-note");

    try{
      const raw = sessionStorage.getItem(KEY);
      if(!raw){ note.style.display="none"; return; }

      const parsed = JSON.parse(raw);

      if(parsed.step !== "face-recognition-range"){
        note.style.display="none";
        return;
      }

      prev = parsed.data;

      if(prev.dist) $("dist").value = Math.round(prev.dist);

      note.innerHTML = `
        <strong>Flow context:</strong>
        Recognition distance ~<strong>${prev.dist.toFixed(1)} ft</strong>.
        This step determines license plate readability at that range.
      `;

      note.style.display="block";

    }catch{
      note.style.display="none";
    }
  }

  function calc(){
    const res=parseFloat($("res").value);
    const hfov=parseFloat($("hfov").value);
    const ppp=parseFloat($("ppp").value);
    const pw=parseFloat($("pw").value);

    const dist = (res * pw) / (2 * Math.tan(deg2rad(hfov/2)) * ppp);

    let classification = "Readable";

    if(ppp < 120) classification = "Marginal";
    if(ppp >= 150) classification = "Strong Capture";

    render([
      {label:"Required Pixels per Plate", value:`${ppp} px`},
      {label:"Estimated Capture Distance", value:`${dist.toFixed(1)} ft`},
      {label:"Classification", value:classification},
      {label:"Design Guidance", value:"Use proper shutter speed, IR illumination, and correct mounting angle."}
    ]);

    sessionStorage.setItem(KEY, JSON.stringify({
      category:"physical-security",
      step:"license-plate-range",
      data:{ dist, classification }
    }));

    showContinue();
  }

  function reset(){
    $("res").value=3840;
    $("hfov").value=50;
    $("ppp").value=130;
    $("pw").value=1.0;
    $("dist").value=60;
    $("results").innerHTML="";
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  function invalidate(){
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  ["res","hfov","ppp","pw","dist"].forEach(id=>{
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
