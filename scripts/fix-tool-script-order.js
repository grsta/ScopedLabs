const fs = require("fs");
const path = require("path");

const ROOT = "E:/ScopedLabs/tools";

const SUPABASE_URL = "https://ybnzjtuecirajaddft.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";

const SUPABASE_CDN =
  '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';

const CONFIG_BLOCK = `<script>
window.SL_SUPABASE_URL = "${SUPABASE_URL}";
window.SL_SUPABASE_ANON_KEY = "${SUPABASE_ANON_KEY}";
</script>`;

const AUTH_TAG = '<script defer src="/assets/auth.js?v=0317"></script>';
const APP_TAG = '<script defer src="/assets/app.js?v=0317"></script>';

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

function removeAllMatches(html, regex) {
  return html.replace(regex, "");
}

const files = walk(ROOT);
let updated = 0;

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");

  // Only protected tool pages
  if (!html.includes('data-protected="true"')) continue;

  const original = html;

  // Remove old shared includes anywhere in doc
  html = removeAllMatches(
    html,
    /[ \t]*<script\s+src="https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@2"><\/script>\s*/gi
  );

  html = removeAllMatches(
    html,
    /[ \t]*<script>\s*window\.SL_SUPABASE_URL[\s\S]*?window\.SL_SUPABASE_ANON_KEY[\s\S]*?<\/script>\s*/gi
  );

  html = removeAllMatches(
    html,
    /[ \t]*<script\s+defer\s+src="\/assets\/auth\.js(?:\?v=[^"]*)?"><\/script>\s*/gi
  );

  html = removeAllMatches(
    html,
    /[ \t]*<script\s+(?:defer\s+)?src="\/assets\/app\.js(?:\?v=[^"]*)?"><\/script>\s*/gi
  );

  // Reinsert the correct block before </head>
  const sharedBlock =
`${SUPABASE_CDN}
${CONFIG_BLOCK}
${AUTH_TAG}
${APP_TAG}
`;

  if (/<\/head>/i.test(html)) {
    html = html.replace(/<\/head>/i, `${sharedBlock}</head>`);
  } else {
    console.log(`SKIP no </head>: ${file}`);
    continue;
  }

  if (html !== original) {
    fs.writeFileSync(file, html, "utf8");
    updated++;
    console.log(`FIXED: ${file}`);
  }
}

console.log(`Done. Updated ${updated} protected tool pages.`);