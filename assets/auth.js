/* /assets/auth.js
   ScopedLabs Magic Link Auth — hardwired config + clear UX status

   Exposes:
     window.SL_AUTH = { sb, ready }

   Notes:
   - Uses Supabase JS v2 UMD (window.supabase.createClient)
   - Uses implicit flow to avoid PKCE/code exchange weirdness for magic links
*/
(() => {
  "use strict";

  // ---- HARDWIRED CONFIG (do not depend on stripe-map) ----
  const SUPABASE_URL = "https://ybnzjtuecirzajraddft.supabase.co";

  // Paste your anon key here EXACTLY (the full long JWT-looking string).
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlibnpqdHVlY2lyemFqcmFkZGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA1ODYwNjEsImV4cCI6MjA4NjE2MjA2MX0.502bvCMrfbdJV9yXcHgjJx_t6eVcTVc0AlqxIbb9AAM";

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

      // remove Supabase error/code params
      ["code", "error", "error_code", "error_description", "type"].forEach((k) =>
        u.searchParams.delete(k)
      );

      // If the URL hash contains implicit tokens (access_token, refresh_token, etc),
      // nuke the hash entirely unless it's a plain anchor like #checkout.
      const h = (u.hash || "").toLowerCase();
      const hasImplicitTokens =
        h.includes("access_token=") ||
        h.includes("refresh_token=") ||
        h.includes("token_type=") ||
        h.includes("expires_in=");

      if (hasImplicitTokens) {
        u.hash = "";
      } else {
        u.hash = keepHash;
      }

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

      // strip the error params so refresh doesn’t keep re-showing it
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

    // IMPORTANT: implicit flow for magic links (avoids PKCE mismatch / code exchange hangs)
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

    // If the user returned with an error, show it.
    showReturnErrorIfAny();

    // Initial session status (also clears any stale “Signing you in…”)
    await refreshSessionStatus(sb);

    // Keep UI in sync
    sb.auth.onAuthStateChange((_evt, session) => {
      if (session?.user?.email) setStatus(`Signed in as ${session.user.email}`, "ok");
      else setStatus("Not signed in.");
      // Clean any implicit tokens out of the URL once we have a stable state
      cleanAuthParams();
    });

    // Wire send button
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

        // The UX you asked for: show a clear message on the Upgrade page.
        setStatus("Magic link sent. Check your email (and spam/junk).", "ok");
      } catch (e) {
        console.warn("[SL_AUTH] signInWithOtp error:", e);
        setStatus("Could not send link. Try again.", "error");
      } finally {
        btn.disabled = false;
      }
    });

    // Optional sign out wiring (if button exists)
    const outBtn = els.signout();
    if (outBtn) {
      outBtn.addEventListener("click", async () => {
        try {
          outBtn.disabled = true;
          await sb.auth.signOut();
          try {
            localStorage.removeItem("sl_selected_category");
          } catch {}
          setStatus("Signed out.");
        } catch (e) {
          console.warn("[SL_AUTH] signOut error:", e);
          setStatus("Could not sign out.", "error");
        } finally {
          outBtn.disabled = false;
        }
      });
    }
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





