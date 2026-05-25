const fs = require("fs");
const path = require("path");

const root = process.cwd();
const category = "physical-security";
const toolsRoot = path.join(root, "tools", category);

const auditVersion = "physical-security-user-guidance-contract-002-role-aware-audit-only";

const tools = [
  { slug: "area-planner", role: "pipeline-entry", title: "Area / Zone Planner" },
  { slug: "scene-illumination", role: "pipeline-step", title: "Scene Illumination" },
  { slug: "mounting-height", role: "pipeline-step", title: "Mounting Height" },
  { slug: "field-of-view", role: "pipeline-step", title: "Field of View" },
  { slug: "camera-coverage-area", role: "pipeline-step", title: "Camera Coverage Area" },
  { slug: "camera-spacing", role: "pipeline-step", title: "Camera Spacing" },
  { slug: "blind-spot-check", role: "pipeline-step", title: "Blind Spot Check" },
  { slug: "pixel-density", role: "pipeline-step", title: "Pixel Density" },
  { slug: "lens-selection", role: "pipeline-step", title: "Lens Selection", protected: true },
  { slug: "face-recognition-range", role: "optional-validation", title: "Face Recognition Range" },
  { slug: "license-plate-range", role: "optional-validation", title: "License Plate Capture Range" }
];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

function pushMissing(row, condition, label) {
  if (!condition) row.missingItems.push(label);
}

function classify(row) {
  if (row.protected) return "SKIP";
  if (row.missingFile) return "FAIL";

  if (row.missingItems.length === 0) return "SAFE";
  return "WATCH";
}

function buildRow(meta) {
  const slug = meta.slug;
  const dir = path.join(toolsRoot, slug);
  const indexFile = path.join(dir, "index.html");
  const scriptFile = path.join(dir, "script.js");

  const html = read(indexFile);
  const js = read(scriptFile);
  const all = html + "\n" + js;

  const row = {
    slug,
    role: meta.role,
    title: meta.title,
    protected: meta.protected === true,
    missingFile: !html && !js,

    assistantText: hasAny(all, [
      /assistant/i,
      /design assistant/i,
      /guidance/i,
      /recommend/i
    ]),

    primaryRecommendation: hasAny(all, [
      /primary recommendation/i,
      /recommended action/i,
      /best next step/i,
      /recommendation/i,
      /recommended/i
    ]),

    whyLanguage: hasAny(all, [
      /why/i,
      /because/i,
      /reason/i,
      /matters/i
    ]),

    expectedResult: hasAny(all, [
      /expected result/i,
      /expected corrected/i,
      /expected outcome/i,
      /should improve/i,
      /will improve/i,
      /moves.*into/i,
      /moves.*back/i,
      /corrected result/i
    ]),

    secondaryOptions: hasAny(all, [
      /secondary/i,
      /other option/i,
      /alternative/i,
      /also/i,
      /another option/i
    ]),

    sourceContext: hasAny(all, [
      /source integrity/i,
      /manual override/i,
      /pipeline/i,
      /active area/i,
      /carried/i,
      /carry/i,
      /imported/i,
      /planning context/i
    ]),

    reportSummarySignal: hasAny(all, [
      /report summary/i,
      /export/i,
      /documentation/i,
      /summary/i
    ]),

    areaSetupSignal: hasAny(all, [
      /area\s*\/\s*zone/i,
      /area planner/i,
      /active area/i,
      /area setup/i,
      /site area/i,
      /zone planner/i,
      /area name/i,
      /camera count/i
    ]),

    resultAnchor: /id=["']results["']/.test(html),
    flowAnchor: /id=["']flow-note["']/.test(html),
    shellOptIn: /scopedlabs-tool-shell\.js/.test(html),

    missingItems: []
  };

  if (row.protected) {
    row.classification = "SKIP";
    row.missing = "protected/gold-standard";
    return row;
  }

  if (row.missingFile) {
    row.classification = "FAIL";
    row.missing = "missing index.html and script.js";
    return row;
  }

  pushMissing(row, row.assistantText, "assistant/guidance text");
  pushMissing(row, row.sourceContext, "source/pipeline context");
  pushMissing(row, row.reportSummarySignal, "report/export summary signal");
  pushMissing(row, row.shellOptIn, "Tool Shell opt-in");

  if (row.role === "pipeline-entry") {
    pushMissing(row, row.areaSetupSignal, "area/zone setup guidance");

    // Pipeline-entry pages do not have to behave like downstream result tools.
    // Do not require #results or expected corrected result on Area Planner.
  } else {
    pushMissing(row, row.primaryRecommendation, "primary recommendation");
    pushMissing(row, row.whyLanguage, "why/reason language");
    pushMissing(row, row.expectedResult, "expected corrected result");
    pushMissing(row, row.secondaryOptions, "secondary options");
    pushMissing(row, row.resultAnchor, "#results anchor");
  }

  row.classification = classify(row);
  row.missing = row.missingItems.length ? row.missingItems.join(", ") : "-";

  return row;
}

const rows = tools.map(buildRow);

console.log("\nPhysical Security User Assistant Guidance Contract Audit\n");
console.log("Audit version:", auditVersion);
console.log("Category:", category);
console.table(rows.map((row) => ({
  slug: row.slug,
  role: row.role,
  status: row.classification,
  assistant: row.assistantText ? "yes" : "no",
  primary: row.role === "pipeline-entry" ? "n/a" : (row.primaryRecommendation ? "yes" : "no"),
  why: row.role === "pipeline-entry" ? "n/a" : (row.whyLanguage ? "yes" : "no"),
  expected: row.role === "pipeline-entry" ? "n/a" : (row.expectedResult ? "yes" : "no"),
  secondary: row.role === "pipeline-entry" ? "n/a" : (row.secondaryOptions ? "yes" : "no"),
  source: row.sourceContext ? "yes" : "no",
  report: row.reportSummarySignal ? "yes" : "no",
  areaSetup: row.role === "pipeline-entry" ? (row.areaSetupSignal ? "yes" : "no") : "n/a",
  results: row.role === "pipeline-entry" ? "n/a" : (row.resultAnchor ? "yes" : "no"),
  shell: row.shellOptIn ? "yes" : "no",
  missing: row.missing
})));

const summary = rows.reduce((acc, row) => {
  acc[row.classification] = (acc[row.classification] || 0) + 1;
  return acc;
}, { SAFE: 0, WATCH: 0, SKIP: 0, FAIL: 0 });

console.log("\nSummary:");
console.log("- Tools audited:", rows.length);
console.log("- SAFE:", summary.SAFE || 0);
console.log("- WATCH:", summary.WATCH || 0);
console.log("- SKIP:", summary.SKIP || 0);
console.log("- FAIL:", summary.FAIL || 0);
console.log("- Protected tools: lens-selection");

console.log("\nNotes:");
console.log("- pipeline-entry tools are checked for setup guidance, source context, report/export signal, and Tool Shell opt-in.");
console.log("- pipeline-step and optional-validation tools are checked for primary recommendation, why/reason, expected corrected result, secondary options, source context, report/export signal, #results, and Tool Shell opt-in.");
console.log("- no files are modified by this audit.");

console.log("\nAudit complete. No files modified.");
