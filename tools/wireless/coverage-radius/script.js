(() => {
  const $ = id => document.getElementById(id);

  // very rough planning table (feet)
  const base = {
    "24": { open: 180, office: 120, dense: 80 },
    "5":  { open: 140, office: 95,  dense: 65 },
    "6":  { open: 115, office: 80,  dense: 55 }
  };

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

  function calc(){
    const band=$("band").value;
    const env=$("env").value;
    const rssi=parseFloat($("rssi").value);
    const pwr=$("pwr").value;

    let radius = base[band][env];

    // RSSI target adjustment (tighter target -> smaller radius)
    // -60 stronger target => reduce; -72 looser => increase
    if (rssi > -65) radius *= 0.80;
    else if (rssi > -67) radius *= 0.90;
    else if (rssi < -72) radius *= 1.15;
    else if (rssi < -70) radius *= 1.08;

    // power adjustment
    if (pwr === "low") radius *= 0.85;
    if (pwr === "high") radius *= 1.10;

    const area = Math.PI * radius * radius;

    render([
      {label:"Estimated Radius", value:`${radius.toFixed(0)} ft`},
      {label:"Estimated Coverage Area", value:`${area.toFixed(0)} sq ft`},
      {label:"Min RSSI Target", value:`${rssi.toFixed(0)} dBm`},
      {label:"Note", value:"Planning estimate only. Real coverage requires RF survey, mounting height, antenna pattern, and channel plan."}
    ]);
  }

  function reset(){
    $("band").value="24";
    $("env").value="open";
    $("rssi").value=-67;
    $("pwr").value="med";
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
