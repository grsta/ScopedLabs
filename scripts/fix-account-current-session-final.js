const fs = require("fs");

const htmlPath = "account/index.html";
const jsPath = "assets/account.js";

let html = fs.readFileSync(htmlPath, "utf8");
let js = fs.readFileSync(jsPath, "utf8");

// Add currentSession once near the top of the IIFE if missing.
if (!/\blet\s+currentSession\s*=/.test(js)) {
  js = js.replace(
    `  const sb = () => (window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null);`,
    `  let currentSession = null;
  let snapshotsCache = [];

  const sb = () => (window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null);`
  );
}

// Store session after every account-page getSession read.
js = js.replace(
  /const session = data\?\.session \|\| null;\s*\n/g,
  `const session = data?.session || null;
      currentSession = session;
`
);

// Store session inside auth change callback if missing.
js = js.replace(
  /client\.auth\.onAuthStateChange\(async \(_evt, session\) => \{\s*\n/g,
  `client.auth.onAuthStateChange(async (_evt, session) => {
          currentSession = session || null;
`
);

// Clear session on signed-out UI.
js = js.replace(
  /function setSignedOutUI\(\) \{\s*\n/g,
  `function setSignedOutUI() {
    currentSession = null;
`
);

// Bump account cache.
html = html
  .replace(/account\.js\?v=acct-\d+/g, "account.js?v=acct-504")
  .replace(/style\.css\?v=acct-\d+/g, "style.css?v=acct-504");

fs.writeFileSync(htmlPath, html, "utf8");
fs.writeFileSync(jsPath, js, "utf8");

console.log("Fixed account currentSession reference and bumped cache to acct-504.");