(() => {
  const $ = id => document.getElementById(id);
  const KEY = "scopedlabs:pipeline:last-result";
  const NEXT_URL = "/tools/physical-security/";

  function deg2rad(x){ return x * Math.PI / 180; }

  let prev = null;

  function render(rows){
    const el = $("results");
    el.innerHTML = "";
    rows.forEach(r => {
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
      if(!parsed || parsed.category !== "physical-security" || parsed.step !== "face-recognition-range"){
        note.style.display = "none";
        note.innerHTML = "";
        return;
      }

      const d = parsed.data || {};
      prev = d;

      const dist = Number(d.dist || 0);
      const classification = d.classification || "";
      const focal = Number(d.focal || 0);
      const lensClass = d.lensClass || "";

      if (dist > 0) {
        $("dist").value = String(Math.round(dist));
      }

      let msg = `<strong>Flow context:</strong> `;

      if (classification) {
        msg += `Face recognition result = <strong>${classification}</strong> `;
      } else {
        msg += `Face recognition range calculated `;
      }

      if (dist > 0) {
        msg += `at approximately <strong>${dist.toFixed(1)} ft</strong>. `;
      }

      if (lensClass) {
        msg += `Upstream lens choice = <strong>${lensClass}</strong>`;
        if (focal > 0) {
          msg += ` (~${focal.toFixed(1)}mm)`;
        }
        msg += `. `;
      }

      msg += `This step checks whether that optical setup can also support readable license plate capture.`;

      note.innerHTML = msg;
      note.style.display = "block";

    }catch{
      note.style.display = "none";
      note.innerHTML = "";
    }
  }

  function calc(){
    const res = parseFloat($("res").value);
    const hfov = parseFloat($("hfov").value);
    const ppp = parseFloat($("ppp").value);
    const pw = parseFloat($("pw").value);

    const dist = (res * pw) / (2 * Math.tan(deg2rad(hfov / 2)) * ppp);

    let classification = "Readable";
    if (ppp < 120) classification = "Marginal";
    if (ppp >= 150) classification = "Strong Capture";

    let guidance = "Use proper shutter speed, IR illumination, and plate-friendly mounting angle.";

    if (prev && Number(prev.dist || 0) > 0) {
      const recognitionDist = Number(prev.dist || 0);
      if (dist < recognitionDist) {
        guidance = "Plate capture range is tighter than the upstream face-recognition range. Expect LPR placement to need a narrower field or closer standoff.";
      } else {
        guidance = "Plate capture range is at or beyond the upstream recognition range, but confirm shutter speed, glare control, and mounting angle before relying on it.";
      }
    }

    render([
      {label:"Required Pixels per Plate", value:`${ppp.toFixed(0)} px`},
      {label:"Estimated Capture Distance", value:`${dist.toFixed(1)} ft`},
      {label:"Classification", value:classification},
      {label:"Design Guidance", value:guidance}
    ]);

    sessionStorage.setItem(KEY, JSON.stringify({
      category: "physical-security",
      step: "license-plate-range",
      data: {
        dist,
        classification,
        ppp,
        pw,
        hfov,
        res,
        guidance
      }
    }));

    showContinue();
  }

  function reset(){
    $("res").value = 3840;
    $("hfov").value = 50;
    $("ppp").value = 130;
    $("pw").value = 1.0;
    $("dist").value = 60;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
    sessionStorage.removeItem(KEY);
    hideContinue();
    showFlowNote();
  }

  function invalidate(){
    sessionStorage.removeItem(KEY);
    hideContinue();
    showFlowNote();
  }

  ["res","hfov","ppp","pw","dist"].forEach(id => {
    const el = $(id);
    if (el) {
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
