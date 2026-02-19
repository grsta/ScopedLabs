/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller.

   Owns:
   - Category state (URL ?category= + localStorage)
   - Change Category routing between pages
   - Checkout button behavior on /upgrade/checkout/
   - Continue-to-checkout behavior on /upgrade/
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");

  const $ = (id) => document.getElementById(id);

  const els = {
    status: () => $("sl-status"),
    changeCat: () => $("sl-change-category"),
    // upgrade page
    upgradeCheckoutBtn: () => (!IS_CHECKOUT_PAGE ? $("sl-checkout") : null),
    upgradePreviewPill: () => (!IS_CHECKOUT_PAGE ? $("sl-selected-category-preview") : null),
    // checkout page
    checkoutPill: () => (IS_CHECKOUT_PAGE ? $("sl-category-pill") : null),
    checkoutBtn: () => (IS_CHECKOUT_PAGE ? $("sl-checkout") : null),
    signoutBtn: () => $("sl-signout"),
  };

  function setStatus(msg, kind = "") {
    const el = els.status();
    if (!el) return;
    el.textContent = msg || "";
    el.dataset.kind = kind || "";
  }

  function readCategory() {
    const p = new URLSearchParams(location.search);
    const q = (p.get("category") || "").trim();
    const ls = (localStorage.getItem("sl_selected_category") || "").trim();
    return q || ls || "";
  }

  function writeCategory(cat) {
    const clean = (cat || "").trim();
    if (clean) localStorage.setItem("sl_selected_category", clean);
    else localStorage.removeItem("sl_selected_category");

    const p = new URLSearchParams(location.search);
    if (clean) p.set("category", clean);
    else p.delete("category");

    const next = location.pathname + "?" + p.toString() + location.hash;
    history.replaceState({}, document.title, next);
  }

  function setCategoryUi(cat) {
    const label = cat || "None";
    const pill1 = els.upgradePreviewPill();
    const pill2 = els.checkoutPill();
    if (pill1) pill1.textContent = label;
    if (pill2) pill2.textContent = label;

    // Also reflect in title if present
    const title = $("sl-checkout-title");
    if (title) {
      if (cat) title.textContent = `Unlock ${cat}`;
      else title.textContent = "Unlock a category";
    }
  }

  function scrollToCategories() {
    // Your upgrade page uses #categories per URL behavior you showed
    const anchor = document.getElementById("categories");
    if (anchor) {
      anchor.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // fallback: do nothing
  }

  function goToUpgradeCategories(returnToCheckout = false) {
    const cat = readCategory();
    const p = new URLSearchParams();
    if (returnToCheckout) p.set("return", "checkout");
    if (cat) p.set("category", cat);
    location.href = "/upgrade/?" + p.toString() + "#categories";
  }

  function goToCheckoutFor(cat) {
    if (cat) writeCategory(cat);
    const chosen = readCategory();

    // If user has a session, go checkout, else keep them on upgrade (login is there)
    const sb = window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null;
    if (!sb) {
      // no auth system yet, just route
      location.href = "/upgrade/checkout/?" + (chosen ? `category=${encodeURIComponent(chosen)}` : "");
      return;
    }

    sb.auth.getSession().then(({ data }) => {
      const session = data && data.session ? data.session : null;
      if (session) {
        location.href =
          "/upgrade/checkout/?" + (chosen ? `category=${encodeURIComponent(chosen)}` : "");
      } else {
        // stay on upgrade and let them sign in
        setStatus("Sign in to continue.", "info");
        const email = $("sl-email");
        email?.focus?.();
      }
    });
  }

  function bindCategoryButtons() {
    // Any element with data-category should switch category
    const btns = Array.from(document.querySelectorAll("[data-category]"));
    btns.forEach((b) => {
      b.addEventListener("click", (e) => {
        const cat = (b.getAttribute("data-category") || "").trim();
        if (!cat) return;
        writeCategory(cat);
        setCategoryUi(cat);

        // If upgrade page is in "return=checkout" mode AND user is signed in, jump back to checkout
        const p = new URLSearchParams(location.search);
        const wantsReturn = p.get("return") === "checkout";
        if (wantsReturn) {
          const sb = window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null;
          if (!sb) return;
          sb.auth.getSession().then(({ data }) => {
            if (data && data.session) {
              location.href = "/upgrade/checkout/?" + `category=${encodeURIComponent(cat)}`;
            }
          });
        }
      });
    });
  }

  async function wireCheckoutButton() {
    const btn = els.checkoutBtn();
    if (!btn) return;

    btn.addEventListener("click", async () => {
      const sb = window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null;
      if (!sb) {
        setStatus("Auth not ready.", "error");
        return;
      }

      const { data } = await sb.auth.getSession();
      const session = data && data.session ? data.session : null;
      const cat = readCategory();

      if (!session) {
        setStatus("You must be signed in to checkout.", "warn");
        return;
      }
      if (!cat) {
        setStatus("Choose a category to continue.", "warn");
        return;
      }

      btn.disabled = true;
      setStatus("Opening Stripe Checkout…", "info");

      try {
        const r = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: cat,
            email: session.user.email,
          }),
        });

        const j = await r.json().catch(() => ({}));
        if (!r.ok || !j.url) throw new Error("bad response");
        location.href = j.url;
      } catch {
        setStatus("Failed to start checkout.", "error");
        btn.disabled = false;
      }
    });
  }

  function wireUpgradeContinueButton() {
    const btn = els.upgradeCheckoutBtn();
    if (!btn) return;

    btn.addEventListener("click", () => {
      const cat = readCategory();
      if (!cat) {
        setStatus("Choose a category first.", "warn");
        scrollToCategories();
        return;
      }
      goToCheckoutFor(cat);
    });
  }

  function wireChangeCategoryButton() {
    const btn = els.changeCat();
    if (!btn) return;

    btn.addEventListener("click", () => {
      // Always go to upgrade categories, preserving return=checkout when coming from checkout page
      if (IS_CHECKOUT_PAGE) {
        goToUpgradeCategories(true);
      } else {
        // On upgrade page, just scroll to categories section (no navigation loop)
        scrollToCategories();
      }
    });
  }

  async function init() {
    // wait for auth.js
    if (window.SL_AUTH && window.SL_AUTH.ready) {
      try {
        await window.SL_AUTH.ready;
      } catch {}
    }

    const cat = readCategory();
    if (cat) writeCategory(cat);
    setCategoryUi(readCategory());

    wireChangeCategoryButton();
    bindCategoryButtons();
    wireUpgradeContinueButton();
    await wireCheckoutButton();

    // If checkout page and no session, bounce back to upgrade checkout section
    if (IS_CHECKOUT_PAGE && window.SL_AUTH && window.SL_AUTH.sb) {
      const { data } = await window.SL_AUTH.sb.auth.getSession();
      if (!data || !data.session) {
        const c = readCategory();
        location.href =
          "/upgrade/?" + (c ? `category=${encodeURIComponent(c)}` : "") + "#checkout";
        return;
      }
    }

    // If upgrade page has return=checkout and user is signed in AND already has category, go back to checkout
    if (!IS_CHECKOUT_PAGE && window.SL_AUTH && window.SL_AUTH.sb) {
      const p = new URLSearchParams(location.search);
      const wantsReturn = p.get("return") === "checkout";
      const c = readCategory();
      if (wantsReturn && c) {
        const { data } = await window.SL_AUTH.sb.auth.getSession();
        if (data && data.session) {
          location.href = "/upgrade/checkout/?" + `category=${encodeURIComponent(c)}`;
          return;
        }
      }
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
