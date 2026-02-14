/* ScopedLabs Upgrade Page App
   - Reads stripe-map.js: window.SCOPEDLABS_STRIPE_MAP (category -> {label, priceId, unlockKey})
   - Uses auth.js: window.SCOPEDLABS_AUTH + window.SCOPEDLABS_SB
   - Wires: #sl-checkout, #sl-category-label, #sl-category-pill
   - Posts to Worker: POST /api/create-checkout-session
*/

(function () {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function setText(id, text) {
    const el = $(id);
    if (el) el.textContent = text;
  }

  function status(msg, isError) {
    const el = $("sl-status");
    if (!el) return;
    el.textContent = msg || "";
    el.style.opacity = msg ? "1" : "0";
    el.style.color = isError ? "#ffb4b4" : "";
  }

  function getCategory() {
    const u = new URL(window.location.href);
    return (u.searchParams.get("category") || "").trim();
  }

  function getStripeMap() {
    return window.SCOPEDLABS_STRIPE_MAP || null;
  }

  function getStripeEntry(category) {
    const map = getStripeMap();
    if (!map) return null;
    return map[category] || null;
  }

  function setCategoryUI(category) {
    const entry = getStripeEntry(category);

    if (!category || !entry) {
      setText("sl-category-label", "a category");
      setText("sl-category-pill", "None selected");
      status("Pick a category above to continue.", false);
      return;
    }

    setText("sl-category-label", entry.label || category);
    setText("sl-category-pill", entry.label || category);
    status("", false);
  }

  async function getSessionToken() {
    const sb = window.SCOPEDLABS_AUTH?.getClient?.();
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    return data?.session?.access_token || null;
  }

  async function createCheckoutSession(category) {
    const entry = getStripeEntry(category);
    if (!entry || !entry.priceId) {
      status("Missing price configuration for this category.", true);
      return null;
    }

    const token = await getSessionToken();
    if (!token) {
      status("Please sign in first (magic link).", true);
      return null;
    }

    const origin = window.location.origin;

    // Stripe should return here after payment
    const successUrl = `${origin}/tools/?unlocked=1&category=${encodeURIComponent(category)}`;
    const cancelUrl  = `${origin}/upgrade/?category=${encodeURIComponent(category)}#checkout`;

    status("Creating checkout…");

    const res = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        category,
        priceId: entry.priceId,
        unlockKey: entry.unlockKey || null,
        successUrl,
        cancelUrl,
      }),
    });

    let body = null;
    try { body = await res.json(); } catch (_) {}

    if (!res.ok || !body?.ok) {
      const detail = body?.detail || body?.error || `HTTP ${res.status}`;
      status(`Checkout error: ${detail}`, true);
      return null;
    }

    if (!body.url) {
      status("Checkout error: missing redirect url.", true);
      return null;
    }

    status("Redirecting to Stripe…");
    return body.url;
  }

  function wireCheckoutButton() {
    const btn = $("sl-checkout");
    if (!btn) return;

    btn.addEventListener("click", async () => {
      try {
        const category = getCategory();
        const url = await createCheckoutSession(category);
        if (url) window.location.href = url;
      } catch (err) {
        console.error(err);
        status(`Checkout error: ${err?.message || err}`, true);
      }
    });
  }

  function wireCategoryUI() {
    const category = getCategory();
    setCategoryUI(category);

    // If user lands on /upgrade/ with #checkout, keep them there
    if (window.location.hash === "#checkout") {
      const el = $("checkout");
      if (el) el.scrollIntoView({ behavior: "instant", block: "start" });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    wireCategoryUI();
    wireCheckoutButton();
  });
})();

