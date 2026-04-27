const fs = require("fs");

const file = "account/index.html";
let html = fs.readFileSync(file, "utf8");

html = html
  .replace(/account\.js\?v=acct-\d+/g, "account.js?v=acct-502")
  .replace(/style\.css\?v=acct-\d+/g, "style.css?v=acct-502");

fs.writeFileSync(file, html, "utf8");

console.log("Bumped account page cache to acct-502.");