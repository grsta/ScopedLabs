/* /assets/app.js
   ScopedLabs Upgrade + Checkout controller
   - Category sync (URL + localStorage + UI)
   - Preview card (title + bullets)
   - Upgrade -> Checkout routing
   - Checkout -> Stripe session creation
*/

(() => {
  "use strict";

  const LS_CAT = "sl_selected_category";

  const IS_UPGRADE_PAGE =
    location.pathname === "/upgrade/" || location.pathname === "/upgrade/index.html";
  const IS_CHECKOUT_PAGE = location.pathname.startsWith("/upgrade/checkout");

  // UI content lives here so preview never depends on stripe-map.js
  const CATEGORY_UI = {
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
        "UPS runtime estimation",
        "Battery bank sizing",
        "Load planning + headroom",
      ],
      foot: "You'll also receive future Pro tools added to Power.",
    },
    thermal: {
      title: "Thermal",
      desc: "Thermal constraints, heat load planning, and environmental assumptions.",
      bullets: [
        "Heat load estimates",
        "Cooling headroom planning",
        "Constraint sanity checks",
      ],
      foot: "You'll also receive future Pro tools added to Thermal.",
    },
    wireless: {
      title: "Wireless",
      desc: "Link planning, throughput estimates, and roaming thresholds.",
      bullets: [
        "PTP link planning",
        "Throughput estimation",
        "Roaming thresholds",
      ],
      foot: "You'll also receive future Pro tools added to Wireless.",
    },
    "video-storage": {
      title: "Video Storage",
      desc: "Retention sizing, bitrate modeling, and storage headroom planning.",
      bullets: [
        "Retention sizing + camera counts",
        "Bitrate + motion assumptions",
        "RAID impact + overhead",
      ],
      foot: "You'll also receive future Pro tools added to Video Storage.",
    },
  };

  function $(id) {
    return document.getElementById(id);
  }

  function safeText(el, v) {
    if (!el) return;
    el.textContent = v == null ? "" : String(v);
  }

  function getStripeMap() {
    // supports both conventions
    return (
      window.SL_STRIPE_MAP ||
      window.SCOPEDLABS_STRIPE ||
      window.SCOPEDLABS_STRIPE_MAP ||
      null
    );
  }

  function normalizeSlug(slug) {
    if (!slug) return "";
    return String(slug).trim();
  }

  function readUrlCategory() {
    const u = new URL(location.href);
    return normalizeSlug(u.searchParams.get("category"));
  }

  function writeUrlCategory(slug, { keepHash = true } = {}) {
    const u = new URL(location.href);
    u.searchParams.set("category", slug);
    // preserve current hash unless caller later sets it intentionally
    const next = keepHash ? u.toString() : u.origin + u.pathname + "?" + u.searchParams.toString();
    history.replaceState({}, "", next);
  }

  function getStoredCategory() {
    return normalizeSlug(localStorage.getItem(LS_CAT));
  }

  function setStoredCategory(slug) {
    localStorage.setItem(LS_CAT, slug);
  }

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (!el) return;
    // ensure layout settled first
    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function getUi(slug) {
    return CATEGORY_UI[slug] || null;
  }

  function getStripe(slug) {
    const map = getStripeMap();
    if (!map) return null;
    return map[slug] || null;
  }

  function setPreview(slug) {
    const ui = getUi(slug);

    const titleEl = $("sl-preview-title");
    const descEl = $("sl-preview-desc");
    const bulletsEl = $("sl-preview-bullets");
    const footEl = $("sl-preview-foot");

    if (!ui) {
      safeText(titleEl, slug ? slug : "Category");
      safeText(descEl, "Includes examples like:");
      if (bulletsEl) bulletsEl.innerHTML = "";
      safeText(footEl, "You'll also receive future Pro tools added to this category.");
      return;
    }

    safeText(titleEl, ui.title);
    safeText(descEl, "Includes examples like:");

    if (bulletsEl) {
      bulletsEl.innerHTML = "";
      (ui.bullets || []).forEach((b) => {
        const li = document.createElement("li");
        li.textContent = b;
        bulletsEl.appendChild(li);
      });
    }

    safeText(footEl, ui.foot || "You'll also receive future Pro tools added to this category.");
  }

  function setSelectedPill(slug) {
    const pill = $("sl-selected");
    if (!pill) return;
    safeText(pill, slug || "None");
  }

  function setHeaderSlug(slug) {
    const el = $("sl-category-title");
    if (!el) return;
    safeText(el, slug ? `Unlock ${slug}` : "Unlock None selected");
  }

  function setPrice() {
    // price is constant right now, but keep hook for later
    const el = $("sl-price");
    if (el) el.textContent = "$19.99";
  }

  function setCheckoutButtonState({ signedIn, hasCategory }) {
    // Upgrade page uses sl-continue; Checkout page uses sl-checkout
    const upgradeContinue = $("sl-continue");
    const checkoutBtn = $("sl-checkout");

    const disable = !(signedIn && hasCategory);

    if (upgradeContinue) upgradeContinue.disabled = disable;
    if (checkoutBtn) checkoutBtn.disabled = disable;

    const must = document.querySelector("#sl-must-signin");
    if (must) must.style.display = signedIn ? "none" : "";
  }

  async function getSession(sb) {
    try {
      const res = await sb.auth.getSession();
      return res && res.data && res.data.session ? res.data.session : null;
    } catch {
      return null;
    }
  }

  function setSignedInText(session) {
    const signed = $("sl-signedin");
    const status = $("sl-auth-status");
    const email = session?.user?.email || "";

    if (signed) safeText(signed, email ? `Signed in as ${email}` : "Not signed in");
    if (status) safeText(status, email ? `Signed in as ${email}` : "Not signed in");
  }

  function bindCategoryLinks(onPick) {
    // category cards are anchors like /upgrade/?category=foo#checkout
    const links = Array.from(document.querySelectorAll('a[href*="?category="]'));
    links.forEach((a) => {
      a.addEventListener("click", (e) => {
        // Only intercept SAME-PAGE category selects; keep normal navigation elsewhere
        const href = a.getAttribute("href") || "";
        if (!href.includes("?category=")) return;

        // If it points to /upgrade or relative, we handle in-page to prevent flicker
        const targetUrl = new URL(href, location.origin);
        const cat = normalizeSlug(targetUrl.searchParams.get("category"));
        if (!cat) return;

        // Always handle on upgrade page (prevents reload flicker)
        if (IS_UPGRADE_PAGE) {
          e.preventDefault();
          onPick(cat);

          // If link had #checkout, we must scroll manually since we prevented default
          if ((targetUrl.hash || "") === "#checkout") {
            // ensure URL hash shows checkout too
            if (location.hash !== "#checkout") {
              history.replaceState({}, "", `${location.pathname}${location.search}#checkout`);
            }
            scrollToId("checkout");
          }
        }
      });
    });
  }

  function bindChangeCategoryButtons() {
    const btn = $("sl-change-category");
    if (!btn) return;

    btn.addEventListener("click", () => {
      // Always go to upgrade categories view
      location.href = "/upgrade/?return=checkout#categories";
    });
  }

  async function startStripeCheckout({ sb, category }) {
    const session = await getSession(sb);
    const email = session?.user?.email || "";
    const statusEl = $("sl-status");

    if (!session) {
      if (statusEl) statusEl.textContent = "You must be signed in to continue.";
      return;
    }
    if (!category) {
      if (statusEl) statusEl.textContent = "Choose a category to continue.";
      return;
    }

    const btn = $("sl-checkout");
    if (btn) btn.disabled = true;
    if (statusEl) statusEl.textContent = "Opening Stripe Checkout…";

    try {
      const r = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, email }),
      });

      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j || !j.url) throw new Error(j?.error || "checkout_failed");

      location.href = j.url;
    } catch (e) {
      if (btn) btn.disabled = false;
      if (statusEl) statusEl.textContent = "Failed to start checkout.";
      console.error(e);
    }
  }

  async function init() {
    // Wait for auth.js
    const auth = window.SL_AUTH;
    if (!auth || !auth.sb) return;

    if (auth.ready && typeof auth.ready.then === "function") {
      try {
        await auth.ready;
      } catch {}
    }

    const sb = auth.sb;

    let currentCategory = readUrlCategory() || getStoredCategory();
    if (currentCategory) {
      setStoredCategory(currentCategory);
      writeUrlCategory(currentCategory, { keepHash: true });
    }

    // Initial render
    setHeaderSlug(currentCategory);
    setSelectedPill(currentCategory);
    setPreview(currentCategory);
    setPrice();

    // Session + UI state
    let session = await getSession(sb);
    setSignedInText(session);
    setCheckoutButtonState({ signedIn: !!session, hasCategory: !!currentCategory });

    // React to auth changes (no signout click handler here; auth.js owns it)
    sb.auth.onAuthStateChange((_evt, s) => {
      session = s || null;
      setSignedInText(session);
      setCheckoutButtonState({ signedIn: !!session, hasCategory: !!currentCategory });
    });

    // Category picking
    bindCategoryLinks((cat) => {
      currentCategory = cat;
      setStoredCategory(currentCategory);
      writeUrlCategory(currentCategory, { keepHash: true });

      setHeaderSlug(currentCategory);
      setSelectedPill(currentCategory);
      setPreview(currentCategory);
      setCheckoutButtonState({ signedIn: !!session, hasCategory: !!currentCategory });
    });

    // Checkout page specifics
    if (IS_CHECKOUT_PAGE) {
      bindChangeCategoryButtons();

      const checkoutBtn = $("sl-checkout");
      if (checkoutBtn) {
        checkoutBtn.addEventListener("click", () =>
          startStripeCheckout({ sb, category: currentCategory })
        );
      }
    }

    // Upgrade page: if we arrived with #checkout, ensure we land there cleanly
    if (IS_UPGRADE_PAGE && location.hash === "#checkout") {
      scrollToId("checkout");
    }

    // BFCache restore safety (Chrome back button weirdness)
    window.addEventListener("pageshow", (ev) => {
      if (!ev.persisted) return;
      // Re-sync category + session view after back/forward cache restore
      const cat = readUrlCategory() || getStoredCategory();
      if (cat && cat !== currentCategory) {
        currentCategory = cat;
        setStoredCategory(currentCategory);
        setHeaderSlug(currentCategory);
        setSelectedPill(currentCategory);
        setPreview(currentCategory);
      }
      getSession(sb).then((s) => {
        session = s || null;
        setSignedInText(session);
        setCheckoutButtonState({ signedIn: !!session, hasCategory: !!currentCategory });
      });
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();