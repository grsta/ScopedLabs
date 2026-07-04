const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

const html = fs.readFileSync(path.join(root, "tools", "compute", "storage-iops", "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "tools", "compute", "storage-iops", "script.js"), "utf8");

const checks = [];

function check(name, ok) {
  checks.push({ name, ok: Boolean(ok) });
}

function extractFunction(source, name) {
  const marker = "function " + name + "(";
  const start = source.indexOf(marker);
  if (start < 0) return "";

  const braceStart = source.indexOf("{", start);
  if (braceStart < 0) return "";

  let depth = 0;
  let end = -1;

  for (let i = braceStart; i < source.length; i += 1) {
    const ch = source[i];

    if (ch === "{") depth += 1;

    if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  }

  if (end < 0) return "";
  return source.slice(start, end);
}

const refreshFlowNote = extractFunction(js, "refreshFlowNote");
const refreshFlowNoteNoComments = refreshFlowNote
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");

check("STORAGE_IOPS_PAGE_HAS_FLOW_NOTE_ANCHOR", html.includes('id="flow-note"') && html.includes('class="flow-note"') && html.includes("hidden"));
check("STORAGE_IOPS_PAGE_HAS_FLOW_NOTE_CSS_GUARD", html.includes("storage-iops-flow-note-source-hide-0704") && html.includes("#flow-note") && html.includes("display: none !important"));
check("STORAGE_IOPS_SCRIPT_CACHE_BUSTED_FOR_FLOW_SUPPRESSION", html.includes("compute-storage-iops-hide-flow-context-0704"));

check("REFRESH_FLOW_NOTE_FUNCTION_FOUND", refreshFlowNote.length > 0);
check("REFRESH_FLOW_NOTE_SUPPRESSION_MARKER_PRESENT", refreshFlowNote.includes("compute-storage-iops-hide-visible-flow-context-0704"));
check("REFRESH_FLOW_NOTE_HIDES_ANCHOR", refreshFlowNote.includes("els.flowNote.hidden = true") && refreshFlowNote.includes('setAttribute("hidden"'));
check("REFRESH_FLOW_NOTE_IS_ARIA_HIDDEN", refreshFlowNote.includes('setAttribute("aria-hidden", "true")'));
check("REFRESH_FLOW_NOTE_USES_SOURCE_MARKER", refreshFlowNote.includes("data-compute-flow-context-hidden") && refreshFlowNote.includes("storage-iops-source"));
check("REFRESH_FLOW_NOTE_FORCES_DISPLAY_NONE", refreshFlowNote.includes('style.setProperty("display", "none", "important")'));
check("REFRESH_FLOW_NOTE_CLEARS_VISIBLE_CONTENT", refreshFlowNote.includes('els.flowNote.innerHTML = "";'));

check("REFRESH_FLOW_NOTE_DOES_NOT_RENDER_VISIBLE_HEADER", !refreshFlowNoteNoComments.includes("Flow Context"));
check("REFRESH_FLOW_NOTE_DOES_NOT_RENDER_RECOMMENDED_RAM", !refreshFlowNoteNoComments.includes("Recommended RAM:"));
check("REFRESH_FLOW_NOTE_DOES_NOT_RENDER_STORAGE_BOTTLENECK_COPY", !refreshFlowNoteNoComments.includes("This step checks whether storage performance becomes the next practical bottleneck"));

check("STORAGE_IOPS_STILL_HAS_WORKLOAD_CONTEXT_CARD", html.includes('id="computeWorkloadContextCard"'));
check("STORAGE_IOPS_STILL_HAS_LEDGER_PAYLOAD_WRITE", js.includes("saveComputeLedgerResult({"));
check("STORAGE_IOPS_STILL_HAS_EXPORT_SNAPSHOT_ACTIONS", html.includes('id="exportReport"') && html.includes('id="saveSnapshot"'));

try {
  new Function(js);
  check("STORAGE_IOPS_SCRIPT_PARSES", true);
} catch (error) {
  check("STORAGE_IOPS_SCRIPT_PARSES", false);
  console.error(error.message);
}

let pass = 0;
let fail = 0;

for (const item of checks) {
  if (item.ok) {
    pass += 1;
    console.log("[PASS] " + item.name);
  } else {
    fail += 1;
    console.log("[FAIL] " + item.name);
  }
}

console.log("");
console.log("SCOPEDLABS COMPUTE STORAGE IOPS VISIBLE FLOW CONTEXT AUDIT V1");
console.log("PASS " + pass + " / FAIL " + fail);

if (fail > 0) process.exit(1);
