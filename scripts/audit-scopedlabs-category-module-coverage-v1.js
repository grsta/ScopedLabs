const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : "";
}

function exists(file) {
  return fs.existsSync(file);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function argValue(name, fallback) {
  const idx = process.argv.indexOf(name);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  const inline = process.argv.find((item) => item.startsWith(name + "="));
  return inline ? inline.slice(name.length + 1) : fallback;
}

function pad(value, width) {
  const text = String(value == null ? "" : value);
  return text.length >= width ? text.slice(0, width - 1) + "?" : text + " ".repeat(width - text.length);
}

function cleanList(items, max) {
  const list = (items || []).filter(Boolean);
  if (!list.length) return "-";
  const visible = list.slice(0, max || 4);
  return visible.join(", ") + (list.length > visible.length ? ", +" + (list.length - visible.length) : "");
}

function inferCategoryFromPath(file) {
  const base = String(file || "").toLowerCase();
  if (base.includes("compute")) return "compute";
  if (base.includes("access-control")) return "access-control";
  if (base.includes("physical-security")) return "physical-security";
  if (base.includes("network")) return "network";
  if (base.includes("power")) return "power";
  if (base.includes("storage")) return "storage";
  if (base.includes("scopedlabs-")) return "shared";
  return "unknown";
}

function inferCapabilities(file) {
  const base = String(file || "").toLowerCase();
  const caps = [];
  if (base.includes("plan-state") || base.includes("pipeline-state") || base.includes("state")) caps.push("state");
  if (base.includes("shell") || base.includes("tool-shell") || base.includes("category-planner")) caps.push("shell");
  if (base.includes("assistant")) caps.push("assistant");
  if (base.includes("report-metadata") || base.includes("export") || base.includes("proof-table")) caps.push("reportExport");
  if (base.includes("help.js") || base.includes("kb") || base.includes("knowledge")) caps.push("kb");
  if (base.includes("visual") || base.includes("chart") || base.includes("capacity")) caps.push("visual");
  if (base.includes("planner") || base.includes("summary")) caps.push("plannerSummary");
  if (base.includes("user-tool-notes") || base.includes("tool-notes")) caps.push("toolNotes");
  if (base.includes("ledger") || base.includes("record") || base.includes("payload")) caps.push("ledgerPayload");
  if (base.includes("flow") || base.includes("pipeline")) caps.push("flow");
  return Array.from(new Set(caps));
}

function filesMentionedInModuleMap(moduleMap) {
  const found = [];
  const regex = /[A-Za-z0-9_./-]+\.(?:js|css|html|md)/g;
  let match;
  while ((match = regex.exec(moduleMap))) found.push(match[0]);
  return found;
}

function moduleDatabase() {
  const moduleMap = read("docs/scopedlabs-module-map.md");
  const mapped = filesMentionedInModuleMap(moduleMap);
  const scanned = walk("assets").concat(walk("scripts")).filter((file) => /\.(js|css)$/.test(file));
  const files = Array.from(new Set(mapped.concat(scanned))).sort();
  return files.map((file) => ({
    file,
    category: inferCategoryFromPath(file),
    capabilities: inferCapabilities(file),
    inModuleMap: moduleMap.includes(file)
  }));
}

const CATEGORY_CONFIGS = {
  compute: {
    category: "compute",
    root: "tools/compute",
    referenceTool: "cpu-sizing",
    tools: [
      "cpu-sizing",
      "ram-sizing",
      "storage-iops",
      "storage-throughput",
      "vm-density",
      "gpu-vram",
      "power-thermal",
      "raid-rebuild-time",
      "backup-window",
      "nic-bonding"
    ],
    requiredCapabilities: [
      "page",
      "script",
      "state",
      "ledgerPayload",
      "workloadContext",
      "shell",
      "assistant",
      "reportExport",
      "kb",
      "flow"
    ],
    capabilityToModules: {
      state: ["scopedlabs-compute-plan-state.js", "pipeline-state.js"],
      ledgerPayload: ["scopedlabs-compute-plan-state.js", "recordToolResult"],
      workloadContext: ["scopedlabs-compute-shell-contract.js", "scopedlabs-compute-plan-state.js"],
      shell: ["scopedlabs-tool-shell.js", "scopedlabs-compute-shell-contract.js"],
      assistant: ["scopedlabs-local-assistant.js", "scopedlabs-compute-assistant-contract.js"],
      reportExport: ["scopedlabs-report-metadata.js", "export.js", "scopedlabs-assistant-export.js"],
      kb: ["help.js"],
      flow: ["pipeline.js", "tool-flow.js", "pipeline-state.js"]
    },
    specialReviewTools: ["nic-bonding"]
  }
};

function inferCategoryConfig(category) {
  const root = "tools/" + category;
  const tools = fs.existsSync(root)
    ? fs.readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name) => name !== "summary")
        .sort()
    : [];
  return {
    category,
    root,
    referenceTool: tools[0] || "",
    tools,
    requiredCapabilities: ["page", "script", "shell", "assistant", "reportExport", "kb", "flow"],
    capabilityToModules: {},
    specialReviewTools: []
  };
}

function toolFiles(config, tool) {
  return {
    htmlFile: config.root + "/" + tool + "/index.html",
    scriptFile: config.root + "/" + tool + "/script.js"
  };
}

function capabilityInventory(config, tool) {
  const files = toolFiles(config, tool);
  const html = read(files.htmlFile);
  const js = read(files.scriptFile);
  const bothRaw = html + "\n" + js;
  const both = bothRaw.toLowerCase();
  const caps = {
    page: html.length > 0,
    script: js.length > 0,
    state: html.includes("scopedlabs-" + config.category + "-plan-state.js") || html.includes("pipeline-state.js") || html.includes("scopedlabs-compute-plan-state.js"),
    ledgerPayload: js.includes("recordToolResult") || js.includes("recordTool") || js.includes("summary-ready") || js.includes("summaryReady"),
    workloadContext: html.includes("computeWorkloadContextCard") || js.includes("computeWorkloadContextCard") || both.includes("active workload") || both.includes("workload context"),
    shell: html.includes("scopedlabs-tool-shell") || html.includes("data-compute-tool-shell") || html.includes("scopedlabs-compute-shell-contract") || html.includes("tool-shell"),
    assistant: both.includes("assistant") || html.includes("scopedlabs-local-assistant") || html.includes("scopedlabs-compute-assistant-contract"),
    reportExport: html.includes("scopedlabs-report-metadata") || html.includes("Documentation & Export") || html.includes("export.js") || js.includes("export"),
    kb: html.includes("help.js") || html.includes("Knowledge Base") || both.includes("knowledge base"),
    flow: html.includes("compute-flow-actions") || html.includes("pipeline.js") || html.includes("tool-flow.js") || (html.includes("Back") && html.includes("Continue")),
    visual: both.includes("visual") || both.includes("chart") || both.includes("svg"),
    snapshot: both.includes("snapshot"),
    toolNotes: html.includes("scopedlabs-user-tool-notes") || both.includes("tool notes")
  };
  return { files, html, js, caps };
}

function compatibleModulesForCapability(config, db, capability) {
  const hints = config.capabilityToModules[capability] || [];
  const direct = db.filter((mod) => {
    const lower = mod.file.toLowerCase();
    return hints.some((hint) => lower.includes(String(hint).toLowerCase())) || mod.capabilities.includes(capability);
  });
  const scoped = direct.filter((mod) => mod.category === config.category || mod.category === "shared" || mod.category === "unknown");
  return scoped.map((mod) => mod.file);
}

function classifyTool(config, tool, caps, required) {
  const missing = required.filter((cap) => !caps[cap]);
  const presentCount = required.length - missing.length;
  if (!caps.page || !caps.script) return { status: "FAIL", state: "MISSING_FILE", missing };
  if (tool === config.referenceTool && !missing.length) return { status: "PASS", state: "GOLD_REFERENCE", missing };
  if (!missing.length) return { status: "PASS", state: "MODERN_READY", missing };
  if ((config.specialReviewTools || []).includes(tool)) return { status: "WATCH", state: "SPECIAL_PATH_REVIEW", missing };
  if (caps.reportExport && caps.kb && !caps.state && !caps.shell) return { status: "WATCH", state: "LEGACY_EXPORT_TOOL", missing };
  if (caps.state && caps.shell && caps.assistant && presentCount >= Math.ceil(required.length * 0.7)) return { status: "WATCH", state: "PARTIAL_MODERN", missing };
  return { status: "WATCH", state: "NEEDS_MODULE_REVIEW", missing };
}

function main() {
  const category = argValue("--category", "compute");
  const json = process.argv.includes("--json");
  const config = CATEGORY_CONFIGS[category] || inferCategoryConfig(category);
  const db = moduleDatabase();
  const required = config.requiredCapabilities || [];
  const rows = [];
  let pass = 0;
  let watch = 0;
  let fail = 0;
  config.tools.forEach((tool) => {
    const inv = capabilityInventory(config, tool);
    const classification = classifyTool(config, tool, inv.caps, required);
    const compatible = {};
    classification.missing.forEach((capability) => {
      compatible[capability] = compatibleModulesForCapability(config, db, capability).slice(0, 4);
    });
    if (classification.status === "PASS") pass += 1;
    else if (classification.status === "FAIL") fail += 1;
    else watch += 1;
    rows.push({ tool, state: classification.state, status: classification.status, missing: classification.missing, compatible, files: inv.files, caps: inv.caps });
  });
  const result = {
    audit: "audit-scopedlabs-category-module-coverage-v1",
    category,
    referenceTool: config.referenceTool,
    moduleDatabase: { count: db.length, mappedCount: db.filter((mod) => mod.inModuleMap).length },
    summary: { pass, watch, fail },
    rows
  };
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    process.exit(fail ? 1 : 0);
  }
  console.log("SCOPEDLABS CATEGORY MODULE COVERAGE AUDIT V1");
  console.log("Category: " + category);
  console.log("Reference tool: " + (config.referenceTool || "none"));
  console.log("Module database: " + db.length + " files scanned; " + db.filter((mod) => mod.inModuleMap).length + " referenced in docs/scopedlabs-module-map.md");
  console.log("");
  console.log(pad("TOOL", 24) + pad("STATE", 24) + pad("STATUS", 9) + pad("MISSING CAPABILITIES", 46) + "COMPATIBLE EXISTING MODULES");
  console.log("-".repeat(150));
  rows.forEach((row) => {
    const compatible = row.missing.map((cap) => cap + ": " + cleanList(row.compatible[cap], 2));
    console.log(pad(row.tool, 24) + pad(row.state, 24) + pad(row.status, 9) + pad(cleanList(row.missing, 6), 46) + cleanList(compatible, 3));
  });
  console.log("");
  console.log("SUMMARY");
  console.log("PASS: " + pass);
  console.log("WATCH: " + watch);
  console.log("FAIL: " + fail);
  console.log("OVERALL: " + (fail ? "FAIL" : watch ? "WATCH" : "PASS"));
  if (watch) {
    console.log("");
    console.log("NOTE");
    console.log("WATCH means the tool is not broken; it means existing shared modules appear compatible but are not fully installed or require an adapter/review lane.");
  }
  process.exit(fail ? 1 : 0);
}

main();