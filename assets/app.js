/* /assets/app.js
   ScopedLabs Upgrade + Checkout controller (stable, single-source-of-truth)

   Fixes:
   - Selected category pill always updates (upgrade + checkout)
   - Preview bullets always render (even if stripe-map.js has no bullets)
   - Clicking a category updates + auto-scrolls to #checkout
   - #sl-must-signin hidden when signed in (display:none)
   - Sign out forces refresh (no stale UI)
   - Works with either window.SL_STRIPE_MAP OR window.SCOPEDLABS_STRIPE (your current stripe-map.js)
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");
  const LS_KEY = "sl_selected_category";

  const $ = (id) => document.getElementById(id);

  // --- Category copy used for preview (bullets/desc/foot) ---
  // Keep these stable and simple. You can refine later without touching flow logic.
  const CATEGORY_DETAILS = {
    "access-control": {
      title: "Access Control",
      desc: "Door hardware, credential formats, PoE power budgets, and deployment planning.",
      bullets: [
        "Controller sizing + expansion planning",
        "Power & cabling headroom checks",
        "Fail-safe / fail-secure impact modeling",
      ],
      foot: "You'll also receive future Pro tools added to Access Control.",
    },
    compute: {
      title: "Compute",
      desc: "Server sizing, workload estimates, and resource headroom planning.",
      bullets: [
        "Capacity planning (CPU/RAM/IO)",
        "Growth projections + utilization targets",
        "Performance vs. cost trade-offs",
      ],
      foot: "You'll also receive future Pro tools added to Compute.",
    },
    infrastructure: {
      title: "Infrastructure",
      desc: "Power chain planning, rack/room layout, and reliability baselines.",
      bullets: [
        "Rack power + UPS planning",
        "Cooling assumptions + load estimates",
        "Baseline redundancy planning",
      ],
      foot: "You'll also receive future Pro tools added to Infrastructure.",
    },
    network: {
      title: "Network",
      desc: "Bandwidth planning, latency budgets, and topology checks.",
      bullets: [
        "Bandwidth planner + contention",
        "Latency budget breakdown",
        "Oversubscription sanity checks",
      ],
      foot: "You'll also receive future Pro tools added to Network.",
    },
    performance: {
      title: "Performance",
      desc: "Throughput modeling, bottleneck checks, and efficiency planning.",
      bullets: [
        "Workload bottleneck mapping",
        "Headroom + utilization targets",
        "Cost/perf trade-offs",
      ],
      foot: "You'll also receive future Pro tools added to Performance.",
    },
    "physical-security": {
      title: "Physical Security",
      desc: "Coverage planning, system design, and reliability checks.",
      bullets: [
        "System sizing + power checks",
        "Recording/storage planning",
        "Design trade-offs",
      ],
      foot: "You'll also receive future Pro tools added to Physical Security.",
    },
    power: {
      title: "Power",
      desc: "UPS sizing, runtime estimates, and load planning.",
      bullets: [
        "UPS runtime + derating",
        "Battery sizing + headroom",
        "Load planning sanity checks",
      ],
      foot: "You'll also receive future Pro tools added to Power.",
    },
    "video-storage": {
      title: "Video Storage",
      desc: "Recording capacity planning and retention math.",
      bullets: [
        "Storage sizing by bitrate/retention",
        "Overhead + safety margin planning",
        "RAID impact + usable capacity",
      ],
      foot: "You'll also receive future Pro tools added to Video Storage.",
    },
    wireless: {
      title: "Wireless",
      desc: "Link planning, throughput estimates, and roaming thresholds.",
      bullets: [
        "Point-to-point link budget checks",
        "Throughput estimation sanity checks",
        "Roaming/threshold planning",
      ],
      foot: "You'll also receive future Pro tools added to Wireless.",
    },
    thermal: {
      title: "Thermal",
      desc: "Temperature, heat load, and environmental planning.",
      bullets: [
        "Heat load sanity checks",
        "Airflow / cooling assumptions",
        "Safety margin planning",
      ],
      foot: "You'll also receive future Pro tools added to Thermal.",
    },
  };

  // Support either mapping name:
  // - window.SL_STRIPE_MAP (older)
  // - window.SCOPEDLABS_STRIPE (your current stripe-map.js)
  function getStripeMap() {
    return (
      window.SL_STRIPE_MAP ||
      window.SCOPEDLABS_STRIPE ||
      window.STRIPE_MAP ||
      {}
    );
  }

  function normCat(raw) {
    if (!raw) return "";
    let s = String(raw).trim().toLowerCase();
    s = s.replace(/[\s_]+/g, "-");
    s = s.replace(/[^a-z0-9-]/g, "");
    return s;
  }

  function getCategoryFromUrl() {
    try {
      const u = new URL(location.href);
      return normCat(u.searchParams.get("category") || "");
    } catch {
      return "";
    }
  }

  function setCategoryInUrl(cat, push = true) {
    try {
      const u = new URL(location.href);
      if (cat) u.searchParams.set("category", cat);
      else u.searchParams.delete("category");

      const next = u.pathname + "?" + u.searchParams.toString() + u.hash;
      if (push) history.pushState({}, "", next.replace(/\?\#/, "#"));
      else history.replaceState({}, "", next.replace(/\?\#/, "#"));
    } catch {}
  }

  function saveCategory(cat) {
    try {
      if (cat) localStorage.setItem(LS_KEY, cat);
      else localStorage.removeItem(LS_KEY);
    } catch {}
  }

  function loadCategory() {
    const fromUrl = getCategoryFromUrl();
    if (fromUrl) return fromUrl;

    try {
      const v = normCat(localStorage.getItem(LS_KEY) || "");
      return v;
    } catch {
      return "";
    }
  }

  function scrollToCheckout() {
    const el = $("checkout");
    if (!el) return;
    // allow layout to settle
    setTimeout(() => {
      try {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch {
        location.hash = "#checkout";
      }
    }, 50);
  }

  function categoryExists(cat) {
    if (!cat) return false;
    const map = getStripeMap();
    if (map && map[cat]) return true;
    if (CATEGORY_DETAILS[cat]) return true;
    return false;
  }

  function getCategoryData(cat) {
    const map = getStripeMap();
    const base = CATEGORY_DETAILS[cat] || null;

    // If stripe map provides label, use it as title.
    const stripe = map && map[cat] ? map[cat] : null;
    const title =
      (stripe && (stripe.label || stripe.title)) ||
      (base && base.title) ||
      (cat ? cat.replace(/-/g, " ") : "Category");

    return {
      title,
      desc: (base && base.desc) || "",
      bullets: (base && base.bullets) || [],
      foot: (base && base.foot) || "You'll also receive future Pro tools added to this category.",
    };
  }

  function updatePreview(cat) {
    const titleEl = $("sl-preview-title");
    const descEl = $("sl-preview-desc");
    const bulletsEl = $("sl-preview-bullets");
    const footEl = $("sl-preview-foot");

    if (!titleEl && !descEl && !bulletsEl && !footEl) return;

    if (!cat) {
      if (titleEl) titleEl.textContent = "Category";
      if (descEl) descEl.textContent = "Includes examples like:";
      if (bulletsEl) bulletsEl.innerHTML = "";
      if (footEl) footEl.textContent = "You'll also receive future Pro tools added to this category.";
      return;
    }

    const d = getCategoryData(cat);

    if (titleEl) titleEl.textContent = d.title;
    if (descEl) descEl.textContent = "Includes examples like:";

    if (bulletsEl) {
      bulletsEl.innerHTML = "";
      (d.bullets || []).forEach((b) => {
        const li = document.createElement("li");
        li.textContent = b;
        bulletsEl.appendChild(li);
      });
    }

    if (footEl) {
      // Replace any slug mention with pretty title if needed
      footEl.textContent = d.foot.replace(new RegExp(cat, "gi"), d.title);
    }
  }

  function updateSelectedUI(cat) {
    // Upgrade page pill
    const pillUpgrade = $("sl-category-pill");
    if (pillUpgrade) pillUpgrade.textContent = cat || "None";

    // Checkout page pill/label
    const pillCheckout = $("sl-selected-category");
    if (pillCheckout) pillCheckout.textContent = cat || "None";

    // Checkout H1 title if present
    const checkoutTitle = $("sl-checkout-title");
    if (checkoutTitle) checkoutTitle.textContent = cat ? `Unlock ${cat}` : "Unlock None selected";

    // Any optional label spans
    const catLabel = $("sl-selected-cat-label");
    if (catLabel) catLabel.textContent = cat ? `Unlock ${cat}` : "Unlock None selected";

    updatePreview(cat);
  }

  // --- Auth wiring ---
  let sb = null;
  let currentSession = null;
  let signOutInFlight = false;

  async function waitForAuthReady(timeoutMs = 9000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (window.SL_AUTH && window.SL_AUTH.sb) return true;
      await new Promise((r) => setTimeout(r, 50));
    }
    return false;
  }

  async function refreshSession() {
    if (!sb) return null;
    try {
      const { data } = await sb.auth.getSession();
      currentSession = data && data.session ? data.session : null;
      return currentSession;
    } catch {
      currentSession = null;
      return null;
    }
  }

  function setSignedInUI(isSignedIn) {
    const email = currentSession && currentSession.user ? currentSession.user.email : "";

    const signedInEl = $("sl-signedin");
    if (signedInEl) signedInEl.textContent = isSignedIn ? `Signed in as ${email}` : "Not signed in";

    const mustSignin = $("sl-must-signin");
    if (mustSignin) mustSignin.style.display = isSignedIn ? "none" : "";

    const emailWrap = $("sl-email-wrap");
    if (emailWrap) emailWrap.style.display = isSignedIn ? "none" : "";

    const sendLinkBtn = $("sl-sendlink");
    if (sendLinkBtn) sendLinkBtn.style.display = isSignedIn ? "none" : "";

    const signOutBtn = $("sl-signout");
    if (signOutBtn) signOutBtn.style.display = isSignedIn ? "" : "";

    const accountBtn = $("sl-account");
    if (accountBtn) accountBtn.style.display = isSignedIn ? "" : "";

    // Continue/Checkout buttons are enabled only if signed in + category selected
    const contBtn = $("sl-continue");
    const checkoutBtn = $("sl-checkout");
    const hasCat = !!currentCategory;

    if (contBtn) contBtn.disabled = !(isSignedIn && hasCat);
    if (checkoutBtn) checkoutBtn.disabled = !(isSignedIn && hasCat);
  }

  // --- Category selection wiring ---
  let currentCategory = "";

  function applyCategory(cat, opts = {}) {
    const { pushUrl = true, persist = true, scroll = false } = opts;

    const n = normCat(cat);
    currentCategory = categoryExists(n) ? n : (n || "");

    if (persist) saveCategory(currentCategory);
    setCategoryInUrl(currentCategory, pushUrl);

    updateSelectedUI(currentCategory);

    // Recompute button enabled state based on auth + category
    setSignedInUI(!!currentSession);

    if (scroll) scrollToCheckout();
  }

  function bindCategoryPickers() {
    // Catch any link/button that implies category selection:
    // 1) links with ?category=
    // 2) ids like sl-unlock-<cat>
    // 3) data-category="<cat>"
    const nodes = new Set();

    document.querySelectorAll('a[href*="?category="]').forEach((n) => nodes.add(n));
    document.querySelectorAll('[id^="sl-unlock-"]').forEach((n) => nodes.add(n));
    document.querySelectorAll("[data-category]").forEach((n) => nodes.add(n));

    nodes.forEach((el) => {
      let cat = "";

      if (el.dataset && el.dataset.category) cat = el.dataset.category;

      if (!cat && el.id && el.id.startsWith("sl-unlock-")) cat = el.id.replace("sl-unlock-", "");

      if (!cat && el.getAttribute) {
        const href = el.getAttribute("href") || "";
        if (href.includes("?category=")) {
          try {
            const u = new URL(href, location.origin);
            cat = u.searchParams.get("category") || "";
          } catch {}
        }
      }

      cat = normCat(cat);
      if (!cat) return;

      el.addEventListener("click", (ev) => {
        // Let real nav happen on checkout page if the element is meant to navigate elsewhere,
        // but on upgrade page we want smooth state + scroll.
        if (el.tagName === "A") ev.preventDefault();

        const onUpgrade = !IS_CHECKOUT_PAGE;

        applyCategory(cat, { pushUrl: true, persist: true, scroll: onUpgrade });

        // If we're in "return to checkout" mode AND already signed in,
        // selecting a category should immediately go back to checkout.
        const u = new URL(location.href);
        const returning = u.searchParams.get("return") === "checkout";
        if (onUpgrade && returning && currentSession) {
          location.href = `/upgrade/checkout/?category=${encodeURIComponent(cat)}`;
        }
      });
    });
  }

  // --- Checkout navigation wiring ---
  function bindFlowButtons() {
    const changeCatBtn = $("sl-change-category");
    if (changeCatBtn) {
      changeCatBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // Go to categories picker, preserving current category if any
        const cat = currentCategory || loadCategory();
        const q = cat ? `?category=${encodeURIComponent(cat)}&return=checkout#categories` : `?return=checkout#categories`;
        location.href = "/upgrade/" + q;
      });
    }

    const contBtn = $("sl-continue"); // upgrade page "Continue to checkout"
    if (contBtn) {
      contBtn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!currentSession || !currentCategory) return;
        location.href = `/upgrade/checkout/?category=${encodeURIComponent(currentCategory)}`;
      });
    }

    const checkoutBtn = $("sl-checkout"); // checkout page "Continue to checkout"
    if (checkoutBtn) {
      checkoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (!currentSession || !currentCategory) return;

        checkoutBtn.disabled = true;
        const status = $("sl-status");
        if (status) status.textContent = "Opening Stripe Checkout…";

        try {
          const r = await fetch("/api/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category: currentCategory,
              email: currentSession.user.email,
            }),
          });

          const j = await r.json().catch(() => ({}));
          if (!r.ok || !j || !j.url) throw new Error(j && j.error ? j.error : "bad_response");

          location.href = j.url;
        } catch (err) {
          if (status) status.textContent = "Failed to start checkout";
          checkoutBtn.disabled = false;
        }
      });
    }

    const accountBtn = $("sl-account");
    if (accountBtn) {
      accountBtn.addEventListener("click", (e) => {
        // allow <a href="/account/"> to navigate naturally
      });
    }

    const signOutBtn = $("sl-signout");
    if (signOutBtn) {
      signOutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        if (!sb || signOutInFlight) {
          // If auth isn't ready, still hard refresh to clear stale UI
          saveCategory(currentCategory);
          location.href = "/upgrade/#checkout";
          return;
        }

        signOutInFlight = true;

        try {
          await sb.auth.signOut();
        } catch {
          // even if signOut errors due to lock, we still hard refresh to reset UI
        }

        currentSession = null;
        signOutInFlight = false;

        // Force a clean UI state (prevents "still logged in" ghost state)
        location.href = "/upgrade/#checkout";
      });
    }
  }

  // --- Init ---
  async function init() {
    // Category can be handled even if auth isn’t ready (prevents "pill stuck on None")
    const initialCat = loadCategory();
    applyCategory(initialCat, { pushUrl: false, persist: true, scroll: false });

    bindCategoryPickers();
    bindFlowButtons();

    // Scroll when arriving with #checkout (or when selecting category)
    if (!IS_CHECKOUT_PAGE && location.hash === "#checkout") {
      scrollToCheckout();
    }

    // Auth init
    const ok = await waitForAuthReady(9000);
    if (ok) {
      sb = window.SL_AUTH.sb;

      await refreshSession();
      setSignedInUI(!!currentSession);

      // subscribe to auth changes
      try {
        sb.auth.onAuthStateChange((_event, session) => {
          currentSession = session || null;
          setSignedInUI(!!currentSession);
        });
      } catch {}

      // If user lands on checkout page signed OUT, send them back to upgrade
      if (IS_CHECKOUT_PAGE && !currentSession) {
        const cat = currentCategory || loadCategory();
        const q = cat ? `?category=${encodeURIComponent(cat)}#checkout` : "#checkout";
        location.href = "/upgrade/" + q;
        return;
      }

      // If upgrade page is in "return=checkout" mode and user is signed in and already has category -> go back to checkout
      if (!IS_CHECKOUT_PAGE) {
        try {
          const u = new URL(location.href);
          const returning = u.searchParams.get("return") === "checkout";
          if (returning && currentSession && currentCategory) {
            location.href = `/upgrade/checkout/?category=${encodeURIComponent(currentCategory)}`;
            return;
          }
        } catch {}
      }
    } else {
      // Auth not ready: still ensure UI doesn't look broken
      setSignedInUI(false);
    }
  }

  // Handle back/forward cache and "reverted" feel
  window.addEventListener("pageshow", () => {
    try {
      const cat = loadCategory();
      applyCategory(cat, { pushUrl: false, persist: true, scroll: false });
      // Rebind (safe; events on same nodes won’t duplicate because we bind once per load, but pageshow can reuse doc)
      // So only rebind if no marker
      if (!document.documentElement.dataset.slBound) {
        document.documentElement.dataset.slBound = "1";
        bindCategoryPickers();
        bindFlowButtons();
      }
      // Re-hide must-signin if session exists
      if (window.SL_AUTH && window.SL_AUTH.sb) {
        sb = window.SL_AUTH.sb;
        refreshSession().then(() => setSignedInUI(!!currentSession));
      }
    } catch {}
  });

  // Mark once per load
  document.documentElement.dataset.slBound = "1";
  init().catch(() => {});
})();