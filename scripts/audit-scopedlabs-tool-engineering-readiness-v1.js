#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const args = process.argv.slice(2);

function argValue(name, fallback) {
  const idx = args.indexOf(name);
  if (idx === -1) return fallback;
  return args[idx + 1] || fallback;
}

function hasFlag(name) {
  return args.includes(name);
}

function exists(file) {
  return fs.existsSync(path.join(repoRoot, file));
}

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), "utf8");
}

function titleCase(slug) {
  const map = {
    cpu: "CPU",
    ram: "RAM",
    iops: "IOPS",
    nic: "NIC",
    gpu: "GPU",
    vram: "VRAM",
    raid: "RAID",
    vm: "VM"
  };

  return String(slug || "")
    .split("-")
    .map((part) => map[part.toLowerCase()] || part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function listCategoryTools(category) {
  const dir = path.join(repoRoot, "tools", category);
  if (!fs.existsSync(dir)) return [];

  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => fs.existsSync(path.join(dir, slug, "index.html")))
    .sort();
}

function includesAny(haystack, needles) {
  return needles.some((needle) => haystack.includes(String(needle || "").toLowerCase()));
}

function dataContractNeedles(tool) {
  const label = titleCase(tool).toLowerCase();
  const base = [
    tool.toLowerCase() + " data contract",
    label + " data contract",
    "proposed " + label + " data contract"
  ];

  const special = {
    "cpu-sizing": [
      "cpu/ram capacity envelope data contract review",
      "cpu capacity data contract candidate",
      "cpu sizing"
    ],
    "ram-sizing": [
      "cpu/ram capacity envelope data contract review",
      "ram capacity data contract candidate",
      "ram sizing"
    ],
    "storage-iops": [
      "storage iops / storage throughput data contract review",
      "proposed storage iops data contract candidate",
      "storage iops"
    ],
    "storage-throughput": [
      "storage iops / storage throughput data contract review",
      "proposed storage throughput data contract candidate",
      "storage throughput"
    ]
  };

  return base.concat(special[tool] || []);
}

function visualNeedles(tool) {
  const special = {
    "cpu-sizing": ["compute-capacity-envelope", "capacity-envelope"],
    "ram-sizing": ["compute-capacity-envelope", "capacity-envelope"],
    "storage-iops": ["compute-iops-latency", "storage performance", "iops"],
    "storage-throughput": ["compute-throughput-envelope", "throughput-envelope"]
  };

  return (special[tool] || ["visual family", "shared visual"]).map((item) => item.toLowerCase());
}

function inspectTool(category, tool, profileLower) {
  const result = {
    category,
    tool,
    page: "tools/" + category + "/" + tool + "/index.html",
    status: "PASS",
    notes: []
  };

  function fail(code) {
    result.status = "FAIL";
    result.notes.push(code);
  }

  function watch(code) {
    if (result.status !== "FAIL") result.status = "WATCH";
    result.notes.push(code);
  }

  if (!exists(result.page)) {
    fail("FAIL_TOOL_PAGE_MISSING");
    return result;
  }

  if (!profileLower) {
    fail("FAIL_PLANNING_PROFILE_MISSING");
    return result;
  }

  const toolLabel = titleCase(tool).toLowerCase();
  const toolMentioned = profileLower.includes("### " + tool.toLowerCase()) ||
    profileLower.includes(tool.toLowerCase()) ||
    profileLower.includes(toolLabel);

  if (!toolMentioned) {
    fail("FAIL_TOOL_PROFILE_SECTION_MISSING");
  }

  if (!includesAny(profileLower, dataContractNeedles(tool))) {
    fail("FAIL_DATA_CONTRACT_MISSING");
  }

  if (!includesAny(profileLower, visualNeedles(tool))) {
    watch("WATCH_VISUAL_FAMILY_DECISION_NOT_DETECTED");
  }

  if (!profileLower.includes("implementation gate")) {
    fail("FAIL_IMPLEMENTATION_GATE_MISSING");
  }

  if (!profileLower.includes("summary/master assistant")) {
    watch("WATCH_SUMMARY_MASTER_ASSISTANT_PAYLOAD_NOT_DETECTED");
  }

  const engineeringNeedles = [
    "engineering capability review",
    "engineering capability gate",
    "formula guardrail",
    "formula change guardrail",
    "threshold change guardrail",
    "missing domain factors"
  ];

  if (!includesAny(profileLower, engineeringNeedles)) {
    watch("WATCH_ENGINEERING_CAPABILITY_REVIEW_NOT_DETECTED");
  }

  return result;
}

function main() {
  const category = argValue("--category", "compute");
  const toolsArg = argValue("--tools", argValue("--tool", ""));
  const profilePath = "docs/tool-planning-profiles/" + category + ".md";

  const profileExists = exists(profilePath);
  const profile = profileExists ? read(profilePath) : "";
  const profileLower = profile.toLowerCase();

  const tools = toolsArg
    ? toolsArg.split(",").map((item) => item.trim()).filter(Boolean)
    : listCategoryTools(category);

  const results = tools.map((tool) => inspectTool(category, tool, profileLower));

  const counts = results.reduce((acc, item) => {
    acc[item.status] = (acc[item.status] || 0) + 1;
    return acc;
  }, { PASS: 0, WATCH: 0, FAIL: 0 });

  console.log("SCOPEDLABS TOOL ENGINEERING READINESS AUDIT V1");
  console.log("Category: " + category);
  console.log("Profile: " + profilePath + (profileExists ? "" : " [missing]"));
  console.log("Tools checked: " + results.length);
  console.log("");

  results.forEach((item) => {
    console.log("[" + item.status + "] " + item.tool);
    console.log("  " + item.page);
    item.notes.forEach((note) => console.log("  " + note));
  });

  console.log("");
  console.log("SUMMARY");
  console.log("PASS: " + counts.PASS);
  console.log("WATCH: " + counts.WATCH);
  console.log("FAIL: " + counts.FAIL);

  const overall = counts.FAIL > 0 ? "FAIL" : (counts.WATCH > 0 ? "PASS_WITH_WATCH" : "PASS");
  console.log("OVERALL: " + overall);

  if (hasFlag("--strict") && overall !== "PASS") {
    process.exitCode = 1;
  }
}

main();
