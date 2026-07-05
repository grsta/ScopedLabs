const fs = require("fs");
const path = require("path");

const root = process.cwd();
const html = fs.readFileSync(path.join(root, "tools", "compute", "storage-throughput", "index.html"), "utf8");
const js = fs.readFileSync(path.join(root, "tools", "compute", "storage-throughput", "script.js"), "utf8");
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

check("VISUAL_WIRE_BODY_MARKER", html.includes('data-storage-throughput-visual-wire="0705"'));
check("VISUAL_CSS_INCLUDED", html.includes("scopedlabs-compute-result-visuals.css"));
check("VISUAL_CARD_PRESENT", html.includes("computeStorageThroughputVisualCard") && html.includes("Storage Throughput Capacity Envelope"));
check("VISUAL_MOUNT_PRESENT", html.includes("computeStorageThroughputVisual") && html.includes('data-compute-capacity-visual="storage-throughput"'));
check("VISUAL_ASSET_INCLUDED", html.includes("scopedlabs-compute-capacity-visuals.js"));
check("SCRIPT_CACHE_BUST_UPDATED", html.includes("compute-storage-throughput-visual-wire-0705"));
check("JS_ELS_PRESENT", js.includes('visualCard: $("computeStorageThroughputVisualCard")') && js.includes('visual: $("computeStorageThroughputVisual")'));
check("JS_RENDER_FUNCTION_PRESENT", js.includes("function renderStorageThroughputCapacityVisual"));
check("JS_CLEAR_FUNCTION_PRESENT", js.includes("function clearStorageThroughputCapacityVisual"));
check("JS_RENDER_CALLED_WITH_FLOW_PAYLOAD", js.includes("renderStorageThroughputCapacityVisual(flowPayload);"));
check("JS_INVALIDATE_CLEARS_VISUAL", js.includes("clearStorageThroughputCapacityVisual();"));
check("MODULE_MAP_UPDATED", map.includes("COMPUTE_STORAGE_THROUGHPUT_VISUAL_WIRE_0705"));

console.log("");
console.log("Storage Throughput visual wire audit: " + pass + " passed / " + fail + " failed");

if (fail) process.exit(1);
