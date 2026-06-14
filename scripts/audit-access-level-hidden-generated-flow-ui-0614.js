const fs = require("fs");
const path = require("path");

const root = process.cwd();
const scriptPath = path.join(root, "tools", "access-control", "access-level-sizing", "script.js");
const htmlPath = path.join(root, "tools", "access-control", "access-level-sizing", "index.html");

const script = fs.readFileSync(scriptPath, "utf8");
const html = fs.readFileSync(htmlPath, "utf8");

let failCount = 0;

console.log("ScopedLabs Access Level hidden generated flow UI audit - 0614");
console.log("Repo:", root);
console.log("");

function requireMarker(source, label, marker) {
  if (source.includes(marker)) {
    console.log("SAFE  " + label + ": " + marker);
  } else {
    console.log("FAIL  " + label + " missing marker: " + marker);
    failCount += 1;
  }
}

requireMarker(script, "script", "access-level-flow-context-preserved-hidden-0614");
requireMarker(script, "script", "els.flowNote.hidden = true;");
requireMarker(script, "script", "els.flowNote.dataset.preservedFlowContext = \"true\";");
requireMarker(script, "script", "Flow Context");
requireMarker(script, "script", "function preserveAndHideGeneratedFlowUi");
requireMarker(script, "script", "data-preserved-generated-flow-ui");
requireMarker(script, "script", "DESIGN FLOW");
requireMarker(script, "script", "display:none!important");

if (script.includes("els.flowNote.hidden = false;")) {
  console.log("FAIL  script still forces Flow Context visible");
  failCount += 1;
} else {
  console.log("SAFE  script no longer forces Flow Context visible");
}

requireMarker(html, "html", "./script.js?v=access-level-hidden-generated-flow-ui-0614");

console.log("");
console.log("Decision summary");

if (failCount === 0) {
  console.log("SAFE  GENERATED_FLOW_CONTEXT_IS_HIDDEN_NOT_DELETED");
  console.log("SAFE  BACKGROUND_FLOW_CONTEXT_REMAINS_IN_DOM");
  console.log("SAFE  ACCESS_LEVEL_DESIGN_FLOW_UI_IS_HIDDEN_BY_PAGE_SCOPED_RUNTIME");
} else {
  console.log("FAIL  GENERATED_FLOW_UI_HIDE_NOT_READY");
}

console.log("");

if (failCount > 0) {
  console.log("OVERALL: FAIL");
  process.exit(1);
}

console.log("OVERALL: PASS");
