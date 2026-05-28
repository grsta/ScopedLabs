const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "face-recognition-guidance-adapter-audit-003-optional-return-cache-proof";
const TOOL = "face-recognition-range";

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function scriptRefs(html, needle) {
  return [...html.matchAll(/<script[^>]+src=["']([^"']+)["'][^>]*>/g)]
    .map((m) => m[1])
    .filter((src) => src.includes(needle));
}

const helper = read("assets/user-assistant-guidance.js");
const index = read("tools/physical-security/face-recognition-range/index.html");
const script = read("tools/physical-security/face-recognition-range/script.js");

const helperRefs = scriptRefs(index, "user-assistant-guidance.js");
const localRefs = scriptRefs(index, "./script.js");
const helperIndex = index.indexOf("user-assistant-guidance.js");
const localIndex = index.indexOf("./script.js");

const acceptedLocalCaches = [
  "face-recognition-user-guidance-adapter",
  "face-recognition-guidance-event-bridge",
  "face-recognition-guidance-event-bridge-optional-return-001"
];

console.log("");
console.log("Face Recognition Guidance Adapter Audit");
console.log("");
console.log("Audit version:", VERSION);
console.log("Tool:", TOOL);

add(
  "helper-file",
  helper ? "SAFE" : "FAIL",
  "assets/user-assistant-guidance.js exists"
);

add(
  "helper-version",
  helper.includes("user-assistant-guidance") || helper.includes("ScopedLabsUserAssistantGuidance")
    ? "SAFE"
    : "FAIL",
  "shared helper version marker is present"
);

add(
  "helper-api",
  helper.includes("createGuidance") &&
    helper.includes("sourceLabelForMode") &&
    helper.includes("sourceMessageForMode")
    ? "SAFE"
    : "FAIL",
  "shared helper exports expected schema API"
);

add(
  "helper-include",
  helperRefs.length === 1
    ? "SAFE"
    : "FAIL",
  "Face Recognition loads user-assistant-guidance.js"
);

add(
  "helper-before-local",
  helperIndex >= 0 && localIndex >= 0 && helperIndex < localIndex
    ? "SAFE"
    : "FAIL",
  "user guidance helper loads before Face Recognition local script"
);

add(
  "local-cache-bust",
  localRefs.some((src) => acceptedLocalCaches.some((cache) => src.includes(cache)))
    ? "SAFE"
    : "WATCH",
  "Face Recognition local script cache is on an accepted guidance/event/optional-return proof version"
);

add(
  "adapter-state",
  script.includes("latestFaceRecognitionGuidance") &&
    script.includes("cloneFaceRecognitionGuidance")
    ? "SAFE"
    : "FAIL",
  "adapter stores latest normalized guidance"
);

add(
  "adapter-builder",
  script.includes("function buildFaceRecognitionUserGuidance") &&
    script.includes("ScopedLabsUserAssistantGuidance")
    ? "SAFE"
    : "FAIL",
  "adapter guidance builder exists"
);

add(
  "adapter-update",
  script.includes("function updateFaceRecognitionUserGuidance")
    ? "SAFE"
    : "FAIL",
  "adapter update function exists"
);

add(
  "adapter-global",
  script.includes("window.ScopedLabsFaceRecognitionGuidance") &&
    script.includes("getLastGuidance") &&
    script.includes("explainLastGuidance")
    ? "SAFE"
    : "FAIL",
  "dev inspection global exists"
);

add(
  "success-hook",
  script.includes("updateFaceRecognitionUserGuidance(data)") &&
    script.includes("publishFaceRecognitionGuidanceEvent")
    ? "SAFE"
    : "FAIL",
  "renderSuccess updates guidance after successful flow write"
);

add(
  "no-normalized-guidance-pipeline-mutation",
  !script.includes("normalizedGuidance:") &&
    !script.includes("assistantGuidance: latestFaceRecognitionGuidance")
    ? "SAFE"
    : "FAIL",
  "writeFlow payload does not carry the normalized adapter guidance object"
);

add(
  "no-dom-rendering-ownership",
  !script.includes("latestFaceRecognitionGuidance.innerHTML") &&
    !script.includes("buildFaceRecognitionUserGuidance(data).innerHTML")
    ? "SAFE"
    : "FAIL",
  "adapter builder does not own visible DOM rendering"
);

console.table(rows);

const summary = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Summary:");
console.log("- Checks:", rows.length);
console.log("- SAFE:", summary.SAFE || 0);
console.log("- WATCH:", summary.WATCH || 0);
console.log("- FAIL:", summary.FAIL || 0);

if (summary.WATCH) {
  console.log("");
  console.log("Watch items:");
  rows.filter((row) => row.status === "WATCH").forEach((row) => {
    console.log("- " + row.id + ": " + row.detail);
  });
}

if (summary.FAIL || summary.WATCH) {
  console.log("");
  console.log(summary.FAIL ? "Audit complete with FAIL items." : "Audit complete with WATCH items.");
  process.exitCode = summary.FAIL ? 1 : 2;
} else {
  console.log("");
  console.log("Audit complete. No files modified.");
}
