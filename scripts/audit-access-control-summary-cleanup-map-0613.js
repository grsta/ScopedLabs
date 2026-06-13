const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  index: "tools/access-control/summary/index.html",
  script: "tools/access-control/summary/script.js",
  category: "tools/access-control/index.html",
  proof: "scripts/audit-access-control-summary-page-proof-0612.js",
  publicAccess: "scripts/audit-access-control-summary-public-access-0613.js",
};

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return exists(rel) ? fs.readFileSync(path.join(root, rel), "utf8") : "";
}

function refsFromHtml(html) {
  const refs = [];
  const re = /<script\b[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi;
  let match;

  while ((match = re.exec(html))) {
    refs.push(match[1]);
  }

  return refs;
}

function localRelFromSrc(src) {
  const clean = String(src || "").split("?")[0];

  if (!clean || clean.startsWith("http://") || clean.startsWith("https://")) return "";

  if (clean.startsWith("/")) return clean.replace(/^\//, "");

  if (clean.startsWith("./")) return path.posix.join("tools/access-control/summary", clean.replace(/^\.\//, ""));

  return clean;
}

function bodyTag(html) {
  const match = html.match(/<body\b[^>]*>/i);
  return match ? match[0] : "";
}

function extractIds(html) {
  return Array.from(html.matchAll(/\sid=["']([^"']+)["']/gi)).map((match) => match[1]);
}

function countMatches(text, pattern) {
  const re = new RegExp(pattern, "gi");
  const matches = text.match(re);
  return matches ? matches.length : 0;
}

let failCount = 0;
let watchCount = 0;

console.log("ScopedLabs Access Control summary cleanup map audit - 0613");
console.log("Repo:", root);
console.log("");

for (const [label, rel] of Object.entries(files)) {
  if (exists(rel)) {
    console.log("SAFE  required source exists: " + rel);
  } else {
    console.log("FAIL  missing required source: " + rel);
    failCount += 1;
  }
}

const index = read(files.index);
const script = read(files.script);
const body = bodyTag(index);
const ids = extractIds(index);
const refs = refsFromHtml(index);

console.log("");
console.log("Summary page public-access contract");

if (/data-summary-public\s*=\s*["']true["']/i.test(body)) {
  console.log("SAFE  summary body declares public summary role");
} else {
  console.log("FAIL  summary body missing public summary role");
  failCount += 1;
}

if (/data-tier\s*=\s*["']public["']/i.test(body)) {
  console.log("SAFE  summary body tier is public");
} else {
  console.log("FAIL  summary body tier is not public");
  failCount += 1;
}

if (!/data-protected\s*=/i.test(body)) {
  console.log("SAFE  summary body has no data-protected marker");
} else {
  console.log("FAIL  summary body still has data-protected marker");
  failCount += 1;
}

console.log("");
console.log("Script reference map");

for (const src of refs) {
  const rel = localRelFromSrc(src);

  if (!rel) {
    console.log("INFO  external script: " + src);
    continue;
  }

  if (exists(rel)) {
    console.log("SAFE  local script exists: " + src + " -> " + rel);
  } else {
    console.log("FAIL  local script reference missing: " + src + " -> " + rel);
    failCount += 1;
  }
}

console.log("");
console.log("Access Control summary render-mount contract");

const expectedMounts = [
  "accessControlSummaryKpis",
  "accessControlMasterAssistant",
  "accessControlToolRollup",
  "accessControlToolNotes",
];

for (const id of expectedMounts) {
  if (ids.includes(id)) {
    console.log("SAFE  static page has Access Control render mount: #" + id);
  } else {
    console.log("WATCH missing static Access Control render mount; script may create duplicate section: #" + id);
    watchCount += 1;
  }
}

const legacyPhysicalIds = ids.filter((id) => /^physicalSecurity/i.test(id));

if (legacyPhysicalIds.length) {
  console.log("WATCH legacy Physical Security IDs remain: " + legacyPhysicalIds.join(", "));
  watchCount += 1;
} else {
  console.log("SAFE  no legacy Physical Security IDs remain");
}

if (index.includes('data-sl-hidden-security-rollup-section="true"')) {
  console.log("WATCH hidden legacy rollup section remains");
  watchCount += 1;
} else {
  console.log("SAFE  no hidden legacy rollup section marker");
}

if (script.includes("ensureSection(")) {
  console.log("WATCH summary script still uses ensureSection fallback; existing static mounts must match or duplicates can appear");
  watchCount += 1;
} else {
  console.log("SAFE  summary script does not use duplicate-section fallback");
}

console.log("");
console.log("Export/report contract");

if (index.includes('reportPrefix: "SL-AC-SUM"')) {
  console.log("SAFE  report prefix is Access Control-specific");
} else if (index.includes('reportPrefix: "SL-PS-SUM"')) {
  console.log("WATCH report prefix still uses Physical Security prefix SL-PS-SUM");
  watchCount += 1;
} else {
  console.log("WATCH report prefix not recognized");
  watchCount += 1;
}

if (index.includes('/assets/access-control-report-summary.js')) {
  if (exists("assets/access-control-report-summary.js")) {
    console.log("SAFE  Access Control report summary asset exists");
  } else {
    console.log("FAIL  page references missing asset: assets/access-control-report-summary.js");
    failCount += 1;
  }
} else {
  console.log("WATCH page does not reference assets/access-control-report-summary.js");
  watchCount += 1;
}

if (exists("assets/physical-security-report-summary.js")) {
  console.log("INFO  physical-security-report-summary.js exists");
}

console.log("");
console.log("Naming debt counts");
console.log("INFO  physicalSecurity token count in index: " + countMatches(index, "physicalSecurity"));
console.log("INFO  Physical Security text count in index: " + countMatches(index, "Physical Security"));
console.log("INFO  accessControl token count in index: " + countMatches(index, "accessControl"));
console.log("INFO  inline margin-top style count: " + countMatches(index, "style=\\\"margin-top:"));

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_NO_HARD_FAILURES");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_HAS_HARD_FAILURES");
}

if (watchCount > 0) {
  console.log("WATCH ACCESS_CONTROL_SUMMARY_CLEANUP_ITEMS: " + watchCount);
} else {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_NO_CLEANUP_ITEMS");
}

console.log("SAFE  AUDIT_ONLY_NO_PAGE_CHANGES");

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");