/* /assets/app.js
   ScopedLabs Upgrade + Checkout controller (robust against minor HTML drift)

   Goals:
   - Keep selected category in sync between:
       URL ?category=..., localStorage(sl_selected_category), and UI pills/labels
   - Update preview card (title/desc/bullets/footer) on BOTH pages
   - Upgrade page: selecting a category scrolls back to #checkout
   - Checkout page: "Change Category" returns to /upgrade/?return=checkout#categories
   - If return=checkout and user is signed in, selecting a category redirects back to checkout

   Hard rules:
   - No HTML changes required
   - Works even if upgrade pill uses either #sl-category-pill OR #sl-selected-category
*/

(() => {
  "use strict";

  const LS_KEY = "sl_selected_category";
  const IS_CHECKOUT_PAGE =
    location.pathname.startsWith("/upgrade/checkout") ||
    location.pathname.startsWith("/upgrade/checkout/");

  // ---- Category meta (preview card) ----
  // Keep these slugs aligned with your actual cards.
  const META = {
    "access-control": {
      title: "Access Control",
      desc: "Door hardware, credential formats, PoE power budgets, and deployment planning.",
      bullets: [
        "Controller sizing + expansion planning",
        "Power & cabling headroom checks",
        "Fail-safe / fail-secure impact modeling",
      ],
      foot: "You’ll also receive future Pro tools added to this category.",
    },
    compute: {
      title: "Compute",
      desc: "Server sizing, workload estimates, and resource headroom planning.",
      bullets: [
        "Capacity planning (CPU/RAM/IO)",
        "Growth projections + utilization targets",
        "Performance vs. cost trade-offs",
      ],
      foot: "You’ll also receive future Pro tools added to this category.",
    },
    infrastructure: {
      title: "Infrastructure",
      desc: "Power chain planning, rack/room layout, and reliability baselines.",
      bullets: [
        "Rack power + UPS planning",
        "Cooling assumptions + load estimates",
        "Baseline redundancy planning",
      ],
      foot: "You’ll also receive future Pro tools added to this category.",
    },
    network: {
      title: "Network",
      desc: "Bandwidth planning, latency budgets, and topology checks.",
      bullets: [
        "Bandwidth planner + contention",
        "Latency budget breakdown",
        "Oversubscription sanity checks",
      ],
      foot: "You’ll also receive future Pro tools added to this category.",
    },
    performance: {
      title: "Performance",
      desc: "Throughput modeling, bottleneck checks, and efficiency planning.",
      bullets: [
        "Workload bottleneck mapping",
        "Headroom + utilization targets",
        "Cost/perf trade-offs",
      ],
      foot: "You’ll also receive future Pro tools added to this category.",
    },
    "physical-security": {
      title: "Physical Security",
      desc: "Coverage planning, system design, and reliability checks.",
      bullets: [
        "System sizing + power checks",
        "Recording/storage planning",
        "Design trade-offs",
      ],
      foot: "You’ll also receive future Pro tools added to this category.",
    },
    thermal: {
      title: "Thermal",
      desc: "Heat load estimates, airflow assumptions, and cooling planning.",
      bullets: [
        "Heat load approximations",
        "Airflow + delta-T sanity checks",
        "Cooling headroom planning",
      ],
      foot: "You’ll also receive future Pro tools added to this category.",
    },
    "video-storage": {
      title: "Video Storage",
      desc: "Retention sizing, bitrate assumptions, and storage headroom planning.",
      bullets: [
        "Retention / storage sizing",
        "Bitrate + motion assumptions",
        "Overhead + safety margin checks",
      ],
      foot: "You’ll also receive future Pro tools added to this category.",
    },
    wireless: {
      title: "Wireless",
      desc: "Wireless design planning, capacity checks, and link budgeting.",
      bullets: [
        "Link budget sanity checks",
        "Capacity / contention planning",
        "Roaming & threshold tuning",
      ],
      foot: "You’ll also receive future Pro tools added to this category.",
    },
  };

  function qs(k) {
    try {
      return new URLSearchParams(location.search).get(k);
    } catch {
      return null;
    }
  }

  function cleanSlug(s) {
    if (!s) return null;
    return String(s).trim().toLowerCase().replace(/\s+/g, "-");
  }

  function getCategoryFromUrl() {
    return cleanSlug(qs("category"));
  }

  function getReturnFromUrl() {
    return cleanSlug(qs("return"));
  }

  function getStoredCategory() {
    try {
      return cleanSlug(localStorage.getItem(LS_KEY));
    } catch {
      return null;
    }
  }

  function setStoredCategory(cat) {
    try {
      if (!cat) localStorage.removeItem(LS_KEY);
      else localStorage.setItem(LS_KEY, cat);
    } catch {}
  }

  function setUrlCategory(cat, { replace = false } = {}) {
    try {
      const u = new URL(location.href);
      if (cat) u.searchParams.set("category", cat);
      else u.searchParams.delete("category");

      // preserve return param if present
      const ret = getReturnFromUrl();
      if (ret) u.searchParams.set("return", ret);

      if (replace) history.replaceState({}, "", u.toString());
      else history.pushState({}, "", u.toString());
    } catch {}
  }

  function scrollToCheckout({ instant = false } = {}) {
    const el =
      document.getElementById("checkout") ||
      document.querySelector('section#checkout') ||
      document.querySelector('[data-section="checkout"]');

    if (!el) return;

    try {
      el.scrollIntoView({
        behavior: instant ? "auto" : "smooth",
        block: "start",
      });
    } catch {
      // fallback
      try {
        window.scrollTo(0, el.offsetTop || 0);
      } catch {}
    }
  }

  function scrollToCategories({ instant = false } = {}) {
    const el =
      document.getElementById("categories") ||
      document.querySelector('section#categories') ||
      document.querySelector('[data-section="categories"]');

    if (!el) return;

    try {
      el.scrollIntoView({
        behavior: instant ? "auto" : "smooth",
        block: "start",
      });
    } catch {
      try {
        window.scrollTo(0, el.offsetTop || 0);
      } catch {}
    }
  }

  // ---- DOM refs (tolerant) ----
  const els = {
    // upgrade page elements
    categoryPillUpgrade: document.getElementById("sl-category-pill"),
    // some layouts accidentally re-use the checkout pill id on upgrade page — support that:
    categoryPillUpgradeAlt: document.getElementById("sl-selected-category"),

    changeCategory: document.getElementById("sl-change-category"),
    continueBtn: document.getElementById("sl-continue"),
    accountBtn: document.getElementById("sl-account"),
    signoutBtn: document.getElementById("sl-signout"),

    // auth UI (upgrade)
    loginHint: document.getElementById("sl-login-hint"),
    email: document.getElementById("sl-email"),
    sendLink: document.getElementById("sl-sendlink"),
    signedInLine: document.getElementById("sl-signedin"),
    authStatus: document.getElementById("sl-auth-status"),

    // checkout page elements
    selectedPillCheckout: document.getElementById("sl-selected-category"),
    selectedLabelCheckout: document.getElementById("sl-selected-category-label"),
    checkoutBtn: document.getElementById("sl-checkout"),
    status: document.getElementById("sl-status"),

    // preview card (both pages)
    preview: document.getElementById("sl-preview"),
    previewTitle: document.getElementById("sl-preview-title"),
    previewDesc: document.getElementById("sl-preview-desc"),
    previewBullets: document.getElementById("sl-preview-bullets"),
    previewFoot: document.getElementById("sl-preview-foot"),
  };

  function setText(el, txt) {
    if (!el) return;
    el.textContent = txt == null ? "" : String(txt);
  }

  function applyCategoryUI(cat) {
    const show = cat || "None";

    // Upgrade pill(s)
    if (els.categoryPillUpgrade) setText(els.categoryPillUpgrade, show);
    if (els.categoryPillUpgradeAlt && !IS_CHECKOUT_PAGE) {
      // If this id is being used on upgrade page, keep it in sync too
      setText(els.categoryPillUpgradeAlt, show);
    }

    // Checkout pill + label
    if (els.selectedPillCheckout && IS_CHECKOUT_PAGE) setText(els.selectedPillCheckout, show);
    if (els.selectedLabelCheckout && IS_CHECKOUT_PAGE) setText(els.selectedLabelCheckout, show);

    // Update preview
    applyPreview(cat);

    // Enable/disable checkout buttons appropriately
    if (els.checkoutBtn && IS_CHECKOUT_PAGE) {
      els.checkoutBtn.disabled = !cat;
    }
    if (els.continueBtn && !IS_CHECKOUT_PAGE) {
      // continue is allowed only when category exists; auth gating handled elsewhere
      els.continueBtn.disabled = !cat;
    }
  }

  function applyPreview(cat) {
    const meta = cat && META[cat] ? META[cat] : null;

    const title = meta ? meta.title : "Category";
    const desc = meta ? meta.desc : "Includes examples like:";
    const bullets = meta ? meta.bullets : [];
    const foot = meta ? meta.foot : "You’ll also receive future Pro tools added to this category.";

    // Title
    if (els.previewTitle) setText(els.previewTitle, title);
    else if (els.preview) {
      const h = els.preview.querySelector("h3,h2");
      if (h) setText(h, title);
    }

    // Desc
    if (els.previewDesc) setText(els.previewDesc, desc);

    // Bullets
    const ul =
      els.previewBullets ||
      (els.preview ? els.preview.querySelector("ul") : null);

    if (ul) {
      ul.innerHTML = "";
      (bullets || []).forEach((b) => {
        const li = document.createElement("li");
        li.textContent = b;
        ul.appendChild(li);
      });
      // If no bullets, keep the UL empty but present.
    }

    // Footer
    if (els.previewFoot) setText(els.previewFoot, foot);
  }

  function resolveInitialCategory() {
    return getCategoryFromUrl() || getStoredCategory() || null;
  }

  function setCategory(cat, { pushUrl = true } = {}) {
    cat = cleanSlug(cat);
    if (!cat) {
      setStoredCategory(null);
      if (pushUrl) setUrlCategory(null, { replace: false });
      applyCategoryUI(null);
      return;
    }

    setStoredCategory(cat);
    if (pushUrl) setUrlCategory(cat, { replace: false });
    applyCategoryUI(cat);
  }

  // ---- Category click binding ----
  function parseCategoryFromElement(el) {
    if (!el) return null;

    // data-category="network"
    const dc = el.getAttribute && el.getAttribute("data-category");
    if (dc) return cleanSlug(dc);

    // id="sl-unlock-network"
    const id = el.id || "";
    if (id.startsWith("sl-unlock-")) return cleanSlug(id.slice("sl-unlock-".length));

    // href contains ?category=
    const href = el.getAttribute && el.getAttribute("href");
    if (href && href.includes("category=")) {
      try {
        const u = new URL(href, location.origin);
        const c = u.searchParams.get("category");
        if (c) return cleanSlug(c);
      } catch {}
    }

    return null;
  }

  function bindCategoryClicks() {
    // bind any explicit unlock buttons
    const unlockBtns = Array.from(document.querySelectorAll('[id^="sl-unlock-"], [data-category]'));

    unlockBtns.forEach((btn) => {
      btn.addEventListener(
        "click",
        (e) => {
          const cat = parseCategoryFromElement(btn);
          if (!cat) return;

          e.preventDefault();
          e.stopPropagation();

          // Always update selected state immediately
          setCategory(cat, { pushUrl: true });

          // On upgrade page: scroll back to checkout area
          if (!IS_CHECKOUT_PAGE) {
            // If we came from checkout return flow and are signed in, redirect back to checkout
            const ret = getReturnFromUrl();
            const hasSession = !!(window.SL_AUTH && window.SL_AUTH.__session);
            if (ret === "checkout" && hasSession) {
              location.href = "/upgrade/checkout/?category=" + encodeURIComponent(cat);
              return;
            }

            // Otherwise stay on upgrade and scroll to checkout card
            requestAnimationFrame(() => scrollToCheckout());
          }
        },
        { passive: false }
      );
    });

    // Also bind whole category cards if they contain a button/link we can parse
    const cards = Array.from(document.querySelectorAll(".category-card, .sl-category-card, .cat-card, .tool-card"));
    cards.forEach((card) => {
      card.addEventListener(
        "click",
        (e) => {
          // if user clicked a button/link inside, let that handler run
          const t = e.target;
          if (t && (t.closest("button") || t.closest("a"))) return;

          // try to find a child we can parse
          const candidate =
            card.querySelector('[id^="sl-unlock-"]') ||
            card.querySelector("[data-category]") ||
            card.querySelector('a[href*="category="]');

          const cat = parseCategoryFromElement(candidate);
          if (!cat) return;

          e.preventDefault();
          e.stopPropagation();

          setCategory(cat, { pushUrl: true });

          if (!IS_CHECKOUT_PAGE) {
            const ret = getReturnFromUrl();
            const hasSession = !!(window.SL_AUTH && window.SL_AUTH.__session);
            if (ret === "checkout" && hasSession) {
              location.href = "/upgrade/checkout/?category=" + encodeURIComponent(cat);
              return;
            }
            requestAnimationFrame(() => scrollToCheckout());
          }
        },
        { passive: false }
      );
    });
  }

  // ---- Auth glue (uses window.SL_AUTH.sb created in auth.js) ----
  async function getSB() {
    const a = window.SL_AUTH;
    if (!a) return null;

    // if auth.js provides ready promise, wait it
    if (a.ready && typeof a.ready.then === "function") {
      try {
        await a.ready;
      } catch {}
    }
    return a.sb || null;
  }

  function setSignedInUI(session) {
    // cache session for quick checks without repeatedly asking supabase
    if (!window.SL_AUTH) window.SL_AUTH = {};
    window.SL_AUTH.__session = session || null;

    const email = session && session.user && session.user.email ? session.user.email : null;

    if (els.signedInLine) {
      if (email) {
        els.signedInLine.style.display = "";
        setText(els.signedInLine, "Signed in as " + email);
      } else {
        els.signedInLine.style.display = "";
        setText(els.signedInLine, "Not signed in");
      }
    }

    // Optional: keep login hint visible if signed out, hide if signed in
    if (els.loginHint) {
      els.loginHint.style.display = email ? "none" : "";
    }

    // On upgrade page, continue button should be disabled if no session OR no category
    if (els.continueBtn && !IS_CHECKOUT_PAGE) {
      const cat = resolveInitialCategory();
      els.continueBtn.disabled = !email || !cat;
    }

    // On checkout page, checkout button should be disabled if no session OR no category
    if (els.checkoutBtn && IS_CHECKOUT_PAGE) {
      const cat = resolveInitialCategory();
      els.checkoutBtn.disabled = !email || !cat;
    }
  }

  // ---- Buttons ----
  function wireButtons() {
    // Change Category
    if (els.changeCategory) {
      els.changeCategory.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (IS_CHECKOUT_PAGE) {
          // go back to upgrade category grid
          const cat = resolveInitialCategory();
          const q = cat ? ("?category=" + encodeURIComponent(cat) + "&return=checkout") : "?return=checkout";
          location.href = "/upgrade/" + q + "#categories";
        } else {
          // on upgrade page: scroll to categories section
          requestAnimationFrame(() => scrollToCategories());
        }
      });
    }

    // Continue to checkout (upgrade page)
    if (els.continueBtn) {
      els.continueBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        const cat = resolveInitialCategory();
        if (!cat) {
          scrollToCategories();
          return;
        }

        // if signed in, go straight to checkout page
        const hasSession = !!(window.SL_AUTH && window.SL_AUTH.__session);
        if (hasSession) {
          location.href = "/upgrade/checkout/?category=" + encodeURIComponent(cat);
        } else {
          // not signed in: stay on upgrade and scroll to checkout section (login)
          requestAnimationFrame(() => scrollToCheckout());
        }
      });
    }

    // Account
    if (els.accountBtn) {
      els.accountBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        location.href = "/account/";
      });
    }

    // Sign out (force refresh so UI never “sticks”)
    if (els.signoutBtn) {
      let signoutInFlight = false;

      els.signoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (signoutInFlight) return;

        signoutInFlight = true;
        try {
          els.signoutBtn.disabled = true;
        } catch {}

        try {
          const sb = await getSB();
          if (sb) {
            // guard against lock contention; signOut is async
            await sb.auth.signOut();
          }
        } catch (err) {
          // Even if signOut throws (lock contention), we still hard-refresh to correct UI
          try {
            console.warn("[app.js] signOut error:", err);
          } catch {}
        }

        // local cleanup
        setStoredCategory(getStoredCategory()); // keep category
        if (window.SL_AUTH) window.SL_AUTH.__session = null;
        setSignedInUI(null);

        // hard refresh to clear any stale session UI
        const cat = resolveInitialCategory();
        const url = "/upgrade/" + (cat ? ("?category=" + encodeURIComponent(cat)) : "") + "#checkout";
        location.href = url;
      });
    }

    // Checkout button (checkout page)
    if (els.checkoutBtn && IS_CHECKOUT_PAGE) {
      els.checkoutBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        const sb = await getSB();
        const session = window.SL_AUTH && window.SL_AUTH.__session ? window.SL_AUTH.__session : null;
        const cat = resolveInitialCategory();

        if (!session || !session.user || !session.user.email) return;
        if (!cat) return;

        try {
          els.checkoutBtn.disabled = true;
          if (els.status) setText(els.status, "Opening Stripe Checkout…");

          const res = await fetch("/api/create-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              category: cat,
              email: session.user.email,
            }),
          });

          if (!res.ok) throw new Error("bad_status_" + res.status);

          const data = await res.json();
          if (!data || !data.url) throw new Error("missing_url");

          location.href = data.url;
        } catch (err) {
          try {
            console.error("[app.js] checkout error:", err);
          } catch {}

          if (els.status) setText(els.status, "Failed to start checkout");
          try {
            els.checkoutBtn.disabled = false;
          } catch {}
        }
      });
    }
  }

  // ---- Init ----
  (async () => {
    // Set category immediately from URL/storage
    const initial = resolveInitialCategory();
    applyCategoryUI(initial);

    // Bind category selections
    bindCategoryClicks();

    // Wire buttons
    wireButtons();

    // Hydrate auth state
    try {
      const sb = await getSB();
      if (sb) {
        const { data } = await sb.auth.getSession();
        setSignedInUI(data ? data.session : null);

        // stay updated
        sb.auth.onAuthStateChange((_event, session) => {
          setSignedInUI(session || null);
        });

        // If we’re on upgrade page with return=checkout, and we already have both
        // session + category, immediately jump back to checkout.
        if (!IS_CHECKOUT_PAGE) {
          const ret = getReturnFromUrl();
          const cat = resolveInitialCategory();
          const hasSession = !!(data && data.session);
          if (ret === "checkout" && hasSession && cat) {
            location.href = "/upgrade/checkout/?category=" + encodeURIComponent(cat);
            return;
          }
        }

        // If URL hash is #checkout, scroll there once
        if (!IS_CHECKOUT_PAGE && location.hash === "#checkout") {
          requestAnimationFrame(() => scrollToCheckout({ instant: false }));
        }
      }
    } catch (err) {
      try {
        console.warn("[app.js] auth init error:", err);
      } catch {}
    }
  })();
})();