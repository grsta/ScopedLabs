const fs = require("fs");
const path = require("path");

const root = process.cwd();
const cat = "access-control";
const catDir = path.join(root, "tools", cat);

const report = [];

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return (h1?.[1] || title?.[1] || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function extractInputs(html) {
  const labels = [...html.matchAll(/<label[^>]*>([\s\S]*?)<\/label>/gi)]
    .map(m => m[1].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const ids = [...html.matchAll(/\b(?:id|name)=["']([^"']+)["']/gi)]
    .map(m => m[1])
    .filter(Boolean);

  return {
    labels: [...new Set(labels)],
    ids: [...new Set(ids)]
  };
}

function importantLines(js) {
  const lines = js.split(/\r?\n/);
  const hits = [];

  const patterns = [
    /\bconst\b|\blet\b|\bvar\b/,
    /Math\./,
    /\bif\s*\(/,
    /\belse\b/,
    /\breturn\b/,
    /risk|watch|healthy|strong|mixed|concerning|status|rating|score|threshold|limit|margin|headroom/i,
    /factor|ratio|percent|capacity|current|amp|watt|volt|door|reader|lock|panel|credential|level|schedule/i,
    /[+\-*/]=?|>=|<=/
  ];

  lines.forEach((line, idx) => {
    const clean = line.trim();

    if (!clean) return;
    if (clean.startsWith("//")) return;
    if (clean.length > 220) return;

    if (patterns.some(p => p.test(clean))) {
      hits.push(`${String(idx + 1).padStart(4, " ")}: ${clean}`);
    }
  });

  return hits.slice(0, 140);
}

if (!fs.existsSync(catDir)) {
  throw new Error(`Missing category folder: ${catDir}`);
}

for (const entry of fs.readdirSync(catDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;

  const slug = entry.name;
  const toolDir = path.join(catDir, slug);
  const htmlPath = path.join(toolDir, "index.html");
  const jsPath = path.join(toolDir, "script.js");

  if (!fs.existsSync(htmlPath)) continue;

  const html = read(htmlPath);
  const js = read(jsPath);
  const inputs = extractInputs(html);

  report.push({
    slug,
    title: extractTitle(html),
    tier: /data-tier=["']pro["']/i.test(html) ? "pro" : "free/unknown",
    hasScriptJs: fs.existsSync(jsPath),
    hasCalculateButton: /\b(id|data-action)=["'](?:calc|calculate|run|submit)["']/i.test(html) || /Calculate/i.test(html),
    hasResults: /results|result-card|result-row|analysis-copy|output/i.test(html),
    inputLabels: inputs.labels,
    ids: inputs.ids,
    formulaLines: importantLines(js)
  });
}

const outDir = path.join(root, "reports");
fs.mkdirSync(outDir, { recursive: true });

const outPath = path.join(outDir, "access-control-formula-audit.json");
fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n", "utf8");

console.log("Access Control formula audit created:");
console.log(outPath);
console.log("");
console.table(report.map(t => ({
  slug: t.slug,
  tier: t.tier,
  script: t.hasScriptJs,
  inputs: t.inputLabels.length,
  ids: t.ids.length,
  formulaLines: t.formulaLines.length
})));
