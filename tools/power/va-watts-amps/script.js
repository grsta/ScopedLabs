const volts = document.getElementById("volts");
const pf = document.getElementById("pf");
const watts = document.getElementById("watts");
const va = document.getElementById("va");

const outWatts = document.getElementById("outWatts");
const outVA = document.getElementById("outVA");
const outAmps = document.getElementById("outAmps");
const note = document.getElementById("note");

function setBlank() {
  // ASCII only to avoid charset weirdness
  outWatts.textContent = "--";
  outVA.textContent = "--";
  outAmps.textContent = "--";
}

function n(x) {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

document.getElementById("calc").onclick = () => {
  const V = n(volts.value);
  const PF = n(pf.value);
  const W = n(watts.value);
  const VA = n(va.value);

  if (V <= 0) {
    note.textContent = "Voltage must be greater than 0.";
    setBlank();
    return;
  }
  if (PF < 0.5 || PF > 1.0) {
    note.textContent = "Power Factor must be between 0.5 and 1.0.";
    setBlank();
    return;
  }

  let finalWatts = 0;
  let finalVA = 0;

  if (W > 0 && VA > 0) {
    note.textContent = "Enter Watts OR VA (not both).";
    setBlank();
    return;
  }

  if (W > 0) {
    finalWatts = W;
    finalVA = W / PF;
  } else if (VA > 0) {
    finalVA = VA;
    finalWatts = VA * PF;
  } else {
    note.textContent = "Enter Watts OR VA.";
    setBlank();
    return;
  }

  const amps = finalVA / V;

  outWatts.textContent = Math.round(finalWatts).toLocaleString() + " W";
  outVA.textContent = Math.round(finalVA).toLocaleString() + " VA";
  outAmps.textContent = amps.toFixed(2) + " A";

  note.textContent = "Single-phase formulas: W = VA × PF, A = VA ÷ V.";
};

document.getElementById("reset").onclick = () => {
  volts.value = 120;
  pf.value = 0.90;
  watts.value = "";
  va.value = "";
  setBlank();
  note.textContent = "Enter Watts OR VA, then press Calculate.";
};

setBlank();
console.log("VA/Watts/Amps tool loaded");

