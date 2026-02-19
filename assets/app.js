/* /assets/app.js
   ScopedLabs Upgrade + Checkout controller (single script used by both pages).

   Key goals (stable, minimal, no layout coupling):
   - Keep current category synced between URL ?category= and localStorage(sl_selected_category)
   - Upgrade page:
       * If signed out -> send magic link (auth.js handles), show status
       * If signed in -> show "Continue to checkout" + "Sign out"
       * Category cards/buttons should route:
           - signed in -> /upgrade/checkout/?category=CAT
           - signed out -> /upgrade/?category=CAT#checkout
   - Checkout page:
       * Requires session; if none -> back to /upgrade/?category=...#checkout
       * "Choose a different category" -> /upgrade/?return=checkout#categories
       * Checkout button -> POST /api/create-checkout-session -> redirect to Stripe URL
*/

(() => {
  "use strict";

  const PATH = location.pathname || "";
  const IS_CHECKOUT_PAGE = PATH.startsWith("/upgrade/checkout");
  const IS_UPGRADE_PAGE = PATH.startsWith("/upgrade") && !IS_CHECKOUT_PAGE;

  const LS_KEY = "sl_selected_category";

  const $ = (id) => document.getElementById(id);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));

  const els = {
    // shared
    status: () => $("sl-status") || $("sl-auth-status") || $("status"),
    // upgrade page
    email: () => $("sl-email") || $("sl-email-input") || $("email"),
    sendLink: () => $("sl-sendlink") || $("sl-send-btn"),
    continueBtn: () => $("sl-continue-checkout") || $("sl-checkout-continue"),
    signout: () => $("sl-signout"),
    // checkout page
    checkoutBtn: () => $("sl-checkout"),
    changeCategory: () => $("sl-change-category") || $("sl-choose-category") || $("sl-change-cat"),
  };

  function setStatus(msg, kind = "info") {
    const st = els.status();
    if (!st) return;
    st.textContent = msg || "";
    st.dataset.kind = kind;
  }

  function getUrlParam(name) {
    try {
      return new URL(location.href).searchParams.get(name);
    } catch {
      return null;
    }
  }

  function setUrlParam(name, value, { replace = true } = {}) {
    try {
      const u = new URL(location.href);
      if (value === null || value === undefined || value === "") u.searchParams.delete(name);
      else u.searchParams.set(name, value);
      const next = u.pathname + (u.search ? u.search : "") + (u.hash ? u.hash : "");
      if (replace) history.replaceState({}, "", next);
      else history.pushState({}, "", next);
    } catch {}
  }

  function readCategory() {
    const fromUrl = (getUrlParam("category") || "").trim();
    if (fromUrl) return fromUrl;
    const fromLs = (localStorage.getItem(LS_KEY) || "").trim();
    return fromLs || "";
  }

  function writeCategory(cat, { pushUrl = true } = {}) {
    const clean = (cat || "").trim();
    if (clean) localStorage.setItem(LS_KEY, clean);
    if (pushUrl) setUrlParam("category", clean || null, { replace: true });
    renderCategory(clean);
  }

  function renderCategory(cat) {
    const clean = (cat || "").trim();

    const pill =
      $("sl-category-pill") ||
      $("selected-category") ||
      $("sl-selected-category") ||
      $("sl-selected-category-preview") ||
      $("sl-selected-category-pill");

    const title =
      $("sl-selected-title") ||
      $("sl-upgrade-title") ||
      $("upgrade-title");

    if (pill) pill.textContent = clean || "None";
    if (title) title.textContent = clean ? `Unlock ${clean}` : "Unlock a category";
  }

  function applyAuthUi(session) {
    const isAuthed = !!(session && session.user);

    const cont = els.continueBtn();
    const so = els.signout();
    const send = els.sendLink();
    const email = els.email();

    if (IS_UPGRADE_PAGE) {
      if (cont) cont.style.display = isAuthed ? "" : "none";
      if (so) so.style.display = isAuthed ? "" : "none";
      if (send) send.style.display = isAuthed ? "none" : "";
      if (email) email.disabled = isAuthed ? true : false;

      if (isAuthed) {
        setStatus(`Signed in as ${session.user.email}`, "ok");
      }
    }

    if (IS_CHECKOUT_PAGE) {
      if (so) so.style.display = isAuthed ? "" : "none";
      if (!isAuthed) setStatus("Please sign in to continue.", "warn");
      else setStatus(`Signed in as ${session.user.email}`, "ok");
    }
  }

  function goToCheckoutFor(cat, session) {
    const clean = (cat || "").trim();
    if (!clean) return;

    localStorage.setItem(LS_KEY, clean);

    if (session && session.user) {
      location.href = `/upgrade/checkout/?category=${encodeURIComponent(clean)}`;
    } else {
      location.href = `/upgrade/?category=${encodeURIComponent(clean)}#checkout`;
    }
  }

  function bindCategoryButtons(getSession) {
    const btns = [
      ...qsa("[data-category]"),
      ...qsa('button[id^="sl-unlock-"]'),
      ...qsa('a[id^="sl-unlock-"]'),
    ];

    btns.forEach((btn) => {
      if (btn.__sl_bound) return;
      btn.__sl_bound = true;

      const ds = (btn.dataset && btn.dataset.category) ? btn.dataset.category.trim() : "";
      const fromId = btn.id && btn.id.startsWith("sl-unlock-") ? btn.id.slice("sl-unlock-".length) : "";
      const cat = ds || fromId;
      if (!cat) return;

      btn.addEventListener("click", async (e) => {
        e.preventDefault();
        const session = await getSession();
        goToCheckoutFor(cat, session);
      });
    });
  }

  function bindUpgradeButtons(getSession) {
    const cont = els.continueBtn();
    if (cont && !cont.__sl_bound) {
      cont.__sl_bound = true;
      cont.addEventListener("click", async () => {
        const cat = readCategory();
        const session = await getSession();
        if (!cat) {
          setStatus("Choose a category to continue.", "warn");
          location.hash = "#categories";
          return;
        }
        if (!session || !session.user) {
          setStatus("Please sign in first.", "warn");
          location.hash = "#checkout";
          return;
        }
        location.href = `/upgrade/checkout/?category=${encodeURIComponent(cat)}`;
      });
    }

    const chg = els.changeCategory();
    if (IS_UPGRADE_PAGE && chg && !chg.__sl_bound) {
      chg.__sl_bound = true;
      chg.addEventListener("click", () => {
        location.hash = "#categories";
      });
    }
  }

  function bindCheckoutButtons(getSession, sb) {
    const change = els.changeCategory();
    if (IS_CHECKOUT_PAGE && change && !change.__sl_bound) {
      change.__sl_bound = true;
      change.addEventListener("click", () => {
        const cat = readCategory();
        const base = `/upgrade/?return=checkout${cat ? `&category=${encodeURIComponent(cat)}` : ""}#categories`;
        location.href = base;
      });
    }

    const so = els.signout();
    if (so && !so.__sl_bound && sb) {
      so.__sl_bound = true;
      so.addEventListener("click", async () => {
        try {
          await sb.auth.signOut();
        } catch {}
        localStorage.removeItem(LS_KEY);
        location.href = "/upgrade/#checkout";
      });
    }

    const btn = els.checkoutBtn();
    if (IS_CHECKOUT_PAGE && btn && !btn.__sl_bound) {
      btn.__sl_bound = true;
      btn.addEventListener("click", async () => {
        const session = await getSession();
        const cat = readCategory();

        if (!session || !session.user) {
          setStatus("Please sign in first.", "warn");
          location.href = `/upgrade/?category=${encodeURIComponent(cat || "")}#checkout`;
          return;
        }
        if (!cat) {
          setStatus("Choose a category to continue.", "warn");
          location.href = "/upgrade/?return=checkout#categories";
          return;
        }

        btn.disabled = true;
        setStatus("Opening Stripe Checkout…", "info");

        try {
          const res = await fetch("/api/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category: cat,
              email: session.user.email,
            }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data || !data.url) throw new Error("Bad response");

          location.href = data.url;
        } catch (e) {
          btn.disabled = false;
          setStatus("Failed to start checkout", "error");
          console.error("[SL] checkout error", e);
        }
      });
    }
  }

  async function main() {
    const ready = (window.SL_AUTH && window.SL_AUTH.ready) ? window.SL_AUTH.ready : Promise.resolve();
    await ready.catch(() => {});

    const sb = window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null;
    if (!sb) {
      setStatus("Auth not ready (Supabase client missing).", "error");
      return;
    }

    let currentSession = null;

    async function refreshSession() {
      try {
        const { data } = await sb.auth.getSession();
        currentSession = data && data.session ? data.session : null;
        return currentSession;
      } catch {
        currentSession = null;
        return null;
      }
    }

    const initialCat = readCategory();
    if (initialCat) writeCategory(initialCat, { pushUrl: true });
    else renderCategory("");

    await refreshSession();
    applyAuthUi(currentSession);

    if (IS_UPGRADE_PAGE) {
      const returnTo = (getUrlParam("return") || "").toLowerCase();
      if (returnTo === "checkout" && currentSession && currentSession.user) {
        const cat = readCategory();
        if (cat) {
          location.href = `/upgrade/checkout/?category=${encodeURIComponent(cat)}`;
          return;
        }
      }
    }

    if (IS_CHECKOUT_PAGE && (!currentSession || !currentSession.user)) {
      const cat = readCategory();
      location.href = `/upgrade/?category=${encodeURIComponent(cat || "")}#checkout`;
      return;
    }

    bindCategoryButtons(refreshSession);
    bindUpgradeButtons(refreshSession);
    bindCheckoutButtons(refreshSession, sb);

    sb.auth.onAuthStateChange(async (_event, session) => {
      currentSession = session || null;
      applyAuthUi(currentSession);
    });

    window.addEventListener("popstate", () => {
      const cat = readCategory();
      renderCategory(cat);
    });

    if (IS_UPGRADE_PAGE && location.hash === "#checkout") {
      const el = $("checkout") || $("sl-checkout-card") || $("sl-checkout");
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
