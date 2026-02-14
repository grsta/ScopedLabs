/* /assets/auth.js
   ScopedLabs Upgrade Auth (Supabase v2)
   - Supports BOTH new IDs (authEmail/authSendLink/...) AND legacy IDs (sl-email/sl-sendlink/...)
   - Exposes window.SL_AUTH.sb
*/

(function () {
  const log = (...a) => console.log("[auth]", ...a);

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }

  // Prefer "new" IDs, fallback to legacy
  function pickEl(primary, fallback) {
    return $(primary) || $(fallback) || null;
  }

  // UI element contract (supports both variants)
  const el = {
    email:       () => pickEl("authEmail", "sl-email"),
    sendBtn:     () => pickEl("authSendLink", "sl-sendlink"),
    status:      () => pickEl("authStatus", "sl-status"),
    checkoutBtn: () => pickEl("checkoutBtn", "sl-checkout"),
    signOutBtn:  () => pickEl("signOutBtn", "sl-signout"),

    // Optional "signed in" row (only exists in new HTML; safe if missing)
    signedInRow: () => $("signedInRow"),
    signedInEmail: () => $("signedInEmail"),
  };

  function setStatus(msg) {
    const s = el.status();
    if (s) s.textContent = msg || "";
  }

  function setCheckoutEnabled(on) {
    const b = el.checkoutBtn();
    if (b) b.disabled = !on;
  }

  function showSignOut(on) {
    const b = el.signOutBtn();
    if (b) b.style.display = on ? "" : "none";
  }

  function showSignedInRow(on, email) {
    const row = el.signedInRow();
    const span = el.signedInEmail();
    if (row) row.style.display = on ? "" : "none";
    if (span && email) span.textContent = email;
  }

  // ---------- config ----------
  // stripe-map.js should set these:
  // window.SL_SUPABASE_URL, window.SL_SUPABASE_ANON_KEY
  // Back-compat: also allow window.SUPABASE_URL / window.SUPABASE_ANON_KEY
  function getConfig() {
    const url =
      window.SL_SUPABASE_URL ||
      window.SUPABASE_URL ||
      window.supabaseUrl ||
      null;

    const anon =
      window.SL_SUPABASE_ANON_KEY ||
      window.SUPABASE_ANON_KEY ||
      window.supabaseAnonKey ||
      null;

    return { url, anon };
  }

  function waitForConfig(timeoutMs = 8000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const t = setInterval(() => {
        const { url, anon } = getConfig();
        if (url && anon) {
          clearInterval(t);
          resolve({ url, anon });
          return;
        }
        if (Date.now() - start > timeoutMs) {
          clearInterval(t);
          reject(new Error("Supabase config missing (URL/ANON KEY)"));
        }
      }, 50);
    });
  }

  // ---------- main ----------
  async function init() {
    try {
      await new Promise((r) => document.readyState === "loading"
        ? document.addEventListener("DOMContentLoaded", r, { once: true })
        : r()
      );

      const { url, anon } = await waitForConfig();
      if (!window.supabase || !window.supabase.createClient) {
        throw new Error("Supabase v2 client missing (cdn not loaded)");
      }

      const sb = window.supabase.createClient(url, anon);
      window.SL_AUTH = { sb };
      log("Supabase client ready");

      // Handle magic-link callback if present (recommended flow)
      // Supabase by default returns ?code=... for PKCE
      const u = new URL(window.location.href);
      const code = u.searchParams.get("code");
      if (code) {
        setStatus("Signing you in…");
        const { data, error } = await sb.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("[auth] exchangeCodeForSession error:", error);
          setStatus("Sign-in failed. Try sending a new magic link.");
        } else {
          // Clean the URL (remove code param)
          u.searchParams.delete("code");
          window.history.replaceState({}, document.title, u.toString());
          setStatus("Signed in.");
        }
      }

      // Initial session
      const { data: sessData } = await sb.auth.getSession();
      const session = sessData?.session || null;
      if (session?.user?.email) {
        setStatus(`Signed in as ${session.user.email}`);
        showSignedInRow(true, session.user.email);
        showSignOut(true);
        setCheckoutEnabled(true);
      } else {
        setStatus("Not signed in");
        showSignedInRow(false);
        showSignOut(false);
        setCheckoutEnabled(false);
      }

      // Wire send button
      const sendBtn = el.sendBtn();
      if (sendBtn) {
        sendBtn.addEventListener("click", async () => {
          const emailEl = el.email();
          const email = (emailEl?.value || "").trim();

          if (!email || !email.includes("@")) {
            setStatus("Enter a valid email address.");
            return;
          }

          setStatus("Sending magic link…");

          // IMPORTANT: keep redirect clean (no hash/query) to avoid provider issues
          const emailRedirectTo = "https://scopedlabs.com/upgrade/";

          const { error } = await sb.auth.signInWithOtp({
            email,
            options: { emailRedirectTo }
          });

          if (error) {
            console.error("[auth] signInWithOtp error:", error);
            setStatus(error.message || "Unable to send magic link.");
            return;
          }

          setStatus("Magic link sent — check your email (and spam).");
        });
      } else {
        console.warn("[auth] Send button not found (authSendLink/sl-sendlink).");
      }

      // Wire sign out
      const signOutBtn = el.signOutBtn();
      if (signOutBtn) {
        signOutBtn.addEventListener("click", async () => {
          await sb.auth.signOut();
          setStatus("Signed out");
          showSignedInRow(false);
          showSignOut(false);
          setCheckoutEnabled(false);
        });
      }

      // Listen for auth state changes (if user returns signed in)
      sb.auth.onAuthStateChange((_evt, newSession) => {
        const email = newSession?.user?.email || "";
        if (email) {
          setStatus(`Signed in as ${email}`);
          showSignedInRow(true, email);
          showSignOut(true);
          setCheckoutEnabled(true);
        } else {
          setStatus("Not signed in");
          showSignedInRow(false);
          showSignOut(false);
          setCheckoutEnabled(false);
        }
      });

    } catch (e) {
      console.error("[auth] init failed:", e);
      setStatus("Auth init failed. Check console.");
    }
  }

  init();
})();
