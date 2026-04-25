const fs = require("fs");

const file = "assets/export.js";

if (!fs.existsSync(file)) {
  throw new Error("Missing assets/export.js");
}

let s = fs.readFileSync(file, "utf8");
const original = s;

s = s.replace(
  /snapshotLimit:\s*25,\s*enableOnProPages:\s*true/,
  `snapshotLimit: 25,
    snapshotSaveEndpoint: "/api/snapshots/save",
    snapshotApiMode: "remote-first",
    siteKey: "scopedlabs",
    enableOnProPages: true`
);

s = s.replace(
  /  function saveSnapshot\(payload\) \{[\s\S]*?  \}\s*\n\s*function buildReportHTML\(payload\) \{/,
  `  function saveSnapshotLocal(payload) {
    const key = state.options.snapshotKey;
    const existing = readSnapshots(key);

    existing.unshift({
      ...payload,
      savedAt: new Date().toISOString()
    });

    const trimmed = existing.slice(0, state.options.snapshotLimit);
    writeSnapshots(key, trimmed);

    return trimmed.length;
  }

  async function getSupabaseSession() {
    const candidates = [
      window.SL_AUTH?.sb,
      window.ScopedLabsAuth?.sb,
      window.supabaseClient,
      window.sb
    ].filter(Boolean);

    for (const client of candidates) {
      if (!client?.auth?.getSession) continue;

      try {
        const result = await client.auth.getSession();
        const session = result?.data?.session || result?.session || null;

        if (session?.access_token) {
          return session;
        }
      } catch {}
    }

    return null;
  }

  function findStoredAccessToken() {
    try {
      const keys = Object.keys(localStorage);

      for (const key of keys) {
        if (!key.startsWith("sb-")) continue;

        const rawText = localStorage.getItem(key);
        if (!rawText) continue;

        const raw = JSON.parse(rawText);

        if (raw?.access_token) return raw.access_token;
        if (raw?.currentSession?.access_token) return raw.currentSession.access_token;
        if (raw?.session?.access_token) return raw.session.access_token;

        if (Array.isArray(raw)) {
          const found = raw.find((item) => item?.access_token);
          if (found?.access_token) return found.access_token;
        }
      }
    } catch {}

    return "";
  }

  async function getSnapshotAccessToken() {
    const session = await getSupabaseSession();
    if (session?.access_token) return session.access_token;

    return findStoredAccessToken();
  }

  function buildSnapshotRequest(payload) {
    return {
      site_key: state.options.siteKey || "scopedlabs",
      snapshot_type: "tool_report",
      schema_version: "snapshot-v1",

      category_slug: payload.categorySlug || state.options.categorySlug || "",
      category_label: payload.category || state.options.categoryLabel || "",

      tool_slug: payload.toolSlug || state.options.toolSlug || "",
      tool_label: payload.tool || state.options.toolLabel || "",

      report_title: payload.meta?.reportTitle || payload.tool || "Tool Snapshot",
      project_name: payload.meta?.projectName || "",
      client_name: payload.meta?.clientName || "",
      prepared_by: payload.meta?.preparedBy || "",

      status: payload.status || "",
      summary: payload.summary || "",

      payload_json: {
        ...payload,
        savedAt: new Date().toISOString()
      }
    };
  }

  async function saveSnapshot(payload) {
    const token = await getSnapshotAccessToken();

    if (!token) {
      const localCount = saveSnapshotLocal(payload);

      return {
        ok: false,
        mode: "local",
        reason: "not_signed_in",
        localCount
      };
    }

    const endpoint = state.options.snapshotSaveEndpoint || "/api/snapshots/save";

    try {
      const resp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: \`Bearer \${token}\`
        },
        body: JSON.stringify(buildSnapshotRequest(payload))
      });

      const text = await resp.text();
      const data = text ? JSON.parse(text) : {};

      if (!resp.ok || data?.ok === false) {
        const localCount = saveSnapshotLocal(payload);

        return {
          ok: false,
          mode: "local",
          reason: data?.error || "remote_save_failed",
          detail: data?.detail || text,
          localCount
        };
      }

      return {
        ok: true,
        mode: "account",
        snapshot: data.snapshot || null
      };
    } catch (err) {
      const localCount = saveSnapshotLocal(payload);

      return {
        ok: false,
        mode: "local",
        reason: "network_error",
        detail: err?.message || String(err),
        localCount
      };
    }
  }

  function buildReportHTML(payload) {`
);

s = s.replace(
  /    if \(snapshotBtn\) \{[\s\S]*?    \}\s*\n\s*if \(inputContainer\) \{/,
  `    if (snapshotBtn) {
      snapshotBtn.addEventListener("click", async () => {
        if (!hasExportAccess()) {
          refresh(\`\${state.options.categoryLabel} export is available with category unlock.\`);
          return;
        }

        const payload = buildPayload();

        if (!payload) {
          refresh("Run the calculator before saving a snapshot.");
          return;
        }

        setButtonsEnabled(false);
        setStatus("Saving snapshot...");

        const result = await saveSnapshot(payload);

        if (result.ok && result.mode === "account") {
          refresh("Snapshot saved to your account.");
          return;
        }

        if (result.reason === "not_signed_in") {
          refresh(\`Saved locally. Sign in to save snapshots to your account. \${result.localCount} local snapshot\${result.localCount === 1 ? "" : "s"} stored for this tool.\`);
          return;
        }

        refresh(\`Account save failed; saved locally as fallback. \${result.localCount} local snapshot\${result.localCount === 1 ? "" : "s"} stored for this tool.\`);
      });
    }

    if (inputContainer) {`
);

s = s.replace(
  /openReportWindow,\s*\n\s*saveSnapshot,\s*\n\s*getResultRows,/,
  `openReportWindow,
    saveSnapshot,
    saveSnapshotLocal,
    getResultRows,`
);

if (s === original) {
  console.log("No changes made. Patch patterns did not match.");
  process.exit(1);
}

fs.writeFileSync(file, s, "utf8");
console.log("Patched assets/export.js for account-backed snapshots.");