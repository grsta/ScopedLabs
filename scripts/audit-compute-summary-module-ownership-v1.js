const fs = require("fs");
const path = require("path");

const root = process.cwd();
const summaryFile = path.join(root, "tools", "compute", "summary", "index.html");
const cssFile = path.join(root, "assets", "scopedlabs-compute-summary.css");
const jsFile = path.join(root, "assets", "scopedlabs-compute-summary.js");

const html = fs.readFileSync(summaryFile, "utf8");
const css = fs.readFileSync(cssFile, "utf8");
const js = fs.readFileSync(jsFile, "utf8");

let pass = 0;
let fail = 0;

function check(name, condition, detail) {
  if (condition) {
    pass += 1;
    console.log("[PASS] " + name);
  } else {
    fail += 1;
    console.log("[FAIL] " + name);
    if (detail) console.log("  " + detail);
  }
}

function countStyleBlocks(source) {
  var lower = source.toLowerCase();
  var count = 0;
  var index = 0;

  while (true) {
    var start = lower.indexOf("<style", index);
    if (start === -1) break;

    var openEnd = lower.indexOf(">", start);
    var close = lower.indexOf("</style>", openEnd);
    if (openEnd === -1 || close === -1) break;

    count += 1;
    index = close + "</style>".length;
  }

  return count;
}

function collectScriptBlocks(source) {
  var lower = source.toLowerCase();
  var blocks = [];
  var index = 0;

  while (true) {
    var start = lower.indexOf("<script", index);
    if (start === -1) break;

    var openEnd = lower.indexOf(">", start);
    var close = lower.indexOf("</script>", openEnd);
    if (openEnd === -1 || close === -1) break;

    var openTag = source.slice(start, openEnd + 1);
    var body = source.slice(openEnd + 1, close);
    var full = source.slice(start, close + "</script>".length);

    blocks.push({
      openTag: openTag,
      body: body,
      full: full,
      hasSrc: /\ssrc\s*=/.test(openTag)
    });

    index = close + "</script>".length;
  }

  return blocks;
}

const styleBlockCount = countStyleBlocks(html);
const scriptBlocks = collectScriptBlocks(html);
const inlineScripts = scriptBlocks.filter(function (script) {
  return !script.hasSrc;
});

const exportConfigInline = inlineScripts.some(function (script) {
  return script.openTag.includes("data-scopedlabs-export-config") ||
    script.body.includes("window.ScopedLabsExportConfig");
});

check("COMPUTE_SUMMARY_MODULE_CSS_LINKED", html.includes("/assets/scopedlabs-compute-summary.css?v=scopedlabs-compute-summary-001"));
check("COMPUTE_SUMMARY_MODULE_JS_LINKED", html.includes("/assets/scopedlabs-compute-summary.js?v=scopedlabs-compute-summary-001"));
check("COMPUTE_SUMMARY_INLINE_STYLE_REMOVED", styleBlockCount === 0, "Inline style blocks: " + styleBlockCount);
check("COMPUTE_SUMMARY_ONLY_EXPORT_CONFIG_INLINE", inlineScripts.length === 1 && exportConfigInline, "Inline script blocks: " + inlineScripts.length);
check("COMPUTE_SUMMARY_CSS_MARKER", css.includes("COMPUTE_SUMMARY_MODULE_OWNERSHIP_0703"));
check("COMPUTE_SUMMARY_JS_MARKER", js.includes("COMPUTE_SUMMARY_MODULE_OWNERSHIP_0703"));
check("COMPUTE_SUMMARY_ROLLUP_IN_MODULE", js.includes("ScopedLabsComputeSummaryRollup"));
check("COMPUTE_SUMMARY_TOOL_NOTES_IN_MODULE", js.includes("computeSummaryToolNotes"));
check("COMPUTE_SUMMARY_TABLE_WIDTHS_IN_MODULE", js.includes("applyComputeSummaryExportTableWidths"));
check("COMPUTE_SUMMARY_STATUS_CHIPS_IN_MODULE", css.includes(".summary-status-chip") && css.includes(".summary-status-chip.risk"));
check("COMPUTE_SUMMARY_COMPAT_MARKERS", html.includes("COMPUTE_SUMMARY_MODULE_COMPAT_MARKERS_0703"));
check("COMPUTE_SUMMARY_CLEAR_SUMMARY_TOOL_NOTES", html.includes("clearComputeSummaryToolNotes") && css.includes("compute-summary-clear-summary-tool-notes-0703") && js.includes("compute-summary-clear-summary-tool-notes-0703"));

const planStateIndex = html.indexOf("scopedlabs-compute-plan-state.js");
const summaryJsIndex = html.indexOf("scopedlabs-compute-summary.js");
const exportConfigIndex = html.indexOf("data-scopedlabs-export-config");
const reportMetadataIndex = html.indexOf("scopedlabs-report-metadata.js");
const exportJsIndex = html.indexOf("/assets/export.js");

check("COMPUTE_SUMMARY_SCRIPT_ORDER", planStateIndex < summaryJsIndex && summaryJsIndex < exportConfigIndex && exportConfigIndex < reportMetadataIndex && reportMetadataIndex < exportJsIndex);

console.log("");
console.log("SCOPEDLABS COMPUTE SUMMARY MODULE OWNERSHIP AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail) process.exit(1);
