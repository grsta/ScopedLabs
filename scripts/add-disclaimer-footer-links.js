const fs = require("fs");
const path = require("path");

const root = process.cwd();

const footerLinks = `    <div class="footer-links">
      <a href="/tools/">Tools</a>
      <a href="/upgrade/">Upgrade</a>
      <a href="/about/">About</a>
      <a href="/contact/">Contact</a>
      <a href="/disclaimer/">Disclaimer</a>
    </div>`;

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === ".git" || entry.name === "node_modules") continue;
      walk(full, files);
    } else if (entry.isFile() && entry.name.toLowerCase() === "index.html") {
      files.push(full);
    }
  }

  return files;
}

const changed = [];

for (const file of walk(root)) {
  let html = fs.readFileSync(file, "utf8");
  const before = html;

  html = html.replace(
    /<span data-year><\/span>© ScopedLabs/g,
    "© <span data-year></span> ScopedLabs"
  );

  html = html.replace(
    /<footer class="site-footer">[\s\S]*?<\/footer>/g,
    (footer) => {
      if (footer.includes("footer-links")) {
        return footer.replace(
          /<div class="footer-links">[\s\S]*?<\/div>/,
          footerLinks
        );
      }

      return footer.replace(
        /<\/footer>/,
        `${footerLinks}\n</footer>`
      );
    }
  );

  if (html !== before) {
    fs.writeFileSync(file, html, "utf8");
    changed.push(file.replace(root + path.sep, "").replace(/\\/g, "/"));
  }
}

console.log("Footer links updated.");
console.table(changed.map(file => ({ file })));
