const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rel = "assets/access-control-planning-visuals.js";
const text = fs.readFileSync(path.join(root, rel), "utf8");

function extractFunction(name) {
  const start = text.indexOf("function " + name + "(");
  if (start < 0) return "";

  const open = text.indexOf("{", start);
  let depth = 0;
  let inString = null;
  let escaped = false;

  for (let i = open; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === inString) inString = null;
      continue;
    }

    const code = ch.charCodeAt(0);
    if (ch === '"' || ch === "'" || code === 96) {
      inString = ch;
      continue;
    }

    if (ch === "{") depth += 1;
    if (ch === "}") {
      depth -= 1;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }

  return "";
}

const doorCable = extractFunction("buildDoorCableSvg");

const checks = [
  ["library has shared door/reader icon", text.includes("function cadDoorReaderOpeningIcon") || text.includes("function cadControlledDoorOpeningIcon")],
  ["library has shared panel icon", text.includes("function cadAccessPanelCapacityIcon")],
  ["Door Cable renderer uses shared door/reader icon", /cad(DoorReaderOpening|ControlledDoorOpening)Icon/.test(doorCable)],
  ["Door Cable renderer uses shared panel icon", /cadAccessPanelCapacityIcon/.test(doorCable)]
];

let fail = 0;

console.log("\\nAccess Control library icon usage audit\\n");

for (const [label, ok] of checks) {
  console.log((ok ? "SAFE " : "WATCH") + " door-cable-length — " + label);
  if (!ok) fail += 1;
}

console.log("\\nSummary: " + (checks.length - fail) + " SAFE / " + fail + " WATCH");