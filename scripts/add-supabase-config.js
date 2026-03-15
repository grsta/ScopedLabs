const fs = require("fs");
const path = require("path");

const ROOT = "E:/ScopedLabs/tools";

const CONFIG_BLOCK = `<script>
window.SL_SUPABASE_URL = "https://ybnzjtuecirajaddft.supabase.co";
window.SL_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";
</script>`;

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      results = results.concat(walk(filePath));
    } else if (file.toLowerCase() === "index.html") {
      results.push(filePath);
    }
  }

  return results;
}

const files = walk(ROOT);

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");

  if (!html.includes('data-protected="true"')) continue;
  if (html.includes("window.SL_SUPABASE_URL")) continue;

  if (html.includes('<script defer src="/assets/auth.js')) {
    html = html.replace(
      /<script defer src="\/assets\/auth\.js[^"]*"><\/script>/i,
      `${CONFIG_BLOCK}\n$&`
    );

    fs.writeFileSync(file, html, "utf8");
    console.log("Added config:", file);
  } else {
    console.log("Skipped (no auth.js found):", file);
  }
}

console.log("Done.");