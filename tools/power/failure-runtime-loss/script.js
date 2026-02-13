const baselineLoadEl = document.getElementById("baselineLoad");
const failureLoadEl  = document.getElementById("failureLoad");
const batteryWhEl   = document.getElementById("batteryWh");
const voltageEl     = document.getElementById("voltage");
const efficiencyEl  = document.getElementById("efficiency");
const dodEl         = document.getElementById("dod");
const resultsEl     = document.getElementById("results");

document.getElementById("calc").addEventListener("click", calculate);
document.getElementById("reset").addEventListener("click", resetForm);

function calculate() {

  const baselineLoad = Number(baselineLoadEl.value);
  const failureLoad  = Number(failureLoadEl.value);
  const batteryWh   = Number(batteryWhEl.value);
  const efficiency  = Number(efficiencyEl.value) / 100;
  const dod         = Number(dodEl.value) / 100;
  const voltage     = voltageEl.value;

  if (baselineLoad <= 0 || failureLoad <= 0 || batteryWh <= 0) {
    resultsEl.innerHTML = `<ul><li>Fix: Load must be &gt; 0 W</li></ul>`;
    return;
  }

  const usableWh = batteryWh * efficiency * dod;

  const baselineRuntime = usableWh / baselineLoad;
  const failureRuntime  = usableWh / failureLoad;

  const runtimeLost = baselineRuntime - failureRuntime;
  const percentLost = (runtimeLost / baselineRuntime) * 100;

  resultsEl.innerHTML = `
    <ul>
      <li><b>Baseline Runtime:</b> ${baselineRuntime.toFixed(2)} h</li>
      <li><b>Failure Runtime:</b> ${failureRuntime.toFixed(2)} h</li>
      <li><b>Runtime Lost:</b> ${runtimeLost.toFixed(2)} h (${percentLost.toFixed(1)}%)</li>
      <li><b>Baseline Load:</b> ${baselineLoad} W</li>
      <li><b>Failure Load:</b> ${failureLoad} W</li>
      <li><b>Battery Capacity:</b> ${batteryWh} Wh</li>
      <li><b>Efficiency Used:</b> ${(efficiency*100)}%</li>
      <li><b>Max DoD Used:</b> ${(dod*100)}%</li>
      <li><b>System Voltage:</b> ${voltage} V</li>
    </ul>
  `;
}

function resetForm() {
  baselineLoadEl.value = 300;
  failureLoadEl.value = 360;
  batteryWhEl.value = 1200;
  efficiencyEl.value = 75;
  dodEl.value = 70;
  voltageEl.value = 12;
  resultsEl.innerHTML = "";
}


