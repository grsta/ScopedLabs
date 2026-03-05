/* /assets/app.js
   ScopedLabs Upgrade + Checkout controller (single file used on BOTH pages)

   Fixes:
   - Selected category pill/label updates on /upgrade AND /upgrade/checkout
   - Preview bullets render on checkout (into #sl-selected-category-preview-checkout)
   - Clicking a category card on /upgrade updates selection + auto-scrolls back to #checkout
   - Clicking a category card on /upgrade/checkout switches category in ONE step (no “select twice”, no bounce)
   - Hides #sl-must-signin when signed in
   - Sign out hard-refreshes back to /upgrade/#checkout
*/

(() => {
  "use strict";

  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");

  const LS_CAT = "sl_selected_category";
  const LS_LAST_RETURN = "sl_return_mode";

  // ---- helpers ----
  const $ = (id) => document.getElementById(id);

  function getParam(name) {
    try {
      return new URL(location.href).searchParams.get(name);
    } catch {
      return null;
    }
  }

  function normalizeCat(cat) {
    if (!cat) return "";
    return String(cat).trim().toLowerCase();
  }

  function titleCaseFromSlug(slug) {
    if (!slug) return "None";
    return slug
      .split("-")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
      .join(" ");
  }

  function setStoredCategory(cat) {
    const c = normalizeCat(cat);
    if (c) localStorage.setItem(LS_CAT, c);
    else localStorage.removeItem(LS_CAT);
  }

  function getStoredCategory() {
    return normalizeCat(localStorage.getItem(LS_CAT) || "");
  }

  function setUrlCategory(cat) {
    const c = normalizeCat(cat);
    const u = new URL(location.href);
    if (c) u.searchParams.set("category", c);
    else u.searchParams.delete("category");
    // preserve hash
    history.replaceState({}, "", u.toString());
  }

  function scrollToCheckout() {
    const checkoutCard = $("checkout") || $("sl-checkout-card") || $("sl-checkout-grid");
    if (checkoutCard && checkoutCard.scrollIntoView) {
      checkoutCard.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    // fallback to hash jump
    if (location.hash !== "#checkout") {
      try {
        const u = new URL(location.href);
        u.hash = "checkout";
        history.replaceState({}, "", u.toString());
      } catch {}
    }
  }

  function isReturnCheckoutMode() {
    return normalizeCat(getParam("return")) === "checkout";
  }

  // ---- category metadata (preview) ----
  const CATEGORY_META = {
    "access-control": {
      title: "Access Control",
      desc: "Door hardware, credential formats, PoE power budgets, and deployment planning.",
      bullets: [
        "Controller sizing + expansion planning",
        "Power & cabling headroom checks",
        "Fail-safe / fail-secure impact modeling",
      ],
      foot: "Access Control",
    },
    compute: {
      title: "Compute",
      desc: "Server sizing, workload estimates, and resource headroom planning.",
      bullets: [
        "Capacity planning (CPU/RAM/IO)",
        "Growth projections + utilization targets",
        "Performance vs. cost trade-offs",
      ],
      foot: "Compute",
    },
    infrastructure: {
      title: "Infrastructure",
      desc: "Power chain planning, rack/room layout, and reliability baselines.",
      bullets: [
        "Rack power + UPS planning",
        "Cooling assumptions + load estimates",
        "Baseline redundancy planning",
      ],
      foot: "Infrastructure",
    },
    network: {
      title: "Network",
      desc: "Bandwidth planning, latency budgets, and topology checks.",
      bullets: [
        "Bandwidth planner + contention",
        "Latency budget breakdown",
        "Oversubscription sanity checks",
      ],
      foot: "Network",
    },
    performance: {
      title: "Performance",
      desc: "Throughput modeling, bottleneck checks, and efficiency planning.",
      bullets: ["Workload bottleneck mapping", "Headroom + utilization targets", "Cost/perf trade-offs"],
      foot: "Performance",
    },
    "physical-security": {
      title: "Physical Security",
      desc: "Coverage planning, system design, and reliability checks.",
      bullets: ["System sizing + power checks", "Recording/storage planning", "Design trade-offs"],
      foot: "Physical Security",
    },
    thermal: {
      title: "Thermal",
      desc: "Heat load assumptions, ventilation needs, and enclosure planning.",
      bullets: ["Heat load estimates", "Airflow / ventilation assumptions", "Baseline safety margins"],
      foot: "Thermal",
    },
    "video-storage": {
      title: "Video Storage",
      desc: "Retention planning, bitrate modeling, and storage headroom checks.",
      bullets: ["Retention + camera count modeling", "Bitrate + motion assumptions", "Overhead + safety margins"],
      foot: "Video Storage",
    },
    power: {
      title: "Power",
      desc: "UPS/runtime planning, load estimation, and battery sizing.",
      bullets: ["UPS runtime estimates", "Load planning + growth headroom", "Battery sizing scenarios"],
      foot: "Power",
    },
    wireless: {
      title: "Wireless",
      desc: "Link budgets, roaming thresholds, and throughput planning.",
      bullets: ["Link budget sanity checks", "Roaming threshold planning", "Throughput estimates"],
      foot: "Wireless",
    },
  };

  function getMeta(cat) {
    const c = normalizeCat(cat);
    if (CATEGORY_META[c]) return CATEGORY_META[c];
    return {
      title: titleCaseFromSlug(c),
      desc: "Includes examples like:",
      bullets: [],
      foot: titleCaseFromSlug(c),
    };
  }

  // ---- DOM handles (optional depending on page) ----
  const els = {
    // common-ish
    status: $("sl-status") || $("sl-auth-status") || $("sl-auth-state"),
    mustSignin: $("sl-must-signin"),
    continueBtn: $("sl-continue"),
    signoutBtn: $("sl-signout"),
    accountBtn: $("sl-account"),

    // upgrade page (right preview card with individual fields)
    previewTitle: $("sl-preview-title"),
    previewDesc: $("sl-preview-desc"),
    previewBullets: $("sl-preview-bullets"),
    previewFoot: $("sl-preview-foot"),

    // checkout page (single preview container)
    previewCheckoutBox: $("sl-selected-category-preview-checkout"),

    // selected category display
    categoryPill: $("sl-category-pill"),
    categoryLabel: $("sl-selected-category-label"),
    categoryCheckoutLabel: $("sl-selected-category"),

    // change category button on checkout
    changeCategoryBtn: $("sl-change-category"),
  };

  // ---- state ----
  let sb = null;
  let currentSession = null;
  let currentCategory = "";

  let signingOut = false;
  let inCategoryNav = false;

  function setStatus(msg) {
    if (els.status) els.status.textContent = msg || "";
  }

  function setSignedInUI(isSignedIn) {
    // hide “You must be signed in…” on checkout when signed in
    if (els.mustSignin) els.mustSignin.style.display = isSignedIn ? "none" : "";

    // the pages already show/hide other auth UI via auth.js;
    // we just keep the important one quiet.
  }

  function updateSelectedCategoryUI(cat) {
    const c = normalizeCat(cat);
    const pillText = c ? c : "None";

    if (els.categoryPill) els.categoryPill.textContent = pillText;
    if (els.categoryLabel) els.categoryLabel.textContent = pillText;
    if (els.categoryCheckoutLabel) els.categoryCheckoutLabel.textContent = pillText;
  }

  function renderUpgradePreview(cat) {
    // /upgrade has separate fields
    if (!els.previewTitle && !els.previewDesc && !els.previewBullets && !els.previewFoot) return;

    const meta = getMeta(cat);

    if (els.previewTitle) els.previewTitle.textContent = meta.title || titleCaseFromSlug(cat);
    if (els.previewDesc) els.previewDesc.textContent = meta.desc || "Includes examples like:";

    if (els.previewBullets) {
      els.previewBullets.innerHTML = "";
      if (meta.bullets && meta.bullets.length) {
        for (const b of meta.bullets) {
          const li = document.createElement("li");
          li.textContent = b;
          els.previewBullets.appendChild(li);
        }
      }
    }

    if (els.previewFoot) {
      els.previewFoot.textContent = meta.foot
        ? `You'll also receive future Pro tools added to ${meta.foot}.`
        : "You'll also receive future Pro tools added to this category.";
    }
  }

  function renderCheckoutPreview(cat) {
    // /upgrade/checkout uses a single container
    if (!els.previewCheckoutBox) return;

    const meta = getMeta(cat);
    const title = meta.title || titleCaseFromSlug(cat);

    const bulletsHtml =
      meta.bullets && meta.bullets.length
        ? `<ul class="muted" style="margin-top:10px;">
            ${meta.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
           </ul>`
        : "";

    const descLine = meta.desc ? `<div class="muted" style="margin-top:10px;">${escapeHtml(meta.desc)}</div>` : "";

    const footLine = meta.foot
      ? `<div class="muted" style="margin-top:10px;">You'll also receive future Pro tools added to ${escapeHtml(
          meta.foot
        )}.</div>`
      : `<div class="muted" style="margin-top:10px;">You'll also receive future Pro tools added to this category.</div>`;

    els.previewCheckoutBox.innerHTML = `
      <div class="pill" style="margin-bottom:12px;">Preview</div>
      <h3 style="margin-top:0;">${escapeHtml(title)}</h3>
      ${descLine}
      ${bulletsHtml}
      ${footLine}
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function setCategory(cat, opts = {}) {
    const c = normalizeCat(cat);
    currentCategory = c;

    if (opts.store !== false) setStoredCategory(c);
    if (opts.updateUrl !== false) setUrlCategory(c);

    updateSelectedCategoryUI(c);

    // keep previews in sync
    renderUpgradePreview(c);
    renderCheckoutPreview(c);

    // if on upgrade page, we want user to see the checkout card update
    if (!IS_CHECKOUT_PAGE && opts.scrollToCheckout) {
      scrollToCheckout();
    }
  }

  // ---- navigation ----
  function goToUpgrade(cat, { returnCheckout = false, hash = "checkout" } = {}) {
    const c = normalizeCat(cat);
    setStoredCategory(c);

    const u = new URL(location.origin + "/upgrade/");
    if (c) u.searchParams.set("category", c);
    if (returnCheckout) u.searchParams.set("return", "checkout");
    if (hash) u.hash = hash;

    location.href = u.toString();
  }

  function goToCheckout(cat) {
    const c = normalizeCat(cat);
    setStoredCategory(c);
    location.href = `/upgrade/checkout/?category=${encodeURIComponent(c)}`;
  }

  // Intercept category card links on BOTH pages:
  // - on /upgrade: set category + scroll to checkout card
  // - on /upgrade/checkout: switch category in-place by navigating directly to checkout URL
  function bindCategoryCardClicks() {
    const container = $("categories");
    if (!container) return;

    container.addEventListener("click", async (e) => {
      const a = e.target && e.target.closest ? e.target.closest("a") : null;
      if (!a) return;

      const href = a.getAttribute("href") || "";
      if (!href.includes("category=")) return;

      // Parse category from href
      let cat = "";
      try {
        const u = new URL(href, location.origin);
        cat = normalizeCat(u.searchParams.get("category") || "");
      } catch {
        // fallback parse
        const m = href.match(/[?&]category=([^&#]+)/i);
        cat = m ? normalizeCat(decodeURIComponent(m[1])) : "";
      }
      if (!cat) return;

      e.preventDefault();

      // prevent double-fire / bounce
      if (inCategoryNav) return;
      inCategoryNav = true;
      setTimeout(() => (inCategoryNav = false), 700);

      setCategory(cat, { updateUrl: true, store: true, scrollToCheckout: false });

      if (IS_CHECKOUT_PAGE) {
        // ONE STEP switch: stay in checkout flow, no “upgrade flash”
        goToCheckout(cat);
        return;
      }

      // /upgrade behavior
      const returnMode = isReturnCheckoutMode();
      localStorage.setItem(LS_LAST_RETURN, returnMode ? "checkout" : "");

      // If user is signed in AND they arrived here from checkout flow, jump back to checkout page
      if (returnMode && currentSession) {
        goToCheckout(cat);
        return;
      }

      // Otherwise: just scroll the user back up to the checkout card
      scrollToCheckout();
    });
  }

  function bindCheckoutChangeCategoryButton() {
    if (!IS_CHECKOUT_PAGE) return;
    if (!els.changeCategoryBtn) return;

    els.changeCategoryBtn.addEventListener("click", (e) => {
      e.preventDefault();
      // clear category so upgrade page doesn't auto-return
      setStoredCategory("");
      // go to upgrade categories chooser, marked as return=checkout
      goToUpgrade("", { returnCheckout: true, hash: "categories" });
    });
  }

  // ---- checkout action ----
  async function startStripeCheckout() {
    if (signingOut) return;
    if (!currentSession || !currentSession.user || !currentSession.user.email) {
      setStatus("You must be signed in to continue.");
      return;
    }
    if (!currentCategory) {
      setStatus("Choose a category to continue.");
      return;
    }

    if (els.continueBtn) els.continueBtn.disabled = true;
    setStatus("Opening Stripe Checkout…");

    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: currentCategory,
          email: currentSession.user.email,
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data || !data.url) {
        throw new Error("No checkout url returned");
      }

      location.href = data.url;
    } catch (err) {
      console.error("checkout error:", err);
      setStatus("Failed to start checkout");
      if (els.continueBtn) els.continueBtn.disabled = false;
    }
  }

  function bindContinueButton() {
    if (!els.continueBtn) return;

    els.continueBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      // /upgrade page: Continue should go to checkout page if signed in, otherwise just scroll to checkout block
      if (!IS_CHECKOUT_PAGE) {
        if (currentSession) {
          if (!currentCategory) {
            setStatus("Choose a category to continue.");
            scrollToCheckout();
            return;
          }
          goToCheckout(currentCategory);
          return;
        }
        scrollToCheckout();
        return;
      }

      // /upgrade/checkout page: actually create Stripe session
      await startStripeCheckout();
    });
  }

  // ---- sign out ----
  function bindSignOut() {
    if (!els.signoutBtn) return;

    els.signoutBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!sb) {
        // still refresh UI
        setStoredCategory("");
        location.href = "/upgrade/#checkout";
        return;
      }

      if (signingOut) return;
      signingOut = true;

      try {
        setStatus("Signing out…");
        setStoredCategory("");
        // avoid concurrent calls fighting the gotrue lock by not doing any other auth calls while signing out
        await sb.auth.signOut(); // local signout is enough for this flow
      } catch (err) {
        console.warn("signOut error:", err);
      } finally {
        // hard refresh so UI never “sticks” as logged in
        location.href = "/upgrade/#checkout";
      }
    });
  }

  // ---- init ----
  async function initAuth() {
    // auth.js should provide this
    const auth = window.SL_AUTH || {};
    sb = auth.sb || null;

    // If auth.js exposes a ready promise, wait for it (but don’t hang forever)
    const ready = auth.ready;
    if (ready && typeof ready.then === "function") {
      try {
        await Promise.race([
          ready,
          new Promise((_, rej) => setTimeout(() => rej(new Error("auth ready timeout")), 7000)),
        ]);
      } catch (e) {
        console.warn("auth ready wait:", e);
      }
    }

    if (!sb) return;

    try {
      const { data } = await sb.auth.getSession();
      currentSession = data && data.session ? data.session : null;
    } catch (e) {
      console.warn("getSession failed:", e);
      currentSession = null;
    }

    // keep session updated
    try {
      sb.auth.onAuthStateChange((_event, session) => {
        currentSession = session || null;
        setSignedInUI(!!currentSession);
        if (!currentSession) {
          // when session disappears, keep category but force user back to upgrade page if they were on checkout
          if (IS_CHECKOUT_PAGE) {
            // no bounce loops: only redirect if not already heading to upgrade
            if (!signingOut) {
              goToUpgrade(currentCategory || getStoredCategory() || "", { returnCheckout: false, hash: "checkout" });
            }
          }
        }
      });
    } catch (e) {
      console.warn("onAuthStateChange failed:", e);
    }
  }

  function initCategoryFromUrlOrStorage() {
    const urlCat = normalizeCat(getParam("category") || "");
    const storedCat = getStoredCategory();
    const initial = urlCat || storedCat || "";

    setCategory(initial, { updateUrl: true, store: true, scrollToCheckout: false });

    // If upgrade page is loaded with #checkout, keep it in view
    if (!IS_CHECKOUT_PAGE && location.hash === "#checkout") {
      // slight delay so layout is stable
      setTimeout(scrollToCheckout, 50);
    }
  }

  function initCheckoutGuard() {
    if (!IS_CHECKOUT_PAGE) return;

    // If checkout page has no category, try restore from localStorage
    if (!currentCategory) {
      const stored = getStoredCategory();
      if (stored) {
        setCategory(stored, { updateUrl: true, store: true });
      }
    }
  }

  async function boot() {
    // bind UI first (so user clicks don’t race)
    bindCategoryCardClicks();
    bindCheckoutChangeCategoryButton();
    bindContinueButton();
    bindSignOut();

    initCategoryFromUrlOrStorage();

    await initAuth();

    // After auth loads, apply UI state and ensure checkout is consistent
    setSignedInUI(!!currentSession);
    initCheckoutGuard();

    // If signed in, hide must-signin messaging
    setSignedInUI(!!currentSession);

    // If on checkout page and signed out, gently message
    if (IS_CHECKOUT_PAGE && !currentSession) {
      setStatus("You must be signed in to continue.");
    } else {
      setStatus("");
    }
  }

  // go
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();