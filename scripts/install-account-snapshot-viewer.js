const fs = require("fs");

const accountHtmlPath = "account/index.html";
const accountJsPath = "assets/account.js";

if (!fs.existsSync(accountHtmlPath)) throw new Error("Missing account/index.html");
if (!fs.existsSync(accountJsPath)) throw new Error("Missing assets/account.js");

let html = fs.readFileSync(accountHtmlPath, "utf8");
let js = fs.readFileSync(accountJsPath, "utf8");

const styleBlock = `
  <style data-scopedlabs-account-snapshots>
    .sl-snapshots-list {
      display: grid;
      gap: 12px;
      margin-top: 1rem;
    }

    .sl-snapshot-row {
      border: 1px solid rgba(112, 255, 145, 0.18);
      border-radius: 18px;
      padding: 14px;
      background: rgba(0, 0, 0, 0.14);
      display: grid;
      gap: 10px;
    }

    .sl-snapshot-row-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }

    .sl-snapshot-title {
      font-weight: 800;
      color: #fff;
    }

    .sl-snapshot-meta {
      color: rgba(255, 255, 255, 0.66);
      font-size: 0.92rem;
      line-height: 1.45;
    }

    .sl-snapshot-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .sl-snapshot-detail {
      margin-top: 1rem;
      background: rgba(0, 0, 0, 0.16);
    }

    .sl-snapshot-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 0.95rem;
    }

    .sl-snapshot-table td,
    .sl-snapshot-table th {
      border-bottom: 1px solid rgba(112, 255, 145, 0.14);
      padding: 9px 8px;
      text-align: left;
      vertical-align: top;
    }

    .sl-snapshot-table td:last-child {
      color: #fff;
      font-weight: 700;
    }

    .sl-snapshot-grid {
      display: grid;
      gap: 16px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .sl-snapshot-chart {
      margin-top: 12px;
      border: 1px solid rgba(112, 255, 145, 0.16);
      border-radius: 16px;
      padding: 12px;
      background: rgba(0, 0, 0, 0.2);
      text-align: center;
    }

    .sl-snapshot-chart img {
      max-width: 100%;
      height: auto;
      display: inline-block;
    }

    @media (max-width: 860px) {
      .sl-snapshot-grid {
        grid-template-columns: 1fr;
      }
    }
  </style>
`;

const snapshotSection = `
    <section id="sl-snapshots-card" class="card tool-card" style="margin-top:1rem; display:none;">
      <span class="pill">Saved Snapshots</span>
      <h2 style="margin-top:.6rem;">Saved tool reports</h2>
      <p class="muted">
        Account-backed snapshots saved from ScopedLabs export cards. Use these to revisit prior calculations, report context, and documented outputs.
      </p>

      <div class="actions" style="margin-top:.85rem;">
        <button id="sl-refresh-snapshots" class="btn" type="button">Refresh snapshots</button>
      </div>

      <div id="sl-snapshots-status" class="muted" style="font-size:.9rem; margin-top:.85rem;"></div>
      <div id="sl-snapshots-list" class="sl-snapshots-list"></div>
      <div id="sl-snapshot-detail" class="card sl-snapshot-detail" style="display:none;"></div>
    </section>
`;

if (!html.includes("data-scopedlabs-account-snapshots")) {
  html = html.replace("</head>", styleBlock + "\n</head>");
}

if (!html.includes('id="sl-snapshots-card"')) {
  html = html.replace("</main>", snapshotSection + "\n  </main>");
}

html = html.replace(/style\.css\?v=acct-\d+/g, "style.css?v=acct-501");
html = html.replace(/account\.js\?v=acct-\d+/g, "account.js?v=acct-501");

if (!js.includes("snapshotsCard: document.getElementById")) {
  js = js.replace(
    `    status: document.getElementById("sl-status"),
  };`,
    `    status: document.getElementById("sl-status"),
    snapshotsCard: document.getElementById("sl-snapshots-card"),
    snapshotsStatus: document.getElementById("sl-snapshots-status"),
    snapshotsList: document.getElementById("sl-snapshots-list"),
    snapshotDetail: document.getElementById("sl-snapshot-detail"),
    refreshSnapshots: document.getElementById("sl-refresh-snapshots"),
  };`
  );
}

if (!js.includes("let currentSession = null;")) {
  js = js.replace(
    `  const ready = () =>
    window.SL_AUTH && window.SL_AUTH.ready ? window.SL_AUTH.ready : Promise.resolve();`,
    `  const ready = () =>
    window.SL_AUTH && window.SL_AUTH.ready ? window.SL_AUTH.ready : Promise.resolve();

  let currentSession = null;
  let snapshotsCache = [];`
  );
}

const snapshotHelpers = `
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function prettySlug(slug) {
    return String(slug || "")
      .replace(/[-_]+/g, " ")
      .replace(/\\s+/g, " ")
      .trim()
      .replace(/\\b\\w/g, function (c) {
        return c.toUpperCase();
      });
  }

  function formatDateTime(value) {
    if (!value) return "";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return String(value || "");
    }
  }

  function snapshotStatusText(msg) {
    if (els.snapshotsStatus) els.snapshotsStatus.textContent = msg || "";
  }

  function getToken(session) {
    return session && session.access_token ? session.access_token : "";
  }

  async function snapshotFetch(session, path, options) {
    const token = getToken(session);
    if (!token) throw new Error("missing_token");

    const opts = options || {};
    const headers = Object.assign(
      {
        Authorization: "Bearer " + token,
        Accept: "application/json"
      },
      opts.headers || {}
    );

    const res = await fetch(path, Object.assign({}, opts, { headers: headers }));
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || "bad_status_" + res.status);
    }

    return data;
  }

  function renderSnapshotList(rows) {
    if (!els.snapshotsList) return;

    const list = Array.isArray(rows) ? rows : [];
    snapshotsCache = list;

    if (!list.length) {
      els.snapshotsList.innerHTML =
        '<div class="muted">No saved snapshots yet. Run a tool, click Save Snapshot, and it will appear here.</div>';
      return;
    }

    els.snapshotsList.innerHTML = list
      .map(function (item) {
        const id = escapeHtml(item.id || "");
        const title = escapeHtml(item.report_title || item.tool_label || "Saved Snapshot");
        const category = escapeHtml(item.category_label || prettySlug(item.category_slug));
        const tool = escapeHtml(item.tool_label || prettySlug(item.tool_slug));
        const project = item.project_name ? "Project: " + escapeHtml(item.project_name) + " · " : "";
        const client = item.client_name ? "Client: " + escapeHtml(item.client_name) + " · " : "";
        const status = escapeHtml(String(item.status || "").toUpperCase());
        const created = escapeHtml(formatDateTime(item.created_at));

        return (
          '<article class="sl-snapshot-row" data-snapshot-id="' + id + '">' +
            '<div class="sl-snapshot-row-head">' +
              '<div>' +
                '<div class="sl-snapshot-title">' + title + '</div>' +
                '<div class="sl-snapshot-meta">' +
                  category + " · " + tool + '<br>' +
                  project + client + created +
                '</div>' +
              '</div>' +
              (status ? '<span class="pill">' + status + '</span>' : '') +
            '</div>' +
            '<div class="sl-snapshot-actions">' +
              '<button class="btn btn-primary" type="button" data-snapshot-view="' + id + '">View Snapshot</button>' +
              '<button class="btn" type="button" data-snapshot-delete="' + id + '">Delete</button>' +
            '</div>' +
          '</article>'
        );
      })
      .join("");
  }

  async function fetchSnapshots(session) {
    if (!els.snapshotsCard) return;

    show(els.snapshotsCard, true);
    snapshotStatusText("Loading snapshots…");

    try {
      const data = await snapshotFetch(session, "/api/snapshots/list?limit=50", {
        method: "GET"
      });

      const rows = Array.isArray(data.snapshots) ? data.snapshots : [];
      renderSnapshotList(rows);
      snapshotStatusText(rows.length ? "" : "No saved snapshots yet.");
    } catch (e) {
      console.warn("[account.js] snapshot list failed:", e);
      renderSnapshotList([]);
      snapshotStatusText("Unable to load saved snapshots right now.");
    }
  }

  function tableRows(items) {
    const rows = Array.isArray(items) ? items : [];

    if (!rows.length) {
      return '<tr><td colspan="2" class="muted">No rows stored.</td></tr>';
    }

    return rows
      .map(function (item) {
        return (
          '<tr>' +
            '<td>' + escapeHtml(item.label || "") + '</td>' +
            '<td>' + escapeHtml(item.value || "") + '</td>' +
          '</tr>'
        );
      })
      .join("");
  }

  function renderSnapshotDetail(snapshot) {
    if (!els.snapshotDetail) return;

    const payload = snapshot?.payload_json || {};
    const title =
      snapshot.report_title ||
      payload.meta?.reportTitle ||
      payload.tool ||
      snapshot.tool_label ||
      "Saved Snapshot";

    const status = String(snapshot.status || payload.status || "").toUpperCase();
    const summary = snapshot.summary || payload.summary || "";
    const category = snapshot.category_label || payload.category || prettySlug(snapshot.category_slug);
    const tool = snapshot.tool_label || payload.tool || prettySlug(snapshot.tool_slug);
    const created = snapshot.created_at || payload.generatedAt || "";
    const project = snapshot.project_name || payload.meta?.projectName || "";
    const client = snapshot.client_name || payload.meta?.clientName || "";
    const preparedBy = snapshot.prepared_by || payload.meta?.preparedBy || "";
    const notes = payload.meta?.customNotes || "";

    const analysisSections = Array.isArray(payload.analysisSections)
      ? payload.analysisSections
      : [];

    const analysisHtml = analysisSections.length
      ? analysisSections
          .map(function (section) {
            return (
              '<div class="card" style="background:rgba(0,0,0,.12); margin-top:10px;">' +
                '<h4 style="margin-top:0;">' + escapeHtml(section.title || "Analysis") + '</h4>' +
                '<p class="muted" style="margin-bottom:0;">' + escapeHtml(section.body || "") + '</p>' +
              '</div>'
            );
          })
          .join("")
      : "";

    const interpretationHtml = payload.interpretation
      ? (
        '<div class="card" style="background:rgba(0,0,0,.12); margin-top:10px;">' +
          '<h4 style="margin-top:0;">Engineering Interpretation</h4>' +
          '<p class="muted" style="margin-bottom:0;">' + escapeHtml(payload.interpretation) + '</p>' +
        '</div>'
      )
      : "";

    const chartHtml = payload.chartImage
      ? (
        '<div class="sl-snapshot-chart">' +
          '<img src="' + escapeHtml(payload.chartImage) + '" alt="' + escapeHtml(tool) + ' chart snapshot">' +
        '</div>'
      )
      : "";

    const notesHtml = notes
      ? (
        '<div class="card" style="background:rgba(0,0,0,.12); margin-top:10px;">' +
          '<h4 style="margin-top:0;">Custom Notes</h4>' +
          '<p class="muted" style="margin-bottom:0;">' + escapeHtml(notes) + '</p>' +
        '</div>'
      )
      : "";

    els.snapshotDetail.style.display = "";
    els.snapshotDetail.innerHTML =
      '<div class="sl-snapshot-row-head">' +
        '<div>' +
          '<span class="pill">Snapshot Detail</span>' +
          '<h3 style="margin:.65rem 0 .25rem;">' + escapeHtml(title) + '</h3>' +
          '<p class="muted" style="margin:0;">' +
            escapeHtml(category) + " · " + escapeHtml(tool) + '<br>' +
            (project ? "Project: " + escapeHtml(project) + " · " : "") +
            (client ? "Client: " + escapeHtml(client) + " · " : "") +
            (preparedBy ? "Prepared by: " + escapeHtml(preparedBy) + " · " : "") +
            escapeHtml(formatDateTime(created)) +
          '</p>' +
        '</div>' +
        (status ? '<span class="pill">' + escapeHtml(status) + '</span>' : '') +
      '</div>' +

      (summary
        ? '<div class="card" style="background:rgba(0,0,0,.12); margin-top:14px;"><strong>Summary</strong><p class="muted" style="margin-bottom:0;">' + escapeHtml(summary) + '</p></div>'
        : '') +

      '<div class="sl-snapshot-grid" style="margin-top:14px;">' +
        '<div>' +
          '<h4>Inputs</h4>' +
          '<table class="sl-snapshot-table"><tbody>' + tableRows(payload.inputs) + '</tbody></table>' +
        '</div>' +
        '<div>' +
          '<h4>Calculated Outputs</h4>' +
          '<table class="sl-snapshot-table"><tbody>' + tableRows(payload.outputs) + '</tbody></table>' +
        '</div>' +
      '</div>' +

      interpretationHtml +
      analysisHtml +
      chartHtml +
      notesHtml +

      '<div class="actions" style="margin-top:14px;">' +
        '<button class="btn" type="button" data-snapshot-close>Close</button>' +
        '<button class="btn" type="button" data-snapshot-delete="' + escapeHtml(snapshot.id || "") + '">Delete Snapshot</button>' +
      '</div>';
  }

  async function viewSnapshot(id) {
    if (!id || !currentSession) return;

    snapshotStatusText("Loading snapshot…");

    try {
      const data = await snapshotFetch(currentSession, "/api/snapshots/" + encodeURIComponent(id), {
        method: "GET"
      });

      renderSnapshotDetail(data.snapshot);
      snapshotStatusText("");
      if (els.snapshotDetail) els.snapshotDetail.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e) {
      console.warn("[account.js] snapshot detail failed:", e);
      snapshotStatusText("Unable to load that snapshot.");
    }
  }

  async function deleteSnapshot(id) {
    if (!id || !currentSession) return;
    if (!confirm("Delete this saved snapshot?")) return;

    snapshotStatusText("Deleting snapshot…");

    try {
      await snapshotFetch(currentSession, "/api/snapshots/" + encodeURIComponent(id), {
        method: "DELETE"
      });

      if (els.snapshotDetail) {
        els.snapshotDetail.style.display = "none";
        els.snapshotDetail.innerHTML = "";
      }

      await fetchSnapshots(currentSession);
      snapshotStatusText("Snapshot deleted.");
    } catch (e) {
      console.warn("[account.js] snapshot delete failed:", e);
      snapshotStatusText("Unable to delete snapshot.");
    }
  }

`;

if (!js.includes("function fetchSnapshots(session)")) {
  js = js.replace("  function renderEntitlementsList(cats) {", snapshotHelpers + "\n  function renderEntitlementsList(cats) {");
}

js = js.replace(
  `  function setSignedOutUI() {
    setText(els.whoami, "Not signed in");
    show(els.loginCard, true);
    show(els.checkoutCard, false);
    show(els.signout, false);
    setStatus("");
  }`,
  `  function setSignedOutUI() {
    currentSession = null;
    setText(els.whoami, "Not signed in");
    show(els.loginCard, true);
    show(els.checkoutCard, false);
    show(els.signout, false);
    show(els.snapshotsCard, false);
    if (els.snapshotsList) els.snapshotsList.innerHTML = "";
    if (els.snapshotDetail) {
      els.snapshotDetail.style.display = "none";
      els.snapshotDetail.innerHTML = "";
    }
    snapshotStatusText("");
    setStatus("");
  }`
);

js = js.replace(
  `  function setSignedInUI(email) {
    setText(els.whoami, email ? \`Signed in as \${email}\` : "Signed in");
    show(els.loginCard, false);
    show(els.checkoutCard, true);
    show(els.signout, true);
  }`,
  `  function setSignedInUI(email) {
    setText(els.whoami, email ? \`Signed in as \${email}\` : "Signed in");
    show(els.loginCard, false);
    show(els.checkoutCard, true);
    show(els.signout, true);
    show(els.snapshotsCard, true);
  }`
);

js = js.replace(
  `      setSignedInUI(session.user?.email || "");
      await fetchEntitlements(session);`,
  `      currentSession = session;
      setSignedInUI(session.user?.email || "");
      await fetchEntitlements(session);
      await fetchSnapshots(session);`
);

js = js.replace(
  `          setSignedInUI(session.user?.email || "");
          await fetchEntitlements(session);`,
  `          currentSession = session;
          setSignedInUI(session.user?.email || "");
          await fetchEntitlements(session);
          await fetchSnapshots(session);`
);

if (!js.includes("data-snapshot-view")) {
  js = js.replace(
    `    // Keep UI in sync with auth changes`,
    `    if (els.refreshSnapshots) {
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

    // Keep UI in sync with auth changes`
  );
}

fs.writeFileSync(accountHtmlPath, html, "utf8");
fs.writeFileSync(accountJsPath, js, "utf8");

console.log("Installed account snapshot viewer.");