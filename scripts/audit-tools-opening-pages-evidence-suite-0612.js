const { spawnSync } = require("child_process");
const path = require("path");

const root = process.cwd();

const AUDITS = [
  {
    title: "Tools opening pages",
    file: "scripts/audit-tools-opening-pages-0612.js",
    patterns: [
      "Decision summary",
      "TOOLS_OPENING_PAGE_CONTRACT_NEEDED",
      "CATEGORY_OPENING_PAGE_CONTRACT_NEEDED",
      "TOOL_CARD_GRID_REVIEW",
      "SEO_INTERNAL_LINKING_REVIEW",
      "PRO_LOCK_DISPLAY_REVIEW",
      "PIPELINE_ENTRY_LINKS_REVIEW",
      "KB_GUIDE_LINK_REVIEW",
      "NO_CALCULATOR_SHELL_PATCH_YET",
      "OVERALL:",
    ],
  },
];

function runAudit(audit) {
  console.log("");
  console.log("========================================================================");
  console.log(audit.title);
  console.log("========================================================================");

  const result = spawnSync("node", [audit.file], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  const output = String(result.stdout || "") + String(result.stderr || "");

  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;

    if (
      audit.patterns.some((pattern) => line.includes(pattern)) ||
      line.startsWith("SAFE") ||
      line.startsWith("INFO") ||
      line.startsWith("WATCH") ||
      line.startsWith("SKIP") ||
      line.includes("summary") ||
      line.includes("Summary")
    ) {
      console.log(line);
    }
  }

  if (result.status !== 0) {
    console.log("");
    console.log("FAIL " + audit.file + " exited with code " + result.status);
    return false;
  }

  console.log("");
  console.log("PASS " + audit.file);
  return true;
}

console.log("ScopedLabs Tools Opening Page Evidence Suite - 0612");
console.log("Repo root:", root);
console.log("");
console.log("This suite is informational. It does not replace category-specific main gates.");

let failCount = 0;

for (const audit of AUDITS) {
  if (!runAudit(audit)) failCount += 1;
}

console.log("");
console.log("========================================================================");
console.log("Tools opening page evidence suite summary");
console.log("========================================================================");

if (failCount > 0) {
  console.log("FAIL " + failCount + " audit(s) returned non-zero.");
  process.exit(1);
}

console.log("PASS all opening-page evidence audits completed.");
