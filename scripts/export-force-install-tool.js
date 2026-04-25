const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TARGET = process.argv[2];
const WRITE = process.argv.includes("--write");
const VERSION = process.argv.includes("--version")
  ? process.argv[process.argv.indexOf("--version") + 1]
  : "shared-export-003";

if (!TARGET) {
  console.error("Usage:");
  console.error("  node scripts/export-force-install-tool.js tools/power/redundancy-impact/index.html --write");
  process.exit(1);
}

const abs = path.join(ROOT, TARGET);

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function makePrefix(categorySlug, toolSlug) {
  const cat = String(categorySlug || "GEN").split("-").map((x) => x[0] || "").join("").toUpperCase();
  const tool = String(toolSlug || "TOOL").split("-").map((x) => x[0] || "").join("").toUpperCase();
  return `SL-${cat}-${tool}`;
}

function getH1(html) {
  const m = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  return m ? m[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim() : "";
}

function findMatchingSection(html, openStart) {
  const re = /<\/?section\b[^>]*>/gi;
  re.lastIndex = openStart;
  let depth = 0;

  while (true) {
    const m = re.exec(html);
    if (!m) return null;

    const isClose = /^<\//.test(m[0]);
    if (!isClose) depth += 1;
    else {
      depth -= 1;
      if (depth === 0) return { closeStart: m.index, end: m.index + m[0].length };
    }
  }
}

function findToolCardBounds(html) {
  const m = html.match(/<section\b[^>]*id=["']toolCard["'][^>]*>/i);
  if (!m || typeof m.index !== "number") return null;
  return findMatchingSection(html, m.index);
}

function buildStyles() {
  return `
  <style data-scopedlabs-export-card-styles>
    .export-grid {
      display: grid;
      gap: 14px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-top: 14px;
    }

    .export-grid .field.full {
      grid-column: 1 / -1;
    }

    .export-status {
      margin-top: 12px;
      color: rgba(255, 255, 255, 0.68);
      font-size: 0.94rem;
      line-height: 1.45;
      min-height: 1.45em;
    }

    @media (max-width: 860px) {
      .export-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>`;
}

function buildCard(toolLabel) {
  return `
      <section class="card" style="margin-top: 14px; background: rgba(0,0,0,.14);">
        <div class="pill-row">
          <span class="pill pill--pro">Documentation & Export</span>
        </div>

        <h3 class="h3" style="margin-top: 10px;">Export Report</h3>
        <p class="muted" style="margin-bottom: 0;">
          Add optional project context and generate a clean documentation view that can be printed or saved as a PDF for client or internal use.
        </p>

        <div class="export-grid">
          <label class="field">
            <span class="label">Report Title</span>
            <input id="reportTitle" type="text" placeholder="${toolLabel} Assessment" />
          </label>

          <label class="field">
            <span class="label">Project Name</span>
            <input id="projectName" type="text" placeholder="Project Name" />
          </label>

          <label class="field">
            <span class="label">Client Name</span>
            <input id="clientName" type="text" placeholder="Client / Site Name" />
          </label>

          <label class="field">
            <span class="label">Prepared By</span>
            <input id="preparedBy" type="text" placeholder="ScopedLabs Pro User" />
          </label>

          <label class="field full">
            <span class="label">Custom Notes</span>
            <textarea id="customNotes" placeholder="Optional notes, assumptions, workload details, or design caveats to include in the report."></textarea>
          </label>
        </div>

        <div class="btn-row" style="margin-top: 14px;">
          <button id="exportReport" class="btn btn-primary" type="button" disabled>Open Export Report</button>
          <button id="saveSnapshot" class="btn" type="button" disabled>Save Snapshot</button>
        </div>

        <div id="exportStatus" class="export-status"></div>
      </section>
`;
}

function buildConfig(categorySlug, toolSlug, toolLabel) {
  const config = {
    categoryLabel: titleCase(categorySlug),
    categorySlug,
    toolLabel,
    toolSlug,
    reportPrefix: makePrefix(categorySlug, toolSlug),
    inputContainerSelector: "#toolCard",
    assumptions: [
      `This report reflects the visible ${toolLabel} inputs and outputs at the time the export was generated.`,
      "The calculation output is intended for planning, comparison, and documentation support.",
      "Final design decisions should be verified against project requirements, manufacturer documentation, site-specific conditions, and applicable standards."
    ],
    disclaimer:
      "ScopedLabs outputs are planning aids only and do not replace formal engineering review, code compliance review, site-specific validation, manufacturer documentation, or platform-specific design validation."
  };

  return `  <script data-scopedlabs-export-config>
    window.ScopedLabsExportConfig = ${JSON.stringify(config, null, 6)};
  </script>`;
}

if (!fs.existsSync(abs)) {
  console.error(`Missing file: ${TARGET}`);
  process.exit(1);
}

let html = fs.readFileSync(abs, "utf8");
const original = html;

if (!/id=["']toolCard["']/i.test(html)) throw new Error("Missing #toolCard");
if (!/id=["']results["']/i.test(html)) throw new Error("Missing #results");
if (!/\.\/script\.js/i.test(html)) throw new Error("Missing local ./script.js");

const rel = TARGET.replace(/\\/g, "/");
const parts = rel.split("/");
const categorySlug = parts[1] || "general";
const toolSlug = parts[2] || "tool";
const toolLabel = getH1(html) || titleCase(toolSlug);

if (!html.includes("data-scopedlabs-export-card-styles")) {
  html = html.replace(/<\/head>/i, `${buildStyles()}\n</head>`);
}

if (!/id=["']exportReport["']/i.test(html)) {
  const bounds = findToolCardBounds(html);
  if (!bounds) throw new Error("Could not find #toolCard close");
  html = `${html.slice(0, bounds.closeStart)}\n${buildCard(toolLabel)}\n${html.slice(bounds.closeStart)}`;
}

if (!html.includes("window.ScopedLabsExportConfig")) {
  html = html.replace(
    /(\s*)<script\b([^>]*?)src=["']\.\/script\.js(?:\?[^"']*)?["']([^>]*)><\/script>/i,
    `${buildConfig(categorySlug, toolSlug, toolLabel)}\n$1<script src="/assets/export.js?v=${VERSION}"></script>\n$&`
  );
} else if (!html.includes("/assets/export.js")) {
  html = html.replace(
    /(\s*)<script\b([^>]*?)src=["']\.\/script\.js(?:\?[^"']*)?["']([^>]*)><\/script>/i,
    `$1<script src="/assets/export.js?v=${VERSION}"></script>\n$&`
  );
}

html = html.replace(
  /\/assets\/export\.js\?v=[^"']+/g,
  `/assets/export.js?v=${VERSION}`
);

if (html !== original) {
  if (WRITE) {
    fs.writeFileSync(abs, html, "utf8");
    console.log(`UPDATED ${TARGET}`);
  } else {
    console.log(`WOULD_UPDATE ${TARGET}`);
  }
} else {
  console.log(`UNCHANGED ${TARGET}`);
}