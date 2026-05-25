const fs = require("fs");
const path = require("path");

const root = process.cwd();

const auditVersion = "guidance-adapter-factory-foundation-audit-001";

const files = {
  factory: path.join(root, "assets", "user-guidance-adapter-factory.js"),
  registry: path.join(root, "assets", "physical-security-guidance-registry.js")
};

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

const factory = read(files.factory);
const registry = read(files.registry);

const rows = [
  {
    id: "factory-file",
    status: fs.existsSync(files.factory) ? "SAFE" : "FAIL",
    detail: "assets/user-guidance-adapter-factory.js exists"
  },
  {
    id: "factory-version",
    status: factory.includes("user-guidance-adapter-factory-001-foundation") ? "SAFE" : "WATCH",
    detail: "factory version marker is present"
  },
  {
    id: "factory-global",
    status: factory.includes("ScopedLabsUserGuidanceAdapterFactory") ? "SAFE" : "WATCH",
    detail: "factory exports expected global"
  },
  {
    id: "factory-api",
    status:
      factory.includes("function createAdapter(config)") &&
      factory.includes("function normalizeGuidanceInput(input, config)") &&
      factory.includes("attachGlobal") ? "SAFE" : "WATCH",
    detail: "factory exposes createAdapter and attachGlobal flow"
  },
  {
    id: "registry-file",
    status: fs.existsSync(files.registry) ? "SAFE" : "FAIL",
    detail: "assets/physical-security-guidance-registry.js exists"
  },
  {
    id: "registry-version",
    status: registry.includes("physical-security-guidance-registry-001-foundation") ? "SAFE" : "WATCH",
    detail: "registry version marker is present"
  },
  {
    id: "registry-global",
    status: registry.includes("ScopedLabsPhysicalSecurityGuidanceRegistry") ? "SAFE" : "WATCH",
    detail: "registry exports expected global"
  },
  {
    id: "registry-proven-tools",
    status:
      registry.includes('"camera-spacing"') &&
      registry.includes('"blind-spot-check"') &&
      registry.includes('"pixel-density"') &&
      registry.includes('"face-recognition-range"') &&
      registry.includes('"license-plate-range"') ? "SAFE" : "WATCH",
    detail: "registry includes the five proven guidance tools"
  },
  {
    id: "registry-lens-protected",
    status:
      registry.includes('"lens-selection"') &&
      registry.includes('proofStatus: "protected"') ? "SAFE" : "WATCH",
    detail: "Lens Selection remains protected in registry"
  }
];

console.log("\nGuidance Adapter Factory Foundation Audit\n");
console.log("Audit version:", auditVersion);
console.table(rows);

const safe = rows.filter((row) => row.status === "SAFE").length;
const watch = rows.filter((row) => row.status === "WATCH").length;
const fail = rows.filter((row) => row.status === "FAIL").length;

console.log("\nSummary:");
console.log("- Checks:", rows.length);
console.log("- SAFE:", safe);
console.log("- WATCH:", watch);
console.log("- FAIL:", fail);

console.log("\nAudit complete. No files modified.");

if (watch > 0 || fail > 0) {
  process.exitCode = 1;
}