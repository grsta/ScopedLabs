/* /assets/auth.js
   ScopedLabs Magic Link Auth — hardwired config + self-report

   Exposes:
     window.SL_AUTH = { sb, ready }
*/

(() => {
  "use strict";

  // ---- HARDWIRED CONFIG (do not depend on stripe-map) ----
  const SUPABASE_URL = "https://ybnzjtuecirzajraddft.supabase.co";

  // !!! IMPORTANT !!!
  // Paste your anon key here EXACTLY (the full long JWT-looking string).
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";

  console.log("[SL_AUTH] boot", {
  url: SUPABASE_URL,
  anonKey_len: (SUPABASE_ANON_KEY || "").length,
  file: document.currentScript && document.currentScript.src
});


  // ---- helpers ----
  const $ = (id) => document.getElementById(id);
  const pick = (...els) => els.find(Boolean) || null;

  const els = {
    email: () => pick($("sl-email"), $("sl-email-input"), $("email")),
    send: () => pick($("sl-sendlink"), $("sl-send-btn")),
    status: () => pick($("sl-status"), $("sl-auth-status"), $("status")),
    signout: () => $("sl-signout"),
  };

  function ensureStatus() {
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
    const st = ensureStatus();
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
      if (keepCat) u.searchParams.set("category", keepCat);
      u.hash = keepHash;
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

  async function exchangeIfCodePresent(sb) {
    try {
      const u = new URL(location.href);
      const code = u.searchParams.get("code");
      if (!code) return;

      setStatus("Finalizing sign-in…");

      const { data, error } = await sb.auth.exchangeCodeForSession(code);
      if (error) throw error;

      const email = data?.session?.user?.email;
      setStatus(email ? `Signed in as ${email}` : "Signed in.", "ok");
      cleanAuthParams();
    } catch (e) {
      console.warn("[SL_AUTH] exchangeCodeForSession failed:", e);
      setStatus(
        "Could not finalize sign-in. Please resend a new magic link.",
        "error"
      );
      cleanAuthParams();
    }
  }

  async function init() {
    // ---- SELF-REPORT (this is what we use to confirm deploy) ----
    console.log("[SL_AUTH] boot", {
      url: SUPABASE_URL,
      anonKey_len: (SUPABASE_ANON_KEY || "").length,
      file: document.currentScript && document.currentScript.src,
    });

    setStatus("Auth loading…");

    try {
      await waitForSupabase();
    } catch (e) {
      console.warn("[SL_AUTH] supabase-js not loaded:", e);
      setStatus("Auth failed to load (Supabase script missing).", "error");
      return;
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      setStatus("Auth not configured (missing Supabase anon key).", "error");
      console.warn("[SL_AUTH] Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
      return;
    }

    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    window.SL_AUTH = window.SL_AUTH || {};
    window.SL_AUTH.sb = sb;

    showReturnErrorIfAny();
    await exchangeIfCodePresent(sb);

    // initial session status
    try {
      const { data } = await sb.auth.getSession();
      const sess = data?.session || null;
      setStatus(sess?.user?.email ? `Signed in as ${sess.user.email}` : "Not signed in.");
    } catch {
      setStatus("Not signed in.");
    }

    sb.auth.onAuthStateChange((_evt, session) => {
      setStatus(session?.user?.email ? `Signed in as ${session.user.email}` : "Not signed in.");
    });

    const btn = els.send();
    const emailEl = els.email();
    if (!btn) {
      setStatus("Login UI missing send button.", "error");
      console.warn("[SL_AUTH] Send button not found (#sl-sendlink or #sl-send-btn).");
      return;
    }

    btn.addEventListener("click", async () => {
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

        setStatus("Link sent. Check your email (and spam/junk).", "ok");
      } catch (e) {
        console.warn("[SL_AUTH] signInWithOtp error:", e);
        setStatus("Could not send link. Try again.", "error");
      } finally {
        btn.disabled = false;
      }
    });

    setStatus("Ready.");
  }

  // expose readiness
  window.SL_AUTH = window.SL_AUTH || {};
  window.SL_AUTH.ready = (document.readyState === "loading"
    ? new Promise((resolve) =>
        document.addEventListener("DOMContentLoaded", resolve, { once: true })
      )
    : Promise.resolve()
  ).then(init);
})();




