const fs = require("fs");
const path = require("path");

const root = process.cwd();

const categories = [
  "access-control",
  "compute",
  "infrastructure",
  "network",
  "performance",
  "physical-security",
  "power",
  "thermal",
  "video-storage",
  "wireless"
];

const changed = [];

for (const category of categories) {
  const file = path.join(root, "tools", category, "index.html");

  if (!fs.existsSync(file)) {
    changed.push({ category, status: "MISSING" });
    continue;
  }

  let html = fs.readFileSync(file, "utf8");
  const before = html;

  html = html
    .replace(/Design Pipeline/g, "Guided Design Flow")
    .replace(/DESIGN PIPELINE/g, "GUIDED DESIGN FLOW")
    .replace(/design pipeline preview/g, "guided design flow preview")
    .replace(/Start Design Pipeline/g, "Start Guided Flow")
    .replace(/Start Design Process/g, "Start Guided Flow")
    .replace(
      /Follow a recommended engineering sequence/g,
      "Start with the first step. Build toward the full design."
    )
    .replace(
      /Includes both Free and Pro tools\. Unlock Pro to complete the full flow\./g,
      "The flow includes both Free and Pro tools. Pro access unlocks the full sequence for deeper planning, exportable reports, and saved design snapshots."
    )
    .replace(
      /Includes both Free and Pro tools\. Unlock Pro to complete the full design flow\./g,
      "The flow includes both Free and Pro tools. Pro access unlocks the full sequence for deeper planning, exportable reports, and saved design snapshots."
    );

  if (html !== before) {
    fs.writeFileSync(file, html, "utf8");
    changed.push({ category, status: "UPDATED" });
  } else {
    changed.push({ category, status: "UNCHANGED" });
  }
}

console.table(changed);
