/* /assets/auth.js
   ScopedLabs upgrade/auth controller
   - Magic-link sign in (Supabase)
   - Checkout uses Cloudflare Worker endpoint (/api/create-checkout-session)
   - Stripe wiring source of truth: /assets/stripe-map.js (window.SCOPEDLABS_STRIPE)
*/

(function () {
  // ------------------------------------------------------------
  // CONFIG: must be provided by the page (recommended)
  // Put this in /upgrade/index.html (and any auth pages) BEFORE auth.js:
  // <script>
  //   window.SUPABASE_URL = "https://xxxx.supabase.co";
  //   window.SUPABASE_ANON_KEY = "eyJ...";
  // </script>
  // ------------------------------------------------------------
  const SUPABASE_URL = (window.SUPABASE_URL || "").trim();
  const SUPABASE_ANON_KEY = (window.SUPABASE_ANON_KEY || "").trim();

  // same-origin; your CF route scopedlabs.com/api/* -> worker handles it
  const API_BASE = "";

  // ------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  function pickFirstId(ids) {
    for (const id of ids) {
      const el = $(id);
      if (el) return el;
    }
    return null;
  }

  function setText(id, txt) {
    const el = $(id);
    if (el) el.textContent = txt == null ? "" : String(txt);
  }

  function show(id, on) {
    const el = $(id);
    if (!el) return;
    el.style.display = on ? "" : "none";
  }

  function getCategoryFromURL() {
    const u = new URL(window.location.href);
    return (u.searchParams.get("category") || "").trim();
  }

  function getCheckoutFlagFromURL() {
    const u = new URL(window.location.href);
    // we treat either #checkout or ?checkout=1 as intent
    const hash = (u.hash || "").toLowerCase();
    if (hash.includes("checkout")) return true;
    const qp = (u.searchParams.get("checkout") || "").trim();
    return qp === "1" || qp.toLowerCase() === "true";
  }

  function getStripeEntry(category) {
    const map = window.SCOPEDLABS_STRIPE || {};
    const entry = map[category];
    if (!entry) return null;

    // accept any casing people accidentally used
    const priceId = entry.priceId || entry.priceid || entry.priceID || "";
    const productId = entry.productId || entry.productid || entry.productID || "";
    const unlockKey = entry.unlockKey || entry.unlockkey || "";
    const label = entry.label || category;

    return {
      category,
      label,
      priceId: String(priceId).trim(),
      productId: String(productId).trim(),
      unlockKey: String(unlockKey).trim(),
    };
  }

  function supabaseMissing() {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return true;
    if (SUPABASE_URL.includes("REPLACE_WITH_")) return true;
    if (SUPABASE_ANON_KEY.includes("REPLACE_WITH_")) return true;
    return false;
  }

  async function loadSupabase() {
    if (supabaseMissing()) {
      throw new Error(
        "Supabase config missing. Ensure window.SUPABASE_URL and window.SUPABASE_ANON_KEY are set on the page BEFORE /assets/auth.js"
      );
    }
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      throw new Error("Supabase client library missing. Load supabase-js v2 BEFORE /assets/auth.js");
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  async function handleAuthCallback(sb) {
    // Supports:
    // - PKCE: ?code=...
    // - hash tokens: #access_token=...
    try {
      const url = new URL(window.location.href);
      const code = url.searchParams.get("code");

      if (code) {
        const { error } = await sb.auth.exchangeCodeForSession(code);
        if (error) console.error("exchangeCodeForSession:", error);

        // Clean URL so refresh won't re-run exchange
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
    const email = session?.user?.email || "";

    setText("sl-whoami", email ? `Signed in as ${email}` : "Not signed in");
    show("sl-signed-in", !!email);
    show("sl-signed-out", !email);

    // Show category label/price card bits if present
    const entry = getStripeEntry(category);
    if (entry) {
      setText("sl-category", entry.label);
    } else if (category) {
      setText("sl-category", category);
    }

    // If checkout button exists, disable it when we lack priceId
    const checkoutBtn = pickFirstId(["sl-checkout"]);
    if (checkoutBtn) {
      const ok = !!(entry && entry.priceId);
      checkoutBtn.disabled = !ok;
    }
  }

  async function sendMagicLink(sb) {
    const emailEl = pickFirstId(["sl-email", "email"]);
    const statusEl = pickFirstId(["sl-status"]);

    const email = (emailEl?.value || "").trim();
    if (!email) {
      if (statusEl) statusEl.textContent = "Enter an email address.";
      return;
    }

    // Remember last email to reduce friction
    try { localStorage.setItem("scopedlabs_email", email); } catch {}

    const category = getCategoryFromURL();
    const redirectTo = new URL("/upgrade/", window.location.origin);
    if (category) redirectTo.searchParams.set("category", category);

    // Keep their intent if they were going to checkout
    if (getCheckoutFlagFromURL()) redirectTo.hash = "checkout";

    if (statusEl) statusEl.textContent = "Sending magic link…";

    const { error } = await sb.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo.toString(),
      },
    });

    if (error) {
      console.error("signInWithOtp:", error);
      if (statusEl) statusEl.textContent = `Error: ${error.message || "Failed to send magic link"}`;
      return;
    }

    if (statusEl) statusEl.textContent = "Magic link sent. Check your email.";
  }

  async function signOut(sb) {
    await sb.auth.signOut();
  }

  async function startCheckout(sb, category) {
    const statusEl = pickFirstId(["sl-status"]);
    const entry = getStripeEntry(category);

    if (!entry || !entry.priceId) {
      const msg = `No Stripe priceId configured for "${category}". Add it in /assets/stripe-map.js.`;
      if (statusEl) statusEl.textContent = msg;
      else alert(msg);
      return;
    }

    const { data } = await sb.auth.getSession();
    const token = data?.session?.access_token;

    if (!token) {
      if (statusEl) statusEl.textContent = "Please sign in first (magic link).";
      return;
    }

    if (statusEl) statusEl.textContent = "Starting checkout…";

    const res = await fetch(`${API_BASE}/api/create-checkout-session`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        category: entry.category,
        priceId: entry.priceId,
      }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      console.error("Checkout session error:", res.status, txt);
      if (statusEl) statusEl.textContent = "Checkout failed. Check console.";
      return;
    }

    const json = await res.json();
    if (!json?.url) {
      console.error("Missing checkout url:", json);
      if (statusEl) statusEl.textContent = "Checkout failed. Missing url.";
      return;
    }

    window.location.href = json.url;
  }

  async function boot() {
    const category = getCategoryFromURL();

    // If stripe map isn't loaded, warn in console (auth still works)
    if (!window.SCOPEDLABS_STRIPE) {
      console.warn("stripe-map.js not loaded. Checkout requires window.SCOPEDLABS_STRIPE.");
    }

    const sb = await loadSupabase();

    // If you arrived from a magic link, exchange code for session
    await handleAuthCallback(sb);

    // Restore last email (nice UX)
    try {
      const last = localStorage.getItem("scopedlabs_email");
      const emailEl = pickFirstId(["sl-email", "email"]);
      if (last && emailEl && !emailEl.value) emailEl.value = last;
    } catch {}

    // Keep UI synced on auth changes
    sb.auth.onAuthStateChange(async () => {
      await refreshUI(sb, category);
    });

    await refreshUI(sb, category);

    // Button IDs vary across your pages; support all the common ones
    const sendBtn = pickFirstId(["sl-sendlink", "sl-send-link", "sl-send-magic"]);
    if (sendBtn) sendBtn.addEventListener("click", () => sendMagicLink(sb));

    const signOutBtn = pickFirstId(["sl-signout", "sl-sign-out"]);
    if (signOutBtn) signOutBtn.addEventListener("click", () => signOut(sb));

    const checkoutBtn = pickFirstId(["sl-checkout"]);
    if (checkoutBtn) checkoutBtn.addEventListener("click", () => startCheckout(sb, category));

    // Enter-to-send magic link
    const emailEl = pickFirstId(["sl-email", "email"]);
    if (emailEl) {
      emailEl.addEventListener("keydown", (e) => {
        if (e.key === "Enter") sendMagicLink(sb);
      });
    }

    // If they landed on /upgrade/#checkout, and they're already signed in, auto-advance is optional.
    // (Leaving off auto-advance to avoid surprise redirects.)
  }

  document.addEventListener("DOMContentLoaded", () => {
    boot().catch((err) => {
      console.error(err);
      alert("Auth init failed. Check console.");
    });
  });
})();
