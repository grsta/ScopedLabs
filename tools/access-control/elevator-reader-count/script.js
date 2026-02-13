// Elevator Reader Count estimator (planning)
(() => {
  const $ = (id) => document.getElementById(id);

  function n(id) {
    const el = $(id);
    const v = el ? parseFloat(String(el.value ?? "").trim()) : NaN;
    return Number.isFinite(v) ? v : 0;
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
    const cars = Math.max(0, Math.floor(n("cars")));
    const banks = Math.max(1, Math.floor(n("banks")));
    const floors = Math.max(0, Math.floor(n("floors")));
    const dest = $("dest").value;           // yes|no
    const placement = $("placement").value; // car|lobby|both

    if (cars <= 0) {
      render([{ label: "Error", value: "Enter Elevator Cars > 0" }]);
      return;
    }

    // Basic reader counts by placement:
    let carReaders = 0;
    let lobbyReaders = 0;

    if (placement === "car") {
      carReaders = cars;
    } else if (placement === "lobby") {
      // per bank you typically deploy 1–2 readers (depending on throughput),
      // use floors as a hint to bump it.
      const perBank = floors > 12 ? 2 : 1;
      lobbyReaders = banks * perBank;
    } else {
      carReaders = cars;
      const perBank = floors > 12 ? 2 : 1;
      lobbyReaders = banks * perBank;
    }

    // Destination control tends to shift authentication to kiosks/lobby.
    // If DCS and placement includes lobby, suggest adding one kiosk reader per bank.
    let dcsAdd = 0;
    if (dest === "yes") {
      if (placement === "lobby" || placement === "both") {
        dcsAdd = banks; // one per bank kiosk (rule-of-thumb)
      } else {
        // if only in-car, still often needs lobby authentication somewhere
        dcsAdd = Math.max(1, Math.round(banks * 0.5));
      }
    }

    const total = carReaders + lobbyReaders + dcsAdd;

    const tips = [
      "Coordinate with the elevator contractor early: control method (relay, serial, dry contacts, DCS integration) drives hardware count.",
      "Lobby placement reduces per-car hardware but can increase queueing if throughput is high.",
      "DCS often authenticates at kiosks; plan reader locations where people actually make destination selections.",
      "Ensure fire service and emergency overrides are engineered correctly (life-safety)."
    ].join(" ");

    render([
      { label: "Cars", value: `${cars}` },
      { label: "Banks", value: `${banks}` },
      { label: "Secured Floors", value: `${floors}` },
      { label: "Destination Control", value: dest === "yes" ? "YES" : "NO" },
      { label: "Placement", value: placement.toUpperCase() },

      { label: "Car Readers (est.)", value: `${carReaders}` },
      { label: "Lobby Readers (est.)", value: `${lobbyReaders}` },
      { label: "DCS Adders (est.)", value: `${dcsAdd}` },

      { label: "Estimated Total Readers", value: `${total}` },
      { label: "Notes", value: "Estimate tool. Final count depends on throughput, kiosk design, and contractor integration requirements." },
      { label: "Best Practices", value: tips }
    ]);
  }

  function reset() {
    $("cars").value = 6;
    $("banks").value = 2;
    $("floors").value = 8;
    $("dest").value = "no";
    $("placement").value = "car";
    $("results").innerHTML = `<div class="muted">Enter values and press Calculate.</div>`;
  }

  $("calc").addEventListener("click", calc);
  $("reset").addEventListener("click", reset);

  reset();
})();
