/*
 * ScopedLabs Physical Security Tool Shell V1 Audit
 * Version: physical-security-shell-audit-002-shell-opt-in
 *
 * Registry-driven read-only audit.
 * No files are modified by this script.
 */

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const registryPath = path.join(root, "assets", "physical-security-tool-registry.js");
const psGfxPath = path.join(root, "assets", "physical-security-graphics.js");

const registry = require(registryPath);

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function yesNo(value) {
  return value ? "yes" : "no";
}

function count(text, rx) {
  return (text.match(rx) || []).length;
}

function hasAny(text, patterns) {
  return patterns.some((pattern) => pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern));
}

function scriptSrcs(html) {
  return Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)).map((m) => m[1]);
}

function scriptIndex(srcs, needle) {
  return srcs.findIndex((src) => src.includes(needle));
}

function checkRequirement(name, html, js) {
  const combined = html + "\n" + js;
  const inputCount = count(html, /<(input|select|textarea)\b/gi);

  const checks = {
    h1: /<h1\b/i.test(html),

    startContext: hasAny(combined, [
      "Start here",
      "Area Planner",
      "Area / Zone Planner",
      "Active Area Setup",
      "area setup",
      "zone setup",
      "Define the areas",
      "Define one or more",
      "pipeline starting point",
      "starting point"
    ]),

    optionalContext: hasAny(combined, [
      "optional validation",
      "specialist validation",
      "recognition",
      "license plate",
      "LPR",
      "validate",
      "validation branch",
      "specialty"
    ]),

    pipeline: hasAny(combined, [
      /id=["']pipeline["']/i,
      /class=["'][^"']*pipeline/i,
      "Design Pipeline",
      "Physical Security Design Flow"
    ]),

    flowNote: hasAny(combined, [
      /id=["']flow-note["']/i,
      /class=["'][^"']*flow-note/i,
      "carry-over",
      "carryover",
      "carried",
      "imported",
      "pipeline context",
      "flow note"
    ]),

    kb: hasAny(combined, [
      "Knowledge Base",
      "Open KB Guide",
      "help.js",
      /data-help/i,
      /kb-guide/i
    ]),

    activeArea: hasAny(combined, [
      "physical-security-area-state.js",
      "Active Area",
      "Current Area",
      "area-state",
      "Area 1 of",
      "activeArea"
    ]),

    areaLedger: hasAny(combined, [
      "area ledger",
      "pipeline progress",
      "active area",
      "Area 1 of",
      "area-card",
      "progress",
      "setActiveArea",
      "writeLedger",
      "activeAreaId"
    ]),

    planningInputs:
      inputCount > 0 &&
      hasAny(html, [
        "Planning Inputs",
        "Inputs",
        "Active Area Setup",
        "Area Setup",
        "Zone Setup",
        /<form\b/i,
        /class=["'][^"']*form-grid/i
      ]),

    results: hasAny(combined, [
      /id=["']results["']/i,
      /class=["'][^"']*result/i,
      "result-row",
      "Results"
    ]),

    visualOrAnalyzer: hasAny(combined, [
      "data-sl-renderer",
      "ScopedLabsGraphics.render",
      "gfx.render(",
      "data-export-svg",
      "ScopedLabsAnalyzer",
      "analyzer.js"
    ]),

    exportCard: hasAny(combined, [
      "Documentation & Export",
      "export.js",
      "data-export-section",
      "Export",
      "Snapshot"
    ]),

    continueControl: hasAny(combined, [
      /id=["']continue["']/i,
      /id=["']next-step-row["']/i,
      "Continue"
    ]),

    backContinue:
      /Back to Physical Security/i.test(html) &&
      hasAny(combined, [
        /id=["']continue["']/i,
        /id=["']next-step-row["']/i,
        "Continue"
      ])
  };

  return !!checks[name];
}

function rendererContractOk(rendererKey, psGfx) {
  if (!rendererKey) return true;

  if (rendererKey === "camera-layout-iso" || rendererKey === "scenario-pressure-line") {
    const start = psGfx.indexOf("function brandSharedPhysicalSecuritySvg");
    const chunk = start >= 0 ? psGfx.slice(start, start + 3500) : "";
    return chunk.includes("data-report-visual-owner") &&
      chunk.includes("data-report-renderer") &&
      chunk.includes("data-suppress-legacy-chart-export");
  }

  return psGfx.includes(`data-report-renderer="${rendererKey}"`) &&
    psGfx.includes('data-report-visual-owner="physical-security-graphics"') &&
    psGfx.includes('data-suppress-legacy-chart-export="true"');
}

function rendererReferenced(rendererKey, html, js, psGfx) {
  const combined = html + "\n" + js;
  return combined.includes(rendererKey) || psGfx.includes(rendererKey);
}

function graphicsScriptOrderOk(html, rendererKeys) {
  if (!rendererKeys.length) return true;

  const srcs = scriptSrcs(html);
  const sharedIdx = scriptIndex(srcs, "/assets/scopedlabs-graphics.js");
  const psIdx = scriptIndex(srcs, "/assets/physical-security-graphics.js");
  const localIdx = scriptIndex(srcs, "./script.js");

  return sharedIdx >= 0 && psIdx > sharedIdx && localIdx > psIdx;
}

function shellOptInStatus(html) {
  const srcs = scriptSrcs(html);

  const registryIdx = scriptIndex(srcs, "/assets/physical-security-tool-registry.js");
  const shellIdx = scriptIndex(srcs, "/assets/scopedlabs-tool-shell.js");
  const localIdx = scriptIndex(srcs, "./script.js");

  const registryLoaded = registryIdx >= 0;
  const shellLoaded = shellIdx >= 0;
  const optIn = registryLoaded || shellLoaded;

  return {
    optIn,
    registryLoaded,
    shellLoaded,
    orderOk: !optIn || (registryLoaded && shellLoaded && shellIdx > registryIdx && localIdx > shellIdx)
  };
}

function audit() {
  if (!fs.existsSync(registryPath)) {
    throw new Error("Missing registry: assets/physical-security-tool-registry.js");
  }

  const psGfx = read(psGfxPath);
  if (!psGfx) {
    throw new Error("Missing graphics library: assets/physical-security-graphics.js");
  }

  const rows = [];

  for (const slug of registry.listTools()) {
    const tool = registry.getTool(slug);
    const toolPath = tool.path.replace(/^\//, "");
    const htmlFile = path.join(root, toolPath, "index.html");
    const jsFile = path.join(root, toolPath, "script.js");

    const html = read(htmlFile);
    const js = read(jsFile);

    const requirements = registry.getRequirementsForTool(slug);
    const missingRequired = requirements.filter((name) => !checkRequirement(name, html, js));

    const rendererKeys = Array.from(tool.rendererKeys || []);
    const missingRendererRefs = rendererKeys.filter((key) => !rendererReferenced(key, html, js, psGfx));
    const badRendererContracts = rendererKeys.filter((key) => !rendererContractOk(key, psGfx));

    const pathOk = fs.existsSync(htmlFile) && fs.existsSync(jsFile);
    const roleOk = !!tool.role;
    const kbOk = !!tool.kbKey;
    const graphicsOrderOk = graphicsScriptOrderOk(html, rendererKeys);
    const shell = shellOptInStatus(html);

    const issues = [];
    if (!pathOk) issues.push("missing index/script path");
    if (!roleOk) issues.push("missing role");
    if (!kbOk) issues.push("missing kbKey");
    if (missingRequired.length) issues.push("missing shell: " + missingRequired.join(", "));
    if (missingRendererRefs.length) issues.push("missing renderer refs: " + missingRendererRefs.join(", "));
    if (badRendererContracts.length) issues.push("bad renderer contracts: " + badRendererContracts.join(", "));
    if (!graphicsOrderOk) issues.push("graphics script order issue");
    if (!shell.orderOk) issues.push("tool shell opt-in script order issue");

    rows.push({
      slug,
      role: tool.role,
      title: tool.title,
      previous: tool.previous || "-",
      next: tool.next || "-",
      requirements: `${requirements.length - missingRequired.length}/${requirements.length}`,
      renderers: rendererKeys.join(", ") || "-",
      pathOk: yesNo(pathOk),
      kbKey: tool.kbKey || "-",
      graphicsOrderOk: yesNo(graphicsOrderOk),
      toolShellOptIn: yesNo(shell.optIn),
      shellRegistry: yesNo(shell.registryLoaded),
      shellHelper: yesNo(shell.shellLoaded),
      shellOrderOk: yesNo(shell.orderOk),
      status: issues.length ? "watch" : "ok",
      issues: issues.join("; ") || "-"
    });
  }

  const watch = rows.filter((row) => row.status !== "ok");
  const optIns = rows.filter((row) => row.toolShellOptIn === "yes");

  console.log("\nPhysical Security Registry-Driven Shell Audit\n");
  console.log("Audit version: physical-security-shell-audit-002-shell-opt-in");
  console.log("Registry version:", registry.version);
  console.log("Category:", registry.category);
  console.log("Tools in registry:", registry.listTools().length);
  console.log("Pipeline order:", registry.pipelineOrder.join(" -> "));
  console.log("Optional validations:", registry.optionalValidations.join(", "));
  console.table(rows);

  console.log("\nSummary:");
  console.log(`- Registry tools: ${rows.length}`);
  console.log(`- Pipeline order tools: ${registry.pipelineOrder.length}`);
  console.log(`- Optional validation tools: ${registry.optionalValidations.length}`);
  console.log(`- Clean registry-driven tools: ${rows.length - watch.length}/${rows.length}`);
  console.log(`- Tool Shell opt-in tools: ${optIns.length}/${rows.length}`);
  console.log(`- Watch issues: ${watch.length}`);

  if (optIns.length) {
    console.log("\nTool Shell opt-ins:");
    for (const row of optIns) {
      console.log(`- ${row.slug}: registry=${row.shellRegistry}, helper=${row.shellHelper}, order=${row.shellOrderOk}`);
    }
  }

  if (watch.length) {
    console.log("\nWatch items:");
    for (const row of watch) {
      console.log(`- ${row.slug}: ${row.issues}`);
    }
    process.exitCode = 1;
  }

  console.log("\nAudit complete. No files modified.");
}

audit();
