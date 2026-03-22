(() => {
  const $ = id => document.getElementById(id);
  const KEY = "scopedlabs:pipeline:last-result";
  const continueBtn = $("continue");

  function rad2deg(x){ return x * 180 / Math.PI; }
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

  function classifyTilt(tilt){
    if (tilt < 10) return "Too Shallow (horizon-heavy, poor ID angles)";
    if (tilt < 25) return "Moderate (balanced coverage)";
    if (tilt < 45) return "Good (strong subject angle)";
    return "Steep (top-down compression risk)";
  }

  function interpretation(tilt){
    if (tilt < 10){
      return "Camera angle is too shallow. Expect horizon dominance, reduced facial detail, and poor identification performance.";
    }
    if (tilt < 25){
      return "Balanced viewing angle suitable for general surveillance, but not optimal for strong identification tasks.";
    }
    if (tilt < 45){
      return "Good mounting angle for capturing usable subject detail while maintaining reasonable coverage.";
    }
    return "Steep angle may compress subjects vertically. This can reduce face detail and distort perspective.";
  }

  function calc(){
    const h = parseFloat($("h").value);
    const dist = parseFloat($("dist").value);
    const th = parseFloat($("th").value);
    const vfov = parseFloat($("vfov").value);

    const drop = h - th;
    const tilt = rad2deg(Math.atan2(drop, dist));
    const span = 2 * Math.tan(deg2rad(vfov/2)) * dist;

    const tiltClass = classifyTilt(tilt);
    const note = interpretation(tilt);

    render([
      {label:"Vertical Drop", value:`${drop.toFixed(2)} ft`},
      {label:"Suggested Down-Tilt", value:`${tilt.toFixed(1)}°`},
      {label:"Vertical Coverage Span", value:`${span.toFixed(1)} ft`},
      {label:"Angle Quality", value:tiltClass},
      {label:"Interpretation", value:note}
    ]);

    sessionStorage.setItem(KEY, JSON.stringify({
      category: "physical-security",
      step: "mounting-height",
      data: {
        height: h,
        distance: dist,
        tilt,
        span
      }
    }));

    continueBtn.style.display = "inline-block";
  }

  function reset(){
    $("h").value = 12;
    $("dist").value = 40;
    $("th").value = 5.5;
    $("vfov").value = 55;

    $("results").innerHTML = "";
    continueBtn.style.display = "none";
    sessionStorage.removeItem(KEY);
  }

  function invalidate(){
    continueBtn.style.display = "none";
    sessionStorage.removeItem(KEY);
  }

  ["h","dist","th","vfov"].forEach(id=>{
    $(id).addEventListener("input", invalidate);
  });

  $("calc").onclick = calc;
  $("reset").onclick = reset;

})();