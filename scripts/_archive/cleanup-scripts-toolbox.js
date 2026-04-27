const fs = require("fs");
const path = require("path");

const root = process.cwd();
const scriptsDir = path.join(root, "scripts");
const archiveDir = path.join(scriptsDir, "_archive");

const keep = new Set([
  "launch-readiness-audit.js",
  "check-tools.js",
  "audit-supabase-config.js",
  "normalize-tool-asset-versions.js",
  "sync-pipeline-lane.js"
]);

fs.mkdirSync(archiveDir, { recursive: true });

const results = [];

for (const name of fs.readdirSync(scriptsDir)) {
  const full = path.join(scriptsDir, name);

  if (!fs.statSync(full).isFile()) continue;
  if (!name.endsWith(".js")) continue;

  if (keep.has(name)) {
    results.push({ script: name, action: "KEPT" });
    continue;
  }

  const dest = path.join(archiveDir, name);

  if (fs.existsSync(dest)) {
    const parsed = path.parse(name);
    const stamped = `${parsed.name}-${Date.now()}${parsed.ext}`;
    fs.renameSync(full, path.join(archiveDir, stamped));
    results.push({ script: name, action: `ARCHIVED AS ${stamped}` });
  } else {
    fs.renameSync(full, dest);
    results.push({ script: name, action: "ARCHIVED" });
  }
}

const readme = `# ScopedLabs Scripts

This folder contains reusable maintenance scripts for the ScopedLabs static site.

## Active toolbox

- \`launch-readiness-audit.js\` — checks active pages for launch-readiness issues.
- \`check-tools.js\` — audits tool-page loading/structure.
- \`audit-supabase-config.js\` — checks Supabase config presence.
- \`normalize-tool-asset-versions.js\` — helps normalize asset cache versions.
- \`sync-pipeline-lane.js\` — helps maintain pipeline lane consistency.

## Archive

One-off repair scripts are moved into \`scripts/_archive/\` after use so they remain available for reference without cluttering the active toolbox.
`;

fs.writeFileSync(path.join(scriptsDir, "README.md"), readme, "utf8");

console.log("Scripts cleanup complete.");
console.table(results);
