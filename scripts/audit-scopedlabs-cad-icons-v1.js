const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  dir: path.join(root, "assets", "cad-icons"),
  registry: path.join(root, "assets", "cad-icons", "scopedlabs-cad-icons.js"),
  readme: path.join(root, "assets", "cad-icons", "README.md")
};

let pass = 0;
let fail = 0;

function result(kind, label, detail) {
  kind = String(kind || "FAIL").toUpperCase();
  if (kind === "PASS") pass++;
  if (kind === "FAIL") fail++;
  console.log(kind.padEnd(6), label);
  if (detail) console.log("       " + detail);
}

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const registry = read(files.registry);
const readme = read(files.readme);

console.log("ScopedLabs CAD Icons Foundation Audit V1");
console.log("Repo:", root);

result(fs.existsSync(files.dir) ? "PASS" : "FAIL", "CAD icon folder exists", path.relative(root, files.dir));
result(registry ? "PASS" : "FAIL", "global CAD icon registry exists", path.relative(root, files.registry));
result(readme ? "PASS" : "FAIL", "CAD icon README exists", path.relative(root, files.readme));

for (const token of [
  "window.ScopedLabsCadIcons",
  "VERSION",
  "registerIcon",
  "renderIcon",
  "hasIcon",
  "getIcon",
  "listIcons",
  "categories",
  "tones",
  "toneColors",
  "global.proof-marker",
  "global.warning-marker",
  "data-sl-cad-icon",
  "data-sl-icon-source",
  "scopedlabs-cad-icons"
]) {
  result(registry.includes(token) ? "PASS" : "FAIL", "registry token: " + token);
}

for (const token of [
  "Global shared CAD icon registry",
  "category-neutral",
  "listIcons()",
  "renderIcon(id, options)"
]) {
  result(readme.includes(token) ? "PASS" : "FAIL", "README token: " + token);
}

console.log("");
console.log("========================================================================");
console.log("SUMMARY");
console.log("========================================================================");
console.log("PASS :", pass);
console.log("FAIL :", fail);

if (fail) {
  console.log("");
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("");
console.log("OVERALL: PASS");
