const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }

  return out;
}

function moduleParses(text) {
  try {
    new Function(text);
    return true;
  } catch {
    return false;
  }
}

function isAccessControlToolPage(file) {
  return file.replace(/\\/g, "/") !== "tools/access-control/index.html";
}

function check(label, ok, detail = "") {
  rows.push({ Status: ok ? "SAFE" : "FAIL", Check: label, Detail: detail });
  if (!ok) failed = true;
}

let failed = false;
const rows = [];

const polish = read("assets/access-control-tool-polish.js");
const versionMatch = polish.match(/const VERSION = "([^"]+)";/);
const currentVersion = versionMatch ? versionMatch[1] : "";

const decorativeLabels = [
  "Pro Tier",
  "Part of a Design Flow",
  "Documentation & Export"
];

const htmlFiles = walk(path.join("tools", "access-control"))
  .filter((file) => file.endsWith(".html"))
  .filter(isAccessControlToolPage);

const pagesWithLabels = [];

for (const file of htmlFiles) {
  const html = read(file);

  for (const label of decorativeLabels) {
    if (html.includes(label)) {
      pagesWithLabels.push({
        file,
        label,
        loadsPolish: html.includes("/assets/access-control-tool-polish.js?v="),
        currentPolish: html.includes("/assets/access-control-tool-polish.js?v=" + currentVersion),
        optsIn: html.includes('data-access-control-tool-polish="true"')
      });
    }
  }
}

const staleLoads = htmlFiles
  .map((file) => ({ file, html: read(file) }))
  .filter((item) => item.html.includes("/assets/access-control-tool-polish.js?v="))
  .filter((item) => !item.html.includes("/assets/access-control-tool-polish.js?v=" + currentVersion));

const missingCoverage = pagesWithLabels
  .filter((item) => !item.loadsPolish || !item.currentPolish || !item.optsIn);

check("Access Control polish module parses", moduleParses(polish));
check("Access Control polish is current page-chrome cleanup lane", currentVersion === "access-control-tool-polish-010-page-chrome-pill-cleanup", currentVersion || "missing VERSION");
check("Existing shared polish module owns decorative page chrome cleanup", polish.includes("function removeDecorativePageChromePills") && polish.includes("access-control-page-chrome-pill-cleanup-010"));
check("Decorative cleanup is exact-label based", polish.includes('"pro tier"') && polish.includes('"part of a design flow"') && polish.includes('"documentation & export"'));
check("Decorative cleanup uses marker attribute", polish.includes("data-access-control-page-chrome-hidden"));
check("Decorative cleanup runs during normalize", polish.includes("removeDecorativePageChromePills(scope);") || polish.includes("removeDecorativePageChromePills(root || document);"));
check("All Access Control polish script loads use current cache", staleLoads.length === 0, staleLoads.map((item) => item.file).join(", "));
check("Pages with decorative labels load and opt into shared polish", missingCoverage.length === 0, missingCoverage.map((item) => item.file + " -> " + item.label).join("; "));

const panelHtml = read("tools/access-control/panel-capacity/index.html");
check(
  "Panel Capacity decorative labels are either removed or covered by shared polish",
  (
    !panelHtml.includes("Pro Tier") ||
    (panelHtml.includes("/assets/access-control-tool-polish.js?v=" + currentVersion) && panelHtml.includes('data-access-control-tool-polish="true"'))
  ) &&
  (
    !panelHtml.includes("Part of a Design Flow") ||
    (panelHtml.includes("/assets/access-control-tool-polish.js?v=" + currentVersion) && panelHtml.includes('data-access-control-tool-polish="true"'))
  ) &&
  (
    !panelHtml.includes("Documentation & Export") ||
    (panelHtml.includes("/assets/access-control-tool-polish.js?v=" + currentVersion) && panelHtml.includes('data-access-control-tool-polish="true"'))
  )
);
check("Panel Capacity loads current shared polish", panelHtml.includes("/assets/access-control-tool-polish.js?v=" + currentVersion));
check("Panel Capacity opts into shared polish", panelHtml.includes('data-access-control-tool-polish="true"'));

check(
  "Access Control category landing is intentionally excluded from tool chrome cleanup",
  !isAccessControlToolPage("tools/access-control/index.html")
);

console.log("\nAccess Control page chrome pill polish audit:");
console.table(rows);

console.log("\nPages with decorative labels:");
console.table(pagesWithLabels);

const safe = rows.filter((row) => row.Status === "SAFE").length;
const fail = rows.filter((row) => row.Status === "FAIL").length;

console.log("\nSummary:");
console.log("- SAFE: " + safe);
console.log("- FAIL: " + fail);

if (failed) process.exit(1);
