const fs = require("fs");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

const checks = [];
function check(id, ok, file, detail) {
  checks.push({ id, ok, file, detail });
}

function optionValues(html) {
  const select = /<select id="workload">([\s\S]*?)<\/select>/.exec(html);
  if (!select) return [];
  return Array.from(select[1].matchAll(/<option value="([^"]+)"/g)).map((m) => m[1]);
}

function hasAll(source, values) {
  return values.every((value) => source.includes(value));
}

const expected = ["general", "web", "db", "virtualization", "analytics", "video", "compute"];

const cpuIndex = read("tools/compute/cpu-sizing/index.html");
const ramIndex = read("tools/compute/ram-sizing/index.html");
const cpuScript = read("tools/compute/cpu-sizing/script.js");
const ramScript = read("tools/compute/ram-sizing/script.js");

const cpuOptions = optionValues(cpuIndex);
const ramOptions = optionValues(ramIndex);

check(
  "CPU_WORKLOAD_OPTIONS_CANONICAL",
  JSON.stringify(cpuOptions) === JSON.stringify(expected),
  "tools/compute/cpu-sizing/index.html",
  cpuOptions.join(", ")
);

check(
  "RAM_WORKLOAD_OPTIONS_CANONICAL",
  JSON.stringify(ramOptions) === JSON.stringify(expected),
  "tools/compute/ram-sizing/index.html",
  ramOptions.join(", ")
);

check(
  "CPU_RAM_WORKLOAD_OPTIONS_MATCH",
  JSON.stringify(cpuOptions) === JSON.stringify(ramOptions),
  "tools/compute/*/index.html",
  "CPU and RAM workload option values should match for carryover."
);

check(
  "CPU_WORKLOAD_FACTOR_COVERS_CANONICAL_VALUES",
  hasAll(cpuScript, [
    'workload === "web"',
    'workload === "db"',
    'workload === "virtualization"',
    'workload === "analytics"',
    'workload === "video"',
    'workload === "compute"'
  ]),
  "tools/compute/cpu-sizing/script.js",
  "CPU factor map should understand every non-default canonical workload value."
);

check(
  "RAM_WORKLOAD_FACTOR_COVERS_CANONICAL_VALUES",
  hasAll(ramScript, [
    'workload === "web"',
    'workload === "db"',
    'workload === "virtualization"',
    'workload === "analytics"',
    'workload === "video"',
    'workload === "compute"'
  ]),
  "tools/compute/ram-sizing/script.js",
  "RAM factor map should understand every non-default canonical workload value."
);

check(
  "RAM_HYDRATES_WORKLOAD_FROM_CPU_CONTEXT",
  ramScript.includes("function hydrateRamWorkloadFromCpu") &&
    ramScript.includes("hydrateRamWorkloadFromCpu(data);") &&
    ramScript.includes("data.workload") &&
    ramScript.includes("data.inputs && data.inputs.workloadType"),
  "tools/compute/ram-sizing/script.js",
  "RAM should set its workload select from CPU pipeline carryover when possible."
);

console.log("SCOPEDLABS COMPUTE WORKLOAD CARRYOVER CONTRACT AUDIT V1\n");

let pass = 0;
let fail = 0;

for (const item of checks) {
  if (item.ok) {
    pass += 1;
    console.log("[PASS] " + item.id);
  } else {
    fail += 1;
    console.log("[FAIL] " + item.id);
  }
  console.log("  " + item.file);
  if (item.detail) console.log("  " + item.detail);
}

console.log("\nSUMMARY");
console.log("PASS: " + pass);
console.log("FAIL: " + fail);
console.log("OVERALL: " + (fail ? "FAIL" : "PASS"));

process.exit(fail ? 1 : 0);
