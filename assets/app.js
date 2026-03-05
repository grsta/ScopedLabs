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
  const IS_UPGRADE_PAGE =
    location.pathname === "/upgrade/" || location.pathname === "/upgrade";

  // Must be created by /assets/auth.js and loaded BEFORE this file.
  const sb = window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null;

  const state = {
    session: null,
    category: null,
    categoryData: null,
    returnToCheckout: false,
  };

  const els = {
    // Upgrade page elements
    categoryPill: document.getElementById("sl-category-pill"),
    categoryTitle: document.getElementById("sl-category-title"),
    previewTitle: document.getElementById("sl-preview-title"),
    previewDesc: document.getElementById("sl-preview-desc"),
    previewBullets: document.getElementById("sl-preview-bullets"),
    previewFoot: document.getElementById("sl-preview-foot"),
    authStatus: document.getElementById("sl-auth-status"),
    signedInAs: document.getElementById("sl-signedin"),
    emailInput: document.getElementById("sl-email"),
    sendLinkBtn: document.getElementById("sl-sendlink"),
    continueBtn: document.getElementById("sl-continue"),
    accountBtn: document.getElementById("sl-account"),
    signOutBtn: document.getElementById("sl-signout"),
    changeCatBtn: document.getElementById("sl-change-category"),

    // Checkout page elements
    checkoutCategoryPill: document.getElementById("sl-checkout-category"),
    checkoutTitle: document.getElementById("sl-checkout-title"),
    checkoutPrice: document.getElementById("sl-checkout-price"),
    checkoutPreviewTitle: document.getElementById("sl-checkout-preview-title"),
    checkoutPreviewDesc: document.getElementById("sl-checkout-preview-desc"),
    checkoutPreviewBullets: document.getElementById("sl-checkout-preview-bullets"),
    checkoutPreviewFoot: document.getElementById("sl-checkout-preview-foot"),
    checkoutBtn: document.getElementById("sl-checkout"),
    mustSignIn: document.getElementById("sl-must-signin"),
    checkoutStatus: document.getElementById("sl-status"),
    chooseDifferentBtn: document.getElementById("sl-choose-different"),
  };

  function normKebab(s) {
    return String(s || "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function setStatus(msg) {
    const el = IS_CHECKOUT_PAGE ? els.checkoutStatus : els.authStatus;
    if (!el) return;
    el.textContent = msg || "";
  }

  function getUrlCategory() {
    try {
      const u = new URL(location.href);
      const c = u.searchParams.get("category");
      return c ? normKebab(c) : "";
    } catch {
      return "";
    }
  }

  function scrollToCheckout(behavior = "smooth") {
    const el = document.getElementById("checkout");
    if (!el) return;
    try {
      el.scrollIntoView({ behavior, block: "start" });
    } catch {
      try {
        el.scrollIntoView(true);
      } catch {}
    }
  }

  function maybeScrollToCheckoutFromHash() {
    if (!IS_UPGRADE_PAGE) return;
    if (location.hash !== "#checkout") return;

    // Layout can shift as fonts/styles settle; nudge scroll a couple times.
    try {
      requestAnimationFrame(() => scrollToCheckout("auto"));
    } catch {}

    setTimeout(() => scrollToCheckout("smooth"), 50);
    setTimeout(() => scrollToCheckout("auto"), 250);
  }

  function setUrlCategory(cat) {
    try {
      const u = new URL(location.href);
      u.searchParams.set("category", cat);
      history.replaceState({}, "", u.toString());
    } catch {}
  }

  function getStoredCategory() {
    try {
      const v = localStorage.getItem("sl_selected_category");
      return v ? normKebab(v) : "";
    } catch {
      return "";
    }
  }

  function setStoredCategory(cat) {
    try {
      localStorage.setItem("sl_selected_category", cat);
    } catch {}
  }

  function getReturnFlag() {
    try {
      const u = new URL(location.href);
      return u.searchParams.get("return") === "checkout";
    } catch {
      return false;
    }
  }

  function clearAndFillBullets(listEl, bullets) {
    if (!listEl) return;
    listEl.innerHTML = "";
    if (!Array.isArray(bullets) || bullets.length === 0) return;
    for (const b of bullets) {
      const li = document.createElement("li");
      li.textContent = String(b);
      listEl.appendChild(li);
    }
  }

  function getCategoryData(slug) {
    const s = normKebab(slug || "");
    if (!s) return null;

    // Stripe map can live under any of these globals depending on the build.
    const stripeMap =
      window.SL_STRIPE_MAP ||
      window.SL_STRIPE ||
      window.SCOPEDLABS_STRIPE ||
      null;

    const raw = stripeMap && stripeMap[s] ? stripeMap[s] : {};

    // UI preview fallback (so bullets never disappear even if stripe-map.js only has IDs)
    const FALLBACK = {
      "access-control": {
        label: "Access Control",
        desc: "Door hardware, credential formats, PoE power budgets, and deployment planning.",
        bullets: [
          "Controller sizing + expansion planning",
          "Power & cabling headroom checks",
          "Fail-safe / fail-secure impact modeling",
        ],
      },
      compute: {
        label: "Compute",
        desc: "Server sizing, workload estimates, and resource headroom planning.",
        bullets: [
          "Capacity planning (CPU/RAM/IO)",
          "Growth projections + utilization targets",
          "Performance vs. cost trade-offs",
        ],
      },
      infrastructure: {
        label: "Infrastructure",
        desc: "Power chain planning, rack/room layout, and reliability baselines.",
        bullets: [
          "Rack power + UPS planning",
          "Cooling assumptions + load estimates",
          "Baseline redundancy planning",
        ],
      },
      network: {
        label: "Network",
        desc: "Bandwidth planning, latency budgets, and topology checks.",
        bullets: [
          "Bandwidth planner + contention",
          "Latency budget breakdown",
          "Oversubscription sanity checks",
        ],
      },
      performance: {
        label: "Performance",
        desc: "Throughput modeling, bottleneck checks, and efficiency planning.",
        bullets: [
          "Workload bottleneck mapping",
          "Headroom + utilization targets",
          "Cost/perf trade-offs",
        ],
      },
      "physical-security": {
        label: "Physical Security",
        desc: "Coverage planning, system design, and reliability checks.",
        bullets: [
          "System sizing + power checks",
          "Recording/storage planning",
          "Design trade-offs",
        ],
      },
      "video-storage": {
        label: "Video Storage",
        desc: "Storage sizing, retention planning, and overhead modeling.",
        bullets: [
          "Retention sizing + overhead",
          "Bitrate + motion modeling",
          "RAID impact estimates",
        ],
      },
      wireless: {
        label: "Wireless",
        desc: "RF coverage, throughput planning, and roaming sanity checks.",
        bullets: [
          "Coverage + placement planning",
          "Channel/throughput modeling",
          "Roaming threshold tuning",
        ],
      },
      thermal: {
        label: "Thermal",
        desc: "Heat load estimates, airflow planning, and alarm thresholds.",
        bullets: [
          "Heat load + delta-T estimates",
          "Airflow + ventilation planning",
          "Redundancy + alarm thresholds",
        ],
      },
      power: {
        label: "Power",
        desc: "UPS sizing, runtime planning, and power budgeting.",
        bullets: [
          "UPS runtime planning",
          "Battery bank sizing",
          "Generator/load planning",
        ],
      },
      video: {
        label: "Video",
        desc: "Camera planning, bitrate modeling, and deployment checks.",
        bullets: [
          "Bitrate + codec planning",
          "Scene complexity + motion impact",
          "Deployment sanity checks",
        ],
      },
      storage: {
        label: "Storage",
        desc: "Storage sizing, performance, and redundancy trade-offs.",
        bullets: [
          "Capacity + retention planning",
          "Overhead + growth buffers",
          "Redundancy trade-offs",
        ],
      },
    };

    const fb = FALLBACK[s] || {};

    // Normalize + merge: stripe-map fields win for IDs/price, fallback wins for UI copy.
    const label = String(raw.label || fb.label || s).trim();
    const desc = String(raw.desc || fb.desc || "").trim();

    const bulletsRaw = Array.isArray(raw.bullets) ? raw.bullets : [];
    const bulletsFb = Array.isArray(fb.bullets) ? fb.bullets : [];
    const bullets = bulletsRaw.length ? bulletsRaw : bulletsFb;

    const foot = String(
      raw.foot ||
        fb.foot ||
        (label ? `You'll also receive future Pro tools added to ${label}.` : "")
    ).trim();

    return {
      slug: s,
      label,
      desc,
      bullets,
      foot,
      // Stripe wiring (may be absent on some pages)
      productId: raw.productId || raw.product_id || null,
      priceId: raw.priceId || raw.price_id || null,
      unlockKey: raw.unlockKey || raw.unlock_key || null,
      // keep any extra fields
      ...raw,
    };
  }

  function updatePreviewUI() {
    const data = state.categoryData;

    if (IS_UPGRADE_PAGE) {
      if (els.previewTitle) els.previewTitle.textContent = data ? data.label : "Category";
      if (els.previewDesc) {
        els.previewDesc.textContent = data && data.desc ? `Includes examples like:` : `Includes examples like:`;
      }
      clearAndFillBullets(els.previewBullets, data ? data.bullets : []);
      if (els.previewFoot) {
        els.previewFoot.textContent = data ? data.foot : "You'll also receive future Pro tools added to this category.";
      }
    }

    if (IS_CHECKOUT_PAGE) {
      if (els.checkoutPreviewTitle) els.checkoutPreviewTitle.textContent = data ? data.label : "Category";
      if (els.checkoutPreviewDesc) {
        els.checkoutPreviewDesc.textContent = data && data.desc ? `Includes examples like:` : `Includes examples like:`;
      }
      clearAndFillBullets(els.checkoutPreviewBullets, data ? data.bullets : []);
      if (els.checkoutPreviewFoot) {
        els.checkoutPreviewFoot.textContent = data ? data.foot : "You'll also receive future Pro tools added to this category.";
      }
    }
  }

  function updateCategoryUI() {
    const cat = state.category || "";
    const data = state.categoryData;

    if (IS_UPGRADE_PAGE) {
      if (els.categoryPill) els.categoryPill.textContent = cat || "None";
      if (els.categoryTitle) {
        els.categoryTitle.textContent = cat ? `Unlock ${cat}` : "Unlock None selected";
      }
    }

    if (IS_CHECKOUT_PAGE) {
      if (els.checkoutCategoryPill) els.checkoutCategoryPill.textContent = cat || "None";
      if (els.checkoutTitle) {
        els.checkoutTitle.textContent = cat ? `Unlock ${cat}` : "Unlock None selected";
      }
      // Price is static UI-side; Stripe amount comes from priceId in worker/Stripe
      if (els.checkoutPrice) els.checkoutPrice.textContent = "$19.99";
    }

    updatePreviewUI();
    updateButtonsAndStatus();
    maybeScrollToCheckoutFromHash();
  }

  function updateButtonsAndStatus() {
    const signedIn = !!state.session;
    const hasCat = !!state.category;

    if (IS_UPGRADE_PAGE) {
      if (els.signedInAs) {
        els.signedInAs.textContent = signedIn
          ? `Signed in as ${state.session.user.email}`
          : "Not signed in";
      }

      if (els.emailInput) els.emailInput.style.display = signedIn ? "none" : "";
      if (els.sendLinkBtn) els.sendLinkBtn.style.display = signedIn ? "none" : "";

      if (els.continueBtn) {
        els.continueBtn.disabled = !(signedIn && hasCat);
        els.continueBtn.style.opacity = els.continueBtn.disabled ? "0.55" : "";
      }

      if (els.accountBtn) els.accountBtn.style.display = signedIn ? "" : "none";
      if (els.signOutBtn) els.signOutBtn.style.display = signedIn ? "" : "none";

      if (!hasCat) {
        setStatus("Choose a category to continue.");
      } else if (!signedIn) {
        setStatus("Sign in to purchase (magic link — no password).");
      } else {
        setStatus("");
      }
    }

    if (IS_CHECKOUT_PAGE) {
      if (els.mustSignIn) els.mustSignIn.style.display = signedIn ? "none" : "";
      if (els.checkoutBtn) {
        els.checkoutBtn.disabled = !(signedIn && hasCat);
        els.checkoutBtn.style.opacity = els.checkoutBtn.disabled ? "0.55" : "";
      }
      if (!hasCat) {
        setStatus("Choose a category to continue.");
      } else if (!signedIn) {
        setStatus("You must be signed in to continue.");
      } else {
        setStatus("");
      }
    }
  }

  async function refreshSession() {
    if (!sb) return null;
    try {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;
      return data && data.session ? data.session : null;
    } catch (e) {
      console.warn("getSession failed", e);
      return null;
    }
  }

  async function wireSendMagicLink() {
    if (!els.sendLinkBtn || !els.emailInput) return;
    if (!sb) return;

    els.sendLinkBtn.addEventListener("click", async () => {
      const email = String(els.emailInput.value || "").trim();
      if (!email) {
        setStatus("Enter your email first.");
        return;
      }

      const cat = state.category || getUrlCategory() || getStoredCategory() || "";
      if (!cat) {
        setStatus("Choose a category first.");
        return;
      }

      try {
        els.sendLinkBtn.disabled = true;
      } catch {}

      setStatus("Sending magic link…");

      try {
        const redirectTo = `https://scopedlabs.com/upgrade/checkout/?category=${encodeURIComponent(
          cat
        )}`;

        const { error } = await sb.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: redirectTo,
          },
        });

        if (error) throw error;

        setStatus("Check your email for the sign-in link.");
      } catch (e) {
        console.error(e);
        setStatus("Failed to send magic link.");
      } finally {
        try {
          els.sendLinkBtn.disabled = false;
        } catch {}
      }
    });
  }

  async function wireSignOut() {
    if (!els.signOutBtn) return;

    els.signOutBtn.addEventListener("click", async () => {
      if (!sb) return;

      // best-effort UI lock
      try {
        els.signOutBtn.disabled = true;
      } catch {}

      try {
        // Local-only avoids some cross-tab locking weirdness.
        await sb.auth.signOut({ scope: "local" });
      } catch (e) {
        // Even if Supabase throws (lock contention), we still clear local UI
        // and hard-refresh to reflect the real session state.
        console.warn("signOut failed", e);
      }

      try {
        localStorage.removeItem("sl_selected_category");
      } catch {}

      // Hard refresh to wipe any stale "signed in" UI from BFCache / race conditions.
      try {
        location.href = "/upgrade/#checkout";
      } catch {}

      // Fallback
      setTimeout(() => {
        try {
          location.reload();
        } catch {}
      }, 50);
    });
  }

  async function wireContinueToCheckout() {
    if (!els.continueBtn) return;

    els.continueBtn.addEventListener("click", async () => {
      if (!state.session) return;
      if (!state.category) return;

      const cat = state.category;
      setStoredCategory(cat);

      if (IS_UPGRADE_PAGE) {
        location.href = `/upgrade/checkout/?category=${encodeURIComponent(cat)}`;
      }
    });
  }

  function wireChangeCategoryButtons() {
    // On checkout page: "Choose a different category" goes back to upgrade chooser
    if (IS_CHECKOUT_PAGE && els.chooseDifferentBtn) {
      els.chooseDifferentBtn.addEventListener("click", () => {
        const cat = state.category || getStoredCategory() || "";
        const qs = cat ? `?category=${encodeURIComponent(cat)}&return=checkout` : `?return=checkout`;
        location.href = `/upgrade/${qs}#categories`;
      });
    }

    // On upgrade page: "Change Category" scrolls to chooser
    if (IS_UPGRADE_PAGE && els.changeCatBtn) {
      els.changeCatBtn.addEventListener("click", () => {
        const el = document.getElementById("categories");
        if (el) {
          try {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch {
            try {
              el.scrollIntoView(true);
            } catch {}
          }
        } else {
          location.hash = "#categories";
        }
      });
    }
  }

  function wireUpgradeCategoryLinks() {
    if (!IS_UPGRADE_PAGE) return;

    const nodes = Array.from(
      document.querySelectorAll(
        "[data-category], [id^='sl-unlock-'], a[href*='?category=']"
      )
    );

    for (const n of nodes) {
      n.addEventListener("click", () => {
        // Keep localStorage in sync even if the link navigates.
        let cat = "";

        if (n.dataset && n.dataset.category) cat = n.dataset.category;
        if (!cat && n.id && n.id.startsWith("sl-unlock-")) cat = n.id.replace("sl-unlock-", "");
        if (!cat && n.getAttribute) {
          const href = n.getAttribute("href") || "";
          try {
            const u = new URL(href, location.origin);
            cat = u.searchParams.get("category") || "";
          } catch {}
        }

        cat = normKebab(cat);
        if (cat) setStoredCategory(cat);
      });
    }
  }

  function routeUpgradeToCheckoutIfReady() {
    if (!IS_UPGRADE_PAGE) return;
    if (!state.returnToCheckout) return;
    if (!state.session) return;
    if (!state.category) return;

    // If user came from checkout to change category, bounce them back to checkout.
    location.href = `/upgrade/checkout/?category=${encodeURIComponent(state.category)}`;
  }

  async function wireCheckoutButton() {
    if (!IS_CHECKOUT_PAGE) return;
    if (!els.checkoutBtn) return;

    els.checkoutBtn.addEventListener("click", async () => {
      if (!state.session) return;
      if (!state.category) return;

      const email = state.session.user.email;
      const category = state.category;

      els.checkoutBtn.disabled = true;
      setStatus("Opening Stripe Checkout…");

      try {
        const res = await fetch("/api/create-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, email }),
        });

        const json = await res.json().catch(() => null);
        if (!res.ok || !json || !json.url) {
          throw new Error(json && json.error ? json.error : "bad_response");
        }

        location.href = json.url;
      } catch (e) {
        console.error(e);
        els.checkoutBtn.disabled = false;
        setStatus("Failed to start checkout");
      }
    });
  }

  function loadCategory() {
    const fromUrl = getUrlCategory();
    const fromStore = getStoredCategory();

    const cat = fromUrl || fromStore || "";
    state.category = cat ? normKebab(cat) : "";
    if (state.category) setStoredCategory(state.category);

    state.categoryData = state.category ? getCategoryData(state.category) : null;

    updateCategoryUI();
  }

  async function init() {
    state.returnToCheckout = getReturnFlag();

    // Ensure auth.js finished setting up before we do anything.
    if (window.SL_AUTH && window.SL_AUTH.ready) {
      try {
        await window.SL_AUTH.ready;
      } catch {}
    }

    state.session = await refreshSession();

    // initial render
    loadCategory();

    // wire up UI handlers
    wireUpgradeCategoryLinks();
    wireChangeCategoryButtons();
    await wireSendMagicLink();
    await wireSignOut();
    await wireContinueToCheckout();
    await wireCheckoutButton();

    // redirect logic (upgrade -> checkout when coming back)
    routeUpgradeToCheckoutIfReady();

    // keep UI synced if tab is restored from BFCache
    window.addEventListener("pageshow", async (ev) => {
      if (ev && ev.persisted) {
        state.session = await refreshSession();
        loadCategory();
        routeUpgradeToCheckoutIfReady();
      }
    });

    // react to auth changes (sign-in completes)
    if (sb && sb.auth && sb.auth.onAuthStateChange) {
      sb.auth.onAuthStateChange(async (_event, session) => {
        state.session = session || (await refreshSession());
        updateButtonsAndStatus();
      });
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((e) => console.error("init failed", e));
  });
})();