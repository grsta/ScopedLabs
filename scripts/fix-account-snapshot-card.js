const fs = require("fs");

const htmlPath = "account/index.html";
const jsPath = "assets/account.js";

let html = fs.readFileSync(htmlPath, "utf8");
let js = fs.readFileSync(jsPath, "utf8");

// Make the snapshot card visible by default.
// account.js will still hide it for signed-out users.
html = html.replace(
  /(<section\s+id=["']sl-snapshots-card["'][^>]*style=["'])([^"']*)(["'])/i,
  (m, open, style, close) => {
    const cleaned = style
      .replace(/display\s*:\s*none\s*;?/gi, "")
      .replace(/\s*;\s*/g, "; ")
      .replace(/;\s*$/g, ";")
      .trim();

    return open + (cleaned || "margin-top:1rem;") + close;
  }
);

// Ensure signed-in UI shows snapshots.
if (!js.includes("show(els.snapshotsCard, true);")) {
  js = js.replace(
    `show(els.signout, true);
  }`,
    `show(els.signout, true);
    show(els.snapshotsCard, true);
  }`
  );
}

// Ensure signed-out UI hides snapshots.
if (!js.includes("show(els.snapshotsCard, false);")) {
  js = js.replace(
    `show(els.signout, false);
    setStatus("");`,
    `show(els.signout, false);
    show(els.snapshotsCard, false);
    setStatus("");`
  );
}

// Ensure refresh loads snapshots after entitlements.
js = js.replace(
  /await fetchEntitlements\(session\);\s*(?!await fetchSnapshots\(session\);)/g,
  `await fetchEntitlements(session);
      await fetchSnapshots(session);`
);

// Add snapshot button handlers if they were missed.
if (!js.includes("__SL_SNAPSHOT_ACCOUNT_EVENTS_BOUND")) {
  js = js.replace(
    `    // Keep UI in sync with auth changes`,
    `    if (!window.__SL_SNAPSHOT_ACCOUNT_EVENTS_BOUND) {
      window.__SL_SNAPSHOT_ACCOUNT_EVENTS_BOUND = true;

      if (els.refreshSnapshots) {
        els.refreshSnapshots.addEventListener("click", async () => {
          if (!currentSession) {
            snapshotStatusText("Sign in to view saved snapshots.");
            return;
          }

          await fetchSnapshots(currentSession);
        });
      }

      document.addEventListener("click", (event) => {
        const target = event.target instanceof Element ? event.target : null;
        if (!target) return;

        const viewBtn = target.closest("[data-snapshot-view]");
        if (viewBtn) {
          event.preventDefault();
          viewSnapshot(viewBtn.getAttribute("data-snapshot-view"));
          return;
        }

        const deleteBtn = target.closest("[data-snapshot-delete]");
        if (deleteBtn) {
          event.preventDefault();
          deleteSnapshot(deleteBtn.getAttribute("data-snapshot-delete"));
          return;
        }

        const closeBtn = target.closest("[data-snapshot-close]");
        if (closeBtn) {
          event.preventDefault();
          if (els.snapshotDetail) {
            els.snapshotDetail.style.display = "none";
            els.snapshotDetail.innerHTML = "";
          }
        }
      });
    }

    // Keep UI in sync with auth changes`
  );
}

fs.writeFileSync(htmlPath, html, "utf8");
fs.writeFileSync(jsPath, js, "utf8");

console.log("Fixed account snapshot card visibility and handlers.");