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


  function slPayloadHasExtraSections(payload) {
    return Array.isArray(payload?.extraSections) && payload.extraSections.length > 0;
  }

  function slSuppressLegacySnapshotGrid(detail, payload) {
    if (!detail || !slPayloadHasExtraSections(payload)) return;
    detail.querySelector(".sl-snapshot-grid")?.remove();
  }

  function sanitizeSnapshotSvg(svg) {
    return String(svg || "")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/\son\w+="[^"]*"/gi, "")
      .replace(/\son\w+='[^']*'/gi, "")
      .replace(/javascript:/gi, "");
  }

  function cleanSnapshotTableText(value) {
  // account-snapshot-object-cell-normalizer-0703
  // account-snapshot-text-spacing-normalizer-0703
  const directKeys = [
    "text", "value", "label", "title", "name", "status", "detail", "details",
    "summary", "note", "notes", "message", "description", "primary", "secondary",
    "tool", "workload", "scope", "section"
  ];

  function humanizeKey(key) {
    return String(key || "")
      .replace(/[_-]+/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^./, (ch) => ch.toUpperCase());
  }

  function cleanScalar(input) {
    return String(input == null ? "" : input)
      .replace(/<\s*br\s*\/?\s*>/gi, " ")
      .replace(/<\/(p|div|li|tr|td|th|section|article|h[1-6])\s*>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'")
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalize(input, depth = 0) {
    if (input == null) return "";
    if (typeof input === "string" || typeof input === "number" || typeof input === "boolean") {
      return cleanScalar(input);
    }
    if (Array.isArray(input)) {
      return input.map((item) => normalize(item, depth + 1)).filter(Boolean).join(" | ");
    }
    if (typeof input === "object") {
      for (const key of directKeys) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
          const normalized = normalize(input[key], depth + 1);
          if (normalized) return normalized;
        }
      }

      return Object.entries(input)
        .map(([key, entryValue]) => {
          const normalized = normalize(entryValue, depth + 1);
          return normalized ? humanizeKey(key) + ": " + normalized : "";
        })
        .filter(Boolean)
        .join(" | ");
    }
    return cleanScalar(input);
  }

  return normalize(value);
})();





