const fs = require("fs");
const path = require("path");

const ROOT = "E:/ScopedLabs/tools";

const SUPABASE =
  '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';

const AUTH =
  '<script defer src="/assets/auth.js?v=0317"></script>';

const APP =
  '<script defer src="/assets/app.js?v=0317"></script>';

function walk(dir) {
  let results = [];

  const list = fs.readdirSync(dir);

  list.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat && stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file === "index.html") {
      results.push(filePath);
    }
  });

  return results;
}

const files = walk(ROOT);

files.forEach(file => {
  let html = fs.readFileSync(file, "utf8");

  if (!html.includes('data-protected="true"')) return;

  let changed = false;

  if (!html.includes("@supabase/supabase-js")) {
    html = html.replace("</head>", `${SUPABASE}\n</head>`);
    changed = true;
  }

  if (!html.includes("/assets/auth.js")) {
    html = html.replace("</head>", `${AUTH}\n</head>`);
    changed = true;
  }

  if (!html.includes("/assets/app.js")) {
    html = html.replace("</head>", `${APP}\n</head>`);
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(file, html, "utf8");
    console.log("Fixed:", file);
  }
});

console.log("Done.");