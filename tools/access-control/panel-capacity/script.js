// Panel Capacity Planner (generic, vendor-agnostic)
(() => {
  const $ = (id) => document.getElementById(id);

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
  }

  function ceilDiv(a, b) {
    return b <= 0 ? 0 : Math.ceil(a / b);
  }

  function render(rows) {
    const el = $("results");
    el.innerHTML = "";
    rows.forEach(r => {
      const div = document.createElement("div");
      div.className = "result-row";
      div.innerHTML = `
        <span class="result-label">${r.label}</span>
        <span class="result-value">${r.value}</span>
      `;
      el.appendChild(div);
    });
  }

  function calc() {
    const doors = Math.max(0, Math.floor(n("doors")));
    const readersPerDoor = Math.max(1, Math.floor(n("readersPerDoor")));
    const inputsPerDoor = Math.max(0, Math.floor(n("inputsPerDoor")));
    const outputsPerDoor = Math.max(0, Math.floor(n("outputsPerDoor")));
    const baseDoors = Math.max(1, Math.floor(n("baseDoors")));
    const expDoors = Math.max(1, Math.floor(n("expDoors")));
    const maxExp = Math.max(0, Math.floor(n("maxExp")));
    const spare = Math.max(0, n("spare"));

    const targetDoors = Math.ceil(doors * (1 + spare / 100));

    // Doors capacity per panel = base + (maxExp * expDoors)
    const doorsPerPanel = baseDoors + (maxExp * expDoors);

    const panels = Math.max(1, ceilDiv(targetDoors, doorsPerPanel));

    // Now compute approximate expansions needed
    const totalBaseCapacity = panels * baseDoors;
    const remainingDoors = Math.max(0, targetDoors - totalBaseCapacity);
    const expansionsNeeded = ceilDiv(remainingDoors, expDoors);

    const expPerPanel = panels > 0 ? expansionsNeeded / panels : 0;

    // IO totals (planning)
    const readers = doors * readersPerDoor;
    const inputs = doors * inputsPerDoor;
    const outputs = doors * outputsPerDoor;

    const warnings = [];
    if (expansionsNeeded > panels * maxExp) {
      warnings.push("Expansion limit exceeded: increase panels or choose higher-capacity controllers.");
    }
    if (spare < 10) {
      warnings.push("Spare capacity is low. Consider 15–25% to avoid future rip-and-replace.");
    }

    render([
      { label: "Doors (requested)", value: `${doors}` },
      { label: "Spare Capacity", value: `${spare.toFixed(0)}%` },
      { label: "Doors (with spare)", value: `${targetDoors}` },

      { label: "Capacity per Panel (doors)", value: `${doorsPerPanel} (base ${baseDoors} + ${maxExp}×${expDoors})` },
      { label: "Panels Required (est.)", value: `${panels}` },
      { label: "Expansion Modules Needed", value: `${expansionsNeeded}` },
      { label: "Avg Expansions per Panel", value: `${expPerPanel.toFixed(2)}` },

      { label: "Total Readers (approx)", value: `${readers}` },
      { label: "Total Inputs (approx)", value: `${inputs}` },
      { label: "Total Outputs (approx)", value: `${outputs}` },

      { label: "Notes", value: warnings.length ? warnings.join(" ") : "Estimate tool. Confirm vendor panel door/IO counts and licensing." }
    ]);
  }

  function reset() {
    $("doors").value = 24;
    $("readersPerDoor").value = "1";
    $("inputsPerDoor").value = 2;
    $("outputsPerDoor").value = 1;
    $("baseDoors").value = 4;
    $("expDoors").value = 2;
    $("maxExp").value = 8;
    $("spare").value = 20;
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();

