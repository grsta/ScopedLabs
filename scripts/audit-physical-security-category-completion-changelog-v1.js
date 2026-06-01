const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const checks = [];

function add(name, ok, detail) {
  checks.push({ name, status: ok ? "SAFE" : "FAIL", detail });
}

const page = read("changelog/index.html");
const markdown = exists("CHANGELOG.md") ? read("CHANGELOG.md") : "";

add("visible-entry", page.includes("Physical Security Category Completion"), "Visible /changelog/ page contains category completion entry");
add("visible-date", page.includes("May 31, 2026"), "Visible /changelog/ page contains May 31, 2026");
add("visible-category-pill", page.includes("<span class=\"pill\">Physical Security</span>"), "Visible /changelog/ page contains Physical Security pill");
add("entry-before-guardrails", page.indexOf("Physical Security Category Completion") > -1 && page.indexOf("Physical Security Category Completion") < page.indexOf("Physical Security Pipeline Guardrails"), "Completion entry appears before older guardrails entry");
add("category-factory-language", page.includes("first reusable ScopedLabs category-factory model"), "Visible entry explains category-factory milestone");
add("summary-assistant-language", page.includes("Physical Security master/category assistant"), "Visible entry mentions Summary master/category assistant");
add("future-pattern-language", page.includes("local tool assistants feed"), "Visible entry mentions future category pattern");
add("checkpoint-file", exists("docs/checkpoints/physical-security-category-completion-checkpoint-2026-05-31.md"), "Checkpoint MD file exists");
add("markdown-changelog-entry", markdown.includes("Physical Security Category Completion"), "CHANGELOG.md contains category completion entry");

console.table(checks);

const fail = checks.filter((check) => check.status === "FAIL");

console.log("");
console.log("Summary:");
console.log("- SAFE:", checks.length - fail.length);
console.log("- FAIL:", fail.length);

if (fail.length) process.exit(1);
