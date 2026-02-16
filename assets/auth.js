/* ScopedLabs Auth (Supabase v2)
   - Single client created here and shared via window.SL_AUTH.sb
   - Magic-link send
   - exchangeCodeForSession() handler
   - Session restore on load
   - Fires: window.dispatchEvent(new Event("sl-auth-ready")) when done
*/

(function () {
  "use strict";

  const SUPABASE_URL = window.SL_SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.SL_SUPABASE_ANON_KEY || "";

  // Minimal DOM helpers (safe if elements don't exist on some pages)
  const $ = (sel) => document.querySelector(sel);

  // Auth UI elements (upgrade page)
  const elEmail = () => $("#auth-email");
  const elSendBtn = () => $("#auth-send-link");
  const elStatus = () => $("#auth-status");
  const elSignedInWrap = () => $("#auth-signed-in");
  const elSignedOutWrap = () => $("#auth-signed-out");
  const elSignOutBtn = () => $("#auth-signout");

  function setStatus(msg, isError = false) {
    const s = elStatus();
    if (!s) return;
    s.textContent = msg || "";
    s.classList.toggle("error", !!isError);
  }

  function showSignedIn(email) {
    const inWrap = elSignedInWrap();
    const outWrap = elSignedOutWrap();
    if (inWrap) inWrap.style.display = "";
    if (outWrap) outWrap.style.display = "none";

    const emailEl = $("#auth-user-email");
    if (emailEl) emailEl.textContent = email || "";
  }

  function showSignedOut() {
    const inWrap = elSignedInWrap();
    const outWrap = elSignedOutWrap();
    if (inWrap) inWrap.style.display = "none";
    if (outWrap) outWrap.style.display = "";

    const emailEl = $("#auth-user-email");
    if (emailEl) emailEl.textContent = "";
  }

  function normalizeEmail(v) {
    return String(v || "").trim().toLowerCase();
  }

  function getRedirectTo() {
    // Always redirect back to /upgrade/ so code exchange can happen there.
    // Uses current origin so it works on prod + local without hardcoding.
    return `${window.location.origin}/upgrade/`;
  }

  async function init() {
    // Guard: Supabase library must be present
    if (!window.supabase || !window.supabase.createClient) {
      console.error("[SL_AUTH] Supabase JS v2 not loaded.");
      window.SL_AUTH = window.SL_AUTH || {};
      window.SL_AUTH.sb = null;
      window.SL_AUTH.ready = true;
      window.dispatchEvent(new Event("sl-auth-ready"));
      return;
    }

    // Guard: env must exist (you likely set these in assets/vars.js or inline)
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error("[SL_AUTH] Missing SUPABASE_URL / SUPABASE_ANON_KEY.");
      window.SL_AUTH = window.SL_AUTH || {};
      window.SL_AUTH.sb = null;
      window.SL_AUTH.ready = true;
      window.dispatchEvent(new Event("sl-auth-ready"));
      return;
    }

    // Create and expose the single shared client
    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });

    window.SL_AUTH = window.SL_AUTH || {};
    window.SL_AUTH.sb = sb;
    window.SL_AUTH.ready = false;

    // 1) If we came back from magic link with ?code=..., exchange it.
    // Note: detectSessionInUrl helps, but exchangeCodeForSession is the reliable path.
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");
      if (code) {
        setStatus("Signing you in…");
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) {
          console.warn("[SL_AUTH] exchangeCodeForSession error:", error);
          setStatus("Sign-in failed. Try again.", true);
        } else {
          // Remove ?code=... so refreshes don't re-run exchange
          url.searchParams.delete("code");
          url.searchParams.delete("type"); // sometimes present
          url.searchParams.delete("token_hash"); // sometimes present
          window.history.replaceState({}, "", url.toString());
          setStatus("Signed in.");
        }
      }
    } catch (e) {
      console.warn("[SL_AUTH] exchange handling exception:", e);
    }

    // 2) Restore current session
    let session = null;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) console.warn("[SL_AUTH] getSession error:", error);
      session = data?.session || null;
    } catch (e) {
      console.warn("[SL_AUTH] getSession exception:", e);
    }

    // 3) Wire UI
    function refreshUI(sess) {
      const userEmail = sess?.user?.email || "";
      if (sess && userEmail) {
        showSignedIn(userEmail);
      } else {
        showSignedOut();
      }
    }

    refreshUI(session);

    // Send magic link
    const sendBtn = elSendBtn();
    if (sendBtn) {
      sendBtn.addEventListener("click", async () => {
        const email = normalizeEmail(elEmail()?.value);
        if (!email || !email.includes("@")) {
          setStatus("Enter a valid email address.", true);
          return;
        }
        setStatus("Sending magic link…");
        sendBtn.disabled = true;
        try {
          const { error } = await sb.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: getRedirectTo()
            }
          });
          if (error) {
            console.warn("[SL_AUTH] signInWithOtp error:", error);
            setStatus("Could not send link. Try again.", true);
          } else {
            setStatus("Magic link sent. Check your email.");
          }
        } catch (e) {
          console.warn("[SL_AUTH] signInWithOtp exception:", e);
          setStatus("Could not send link. Try again.", true);
        } finally {
          sendBtn.disabled = false;
        }
      });
    }

    // Sign out
    const signOutBtn = elSignOutBtn();
    if (signOutBtn) {
      signOutBtn.addEventListener("click", async () => {
        setStatus("Signing out…");
        try {
          await sb.auth.signOut();
        } catch (e) {
          console.warn("[SL_AUTH] signOut exception:", e);
        }
        setStatus("");
        refreshUI(null);
        // Tell app.js to re-evaluate gate state
        window.dispatchEvent(new Event("sl-auth-changed"));
      });
    }

    // 4) Listen for auth changes and broadcast
    sb.auth.onAuthStateChange((_event, newSession) => {
      refreshUI(newSession);
      window.dispatchEvent(new Event("sl-auth-changed"));
    });

    // 5) Mark ready + broadcast handshake (this is the race-condition killer)
    window.SL_AUTH.ready = true;
    window.dispatchEvent(new Event("sl-auth-ready"));
  }

  // Run after DOM exists (defer already helps, but this is extra safe)
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
