/* /assets/auth.js
   ScopedLabs Magic Link Auth — reliable status + no-submit-click

   Exposes:
     window.SL_AUTH = { sb, ready }

   Requires (in HTML, before this file):
     <script defer src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js"></script>

   Config:
   - Prefer window.SL_SUPABASE injected by /assets/stripe-map.js (url + anonKey).
   - Fallback to constants if you insist (not recommended to hardcode keys in public repos).
*/

(() => {
  "use strict";

  // Prefer stripe-map injection if present
  const SUPABASE_URL =
    (window.SL_SUPABASE && window.SL_SUPABASE.url) ||
    "https://ybnzjtuecirzajraddft.supabase.co";

  // IMPORTANT: best practice is to let stripe-map inject this at runtime.
  // If you are not using stripe-map, paste your anon key here.
  const SUPABASE_ANON_KEY =
    (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM"; 

  const $ = (id) => document.getElementById(id);
  const pick = (...els) => els.find(Boolean) || null;

  const els = {
    email: () => pick($("sl-email"), $("sl-email-input"), $("email")),
    send: () => pick($("sl-sendlink"), $("sl-send-btn")),
    status: () => pick($("sl-status"), $("sl-auth-status"), $("status")),
    signout: () => $("sl-signout"),
    loginCard: () => $("sl-login-card"),
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
    st.style.color =
      kind === "error" ? "#ffb3b3" : kind === "ok" ? "#bfffd0" : "";
  }

  function normalizeEmail(v) {
    return (v || "").trim().toLowerCase();
  }

  function getCategory() {
    try {
      const u = new URL(location.href);
      const q = (u.searchParams.get("category") || "").trim();
      if (q) return q;
    } catch {}
    try {
      const ls = (localStorage.getItem("sl_selected_category") || "").trim();
      if (ls) return ls;
    } catch {}
    return "";
  }

  function buildRedirectTo() {
    const origin = location.origin;
    const cat = getCategory();
    return cat
      ? `${origin}/upgrade/checkout/?category=${encodeURIComponent(cat)}`
      : `${origin}/upgrade/#checkout`;
  }

  function cleanAuthParams() {
    try {
      const u = new URL(location.href);
      const keepCat = u.searchParams.get("category");
      const keepHash = u.hash || "";

      ["code", "error", "error_code", "error_description", "type"].forEach((k) =>
        u.searchParams.delete(k)
      );

      // If the hash contains implicit tokens, wipe it
      const h = (u.hash || "").toLowerCase();
      const hasTokens =
        h.includes("access_token=") ||
        h.includes("refresh_token=") ||
        h.includes("token_type=") ||
        h.includes("expires_in=");
      u.hash = hasTokens ? "" : keepHash;

      if (keepCat) u.searchParams.set("category", keepCat);
      history.replaceState({}, "", u.toString());
    } catch {}
  }

  function showReturnErrorIfAny() {
    try {
      const u = new URL(location.href);
      const code = u.searchParams.get("error_code") || "";
      const desc = u.searchParams.get("error_description") || "";
      const err = u.searchParams.get("error") || "";
      if (!code && !err) return;

      if (code === "otp_expired") {
        setStatus(
          "That email link expired (or was already used). Send a new magic link.",
          "error"
        );
      } else {
        const msg = desc
          ? decodeURIComponent(desc).replace(/\+/g, " ")
          : code || err;
        setStatus(`Sign-in failed: ${msg}`, "error");
      }

      cleanAuthParams();
    } catch {}
  }

  function waitForSupabase(timeoutMs = 9000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        if (window.supabase && typeof window.supabase.createClient === "function")
          return resolve(true);
        if (Date.now() - start > timeoutMs)
          return reject(new Error("supabase-js not loaded"));
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  async function refreshSessionStatus(sb) {
    try {
      const { data } = await sb.auth.getSession();
      const sess = data?.session || null;

      if (sess?.user?.email) {
        setStatus(`Signed in as ${sess.user.email}`, "ok");
        return sess;
      }

      setStatus("Not signed in.");
      return null;
    } catch {
      setStatus("Not signed in.");
      return null;
    }
  }

  async function init() {
    setStatus("Auth loading…");

    try {
      await waitForSupabase();
    } catch (e) {
      console.warn("[SL_AUTH] supabase-js not loaded:", e);
      setStatus("Auth failed to load (Supabase script missing).", "error");
      return;
    }

    // If key is missing, DO NOT silently die; show it.
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn("[SL_AUTH] Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
      setStatus("Auth not configured (missing Supabase key).", "error");
      return;
    }

    // Implicit flow is most reliable for magic links on static sites
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    window.SL_AUTH = window.SL_AUTH || {};
    window.SL_AUTH.sb = sb;

    // show any return errors (otp_expired, etc)
    showReturnErrorIfAny();

    // settle status immediately (clears any stale “Signing you in…”)
    await refreshSessionStatus(sb);

    // stay in sync on changes
    try {
      sb.auth.onAuthStateChange((_evt, session) => {
        if (session?.user?.email) setStatus(`Signed in as ${session.user.email}`, "ok");
        else setStatus("Not signed in.");
        cleanAuthParams();
      });
    } catch {}

    // wire send button (with preventDefault so it never becomes a dead submit)
    const btn = els.send();
    const emailEl = els.email();

    if (!btn) {
      console.warn("[SL_AUTH] Send button not found (#sl-sendlink or #sl-send-btn).");
      setStatus("Login UI missing send button.", "error");
      return;
    }

    btn.addEventListener("click", async (e) => {
      // THIS is the critical fix: stop form submits / page refresh
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch {}

      const email = normalizeEmail(emailEl?.value);
      if (!email || !email.includes("@")) {
        setStatus("Enter a valid email.", "error");
        return;
      }

      btn.disabled = true;
      setStatus("Sending magic link…");

      try {
        const redirectTo = buildRedirectTo();

        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: redirectTo },
        });

        if (error) throw error;

        setStatus("Magic link sent. Check your email (and spam/junk).", "ok");
      } catch (err) {
        console.warn("[SL_AUTH] signInWithOtp error:", err);
        setStatus("Could not send link. Try again.", "error");
      } finally {
        btn.disabled = false;
      }
    });

    // sign out (optional)
    const outBtn = els.signout();
    if (outBtn) {
      outBtn.addEventListener("click", async (e) => {
        try {
          e.preventDefault();
        } catch {}
        try {
          outBtn.disabled = true;
          await sb.auth.signOut();
        } catch {}
        try {
          localStorage.removeItem("sl_selected_category");
        } catch {}
        setStatus("Signed out.");
        outBtn.disabled = false;
        location.href = "/upgrade/#checkout";
      });
    }

    // final settle
    // (keeps it from showing “Auth loading…” forever on upgrade page)
    const sess = await refreshSessionStatus(sb);
    if (!sess) {
      // keep a helpful hint on upgrade page
      // (so it never looks like “nothing”)
      setStatus("Enter your email to receive a sign-in link.");
    }
  }

  // expose readiness
  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.ready =
    (document.readyState === "loading"
      ? new Promise((resolve) =>
          document.addEventListener("DOMContentLoaded", resolve, { once: true })
        )
      : Promise.resolve()
    ).then(init);
})();





