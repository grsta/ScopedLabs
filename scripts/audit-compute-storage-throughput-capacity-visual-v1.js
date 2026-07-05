const fs = require("fs");
const path = require("path");

const root = process.cwd();
const visual = fs.readFileSync(path.join(root, "assets", "scopedlabs-compute-capacity-visuals.js"), "utf8");
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

check("STORAGE_THROUGHPUT_VISUAL_BUILDER_PRESENT", visual.includes("function buildStorageThroughputCapacityEnvelopeSvg"));
check("STORAGE_THROUGHPUT_VISUAL_RENDERER_PRESENT", visual.includes("function renderStorageThroughputCapacityEnvelope"));
check("STORAGE_THROUGHPUT_VISUAL_EXPORTED", visual.includes("buildStorageThroughputCapacityEnvelopeSvg,") && visual.includes("renderStorageThroughputCapacityEnvelope,"));
check("STORAGE_THROUGHPUT_ROUTE_PRESENT", visual.includes('type === "storage-throughput"') && visual.includes("return buildStorageThroughputCapacityEnvelopeSvg(result);"));
check("STORAGE_THROUGHPUT_TITLE_CENTERED", visual.includes('x="380" y="54" text-anchor="middle" class="title"') && visual.includes('x="380" y="74" text-anchor="middle" class="sub"'));
check("COMPUTE_CAPACITY_ZONE_BAND_CONTRACT_PROMOTED", visual.includes("compute-capacity-zone-band-contract-0705") && visual.includes("function computeCapacityZoneBandStyles") && visual.includes("function buildCapacityZoneBands") && visual.includes("computeCapacityZoneBandStyles()") && visual.includes("const zoneBands = buildCapacityZoneBands(plot, yGood, yWatch);"));
check("STORAGE_THROUGHPUT_ZONE_BANDS_PRESENT", visual.includes("storage-throughput-zone-bands-0705") && visual.includes("zoneBands.join") && visual.includes("const zoneBands = buildCapacityZoneBands(plot, yGood, yWatch);"));
check("STORAGE_THROUGHPUT_VISUAL_FIELDS_PRESENT", [
  "requiredThroughputMBps",
  "availableThroughputMBps",
  "transferWindowRequiredMBps",
  "throughputUtilizationPct",
  "transportPathLabel",
  "mediaTierLabel",
  "workloadTypeLabel",
  "Storage Throughput Capacity Envelope"
].every((token) => visual.includes(token)));
check("MODULE_MAP_UPDATED", map.includes("COMPUTE_STORAGE_THROUGHPUT_CAPACITY_VISUAL_0705"));

console.log("");
console.log("Storage Throughput capacity visual audit: " + pass + " passed / " + fail + " failed");

if (fail) process.exit(1);
