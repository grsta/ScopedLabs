const fs = require("fs");
const path = require("path");

const BASE = "https://scopedlabs.com";
const toolsDir = path.join(process.cwd(), "tools");

async function check(url) {
  try {
    const res = await fetch(url, { redirect: "manual" });

    // If the site redirects to upgrade, it's locked
    if (res.status === 301 || res.status === 302) {
      const loc = res.headers.get("location") || "";
      if (loc.includes("/upgrade")) {
        return "LOCKED";
      }
      return `REDIRECT -> ${loc}`;
    }

    if (res.status === 200) {
      return "OK";
    }

    return `HTTP ${res.status}`;
  } catch (e) {
    return `ERROR`;
  }
}

function collectTools(dir, out = []) {
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const full = path.join(dir, item.name);

    if (item.isDirectory()) {
      collectTools(full, out);
      continue;
    }

    if (item.name.toLowerCase() === "index.html") {
      const rel = path
        .relative(toolsDir, path.dirname(full))
        .replace(/\\/g, "/");

      if (!rel) continue;

      out.push(`${BASE}/tools/${rel}/`);
    }
  }

  return out;
}

async function run() {
  const urls = collectTools(toolsDir);

  console.log(`Checking ${urls.length} tools...\n`);

  let ok = 0;
  let locked = 0;
  let other = 0;

  for (const url of urls) {
    const status = await check(url);

    console.log(status.padEnd(12), url);

    if (status === "OK") ok++;
    else if (status === "LOCKED") locked++;
    else other++;
  }

  console.log("\nDone.");
  console.log(`Total:  ${urls.length}`);
  console.log(`OK:     ${ok}`);
  console.log(`Locked: ${locked}`);
  console.log(`Other:  ${other}`);
}

run();