const fs = require("fs");
const path = require("path");

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function write(rel, content) {
  fs.writeFileSync(path.join(root, rel), content, "utf8");
}

function replaceOrWarn(file, before, after, label) {
  let text = read(file);

  if (!text.includes(before)) {
    console.warn(`WARN: ${label} not found in ${file}`);
    return false;
  }

  text = text.replaceAll(before, after);
  write(file, text);
  console.log(`Fixed: ${label} in ${file}`);
  return true;
}

function patchAmbientRise() {
  const file = "tools/thermal/ambient-rise/script.js";

  replaceOrWarn(
    file,
    "cfm * 1.08 * 10",
    "cfm * k * 10",
    "ambient-rise hardcoded air density factor"
  );
}

function patchExhaustTemperature() {
  const file = "tools/thermal/exhaust-temperature/script.js";
  let text = read(file);

  if (text.includes("cfm * 1.08 * 10")) {
    text = text.replaceAll("cfm * 1.08 * 10", "cfm * k * 10");
    console.log(`Fixed: exhaust-temperature hardcoded air density factor`);
  } else {
    console.warn(`WARN: hardcoded cfm * 1.08 * 10 not found in ${file}`);
  }

  // Remove leftover post-IIFE installer/TODO calc stub if present.
  const before = text;
  text = text.replace(
    /\n\s*function\s+calc\s*\(\)\s*\{\s*\/\/\s*TODO:\s*implement calculate handler\s*\}\s*$/s,
    "\n"
  );

  if (text !== before) {
    console.log(`Removed: exhaust-temperature leftover TODO calc stub`);
  } else {
    console.warn(`WARN: exhaust-temperature TODO calc stub not found or already removed`);
  }

  write(file, text);
}

function patchAirflowRequirement() {
  const file = "tools/thermal/airflow-requirement/script.js";
  let text = read(file);

  const oldChartMax =
    "chartMax: Math.max(3, Number((cfm / 1000).toFixed(2)) + 0.5)";

  const newChartMax =
    "chartMax: Math.max(3, Math.ceil(Math.max(cfm / 1000, 18 / dt, watts / 4000, 1.35) * 1.15 * 100) / 100)";

  if (text.includes(oldChartMax)) {
    text = text.replace(oldChartMax, newChartMax);
    console.log(`Fixed: airflow-requirement chartMax now scales from all pressure metrics`);
  } else {
    console.warn(`WARN: airflow-requirement chartMax pattern not found or already fixed`);
  }

  write(file, text);
}

patchAmbientRise();
patchExhaustTemperature();
patchAirflowRequirement();

console.log("\nThermal formula review repairs complete.");