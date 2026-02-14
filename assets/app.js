/* /assets/app.js
   ScopedLabs Upgrade page logic (category selection + checkout)
*/
(() => {
  const byId = (id) => document.getElementById(id);

  // Must exist (auth.js sets SL_AUTH.sb)
  function getSB() {
    const sb = window.SL_AUTH?.sb;
    if (!sb) console.error("[app] Missing window.SL_AUTH.sb — is /assets/auth.js loaded first?");
    return sb;
  }

  function getCategoryFromUrl() {
    const sp = new URLSearchParams(location.search);
    return (sp.get("category") || "").trim() || null;
  }

  function setCategoryInUI(cat) {
    const label = byId("sl-category-label");
    if (label) label.textContent = cat ? (cat[0].toUpperCase() + cat.slice(1)) : "None selected";

    // If you have hidden input or data attrs, keep them in sync
    const hid = byId("sl-category");
    if (hid) hid.value = cat || "";
  }

  function shouldScrollToCheckout() {
    const sp = new URLSearchParams(location.search);
    return location.hash === "#checkout" || sp.get("checkout") === "1";
  }

  function scrollToCheckout() {
    const el = byId("checkout");
    if (!el) return;
    // small delay lets layout settle
    setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  }

  async function getUserEmail() {
    const sb = getSB();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session?.user?.email || null;
  }

  async function updateCheckoutButtons() {
    const email = await getUserEmail();
    const cat = getCategoryFromUrl();

    setCategoryInUI(cat);

    const checkoutBtn = byId("sl-checkout");
    if (checkoutBtn) checkoutBtn.disabled = !(email && cat);

    // Optional: if signed in but no category, show a hint
    const msg = byId("sl-msg");
    if (msg) {
      if (!email) msg.textContent = "";
      else if (!cat) msg.textContent = "Pick a category first.";
      else msg.textContent = "";
    }
  }

  async function createCheckoutSession() {
    const sb = getSB();
    const msg = byId("sl-msg");
    const setMsg = (t) => { if (msg) msg.textContent = t; };

    const email = await getUserEmail();
    const category = getCategoryFromUrl();

    if (!email) {
      setMsg("Please sign in first.");
      return;
    }
    if (!category) {
      setMsg("Choose a category first.");
      return;
    }

    // priceId lookup should come from your stripe-map.js
    // Expect: window.STRIPE_MAP[category].priceId
    const map = window.STRIPE_MAP || window.STRIPE_PRICE_MAP || null;
    const priceId = map?.[category]?.priceId;

    if (!priceId) {
      console.error("[app] Missing priceId for category:", category, map);
      setMsg("PriceId missing for this category.");
      return;
    }

    setMsg("Starting checkout…");

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          priceId
        })
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json?.ok) {
        console.error("[app] checkout error:", res.status, json);
        setMsg("Checkout error. Try again.");
        return;
      }

      // Worker should return a Stripe Checkout URL
      if (json.url) {
        window.location.href = json.url;
        return;
      }

      setMsg("Checkout error. Missing session URL.");
    } catch (e) {
      console.error("[app] checkout exception:", e);
      setMsg("Checkout error. Try again.");
    }
  }

  function wireUI() {
    const checkoutBtn = byId("sl-checkout");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        createCheckoutSession();
      });
    }

    const acctBtn = byId("sl-account");
    if (acctBtn) {
      acctBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // optional: send them to /account/ or show modal
        window.location.href = "/account/";
      });
    }
  }

  (async () => {
    wireUI();

    // update on load + whenever auth state changes
    await updateCheckoutButtons();

    const sb = getSB();
    if (sb) {
      sb.auth.onAuthStateChange(async () => {
        await updateCheckoutButtons();
        if (shouldScrollToCheckout()) scrollToCheckout();
      });
    }

    if (shouldScrollToCheckout()) scrollToCheckout();
  })();
})();
