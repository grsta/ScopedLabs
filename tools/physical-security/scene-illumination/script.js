(() => {
  const $ = id => document.getElementById(id);

  const STORAGE_KEY = "scopedlabs:pipeline:last-result";
  const continueBtn = $("continue");

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

  function classify(fc){
    if (fc < 1) return "Very Low (IR / night dominant)";
    if (fc < 3) return "Low Light (general surveillance)";
    if (fc < 10) return "Moderate (good visibility)";
    return "High (detailed identification capable)";
  }

  function calc(){
    const w = parseFloat($("w").value);
    const d = parseFloat($("d").value);
    const fc = parseFloat($("fc").value);
    const uf = parseFloat($("uf").value) / 100;
    const llf = parseFloat($("llf").value) / 100;

    const area = w * d;
    const lumens = (fc * area) / Math.max(0.05, (uf * llf));
    const classification = classify(fc);

    render([
      {label:"Area", value:`${area.toFixed(0)} sq ft`},
      {label:"Target Illumination", value:`${fc.toFixed(2)} fc`},
      {label:"Estimated Lumens Required", value:`${lumens.toFixed(0)} lm`},
      {label:"Lighting Condition", value:classification},
      {
        label:"Interpretation",
        value:
        fc < 2
          ? "Scene will rely heavily on IR or low-light camera performance. Expect reduced color accuracy and increased noise."
          : fc < 5
          ? "Suitable for general surveillance, but not ideal for facial identification or license plate capture."
          : "Lighting supports strong image clarity and improves downstream performance such as pixel density and recognition."
      }
    ]);

    // SAVE PIPELINE STATE
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      category: "physical-security",
      step: "scene-illumination",
      data: {
        area,
        fc,
        lumens
      }
    }));

    continueBtn.style.display = "inline-block";
  }

  function reset(){
    $("w").value = 60;
    $("d").value = 40;
    $("fc").value = 2.0;
    $("uf").value = 70;
    $("llf").value = 80;

    $("results").innerHTML = "";
    continueBtn.style.display = "none";

    sessionStorage.removeItem(STORAGE_KEY);
  }

  function invalidate(){
    continueBtn.style.display = "none";
    sessionStorage.removeItem(STORAGE_KEY);
  }

  // EVENTS
  $("calc").onclick = calc;
  $("reset").onclick = reset;

  ["w","d","fc","uf","llf"].forEach(id=>{
    $(id).addEventListener("input", invalidate);
  });

})();