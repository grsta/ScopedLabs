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

  function calc(){
    const rows=parseInt($("rows").value);
    const racksPer=parseInt($("racksPer").value);
    const rackW=parseFloat($("rackW").value);
    const rackD=parseFloat($("rackD").value);
    const cold=parseFloat($("cold").value);
    const hot=parseFloat($("hot").value);
    const end=parseFloat($("end").value);

    // length of row = racks * width + 2 end clearance
    const lengthIn = racksPer * rackW + 2 * end;

    // width depends on number of rows:
    // each row contributes rack depth, and between rows you have aisles (cold/hot alternating)
    let widthIn = 0;
    for(let i=0;i<rows;i++){
      widthIn += rackD;
      if(i < rows-1){
        // alternate aisles between rows: cold then hot then cold...
        widthIn += (i % 2 === 0) ? cold : hot;
      }
    }

    const lengthFt = lengthIn / 12;
    const widthFt = widthIn / 12;
    const areaSqFt = lengthFt * widthFt;

    render([
      {label:"Estimated Room Length", value:`${lengthFt.toFixed(1)} ft`},
      {label:"Estimated Room Width", value:`${widthFt.toFixed(1)} ft`},
      {label:"Estimated Floor Area", value:`${areaSqFt.toFixed(0)} sq ft`},
      {label:"Note", value:"This is a planning estimate. Verify clearance requirements, egress, and code compliance for your site."}
    ]);
  }

  function reset(){
    $("rows").value=2;
    $("racksPer").value=6;
    $("rackW").value=24;
    $("rackD").value=42;
    $("cold").value=48;
    $("hot").value=48;
    $("end").value=36;
    $("results").innerHTML="";
  }

  $("calc").onclick=calc;
  $("reset").onclick=reset;
})();
