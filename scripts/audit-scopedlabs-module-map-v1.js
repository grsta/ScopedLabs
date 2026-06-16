const fs = require("fs");
const path = require("path");

const root = process.cwd();
const docPath = path.join(root, "docs", "scopedlabs-module-map.md");

let pass = 0;
let fail = 0;

function check(label, ok, detail = "") {
  if (ok) {
    pass++;
    console.log("PASS  " + label + (detail ? "\n      " + detail : ""));
  } else {
    fail++;
    console.log("FAIL  " + label + (detail ? "\n      " + detail : ""));
  }
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

console.log("ScopedLabs Module Map Audit V1");
console.log("Repo:", root);
console.log("");

check("module map doc exists", exists("docs/scopedlabs-module-map.md"), "docs/scopedlabs-module-map.md");

const doc = exists("docs/scopedlabs-module-map.md") ? fs.readFileSync(docPath, "utf8") : "";

[
  "assets/export.js",
  "assets/scopedlabs-assistant-export.js",
  "assets/scopedlabs-report-metadata.js",
  "tools/compute/cpu-sizing/index.html",
  "tools/compute/cpu-sizing/script.js",
  "tools/access-control/fail-safe-fail-secure",
  "customPayloadBuilder",
  "ScopedLabsComputeCpuExport.buildPayload",
  "Fail-Safe / Fail-Secure",
  "Lens Selection"
].forEach((token) => {
  check("doc contains " + token, doc.includes(token));
});

const pathMatches = Array.from(doc.matchAll(/\`([^\`]+\.(?:js|css|html)|tools\/[a-z0-9\-]+\/[a-z0-9\-]+)\`/gi))
  .map((match) => match[1])
  .filter((value, index, arr) => arr.indexOf(value) === index);

for (const rel of pathMatches) {
  check("mapped path exists: " + rel, exists(rel), rel);
}

console.log("");
console.log("SUMMARY");
console.log("PASS:", pass);
console.log("FAIL:", fail);

if (fail) process.exit(1);
