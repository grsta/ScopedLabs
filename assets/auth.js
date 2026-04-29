/* /assets/auth.js
   Supabase v2 implicit magic-link auth.
   - Creates ONE client and exposes: window.SL_AUTH = { sb, ready, __session }
   - Hydrates stored session on every page load
   - Handles session restore from email link
   - Owns Sign out click and resets sign-in UI cleanly
*/

(() => {
  "use strict";

  const SUPABASE_URL = window.SL_SUPABASE_URL || window.SUPABASE_URL || "";
  const SUPABASE_ANON_KEY = window.SL_SUPABASE_ANON_KEY || window.SUPABASE_ANON_KEY || "";

  if (!window.supabase || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[auth.js] Missing Supabase config or library.");
    window.SL_AUTH = { sb: null, ready: Promise.resolve(), __session: null };
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: "implicit",
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  let readyResolve;
  const ready = new Promise((res) => (readyResolve = res));

  window.SL_AUTH = {
    sb,
    ready,
    __session: null,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function setText(id, v) {
    const el = $(id);
    if (el) el.textContent = v == null ? "" : String(v);
  }

  function setAuthMessage(v) {
    setText("sl-auth-status", v);
    setText("sl-email-hint", v);
  }

  function withTimeout(promise, ms) {
    let timer;

    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error("auth_timeout")), ms);
      }),
    ]).finally(() => clearTimeout(timer));
  }

  function resetSignedOutUi() {
    const signed = $("sl-signedin");
    const status = $("sl-auth-status");
    const hint = $("sl-email-hint");
    const whoami = $("sl-whoami");
    const emailWrap = $("sl-email-wrap");
    const emailInput = $("sl-email");
    const sendLink = $("sl-sendlink");
    const signOut = $("sl-signout");

    if (signed) signed.textContent = "Not signed in";
    if (status) status.textContent = "Not signed in";
    if (hint) hint.textContent = "";
    if (whoami) whoami.textContent = "Not signed in";

    if (emailWrap) emailWrap.style.display = "";

    if (emailInput) {
      emailInput.disabled = false;
      emailInput.value = "";
    }

    if (sendLink) sendLink.disabled = false;
    if (signOut) signOut.disabled = false;
  }

  function getCategoryForRedirect() {
    try {
      const u = new URL(location.href);
      return u.searchParams.get("category") || localStorage.getItem("sl_selected_category") || "";
    } catch {
      return localStorage.getItem("sl_selected_category") || "";
    }
  }

  async function refreshUi() {
    const { data, error } = await sb.auth.getSession();

    if (error) {
      console.warn("[auth.js] getSession error:", error);
    }

    const session = data?.session || null;
    const email = session?.user?.email || "";

    window.SL_AUTH.__session = session;

    const signed = $("sl-signedin");
    const status = $("sl-auth-status");
    const whoami = $("sl-whoami");

    if (signed) signed.textContent = email ? `Signed in as ${email}` : "Not signed in";
    if (status) status.textContent = email ? `Signed in as ${email}` : "Not signed in";
    if (whoami) whoami.textContent = email ? `Signed in as ${email}` : "Not signed in";

    const emailWrap = $("sl-email-wrap");
    const emailInput = $("sl-email");

    if (emailWrap) emailWrap.style.display = email ? "none" : "";
    if (emailInput) emailInput.disabled = !!email;

    return session;
  }

  async function wireMagicLink() {
    const btn = $("sl-sendlink");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const emailEl = $("sl-email");
      const email = emailEl ? String(emailEl.value || "").trim() : "";

      if (!email) {
        setAuthMessage("Enter your email above.");
        return;
      }

      btn.disabled = true;
      setAuthMessage(`Sending magic link to ${email}…`);

      try {
        const cat = getCategoryForRedirect();

        const redirectTo = location.pathname.startsWith("/account/")
          ? `${location.origin}/account/`
          : `${location.origin}/upgrade/checkout/?category=${encodeURIComponent(cat || "")}`;

        const { error } = await withTimeout(
          sb.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: redirectTo },
          }),
          12000
        );

        if (error) throw error;

        setAuthMessage("Check your email for the sign-in link.");
      } catch (e) {
        console.error("[auth.js] magic link failed:", e);

        if (e?.message === "auth_timeout") {
          setAuthMessage("Magic link request timed out. Wait a moment and try again.");
        } else {
          setAuthMessage("Failed to send magic link. Wait a moment and try again.");
        }
      } finally {
        btn.disabled = false;
      }
    });
  }

  async function wireSignOut() {
    const btn = $("sl-signout");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      btn.disabled = true;
      setAuthMessage("Signing out…");

      try {
        await sb.auth.signOut();
      } catch (e) {
        console.warn("[auth.js] signOut error (continuing):", e);
      } finally {
        window.SL_AUTH.__session = null;

        try {
          localStorage.removeItem("sl_unlocked_categories");
        } catch {}

        resetSignedOutUi();

        if (location.pathname.startsWith("/account/")) {
          setAuthMessage("");
          return;
        }

        location.replace("/upgrade/#checkout");
      }
    });
  }

  async function cleanupAuthHashIfPresent() {
    const hash = location.hash || "";
    if (!hash) return;

    if (hash === "#checkout" || hash === "#categories") return;

    try {
      const u = new URL(location.href);
      u.hash = "";
      history.replaceState({}, "", u.toString());
    } catch {}
  }

  (async () => {
    try {
      await refreshUi();
      await cleanupAuthHashIfPresent();

      sb.auth.onAuthStateChange(async (_event, session) => {
        window.SL_AUTH.__session = session || null;

        if (!session) {
          resetSignedOutUi();
          return;
        }

        await refreshUi();
      });

      await wireMagicLink();
      await wireSignOut();
    } finally {
      readyResolve();
    }
  })();
})();