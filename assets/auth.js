/* /assets/auth.js
   ScopedLabs Supabase auth controller (UMD / supabase-js v2).

   Goals:
   - Create exactly ONE Supabase client
   - Support config from either:
       window.SL_SUPABASE = { url, anonKey }
     OR:
       window.SL_SUPABASE_URL / window.SL_SUPABASE_ANON_KEY   (your stripe-map.js)
   - Wire magic link send with immediate status updates
   - Restore session from URL (implicit flow), then CLEAR "Signing you in..."
   - Expose:
       window.SL_AUTH = { sb, ready }
*/

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const pick = (...els) => els.find(Boolean) || null;

  const els = {
    email: () => pick($("sl-email"), $("sl-email-input"), $("email")),
    send: () => pick($("sl-sendlink"), $("sl-send-btn"), $("sl-sendlink-btn"), $("sl-send-magic")),
    signout: () => $("sl-signout"),
    status: () => pick($("sl-status"), $("sl-auth-status"), $("status")),
  };

  function ensureStatusEl() {
    let st = els.status();
    if (st) return st;

    const btn = els.send();
    if (!btn || !btn.parentElement) return null;

    st = document.createElement("div");
    st.id = "sl-status";
    st.className = "muted";
    st.style.marginTop = "10px";
    st.style.fontSize = "0.95rem";
    st.style.opacity = "0.9";
    btn.parentElement.appendChild(st);
    return st;
  }

  function setStatus(msg, kind = "info") {
    const st = ensureStatusEl();
    if (!st) return;

    st.textContent = msg || "";
    st.dataset.kind = kind;

    // optional subtle coloring if your CSS doesn't handle [data-kind]
    if (kind === "error") st.style.opacity = "1";
  }

  function getCategoryFromUrlOrStorage() {
    try {
      const u = new URL(location.href);
      const cat = (u.searchParams.get("category") || "").trim();
      if (cat) return cat;
    } catch {}
    try {
      const ls = localStorage.getItem("sl_selected_category");
      return (ls || "").trim();
    } catch {}
    return "";
  }

  function buildEmailRedirectTo() {
    const cat = getCategoryFromUrlOrStorage();
    const base = "https://scopedlabs.com/upgrade/checkout/";
    const u = new URL(base);
    if (cat) u.searchParams.set("category", cat);
    return u.toString();
  }

  function readSupabaseConfig() {
    // Prefer stripe-map style globals
    const urlA = (window.SL_SUPABASE_URL || "").trim();
    const keyA = (window.SL_SUPABASE_ANON_KEY || "").trim();
    if (urlA && keyA) return { url: urlA, anonKey: keyA };

    // Fallback to object style
    const obj = window.SL_SUPABASE || null;
    if (obj && typeof obj === "object") {
      const urlB = (obj.url || "").trim();
      const keyB = (obj.anonKey || obj.anon_key || "").trim();
      if (urlB && keyB) return { url: urlB, anonKey: keyB };
    }

    return { url: "", anonKey: "" };
  }

  function stripAuthParamsFromUrl() {
    // For implicit flow, Supabase may put tokens in hash. Remove them for cleanliness.
    try {
      const url = new URL(location.href);
      const hasError =
        url.searchParams.has("error") ||
        url.searchParams.has("error_code") ||
        url.searchParams.has("error_description");

      // Keep category + return params; remove auth errors if present (we'll show status)
      if (hasError) {
        // leave them for setStatus() below, then strip after
      }

      if (location.hash && location.hash.includes("access_token")) {
        history.replaceState({}, document.title, url.pathname + url.search);
      } else if (hasError) {
        // remove error params
        url.searchParams.delete("error");
        url.searchParams.delete("error_code");
        url.searchParams.delete("error_description");
        history.replaceState({}, document.title, url.pathname + url.search + location.hash);
      }
    } catch {}
  }

  function readAuthErrorFromUrl() {
    try {
      const u = new URL(location.href);
      const desc = u.searchParams.get("error_description");
      const code = u.searchParams.get("error_code") || u.searchParams.get("error");
      if (desc || code) {
        return `${desc || "Sign-in error"}${code ? ` (${code})` : ""}`;
      }
    } catch {}
    return "";
  }

  function createClientOrNull() {
    const cfg = readSupabaseConfig();

    if (!cfg.url || !cfg.anonKey) {
      setStatus("Auth not configured (missing Supabase keys).", "error");
      console.warn("[SL_AUTH] Missing SUPABASE URL / ANON KEY.");
      return null;
    }

    const supa = window.supabase;
    if (!supa || typeof supa.createClient !== "function") {
      setStatus("Auth failed to load (Supabase script missing).", "error");
      console.warn("[SL_AUTH] supabase-js not loaded (check script order).");
      return null;
    }

    // One client only.
    return supa.createClient(cfg.url, cfg.anonKey, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: { "X-Client-Info": "scopedlabs-upgrade" },
      },
    });
  }

  const sb = createClientOrNull();

  // Expose immediately (even if null) so app.js can behave safely
  if (!window.SL_AUTH) window.SL_AUTH = {};
  window.SL_AUTH.sb = sb;

  window.SL_AUTH.ready = (async () => {
    const errMsg = readAuthErrorFromUrl();
    if (errMsg) setStatus(errMsg, "error");

    if (!sb) return null;

    // Always show something immediately on load
    setStatus("Checking session…", "info");

    // Subscribe early so we catch restores
    const sub = sb.auth.onAuthStateChange((_event, session) => {
      if (session && session.user && session.user.email) {
        setStatus(`Signed in as ${session.user.email}`, "ok");
      }
    });

    // Attempt restore/get session (implicit flow will be detected here)
    let session = null;
    try {
      const res = await sb.auth.getSession();
      session = res && res.data ? res.data.session : null;
    } catch (e) {
      console.warn("[SL_AUTH] getSession failed", e);
    }

    // If we arrived with access_token in hash, we are “signing you in…”
    if (location.hash && location.hash.includes("access_token")) {
      setStatus("Signing you in…", "info");
    }

    // One more short wait for onAuthStateChange to fire if needed
    if (!session) {
      await new Promise((r) => setTimeout(r, 300));
      try {
        const res2 = await sb.auth.getSession();
        session = res2 && res2.data ? res2.data.session : null;
      } catch {}
    }

    if (session && session.user && session.user.email) {
      setStatus(`Signed in as ${session.user.email}`, "ok");
      stripAuthParamsFromUrl();
    } else {
      // Only show signed-out text if there is NOT an auth error in URL
      if (!errMsg) setStatus("Not signed in.", "info");
      stripAuthParamsFromUrl();
    }

    // Wire send magic link
    const btn = els.send();
    if (btn) {
      btn.addEventListener("click", async (ev) => {
        ev.preventDefault();

        const emailEl = els.email();
        const email = (emailEl && emailEl.value ? emailEl.value : "").trim();

        if (!email) {
          setStatus("Enter your email first.", "error");
          if (emailEl) emailEl.focus();
          return;
        }

        btn.disabled = true;
        setStatus("Sending magic link…", "info");

        try {
          const redirectTo = buildEmailRedirectTo();

          const { error } = await sb.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: redirectTo,
              shouldCreateUser: true,
            },
          });

          if (error) throw error;

          setStatus("Magic link sent — check your email.", "ok");
        } catch (e) {
          console.warn("[SL_AUTH] signInWithOtp failed", e);
          setStatus("Failed to send magic link. Try again.", "error");
        } finally {
          btn.disabled = false;
        }
      });
    }

    // Wire signout (if present on this page)
    const so = els.signout();
    if (so) {
      so.addEventListener("click", async (ev) => {
        ev.preventDefault();
        try {
          await sb.auth.signOut();
        } catch {}
        try {
          localStorage.removeItem("sl_selected_category");
        } catch {}
        setStatus("Signed out.", "info");
        // Keep user on upgrade flow
        if (location.pathname.startsWith("/upgrade/checkout")) {
          location.href = "/upgrade/#checkout";
        } else {
          location.href = "/upgrade/#checkout";
        }
      });
    }

    // Cleanup subscription? We keep it active; UMD is lightweight.
    // But ensure no leaks if page stays long:
    try {
      window.addEventListener("beforeunload", () => {
        try {
          sub && sub.data && sub.data.subscription && sub.data.subscription.unsubscribe();
        } catch {}
      });
    } catch {}

    return session;
  })();
})();






