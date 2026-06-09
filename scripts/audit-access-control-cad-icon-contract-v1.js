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

function sectionBetween(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  if (start < 0) return "";

  const end = text.indexOf(endNeedle, start + startNeedle.length);
  if (end < 0) return text.slice(start);

  return text.slice(start, end);
}

const visuals = read("assets/access-control-planning-visuals.js");
const cadDoor = sectionBetween(
  visuals,
  "function cadControlledDoorOpeningIcon",
  "function metricChip"
);
const specialLocking = sectionBetween(
  visuals,
  "function buildSpecialLockingSvg",
  "function renderSpecialLocking"
);
const panelCapacityIcon = sectionBetween(
  visuals,
  "function cadAccessPanelCapacityIcon",
  "function metricChip"
);
const credentialFormatBitCard = sectionBetween(
  visuals,
  "function cadCredentialFormatBitCardIcon",
  "function buildDoorCableSvg"
);
const scopeBranchMap = sectionBetween(
  visuals,
  "function buildScopePlannerBranchMapSvg",
  "function cadCredentialFormatBitCardIcon"
);

check("Access Control CAD icon primitive exists", cadDoor.includes("function cadControlledDoorOpeningIcon"), "cadControlledDoorOpeningIcon");
check("CAD controlled door icon is exported", visuals.includes("cadControlledDoorOpeningIcon,"));
check("CAD door reader opening alias exists", visuals.includes("function cadDoorReaderOpeningIcon"), "cadDoorReaderOpeningIcon");
check("CAD door reader opening alias is exported", visuals.includes("cadDoorReaderOpeningIcon,"));
check("Special Locking uses shared CAD controlled door icon", specialLocking.includes("cadControlledDoorOpeningIcon({"));
check("CAD controlled door icon declares CAD icon data attribute", cadDoor.includes('data-cad-icon="controlled-door-opening"'));
check("CAD controlled door icon uses SVG path linework", cadDoor.includes("<path") && cadDoor.includes("stroke-width"));
check("CAD controlled door icon includes door frame", cadDoor.includes("V") && cadDoor.includes("H") && cadDoor.includes("rgba(203,213,225,.66)"));
check("CAD controlled door icon includes door swing arc", cadDoor.includes(" A") && cadDoor.includes("stroke-dasharray"));
check("CAD controlled door icon includes reader block", cadDoor.includes("readerLine") && cadDoor.includes("readerFillValue"));
check("CAD controlled door icon includes lock/strike marker", cadDoor.includes("toneLine") && cadDoor.includes("toneFillValue"));
check("CAD controlled door icon uses thin-line no-filter style", cadDoor.includes('data-cad-detail="door-reader-opening"') && !cadDoor.includes("<filter") && !cadDoor.includes('filter="url('));
check("CAD controlled door icon has reusable tone hooks", cadDoor.includes('tone === "risk"') && cadDoor.includes('tone === "watch"'));
check("CAD controlled door icon has no raster image dependency", !/[.]png|[.]jpg|[.]jpeg|[.]webp|<image|base64/i.test(cadDoor));
check("CAD panel capacity icon primitive exists", panelCapacityIcon.includes("function cadAccessPanelCapacityIcon"), "cadAccessPanelCapacityIcon");
check("CAD panel capacity icon is exported", visuals.includes("cadAccessPanelCapacityIcon,"));
check("CAD panel capacity icon supports dynamic max slots", panelCapacityIcon.includes("maxSlots") && panelCapacityIcon.includes("usedSlots") && panelCapacityIcon.includes("watchSlot"));
check("CAD panel capacity icon declares CAD icon data attribute", panelCapacityIcon.includes('data-cad-icon="access-panel-capacity"'));
check("CAD panel capacity icon uses thin-line no-filter style", panelCapacityIcon.includes('data-cad-detail="dynamic-expansion-slots"') && !panelCapacityIcon.includes("<filter") && !panelCapacityIcon.includes('filter="url('));
check("CAD panel capacity icon has no raster image dependency", !/[.]png|[.]jpg|[.]jpeg|[.]webp|<image|base64/i.test(panelCapacityIcon));
check("CAD credential format bit-card primitive exists", credentialFormatBitCard.includes("function cadCredentialFormatBitCardIcon"), "cadCredentialFormatBitCardIcon");
check("CAD credential format bit-card renderer exists", visuals.includes("function buildCredentialFormatSvg") && visuals.includes("renderCredentialFormat"));
check("CAD credential format bit-card is exported", visuals.includes("cadCredentialFormatBitCardIcon,") && visuals.includes("buildCredentialFormatSvg,"));
check("CAD credential format bit-card supports dynamic fields", credentialFormatBitCard.includes("facilityBits") && credentialFormatBitCard.includes("cardBits") && credentialFormatBitCard.includes("bits === 26"));
check("CAD credential format bit-card uses thin-line no-filter style", credentialFormatBitCard.includes('data-cad-detail="dynamic-bit-layout"') && !credentialFormatBitCard.includes("<filter") && !credentialFormatBitCard.includes('filter="url('));
check("Scope Planner branch-map visual exists", scopeBranchMap.includes("function buildScopePlannerBranchMapSvg"), "buildScopePlannerBranchMapSvg");
check("Scope Planner branch-map visual is exported", visuals.includes("buildScopePlannerBranchMapSvg,"));
check("Scope Planner branch-map visual uses Access Control branches", scopeBranchMap.includes("Core Door Pipeline") && scopeBranchMap.includes("Elevator Readers") && scopeBranchMap.includes("Anti-Passback") && scopeBranchMap.includes("Special Locking"));
check("Scope Planner branch-map visual has no raster image dependency", !/[.]png|[.]jpg|[.]jpeg|[.]webp|<image|base64/i.test(scopeBranchMap));
check("Scope Planner branch-map visual supports print-safe palette", scopeBranchMap.includes('data-export-palette="print-safe"') && scopeBranchMap.includes("exportMode") && scopeBranchMap.includes("#132018"));
check("Fail-Safe CAD lock body primitive exists", visuals.includes("function cadAccessLockBodyIcon") && visuals.includes(`data-cad-icon="access-lock-body"`));
check("Fail-Safe CAD power source primitive exists", visuals.includes("function cadAccessPowerSourceIcon") && visuals.includes(`data-cad-icon="access-power-source"`));
check("Fail-Safe CAD fire release primitive exists", visuals.includes("function cadAccessFireAlarmReleaseIcon") && visuals.includes(`data-cad-icon="access-fire-alarm-release"`));
check("Fail-Safe CAD egress path primitive exists", visuals.includes("function cadAccessEgressPathIcon") && visuals.includes(`data-cad-icon="access-egress-path"`));
check("Fail-Safe state diagram has two visual layers", visuals.includes(`data-fail-safe-visual-mode="entered-plus-recommendation"`) && visuals.includes("A / ENTERED CONDITIONS") && visuals.includes("B / ASSISTANT RECOMMENDATION"));
check("Fail-Safe recommendation markers exist", visuals.includes("RECOMMENDATION REFERENCES") && visuals.includes("*1") && visuals.includes("*2") && visuals.includes("*3"));
check("Legacy non-CAD controlledDoorOpeningIcon name is not used", !visuals.includes("controlledDoorOpeningIcon"));

console.log("\\nAccess Control CAD icon contract audit:");
console.table(rows);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (failed) process.exit(1);
