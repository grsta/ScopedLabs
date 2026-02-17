/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Key fixes:
   - Updates category pill across BOTH page variants (different IDs)
   - Shows signed-in UI on checkout when session exists
   - Never depends on #checkout hash on checkout page
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");
  const PRICE_TEXT = "$19.99";

  // Some pages use different IDs — support both.
  function pick(...ids) {
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) return el;
    }
    return null;
  }

  const els = {
    selectedCategoryPill: pick("selected-category", "sl-selected-category"),
    checkoutTitle: pick("sl-checkout-title", "checkout-title"),
    signedInAs: pick("sl-signed-in-as", "signed-in-as"),
    checkoutBtn: pick("sl-checkout", "checkout"),
    signoutBtn: pick("sl-signout", "signout"),
    status: pick("sl-status", "sl-email-hint"),
    checkoutGrid: pick("sl-checkout-grid"),
  };

  function setStatus(msg, isErr = false) {
    if (!els.status) return;
    els.status.textContent = msg || "";
    els.status.style.opacity = msg ? "1" : "";
    els.status.style.color = isErr ? "#ffb4b4" : "";
  }

  function getUrlCategory() {
    try {
      const u = new URL(location.href);
      return (u.searchParams.get("category") || "").trim();
    } catch {
      return "";
    }
  }

  function setUrlCategory(cat) {
    try {
      const u = new URL(location.href);
      if (cat) u.searchParams.set("category", cat);
      else u.searchParams.delete("category");
      history.replaceState({}, "", u.toString());
    } catch {}
  }

  function getStoredCategory() {
    try {
      return (localStorage.getItem("sl_selected_category") || "").trim();
    } catch {
      return "";
    }
  }

  function setStoredCategory(cat) {
    try {
      if (cat) localStorage.setItem("sl_selected_category", cat);
      else localStorage.removeItem("sl_selected_category");
    } catch {}
  }

  function currentCategory() {
    return getUrlCategory() || getStoredCategory() || "";
  }

  function applyCategory(cat) {
    cat = (cat || "").trim();
    setStoredCategory(cat);
    setUrlCategory(cat);

    if (els.selectedCategoryPill) {
      els.selectedCategoryPill.textContent = cat || "None selected";
    }

    if (els.checkoutTitle) {
      els.checkoutTitle.textContent = cat ? `Unlock ${cat}` : "Unlock a category";
    }

    renderPreviewCard(cat);
  }

  function getSb() {
    return window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null;
  }

  async function getSession() {
    const sb = getSb();
    if (!sb) return null;
    try {
      const { data } = await sb.auth.getSession();
      return (data && data.session) || null;
    } catch {
      return null;
    }
  }

  // ---------- Preview card injection ----------
  function findOrCreatePreviewHost() {
    const existing =
      pick("sl-category-preview", "sl-selected-category-preview", "selected-category-preview", "sl-category-preview-host");
    if (existing) return existing;

    if (els.checkoutGrid) {
      const host = document.createElement("div");
      host.id = "sl-category-preview-host";
      host.style.width = "100%";
      host.style.maxWidth = "440px";
      els.checkoutGrid.appendChild(host);
      return host;
    }
    return null;
  }

  function renderPreviewCard(cat) {
    const host = findOrCreatePreviewHost();
    if (!host) return;

    host.innerHTML = "";
    if (!cat) return;

    const title = cat.charAt(0).toUpperCase() + cat.slice(1);

    const card = document.createElement("div");
    card.className = "card";
    card.style.background = "rgba(0,0,0,.16)";

    card.innerHTML = `
      <span class="pill">🔒 Pro — Category Unlock</span>
      <h3 style="margin-top:.6rem;">${title}</h3>
      <p class="muted" style="margin-top:.6rem;">
        You are unlocking <strong>${title}</strong>.
      </p>
      <ul class="muted" style="margin-top:.75rem; line-height:1.55;">
        <li>All current Pro tools in this category</li>
        <li>All future Pro tools added here</li>
        <li>No renewals</li>
      </ul>
      <p class="muted" style="margin-top:.85rem;">
        One-time price: <strong>${PRICE_TEXT}</strong>
      </p>
    `;

    host.appendChild(card);
  }

  // ---------- Signed-in UI ----------
  function setSignedInUi(session) {
    const signedIn = !!(session && session.user);

    if (els.signedInAs) {
      els.signedInAs.textContent = signedIn ? `Signed in as ${session.user.email}` : "";
      els.signedInAs.style.display = signedIn ? "block" : "none";
    }

    if (els.signoutBtn) {
      els.signoutBtn.style.display = signedIn ? "" : "none";
    }

    if (els.checkoutBtn) {
      // Only show checkout button when signed in (checkout page)
      if (IS_CHECKOUT_PAGE) els.checkoutBtn.style.display = signedIn ? "" : "none";
    }

    if (IS_CHECKOUT_PAGE) {
      if (!signedIn) {
        setStatus("Signing you in…");
      } else {
        setStatus("");
      }
    }
  }

  // ---------- Checkout button wiring ----------
  function bindCheckoutButton() {
    if (!els.checkoutBtn) return;

    els.checkoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const sb = getSb();
      if (!sb) return;

      const cat = currentCategory();
      if (!cat) return;

      const session = await getSession();
      if (!session) {
        setStatus("Please sign in to continue.", true);
        return;
      }

      try {
        els.checkoutBtn.disabled = true;
        setStatus("Opening Stripe Checkout…");

        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: cat,
            email: session.user.email,
          }),
        });

        if (!res.ok) throw new Error("HTTP " + res.status);
        const data = await res.json();
        if (!data || !data.url) throw new Error("Missing checkout URL");

        location.href = data.url;
      } catch (err) {
        console.warn("[SL_APP] checkout error:", err);
        setStatus("Failed to start checkout", true);
        els.checkoutBtn.disabled = false;
      }
    });
  }

  async function boot() {
    // Wait for auth.js
    try {
      if (window.SL_AUTH && window.SL_AUTH.ready) await window.SL_AUTH.ready;
    } catch {}

    // Apply category immediately from URL
    applyCategory(currentCategory());

    // Listen for auth events from auth.js
    window.addEventListener("sl-auth-changed", (ev) => {
      const session = ev && ev.detail ? ev.detail.session : null;
      setSignedInUi(session);
      // Re-apply category after auth restore just in case
      applyCategory(currentCategory());
    });

    // Initial session check (covers “event fired before listener”)
    const s = await getSession();
    setSignedInUi(s);

    bindCheckoutButton();
  }

  boot();
})();

