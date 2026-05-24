/*
 * ScopedLabs Physical Security Back + Continue Shell Audit
 * Version: physical-security-back-continue-shell-audit-001
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
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)).map((m) => m[1]);
}

if (!fs.existsSync(toolsRoot)) {
  throw new Error("Missing tools/physical-security. Run from repo root.");
}

const tools = fs.readdirSync(toolsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const rows = tools.map((tool) => {
  const file = path.join(toolsRoot, tool, "index.html");
  const html = read(file);
  const srcs = scripts(html);

  const rowMatch = html.match(/<div\s+id=["']([^"']*(?:FlowActions|flowActions|Actions)[^"']*)["'][^>]*>/i);
  const helperCallMatch = html.match(/applyBackContinueShell\?\.\(\{\s*rowId:\s*"([^"]+)"/);

  const hasBack = /Back to Physical Security/i.test(html);
  const hasNextStepRow = /id=["']next-step-row["']/i.test(html);
  const hasContinue = /id=["']continue["']/i.test(html);
  const hasShell = html.includes("scopedlabs-tool-shell.js");
  const hasShell004OrNewer = /scopedlabs-tool-shell\.js\?v=scopedlabs-tool-shell-00[4-9]/.test(html);

  const issues = [];

  if (!hasBack) issues.push("missing Back to Physical Security");
  if (!hasNextStepRow) issues.push("missing #next-step-row");
  if (!hasContinue) issues.push("missing #continue");
  if (!hasShell) issues.push("missing Tool Shell helper");
  if (helperCallMatch && !rowMatch) issues.push("helper call exists but row ID was not detected");
  if (helperCallMatch && helperCallMatch[1] !== (rowMatch && rowMatch[1])) {
    issues.push("helper rowId does not match detected row");
  }
  if (helperCallMatch && !hasShell004OrNewer) {
    issues.push("helper call exists but shell version may not include applyBackContinueShell");
  }

  return {
    tool,
    rowIdDetected: rowMatch ? rowMatch[1] : "-",
    helperCall: helperCallMatch ? helperCallMatch[1] : "-",
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
console.log(`- Tools audited: ${rows.length}`);
console.log(`- Tools with Back + Continue shell proof call: ${helperProofs.length}/${rows.length}`);
console.log(`- Watch issues: ${watch.length}`);

if (helperProofs.length) {
  console.log("\nCurrent Back + Continue shell proofs:");
  for (const row of helperProofs) {
    console.log(`- ${row.tool}: ${row.helperCall}`);
  }
}

if (watch.length) {
  console.log("\nWatch items:");
  for (const row of watch) {
    console.log(`- ${row.tool}: ${row.issues}`);
  }
  process.exitCode = 1;
}

console.log("\nAudit complete. No files modified.");