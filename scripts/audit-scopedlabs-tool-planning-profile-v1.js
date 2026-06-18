#!/usr/bin/env node
/*
  ScopedLabs Tool Planning Profile Audit V1

  Read-only inventory audit for category modernization planning.
  It does not rewrite tool/category pages.

  Usage:
    node ./scripts/audit-scopedlabs-tool-planning-profile-v1.js --category compute
    node ./scripts/audit-scopedlabs-tool-planning-profile-v1.js --category compute --write-profile
*/

const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);

function argValue(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
}

const category = argValue("--category", "compute");
const writeProfile = args.includes("--write-profile");

const root = process.cwd();
const categoryDir = path.join(root, "tools", category);
const profileDir = path.join(root, "docs", "tool-planning-profiles");
const profileFile = path.join(profileDir, category + ".md");

function exists(file) {
  return fs.existsSync(file);
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, "/");
}

function normalizeText(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function unique(values) {
  return Array.from(new Set(values.filter(Boolean)));
}

function getAttrAll(html, tag, attr) {
  const out = [];
  const re = new RegExp("<" + tag + "\\b[^>]*\\s" + attr + "=[\"']([^\"']+)[\"'][^>]*>", "gi");
  let match;
  while ((match = re.exec(html))) out.push(match[1]);
  return unique(out);
}

function getAllIds(html) {
  const out = [];
  const re = /\bid=["']([^"']+)["']/gi;
  let match;
  while ((match = re.exec(html))) out.push(match[1]);
  return unique(out);
}

function getHeading(html) {
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
  return {
    title: normalizeText(title ? title[1] : ""),
    h1: normalizeText(h1 ? h1[1] : "")
  };
}

function getInputs(html) {
  const out = [];
  const re = /<(input|select|textarea)\b[^>]*>/gi;
  let match;
  while ((match = re.exec(html))) {
    const tag = match[0];
    const id = /\bid=["']([^"']+)["']/i.exec(tag);
    const name = /\bname=["']([^"']+)["']/i.exec(tag);
    const type = /\btype=["']([^"']+)["']/i.exec(tag);
    out.push(id ? id[1] : name ? name[1] : type ? match[1] + ":" + type[1] : match[1]);
  }
  return unique(out);
}

function getButtons(html) {
  const out = [];
  let match;

  const buttonRe = /<button\b[\s\S]*?<\/button>/gi;
  while ((match = buttonRe.exec(html))) {
    const id = /\bid=["']([^"']+)["']/i.exec(match[0]);
    const text = normalizeText(match[0]);
    out.push(id ? id[1] + (text ? " ? " + text : "") : text);
  }

  const linkRe = /<a\b[^>]*class=["'][^"']*\bbtn\b[^"']*["'][\s\S]*?<\/a>/gi;
  while ((match = linkRe.exec(html))) {
    const href = /\bhref=["']([^"']+)["']/i.exec(match[0]);
    const text = normalizeText(match[0]) || "button link";
    out.push(text + (href ? " ? " + href[1] : ""));
  }

  return unique(out);
}

function containsAny(html, terms) {
  const lower = html.toLowerCase();
  return terms.some((term) => lower.includes(term.toLowerCase()));
}

function detectMode(slug, file) {
  if (slug === "_category_index") return "CATEGORY_PLANNER_COMMAND_PAGE";
  if (slug === "summary") return "CATEGORY_SUMMARY_MASTER_ASSISTANT_PAGE";
  if (/summary/i.test(file)) return "SUMMARY_OR_REPORT";
  if (/scope|planner|special/i.test(slug)) return "CANDIDATE_SPECIAL_OR_PLANNER_PATH";
  return "TOOL_PAGE";
}

function analyzePage(file, slug) {
  const html = read(file);
  const headings = getHeading(html);
  const scripts = getAttrAll(html, "script", "src");
  const styles = getAttrAll(html, "link", "href");
  const ids = getAllIds(html);
  const inputs = getInputs(html);
  const buttons = getButtons(html);
  const mode = detectMode(slug, rel(file));

  const features = {
    hasInputs: inputs.length > 0,
    hasResults: containsAny(html, ["result", "results", "output"]),
    hasVisual: containsAny(html, ["visual", "chart", "svg", "canvas", "graph"]),
    hasAssistant: containsAny(html, ["assistant", "guidance", "recommendation"]),
    hasExport: containsAny(html, ["export", "report", "print"]),
    hasSnapshot: containsAny(html, ["snapshot", "save snapshot"]),
    hasPipeline: containsAny(html, ["pipeline", "continue", "carry", "flow"]),
    hasBackContinue: containsAny(html, ["Back to", "Continue", "continue-wrap", "flow-actions"]),
    hasKnowledgeBase: containsAny(html, ["knowledge", "help.js", "kb", "guide"]),
    hasPlannerSignals: containsAny(html, ["planner", "planning", "workflow", "start", "resume"]),
    hasSummarySignals: containsAny(html, ["summary", "rollup", "master assistant", "final report"]),
    hasLocalSvgOrVisualBuilder: /function\s+\w*(Svg|Visual|Chart)\w*\s*\(/.test(html) || /<svg\b/i.test(html),
    loadsShellModule: scripts.some((s) => /shell|contract/i.test(s)),
    loadsSharedVisualModule: scripts.some((s) => /visual|graphics|chart/i.test(s)),
    loadsAssistantModule: scripts.some((s) => /assistant/i.test(s)),
    loadsExportModule: scripts.some((s) => /export|report/i.test(s))
  };

  const watch = [];

  if (mode === "TOOL_PAGE" && !features.hasInputs) watch.push("WATCH_INPUTS_NOT_DETECTED");
  if (mode === "TOOL_PAGE" && !features.hasResults) watch.push("WATCH_RESULT_REGION_NOT_DETECTED");
  if (mode === "TOOL_PAGE" && !features.hasBackContinue) watch.push("WATCH_FLOW_ACTIONS_NOT_DETECTED");
  if (mode === "TOOL_PAGE" && !features.hasAssistant) watch.push("WATCH_ASSISTANT_NOT_DETECTED");
  if (mode === "TOOL_PAGE" && !features.hasExport) watch.push("WATCH_EXPORT_NOT_DETECTED");
  if (mode === "TOOL_PAGE" && features.hasLocalSvgOrVisualBuilder && !features.loadsSharedVisualModule) watch.push("WATCH_LOCAL_VISUAL_OR_SVG_PRESENT");
  if (mode === "CATEGORY_PLANNER_COMMAND_PAGE" && !features.hasPlannerSignals) watch.push("WATCH_PLANNER_SIGNALS_WEAK");
  if (mode === "CATEGORY_SUMMARY_MASTER_ASSISTANT_PAGE" && !features.hasSummarySignals) watch.push("WATCH_SUMMARY_SIGNALS_WEAK");

  return {
    slug,
    mode,
    file: rel(file),
    title: headings.title,
    h1: headings.h1,
    inputs,
    buttons,
    scripts,
    styles,
    ids,
    features,
    watch
  };
}

function listPages() {
  if (!exists(categoryDir)) {
    throw new Error("Category directory not found: " + rel(categoryDir));
  }

  const pages = [];
  const categoryIndex = path.join(categoryDir, "index.html");

  if (exists(categoryIndex)) {
    pages.push(analyzePage(categoryIndex, "_category_index"));
  }

  const children = fs.readdirSync(categoryDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const child of children) {
    const index = path.join(categoryDir, child, "index.html");
    if (exists(index)) pages.push(analyzePage(index, child));
  }

  return pages;
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function bulletList(values, fallback) {
  if (!values || !values.length) return "- " + (fallback || "None detected");
  return values.map((value) => "- " + value).join("\n");
}

function featureLine(page) {
  const f = page.features;
  return [
    "inputs=" + yesNo(f.hasInputs),
    "results=" + yesNo(f.hasResults),
    "visual=" + yesNo(f.hasVisual),
    "assistant=" + yesNo(f.hasAssistant),
    "export=" + yesNo(f.hasExport),
    "snapshot=" + yesNo(f.hasSnapshot),
    "pipeline=" + yesNo(f.hasPipeline),
    "flow=" + yesNo(f.hasBackContinue),
    "kb=" + yesNo(f.hasKnowledgeBase)
  ].join(" | ");
}

function makeProfile(pages) {
  const date = new Date().toISOString().slice(0, 10);
  const planner = pages.find((page) => page.mode === "CATEGORY_PLANNER_COMMAND_PAGE");
  const summary = pages.find((page) => page.mode === "CATEGORY_SUMMARY_MASTER_ASSISTANT_PAGE");
  const tools = pages.filter((page) => page.mode !== "CATEGORY_PLANNER_COMMAND_PAGE");

  const lines = [];

  lines.push("# " + category + " Tool Planning Profile");
  lines.push("");
  lines.push("Status: READ_ONLY_AUDIT_DRAFT");
  lines.push("Generated: " + date);
  lines.push("Audit script: `scripts/audit-scopedlabs-tool-planning-profile-v1.js`");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Category System Inventory");
  lines.push("");
  lines.push("- Category: `" + category + "`");
  lines.push("- Planner / command page: " + (planner ? "`" + planner.file + "`" : "NOT DETECTED"));
  lines.push("- Summary / master assistant page: " + (summary ? "`" + summary.file + "`" : "NOT DETECTED"));
  lines.push("- Tool-like pages detected: " + tools.length);
  lines.push("");
  lines.push("This profile is read-only discovery output. Do not rewrite tool pages from this profile alone.");
  lines.push("");
  lines.push("Required next step: review planner inputs, data contracts, visual families, shared icons, assistant/export/snapshot/pipeline modules, and category summary/master assistant needs before implementation.");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Category-Level Decisions To Review");
  lines.push("");
  lines.push("- Planner / command shell needed: REVIEW");
  lines.push("- Summary / master assistant shell needed: REVIEW");
  lines.push("- Category visual families needed: REVIEW");
  lines.push("- Category shared icon library needs: REVIEW");
  lines.push("- Local assistant pattern: REVIEW");
  lines.push("- Summary/master assistant publish contract: REVIEW");
  lines.push("- Export/report family needs: REVIEW");
  lines.push("- Snapshot/carry-forward needs: REVIEW");
  lines.push("- Cross-category handoff needs: REVIEW");
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Pages");
  lines.push("");

  for (const page of pages) {
    lines.push("### " + page.slug);
    lines.push("");
    lines.push("- Mode: " + page.mode);
    lines.push("- File: `" + page.file + "`");
    lines.push("- Title: " + (page.title || "Not detected"));
    lines.push("- H1: " + (page.h1 || "Not detected"));
    lines.push("- Feature scan: " + featureLine(page));
    lines.push("- Watch items: " + (page.watch.length ? page.watch.join(", ") : "None"));
    lines.push("");
    lines.push("#### Current detected inputs");
    lines.push("");
    lines.push(bulletList(page.inputs, "None detected"));
    lines.push("");
    lines.push("#### Current detected actions/buttons");
    lines.push("");
    lines.push(bulletList(page.buttons, "None detected"));
    lines.push("");
    lines.push("#### Loaded scripts");
    lines.push("");
    lines.push(bulletList(page.scripts, "None detected"));
    lines.push("");
    lines.push("#### Planning review fields");
    lines.push("");
    lines.push("- Current purpose: REVIEW");
    lines.push("- Missing planner inputs: REVIEW");
    lines.push("- Data contract needed: REVIEW");
    lines.push("- Visual family decision: REVIEW");
    lines.push("- Shared icon/graphics needs: REVIEW");
    lines.push("- Local assistant needs: REVIEW");
    lines.push("- Export/report needs: REVIEW");
    lines.push("- Snapshot needs: REVIEW");
    lines.push("- Pipeline/carry-forward needs: REVIEW");
    lines.push("- Summary/master assistant publish needs: REVIEW");
    lines.push("- Proposed module wiring: REVIEW");
    lines.push("- Closeout status: READ_ONLY_AUDIT_DRAFT");
    lines.push("");
  }

  const watchCounts = new Map();

  for (const page of pages) {
    for (const item of page.watch) {
      watchCounts.set(item, (watchCounts.get(item) || 0) + 1);
    }
  }

  lines.push("---");
  lines.push("");
  lines.push("## Named Watch Summary");
  lines.push("");

  if (!watchCounts.size) {
    lines.push("- None");
  } else {
    for (const item of Array.from(watchCounts.keys()).sort()) {
      lines.push("- " + item + ": " + watchCounts.get(item));
    }
  }

  lines.push("");
  lines.push("## Lock Status");
  lines.push("");
  lines.push("This category is not locked by this audit. This profile must be reviewed and refined before tool/page modernization.");
  lines.push("");

  return lines.join("\n");
}

function printSummary(pages) {
  let pass = 0;
  let watch = 0;
  let fail = 0;

  console.log("SCOPEDLABS TOOL PLANNING PROFILE AUDIT V1");
  console.log("Category:", category);
  console.log("Pages scanned:", pages.length);
  console.log("");

  for (const page of pages) {
    const status = page.watch.length ? "WATCH" : "PASS";
    if (status === "WATCH") watch += 1;
    else pass += 1;

    console.log("[" + status + "] " + page.slug + " :: " + page.mode);
    console.log("  " + page.file);
    console.log("  " + featureLine(page));
    if (page.watch.length) console.log("  " + page.watch.join(", "));
  }

  console.log("");
  console.log("SUMMARY");
  console.log("PASS:", pass);
  console.log("WATCH:", watch);
  console.log("FAIL:", fail);
  console.log("OVERALL:", fail ? "FAIL" : watch ? "PASS_WITH_WATCH" : "PASS");

  return { pass, watch, fail };
}

const pages = listPages();
const result = printSummary(pages);

if (writeProfile) {
  fs.mkdirSync(profileDir, { recursive: true });
  fs.writeFileSync(profileFile, makeProfile(pages).replace(/\n/g, "\r\n"), "utf8");
  console.log("");
  console.log("WROTE PROFILE:", rel(profileFile));
}

if (result.fail) process.exitCode = 1;
