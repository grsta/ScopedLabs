const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();

const BAD = "ybnzjtuecirajaddft.supabase.co";
const GOOD = "ybnzjtuecirzajraddft.supabase.co";

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const e of entries) {
    const full = path.join(dir, e.name);

    if (e.isDirectory()) {
      walk(full);
      continue;
    }

    if (!e.name.endsWith(".html")) continue;

    let text = fs.readFileSync(full, "utf8");

    if (!text.includes(BAD)) continue;

    text = text.replaceAll(BAD, GOOD);

    fs.writeFileSync(full, text, "utf8");

    console.log("Fixed:", full);
  }
}

walk(ROOT);

console.log("Done.");