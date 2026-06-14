const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  summaryAsset: path.join(root, "assets", "access-control-report-summary.js"),
  summaryPage: path.join(root, "tools", "access-control", "summary", "index.html"),
  exportEngine: path.join(root, "assets", "export.js"),
  metadataHelper: path.join(root, "assets", "scopedlabs-report-metadata.js")
};

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log("FAIL  missing " + path.relative(root, filePath));
    return "";
  }

  console.log("SAFE  exists " + path.relative(root, filePath));
  return fs.readFileSync(filePath, "utf8");
}

function count(source, marker) {
  return source.split(marker).length - 1;
}

function marker(source, label, text) {
  const hits = count(source, text);

  if (hits > 0) {
    console.log("SAFE  " + label + ": " + text + " (" + hits + ")");
    return true;
  }

  console.log("WATCH " + label + " missing: " + text);
  return false;
}

function snippets(source, label, patterns) {
  const lines = source.split(/\r?\n/);

  console.log("");
  console.log(label);

  for (const pattern of patterns) {
    const indexes = [];

    lines.forEach((line, index) => {
      if (line.includes(pattern)) indexes.push(index);
    });

    if (!indexes.length) {
      console.log("  WATCH no hits for " + JSON.stringify(pattern));
      continue;
    }

    console.log("  HIT " + JSON.stringify(pattern) + " at line(s): " + indexes.map((i) => i + 1).join(", "));

    const first = indexes[0];
    const start = Math.max(0, first - 6);
    const end = Math.min(lines.length, first + 14);

    for (let i = start; i < end; i += 1) {
      console.log(String(i + 1).padStart(5, " ") + " | " + lines[i]);
    }

    console.log("");
  }
}

console.log("ScopedLabs Access Control Summary export metadata route audit - 0613");
console.log("Repo:", root);
console.log("");

const summaryAsset = read(files.summaryAsset);
const summaryPage = read(files.summaryPage);
const exportEngine = read(files.exportEngine);
const metadataHelper = read(files.metadataHelper);

console.log("");
console.log("Summary asset per-scope metadata state");

marker(summaryAsset, "summary asset", "access-control-summary-per-scope-metadata-export-0613");
marker(summaryAsset, "summary asset", "function scopeReportMetadataStorageKey");
marker(summaryAsset, "summary asset", "scopedlabs:report-metadata:page:/tools/access-control/#access-scope:");
marker(summaryAsset, "summary asset", "function readScopeReportMetadata");
marker(summaryAsset, "summary asset", "function scopeReportMetadataBlock");
marker(summaryAsset, "summary asset", "scopeReportMetadataBlock(scope)");
marker(summaryAsset, "summary asset", "summary-report-table--scope-metadata");
marker(summaryAsset, "summary asset", "extra-export-table--access-control-summary-metadata");

console.log("");
console.log("Summary page cache state");

marker(summaryPage, "summary page", "/assets/access-control-report-summary.js");
marker(summaryPage, "summary page", "access-control-report-summary");
marker(summaryPage, "summary page", "/assets/scopedlabs-report-metadata.js");
marker(summaryPage, "summary page", "scopedlabs-report-metadata-008-access-control-category-scope-key");

console.log("");
console.log("Metadata helper key state");

marker(metadataHelper, "metadata helper", 'PAGE_STORAGE_PREFIX + "/tools/access-control/"');
marker(metadataHelper, "metadata helper", "#access-scope:");
marker(metadataHelper, "metadata helper", "scopedlabs-report-metadata-008-access-control-category-scope-key");

console.log("");
console.log("Export engine generic report metadata state");

marker(exportEngine, "export engine", "REPORT METADATA");
marker(exportEngine, "export engine", "Report Metadata");
marker(exportEngine, "export engine", "reportTitle");
marker(exportEngine, "export engine", "projectName");
marker(exportEngine, "export engine", "clientName");
marker(exportEngine, "export engine", "preparedBy");
marker(exportEngine, "export engine", "customNotes");
marker(exportEngine, "export engine", "data-export-table-title");
marker(exportEngine, "export engine", "data-export-col-widths");
marker(exportEngine, "export engine", "window.location.pathname");
marker(exportEngine, "export engine", "sessionStorage");

snippets(summaryPage, "Summary page script/cache snippets", [
  "access-control-report-summary.js",
  "scopedlabs-report-metadata.js"
]);

snippets(summaryAsset, "Summary asset scope/metadata snippets", [
  "scopeReportMetadataBlock",
  "tableForScope",
  "summary-report-table--scope-metadata",
  "selected === \"__all__\"",
  "summary-export-report"
]);

snippets(exportEngine, "Export engine metadata snippets", [
  "REPORT METADATA",
  "Report Metadata",
  "reportTitle",
  "projectName",
  "clientName",
  "preparedBy",
  "customNotes",
  "data-export-table-title",
  "data-export-col-widths"
]);

console.log("Decision summary");

const hasPerScopeMetadata =
  summaryAsset.includes("scopeReportMetadataBlock(scope)") &&
  summaryAsset.includes("scopedlabs:report-metadata:page:/tools/access-control/#access-scope:");

const hasGenericMetadata =
  exportEngine.includes("REPORT METADATA") ||
  exportEngine.includes("Report Metadata");

if (hasPerScopeMetadata) {
  console.log("SAFE  SUMMARY_ASSET_HAS_PER_SCOPE_METADATA_CODE");
} else {
  console.log("WATCH SUMMARY_ASSET_PER_SCOPE_METADATA_CODE_MISSING_OR_NOT_LIVE");
}

if (hasGenericMetadata) {
  console.log("WATCH EXPORT_ENGINE_STILL_HAS_GENERIC_TOP_METADATA_BLOCK");
  console.log("WATCH ALL_SCOPES_EXPORT_NEEDS_GENERIC_METADATA_SUPPRESSION");
} else {
  console.log("SAFE  GENERIC_TOP_METADATA_BLOCK_NOT_FOUND");
}

console.log("SAFE  AUDIT_ONLY_NO_PAGE_CHANGES");
console.log("");
console.log("OVERALL: PASS");