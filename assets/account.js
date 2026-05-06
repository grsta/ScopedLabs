/* /assets/account.js
   ScopedLabs Account page controller.

   Works with /account/index.html IDs:
   - #sl-whoami
   - #sl-login-card
   - #sl-checkout-card
   - #sl-email
   - #sl-sendlink
   - #sl-email-hint
   - #sl-entitlements
   - #sl-signout
   - #sl-status

   Requires /assets/auth.js to load first and expose:
   window.SL_AUTH = { sb, ready }
*/

(() => {
  "use strict";

  const els = {
    whoami: document.getElementById("sl-whoami"),
    loginCard: document.getElementById("sl-login-card"),
    checkoutCard: document.getElementById("sl-checkout-card"),
    email: document.getElementById("sl-email"),
    sendLink: document.getElementById("sl-sendlink"),
    emailHint: document.getElementById("sl-email-hint"),
    entitlements: document.getElementById("sl-entitlements"),
    signout: document.getElementById("sl-signout"),
    status: document.getElementById("sl-status"),
    snapshotsCard: document.getElementById("sl-snapshots-card"),
    refreshSnapshots: document.getElementById("sl-refresh-snapshots"),
    snapshotsStatus: document.getElementById("sl-snapshots-status"),
    snapshotsList: document.getElementById("sl-snapshots-list"),
    snapshotDetail: document.getElementById("sl-snapshot-detail"),
  };

  const sb = () => (window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null);
  const ready = () =>
    window.SL_AUTH && window.SL_AUTH.ready ? window.SL_AUTH.ready : Promise.resolve();

  let currentSession = null;
  let snapshotsCache = [];

  function setStatus(msg) {
    if (els.status) els.status.textContent = msg || "";
  }

  function show(el, on) {
    if (!el) return;
    el.style.display = on ? "" : "none";
  }

  function setText(el, txt) {
    if (!el) return;
    el.textContent = txt || "";
  }

  function normalizeCat(c) {
    return String(c || "")
      .trim()
      .toLowerCase();
  }

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
      .replace(/\s+/g, " ")
      .trim()
      .replace(/\b\w/g, function (c) {
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

  function renderEntitlementsList(cats) {
    if (!els.entitlements) return;

    const list = Array.from(new Set((cats || []).map(normalizeCat).filter(Boolean)));

    if (!list.length) {
      els.entitlements.innerHTML =
        '<p class="muted" style="margin:.75rem 0 0;">No unlocks yet. Go to Upgrade to purchase a category.</p>';
      return;
    }

    const categoryMeta = {
      "access-control": {
        title: "Access Control",
        href: "/tools/access-control/",
        desc: "Doors, readers, lock power, panels, and access-level planning."
      },
      compute: {
        title: "Compute",
        href: "/tools/compute/",
        desc: "CPU, RAM, IOPS, throughput, VM density, GPU, power, and backup windows."
      },
      infrastructure: {
        title: "Infrastructure",
        href: "/tools/infrastructure/",
        desc: "Rack space, floor load, conduit, cable tray, room sizing, and support infrastructure."
      },
      network: {
        title: "Network & Throughput",
        href: "/tools/network/",
        desc: "PoE, bandwidth, oversubscription, latency, packet loss, MTU, VPN, and growth planning."
      },
      performance: {
        title: "Performance",
        href: "/tools/performance/",
        desc: "Headroom, response time, bottlenecks, queues, concurrency, and saturation risk."
      },
      "physical-security": {
        title: "Physical Security",
        href: "/tools/physical-security/",
        desc: "Camera coverage, mounting, pixel density, lens selection, blind spots, and capture range."
      },
      power: {
        title: "Power & Runtime",
        href: "/tools/power/",
        desc: "UPS runtime, battery sizing, load growth, redundancy, and worst-case runtime checks."
      },
      thermal: {
        title: "Thermal",
        href: "/tools/thermal/",
        desc: "Heat load, airflow, fan CFM, ambient rise, exhaust temperature, and cooling capacity."
      },
      "video-storage": {
        title: "Video & Storage",
        href: "/tools/video-storage/",
        desc: "Bitrate, storage, retention, RAID impact, survivability, codec, and archive planning."
      },
      wireless: {
        title: "Wireless",
        href: "/tools/wireless/",
        desc: "Coverage, overlap, noise margin, density, AP capacity, link budget, mesh, and roaming."
      }
    };

    const pretty = (slug) =>
      slug
        .split("-")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ");

    els.entitlements.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "sl-unlock-grid";

    list.forEach((slug) => {
      const meta = categoryMeta[slug] || {
        title: pretty(slug),
        href: "/tools/",
        desc: "Unlocked Pro category access."
      };

      const card = document.createElement("a");
      card.className = "sl-unlock-card";
      card.href = meta.href;

      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = "Pro active";

      const title = document.createElement("div");
      title.className = "sl-unlock-card-title";
      title.textContent = meta.title;

      const desc = document.createElement("div");
      desc.className = "sl-unlock-card-desc";
      desc.textContent = meta.desc;

      card.appendChild(pill);
      card.appendChild(title);
      card.appendChild(desc);
      wrap.appendChild(card);
    });

    els.entitlements.appendChild(wrap);
  }

  async function fetchEntitlements(session) {
    if (!els.entitlements) return;

    setText(els.entitlements, "Loading…");

    try {
      const token = session?.access_token || "";
      if (!token) throw new Error("missing_token");

      const res = await fetch("/api/unlocks/list", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      });

      if (!res.ok) throw new Error("bad_status_" + res.status);

      const data = await res.json();

      let cats = null;

      if (Array.isArray(data)) cats = data;
      else if (data && Array.isArray(data.categories)) cats = data.categories;
      else if (data && data.data && Array.isArray(data.data.categories)) cats = data.data.categories;
      else if (data && Array.isArray(data.entitlements))
        cats = data.entitlements.map((x) => (x ? x.category : null));
      else if (data && data.data && Array.isArray(data.data.entitlements))
        cats = data.data.entitlements.map((x) => (x ? x.category : null));

      if (!cats) cats = [];

      renderEntitlementsList(cats);
      setStatus("");
    } catch (e) {
      console.warn("[account.js] entitlements fetch failed:", e);
      setText(els.entitlements, "Unable to load unlocks right now.");
      setStatus("Entitlements check unavailable. If you just purchased, refresh in a moment.");
    }
  }

  function setSignedOutUI() {
    currentSession = null;
    setText(els.whoami, "Not signed in");
    show(els.loginCard, true);
    show(els.checkoutCard, false);
    show(els.signout, false);
    setStatus("");
  }

  function setSignedInUI(email) {
    setText(els.whoami, email ? `Signed in as ${email}` : "Signed in");
    show(els.loginCard, false);
    show(els.checkoutCard, true);
    show(els.signout, true);
  }

  async function refresh() {
    const client = sb();
    if (!client) {
      setStatus("Auth client not available.");
      return;
    }

    try {
      await ready();
      const { data } = await client.auth.getSession();
      const session = data?.session || null;
      currentSession = session;
      currentSession = session;

      if (!session) {
        setSignedOutUI();
        return;
      }

      setSignedInUI(session.user?.email || "");
      await fetchEntitlements(session);
      await fetchSnapshots(session);} catch (e) {
      console.warn("[account.js] refresh failed:", e);
      setSignedOutUI();
    }
  }

  function bindOnce() {
    if (window.__SL_ACCOUNT_BOUND) return;
    window.__SL_ACCOUNT_BOUND = true;

    // Auth.js owns the actual magic-link request and status messaging.
    // This only handles the empty-email helper text on the Account page.
    if (els.sendLink && els.email && els.emailHint) {
      els.sendLink.addEventListener("click", () => {
        const email = (els.email.value || "").trim();

        if (!email) {
          els.emailHint.textContent = "Enter your email above.";
          return;
        }

        setStatus("");
      });
    }

    if (els.refreshSnapshots && !window.__SL_SNAPSHOT_REFRESH_BOUND) {
      window.__SL_SNAPSHOT_REFRESH_BOUND = true;

      els.refreshSnapshots.addEventListener("click", async () => {
        if (!currentSession) {
          snapshotStatusText("Sign in to view saved snapshots.");
          return;
        }

        await fetchSnapshots(currentSession);
      });
    }

    if (!window.__SL_SNAPSHOT_ACCOUNT_EVENTS_BOUND) {
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

    const client = sb();
    if (client) {
      ready().then(() => {
        if (window.__SL_ACCOUNT_AUTH_SUB) return;
        window.__SL_ACCOUNT_AUTH_SUB = true;

        client.auth.onAuthStateChange(async (_evt, session) => {
          currentSession = session || null;
          currentSession = session || null;
          if (!session) {
            setSignedOutUI();
            return;
          }
          setSignedInUI(session.user?.email || "");
          await fetchEntitlements(session);
      await fetchSnapshots(session);});
      });
    }
  }

  async function init() {
    bindOnce();
    await refresh();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.addEventListener("pageshow", () => {
    refresh();
  });

    async function loadSnapshotViewerFallback() {
    const card = document.getElementById("sl-snapshots-card");
    const list = document.getElementById("sl-snapshots-list");
    const status = document.getElementById("sl-snapshots-status");

    if (!card || !list) return;

    card.style.display = "";

    try {
      await ready();

      const client = sb();
      if (!client) throw new Error("missing_auth_client");

      const { data } = await client.auth.getSession();
      const session = data?.session || null;
      currentSession = session;
      currentSession = session;

      if (!session?.access_token) {
        if (status) status.textContent = "Sign in to view saved snapshots.";
        return;
      }

      if (status) status.textContent = "Loading snapshots…";

      const res = await fetch("/api/snapshots/list?limit=50", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + session.access_token,
          Accept: "application/json"
        }
      });

      const payload = await res.json();

      if (!res.ok || !payload?.ok) {
        throw new Error(payload?.error || "snapshot_list_failed");
      }

      const snapshots = Array.isArray(payload.snapshots) ? payload.snapshots : [];

      if (!snapshots.length) {
        list.innerHTML = '<div class="muted">No saved snapshots yet.</div>';
        if (status) status.textContent = "";
        return;
      }

      list.innerHTML = snapshots.map((s) => {
        const title = s.report_title || s.tool_label || "Saved Snapshot";
        const category = s.category_label || s.category_slug || "";
        const tool = s.tool_label || s.tool_slug || "";
        const created = s.created_at ? new Date(s.created_at).toLocaleString() : "";
        const statusText = s.status ? String(s.status).toUpperCase() : "";

        return `
          <article class="sl-snapshot-row" data-snapshot-id="${s.id}">
            <div class="sl-snapshot-row-head">
              <div>
                <div class="sl-snapshot-title">${title}</div>
                <div class="sl-snapshot-meta">${category} · ${tool}<br>${created}</div>
              </div>
              ${statusText ? `<span class="pill">${statusText}</span>` : ""}
            </div>
            <div class="sl-snapshot-actions">
              <button class="btn btn-primary" type="button" data-snapshot-view="${s.id}">View Snapshot</button>
              <button class="btn" type="button" data-snapshot-delete="${s.id}">Delete</button>
            </div>
          </article>
        `;
      }).join("");

      if (status) status.textContent = "";
    } catch (err) {
      console.warn("[account.js] snapshot fallback load failed:", err);
      if (status) status.textContent = "Unable to load saved snapshots right now.";
    }
  }

  window.addEventListener("load", () => {
    loadSnapshotViewerFallback();
  });

    function slEscapeSnapshotHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  async function slSnapshotToken() {
    await ready();

    const client = sb();
    if (!client) throw new Error("missing_auth_client");

    const { data } = await client.auth.getSession();
    const session = data?.session || null;
      currentSession = session;
      currentSession = session;

    if (!session?.access_token) throw new Error("missing_token");

    return session.access_token;
  }

  async function slSnapshotApi(path, options = {}) {
    const token = await slSnapshotToken();

    const res = await fetch(path, {
      ...options,
      headers: {
        Authorization: "Bearer " + token,
        Accept: "application/json",
        ...(options.headers || {})
      }
    });

    const text = await res.text();
    const data = text ? JSON.parse(text) : {};

    if (!res.ok || data?.ok === false) {
      throw new Error(data?.error || "snapshot_api_failed");
    }

    return data;
  }

  function slSnapshotRows(rows) {
    const list = Array.isArray(rows) ? rows : [];

    if (!list.length) {
      return '<tr><td colspan="2" class="muted">No stored rows.</td></tr>';
    }

    return list.map((row) => {
      return `
        <tr>
          <td>${slEscapeSnapshotHtml(row.label || "")}</td>
          <td>${slEscapeSnapshotHtml(row.value || "")}</td>
        </tr>
      `;
    }).join("");
  }

  function slRenderSnapshotDetail(snapshot) {
    const card = document.getElementById("sl-snapshots-card");
    const detail =
      document.getElementById("sl-snapshot-detail") ||
      (() => {
        const el = document.createElement("div");
        el.id = "sl-snapshot-detail";
        el.className = "card sl-snapshot-detail";
        el.style.marginTop = "1rem";
        if (card) card.appendChild(el);
        return el;
      })();

    if (!detail) return;

    const payload = snapshot?.payload_json || {};

    const title =
      snapshot.report_title ||
      payload?.meta?.reportTitle ||
      payload.tool ||
      snapshot.tool_label ||
      "Saved Snapshot";

    const category = snapshot.category_label || payload.category || snapshot.category_slug || "";
    const tool = snapshot.tool_label || payload.tool || snapshot.tool_slug || "";
    const status = String(snapshot.status || payload.status || "").toUpperCase();
    const summary = snapshot.summary || payload.summary || "";
    const created = snapshot.created_at
      ? new Date(snapshot.created_at).toLocaleString()
      : "";

    const project = snapshot.project_name || payload?.meta?.projectName || "";
    const client = snapshot.client_name || payload?.meta?.clientName || "";
    const preparedBy = snapshot.prepared_by || payload?.meta?.preparedBy || "";
    const customNotes = payload?.meta?.customNotes || "";

    const analysisSections = Array.isArray(payload.analysisSections)
      ? payload.analysisSections
      : [];

    const analysisHtml = analysisSections.map((section) => {
      return `
        <div class="card" style="background:rgba(0,0,0,.14); margin-top:10px;">
          <h4 style="margin-top:0;">${slEscapeSnapshotHtml(section.title || "Analysis")}</h4>
          <p class="muted" style="margin-bottom:0;">${slEscapeSnapshotHtml(section.body || "")}</p>
        </div>
      `;
    }).join("");

    const chartHtml = payload.chartImage
      ? `
        <div class="sl-snapshot-chart" style="margin-top:12px;">
          <img src="${slEscapeSnapshotHtml(payload.chartImage)}" alt="${slEscapeSnapshotHtml(tool)} chart snapshot" style="max-width:100%; height:auto;" />
        </div>
      `
      : "";

    detail.style.display = "";
    detail.innerHTML = `
      <div class="sl-snapshot-row-head">
        <div>
          <span class="pill">Snapshot Detail</span>
          <h3 style="margin:.65rem 0 .25rem;">${slEscapeSnapshotHtml(title)}</h3>
          <p class="muted" style="margin:0;">
            ${slEscapeSnapshotHtml(category)} · ${slEscapeSnapshotHtml(tool)}<br>
            ${project ? "Project: " + slEscapeSnapshotHtml(project) + " · " : ""}
            ${client ? "Client: " + slEscapeSnapshotHtml(client) + " · " : ""}
            ${preparedBy ? "Prepared by: " + slEscapeSnapshotHtml(preparedBy) + " · " : ""}
            ${slEscapeSnapshotHtml(created)}
          </p>
        </div>
        ${status ? `<span class="pill">${slEscapeSnapshotHtml(status)}</span>` : ""}
      </div>

      ${summary ? `
        <div class="card" style="background:rgba(0,0,0,.14); margin-top:14px;">
          <strong>Summary</strong>
          <p class="muted" style="margin-bottom:0;">${slEscapeSnapshotHtml(summary)}</p>
        </div>
      ` : ""}

      <div class="sl-snapshot-grid" style="margin-top:14px;">
        <div>
          <h4>Inputs</h4>
          <table class="sl-snapshot-table">
            <tbody>${slSnapshotRows(payload.inputs)}</tbody>
          </table>
        </div>

        <div>
          <h4>Calculated Outputs</h4>
          <table class="sl-snapshot-table">
            <tbody>${slSnapshotRows(payload.outputs)}</tbody>
          </table>
        </div>
      </div>

      ${payload.interpretation ? `
        <div class="card" style="background:rgba(0,0,0,.14); margin-top:10px;">
          <h4 style="margin-top:0;">Engineering Interpretation</h4>
          <p class="muted" style="margin-bottom:0;">${slEscapeSnapshotHtml(payload.interpretation)}</p>
        </div>
      ` : ""}

      ${analysisHtml}
      ${chartHtml}

      ${customNotes ? `
        <div class="card" style="background:rgba(0,0,0,.14); margin-top:10px;">
          <h4 style="margin-top:0;">Custom Notes</h4>
          <p class="muted" style="margin-bottom:0;">${slEscapeSnapshotHtml(customNotes)}</p>
        </div>
      ` : ""}

      <div class="actions" style="margin-top:14px;">
        <button class="btn" type="button" data-snapshot-close>Close</button>
        <button class="btn" type="button" data-snapshot-delete="${slEscapeSnapshotHtml(snapshot.id || "")}">Delete Snapshot</button>
      </div>
    `;

    detail.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (!window.__SL_ACCOUNT_SNAPSHOT_ACTIONS_BOUND) {
    window.__SL_ACCOUNT_SNAPSHOT_ACTIONS_BOUND = true;

    document.addEventListener("click", async (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;

      const status = document.getElementById("sl-snapshots-status");

      const viewBtn = target.closest("[data-snapshot-view]");
      if (viewBtn) {
        event.preventDefault();

        const id = viewBtn.getAttribute("data-snapshot-view");
        if (!id) return;

        try {
          if (status) status.textContent = "Loading snapshot…";

          const data = await slSnapshotApi("/api/snapshots/" + encodeURIComponent(id), {
            method: "GET"
          });

          slRenderSnapshotDetail(data.snapshot);

          if (status) status.textContent = "";
        } catch (err) {
          console.warn("[account.js] snapshot view failed:", err);
          if (status) status.textContent = "Unable to open that snapshot.";
        }

        return;
      }

      const deleteBtn = target.closest("[data-snapshot-delete]");
      if (deleteBtn) {
        event.preventDefault();

        const id = deleteBtn.getAttribute("data-snapshot-delete");
        if (!id) return;

        if (!confirm("Delete this saved snapshot?")) return;

        try {
          if (status) status.textContent = "Deleting snapshot…";

          await slSnapshotApi("/api/snapshots/" + encodeURIComponent(id), {
            method: "DELETE"
          });

          document.querySelector(`[data-snapshot-id="${CSS.escape(id)}"]`)?.remove();

          const detail = document.getElementById("sl-snapshot-detail");
          if (detail) {
            detail.style.display = "none";
            detail.innerHTML = "";
          }

          if (status) status.textContent = "Snapshot deleted.";
        } catch (err) {
          console.warn("[account.js] snapshot delete failed:", err);
          if (status) status.textContent = "Unable to delete that snapshot.";
        }

        return;
      }

      const closeBtn = target.closest("[data-snapshot-close]");
      if (closeBtn) {
        event.preventDefault();

        const detail = document.getElementById("sl-snapshot-detail");
        if (detail) {
          detail.style.display = "none";
          detail.innerHTML = "";
        }
      }
    });
  }
})();