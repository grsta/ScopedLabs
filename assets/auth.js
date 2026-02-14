/* /assets/auth.js
   ScopedLabs upgrade/auth controller
   - Magic-link sign in (Supabase)
   - Checkout button calls your Worker endpoint via /api/create-checkout-session
   - Stripe wiring comes from /assets/stripe-map.js (window.SCOPEDLABS_STRIPE)

   Required on upgrade page BEFORE this script:
     <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
     <script src="/assets/stripe-map.js"></script>

   And you must set:
     window.SUPABASE_URL = "https://xxxx.supabase.co";
     window.SUPABASE_ANON_KEY = "eyJ....";
*/

(function () {
  "use strict";

  const API_BASE = ""; // same-origin; CF route /api/* -> Worker

  const $id = (id) => document.getElementById(id);

  function getCategoryFromURL() {
    // canonical: /upgrade/?category=wireless#checkout
    try {
      const url = new URL(window.location.href);
      return (url.searchParams.get("category") || "").trim();
    } catch {
      return "";
    }
  }

  function setText(id, txt) {
    const el = $id(id);
    if (el) el.textContent = txt || "";
  }

  function setVisible(id, show) {
    const el = $id(id);
    if (el) el.style.display = show ? "" : "none";
  }

  function getStripeConfig(category) {
    const map = window.SCOPEDLABS_STRIPE || null;
    if (!map) return { error: "stripe-map missing (window.SCOPEDLABS_STRIPE is undefined)" };
    const cfg = map[category];
    if (!cfg) return { error: `No stripe-map entry for category "${category}"` };

    // tolerate different key casing to prevent “I see it with my eyes” issues
    const priceId =
      cfg.priceId ||
      cfg.priceID ||
      cfg.priceid ||
      cfg.price ||
      null;

    return { cfg, priceId, error: null };
  }

  function requireSupabaseConfig() {
    const url = (window.SUPABASE_URL || "").trim();
    const key = (window.SUPABASE_ANON_KEY || "").trim();

    if (!url || !/^https:\/\/.+\.supabase\.co\/?$/.test(url)) {
      return { ok: false, error: "Missing/invalid window.SUPABASE_URL on this page." };
    }
    if (!key || key.length < 40) {
      return { ok: false, error: "Missing/invalid window.SUPABASE_ANON_KEY on this page." };
    }
    return { ok: true, url, key };
  }

  async function loadSupabaseClient() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase client library missing. Ensure supabase-js v2 script loads BEFORE auth.js.");
    }

    const cfg = requireSupabaseConfig();
    if (!cfg.ok) throw new Error(cfg.error);

    return window.supabase.createClient(cfg.url, cfg.key, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "scopedlabs_auth_v1",
      },
    });
  }

  function buildEmailRedirectTo(category) {
    // Preserve category + land on checkout panel after auth.
    const base = `${window.location.origin}/upgrade/`;
    const q = category ? `?category=${encodeURIComponent(category)}` : "";
    return `${base}${q}#checkout`;
  }

  async function refreshUI(sb) {
    const { data } = await sb.auth.getSession();
    const session = data?.session || null;

    const who = $id("sl-whoami");
    if (who) who.textContent = session?.user?.email ? `Signed in as ${session.user.email}` : "Not signed in";

    // Toggle button visibility if present
    setVisible("sl-signout", !!session);
    setVisible("sl-account", !!session);
    setVisible("sl-checkout", !!session);

    return session;
  }

  async function handleMagicLinkSend(sb) {
    const category = getCategoryFromURL();
    const emailEl = $id("sl-email");
    const btn = $id("sl-sendlink");

    if (!emailEl || !btn) return;

    btn.addEventListener("click", async () => {
      try {
        const email = (emailEl.value || "").trim();
        if (!email || !email.includes("@")) {
          setText("sl-status", "Enter a valid email.");
          return;
        }

        setText("sl-status", "Sending magic link…");

        const emailRedirectTo = buildEmailRedirectTo(category);

        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { emailRedirectTo },
        });

        if (error) {
          console.error("signInWithOtp error:", error);
          setText("sl-status", `Failed: ${error.message || "error"}`);
          return;
        }

        setText("sl-status", "Check your email for the magic link.");
      } catch (e) {
        console.error(e);
        setText("sl-status", "Failed to send magic link. Check console.");
      }
    });
  }

  async function handleSignOut(sb) {
    const btn = $id("sl-signout");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      await sb.auth.signOut();
      setText("sl-status", "Signed out.");
      await refreshUI(sb);
    });
  }

  async function handleCheckout(sb) {
    const btn = $id("sl-checkout");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      try {
        const category = getCategoryFromURL();
        if (!category) {
          setText("sl-status", "Missing category in URL (?category=...).");
          return;
        }

        const { priceId, error } = getStripeConfig(category);
        if (error) {
          console.error("stripe-map error:", error);
          setText("sl-status", `Checkout not configured: ${error}`);
          return;
        }
        if (!priceId || String(priceId).includes("price_XXX")) {
          setText("sl-status", `No Stripe priceId configured for "${category}" in /assets/stripe-map.js`);
          return;
        }

        const { data } = await sb.auth.getSession();
        const token = data?.session?.access_token;
        if (!token) {
          setText("sl-status", "Not signed in.");
          return;
        }

        setText("sl-status", "Starting checkout…");

        const res = await fetch(`${API_BASE}/api/create-checkout-session`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ category, priceId }),
        });

        const payload = await res.json().catch(() => ({}));

        if (!res.ok) {
          console.error("checkout-session error:", res.status, payload);
          setText("sl-status", payload?.error || `Checkout failed (${res.status}). Check console.`);
          return;
        }

        const url = payload?.url;
        if (!url) {
          console.error("missing url in response:", payload);
          setText("sl-status", "Checkout failed: missing redirect URL.");
          return;
        }

        window.location.href = url;
      } catch (e) {
        console.error(e);
        setText("sl-status", "Checkout failed. Check console.");
      }
    });
  }

  async function main() {
    try {
      // Hard fail early (no placeholders)
      const cfg = requireSupabaseConfig();
      if (!cfg.ok) {
        console.error(cfg.error);
        alert("Auth init failed. Missing SUPABASE_URL / SUPABASE_ANON_KEY on this page.");
        return;
      }

      const sb = await loadSupabaseClient();

      // Exchange code for session (PKCE) if present; supabase-js usually does this automatically,
      // but detectSessionInUrl handles it. Refresh UI after.
      await refreshUI(sb);

      // Wire buttons
      await handleMagicLinkSend(sb);
      await handleSignOut(sb);
      await handleCheckout(sb);

      // Keep UI in sync
      sb.auth.onAuthStateChange(async () => {
        await refreshUI(sb);
      });

      // Optional: show category label / price label if elements exist
      const category = getCategoryFromURL();
      const catLabel = $id("sl-category");
      if (catLabel && category) catLabel.textContent = category;

      setText("sl-status", "");
    } catch (e) {
      console.error(e);
      alert("Auth init failed. Check console.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
