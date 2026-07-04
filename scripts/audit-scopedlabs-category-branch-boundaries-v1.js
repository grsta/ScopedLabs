const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const manifestPath = path.join(root, "docs", "scopedlabs-category-branch-boundaries.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

const checks = [];

function check(name, ok, note) {
  checks.push({ name, ok: Boolean(ok), note: note || "" });
}

function readIfExists(rel) {
  const file = path.join(root, rel);
  if (!fs.existsSync(file)) return "";
  return fs.readFileSync(file, "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function extractToolRoutes(text) {
  const found = new Set();
  const re = /\/tools\/[a-z0-9-]+\/[a-z0-9-]+\/?/g;
  let match;
  while ((match = re.exec(text))) {
    found.add(match[0]);
  }
  return Array.from(found).sort();
}

check("MANIFEST_EXISTS", exists("docs/scopedlabs-category-branch-boundaries.json"));
check("MANIFEST_VERSION_PRESENT", manifest.version === "scopedlabs-category-branch-boundaries-0704");
check("CATEGORY_TIER_ALLOW_NOW_PRESENT", Array.isArray(manifest.rules.categoryTier.allowNow) && manifest.rules.categoryTier.allowNow.length >= 2);
check("CATEGORY_TIER_CARRY_ONLY_PRESENT", Array.isArray(manifest.rules.categoryTier.carryOnly) && manifest.rules.categoryTier.carryOnly.length >= 1);
check("CATEGORY_TIER_BLOCKED_NOW_PRESENT", Array.isArray(manifest.rules.categoryTier.blockedNow) && manifest.rules.categoryTier.blockedNow.some((item) => item.indexOf("another category") !== -1));
check("GOLD_TIER_ALLOWED_LATER_PRESENT", Array.isArray(manifest.rules.goldTier.allowedLater) && manifest.rules.goldTier.allowedLater.some((item) => item.indexOf("cross-category") !== -1));
check("GOLD_SURFACE_REQUIREMENT_PRESENT", String(manifest.rules.goldTier.approvedSurfaceRequirement || "").indexOf("Gold") !== -1);

const compute = manifest.categories.compute || {};
const computeTools = [].concat(compute.coreTools || [], compute.optionalTools || []);

check("COMPUTE_CATEGORY_PRESENT", Boolean(compute.categoryPath));
check("COMPUTE_CORE_STORAGE_IOPS_PRESENT", (compute.coreTools || []).includes("storage-iops"));
check("COMPUTE_CORE_STORAGE_THROUGHPUT_PRESENT", (compute.coreTools || []).includes("storage-throughput"));
check("COMPUTE_OPTIONAL_RAID_REBUILD_PRESENT", (compute.optionalTools || []).includes("raid-rebuild-time"));
check("COMPUTE_OPTIONAL_BACKUP_WINDOW_PRESENT", (compute.optionalTools || []).includes("backup-window"));
check("COMPUTE_STANDARD_ALLOWED_PREFIX_ONLY_COMPUTE", (compute.standardRoutePrefixesAllowed || []).length === 1 && compute.standardRoutePrefixesAllowed[0] === "/tools/compute/");
check("COMPUTE_BLOCKS_KNOWN_OTHER_CATEGORIES", (compute.standardRoutePrefixesBlocked || []).includes("/tools/access-control/") && (compute.standardRoutePrefixesBlocked || []).includes("/tools/physical-security/"));

for (const tool of computeTools) {
  check("COMPUTE_TOOL_PATH_EXISTS_" + tool.toUpperCase().replace(/-/g, "_"), exists("tools/compute/" + tool));
}

for (const target of compute.firstProofTargets || []) {
  const combined = (target.files || []).map(readIfExists).join("\n");

  check("PROOF_TARGET_FILES_EXIST_" + target.tool.toUpperCase().replace(/-/g, "_"), (target.files || []).every(exists));

  const routes = extractToolRoutes(combined);
  const crossCategoryRoutes = routes.filter((route) => !route.startsWith("/tools/compute/"));

  check("PROOF_TARGET_NO_CROSS_CATEGORY_ROUTES_" + target.tool.toUpperCase().replace(/-/g, "_"), crossCategoryRoutes.length === 0, crossCategoryRoutes.join(", "));

  const blockedHits = (compute.standardRoutePrefixesBlocked || []).filter((prefix) => combined.includes(prefix));
  check("PROOF_TARGET_NO_BLOCKED_PREFIXES_" + target.tool.toUpperCase().replace(/-/g, "_"), blockedHits.length === 0, blockedHits.join(", "));

  check("PROOF_TARGET_CONTINUE_NEXT_IS_COMPUTE_" + target.tool.toUpperCase().replace(/-/g, "_"), combined.includes("/tools/compute/" + target.continueNext + "/"));

  for (const branchTool of target.allowedBranchTools || []) {
    check("PROOF_TARGET_ALLOWED_BRANCH_EXISTS_" + branchTool.toUpperCase().replace(/-/g, "_"), exists("tools/compute/" + branchTool));
  }

  const hasGoldRoute = /href=["'][^"']*gold|\/tools\/gold|site-assistant|site-summary/i.test(combined);
  check("PROOF_TARGET_NO_GOLD_ROUTE_CLAIM_" + target.tool.toUpperCase().replace(/-/g, "_"), !hasGoldRoute);
}

try {
  JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  check("MANIFEST_JSON_PARSES", true);
} catch (error) {
  check("MANIFEST_JSON_PARSES", false, error.message);
}

let pass = 0;
let fail = 0;

for (const item of checks) {
  if (item.ok) {
    pass += 1;
    console.log("[PASS] " + item.name);
  } else {
    fail += 1;
    console.log("[FAIL] " + item.name + (item.note ? " -- " + item.note : ""));
  }
}

console.log("");
console.log("SCOPEDLABS CATEGORY BRANCH BOUNDARY AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) process.exit(1);
