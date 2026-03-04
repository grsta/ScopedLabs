/* /assets/app.js
   ScopedLabs Upgrade + Checkout controller

   Works with your current HTML IDs:
   Upgrade page:
     - #sl-selected-category-label
     - #sl-category-pill
     - #sl-change-category
     - #sl-continue
     - #sl-email, #sl-sendlink, #sl-account, #sl-signout
     - #sl-auth-status, #sl-signedin
     - preview: #sl-preview-title/#sl-preview-desc/#sl-preview-bullets/#sl-preview-foot

   Checkout page:
     - #sl-selected-category-label
     - #sl-selected-category
     - #sl-change-category
     - #sl-continue
     - #sl-account, #sl-signout
     - #sl-status, #sl-auth-state
     - preview container: #sl-selected-category-preview-checkout
*/

(() => {
  "use strict";

  const PATH = location.pathname;
  const IS_UPGRADE_PAGE = PATH === "/upgrade/" || PATH === "/upgrade/index.html";
  const IS_CHECKOUT_PAGE = PATH.startsWith("/upgrade/checkout");

  const sbReady = window.SL_AUTH?.ready;
  const getSb = () => window.SL_AUTH?.sb || null;

  // Elements (shared-ish)
  const els = {
    // labels
    selectedLabel: document.getElementById("sl-selected-category-label"),
    selectedPillCheckout: document.getElementById("sl-selected-category"), // checkout page pill
    categoryPillUpgrade: document.getElementById("sl-category-pill"),       // upgrade page pill

    // actions
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

    // preview (upgrade)
    previewTitle: document.getElementById("sl-preview-title"),
    previewDesc: document.getElementById("sl-preview-desc"),
    previewBullets: document.getElementById("sl-preview-bullets"),
    previewFoot: document.getElementById("sl-preview-foot"),

    // preview (checkout)
    checkoutPreview: document.getElementById("sl-selected-category-preview-checkout"),
  };

  let sb = null;
  let session = null;
  let currentCategory = "";

  // ---------- category helpers ----------
  function normKebab(cat) {
    // Site uses kebab-case; tolerate underscore inputs.
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

  function setCategory(cat) {
    const c = normKebab(cat);
    if (!c) return;
    currentCategory = c;
    localStorage.setItem("sl_selected_category", c);
    setUrlCategory(c);
    updateCategoryUI();
  }

  function updateCategoryUI() {
    const label = currentCategory || "None selected";
    const pill = currentCategory || "None";

    if (els.selectedLabel) els.selectedLabel.textContent = label;
    if (els.selectedPillCheckout) els.selectedPillCheckout.textContent = pill;
    if (els.categoryPillUpgrade) els.categoryPillUpgrade.textContent = pill;

    updatePreviewUI();
    updateContinueState();
  }

  // ---------- preview helpers ----------
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
      price: null,
    };
  }

  function updatePreviewUI() {
    if (!currentCategory) return;

    const data = getCategoryData(currentCategory);

    // Upgrade preview card
    if (els.previewTitle) els.previewTitle.textContent = data.title || "Category";
    if (els.previewDesc) els.previewDesc.textContent = data.desc || "Includes examples like:";

    if (els.previewBullets) {
      els.previewBullets.innerHTML = "";
      const bullets = Array.isArray(data.bullets) ? data.bullets : [];
      bullets.forEach((t) => {
        const li = document.createElement("li");
        li.textContent = String(t);
        els.previewBullets.appendChild(li);
      });
    }

    if (els.previewFoot) {
      els.previewFoot.textContent =
        data.foot || "You’ll also receive future Pro tools added to this category.";
    }

    // Checkout preview container — simplest: reuse same formatting if map has html,
    // otherwise create a small card.
    if (els.checkoutPreview) {
      const title = data.title || currentCategory.replace(/-/g, " ");
      const desc = data.desc || "Includes examples like:";
      const bullets = Array.isArray(data.bullets) ? data.bullets : [];

      els.checkoutPreview.innerHTML = `
        <div class="card" style="height:100%;">
          <div class="pill" style="margin-bottom:12px;">Included</div>
          <h3 style="margin:0 0 8px 0;">${escapeHtml(title)}</h3>
          <p class="muted" style="margin-top:0;">${escapeHtml(desc)}</p>
          ${bullets.length ? `<ul style="margin:0; padding-left:18px;">${bullets.map(b => `<li>${escapeHtml(String(b))}</li>`).join("")}</ul>` : ""}
          <div class="muted" style="margin-top:12px;">${escapeHtml(data.foot || "Future Pro tools included.")}</div>
        </div>
      `;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ---------- auth/session ----------
  async function refreshSession() {
    if (!sb) return null;
    const { data } = await sb.auth.getSession();
    session = data?.session || null;

    // Update upgrade auth UI
    if (IS_UPGRADE_PAGE) {
      const signedIn = !!session;
      toggleUpgradeAuthUi(signedIn);
      if (signedIn && session?.user?.email && els.signedInLine) {
        els.signedInLine.textContent = `Signed in as ${session.user.email}`;
      }
    }

    // Update checkout auth state label
    if (IS_CHECKOUT_PAGE && els.checkoutAuthState) {
      els.checkoutAuthState.textContent = session?.user?.email
        ? `Signed in as ${session.user.email}`
        : "Not signed in";
    }

    updateContinueState();
    return session;
  }

  function toggleUpgradeAuthUi(isSignedIn) {
    const show = (el, on) => {
      if (!el) return;
      el.style.display = on ? "" : "none";
    };

    // If signed in: hide email + sendlink + hint; show account/signout.
    show(els.loginHint, !isSignedIn);
    show(els.email, !isSignedIn);
    show(els.sendLink, !isSignedIn);

    show(els.accountBtn, !!isSignedIn);
    show(els.signoutBtn, !!isSignedIn);

    if (!isSignedIn && els.signedInLine) els.signedInLine.textContent = "";
  }

  function updateContinueState() {
    if (!els.continueBtn) return;

    const ok = !!session && !!currentCategory;
    els.continueBtn.disabled = !ok;

    if (IS_UPGRADE_PAGE && els.authStatus) {
      els.authStatus.textContent = session ? "" : "Not signed in";
    }
    if (IS_CHECKOUT_PAGE && els.checkoutStatus && !ok) {
      // Keep status minimal; only show when user tries or when missing.
      if (!session) els.checkoutStatus.textContent = "Sign in required.";
      else if (!currentCategory) els.checkoutStatus.textContent = "Choose a category to continue.";
      else els.checkoutStatus.textContent = "";
    }
  }

  // ---------- navigation ----------
  function wireChangeCategory() {
    if (!els.changeCategory) return;

    els.changeCategory.addEventListener("click", () => {
      // Always go back to upgrade categories list.
      // Preserve currently selected category in URL + localStorage.
      const cat = currentCategory || normKebab(localStorage.getItem("sl_selected_category"));
      const dest = new URL("/upgrade/", location.origin);
      if (cat) dest.searchParams.set("category", cat);
      dest.searchParams.set("return", "checkout");
      dest.hash = "#categories";
      location.href = dest.toString();
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
        if (IS_CHECKOUT_PAGE) location.href = "/upgrade/#checkout";
        if (IS_UPGRADE_PAGE) {
          toggleUpgradeAuthUi(false);
          updateContinueState();
        }
      }
    });
  }

  // ---------- checkout ----------
  async function startCheckout() {
    if (!session) {
      if (IS_CHECKOUT_PAGE && els.checkoutStatus) els.checkoutStatus.textContent = "Sign in required.";
      return;
    }
    if (!currentCategory) {
      if (IS_CHECKOUT_PAGE && els.checkoutStatus) els.checkoutStatus.textContent = "Choose a category to continue.";
      return;
    }

    if (els.checkoutStatus) els.checkoutStatus.textContent = "Opening Stripe Checkout…";
    if (els.continueBtn) els.continueBtn.disabled = true;

    try {
      const r = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + session.access_token,
        },
        body: JSON.stringify({
          category: currentCategory, // kebab-case (worker normalizes)
          email: session.user.email,
          user_id: session.user.id,
        }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok || !data.ok || !data.url) {
        throw new Error(data?.error || `bad_status_${r.status}`);
      }

      location.href = data.url;
    } catch (e) {
      console.error("[app.js] checkout failed", e);
      if (els.checkoutStatus) els.checkoutStatus.textContent = "Failed to start checkout.";
      if (els.continueBtn) els.continueBtn.disabled = false;
    }
  }

  function wireContinue() {
    if (!els.continueBtn) return;

    els.continueBtn.addEventListener("click", async () => {
      if (IS_UPGRADE_PAGE) {
        // Upgrade page "Continue" goes to checkout page
        if (!session || !currentCategory) return;
        location.href = "/upgrade/checkout/?category=" + encodeURIComponent(currentCategory);
        return;
      }
      if (IS_CHECKOUT_PAGE) {
        await startCheckout();
      }
    });
  }

  // ---------- upgrade page category selection ----------
  function wireUpgradeCategoryLinks() {
    if (!IS_UPGRADE_PAGE) return;

    // Your category cards are <a href="/upgrade/?category=access-control#checkout"> :contentReference[oaicite:3]{index=3}
    // We sync localStorage on click so it survives navigation/back/cache.
    const links = document.querySelectorAll('a[href*="/upgrade/?category="]');
    links.forEach((a) => {
      a.addEventListener("click", () => {
        try {
          const u = new URL(a.href, location.origin);
          const cat = normKebab(u.searchParams.get("category"));
          if (cat) localStorage.setItem("sl_selected_category", cat);
        } catch {}
      });
    });
  }

  // ---- Hide "You must be signed in" message when user is authenticated ----
function updateSigninNotice() {
  const notice = document.getElementById("sl-must-signin");
  if (!notice) return;

  if (currentSession && currentSession.user) {
    notice.style.display = "none";
  } else {
    notice.style.display = "";
  }
}

// run on load
updateSigninNotice();

// run whenever auth state changes
if (window.SL_AUTH && window.SL_AUTH.sb) {
  window.SL_AUTH.sb.auth.onAuthStateChange((_event, session) => {
    currentSession = session;
    updateSigninNotice();
  });
}
  // ---------- init ----------
  async function init() {
    if (!sbReady) return;

    await sbReady;
    sb = getSb();

    loadCategory();
    updateCategoryUI();

    await refreshSession();

    wireUpgradeCategoryLinks();
    wireChangeCategory();
    wireContinue();
    wireAccount();
    wireSignOut();

    // On checkout page, if no session, send user back to upgrade checkout section (with category preserved)
    if (IS_CHECKOUT_PAGE && !session) {
      const cat = currentCategory || normKebab(localStorage.getItem("sl_selected_category"));
      const dest = new URL("/upgrade/", location.origin);
      if (cat) dest.searchParams.set("category", cat);
      dest.hash = "#checkout";
      location.href = dest.toString();
      return;
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  // BFCache: re-run init on back/forward restores (fixes “works after refresh only”)
  window.addEventListener("pageshow", (e) => {
    if (e.persisted) init();
  });
})();