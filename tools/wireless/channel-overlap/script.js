(() => {
  const $ = id => document.getElementById(id);

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

  function suggestedChannels(band, width){
    // planning defaults (not regulatory/exhaustive)
    if(band==="24"){
      return width==="20" ? 3 : 1; // 1/6/11 vs wide channels are basically overlap city
    }
    if(band==="5"){
      if(width==="20") return 9;
      if(width==="40") return 4;
      if(width==="80") return 2;
      return 1;
    }
    // 6 GHz has more, but we'll give conservative planning counts by width
    if(width==="20") return 24;
    if(width==="40") return 12;
    if(width==="80") return 6;
    return 3;
  }

  function calc(){
    const band=$("band").value;
    const width=$("width").value;
    const aps=Math.max(1, parseFloat($("aps").value));
    let ch=Math.max(1, parseFloat($("ch").value));

    const suggested = suggestedChannels(band, width);
    const reuse = aps / ch;

    let status = "OK";
    if(reuse > 2) status = "MODERATE CO-CHANNEL CONTENTION LIKELY";
    if(reuse > 3) status = "HIGH CO-CHANNEL CONTENTION LIKELY";

    render([
      {label:"Band / Width", value:`${band==="24"?"2.4 GHz":band==="5"?"5 GHz":"6 GHz"} / ${width} MHz`},
      {label:"AP Count", value:`${aps.toFixed(0)}`},
      {label:"Channels Provided", value:`${ch.toFixed(0)}`},
      {label:"Suggested Channels (typical)", value:`${suggested}`},
      {label:"Average Channel Reuse (APs per channel)", value:`${reuse.toFixed(2)}`},
      {label:"Result", value:status},
      {label:"Note", value:"This is a planner. Real overlap/interference requires RF survey + channel plan + power tuning."}
    ]);
  }

  function reset(){
    $("band").value="24";
    $("width").value="20";
    $("aps").value=8;
    $("ch").value=3;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;

  // helpful: auto-set a sane default channel count when band/width changes
  function autoDefaults(){
    const band=$("band").value;
    const width=$("width").value;
    $("ch").value = suggestedChannels(band, width);
  }
  $("band").addEventListener("change", autoDefaults);
  $("width").addEventListener("change", autoDefaults);
})();
