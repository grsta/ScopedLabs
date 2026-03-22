(() => {
  const $ = id => document.getElementById(id);
  const KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/blind-spot-check/";

  function deg2rad(x){ return x * Math.PI / 180; }

  let prev = null;

  function render(rows){
    const el = $("results");
    if (!el) return;

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
    const btn = $("continue");
    if (btn) btn.style.display = "inline-block";
  }

  function hideContinue(){
    const btn = $("continue");
    if (btn) btn.style.display = "none";
  }

  // ✅ FIXED carry-over
  function showFlowNote(){
    const note = $("flow-note");
    if (!note) return;

    prev = null;

    try{
      const raw = sessionStorage.getItem(KEY);
      if(!raw){
        note.style.display = "none";
        return;
      }

      const parsed = JSON.parse(raw);

      if(parsed.step !== "camera-coverage-area"){
        note.style.display = "none";
        return;
      }

      prev = parsed.data;

      // Prefill inputs from previous tool
      if(prev.dist) $("dist").value = Math.round(prev.dist);
      if(prev.hfov) $("hfov").value = Math.round(prev.hfov);
      if(prev.ov !== undefined) $("ov").value = Math.round(prev.ov * 100);

      note.innerHTML = `
        <strong>Flow context:</strong>
        Effective coverage width <strong>${prev.effWidth.toFixed(1)} ft</strong>
        from previous step.
        This tool converts that into spacing and camera count.
      `;

      note.style.display = "block";

    }catch{
      note.style.display = "none";
    }
  }

  function classifySpacing(ratio){
    if(ratio < 0.8) return "Tight Spacing";
    if(ratio <= 1.05) return "Balanced Spacing";
    return "Wide Spacing";
  }

  function interpretation(type){
    if(type === "Tight Spacing"){
      return "High redundancy. More cameras than needed but minimal risk of gaps.";
    }
    if(type === "Balanced Spacing"){
      return "Good balance between coverage and efficiency.";
    }
    return "Spacing too wide. Risk of blind spots between cameras.";
  }

  function calc(){
    const len = parseFloat($("len").value);
    const dist = parseFloat($("dist").value);
    const hfov = parseFloat($("hfov").value);
    const ov = parseFloat($("ov").value) / 100;

    const rawWidth = 2 * Math.tan(deg2rad(hfov/2)) * dist;

    // ✅ Use carry-over if available
    const usableWidth = (prev && prev.effWidth)
      ? prev.effWidth
      : rawWidth * (1 - ov);

    const cams = Math.max(1, Math.ceil(len / usableWidth));
    const spacing = len / cams;

    const ratio = spacing / usableWidth;
    const type = classifySpacing(ratio);
    const interp = interpretation(type);

    render([
      {label:"Raw Coverage Width", value:`${rawWidth.toFixed(1)} ft`},
      {label:"Usable Width", value:`${usableWidth.toFixed(1)} ft`},
      {label:"Perimeter Length", value:`${len.toFixed(0)} ft`},
      {label:"Camera Count", value:`${cams}`},
      {label:"Actual Spacing", value:`${spacing.toFixed(1)} ft`},
      {label:"Spacing Classification", value:type},
      {label:"Interpretation", value:interp}
    ]);

    sessionStorage.setItem(KEY, JSON.stringify({
      category:"physical-security",
      step:"camera-spacing",
      data:{
        len,
        dist,
        hfov,
        usableWidth,
        cams,
        spacing
      }
    }));

    showContinue();
  }

  function reset(){
    $("len").value = 300;
    $("dist").value = 60;
    $("hfov").value = 90;
    $("ov").value = 15;
    $("results").innerHTML = "";
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  function invalidate(){
    sessionStorage.removeItem(KEY);
    hideContinue();
  }

  // ✅ SAFE event binding (no more crashes)
  ["len","dist","hfov","ov"].forEach(id=>{
    const el = $(id);
    if (el){
      el.addEventListener("input", invalidate);
    }
  });

  const calcBtn = $("calc");
  const resetBtn = $("reset");
  const continueBtn = $("continue");

  if (calcBtn) calcBtn.addEventListener("click", calc);
  if (resetBtn) resetBtn.addEventListener("click", reset);
  if (continueBtn) continueBtn.addEventListener("click", () => {
    window.location.href = NEXT_URL;
  });

  showFlowNote();
})();