/* /assets/app.js
   ScopedLabs Upgrade + Checkout controller (hardened)

   Behavior:
   - Category source of truth: URL ?category= then localStorage sl_selected_category
   - Upgrade page is the landing point after magic link:
       /upgrade/?category=<cat>#checkout (+ implicit hash tokens)
     Once session exists -> auto route to:
       /upgrade/checkout/?category=<cat>
   - Checkout page:
       requires session; if missing/otp error -> bounce back to /upgrade/?category=<cat>#checkout
   - BFCache safe: re-init on pageshow
*/

(() => {
  "use strict";

  const PATH = location.pathname;
  const IS_UPGRADE_PAGE = PATH === "/upgrade/" || PATH === "/upgrade/index.html";
  const IS_CHECKOUT_PAGE = PATH.startsWith("/upgrade/checkout");

  const els = {
    // shared-ish labels
    selectedLabel: document.getElementById("sl-selected-category-label"),
    selectedPillCheckout: document.getElementById("sl-selected-category"), // checkout pill
    categoryPillUpgrade: document.getElementById("sl-category-pill"),      // upgrade pill

    // buttons
    changeCategory: document.getElementById("sl-change-category"),
    continueBtn: document.getElementById("sl-continue"),
    accountBtn: document.getElementById("sl-account"),
    signoutBtn: document.getElementById("sl-signout"),

    // upgrade auth ui
    loginHint: document.getElementById("sl-login-hint"),
    email: document.getElementById("sl-email"),
    sendLink: document.getElementById("sl-sendlink"),
    authStatus: document.getElementById("sl-auth-status"),
    signedInLine: document.getElementById("sl-signedin"),

    // checkout ui
    checkoutStatus: document.getElementById("sl-status"),
    checkoutAuthState: document.getElementById("sl-auth-state"),
    mustSignin: document.getElementById("sl-must-signin"),

    // previews
    previewTitle: document.getElementById("sl-preview-title"),
    previewDesc: document.getElementById("sl-preview-desc"),
    previewBullets: document.getElementById("sl-preview-bullets"),
    previewFoot: document.getElementById("sl-preview-foot"),
    checkoutPreview: document.getElementById("sl-selected-category-preview-checkout"),
  };

  let sb = null;
  let session = null;
  let currentCategory = "";

  function normKebab(cat) {
    return String(cat || "").trim().toLowerCase().replace(/_/g, "-");
  }

  function getUrlCategory() {
    try {
      return normKebab(new URL(location.href).searchParams.get("category"));
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

  function hasAuthErrorParams() {
    try {
      const u = new URL(location.href);
      return !!(u.searchParams.get("error") || u.searchParams.get("error_code"));
    } catch {
      return false;
    }
  }

  function loadCategory() {
    const fromUrl = getUrlCategory();
    const fromLs = normKebab(localStorage.getItem("sl_selected_category"));
    const cat = fromUrl || fromLs || "";
    if (cat) {
      currentCategory = cat;
      localStorage.setItem("sl_selected_category", cat);
      if (fromUrl !== cat) setUrlCategory(cat);
    } else {
      currentCategory = "";
    }
  }

  function updateCategoryUI() {
    const label = currentCategory || "None selected";
    const pill = currentCategory || "None";

    if (els.selectedLabel) els.selectedLabel.textContent = label;
    if (els.selectedPillCheckout) els.selectedPillCheckout.textContent = pill;
    if (els.categoryPillUpgrade) els.categoryPillUpgrade.textContent = pill;

    updatePreviewUI();
    updateButtonsAndStatus();
  }

  function getCategoryData(cat) {
    const c = normKebab(cat);
    const m = window.SL_STRIPE_MAP || window.STRIPE_MAP || null;
    if (m?.categories?.[c]) return m.categories[c];
    if (m?.[c]) return m[c];
    if (window.STRIPE_CATEGORIES?.[c]) return window.STRIPE_CATEGORIES[c];

    return {
      title: c ? c.replace(/-/g, " ") : "Category",
      desc: "Includes examples like:",
      bullets: [],
      foot: "You’ll also receive future Pro tools added to this category.",
    };
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function updatePreviewUI() {
    if (!currentCategory) return;

    const data = getCategoryData(currentCategory);
    const title = data.title || currentCategory.replace(/-/g, " ");
    const desc = data.desc || "Includes examples like:";
    const bullets = Array.isArray(data.bullets) ? data.bullets : [];
    const foot = data.foot || "You’ll also receive future Pro tools added to this category.";

    // upgrade preview
    if (els.previewTitle) els.previewTitle.textContent = title;
    if (els.previewDesc) els.previewDesc.textContent = desc;
    if (els.previewBullets) {
      els.previewBullets.innerHTML = "";
      bullets.forEach((t) => {
        const li = document.createElement("li");
        li.textContent = String(t);
        els.previewBullets.appendChild(li);
      });
    }
    if (els.previewFoot) els.previewFoot.textContent = foot;

    // checkout preview container
    if (els.checkoutPreview) {
      els.checkoutPreview.innerHTML = `
        <div class="card" style="height:100%;">
          <div class="pill" style="margin-bottom:12px;">Included</div>
          <h3 style="margin:0 0 8px 0;">${escapeHtml(title)}</h3>
          <p class="muted" style="margin-top:0;">${escapeHtml(desc)}</p>
          ${
            bullets.length
              ? `<ul style="margin:0; padding-left:18px;">${bullets
                  .map((b) => `<li>${escapeHtml(String(b))}</li>`)
                  .join("")}</ul>`
              : ""
          }
          <div class="muted" style="margin-top:12px;">${escapeHtml(foot)}</div>
        </div>
      `;
    }
  }

  function setUpgradeAuthUiSignedIn(isSignedIn) {
    if (!IS_UPGRADE_PAGE) return;

    const show = (el, on) => {
      if (!el) return;
      el.style.display = on ? "" : "none";
    };

    show(els.loginHint, !isSignedIn);
    show(els.email, !isSignedIn);
    show(els.sendLink, !isSignedIn);

    show(els.accountBtn, !!isSignedIn);
    show(els.signoutBtn, !!isSignedIn);

    if (!isSignedIn && els.signedInLine) els.signedInLine.textContent = "";
  }

  function updateButtonsAndStatus() {
    const hasSession = !!session;
    const hasCat = !!currentCategory;

    // Hide "must sign in" notice on checkout if present
    if (els.mustSignin) els.mustSignin.style.display = hasSession ? "none" : "";

    // Upgrade page status
    if (IS_UPGRADE_PAGE && els.authStatus) {
      els.authStatus.textContent = hasSession ? "" : "Not signed in";
    }

    // Checkout auth line
    if (IS_CHECKOUT_PAGE && els.checkoutAuthState) {
      els.checkoutAuthState.textContent = hasSession && session?.user?.email
        ? `Signed in as ${session.user.email}`
        : "Not signed in";
    }

    // Button enable logic
    if (els.continueBtn) {
      // On upgrade page: Continue means "go to checkout page"
      // On checkout page: Continue means "start Stripe checkout"
      const ok = hasSession && hasCat;
      els.continueBtn.disabled = !ok;
    }

    // Checkout status text
    if (IS_CHECKOUT_PAGE && els.checkoutStatus) {
      if (!hasSession) els.checkoutStatus.textContent = "Sign in required.";
      else if (!hasCat) els.checkoutStatus.textContent = "Choose a category to continue.";
      else els.checkoutStatus.textContent = "";
    }
  }

  async function refreshSession() {
    if (!sb) return null;

    const { data } = await sb.auth.getSession();
    session = data?.session || null;

    if (IS_UPGRADE_PAGE) {
      const signedIn = !!session;
      setUpgradeAuthUiSignedIn(signedIn);
      if (signedIn && session?.user?.email && els.signedInLine) {
        els.signedInLine.textContent = `Signed in as ${session.user.email}`;
      }
    }

    updateButtonsAndStatus();
    return session;
  }

  function goUpgradeCheckoutAnchor() {
    const u = new URL("/upgrade/", location.origin);
    if (currentCategory) u.searchParams.set("category", currentCategory);
    u.hash = "#checkout";
    location.href = u.toString();
  }

  function routeUpgradeToCheckoutIfReady() {
  // Only auto-route when the user is on the checkout section of the upgrade page.
  // This prevents "Change category" (#categories) from snapping back to checkout.
  if (!IS_UPGRADE_PAGE) return;
  if (!session || !currentCategory) return;

  const hash = String(location.hash || "");
  if (hash !== "#checkout") return;

  location.href = "/upgrade/checkout/?category=" + encodeURIComponent(currentCategory);
}

  function wireChangeCategory() {
    if (!els.changeCategory) return;

    els.changeCategory.addEventListener("click", () => {
      const u = new URL("/upgrade/", location.origin);
      if (currentCategory) u.searchParams.set("category", currentCategory);
      u.searchParams.set("return", "checkout");
      u.hash = "#categories";
      location.href = u.toString();
    });
  }

  function wireAccount() {
    if (!els.accountBtn) return;
    els.accountBtn.addEventListener("click", () => {
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
        localStorage.removeItem("sl_selected_category");
        session = null;
        updateButtonsAndStatus();

        // If on checkout, bounce back to upgrade checkout section
        if (IS_CHECKOUT_PAGE) goUpgradeCheckoutAnchor();
      }
    });
  }

  let stripeSessionStarting = false;

async function startStripeCheckout() {

  if (stripeSessionStarting) return;
  stripeSessionStarting = true;

  if (!session || !currentCategory) return;

  if (els.checkoutStatus)
    els.checkoutStatus.textContent = "Opening secure checkout…";

  if (els.continueBtn)
    els.continueBtn.disabled = true;

  try {

    const r = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + session.access_token,
      },
      body: JSON.stringify({
        category: currentCategory,
        email: session.user.email,
        user_id: session.user.id,
      }),
    });

    const data = await r.json();

    if (!data.url) {
      throw new Error("Stripe session failed");
    }

    location.href = data.url;

  } catch (err) {

    console.error("Stripe checkout error:", err);

    if (els.checkoutStatus)
      els.checkoutStatus.textContent = "Unable to start checkout.";

    if (els.continueBtn)
      els.continueBtn.disabled = false;

    stripeSessionStarting = false;
  }
}

  function wireContinue() {
    if (!els.continueBtn) return;

    els.continueBtn.addEventListener("click", async () => {
      if (!session || !currentCategory) return;

      if (IS_UPGRADE_PAGE) {
        location.href = "/upgrade/checkout/?category=" + encodeURIComponent(currentCategory);
        return;
      }

      if (IS_CHECKOUT_PAGE) {
        await startStripeCheckout();
      }
    });
  }

  function wireUpgradeCategoryLinks() {
    if (!IS_UPGRADE_PAGE) return;

    // Sync localStorage on click so state survives navigation/back/cache
    document.querySelectorAll('a[href*="/upgrade/?category="]').forEach((a) => {
      a.addEventListener("click", () => {
        try {
          const u = new URL(a.href, location.origin);
          const cat = normKebab(u.searchParams.get("category"));
          if (cat) localStorage.setItem("sl_selected_category", cat);
        } catch {}
      });
    });
  }

  async function init() {
    if (!window.SL_AUTH || !window.SL_AUTH.ready) return;
    await window.SL_AUTH.ready;

    sb = window.SL_AUTH.sb;

    loadCategory();
    updateCategoryUI();

    // If checkout URL has otp/error params, immediately bounce to upgrade flow
    if (IS_CHECKOUT_PAGE && hasAuthErrorParams()) {
      goUpgradeCheckoutAnchor();
      return;
    }

    await refreshSession();

    wireChangeCategory();
    wireContinue();
    wireAccount();
    wireSignOut();
    wireUpgradeCategoryLinks();

    // If checkout page without session, bounce to upgrade checkout section
    if (IS_CHECKOUT_PAGE && !session) {
      goUpgradeCheckoutAnchor();
      return;
    }

    // If upgrade page has session + category and is in checkout flow, auto-route to checkout page
    if (IS_UPGRADE_PAGE) {
      routeUpgradeToCheckoutIfReady();
    }

    // Keep UI synced if auth changes (sign-in completes after magic link parse)
    if (sb && sb.auth && sb.auth.onAuthStateChange) {
      sb.auth.onAuthStateChange(async () => {
        await refreshSession();
        if (IS_UPGRADE_PAGE) routeUpgradeToCheckoutIfReady();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", init);
  window.addEventListener("pageshow", (e) => {
    // BFCache restore
    if (e.persisted) init();
  });
})();