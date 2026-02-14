/* ScopedLabs Auth + Checkout glue (magic link + checkout button)
   - Requires in HTML (in this order):
     1) window.SUPABASE_URL + window.SUPABASE_ANON_KEY set in <script>
     2) https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2
     3) /assets/stripe-map.js
     4) /assets/auth.js
*/

(() => {
  const API_BASE = ""; // same-origin

  const $ = (id) => document.getElementById(id);

  // Singleton Supabase client
  function getSupabase() {
    if (window.__sb) return window.__sb;

    if (!window.supabase?.createClient) throw new Error("Supabase JS not loaded");
    if (!window.SUPABASE_URL || !/^https?:\/\//.test(window.SUPABASE_URL)) {
      throw new Error("Invalid SUPABASE_URL (must be a valid http/https URL)");
    }
    if (!window.SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE_ANON_KEY");

    const sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        storageKey: "scopedlabs-auth", // avoid collisions
      },
    });

    window.__sb = sb; // debug: use __sb.from(...) etc
    return sb;
  }

  function getCategoryFromURL() {
    const u = new URL(window.location.href);
    return (u.searchParams.get("category") || "").trim();
  }

  function getStripeMap() {
    return window.SCOPEDLABS_STRIPE_MAP || window.STRIPE_MAP || null;
  }

  function getPriceIdForCategory(category) {
    const map = getStripeMap();
    if (!map) return null;
    return map?.[category]?.priceId || map?.[category]?.priceid || null;
  }

  function setStatus(msg) {
    const el = $("sl-status");
    if (el) el.textContent = msg || "";
  }

  function showSignedOut() {
    const authCard = $("sl-auth-card");
    const checkoutCard = $("sl-checkout-card");
    const signoutBtn = $("sl-signout");

    if (authCard) authCard.style.display = "";
    if (checkoutCard) checkoutCard.style.display = "none";
    if (signoutBtn) signoutBtn.style.display = "none";

    setStatus("Not signed in");
  }

  function showSignedIn(email) {
    const authCard = $("sl-auth-card");
    const checkoutCard = $("sl-checkout-card");
    const signoutBtn = $("sl-signout");

    if (authCard) authCard.style.display = "none";
    if (checkoutCard) checkoutCard.style.display = "";
    if (signoutBtn) signoutBtn.style.display = "";

    setStatus(email ? `Signed in as ${email}` : "Signed in");
  }

  async function refreshSessionUI() {
    const sb = getSupabase();
    const { data } = await sb.auth.getSession();
    const email = data?.session?.user?.email || "";
    if (data?.session) showSignedIn(email);
    else showSignedOut();
  }

  async function sendMagicLink() {
    const sb = getSupabase();
    const emailEl = $("sl-email");
    const email = (emailEl?.value || "").trim();
    if (!email) return setStatus("Enter an email.");

    setStatus("Sending magic link…");

    const redirectTo = `${window.location.origin}/upgrade/`; // lands back on upgrade
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      setStatus(`Error: ${error.message}`);
      return;
    }
    setStatus("Magic link sent. Check your email.");
  }

  async function signOut() {
    const sb = getSupabase();
    await sb.auth.signOut();
    showSignedOut();
  }

  async function startCheckout() {
    const category = getCategoryFromURL();
    const priceId = getPriceIdForCategory(category);

    if (!category) return setStatus("Missing category.");
    if (!priceId) return setStatus("No priceId configured for this category.");

    setStatus("Starting checkout…");

    const resp = await fetch(`${API_BASE}/api/create-checkout-session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ category, priceId }),
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok || !data?.ok || !data?.url) {
      setStatus(`Checkout error. ${data?.detail ? "Try again." : ""}`);
      console.error("checkout error:", data);
      return;
    }

    window.location.href = data.url;
  }

  // Boot
  document.addEventListener("DOMContentLoaded", async () => {
    try {
      // Wire buttons
      $("sl-sendlink")?.addEventListener("click", sendMagicLink);
      $("sl-checkout")?.addEventListener("click", startCheckout);
      $("sl-signout")?.addEventListener("click", signOut);

      const sb = getSupabase();

      // Handle auth changes
      sb.auth.onAuthStateChange(() => refreshSessionUI());

      await refreshSessionUI();

      // If URL has #checkout, scroll there (fix “lands at top” confusion)
      if (window.location.hash === "#checkout") {
        const el = document.getElementById("checkout");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } catch (e) {
      console.error(e);
      alert("Auth init failed. Check console.");
    }
  });
})();
