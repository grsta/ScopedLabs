/* /assets/app.js
   ScopedLabs Upgrade/Checkout controller (SAFE + minimal).

   Fixes:
   - Always send Authorization: Bearer <access_token> to /api/create-checkout-session
   - Keep category in sync: URL ?category= OR localStorage(sl_selected_category)
   - Do NOT hide or manipulate login UI (email field / send link UI).
     auth.js owns sign-in UX.

   Assumes:
   - /assets/auth.js loads BEFORE this file
   - auth.js exposes: window.SL_AUTH = { sb, ready }
*/

(() => {
  "use strict";

  const LS_CAT = "sl_selected_category";
  const PATH = location.pathname || "/";
  const IS_CHECKOUT_PAGE = PATH.startsWith("/upgrade/checkout");

  // ---- helpers ----
  const $ = (id) => document.getElementById(id);

  const normalizeCat = (v) => {
    if (!v) return "";
    const s = String(v).trim().toLowerCase();
    return /^[a-z0-9-]+$/.test(s) ? s : "";
  };

  const getCategoryFromUrl = () => {
    const u = new URL(location.href);
    return normalizeCat(u.searchParams.get("category"));
  };

  const setCategoryInUrl = (cat) => {
    cat = normalizeCat(cat);
    const u = new URL(location.href);
    if (cat) u.searchParams.set("category", cat);
    else u.searchParams.delete("category");
    history.replaceState(null, "", u.toString());
  };

  const getCategoryFromStorage = () => {
    try {
      return normalizeCat(localStorage.getItem(LS_CAT) || "");
    } catch {
      return "";
    }
  };

  const setCategoryToStorage = (cat) => {
    try {
      cat = normalizeCat(cat);
      if (!cat) localStorage.removeItem(LS_CAT);
      else localStorage.setItem(LS_CAT, cat);
    } catch {}
  };

  const getCurrentCategory = () => {
    return getCategoryFromUrl() || getCategoryFromStorage() || "";
  };

  const paintCategory = (cat) => {
    const label = cat || "None selected";

    // Support multiple possible label targets without breaking anything:
    const candidates = [
      $("sl-selected-category"),
      $("sl-selected-pill"),
      $("sl-category"),
      $("sl-current-category"),
      $("sl-cat"),
    ].filter(Boolean);

    candidates.forEach((el) => (el.textContent = label));

    // Also support data-bind="selected-category"
    document
      .querySelectorAll("[data-bind='selected-category']")
      .forEach((el) => (el.textContent = label));
  };

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function waitForAuthReady(timeoutMs = 8000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (window.SL_AUTH && window.SL_AUTH.sb && window.SL_AUTH.ready) return true;
      await sleep(50);
    }
    return false;
  }

  async function getSession() {
    try {
      const sb = window.SL_AUTH?.sb;
      if (!sb) return null;
      const { data } = await sb.auth.getSession();
      return data?.session || null;
    } catch {
      return null;
    }
  }

  // ---- checkout start (AUTH HEADER FIX) ----
  async function startCheckout() {
    const statusEl = $("sl-status");
    const btn = $("sl-checkout");

    const cat = getCurrentCategory();
    if (!cat) {
      if (statusEl) statusEl.textContent = "Choose a category to continue.";
      return;
    }

    const session = await getSession();
    if (!session?.access_token) {
      if (statusEl) statusEl.textContent = "Please sign in to continue.";
      return;
    }

    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = "Opening Stripe Checkout…";

    const r = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`, // ✅ critical
      },
      body: JSON.stringify({
        category: cat,
        email: session.user?.email || "",
      }),
    });

    if (!r.ok) {
      let detail = "";
      try {
        const j = await r.json();
        detail = j?.detail || j?.error || "";
      } catch {}

      if (statusEl) {
        statusEl.textContent =
          r.status === 401
            ? "Session expired. Please sign out and sign back in."
            : `Failed to start checkout${detail ? ` (${detail})` : ""}`;
      }
      if (btn) btn.disabled = false;
      return;
    }

    const j = await r.json();
    if (!j?.url) {
      if (statusEl) statusEl.textContent = "Failed to start checkout (no url).";
      if (btn) btn.disabled = false;
      return;
    }

    location.href = j.url;
  }

  // ---- category buttons ----
  function wireCategoryButtons() {
    const btns = Array.from(document.querySelectorAll("[data-category]"));
    btns.forEach((b) => {
      b.addEventListener("click", async (e) => {
        e.preventDefault();
        const cat = normalizeCat(b.getAttribute("data-category"));
        if (!cat) return;

        setCategoryToStorage(cat);
        setCategoryInUrl(cat);
        paintCategory(cat);

        const session = await getSession();
        if (session?.user) {
          location.href = `/upgrade/checkout/?category=${encodeURIComponent(cat)}`;
        } else {
          // stay on upgrade and let auth.js handle magic link UX
          location.href = `/upgrade/?category=${encodeURIComponent(cat)}#checkout`;
        }
      });
    });
  }

  // ---- init ----
  async function init() {
    const ok = await waitForAuthReady(8000);
    if (!ok) return;

    try {
      await window.SL_AUTH.ready;
    } catch {}

    // Keep category synced immediately
    const cat = getCurrentCategory();
    if (cat) {
      setCategoryToStorage(cat);
      setCategoryInUrl(cat);
    }
    paintCategory(getCurrentCategory());

    wireCategoryButtons();

    // Wire checkout button (works on upgrade + checkout page)
    const checkoutBtn = $("sl-checkout");
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", (e) => {
        e.preventDefault();
        startCheckout();
      });
    }

    // If checkout page and not signed in, bounce back to upgrade checkout section
    if (IS_CHECKOUT_PAGE) {
      const session = await getSession();
      const cat2 = getCurrentCategory();
      if (!session?.user) {
        const back = cat2
          ? `/upgrade/?category=${encodeURIComponent(cat2)}#checkout`
          : "/upgrade/#checkout";
        location.replace(back);
      }
    }
  }

  // BFCache: re-init on back/forward restores
  window.addEventListener("pageshow", (e) => {
    if (e?.persisted) init();
  });

  document.addEventListener("DOMContentLoaded", init);
})();