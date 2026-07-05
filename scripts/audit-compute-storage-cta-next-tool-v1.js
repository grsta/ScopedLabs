const fs = require("fs");
const path = require("path");

const root = process.cwd();

const pages = [
  {
    name: "Storage IOPS",
    file: path.join(root, "tools", "compute", "storage-iops", "index.html"),
    marker: 'data-storage-iops-flow-actions-inside-card="0705"',
    backText: "Back to RAM Sizing",
    nextText: "Continue &rarr; Storage Throughput",
    nextHref: "/tools/compute/storage-throughput/"
  },
  {
    name: "Storage Throughput",
    file: path.join(root, "tools", "compute", "storage-throughput", "index.html"),
    marker: 'data-storage-throughput-flow-actions-inside-card="0705"',
    backText: "Back to Storage IOPS",
    nextText: "Continue &rarr; VM Density",
    nextHref: "/tools/compute/vm-density/"
  }
];

const map = fs.readFileSync(path.join(root, "docs", "scopedlabs-module-map.md"), "utf8");

let pass = 0;
let fail = 0;

function check(label, ok) {
  if (ok) {
    pass += 1;
    console.log("[PASS] " + label);
  } else {
    fail += 1;
    console.log("[FAIL] " + label);
  }
}

function findMatchingSectionClose(text, sectionStart) {
  const re = /<section\b|<\/section>/gi;
  re.lastIndex = sectionStart;
  let depth = 0;
  let match;

  while ((match = re.exec(text))) {
    const token = match[0].toLowerCase();
    if (token === "<section") {
      depth += 1;
    } else {
      depth -= 1;
      if (depth === 0) return match.index;
    }
  }

  return -1;
}

for (const page of pages) {
  const html = fs.readFileSync(page.file, "utf8");
  const toolStart = html.indexOf('<section id="toolCard"');
  const toolClose = toolStart >= 0 ? findMatchingSectionClose(html, toolStart) : -1;
  const flowMarker = html.indexOf(page.marker);

  check(page.name + " flow actions inside tool card", toolStart >= 0 && toolClose > toolStart && flowMarker > toolStart && flowMarker < toolClose);
  check(page.name + " split CTA structure", html.includes('class="compute-flow-actions"') && html.includes('<span id="continue-wrap"') && html.includes('margin-left: auto'));
  check(page.name + " next tool label", html.includes(page.nextText) && html.includes(page.nextHref));
  check(page.name + " back label", html.includes(page.backText));
  check(page.name + " no Summary CTA label", !html.includes("Review Compute Summary") && !html.includes(">Summary<"));
  check(page.name + " enforcer present", html.includes("data-storage-flow-next-tool-enforcer-0705") && html.includes("data-storage-flow-next-tool-label"));
}

check("Module map updated", map.includes("COMPUTE_STORAGE_FLOW_NEXT_TOOL_CTA_CONTRACT_0705"));

console.log("");
console.log("Compute storage next-tool CTA audit: " + pass + " passed / " + fail + " failed");

if (fail) process.exit(1);
