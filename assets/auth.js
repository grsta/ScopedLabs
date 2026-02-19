/* /assets/auth.js
   ScopedLabs auth controller (Supabase v2 UMD).

   Hard requirements:
   - Works on BOTH /upgrade/ and /upgrade/checkout/
   - Shows status immediately on send + on session restore
   - Clears "Signing you in..." once session exists
   - Exposes: window.SL_AUTH = { sb, ready, getSession }
*/

(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // Elements that may or may not exist on a given page
  const els = {
    status: () => $("sl-status"),
    email: () => $("sl-email"),
    send: () => $("sl-sendlink"),
    signout: () => $("sl-signout"),
    bootHint: () => $("sl-boot-hint"), // checkout page helper text
  };

  function setStatus(msg, kind = "") {
    const el = els.status();
    if (!el) return;
    el.textContent = msg || "";
    el.dataset.kind = kind || "";
  }

  function setBootHint(msg) {
    const el = els.bootHint();
    if (!el) return;
    el.textContent = msg || "";
  }

  function getSupabaseConfig() {
    // Prefer stripe-map injection if present
    const injected = window.SL_SUPABASE || {};
    const url =
      (typeof injected.url === "string" && injected.url.trim()) ||
      "https://ybnzjtuecirzajraddft.supabase.co";
    const anonKey =
      (typeof injected.anonKey === "string" && injected.anonKey.trim()) ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM"; // your current file already has this – keep it or replace

    return { url, anonKey };
  }

  function haveSupabaseUmd() {
    return !!(window.supabase && typeof window.supabase.createClient === "function");
  }

  function createClient() {
    const { url, anonKey } = getSupabaseConfig();

    if (!url || !anonKey) {
      setStatus("Auth not configured (missing Supabase URL / anon key).", "error");
      return null;
    }
    if (!haveSupabaseUmd()) {
      setStatus("Auth failed to load (Supabase script missing).", "error");
      return null;
    }

    // Use implicit flow to avoid PKCE mismatch loops
    return window.supabase.createClient(url, anonKey, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  function currentCategoryFromUrlOrStorage() {
    const p = new URLSearchParams(location.search);
    const q = (p.get("category") || "").trim();
    const ls = (localStorage.getItem("sl_selected_category") || "").trim();
    return q || ls || "";
  }

  async function safeGetSession(sb) {
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) return null;
      return data && data.session ? data.session : null;
    } catch {
      return null;
    }
  }

  async function stripAuthHashIfPresent() {
    // If we have an access_token in hash, clean it out after session is established
    if (!location.hash) return;
    const h = location.hash.toLowerCase();
    if (
      h.includes("access_token=") ||
      h.includes("refresh_token=") ||
      h.includes("token_type=")
    ) {
      try {
        history.replaceState({}, document.title, location.pathname + location.search);
      } catch {}
    }
  }

  function updateAuthUi(session) {
    const sendBtn = els.send();
    const emailEl = els.email();
    const signoutBtn = els.signout();

    if (session && session.user) {
      if (emailEl) emailEl.value = session.user.email || emailEl.value || "";
      if (sendBtn) sendBtn.style.display = "none";
      if (signoutBtn) signoutBtn.style.display = "";
      setBootHint("");
      setStatus(`Signed in as ${session.user.email}`, "ok");
    } else {
      if (sendBtn) sendBtn.style.display = "";
      if (signoutBtn) signoutBtn.style.display = "none";
      setBootHint("");
      setStatus("", "");
    }
  }

  // Create client immediately
  const sb = createClient();

  // Expose API
  let readyResolve;
  const ready = new Promise((res) => (readyResolve = res));
  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.sb = sb;
  window.SL_AUTH.ready = ready;
  window.SL_AUTH.getSession = () => (sb ? safeGetSession(sb) : Promise.resolve(null));

  (async () => {
    if (!sb) {
      readyResolve(null);
      return;
    }

    // Show something on pages that have sl-boot-hint (checkout)
    if (els.bootHint()) setBootHint("Signing you in…");

    // Initial check (handles already-signed-in)
    let session = await safeGetSession(sb);

    // If we just clicked a magic link, we may need a moment for session to land
    if (!session && (location.hash || "").includes("access_token")) {
      setStatus("Finishing sign-in…", "info");
      // Wait up to ~6s for auth event to fire
      const got = await new Promise((resolve) => {
        let done = false;
        const t = setTimeout(() => {
          if (done) return;
          done = true;
          resolve(null);
        }, 6000);

        const sub = sb.auth.onAuthStateChange((_evt, s) => {
          if (done) return;
          if (s) {
            done = true;
            clearTimeout(t);
            resolve(s);
          }
        });

        // safety cleanup
        setTimeout(() => {
          try {
            sub?.data?.subscription?.unsubscribe?.();
          } catch {}
        }, 6500);
      });

      if (got) session = got;
    }

    if (session) {
      await stripAuthHashIfPresent();
      updateAuthUi(session);
      setBootHint("");
      // status line already set to Signed in as...
    } else {
      setBootHint("");
      // Don’t spam status; upgrade page stays clean until user clicks send
    }

    // Always listen for later changes (signout, refresh, etc.)
    sb.auth.onAuthStateChange((_event, s) => {
      updateAuthUi(s || null);
      if (s) setBootHint("");
    });

    // Wire Send Magic Link
    const sendBtn = els.send();
    if (sendBtn) {
      sendBtn.addEventListener("click", async () => {
        const emailEl = els.email();
        const email = (emailEl?.value || "").trim();

        if (!email) {
          setStatus("Enter an email address first.", "warn");
          emailEl?.focus?.();
          return;
        }

        const cat = currentCategoryFromUrlOrStorage();
        const redirectTo =
          "https://scopedlabs.com/upgrade/checkout/?" +
          (cat ? `category=${encodeURIComponent(cat)}` : "");

        sendBtn.disabled = true;
        setStatus("Sending magic link… check your email.", "info");

        try {
          const { error } = await sb.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectTo },
          });

          if (error) {
            setStatus(`Failed to send magic link: ${error.message}`, "error");
          } else {
            setStatus("Magic link sent. Open your email to continue.", "ok");
          }
        } catch (e) {
          setStatus("Failed to send magic link.", "error");
        } finally {
          sendBtn.disabled = false;
        }
      });
    }

    // Wire Sign out
    const signoutBtn = els.signout();
    if (signoutBtn) {
      signoutBtn.addEventListener("click", async () => {
        try {
          await sb.auth.signOut();
        } catch {}
        localStorage.removeItem("sl_selected_category");
        setStatus("Signed out.", "info");
        updateAuthUi(null);
      });
    }

    readyResolve(true);
  })();
})();







