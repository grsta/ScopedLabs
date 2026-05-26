const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = process.cwd();

const auditVersion = "physical-security-guidance-adapters-suite-003-field-of-view";

const audits = [
  {
    tool: "field-of-view",
    label: "Field of View",
    file: path.join(root, "scripts", "audit-field-of-view-guidance-adapter-v1.js")
  },
  {
    tool: "camera-spacing",
    label: "Camera Spacing",
    file: path.join(root, "scripts", "audit-camera-spacing-guidance-adapter-v1.js")
  },
  {
    tool: "blind-spot-check",
    label: "Blind Spot",
    file: path.join(root, "scripts", "audit-blind-spot-guidance-adapter-v1.js")
  },
  {
    tool: "license-plate-range",
    label: "License Plate",
    file: path.join(root, "scripts", "audit-license-plate-guidance-adapter-v1.js")
  },
  {
    tool: "face-recognition-range",
    label: "Face Recognition",
    file: path.join(root, "scripts", "audit-face-recognition-guidance-adapter-v1.js")
  },
  {
    tool: "pixel-density",
    label: "Pixel Density",
    file: path.join(root, "scripts", "audit-pixel-density-guidance-adapter-v1.js")
  }
];

console.log("\nPhysical Security Guidance Adapter Audit Suite\n");
console.log("Audit version:", auditVersion);

const rows = audits.map((audit) => {
  if (!fs.existsSync(audit.file)) {
    return {
      tool: audit.tool,
      label: audit.label,
      status: "FAIL",
      detail: "Audit file missing"
    };
  }

  const result = spawnSync(process.execPath, [audit.file], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  });

  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  const safeMatch = output.match(/SAFE:\s*(\d+)/);
  const watchMatch = output.match(/WATCH:\s*(\d+)/);
  const failMatch = output.match(/FAIL:\s*(\d+)/);

  const safe = safeMatch ? Number(safeMatch[1]) : null;
  const watch = watchMatch ? Number(watchMatch[1]) : null;
  const fail = failMatch ? Number(failMatch[1]) : null;

  if (result.status !== 0) {
    return {
      tool: audit.tool,
      label: audit.label,
      status: "WATCH",
      detail: `Audit exited non-zero. SAFE=${safe ?? "?"}, WATCH=${watch ?? "?"}, FAIL=${fail ?? "?"}`
    };
  }

  return {
    tool: audit.tool,
    label: audit.label,
    status: "SAFE",
    detail: `Adapter audit passed. SAFE=${safe ?? "?"}, WATCH=${watch ?? "?"}, FAIL=${fail ?? "?"}`
  };
});

console.table(rows);

const safe = rows.filter((row) => row.status === "SAFE").length;
const watch = rows.filter((row) => row.status === "WATCH").length;
const fail = rows.filter((row) => row.status === "FAIL").length;

console.log("\nSummary:");
console.log("- Adapter proofs:", rows.length);
console.log("- SAFE:", safe);
console.log("- WATCH:", watch);
console.log("- FAIL:", fail);

if (watch || fail) {
  console.log("\nOne or more adapter audits need attention. Run the failing individual audit for details.");
  process.exitCode = 1;
} else {
  console.log("\nAll guidance adapter guardrails passed.");
}

console.log("\nAudit suite complete. No files modified.");
