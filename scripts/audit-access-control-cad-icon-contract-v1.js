const fs = require("fs");
const path = require("path");

const root = process.cwd();
const rows = [];
let failed = false;

function file(rel) {
  return path.join(root, rel);
}

function read(rel) {
  const abs = file(rel);
  return fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : "";
}

function check(name, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: name, Detail: detail });
  if (!ok) failed = true;
}

function getBlock(text, functionName) {
  const startToken = "function " + functionName + "(";
  const start = text.indexOf(startToken);
  if (start < 0) return "";

  let i = text.indexOf("{", start);
  if (i < 0) return "";

  let depth = 0;
  let end = -1;

  for (; i < text.length; i++) {
    if (text[i] === "{") depth++;
    if (text[i] === "}") depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }

  return end > start ? text.slice(start, end) : "";
}

const visuals = read("assets/access-control-planning-visuals.js");
const cadDoor = getBlock(visuals, "cadControlledDoorOpeningIcon");
const specialLocking = getBlock(visuals, "buildSpecialLockingSvg");

check("Access Control CAD icon primitive exists", Boolean(cadDoor), "cadControlledDoorOpeningIcon");
check("CAD controlled door icon is exported", visuals.includes("cadControlledDoorOpeningIcon,"));
check("Special Locking uses shared CAD controlled door icon", specialLocking.includes("cadControlledDoorOpeningIcon({"));
check("CAD controlled door icon declares CAD icon data attribute", cadDoor.includes('data-cad-icon="controlled-door-opening"'));
check("CAD controlled door icon uses SVG path linework", cadDoor.includes("<path") && cadDoor.includes("stroke-width"));
check("CAD controlled door icon includes door frame", cadDoor.includes("V") && cadDoor.includes("H"));
check("CAD controlled door icon includes door swing arc", cadDoor.includes(" A") && cadDoor.includes("stroke-dasharray"));
check("CAD controlled door icon includes reader block", cadDoor.includes("readerStroke") && cadDoor.includes("readerFill"));
check("CAD controlled door icon includes lock/strike marker", cadDoor.includes("toneStroke(tone)") && cadDoor.includes("toneFill(tone)"));
check("CAD controlled door icon has reusable tone hooks", cadDoor.includes('tone === "risk"') && cadDoor.includes('tone === "watch"'));
check("CAD controlled door icon has no raster image dependency", !/[.]png|[.]jpg|[.]jpeg|[.]webp|<image|base64/i.test(cadDoor));
check("Legacy non-CAD controlledDoorOpeningIcon name is not used", !visuals.includes("controlledDoorOpeningIcon"));

console.log("\nAccess Control CAD icon contract audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (failed) process.exit(1);
