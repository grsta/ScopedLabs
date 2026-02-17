/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   - Sync category between URL ?category= and localStorage(sl_selected_category)
   - Update "Selected category" pill + title
   - Inject preview card into right column (robust to ID changes)
   - React to auth state via "sl-auth-changed" event from auth.js
   - Checkout page: requires session; calls POST /api/create-checkout-session
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");
  const PRICE_TEXT = "$19.99";

  const els = {
    // category UI
    selectedCategoryPill: document.getElementById("selected-category"),
    checkoutTitle: document.getElementById("sl-checkout-title"),

    // buttons
    changeCategoryBtn: document.getElementById("sl-change-category"),
    checkoutBtn: document.getElementById("sl-checkout"),
    signoutBtn: document.getElementById("sl-signout"),
    accountLink: document.querySelector('a[href="/account/"]'),

    // status areas
    status: document.getElementById("sl-status") || document.getElementById("sl-email-hint"),

    // containers
    checkoutGrid: document.getElementById("sl-checkout-grid"),
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
      const c = (u.searchParams.get("category") || "").trim();
      return c || "";
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
    refreshCheckoutEnabled();
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
    // accept multiple historical IDs
    const existing =
      document.getElementById("sl-category-preview") ||
      document.getElementById("sl-selected-category-preview") ||
      document.getElementById("selected-category-preview") ||
      document.getElementById("sl-category-preview-host");

    if (existing) return existing;

    // if checkout grid exists, create the right column host
    if (els.checkoutGrid) {
      const host = document.createElement("div");
      host.id = "sl-category-preview-host";
      host.style.width = "100%";
      host.style.maxWidth = "440px";
      host.style.marginTop = "0"; // keep aligned to top
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

    // Minimal, stable preview (no layout surprises)
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

  // ---------- Signed-in UI toggles ----------
  function setSignedInUi(session) {
    const signedIn = !!(session && session.user);

    // checkout page has a dedicated checkout button; upgrade page uses send-magic-link
    if (els.checkoutBtn) {
      els.checkoutBtn.style.display = signedIn ? "" : "none";
    }
    if (els.accountLink) {
      els.accountLink.style.display = signedIn ? "" : "none";
    }
    if (els.signoutBtn) {
      els.signoutBtn.style.display = signedIn ? "" : "none";
    }

    if (IS_CHECKOUT_PAGE) {
      if (!signedIn) {
        // bounce back to upgrade checkout section, preserving category
        const cat = currentCategory();
        const dest = `/upgrade/?${cat ? `category=${encodeURIComponent(cat)}` : ""}#checkout`;
        location.replace(dest);
        return;
      }
    }
  }

  function refreshCheckoutEnabled() {
    if (!els.checkoutBtn) return;
    const cat = currentCategory();
    // only enable on checkout page when signed in (session check is async; we’ll guard on click too)
    els.checkoutBtn.disabled = !cat;
    if (!cat) setStatus("Choose a category to continue.");
    else setStatus("");
  }

  // ---------- Navigation helpers ----------
  function goToCheckoutFor(cat) {
    applyCategory(cat);

    // signed-in users go straight to checkout page; signed-out stay on upgrade card
    getSession().then((s) => {
      if (s) {
        location.href = `/upgrade/checkout/?category=${encodeURIComponent(cat)}`;
      } else {
        location.href = `/upgrade/?category=${encodeURIComponent(cat)}#checkout`;
      }
    });
  }

  function bindCategoryButtons() {
    // Bind any button with data-category, OR id sl-unlock-<cat>, OR href containing ?category=
    const btns = Array.from(document.querySelectorAll("[data-category], a[href*='?category='], button[id^='sl-unlock-']"));

    btns.forEach((el) => {
      let cat = "";

      if (el.dataset && el.dataset.category) cat = el.dataset.category;
      if (!cat && el.id && el.id.startsWith("sl-unlock-")) cat = el.id.replace("sl-unlock-", "");
      if (!cat && el.tagName === "A") {
        try {
          const u = new URL(el.getAttribute("href"), location.origin);
          cat = (u.searchParams.get("category") || "").trim();
        } catch {}
      }

      cat = (cat || "").trim();
      if (!cat) return;

      el.addEventListener("click", (e) => {
        // Only intercept category links on upgrade/checkout flow pages
        if (!location.pathname.startsWith("/upgrade")) return;
        e.preventDefault();
        goToCheckoutFor(cat);
      });
    });
  }

  // ---------- Checkout button wiring ----------
  async function bindCheckoutButton() {
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

  function bindChangeCategory() {
    if (!els.changeCategoryBtn) return;
    els.changeCategoryBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // go back up to categories section
      location.href = "/upgrade/#choose";
    });
  }

  // ---------- Boot ----------
  async function boot() {
    // Wait for auth.js to be ready (or continue safely)
    try {
      if (window.SL_AUTH && window.SL_AUTH.ready) await window.SL_AUTH.ready;
    } catch {}

    // Initial category apply
    applyCategory(currentCategory());

    // Listen for auth changes from auth.js
    window.addEventListener("sl-auth-changed", (ev) => {
      const session = ev && ev.detail ? ev.detail.session : null;
      setSignedInUi(session);
      refreshCheckoutEnabled();
    });

    // Also do one initial session fetch (in case event already fired)
    const s = await getSession();
    setSignedInUi(s);
    refreshCheckoutEnabled();

    bindCategoryButtons();
    bindCheckoutButton();
    bindChangeCategory();

    // If we’re on upgrade page and hash is #checkout, ensure we actually sit there
    if (!IS_CHECKOUT_PAGE && location.hash === "#checkout") {
      setTimeout(() => {
        const checkout = document.getElementById("checkout");
        if (checkout && checkout.scrollIntoView) {
          checkout.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 120);
    }
  }

  boot();
})();

