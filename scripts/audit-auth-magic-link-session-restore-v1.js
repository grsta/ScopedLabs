const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const VERSION = "auth-magic-link-session-restore-audit-001";
const CACHE = "auth-magiclink-session-restore-0527";

const rows = [];

function add(id, status, detail) {
  rows.push({ id, status, detail });
}

function read(rel) {
  const file = path.join(ROOT, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

function walkHtml(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if ([".git", "node_modules"].includes(entry.name)) continue;
      walkHtml(full, out);
    } else if (entry.isFile() && entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

const auth = read("assets/auth.js");
const account = read("account/index.html");
const htmlFiles = walkHtml(ROOT);
const authRefs = htmlFiles
  .map((file) => ({ file, text: fs.readFileSync(file, "utf8") }))
  .filter((item) => item.text.includes("/assets/auth.js"));

console.log("");
console.log("Auth Magic Link Session Restore Audit");
console.log("");
console.log("Audit version:", VERSION);

add("auth-helper-present", auth.includes("function restoreSessionFromAuthUrl()") && auth.includes("function hasAuthReturnUrl()") ? "SAFE" : "FAIL", "auth.js has explicit auth URL restore helpers");
add("pkce-exchange-present", auth.includes("exchangeCodeForSession(code)") ? "SAFE" : "FAIL", "auth.js handles ?code= PKCE magic-link returns");
add("implicit-wait-present", auth.includes("attempt < 6") && auth.includes("sb.auth.getSession()") ? "SAFE" : "FAIL", "auth.js waits for implicit hash session restore");
add("cleanup-session-gated", auth.includes("if (!data || !data.session)") && auth.includes("authQueryKeys") ? "SAFE" : "FAIL", "auth URL cleanup is gated on a valid session");
add("init-calls-restore-first", auth.includes("await restoreSessionFromAuthUrl();\n      await refreshUi();") ? "SAFE" : "FAIL", "auth init restores session before refreshing UI");
add("account-loads-auth", account.includes("/assets/auth.js") ? "SAFE" : "FAIL", "account page loads auth.js");
add("auth-cache-bumped", authRefs.every((item) => item.text.includes("/assets/auth.js?v=" + CACHE)) ? "SAFE" : "FAIL", "all auth.js HTML refs use the new cache bust");
add("no-runtime-fetch-added", auth.includes("fetch(") ? "WATCH" : "SAFE", "auth.js fetch scan");

console.table(rows);

const summary = rows.reduce((acc, row) => {
  acc[row.status] = (acc[row.status] || 0) + 1;
  return acc;
}, {});

console.log("");
console.log("Summary:");
console.log("- Checks:", rows.length);
console.log("- SAFE:", summary.SAFE || 0);
console.log("- WATCH:", summary.WATCH || 0);
console.log("- FAIL:", summary.FAIL || 0);

if (summary.FAIL) {
  console.log("");
  console.log("Audit complete with FAIL items.");
  process.exitCode = 1;
} else {
  console.log("");
  console.log("Audit complete. No files modified.");
}
