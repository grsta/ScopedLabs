/* /assets/auth.js
   ScopedLabs upgrade/auth controller
   - Magic-link sign in (Supabase)
   - Checkout button uses your Worker endpoint
   - Stripe wiring comes from /assets/stripe-map.js (window.SCOPEDLABS_STRIPE)
*/

(function () {
  // -----------------------------
  // CONFIG (keep your real values)
  // -----------------------------
  const SUPABASE_URL = window.SUPABASE_URL || "REPLACE_WITH_SUPABASE_URL";
  const SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "REPLACE_WITH_SUPABASE_ANON_KEY";

  // Your Cloudflare Worker route (you added scopedlabs.com/api/* -> worker)
  // So front-end calls /api/* and CF routes it to the worker.
  const API_BASE = ""; // empty = same-origin

  // -----------------------------------------
  // OPTIONAL fallback mapping (not preferred)
  // (Prefer stripe-map.js as source of truth)
  // -----------------------------------------
  const PRICE_MAP = {
    // "thermal": "price_XXXX",
    // "wireless": "price_XXXX",
    // "compute": "price_XXXX",
    // "access-control": "price_XXXX",
  };

  // -----------------------------
  // Helpers
  // -----------------------------
  function $(sel) { return document.querySelector(sel); }
  function setText(sel, txt) { const el = $(sel); if (el) el.textContent = txt; }
  function setHTML(sel, html) { const el = $(sel); if (el) el.innerHTML = html; }

  function notConfigured() {
    return !SUPABASE_URL || SUPABASE_URL.startsWith("REPLACE_WITH_") ||
           !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.startsWith("REPLACE_WITH_");
  }

  async function loadSupabase() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error("Supabase JS not loaded. Make sure supabase-js v2 script is included before auth.js");
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function getCategoryFromURL() {
    const url = new URL(window.location.href);
    // supports /upgrade/?category=thermal and /upgrade/#?category=thermal
    const qp = url.searchParams.get("category");
    if (qp) return qp;

    if (url.hash) {
      const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
      // hash may be "checkout" or "?category=thermal#checkout" etc
      const hashUrl = new URL("https://x.local/" + hash.replace(/^\/?/, ""));
      const hcat = hashUrl.searchParams.get("category");
      if (hcat) return hcat;
    }
    return null;
  }

  function getStripeConfig(category) {
    // Preferred: /assets/stripe-map.js defines window.SCOPEDLABS_STRIPE
    const stripeMap = window.SCOPEDLABS_STRIPE || window.SCOPEDLABS_STRIPE_MAP || null;

    if (stripeMap && stripeMap[category]) {
      const cfg = stripeMap[category];
      return {
        label: cfg.label || category,
        priceId: cfg.priceId || cfg.priceid || cfg.price || null,
        productId: cfg.productId || cfg.productid || null,
        unlockKey: cfg.unlockKey || cfg.unlockkey || null
      };
    }

    // Fallback: legacy PRICE_MAP
    return {
      label: category,
      priceId: PRICE_MAP[category] || null,
      productId: null,
      unlockKey: null
    };
  }

  function money(num) {
    try {
      return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD" }).format(num);
    } catch {
      return "$" + String(num);
    }
  }

  // -----------------------------
  // Auth callback (magic link)
  // -----------------------------
  async function handleAuthCallback(sb) {
    // Supabase magic links can return either:
    // - PKCE: ?code=...
    // - hash: #access_token=...
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) console.error("exchangeCodeForSession:", error);

        // Clean URL so refresh doesn't re-run exchange
        url.searchParams.delete("code");
        url.searchParams.delete("type");
        url.searchParams.delete("redirect_to");
        window.history.replaceState({}, document.title, url.pathname + (url.search || "") + (url.hash || ""));
      }
    } catch (e) {
      console.warn("Auth callback handler skipped:", e);
    }
  }

  async function refreshUI(sb, category) {
    const { data } = await sb.auth.getSession();
    const session = data?.session || null;

    if (session?.user?.email) {
      setText("#sl-whoami", session.user.email);
      setText("#sl-status", `Signed in as ${session.user.email}`);
      document.body.classList.add("is-signed-in");
      document.body.classList.remove("is-signed-out");
    } else {
      setText("#sl-whoami", "");
      setText("#sl-status", "Not signed in");
      document.body.classList.add("is-signed-out");
      document.body.classList.remove("is-signed-in");
    }

    // category label / price config message
    if (category) {
      const cfg = getStripeConfig(category);
      setText("#sl-category", cfg.label || category);

      if (!cfg.priceId) {
        setText("#sl-checkout-msg", `No Stripe priceId configured for "${category}". Add it to /assets/stripe-map.js (priceId).`);
        const btn = $("#sl-checkout");
        if (btn) btn.disabled = true;
      } else {
        setText("#sl-checkout-msg", "");
        const btn = $("#sl-checkout");
        if (btn) btn.disabled = false;
      }
    }
  }

  // -----------------------------
  // Actions
  // -----------------------------
  async function sendMagicLink(sb) {
    const email = ($("#sl-email")?.value || "").trim();
    if (!email) return alert("Enter your email.");

    // IMPORTANT: must be in Supabase Auth -> URL Configuration as an allowed redirect
    const redirectTo = `${window.location.origin}/upgrade/`;

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo }
    });

    if (error) {
      console.error(error);
      alert("Failed to send magic link: " + error.message);
      return;
    }

    setText("#sl-email-hint", "Magic link sent. Check your inbox.");
  }

  async function signOut(sb) {
    await sb.auth.signOut();
    window.location.reload();
  }

  async function startCheckout(sb, category) {
    const cfg = getStripeConfig(category);
    if (!cfg.priceId) {
      alert(`No Stripe priceId configured for "${category}". Add it to stripe-map.js.`);
      return;
    }

    // Get session
    const { data } = await sb.auth.getSession();
    const session = data?.session || null;
    if (!session) {
      alert("Please sign in first.");
      return;
    }

    // Call your worker to create Stripe Checkout Session
    const res = await fetch(`${API_BASE}/api/create-checkout-session`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        // pass Supabase JWT so Worker can identify the user
        "authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        category,
        priceId: cfg.priceId,
        // where to return after payment
        successUrl: `${window.location.origin}/tools/?unlocked=1&category=${encodeURIComponent(category)}`,
        cancelUrl: `${window.location.origin}/upgrade/?category=${encodeURIComponent(category)}`
      })
    });

    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out?.url) {
      console.error("checkout error:", out);
      alert(out?.error || "Failed to start checkout.");
      return;
    }

    window.location.href = out.url;
  }

  // -----------------------------
  // Boot
  // -----------------------------
  async function boot() {
    if (notConfigured()) {
      console.warn("Supabase config placeholders detected in auth.js");
    }

    const category = getCategoryFromURL();

    // reflect selected category in UI (if you have element IDs)
    if (category) setText("#sl-category", category);

    const sb = await loadSupabase();

    await handleAuthCallback(sb);

    // keep UI synced if auth state changes
    sb.auth.onAuthStateChange(async () => {
      await refreshUI(sb, category);
    });

    await refreshUI(sb, category);

    // Wire buttons if they exist
    $("#sl-send-link")?.addEventListener("click", () => sendMagicLink(sb));
    $("#sl-signout")?.addEventListener("click", () => signOut(sb));
    $("#sl-checkout")?.addEventListener("click", () => startCheckout(sb, category));

    // enter-to-send magic link
    $("#sl-email")?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") sendMagicLink(sb);
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    boot().catch(err => {
      console.error(err);
      alert("Auth init failed. Check console.");
    });
  });
})();

