/* /assets/auth.js
   ScopedLabs Upgrade Auth (Magic Link) — stable implicit flow
   - One Supabase client only
   - Restores session from magic-link URL automatically
   - Supports multiple HTML id variants (send button, email input)
   Exposes:
     window.SL_AUTH = { sb, ready: Promise }
*/

(() => {
  "use strict";

  // ====== CONFIG (keeps stripe-map values if present) ======
  const SUPABASE_URL =
    (window.SL_SUPABASE && window.SL_SUPABASE.url) ||
    "https://ybnzjtuecirzajraddft.supabase.co";

  const SUPABASE_ANON_KEY =
    (window.SL_SUPABASE && window.SL_SUPABASE.anonKey) ||
    "PASTE_YOUR_ANON_KEY_HERE";

  // ====== helpers ======
  const $ = (id) => document.getElementById(id);

  const pickFirst = (...els) => {
    for (const el of els) if (el) return el;
    return null;
  };

  const normalizeEmail = (v) => (v || "").trim().toLowerCase();

  function getSelectedCategorySlug() {
    // your upgrade page shows selected category here:
    const el = pickFirst($("selected-category"), $("sl-category-pill"), $("sl-selected-category"));
    const raw = (el?.textContent || "").trim();
    if (!raw || raw.toLowerCase() === "none selected") return "";
    return raw;
  }

  function setStatus(msg, isError = false) {
    const st = pickFirst($("sl-status"), $("status"), $("sl-auth-status"));
    if (!st) return;
    st.textContent = msg || "";
    st.style.color = isError ? "#ffb3b3" : "";
  }

  function showSignedOut() {
    const loginCard = $("sl-login-card");
    const checkoutCard = $("sl-checkout-card");
    const signOutBtn = $("sl-signout");

    if (loginCard) loginCard.style.display = "";
    if (checkoutCard) checkoutCard.style.display = ""; // keep visible if your UX wants it visible
    // If you want to HIDE checkout until signed in, flip this to "none".
    // if (checkoutCard) checkoutCard.style.display = "none";

    if (signOutBtn) signOutBtn.style.display = "none";
  }

  function showSignedIn(user) {
    const loginCard = $("sl-login-card");
    const checkoutCard = $("sl-checkout-card");
    const signOutBtn = $("sl-signout");

    if (loginCard) loginCard.style.display = "none";
    if (checkoutCard) checkoutCard.style.display = "";
    if (signOutBtn) signOutBtn.style.display = "";

    setStatus(user?.email ? `Signed in as ${user.email}` : "Signed in.");
  }

  function stripAuthFromUrl() {
    // If Supabase returns tokens in URL hash, clean it up.
    // Preserve #checkout if that was the intended anchor.
    const href = window.location.href;
    const hasAuthHash =
      href.includes("access_token=") ||
      href.includes("refresh_token=") ||
      href.includes("type=recovery") ||
      href.includes("type=magiclink");

    if (!hasAuthHash) return;

    try {
      const u = new URL(window.location.href);
      // keep #checkout if user was sent there
      const keepCheckout = u.hash.includes("checkout");
      u.hash = keepCheckout ? "#checkout" : "";
      history.replaceState({}, "", u.toString());
    } catch {}
  }

  function resolveRedirectTo() {
    const cat = getSelectedCategorySlug();
    const origin = window.location.origin;

    // If a category is already chosen, send them to checkout page for that category.
    // Otherwise, send them back to upgrade and let them choose.
    if (cat) return `${origin}/upgrade/checkout/?category=${encodeURIComponent(cat)}`;
    return `${origin}/upgrade/#checkout`;
  }

  // ====== bootstrap ======
  function waitForSupabaseJs(timeoutMs = 8000) {
    const start = Date.now();
    return new Promise((resolve, reject) => {
      const tick = () => {
        if (window.supabase && typeof window.supabase.createClient === "function") {
          resolve(true);
          return;
        }
        if (Date.now() - start > timeoutMs) {
          reject(new Error("supabase-js not loaded"));
          return;
        }
        setTimeout(tick, 40);
      };
      tick();
    });
  }

  // Create EXACTLY ONE client (idempotent)
  function getOrCreateClient() {
    if (window.SL_AUTH && window.SL_AUTH.sb) return window.SL_AUTH.sb;

    if (!SUPABASE_URL || SUPABASE_URL.includes("PASTE_")) {
      console.warn("[SL_AUTH] Missing SUPABASE_URL in /assets/auth.js");
      return null;
    }
    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes("PASTE_")) {
      console.warn("[SL_AUTH] Missing SUPABASE_ANON_KEY in /assets/auth.js");
      return null;
    }

    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });

    return sb;
  }

  async function init() {
    await waitForSupabaseJs();

    const sb = getOrCreateClient();
    if (!sb) return;

    // Expose globally + ready promise
    if (!window.SL_AUTH) window.SL_AUTH = {};
    window.SL_AUTH.sb = sb;

    // Clean auth hash if present
    stripAuthFromUrl();

    // Initial session
    try {
      const { data } = await sb.auth.getSession();
      const session = data?.session || null;
      if (session?.user) showSignedIn(session.user);
      else showSignedOut();
    } catch (e) {
      console.warn("[SL_AUTH] getSession error:", e);
      showSignedOut();
    }

    // Listen for auth changes
    sb.auth.onAuthStateChange((_evt, session) => {
      if (session?.user) {
        showSignedIn(session.user);
        stripAuthFromUrl();
      } else {
        showSignedOut();
      }
    });

    // Bind Send magic link (support both ids)
    const emailEl = pickFirst($("sl-email"), $("sl-email-input"), $("email"));
    const sendBtn = pickFirst($("sl-sendlink"), $("sl-send-btn"));

    if (!sendBtn) {
      console.warn("[SL_AUTH] Missing magic-link button (#sl-sendlink or #sl-send-btn).");
    } else {
      sendBtn.addEventListener("click", async () => {
        const email = normalizeEmail(emailEl?.value);
        if (!email || !email.includes("@")) {
          setStatus("Enter a valid email.", true);
          return;
        }

        sendBtn.disabled = true;
        setStatus("Sending sign-in link…");

        try {
          const redirectTo = resolveRedirectTo();

          const { error } = await sb.auth.signInWithOtp({
            email,
            options: {
              emailRedirectTo: redirectTo,
            },
          });

          if (error) throw error;

          setStatus("Check your email for the sign-in link.");
        } catch (e) {
          console.warn("[SL_AUTH] signInWithOtp error:", e);
          setStatus("Could not send link. Check config and try again.", true);
        } finally {
          sendBtn.disabled = false;
        }
      });
    }

    // Bind sign out
    const signOutBtn = $("sl-signout");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", async () => {
        try {
          await sb.auth.signOut();
        } catch {}
        try {
          localStorage.removeItem("sl_selected_category");
        } catch {}
        window.location.href = "/upgrade/#checkout";
      });
    }
  }

  // window.SL_AUTH.ready must be a Promise
  if (!window.SL_AUTH) window.SL_AUTH = {};
  window.SL_AUTH.ready = (document.readyState === "loading"
    ? new Promise((resolve) => document.addEventListener("DOMContentLoaded", resolve, { once: true }))
    : Promise.resolve()
  ).then(() => init()).catch((e) => {
    console.warn("[SL_AUTH] init failed:", e);
  });
})();



