/*
 * ScopedLabs Physical Security Back + Continue Shell Audit
 * Version: physical-security-back-continue-shell-audit-002-helper-row-detection
 *
 * Read-only audit. No files are modified by this script.
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const toolsRoot = path.join(root, "tools", "physical-security");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function scripts(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=["\']([^"\']+)["\'][^>]*>/gi)).map((m) => m[1]);
}

function hasId(html, id) {
  if (!id) return false;
  return html.includes('id="' + id + '"') || html.includes("id='" + id + "'");
}

function detectRowId(html, helperRowId) {
  if (helperRowId && hasId(html, helperRowId)) return helperRowId;

  const candidates = Array.from(html.matchAll(/<div\s+id=["\']([^"\']+)["\'][^>]*>/gi)).map((m) => m[1]);
  const likely = candidates.find((id) => /FlowActions|flowActions|Actions|nav-row/i.test(id));

  return likely || "-";
}

if (!fs.existsSync(toolsRoot)) {
  throw new Error("Missing tools/physical-security. Run from repo root.");
}

const tools = fs.readdirSync(toolsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const rows = tools.map((tool) => {
  const indexFile = path.join(toolsRoot, tool, "index.html");
  const html = read(indexFile);
  const srcs = scripts(html);

  const helperCallMatch = html.match(/applyBackContinueShell\?\.\(\{\s*rowId:\s*"([^"]+)"/);
  const helperRowId = helperCallMatch ? helperCallMatch[1] : "";
  const rowIdDetected = detectRowId(html, helperRowId);

  const hasBack = /Back to Physical Security/i.test(html);
  const hasNextStepRow = /id=["\']next-step-row["\']/i.test(html);
  const hasContinue = /id=["\']continue["\']/i.test(html);
  const hasShell = html.includes("scopedlabs-tool-shell.js");
  const hasShell004OrNewer = /scopedlabs-tool-shell\.js\?v=scopedlabs-tool-shell-00[4-9]/.test(html);

  const issues = [];

  if (!hasBack) issues.push("missing Back to Physical Security");
  if (!hasNextStepRow) issues.push("missing #next-step-row");
  if (!hasContinue) issues.push("missing #continue");
  if (!hasShell) issues.push("missing Tool Shell helper");

  if (helperRowId && !hasId(html, helperRowId)) {
    issues.push("helper call rowId does not exist in page markup");
  }

  if (helperRowId && !hasShell004OrNewer) {
    issues.push("helper call exists but shell version may not include applyBackContinueShell");
  }

  return {
    tool,
    rowIdDetected,
    helperCall: helperRowId || "-",
    back: hasBack ? "yes" : "no",
    nextStepRow: hasNextStepRow ? "yes" : "no",
    continueId: hasContinue ? "yes" : "no",
    shellLoaded: hasShell ? "yes" : "no",
    localScript: srcs.find((src) => src.includes("./script.js")) || "-",
    status: issues.length ? "watch" : "ok",
    issues: issues.join("; ") || "-"
  };
});

console.log("\nPhysical Security Back + Continue Shell Audit\n");
console.table(rows);

const helperProofs = rows.filter((row) => row.helperCall !== "-");
const watch = rows.filter((row) => row.status !== "ok");

console.log("\nSummary:");
console.log("- Tools audited: " + rows.length);
console.log("- Tools with Back + Continue shell proof call: " + helperProofs.length + "/" + rows.length);
console.log("- Watch issues: " + watch.length);

if (helperProofs.length) {
  console.log("\nCurrent Back + Continue shell proofs:");
  for (const row of helperProofs) {
    console.log("- " + row.tool + ": " + row.helperCall);
  }
}

if (watch.length) {
  console.log("\nWatch items:");
  for (const row of watch) {
    console.log("- " + row.tool + ": " + row.issues);
  }
  process.exitCode = 1;
}

console.log("\nAudit complete. No files modified.");
