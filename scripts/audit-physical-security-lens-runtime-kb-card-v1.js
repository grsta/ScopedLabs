const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "physical-security-lens-runtime-kb-card-audit-001";

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function exists(rel) { return fs.existsSync(path.join(ROOT, rel)); }

const rows = [];
function add(id, status, detail) { rows.push({ id, status, detail }); }
function safe(id, ok, detail) { add(id, ok ? "SAFE" : "FAIL", detail); }

const help = read("assets/help.js");
const lensIndex = read("tools/physical-security/lens-selection/index.html");

safe("help-exists", exists("assets/help.js"), "help.js exists");
safe("lens-index-exists", exists("tools/physical-security/lens-selection/index.html"), "Lens index exists");
safe("help-version", help.includes("help-034-lens-clean-kb-card"), "help.js runtime version bumped");
safe("lens-clean-kb-tool", help.includes("\"physical-security/lens-selection\": true"), "Lens is in clean KB card tool list");
safe("clean-kb-gate", help.includes("var useCleanKnowledgeCard = !!(toolPath && cleanKnowledgeCardTools[toolPath.key]);"), "clean KB card gate remains");
safe("eyebrow-gate", help.includes("var eyebrowHtml = useCleanKnowledgeCard"), "eyebrow HTML is gated by clean KB card flag");
safe("lens-help-cache", lensIndex.includes("/assets/help.js?v=help-034-lens-clean-kb-card"), "Lens loads bumped help.js cache");
safe("lens-no-hardcoded-kb-pill", !lensIndex.includes("Knowledge Base"), "Lens HTML has no hardcoded Knowledge Base pill");
safe("lens-summary-route-remains", lensIndex.includes("Continue → Physical Security Summary"), "Summary route label remains");

console.log("");
console.log("Physical Security Lens Runtime KB Card Audit");
console.log("Audit version:", VERSION);
console.table(rows);

const failCount = rows.filter((row) => row.status === "FAIL").length;
const watchCount = rows.filter((row) => row.status === "WATCH").length;
const safeCount = rows.filter((row) => row.status === "SAFE").length;

console.log("");
console.log("Summary:");
console.log("- SAFE:", safeCount);
console.log("- WATCH:", watchCount);
console.log("- FAIL:", failCount);

if (failCount) process.exitCode = 1;
else console.log("\nAudit complete.");
