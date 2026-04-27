const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TARGET = process.argv[2];
const WRITE = process.argv.includes("--write");

if (!TARGET) {
  console.error("Usage:");
  console.error("  node scripts/export-insert-missing-card.js tools/network/mtu-fragmentation/index.html --dry-run");
  console.error("  node scripts/export-insert-missing-card.js tools/network/mtu-fragmentation/index.html --write");
  process.exit(1);
}

const filePath = path.join(ROOT, TARGET);

function getH1(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return "ScopedLabs Tool";

  return match[1]
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findMatchingSection(html, openStart) {
  const re = /<\/?section\b[^>]*>/gi;
  re.lastIndex = openStart;

  let depth = 0;

  while (true) {
    const m = re.exec(html);
    if (!m) return null;

    const tag = m[0];
    const isClose = /^<\//.test(tag);

    if (!isClose) {
      depth += 1;
    } else {
      depth -= 1;

      if (depth === 0) {
        return {
          start: openStart,
          closeStart: m.index,
          end: m.index + tag.length
        };
      }
    }
  }
}

function findToolCardBounds(html) {
  const m = html.match(/<section\b[^>]*id=["']toolCard["'][^>]*>/i);
  if (!m || typeof m.index !== "number") return null;
  return findMatchingSection(html, m.index);
}

function buildExportCard(toolLabel) {
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

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${TARGET}`);
  process.exit(1);
}

const original = fs.readFileSync(filePath, "utf8");

if (/id=["']exportReport["']/i.test(original)) {
  console.log("SKIPPED: #exportReport already exists.");
  process.exit(0);
}

if (!/id=["']toolCard["']/i.test(original)) {
  console.error("SKIPPED: #toolCard not found.");
  process.exit(1);
}

const bounds = findToolCardBounds(original);

if (!bounds) {
  console.error("SKIPPED: Could not find closing </section> for #toolCard.");
  process.exit(1);
}

const toolLabel = getH1(original);
const card = buildExportCard(toolLabel);

const updated = `${original.slice(0, bounds.closeStart)}\n${card}\n${original.slice(bounds.closeStart)}`;

if (updated === original) {
  console.log("UNCHANGED: No changes made.");
  process.exit(0);
}

if (WRITE) {
  fs.writeFileSync(filePath, updated, "utf8");
  console.log(`INSERTED export card into #toolCard: ${TARGET}`);
} else {
  console.log(`WOULD_INSERT export card into #toolCard: ${TARGET}`);
  console.log("No file modified. Run with --write to apply.");
}