const fs = require("fs");

const htmlPath = "account/index.html";
const jsPath = "assets/account.js";

let html = fs.readFileSync(htmlPath, "utf8");
let js = fs.readFileSync(jsPath, "utf8");

// Add missing shared session variable near the top of account.js.
if (!/\blet\s+currentSession\s*=/.test(js)) {
  js = js.replace(
    `  function setStatus(msg) {`,
    `  let currentSession = null;
  let snapshotsCache = [];

  function setStatus(msg) {`
  );
}

// Whenever getSession() reads a session, store it for snapshot view/delete handlers.
js = js.replace(
  /const session = data\?\.session \|\| null;\n(?!\s*currentSession = session;)/g,
  `const session = data?.session || null;
      currentSession = session;
`
);

// In auth state changes, keep currentSession updated.
js = js.replace(
  /client\.auth\.onAuthStateChange\(async \(_evt, session\) => \{\n(?!\s*currentSession = session \|\| null;)/g,
  `client.auth.onAuthStateChange(async (_evt, session) => {
          currentSession = session || null;
`
);

// Signed-out state should clear session.
if (!js.includes("currentSession = null;")) {
  js = js.replace(
    `  function setSignedOutUI() {`,
    `  function setSignedOutUI() {
    currentSession = null;`
  );
}

// Bump account cache hard.
html = html
  .replace(/account\.js\?v=acct-\d+/g, "account.js?v=acct-503")
  .replace(/style\.css\?v=acct-\d+/g, "style.css?v=acct-503");

fs.writeFileSync(htmlPath, html, "utf8");
fs.writeFileSync(jsPath, js, "utf8");

console.log("Fixed account currentSession and bumped cache to acct-503.");