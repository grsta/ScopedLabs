/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Goals:
   - Always keep a "current category" in sync between:
     URL ?category=, localStorage(sl_selected_category), and UI label(s)
   - Bind all category unlock buttons/links (data-category OR id sl-unlock-<cat> OR href ?category=)
   - Routing rules:
       * If signed in: clicking a category unlock goes straight to /upgrade/checkout/?category=CAT
       * If NOT signed in: clicking a category unlock goes to /upgrade/?category=CAT#checkout
   - Checkout page:
       * Requires a valid session
       * Checkout button calls /api/create-checkout-session
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");
  const IS_UPGRADE_PAGE = location.pathname.startsWith("/upgrade/") && !IS_CHECKOUT_PAGE;

  // Must be created by /assets/auth.js
  const sb = window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null;
  const authReady = window.SL_AUTH && window.SL_AUTH.ready ? window.SL_AUTH.ready : Promise.resolve();

  const CATEGORY_LS_KEY = "sl_selected_category";

  const els = {
    // Common/Upgrade
    continueBtn: document.getElementById("sl-continue"),
    accountBtn: document.getElementById("sl-account"),
    signoutBtn: document.getElementById("sl-signout"),

    selectedCategoryPill: document.getElementById("sl-selected-category-pill"),
    selectedCategoryLabel: document.getElementById("sl-selected-category-label"),
    changeCategoryBtn: document.getElementById("sl-change-category"),

    priceEl: document.getElementById("sl-price"),
    authStatus: document.getElementById("sl-auth-status"),
    signedInLabel: document.getElementById("sl-signedin"),

    // Upgrade auth controls
    emailInput: document.getElementById("sl-email"),
    sendLinkBtn: document.getElementById("sl-sendlink"),
    loginHint: document.getElementById("sl-login-hint"),

    // Preview card
    previewTitle: document.getElementById("sl-preview-title"),
    previewDesc: document.getElementById("sl-preview-desc"),
    previewBullets: document.getElementById("sl-preview-bullets"),
    previewFoot: document.getElementById("sl-preview-foot"),

    // Checkout-only
    checkoutBtn: document.getElementById("sl-checkout"),
    statusEl: document.getElementById("sl-status"),
    mustSignin: document.getElementById("sl-must-signin"),
    chooseDifferentBtn: document.getElementById("sl-choose-different"),
  };

  let session = null;
  let currentCategory = null;

  function setText(el, text) {
    if (!el) return;
    el.textContent = text == null ? "" : String(text);
  }

  function setDisabled(el, disabled) {
    if (!el) return;
    el.disabled = !!disabled;
    if (disabled) el.setAttribute("aria-disabled", "true");
    else el.removeAttribute("aria-disabled");
  }

  function getCategoryFromUrl() {
    const u = new URL(location.href);
    const cat = u.searchParams.get("category");
    return cat && typeof cat === "string" ? cat.trim() : "";
  }

  function getCategoryFromStorage() {
    try {
      const v = localStorage.getItem(CATEGORY_LS_KEY);
      return v && typeof v === "string" ? v.trim() : "";
    } catch {
      return "";
    }
  }

  function setCategoryToStorage(cat) {
    try {
      if (!cat) localStorage.removeItem(CATEGORY_LS_KEY);
      else localStorage.setItem(CATEGORY_LS_KEY, cat);
    } catch {}
  }

  function setCategoryInUrl(cat, hash) {
    const u = new URL(location.href);
    if (cat) u.searchParams.set("category", cat);
    else u.searchParams.delete("category");

    // preserve return=checkout if present
    const ret = u.searchParams.get("return");
    if (ret) u.searchParams.set("return", ret);

    if (hash) u.hash = hash;
    history.replaceState({}, "", u.toString());
  }

  function resolveCategory() {
    const fromUrl = getCategoryFromUrl();
    const fromLs = getCategoryFromStorage();
    const cat = fromUrl || fromLs || "";
    currentCategory = cat || null;
    if (cat) {
      setCategoryToStorage(cat);
      // keep URL consistent
      if (fromUrl !== cat) setCategoryInUrl(cat, location.hash);
    }
  }

  function isSignedIn() {
    return !!(session && session.user && session.user.email);
  }

  function setUpgradeAuthUiSignedIn(signedIn) {
    // Upgrade page only: hide magic link controls when signed in
    if (!IS_UPGRADE_PAGE) return;

    if (els.emailInput) els.emailInput.style.display = signedIn ? "none" : "";
    if (els.sendLinkBtn) els.sendLinkBtn.style.display = signedIn ? "none" : "";
    if (els.loginHint) els.loginHint.style.display = signedIn ? "none" : "";
  }

  function updateCategoryUI() {
    const label = currentCategory ? currentCategory : "Select a category";
    const pill = currentCategory || "None";

    setText(els.selectedCategoryLabel, label);
    setText(els.selectedCategoryPill, pill);
  }

  function updatePreviewUI() {
    // Always render something so the preview card never looks "empty".
    if (!currentCategory) {
      if (els.previewTitle) els.previewTitle.textContent = "Category";
      if (els.previewDesc) els.previewDesc.textContent = "Select a category to see what’s included.";
      if (els.previewBullets) els.previewBullets.innerHTML = "";
      if (els.previewFoot) els.previewFoot.textContent = "";
      return;
    }

    const map = window.SCOPEDLABS_STRIPE || {};
    const item = map[currentCategory];

    if (!item) {
      if (els.previewTitle) els.previewTitle.textContent = currentCategory;
      if (els.previewDesc) els.previewDesc.textContent = "Includes examples like:";
      if (els.previewBullets) els.previewBullets.innerHTML = "";
      if (els.previewFoot) els.previewFoot.textContent = "";
      return;
    }

    if (els.previewTitle) els.previewTitle.textContent = item.label || currentCategory;
    if (els.previewDesc) els.previewDesc.textContent = "Includes examples like:";

    if (els.previewBullets) {
      const bullets = Array.isArray(item.bullets) ? item.bullets : [];
      els.previewBullets.innerHTML = bullets.map((b) => `<li>${escapeHtml(String(b))}</li>`).join("");
    }

    if (els.previewFoot) {
      els.previewFoot.textContent =
        item.footer ||
        `You’ll also receive future Pro tools added to ${item.label || currentCategory}.`;
    }
  }

  function updatePriceUI() {
    // Static price for now (per your current product strategy)
    if (!els.priceEl) return;
    els.priceEl.textContent = "$19.99";
  }

  function updateButtonsAndStatus() {
    const hasSession = isSignedIn();
    const hasCategory = !!currentCategory;

    // Hide "must sign in" notice on checkout if present
    if (els.mustSignin) els.mustSignin.style.display = hasSession ? "none" : "";

    // Account + Sign out should only show when signed in
    if (els.accountBtn) els.accountBtn.style.display = hasSession ? "" : "none";
    if (els.signoutBtn) els.signoutBtn.style.display = hasSession ? "" : "none";

    // Signed-in label
    if (els.signedInLabel) {
      if (hasSession) {
        els.signedInLabel.textContent = `Signed in as ${session.user.email}`;
        els.signedInLabel.style.display = "";
      } else {
        els.signedInLabel.textContent = "Not signed in";
        els.signedInLabel.style.display = "";
      }
    }

    // Status / hint line
    if (els.authStatus) {
      if (IS_CHECKOUT_PAGE) {
        els.authStatus.textContent = hasSession ? "" : "You must be signed in to continue.";
      } else {
        els.authStatus.textContent = "";
      }
    }

    // Continue / Checkout button gating
    if (els.continueBtn) setDisabled(els.continueBtn, !(hasSession && hasCategory));

    if (els.checkoutBtn) setDisabled(els.checkoutBtn, !(hasSession && hasCategory));
  }

  function escapeHtml(s) {
    return s
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function goToCheckoutFor(cat) {
    if (!cat) return;

    setCategoryToStorage(cat);

    if (isSignedIn()) {
      location.href = `/upgrade/checkout/?category=${encodeURIComponent(cat)}`;
    } else {
      location.href = `/upgrade/?category=${encodeURIComponent(cat)}#checkout`;
    }
  }

  function goUpgradeCheckoutAnchor(cat) {
    const url = cat
      ? `/upgrade/?category=${encodeURIComponent(cat)}#checkout`
      : "/upgrade/#checkout";
    location.href = url;
  }

  function wireCategoryCards() {
    // Any link/button with ?category=... should drive selection.
    const all = Array.from(document.querySelectorAll('a[href*="?category="], button[data-category]'));

    all.forEach((el) => {
      const isButton = el.tagName === "BUTTON";
      let cat = "";

      if (isButton) {
        cat = (el.getAttribute("data-category") || "").trim();
      } else {
        try {
          const href = el.getAttribute("href") || "";
          const u = new URL(href, location.origin);
          cat = (u.searchParams.get("category") || "").trim();
        } catch {}
      }

      if (!cat) return;

      el.addEventListener("click", (ev) => {
        // Let normal nav occur for non-upgrade pages
        if (!IS_UPGRADE_PAGE) return;

        ev.preventDefault();
        setCategoryToStorage(cat);
        currentCategory = cat;
        setCategoryInUrl(cat, "#checkout");

        updateCategoryUI();
        updatePreviewUI();
        updatePriceUI();
        updateButtonsAndStatus();

        // If returning to checkout and already signed in, jump directly to checkout
        const u = new URL(location.href);
        const ret = u.searchParams.get("return");
        if (ret === "checkout" && isSignedIn()) {
          location.href = `/upgrade/checkout/?category=${encodeURIComponent(cat)}`;
        }
      });
    });
  }

  function wireChangeCategory() {
    if (!els.changeCategoryBtn) return;

    els.changeCategoryBtn.addEventListener("click", (ev) => {
      ev.preventDefault();

      // Checkout page: return to upgrade categories view
      if (IS_CHECKOUT_PAGE) {
        const cat = currentCategory || getCategoryFromUrl() || getCategoryFromStorage();
        const url = cat
          ? `/upgrade/?category=${encodeURIComponent(cat)}&return=checkout#categories`
          : "/upgrade/?return=checkout#categories";
        location.href = url;
        return;
      }

      // Upgrade page: scroll to categories
      const cat = currentCategory || getCategoryFromUrl() || getCategoryFromStorage();
      const url = cat
        ? `/upgrade/?category=${encodeURIComponent(cat)}#categories`
        : "/upgrade/#categories";
      location.href = url;
    });
  }

  function wireContinue() {
    if (!els.continueBtn) return;

    els.continueBtn.addEventListener("click", (ev) => {
      ev.preventDefault();
      if (!currentCategory) return;

      if (isSignedIn()) {
        location.href = `/upgrade/checkout/?category=${encodeURIComponent(currentCategory)}`;
      } else {
        goUpgradeCheckoutAnchor(currentCategory);
      }
    });
  }

  function wireCheckoutButton() {
    if (!els.checkoutBtn) return;

    els.checkoutBtn.addEventListener("click", async (ev) => {
      ev.preventDefault();
      if (!isSignedIn() || !currentCategory) return;

      setDisabled(els.checkoutBtn, true);
      if (els.statusEl) els.statusEl.textContent = "Opening Stripe Checkout…";

      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: currentCategory,
            email: session.user.email,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data || !data.url) {
          throw new Error(data && data.error ? data.error : "checkout_failed");
        }

        location.href = data.url;
      } catch (e) {
        console.error("[app.js] checkout failed", e);
        if (els.statusEl) els.statusEl.textContent = "Failed to start checkout";
        setDisabled(els.checkoutBtn, false);
      }
    });
  }

  function wireAccount() {
    if (!els.accountBtn) return;
    els.accountBtn.addEventListener("click", (ev) => {
      // allow normal navigation (href may exist)
      if (els.accountBtn.tagName === "A") return;
      ev.preventDefault();
      location.href = "/account/";
    });
  }

  function wireSignOut() {
    if (!els.signoutBtn) return;

    els.signoutBtn.addEventListener("click", async () => {
      try {
        if (sb) await sb.auth.signOut();
      } catch (e) {
        console.error("[app.js] signOut failed", e);
      } finally {
        // Keep the selected category so user can immediately sign back in for the same lane,
        // but clear the session/UI.
        session = null;
        updateButtonsAndStatus();
        if (IS_UPGRADE_PAGE) setUpgradeAuthUiSignedIn(false);

        // Force a real navigation to avoid BFCache/race UI weirdness.
        const cat = currentCategory || getCategoryFromUrl() || getCategoryFromStorage();
        const url = cat
          ? `/upgrade/?category=${encodeURIComponent(cat)}#checkout`
          : "/upgrade/#checkout";

        location.href = url;
      }
    });
  }

  async function refreshSession() {
    if (!sb) return null;

    try {
      const { data } = await sb.auth.getSession();
      session = (data && data.session) || null;

      if (IS_UPGRADE_PAGE) setUpgradeAuthUiSignedIn(isSignedIn());

      updateButtonsAndStatus();
      return session;
    } catch (e) {
      console.error("[app.js] getSession failed", e);
      session = null;
      if (IS_UPGRADE_PAGE) setUpgradeAuthUiSignedIn(false);
      updateButtonsAndStatus();
      return null;
    }
  }

  function handleReturnToCheckout() {
    // If /upgrade/?return=checkout and signed in, selecting a category should jump to checkout.
    if (!IS_UPGRADE_PAGE) return;

    const u = new URL(location.href);
    const ret = u.searchParams.get("return");

    if (ret !== "checkout") return;

    // If category already chosen and signed in, go immediately to checkout.
    if (isSignedIn() && currentCategory) {
      location.href = `/upgrade/checkout/?category=${encodeURIComponent(currentCategory)}`;
    }
  }

  function init() {
    resolveCategory();
    updateCategoryUI();
    updatePreviewUI();
    updatePriceUI();

    wireCategoryCards();
    wireChangeCategory();
    wireContinue();
    wireCheckoutButton();
    wireAccount();
    wireSignOut();

    // If returning from checkout to pick a new category:
    // prevent BFCache confusion by rerunning init on pageshow.
    window.addEventListener("pageshow", () => {
      resolveCategory();
      updateCategoryUI();
      updatePreviewUI();
      updatePriceUI();
      updateButtonsAndStatus();
      handleReturnToCheckout();
    });

    updateButtonsAndStatus();
  }

  (async () => {
    await authReady;
    init();
    await refreshSession();
    handleReturnToCheckout();
  })();
})();