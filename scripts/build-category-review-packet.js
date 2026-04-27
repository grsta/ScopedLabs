const fs = require("fs");
const path = require("path");

const root = process.cwd();
const category = process.argv[2];

if (!category) {
  console.error("Usage: node scripts/build-category-review-packet.js <category-slug>");
  console.error("Example: node scripts/build-category-review-packet.js access-control");
  process.exit(1);
}

const categoryDir = path.join(root, "tools", category);
const reportsDir = path.join(root, "reports");

if (!fs.existsSync(categoryDir)) {
  console.error(`Missing category folder: tools/${category}`);
  process.exit(1);
}

fs.mkdirSync(reportsDir, { recursive: true });

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function cleanText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTitle(html) {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return cleanText(h1?.[1] || title?.[1] || "");
}

function extractMetaDescription(html) {
  const m =
    html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) ||
    html.match(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);

  return m ? cleanText(m[1]) : "";
}

function extractLabels(html) {
  return [...html.matchAll(/<label[^>]*>([\s\S]*?)<\/label>/gi)]
    .map((m) => cleanText(m[1]))
    .filter(Boolean);
}

function extractIds(html) {
  return [...html.matchAll(/\b(?:id|name)=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter(Boolean);
}

function lineNumbered(lines, start, end) {
  return lines
    .slice(start, end + 1)
    .map((line, i) => `${String(start + i + 1).padStart(4, " ")}: ${line}`)
    .join("\n");
}

function countBraces(line) {
  // Good enough for audit extraction. Not a full JS parser.
  const stripped = line
    .replace(/\/\/.*$/g, "")
    .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, "");

  let count = 0;
  for (const ch of stripped) {
    if (ch === "{") count++;
    if (ch === "}") count--;
  }
  return count;
}

function extractFunctionBlock(lines, startIndex) {
  let braceDepth = 0;
  let started = false;
  let endIndex = Math.min(lines.length - 1, startIndex + 220);

  for (let i = startIndex; i < lines.length; i++) {
    const delta = countBraces(lines[i]);

    if (lines[i].includes("{")) started = true;
    if (started) braceDepth += delta;

    if (started && braceDepth <= 0 && i > startIndex) {
      endIndex = i;
      break;
    }

    if (i - startIndex > 260) {
      endIndex = i;
      break;
    }
  }

  return [startIndex, endIndex];
}

function extractCoreLogic(js) {
  const lines = js.split(/\r?\n/);
  const ranges = [];

  const functionNamePattern =
    /^\s*(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(|^\s*const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>|^\s*const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?function/i;

  const importantName =
    /(calc|calculate|evaluate|recommend|classify|score|status|risk|threshold|guidance|interpretation|analysis|core|result|sizing|capacity|utilization|margin|headroom|runtime|retention|throughput|power|load|density|ratio|factor)/i;

  lines.forEach((line, idx) => {
    const m = line.match(functionNamePattern);
    const fnName = m ? (m[1] || m[2] || m[3] || "") : "";

    if (fnName && importantName.test(fnName)) {
      ranges.push(extractFunctionBlock(lines, idx));
    }
  });

  // Add click handlers and nearby calculation triggers.
  lines.forEach((line, idx) => {
    if (
      /addEventListener\(["']click["']/i.test(line) ||
      /els\.calc/i.test(line) ||
      /querySelector\(["']#calc["']\)/i.test(line)
    ) {
      ranges.push([Math.max(0, idx - 20), Math.min(lines.length - 1, idx + 40)]);
    }
  });

  // Add important standalone decision lines if function names were odd.
  lines.forEach((line, idx) => {
    if (
      /(HEALTHY|WATCH|RISK|FAIL-SAFE|FAIL-SECURE|CONDITIONAL|recommendation|score\s*[+\-*/]?=|status\s*=|threshold|margin|headroom|capacity|utilization)/i.test(line)
    ) {
      ranges.push([Math.max(0, idx - 30), Math.min(lines.length - 1, idx + 50)]);
    }
  });

  // Merge ranges.
  ranges.sort((a, b) => a[0] - b[0]);

  const merged = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];

    if (!last || range[0] > last[1] + 8) {
      merged.push([...range]);
    } else {
      last[1] = Math.max(last[1], range[1]);
    }
  }

  if (!merged.length) {
    return "No focused core logic blocks detected. Full script inspection may be needed.";
  }

  return merged
    .slice(0, 10)
    .map(([start, end], index) => {
      return `--- CORE BLOCK ${index + 1} ---\n${lineNumbered(lines, start, end)}`;
    })
    .join("\n\n");
}

function findToolFolders() {
  return fs.readdirSync(categoryDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

const tools = findToolFolders();
const sections = [];
const summary = [];

sections.push(`# ScopedLabs Category Formula Review Packet`);
sections.push(`Category: ${category}`);
sections.push(`Generated: ${new Date().toISOString()}`);
sections.push(`Tools found: ${tools.length}`);
sections.push(``);

for (const slug of tools) {
  const toolDir = path.join(categoryDir, slug);
  const htmlPath = path.join(toolDir, "index.html");
  const jsPath = path.join(toolDir, "script.js");

  if (!fs.existsSync(htmlPath)) continue;

  const html = read(htmlPath);
  const js = read(jsPath);
  const title = extractTitle(html);
  const desc = extractMetaDescription(html);
  const labels = [...new Set(extractLabels(html))];
  const ids = [...new Set(extractIds(html))];

  const tier =
    /data-tier=["']pro["']/i.test(html) ||
    /\btool-row\b[^>]*\bpro\b/i.test(html)
      ? "pro"
      : "free/unknown";

  const flags = {
    scriptJs: fs.existsSync(jsPath),
    pipeline: /id=["']pipeline["']|\/assets\/pipeline\.js/i.test(html),
    flowNote: /id=["']flow-note["']/i.test(html),
    continueButton: /id=["']continue["']|continue-wrap/i.test(html),
    exportCard: /exportReport|saveSnapshot|ScopedLabsExport/i.test(html + js),
    helpJs: /\/assets\/help\.js/i.test(html),
    analyzer: /analysis-copy|ScopedLabsAnalyzer|\/assets\/analyzer\.js/i.test(html + js)
  };

  summary.push({
    slug,
    title,
    tier,
    scriptJs: flags.scriptJs,
    inputs: labels.length,
    pipeline: flags.pipeline,
    export: flags.exportCard,
    help: flags.helpJs
  });

  sections.push(`\n\n============================================================`);
  sections.push(`TOOL: ${slug}`);
  sections.push(`============================================================`);
  sections.push(`Title: ${title}`);
  sections.push(`Tier: ${tier}`);
  sections.push(`Meta description: ${desc || "(missing)"}`);
  sections.push(`Flags: ${JSON.stringify(flags, null, 2)}`);
  sections.push(``);
  sections.push(`Input labels:`);
  sections.push(labels.length ? labels.map((x) => `- ${x}`).join("\n") : "- none detected");
  sections.push(``);
  sections.push(`Important IDs/names:`);
  sections.push(ids.length ? ids.map((x) => `- ${x}`).join("\n") : "- none detected");
  sections.push(``);
  sections.push(`Focused core logic:`);
  sections.push(flags.scriptJs ? extractCoreLogic(js) : "Missing script.js");
}

const outPath = path.join(reportsDir, `${category}-category-review-packet.txt`);
fs.writeFileSync(outPath, sections.join("\n") + "\n", "utf8");

console.log(`Category review packet created: ${outPath}`);
console.table(summary);
