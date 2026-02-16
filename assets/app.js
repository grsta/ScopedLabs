/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Fixes:
   - Robustly finds the "Selected category" label/pill even if IDs drifted
   - Binds category unlock buttons/links via:
       data-category OR id="sl-unlock-<cat>" OR href contains ?category=
   - Syncs category across URL, localStorage, and UI
   - Checkout page requires session; otherwise bounces to /upgrade/#checkout
   - Sign out button wired
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");

  // Must be created by /assets/auth.js (loaded BEFORE this)
  const sb =
    (window.SL_AUTH && window.SL_AUTH.sb) ||
    (window.SL_AUTH && window.SL_AUTH.client) ||
    null;

  const $ = (id) => document.getElementById(id);

  // Elements (best-guess IDs)
  const els = {
    selectedLabel: $("sl-selected-category"),
    catPill: $("sl-category-pill"),
    catCardSelected: $("sl-checkout-selected"),
    changeCatBtn: $("sl-change-category"),

    loginCard: $("sl-login-card"),
    checkoutCard: $("sl-checkout-card"),
    checkoutBtn: $("sl-checkout"),
    signoutBtn: $("sl-signout"),
    status: $("sl-status"),
  };

  // Fallback finder for "None selected" pill if IDs don’t match
  function findCategoryLabelNode() {
    // If your HTML uses one of these IDs, we’ll catch it
    const byId =
      els.selectedLabel ||
      els.catPill ||
      els.catCardSelected ||
      $("sl-selected") ||
      $("selected-category") ||
      $("selectedCategory");

    if (byId) return byId;

    // Fallback: look for a pill-like element near “Selected category:”
    // (tries to avoid redesigning HTML)
    const candidates = document.querySelectorAll("span,div");
    for (const n of candidates) {
      const t = (n.textContent || "").trim().toLowerCase();
      if (t === "none selected") return n;
    }

    return null;
  }

  // State
  let currentCategory = "";
  let currentSession = null;

  function normCategory(v) {
    return (v || "").toString().trim().toLowerCase();
  }

  function getCategoryFromURL() {
    const u = new URL(location.href);
    return normCategory(u.searchParams.get("category"));
  }

  function getCategoryFromStorage() {
    try {
      return normCategory(localStorage.getItem("sl_selected_category"));
    } catch {
      return "";
    }
  }

  function setCategory(cat) {
    currentCategory = normCategory(cat);
    try {
      if (currentCategory) localStorage.setItem("sl_selected_category", currentCategory);
    } catch {}
  }

  function setStatus(msg) {
    if (els.status) els.status.textContent = msg || "";
  }

  function updateCategoryUI() {
    const cat = currentCategory || "";
    const labelNode = findCategoryLabelNode();

    // Update any known nodes
    if (els.selectedLabel) els.selectedLabel.textContent = cat ? cat : "None selected";
    if (els.catPill) els.catPill.textContent = cat ? cat : "None selected";
    if (els.catCardSelected) els.catCardSelected.textContent = cat ? cat : "None selected";

    // Update fallback node if needed
    if (labelNode && !els.selectedLabel && !els.catPill && !els.catCardSelected) {
      labelNode.textContent = cat ? cat : "None selected";
    }

    if (IS_CHECKOUT_PAGE && els.checkoutBtn) {
      els.checkoutBtn.disabled = !cat;
    }
  }

  async function refreshSession() {
    if (!sb) return null;
    const { data, error } = await sb.auth.getSession();
    if (error) return null;
    return data ? data.session : null;
  }

  function applySignedInUI(session) {
    const email = session?.user?.email || "user";
    setStatus(`Signed in as ${email}`);

    if (els.checkoutCard) els.checkoutCard.style.display = "";
    if (els.signoutBtn) els.signoutBtn.style.display = "";
    if (els.loginCard) els.loginCard.style.display = "none";
  }

  function applySignedOutUI() {
    setStatus("Not signed in");
    if (els.checkoutCard) els.checkoutCard.style.display = IS_CHECKOUT_PAGE ? "" : "none";
    if (els.signoutBtn) els.signoutBtn.style.display = "none";
    if (els.loginCard) els.loginCard.style.display = IS_CHECKOUT_PAGE ? "none" : "";
  }

  function extractCategoryFromNode(node) {
    if (!node) return "";

    // 1) data-category
    const dc = normCategory(node.dataset && node.dataset.category);
    if (dc) return dc;

    // 2) id="sl-unlock-thermal"
    const id = (node.id || "").trim();
    if (id.startsWith("sl-unlock-")) return normCategory(id.slice("sl-unlock-".length));

    // 3) href with ?category=
    const href = (node.getAttribute && node.getAttribute("href")) || "";
    if (href && href.includes("category=")) {
      try {
        const u = new URL(href, location.origin);
        const c = normCategory(u.searchParams.get("category"));
        if (c) return c;
      } catch {}
    }

    return "";
  }

  function setURLCategory(cat) {
    // Keep URL consistent so reload reflects selection
    const u = new URL(location.href);
    if (cat) u.searchParams.set("category", cat);
    else u.searchParams.delete("category");
    history.replaceState({}, "", u.toString());
  }

  function goToCheckoutFor(cat) {
    const c = normCategory(cat);
    if (!c) return;

    setCategory(c);
    setURLCategory(c);
    updateCategoryUI();

    if (currentSession) {
      location.href = "/upgrade/checkout/?category=" + encodeURIComponent(c);
    } else {
      location.href = "/upgrade/?category=" + encodeURIComponent(c) + "#checkout";
    }
  }

  function bindCategoryUnlockButtons() {
    document.addEventListener("click", (e) => {
      const target = e.target && e.target.closest ? e.target.closest("a,button") : null;
      if (!target) return;

      const cat = extractCategoryFromNode(target);
      if (!cat) return;

      // Hard stop: we own this click
      try {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      } catch {}

      goToCheckoutFor(cat);
    });
  }

  function bindChangeCategoryButton() {
    if (!els.changeCatBtn) return;

    els.changeCatBtn.addEventListener("click", (e) => {
      try {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      } catch {}

      const known = normCategory(currentCategory || getCategoryFromStorage());
      const url = known
        ? `/upgrade/?category=${encodeURIComponent(known)}#categories`
        : `/upgrade/#categories`;
      location.href = url;
    });
  }

  function bindCheckoutButton() {
    if (!els.checkoutBtn) return;
    if (els.checkoutBtn.dataset.boundCheckout) return;
    els.checkoutBtn.dataset.boundCheckout = "1";

    els.checkoutBtn.addEventListener("click", async (e) => {
      try {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      } catch {}

      if (!currentSession) return;
      if (!currentCategory) return;

      els.checkoutBtn.disabled = true;
      setStatus("Opening Stripe Checkout…");

      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: currentCategory,
            email: (currentSession.user && currentSession.user.email) || null,
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data = await res.json();
        if (!data || !data.url) throw new Error("Missing url");

        location.href = data.url;
      } catch (err) {
        els.checkoutBtn.disabled = false;
        setStatus("Failed to start checkout");
        console.error("[checkout] create session failed:", err);
      }
    });
  }

  function bindSignOut() {
    if (!els.signoutBtn) return;

    els.signoutBtn.addEventListener("click", async (e) => {
      try {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      } catch {}

      setStatus("Signing out…");
      try {
        await sb.auth.signOut();
      } catch (err) {
        console.error("[auth] signOut failed:", err);
      }

      currentSession = null;
      applySignedOutUI();

      const known = normCategory(currentCategory || getCategoryFromStorage());
      const url = known
        ? `/upgrade/?category=${encodeURIComponent(known)}#checkout`
        : `/upgrade/#checkout`;
      location.href = url;
    });
  }

  async function init() {
    if (!sb) {
      setStatus("Auth not ready. (auth.js must load before app.js)");
      return;
    }

    // Category sync on load
    const urlCat = getCategoryFromURL();
    const storedCat = getCategoryFromStorage();
    setCategory(urlCat || storedCat || "");
    updateCategoryUI();

    // Upgrade page: bind category buttons
    if (!IS_CHECKOUT_PAGE) bindCategoryUnlockButtons();

    // Checkout page: change category
    bindChangeCategoryButton();

    // Session restore
    currentSession = await refreshSession();

    if (currentSession) applySignedInUI(currentSession);
    else applySignedOutUI();

    if (IS_CHECKOUT_PAGE) {
      if (!currentSession) {
        const known = normCategory(currentCategory || getCategoryFromStorage());
        const url = known
          ? `/upgrade/?category=${encodeURIComponent(known)}#checkout`
          : `/upgrade/#checkout`;
        location.replace(url);
        return;
      }

      if (!currentCategory) setStatus("Choose a category to continue.");
      else setStatus(`Signed in as ${currentSession.user?.email || "user"}`);

      bindCheckoutButton();
      bindSignOut();
      return;
    }

    // Upgrade page final UI state
    if (currentSession) applySignedInUI(currentSession);
    else applySignedOutUI();

    // Debug helper
    window.SL_APP = {
      debug() {
        return {
          IS_CHECKOUT_PAGE,
          urlCategory: getCategoryFromURL(),
          storageCategory: getCategoryFromStorage(),
          currentCategory,
          hasLabelNode: !!findCategoryLabelNode(),
          labelNodeId: findCategoryLabelNode()?.id || null,
          signedIn: !!currentSession,
          email: currentSession?.user?.email || null,
        };
      },
    };
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

