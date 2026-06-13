#!/usr/bin/env node

/*
  ScopedLabs Access Control Cache-Bust Map - 0610

  Verifies Access Control pages load current shared asset versions from:
  - assets/scopedlabs-tool-shell.js
  - assets/access-control-planning-visuals.js
  - assets/access-control-tool-polish.js

  Scope Planner is a special path and does not require access-control-tool-polish.js.
*/

const fs = require("fs");
const path = require("path");

const root = process.cwd();
const categoryRoot = path.join(root, "tools", "access-control");
const SUMMARY_ONLY = process.argv.includes("--summary-only");

const SPECIAL_PATH_TOOLS = new Set(["scope-planner"]);

const sharedAssets = [
  {
    asset: "scopedlabs-tool-shell.js",
    requiredFor: "all",
    assetPath: path.join(root, "assets", "scopedlabs-tool-shell.js"),
  },
  {
    asset: "access-control-planning-visuals.js",
    requiredFor: "all",
    assetPath: path.join(root, "assets", "access-control-planning-visuals.js"),
  },
  {
    asset: "access-control-tool-polish.js",
    requiredFor: "standard",
    assetPath: path.join(root, "assets", "access-control-tool-polish.js"),
  },
];

function exists(filePath) {
  return fs.existsSync(filePath);
}

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractVersion(assetPath) {
  const text = read(assetPath);
  const match = text.match(/const\s+VERSION\s*=\s*["']([^"']+)["']/);
  return match ? match[1] : "";
}

function listTools() {
  if (!exists(categoryRoot)) {
    console.error("FAIL missing tools/access-control");
    process.exit(1);
  }

  return fs.readdirSync(categoryRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((slug) => exists(path.join(categoryRoot, slug, "index.html"))) .filter((slug) => slug !== "summary")
    .sort((a, b) => a.localeCompare(b));
}

function escapeRegExp(value) {
  return String(value).replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
}

function findAssetRefs(html, asset) {
  const escaped = escapeRegExp(asset);
  const regex = new RegExp("<script[^>]+src=[\"']([^\"']*" + escaped + "[^\"']*)[\"'][^>]*>", "gi");
  const refs = [];
  let match;

  while ((match = regex.exec(html))) {
    refs.push(match[1]);
  }

  return refs;
}

function versionFromRef(ref) {
  const match = String(ref || "").match(/[?&]v=([^&#"']+)/);
  return match ? match[1] : "";
}

function isRequiredForTool(asset, slug) {
  if (asset.requiredFor === "all") return true;
  if (asset.requiredFor === "standard") return !SPECIAL_PATH_TOOLS.has(slug);
  return false;
}

function main() {
  const versions = sharedAssets.map((asset) => {
    const version = extractVersion(asset.assetPath);

    return {
      ...asset,
      version,
      assetStatus: version ? "SAFE" : "FAIL",
      assetMessage: version || "missing VERSION constant",
    };
  });

  const tools = listTools();
  const results = [];

  for (const slug of tools) {
    const htmlPath = path.join(categoryRoot, slug, "index.html");
    const html = read(htmlPath);
    const issues = [];
    const notes = [];

    for (const asset of versions) {
      const refs = findAssetRefs(html, asset.asset);
      const required = isRequiredForTool(asset, slug);

      if (!asset.version) {
        issues.push(asset.asset + " cannot be checked because shared asset VERSION is missing");
        continue;
      }

      if (!refs.length) {
        if (required) {
          issues.push("missing required " + asset.asset);
        } else {
          notes.push("optional " + asset.asset + " not loaded");
        }
        continue;
      }

      for (const ref of refs) {
        const loadedVersion = versionFromRef(ref);

        if (!loadedVersion) {
          issues.push(asset.asset + " missing ?v= cache-bust");
          continue;
        }

        if (loadedVersion !== asset.version) {
          issues.push(asset.asset + " cache-bust mismatch: " + loadedVersion + " -> " + asset.version);
        }
      }
    }

    results.push({
      slug,
      status: issues.length ? "FAIL" : SPECIAL_PATH_TOOLS.has(slug) ? "SKIP" : "SAFE",
      issues,
      notes,
    });
  }

  const safeCount = results.filter((result) => result.status === "SAFE").length;
  const skipCount = results.filter((result) => result.status === "SKIP").length;
  const failCount = results.filter((result) => result.status === "FAIL").length;

  console.log("Access Control cache-bust map audit - 0610");
  console.log("Repo:", root);
  console.log("Tools found:", tools.length);
  console.log("");

  console.log("Shared asset versions");
  for (const asset of versions) {
    console.log(asset.assetStatus.padEnd(5) + " " + asset.asset + " — " + asset.assetMessage);
  }

  console.log("");

  if (!SUMMARY_ONLY) {
    console.log("Tool map");

    for (const result of results) {
      console.log(result.status.padEnd(5) + " " + result.slug + " — cache-bust alignment");

      for (const issue of result.issues) {
        console.log("      FAIL " + issue);
      }

      for (const note of result.notes) {
        console.log("      note " + note);
      }
    }

    console.log("");
  }

  console.log("Summary: " + safeCount + " SAFE / " + skipCount + " SKIP / " + failCount + " FAIL");

  if (failCount) {
    process.exit(1);
  }
}

main();
