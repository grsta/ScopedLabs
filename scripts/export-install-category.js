const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const REPORTS_DIR = path.join(ROOT, "reports");
const AUDIT_PATH = path.join(REPORTS_DIR, "export-audit.json");

const REQUIRED_EXPORT_IDS = [
  "reportTitle",
  "projectName",
  "clientName",
  "preparedBy",
  "customNotes",
  "exportReport",
  "saveSnapshot",
  "exportStatus"
];

const EXPORT_STYLE_MARKER = "data-scopedlabs-export-card-styles";
const EXPORT_CONFIG_MARKER = "data-scopedlabs-export-config";

function slash(p) {
  return p.replace(/\\/g, "/");
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function titleCase(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function makePrefix(categorySlug, toolSlug) {
  const cat = String(categorySlug || "GEN")
    .split("-")
    .map((x) => x[0] || "")
    .join("")
    .toUpperCase();

  const tool = String(toolSlug || "TOOL")
    .split("-")
    .map((x) => x[0] || "")
    .join("")
    .toUpperCase();

  return `SL-${cat}-${tool}`;
}

function getArg(name) {
  const exact = process.argv.find((arg) => arg === name);
  if (exact) return true;

  const prefix = `${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  if (!found) return null;

  return found.slice(prefix.length);
}

function getCategoryArg() {
  return process.argv.slice(2).find((arg) => !arg.startsWith("--"));
}

function hasId(html, id) {
  return new RegExp(`id\\s*=\\s*["']${id}["']`, "i").test(html);
}

function hasExportCard(html) {
  return hasId(html, "exportReport") || hasId(html, "saveSnapshot") || hasId(html, "exportStatus");
}

function hasExportJs(html) {
  return html.includes("/assets/export.js");
}

function getMissingExportIds(html) {
  return REQUIRED_EXPORT_IDS.filter((id) => !hasId(html, id));
}

function getH1(html) {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (!match) return "";

  return match[1]
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasLocalScript(html) {
  return /<script\b[^>]*src=["']\.\/script\.js(?:\?[^"']*)?["'][^>]*><\/script>/i.test(html);
}

function addExportStyles(html) {
  if (html.includes(EXPORT_STYLE_MARKER)) {
    return { html, changed: false, note: "export styles already present" };
  }

  const styleBlock = `
  <style ${EXPORT_STYLE_MARKER}>
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

  if (!/<\/head>/i.test(html)) {
    return { html, changed: false, note: "missing </head>; skipped export styles" };
  }

  return {
    html: html.replace(/<\/head>/i, `${styleBlock}\n</head>`),
    changed: true,
    note: "added export styles"
  };
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

function insertExportCard(html, categorySlug, toolLabel) {
  if (hasExportCard(html)) {
    return { html, changed: false, note: "export card already present" };
  }

  const card = buildExportCard(toolLabel);

  const backLinkRe = new RegExp(
    `<a\\s+class=["']btn["']\\s+href=["']/tools/${categorySlug}/["'][^>]*>\\s*Back\\s+to`,
    "i"
  );

  const backMatch = html.match(backLinkRe);

  if (backMatch && typeof backMatch.index === "number") {
    const divStart = html.lastIndexOf("<div", backMatch.index);

    if (divStart >= 0) {
      return {
        html: `${html.slice(0, divStart)}${card}\n${html.slice(divStart)}`,
        changed: true,
        note: "inserted export card before category back button"
      };
    }
  }

  const continueIndex = html.search(/<div\s+id=["']continue-wrap["']/i);

  if (continueIndex >= 0) {
    const sectionCloseIndex = html.lastIndexOf("</section>", continueIndex);

    if (sectionCloseIndex >= 0) {
      return {
        html: `${html.slice(0, sectionCloseIndex)}${card}\n${html.slice(sectionCloseIndex)}`,
        changed: true,
        note: "inserted export card before tool section close"
      };
    }
  }

  return {
    html,
    changed: false,
    note: "could not find safe insertion point for export card"
  };
}

function buildExportConfig({ categorySlug, categoryLabel, toolSlug, toolLabel }) {
  const config = {
    categoryLabel,
    categorySlug,
    toolLabel,
    toolSlug,
    reportPrefix: makePrefix(categorySlug, toolSlug),
    assumptions: [
      `This report reflects the visible ${toolLabel} inputs and outputs at the time the export was generated.`,
      "The calculation output is intended for planning, comparison, and documentation support.",
      "Final design decisions should be verified against project requirements, manufacturer documentation, site-specific conditions, and applicable standards."
    ],
    disclaimer:
      "ScopedLabs outputs are planning aids only and do not replace formal engineering review, code compliance review, site-specific validation, manufacturer documentation, or platform-specific design validation."
  };

  return `  <script ${EXPORT_CONFIG_MARKER}>
    window.ScopedLabsExportConfig = ${JSON.stringify(config, null, 6)};
  </script>`;
}

function addExportJs(html, meta, version) {
  if (hasExportJs(html)) {
    return { html, changed: false, note: "export.js already present" };
  }

  if (!hasLocalScript(html)) {
    return { html, changed: false, note: "missing local ./script.js; skipped export.js install" };
  }

  const localScriptRe = /(\s*)<script\b([^>]*?)src=["']\.\/script\.js(?:\?[^"']*)?["']([^>]*)><\/script>/i;
  const match = html.match(localScriptRe);

  if (!match) {
    return { html, changed: false, note: "could not match local script include" };
  }

  const indent = match[1] || "  ";
  const configBlock = html.includes("window.ScopedLabsExportConfig")
    ? ""
    : `${buildExportConfig(meta)}\n`;

  const exportInclude = `${indent}<script src="/assets/export.js?v=${version}"></script>\n`;
  const originalLocal = match[0];

  return {
    html: html.replace(localScriptRe, `${configBlock}${exportInclude}${originalLocal}`),
    changed: true,
    note: "added export config and /assets/export.js"
  };
}

function bumpLocalScript(html, version) {
  if (!hasLocalScript(html)) {
    return { html, changed: false, note: "missing local script; skipped local script bump" };
  }

  const before = html;

  const after = html.replace(
    /<script\b([^>]*?)src=["']\.\/script\.js(?:\?[^"']*)?["']([^>]*)><\/script>/i,
    `<script$1src="./script.js?v=${version}"$2></script>`
  );

  return {
    html: after,
    changed: after !== before,
    note: after !== before ? "bumped local script include" : "local script include unchanged"
  };
}

function processRow(row, options) {
  const absPath = path.join(ROOT, row.path);

  if (!fs.existsSync(absPath)) {
    return {
      path: row.path,
      status: "SKIPPED",
      reason: "file not found",
      changes: []
    };
  }

  const original = fs.readFileSync(absPath, "utf8");
  let html = original;
  const changes = [];
  const warnings = [];

  const categorySlug = normalize(row.category || options.category);
  const categoryLabel = titleCase(categorySlug);
  const toolSlug = normalize(row.tool || path.basename(path.dirname(absPath)));
  const toolLabel = getH1(html) || titleCase(toolSlug);

  const status = row.status || "";

  if (status === "READY_SHARED_EXPORT") {
    return {
      path: row.path,
      status: "SKIPPED",
      reason: "already using shared export",
      changes: []
    };
  }

  if (status.startsWith("REVIEW_MANUAL")) {
    return {
      path: row.path,
      status: "SKIPPED",
      reason: status,
      changes: []
    };
  }

  if (status === "FIX_EXPORT_CARD") {
    return {
      path: row.path,
      status: "SKIPPED",
      reason: `existing export card is missing IDs: ${(row.missingExportIds || []).join(", ")}`,
      changes: []
    };
  }

  if (!hasId(html, "results")) {
    return {
      path: row.path,
      status: "SKIPPED",
      reason: "missing #results",
      changes: []
    };
  }

  if (!hasId(html, "toolCard")) {
    return {
      path: row.path,
      status: "SKIPPED",
      reason: "missing #toolCard",
      changes: []
    };
  }

  if (!/class\s*=\s*["'][^"']*\bform-grid\b/i.test(html)) {
    return {
      path: row.path,
      status: "SKIPPED",
      reason: "missing .form-grid",
      changes: []
    };
  }

  const styleResult = addExportStyles(html);
  html = styleResult.html;
  if (styleResult.changed) changes.push(styleResult.note);

  const cardResult = insertExportCard(html, categorySlug, toolLabel);
  html = cardResult.html;
  if (cardResult.changed) changes.push(cardResult.note);
  if (!cardResult.changed && !hasExportCard(html)) warnings.push(cardResult.note);

  const exportResult = addExportJs(
    html,
    { categorySlug, categoryLabel, toolSlug, toolLabel },
    options.version
  );
  html = exportResult.html;
  if (exportResult.changed) changes.push(exportResult.note);
  if (!exportResult.changed && !hasExportJs(html)) warnings.push(exportResult.note);

  if (options.bumpLocalScript && changes.length > 0) {
    const bumpResult = bumpLocalScript(html, options.version);
    html = bumpResult.html;
    if (bumpResult.changed) changes.push(bumpResult.note);
  }

  const missingAfter = getMissingExportIds(html);
  if (missingAfter.length) {
    warnings.push(`missing export IDs after processing: ${missingAfter.join(", ")}`);
  }

  const changed = html !== original;

  if (changed && options.write) {
    fs.writeFileSync(absPath, html, "utf8");
  }

  return {
    path: row.path,
    status: changed ? (options.write ? "MODIFIED" : "WOULD_MODIFY") : "UNCHANGED",
    reason: changed ? "" : "no changes needed or safe insertion failed",
    changes,
    warnings
  };
}

function writeReports(category, results, options) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const jsonPath = path.join(REPORTS_DIR, `export-install-${category}.json`);
  const mdPath = path.join(REPORTS_DIR, `export-install-${category}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(results, null, 2), "utf8");

  const lines = [];
  lines.push(`# ScopedLabs Export Install Report — ${category}`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Mode: **${options.write ? "WRITE" : "DRY RUN"}**`);
  lines.push(`Version: \`${options.version}\``);
  lines.push("");

  const counts = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, {});

  lines.push("## Counts");
  lines.push("");

  Object.keys(counts).sort().forEach((key) => {
    lines.push(`- **${key}**: ${counts[key]}`);
  });

  lines.push("");
  lines.push("## Detail");
  lines.push("");
  lines.push("| Path | Status | Reason | Changes | Warnings |");
  lines.push("| --- | --- | --- | --- | --- |");

  for (const item of results) {
    lines.push(`| ${
      [
        item.path,
        item.status,
        item.reason || "-",
        item.changes?.length ? item.changes.join("<br>") : "-",
        item.warnings?.length ? item.warnings.join("<br>") : "-"
      ].map((v) => String(v).replace(/\|/g, "\\|")).join(" | ")
    } |`);
  }

  fs.writeFileSync(mdPath, lines.join("\n"), "utf8");

  return { jsonPath, mdPath, counts };
}

function main() {
  const category = normalize(getCategoryArg());
  const write = !!getArg("--write");
  const dryRun = !!getArg("--dry-run");
  const version = getArg("--version") || `${category || "category"}-export-001`;
  const bumpLocalScript = getArg("--no-bump-local") ? false : true;

  if (!category) {
    console.error("");
    console.error("Usage:");
    console.error("  node scripts/export-install-category.js <category> --dry-run");
    console.error("  node scripts/export-install-category.js <category> --write");
    console.error("");
    console.error("Example:");
    console.error("  node scripts/export-install-category.js compute --dry-run");
    process.exit(1);
  }

  if (write && dryRun) {
    console.error("Choose either --write or --dry-run, not both.");
    process.exit(1);
  }

  if (!fs.existsSync(AUDIT_PATH)) {
    console.error("");
    console.error("Missing reports/export-audit.json.");
    console.error("Run this first:");
    console.error("  node scripts/export-audit.js");
    process.exit(1);
  }

  const auditRows = JSON.parse(fs.readFileSync(AUDIT_PATH, "utf8"));

  const categoryRows = auditRows.filter((row) => {
    return normalize(row.category) === category || row.path.includes(`/tools/${category}/`);
  });

  const eligibleRows = categoryRows.filter((row) => {
    const status = row.status || "";

    if (status === "READY_SHARED_EXPORT") return true;
    if (status === "ADD_EXPORT_JS") return true;
    if (status === "INSTALL_EXPORT_CARD") return true;
    if (status === "FIX_EXPORT_CARD") return true;
    if (status.startsWith("REVIEW_MANUAL")) return true;

    return false;
  });

  const options = {
    category,
    write,
    version,
    bumpLocalScript
  };

  const results = eligibleRows.map((row) => processRow(row, options));
  const { jsonPath, mdPath, counts } = writeReports(category, results, options);

  console.log("");
  console.log(`ScopedLabs Export Installer — ${category}`);
  console.log("----------------------------------------");
  console.log(`Mode: ${write ? "WRITE" : "DRY RUN"}`);
  console.log(`Version: ${version}`);
  console.log(`Category pages found: ${categoryRows.length}`);
  console.log(`Rows evaluated: ${eligibleRows.length}`);
  console.log("");

  Object.keys(counts).sort().forEach((key) => {
    console.log(`${key}: ${counts[key]}`);
  });

  console.log("");
  console.log(`Wrote: ${slash(path.relative(ROOT, jsonPath))}`);
  console.log(`Wrote: ${slash(path.relative(ROOT, mdPath))}`);

  if (!write) {
    console.log("");
    console.log("No tool files were modified.");
    console.log("Review the report, then run with --write if it looks sane.");
  } else {
    console.log("");
    console.log("Tool files were modified. Test this category before moving on.");
  }

  console.log("");
}

main();