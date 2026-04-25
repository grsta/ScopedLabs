const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TOOLS_DIR = path.join(ROOT, "tools");
const REPORTS_DIR = path.join(ROOT, "reports");

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

function slash(p) {
  return p.replace(/\\/g, "/");
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const out = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...walk(full));
    } else if (entry.isFile() && entry.name.toLowerCase() === "index.html") {
      out.push(full);
    }
  }

  return out;
}

function attr(html, name) {
  const re = new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, "i");
  return html.match(re)?.[1] || "";
}

function hasId(html, id) {
  return new RegExp(`id\\s*=\\s*["']${id}["']`, "i").test(html);
}

function hasScript(html, needle) {
  return html.includes(needle);
}

function getLocalScript(html) {
  const m = html.match(/<script\s+[^>]*src=["']\.\/script\.js([^"']*)["'][^>]*><\/script>/i);
  return m ? `./script.js${m[1] || ""}` : "";
}

function getCssHref(html) {
  const m = html.match(/<link\s+[^>]*href=["']([^"']*\/assets\/style\.css[^"']*)["'][^>]*>/i);
  return m ? m[1] : "";
}

function isToolPage(absPath) {
  const rel = slash(path.relative(ROOT, absPath));
  const parts = rel.split("/");

  // tools/<category>/<tool>/index.html
  return parts[0] === "tools" && parts.length >= 4 && parts.at(-1) === "index.html";
}

function classify(row) {
  if (!row.hasResults) return "REVIEW_MANUAL_NO_RESULTS";
  if (!row.hasToolCard) return "REVIEW_MANUAL_NO_TOOLCARD";
  if (!row.hasFormGrid) return "REVIEW_MANUAL_NO_FORMGRID";

  if (row.hasExportCard && row.hasExportJs && row.missingExportIds.length === 0) {
    return "READY_SHARED_EXPORT";
  }

  if (row.hasExportCard && !row.hasExportJs && row.missingExportIds.length === 0) {
    return "ADD_EXPORT_JS";
  }

  if (!row.hasExportCard) {
    return "INSTALL_EXPORT_CARD";
  }

  if (row.hasExportCard && row.missingExportIds.length > 0) {
    return "FIX_EXPORT_CARD";
  }

  return "REVIEW_MANUAL";
}

function auditFile(absPath) {
  const html = fs.readFileSync(absPath, "utf8");
  const rel = slash(path.relative(ROOT, absPath));
  const parts = rel.split("/");

  const categoryFromPath = parts[1] || "";
  const toolFromPath = parts[2] || "";

  const missingExportIds = REQUIRED_EXPORT_IDS.filter((id) => !hasId(html, id));

  const row = {
    path: rel,
    category: attr(html, "data-category") || categoryFromPath,
    tool: attr(html, "data-tool") || attr(html, "data-step") || toolFromPath,
    tier: attr(html, "data-tier") || "",
    protected: attr(html, "data-protected") || "",
    lane: attr(html, "data-lane") || "",
    hasResults: hasId(html, "results"),
    hasToolCard: hasId(html, "toolCard"),
    hasFormGrid: /class\s*=\s*["'][^"']*\bform-grid\b/i.test(html),
    hasExportCard: hasId(html, "exportReport") || hasId(html, "saveSnapshot") || hasId(html, "exportStatus"),
    hasExportJs: hasScript(html, "/assets/export.js"),
    missingExportIds,
    hasPipeline: hasId(html, "pipeline") || hasScript(html, "/assets/pipeline.js"),
    hasAnalyzer: hasScript(html, "/assets/analyzer.js"),
    hasChartJs: hasScript(html, "chart.js"),
    hasCanvas: /<canvas\b/i.test(html),
    hasChartWrap: hasId(html, "chartWrap"),
    cssHref: getCssHref(html),
    localScript: getLocalScript(html)
  };

  row.status = classify(row);
  return row;
}

function countBy(rows, key) {
  return rows.reduce((acc, row) => {
    const value = row[key] || "(blank)";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function mdTable(rows) {
  const header = [
    "Path",
    "Tier",
    "Category",
    "Tool",
    "Protected",
    "Pipeline",
    "Analyzer",
    "Chart",
    "Export Card",
    "Export JS",
    "Missing IDs",
    "Status"
  ];

  const lines = [];
  lines.push(`# ScopedLabs Export Audit`);
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push("");
  lines.push(`Tool pages scanned: **${rows.length}**`);
  lines.push("");
  lines.push(`## Status Counts`);
  lines.push("");

  const statusCounts = countBy(rows, "status");
  Object.keys(statusCounts).sort().forEach((status) => {
    lines.push(`- **${status}**: ${statusCounts[status]}`);
  });

  lines.push("");
  lines.push(`## Tool Detail`);
  lines.push("");
  lines.push(`| ${header.join(" | ")} |`);
  lines.push(`| ${header.map(() => "---").join(" | ")} |`);

  for (const row of rows) {
    const chart = row.hasChartJs || row.hasCanvas || row.hasChartWrap ? "yes" : "no";

    lines.push(`| ${
      [
        row.path,
        row.tier,
        row.category,
        row.tool,
        row.protected || "no",
        row.hasPipeline ? "yes" : "no",
        row.hasAnalyzer ? "yes" : "no",
        chart,
        row.hasExportCard ? "yes" : "no",
        row.hasExportJs ? "yes" : "no",
        row.missingExportIds.length ? row.missingExportIds.join(", ") : "-",
        row.status
      ].map((v) => String(v).replace(/\|/g, "\\|")).join(" | ")
    } |`);
  }

  lines.push("");
  lines.push(`## Recommended Next Moves`);
  lines.push("");
  lines.push(`1. Start with one category only.`);
  lines.push(`2. Convert tools marked INSTALL_EXPORT_CARD first.`);
  lines.push(`3. Convert tools marked ADD_EXPORT_JS second.`);
  lines.push(`4. Manually review REVIEW_MANUAL rows before any automated install.`);
  lines.push(`5. Do not let Node change formulas, result labels, chart thresholds, pipeline logic, or analyzer text.`);

  return lines.join("\n");
}

function main() {
  if (!fs.existsSync(TOOLS_DIR)) {
    console.error("Could not find /tools directory. Run this from the ScopedLabs repo root.");
    process.exit(1);
  }

  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  const files = walk(TOOLS_DIR).filter(isToolPage);
  const rows = files.map(auditFile).sort((a, b) => a.path.localeCompare(b.path));

  const jsonPath = path.join(REPORTS_DIR, "export-audit.json");
  const mdPath = path.join(REPORTS_DIR, "export-audit.md");

  fs.writeFileSync(jsonPath, JSON.stringify(rows, null, 2), "utf8");
  fs.writeFileSync(mdPath, mdTable(rows), "utf8");

  console.log("");
  console.log("ScopedLabs Export Audit Complete");
  console.log("--------------------------------");
  console.log(`Tool pages scanned: ${rows.length}`);
  console.log("");

  const statusCounts = countBy(rows, "status");
  Object.keys(statusCounts).sort().forEach((status) => {
    console.log(`${status}: ${statusCounts[status]}`);
  });

  console.log("");
  console.log(`Wrote: ${slash(path.relative(ROOT, jsonPath))}`);
  console.log(`Wrote: ${slash(path.relative(ROOT, mdPath))}`);
  console.log("");
  console.log("No tool files were modified.");
}

main();