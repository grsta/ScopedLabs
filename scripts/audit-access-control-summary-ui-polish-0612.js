const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  acIndex: "tools/access-control/summary/index.html",
  acScript: "tools/access-control/summary/script.js",
  acCategory: "tools/access-control/index.html",
  psIndex: "tools/physical-security/summary/index.html",
  psScript: "tools/physical-security/summary/script.js",
  proof: "scripts/audit-access-control-summary-page-proof-0612.js",
  readiness: "scripts/audit-access-control-summary-master-assistant-readiness-0612.js",
  evidenceSuite: "scripts/audit-access-control-evidence-suite-0611.js",
  categoryReadiness: "scripts/audit-access-control-category-readiness-checkpoint-0611.js",
  sitemap: "sitemap.xml",
};

const forbiddenPhysicalSecurityTerms = [
  "Physical Security",
  "physical-security",
  "camera",
  "Camera",
  "lens",
  "Lens",
  "plate",
  "Plate",
  "Area Planner",
  "coverage",
  "Coverage",
];

const requiredAccessControlMarkers = [
  "Access Control Summary",
  "Access Control Master Assistant",
  "Final Report Export",
  "Report metadata",
  "Open Report",
  "Save Snapshot",
  "Access Control Rollup",
];

const generatedMountMarkers = [
  "accessControlSummaryKpis",
  "accessControlMasterAssistant",
  "accessControlToolRollup",
  "accessControlToolNotes",
];

const accessSummaryClassMarkers = [
  "access-summary-kpi",
  "access-summary-status",
  "access-summary-tool-row",
  "access-summary-note",
];

function filePath(rel) {
  return path.join(root, rel);
}

function exists(rel) {
  return fs.existsSync(filePath(rel));
}

function read(rel) {
  return exists(rel) ? fs.readFileSync(filePath(rel), "utf8") : "";
}

function countMatches(text, regex) {
  return (String(text || "").match(regex) || []).length;
}

function includesAny(text, tokens) {
  return tokens.filter((token) => String(text || "").includes(token));
}

function extractLinks(html) {
  const links = [];
  const regex = /href\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = regex.exec(html))) {
    links.push(match[1]);
  }

  return [...new Set(links)].sort();
}

function extractScripts(html) {
  const scripts = [];
  const regex = /<script\b[^>]*src=["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = regex.exec(html))) {
    scripts.push(match[1]);
  }

  return scripts;
}

function extractHeadings(html) {
  const headings = [];
  const regex = /<h([1-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;

  while ((match = regex.exec(html))) {
    const text = String(match[2] || "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    headings.push({ level: Number(match[1]), text });
  }

  return headings;
}

function auditFilePresence() {
  console.log("File presence");

  let ok = true;

  for (const [label, rel] of Object.entries(files)) {
    const present = exists(rel);

    console.log((present ? "SAFE  " : "FAIL  ") + rel);

    if (!present) ok = false;
  }

  return ok;
}

function auditBaseline(acIndex, acScript, psIndex, psScript) {
  console.log("");
  console.log("Baseline / reference markers");

  const physicalBaselineOk =
    psIndex.includes("Physical Security Summary") &&
    psIndex.includes("Master Assistant") &&
    psScript.includes("ScopedLabsPhysicalSecurity");

  console.log((physicalBaselineOk ? "SAFE  " : "WATCH ") + "Physical Security summary reference markers present");

  const accessMarkers = requiredAccessControlMarkers.filter((marker) => acIndex.includes(marker));

  console.log("INFO  Access Control required markers: " + accessMarkers.length + " / " + requiredAccessControlMarkers.length);

  for (const marker of requiredAccessControlMarkers) {
    console.log((acIndex.includes(marker) ? "SAFE  " : "WATCH ") + "index marker: " + marker);
  }

  const scriptApiOk =
    acScript.includes("ScopedLabsAccessControlSummary") &&
    acScript.includes("access-control-summary-master-assistant-001") &&
    acScript.includes("TOOL_DEFINITIONS");

  console.log((scriptApiOk ? "SAFE  " : "FAIL  ") + "Access Control summary script API markers present");

  return physicalBaselineOk && accessMarkers.length >= 5 && scriptApiOk;
}

function auditCopy(acIndex, acScript) {
  console.log("");
  console.log("Copy / leftover wording scan");

  const combined = acIndex + "\n" + acScript;
  const leftovers = includesAny(combined, forbiddenPhysicalSecurityTerms);

  if (!leftovers.length) {
    console.log("SAFE  no obvious Physical Security/camera leftover wording");
  } else {
    console.log("WATCH leftover wording review: " + leftovers.join(", "));
  }

  const accessTerms = includesAny(combined, [
    "Access Control",
    "door",
    "reader",
    "lock",
    "panel",
    "credential",
    "anti-passback",
    "special locking",
  ]);

  console.log("INFO  Access Control domain terms found: " + accessTerms.length);

  return leftovers.length;
}

function auditStructure(acIndex, acScript) {
  console.log("");
  console.log("Summary UI structure map");

  const headings = extractHeadings(acIndex);
  const links = extractLinks(acIndex);
  const scripts = extractScripts(acIndex);

  const counts = {
    h1: headings.filter((item) => item.level === 1).length,
    h2: headings.filter((item) => item.level === 2).length,
    h3: headings.filter((item) => item.level === 3).length,
    cardClass: countMatches(acIndex, /class=["'][^"']*\bcard\b[^"']*["']/gi),
    toolCardClass: countMatches(acIndex, /class=["'][^"']*\btool-card\b[^"']*["']/gi),
    buttonLikeLinks: countMatches(acIndex, /class=["'][^"']*\b(?:btn|button|cta|action)\b[^"']*["']/gi),
    reportMetadataMount: countMatches(acIndex, /reportMetadataMount/g),
    exportReport: countMatches(acIndex, /exportReport/g),
    saveSnapshot: countMatches(acIndex, /saveSnapshot/g),
    scriptRefs: scripts.length,
    summaryHref: links.filter((link) => link.includes("/tools/access-control/summary/") || link === "summary/" || link === "./summary/").length,
  };

  for (const [key, value] of Object.entries(counts)) {
    console.log("INFO  " + key + ": " + value);
  }

  console.log("");
  console.log("Heading map");
  headings.forEach((heading) => console.log("INFO  h" + heading.level + " " + heading.text));

  console.log("");
  console.log("Generated mount markers");

  for (const marker of generatedMountMarkers) {
    const inIndex = acIndex.includes(marker);
    const inScript = acScript.includes(marker);

    console.log((inIndex || inScript ? "SAFE  " : "WATCH ") + marker + " index=" + inIndex + " script=" + inScript);
  }

  console.log("");
  console.log("Generated class markers");

  for (const marker of accessSummaryClassMarkers) {
    const present = acScript.includes(marker) || acIndex.includes(marker);

    console.log((present ? "SAFE  " : "WATCH ") + marker);
  }

  const polishTargets = [];

  if (counts.cardClass < 3) polishTargets.push("CARD_RHYTHM_REVIEW");
  if (counts.toolCardClass < 2) polishTargets.push("TOOL_CARD_RHYTHM_REVIEW");
  if (counts.buttonLikeLinks < 2) polishTargets.push("CTA_BUTTON_ROW_REVIEW");
  if (counts.reportMetadataMount < 1) polishTargets.push("REPORT_METADATA_MOUNT_REVIEW");
  if (counts.exportReport < 1 || counts.saveSnapshot < 1) polishTargets.push("EXPORT_SNAPSHOT_CONTROLS_REVIEW");

  return { counts, polishTargets };
}

function auditReachability(acCategory, sitemap, proof, evidenceSuite, categoryReadiness) {
  console.log("");
  console.log("Reachability / evidence pins");

  const categoryLink =
    acCategory.includes('href="/tools/access-control/summary/"') ||
    acCategory.includes("href='/tools/access-control/summary/'") ||
    acCategory.includes('href="./summary/"') ||
    acCategory.includes('href="summary/"');

  console.log((categoryLink ? "SAFE  " : "FAIL  ") + "category opening page links to summary");

  const sitemapLink = sitemap.includes("https://scopedlabs.com/tools/access-control/summary/");

  console.log((sitemapLink ? "SAFE  " : "FAIL  ") + "sitemap includes Access Control summary URL");

  const proofPinned =
    proof.includes("ACCESS_CONTROL_SUMMARY_PAGE_CREATED") &&
    proof.includes("ACCESS_CONTROL_CATEGORY_OPENING_SUMMARY_LINK_PRESENT") &&
    proof.includes("ACCESS_CONTROL_SUMMARY_SITEMAP_URL_PRESENT");

  console.log((proofPinned ? "SAFE  " : "FAIL  ") + "summary proof audit pins reachability");

  const suitePinned = evidenceSuite.includes("Access Control summary page proof");

  console.log((suitePinned ? "SAFE  " : "FAIL  ") + "summary proof wired into evidence suite");

  const readinessPinned =
    categoryReadiness.includes("SUMMARY_MASTER_ASSISTANT_READY") &&
    categoryReadiness.includes("Summary/master assistant readiness");

  console.log((readinessPinned ? "SAFE  " : "FAIL  ") + "summary readiness wired into category checkpoint");

  return categoryLink && sitemapLink && proofPinned && suitePinned && readinessPinned;
}

let failCount = 0;
let watchCount = 0;

console.log("ScopedLabs Access Control summary UI polish audit - 0612");
console.log("Repo:", root);
console.log("");

if (!auditFilePresence()) failCount += 1;

const acIndex = read(files.acIndex);
const acScript = read(files.acScript);
const acCategory = read(files.acCategory);
const psIndex = read(files.psIndex);
const psScript = read(files.psScript);
const proof = read(files.proof);
const readiness = read(files.readiness);
const evidenceSuite = read(files.evidenceSuite);
const categoryReadiness = read(files.categoryReadiness);
const sitemap = read(files.sitemap);

if (!auditBaseline(acIndex, acScript, psIndex, psScript)) failCount += 1;

const leftoverCount = auditCopy(acIndex, acScript);
if (leftoverCount > 0) watchCount += leftoverCount;

const structure = auditStructure(acIndex, acScript);
watchCount += structure.polishTargets.length;

if (!auditReachability(acCategory, sitemap, proof, evidenceSuite, categoryReadiness)) failCount += 1;

console.log("");
console.log("Polish target summary");

if (!structure.polishTargets.length && leftoverCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_UI_NO_POLISH_TARGETS_DETECTED");
} else {
  for (const target of structure.polishTargets) {
    console.log("WATCH " + target);
  }

  if (leftoverCount > 0) {
    console.log("WATCH COPY_LEFTOVER_WORDING_REVIEW");
  }
}

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_UI_BASELINE_SAFE");
} else {
  console.log("FAIL  ACCESS_CONTROL_SUMMARY_UI_BASELINE_FAILED");
}

if (watchCount > 0) {
  console.log("WATCH ACCESS_CONTROL_SUMMARY_UI_POLISH_TARGETS_FOUND");
} else {
  console.log("SAFE  ACCESS_CONTROL_SUMMARY_UI_POLISH_NOT_REQUIRED");
}

console.log("SAFE  NO_CALCULATOR_PAGE_CHANGES");
console.log("SAFE  NO_AUTH_CHECKOUT_EXPORT_SNAPSHOT_BEHAVIOR_CHANGES");
console.log("SAFE  POLISH_AUDIT_ONLY");

if (process.argv.includes("--details")) {
  console.log("");
  console.log("Detailed script references");
  extractScripts(acIndex).forEach((script) => console.log("  " + script));

  console.log("");
  console.log("Detailed links containing access-control");
  extractLinks(acIndex)
    .filter((link) => link.includes("access-control") || link.includes("summary"))
    .forEach((link) => console.log("  " + link));
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");