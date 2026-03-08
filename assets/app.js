/* /assets/app.js
   ScopedLabs Upgrade + Checkout controller
   Stabilized for:
   - browser back/forward cache (bfcache)
   - category pill sync
   - preview card re-render
   - upgrade -> checkout return flow
   - checkout -> change category -> return cleanly
*/

(() => {
  "use strict";

  const LS_KEY = "sl_selected_category";
  const UPGRADE_PATH = "/upgrade/";
  const CHECKOUT_PATH = "/upgrade/checkout/";

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

  let currentCategory = null;
  let currentSession = null;
  let authSubscribed = false;
  let globalHandlersBound = false;

  function isCheckoutPage() {
    return (
      location.pathname === "/upgrade/checkout" ||
      location.pathname === "/upgrade/checkout/"
    );
  }

  function qs(name) {
    try {
      return new URLSearchParams(location.search).get(name);
    } catch {
      return null;
    }
  }

  function cleanSlug(value) {
    if (!value) return null;
    return String(value).trim().toLowerCase().replace(/\s+/g, "-");
  }

  function getUrlCategory() {
    return cleanSlug(qs("category"));
  }

  function getReturnParam() {
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
      if (cat) localStorage.setItem(LS_KEY, cat);
      else localStorage.removeItem(LS_KEY);
    } catch {}
  }

  function getResolvedCategory() {
    return getUrlCategory() || getStoredCategory() || null;
  }

  function getEls() {
    return {
      categoryPillUpgrade: document.getElementById("sl-category-pill"),
      categoryPillUpgradeAlt: document.getElementById("sl-selected-category"),
      selectedLabelCheckout: document.getElementById("sl-selected-category-label"),

      changeCategory: document.getElementById("sl-change-category"),
      continueBtn: document.getElementById("sl-continue"),
      accountBtn: document.getElementById("sl-account"),
      signoutBtn: document.getElementById("sl-signout"),

      loginHint: document.getElementById("sl-login-hint"),
      email: document.getElementById("sl-email"),
      sendLink: document.getElementById("sl-sendlink"),
      signedInLine: document.getElementById("sl-signedin"),
      authStatus: document.getElementById("sl-auth-status"),

      checkoutBtn: document.getElementById("sl-checkout"),
      status: document.getElementById("sl-status"),

      preview: document.getElementById("sl-preview"),
      previewTitle: document.getElementById("sl-preview-title"),
      previewDesc: document.getElementById("sl-preview-desc"),
      previewBullets: document.getElementById("sl-preview-bullets"),
      previewFoot: document.getElementById("sl-preview-foot"),
    };
  }

  function setText(el, value) {
    if (!el) return;
    el.textContent = value == null ? "" : String(value);
  }

  function setHtml(el, value) {
    if (!el) return;
    el.innerHTML = value == null ? "" : String(value);
  }

  function updateUrlCategory(cat, { replace = false, preserveHash = true } = {}) {
    try {
      const url = new URL(location.href);

      if (cat) url.searchParams.set("category", cat);
      else url.searchParams.delete("category");

      const hash = preserveHash ? url.hash : "";
      const next = url.pathname + url.search + hash;

      if (replace) history.replaceState({}, "", next);
      else history.pushState({}, "", next);
    } catch {}
  }

  function scrollToSection(id, smooth = true) {
    const el =
      document.getElementById(id) ||
      document.querySelector(`section#${id}`) ||
      document.querySelector(`[data-section="${id}"]`);

    if (!el) return;

    try {
      el.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "start",
      });
    } catch {
      try {
        window.scrollTo(0, el.offsetTop || 0);
      } catch {}
    }
  }

  function getMeta(cat) {
    return META[cat] || {
      title: "Category",
      desc: "Includes examples like:",
      bullets: [],
      foot: "You’ll also receive future Pro tools added to this category.",
    };
  }

  function renderPreview(cat) {
    const els = getEls();
    const meta = getMeta(cat);

    if (els.previewTitle) {
      setText(els.previewTitle, meta.title);
    } else if (els.preview) {
      const heading = els.preview.querySelector("h1,h2,h3,h4");
      if (heading) setText(heading, meta.title);
    }

    if (els.previewDesc) setText(els.previewDesc, meta.desc);
    if (els.previewFoot) setText(els.previewFoot, meta.foot);

    const bulletList =
      els.previewBullets || (els.preview ? els.preview.querySelector("ul") : null);

    if (bulletList) {
      setHtml(bulletList, "");
      for (const item of meta.bullets) {
        const li = document.createElement("li");
        li.textContent = item;
        bulletList.appendChild(li);
      }
    }

    if (els.preview) {
      els.preview.style.display = "";
      els.preview.hidden = false;
    }
  }

  function renderCategoryPills(cat) {
    const els = getEls();
    const label = cat || "None selected";

    if (els.categoryPillUpgrade) {
      setText(els.categoryPillUpgrade, label);
    }

    if (isCheckoutPage()) {
      if (els.categoryPillUpgradeAlt) {
        setText(els.categoryPillUpgradeAlt, label);
      }
      if (els.selectedLabelCheckout) {
        setText(els.selectedLabelCheckout, label);
      }
    } else {
      if (els.categoryPillUpgradeAlt) {
        setText(els.categoryPillUpgradeAlt, label);
      }
    }
  }

  function renderButtons() {
    const els = getEls();
    const signedIn = !!(currentSession && currentSession.user && currentSession.user.email);
    const hasCategory = !!currentCategory;

    if (els.continueBtn) {
      els.continueBtn.disabled = !hasCategory;
    }

    if (els.checkoutBtn) {
      els.checkoutBtn.disabled = !(signedIn && hasCategory);
    }
  }

  function renderSignedInUi() {
    const els = getEls();
    const email = currentSession && currentSession.user && currentSession.user.email
      ? currentSession.user.email
      : "";

    if (els.signedInLine) {
      els.signedInLine.style.display = "";
      setText(els.signedInLine, email ? `Signed in as ${email}` : "Not signed in");
    }

    if (els.loginHint) {
      els.loginHint.style.display = email ? "none" : "";
    }

    if (els.email) {
      els.email.style.display = email ? "none" : "";
    }

    if (els.sendLink) {
      els.sendLink.style.display = email ? "none" : "";
    }
  }

  function renderAll() {
    renderCategoryPills(currentCategory);
    renderPreview(currentCategory);
    renderSignedInUi();
    renderButtons();
  }

  function setCategory(cat, opts = {}) {
    const { pushUrl = true, replaceUrl = false } = opts;
    currentCategory = cleanSlug(cat);

    setStoredCategory(currentCategory);

    if (pushUrl) {
      updateUrlCategory(currentCategory, { replace: replaceUrl });
    }

    renderAll();
  }

  function parseCategoryFromElement(el) {
    if (!el) return null;

    const dataCategory = el.getAttribute && el.getAttribute("data-category");
    if (dataCategory) return cleanSlug(dataCategory);

    const id = el.id || "";
    if (id.startsWith("sl-unlock-")) {
      return cleanSlug(id.slice("sl-unlock-".length));
    }

    const href = el.getAttribute && el.getAttribute("href");
    if (href && href.includes("category=")) {
      try {
        const url = new URL(href, location.origin);
        return cleanSlug(url.searchParams.get("category"));
      } catch {}
    }

    return null;
  }

  function findCategoryTarget(target) {
    if (!target || !(target instanceof Element)) return null;

    return (
      target.closest("[data-category]") ||
      target.closest('[id^="sl-unlock-"]') ||
      target.closest('a[href*="category="]')
    );
  }

  function goToCheckout(cat) {
    const slug = cleanSlug(cat || currentCategory);
    if (!slug) return;

    setStoredCategory(slug);
    location.href = `${CHECKOUT_PATH}?category=${encodeURIComponent(slug)}`;
  }

  function goToUpgrade(cat, extra = "") {
    const slug = cleanSlug(cat || currentCategory);
    const base = slug
      ? `${UPGRADE_PATH}?category=${encodeURIComponent(slug)}`
      : UPGRADE_PATH;
    location.href = `${base}${extra || ""}`;
  }

  function handleCategorySelection(cat) {
    if (!cat) return;

    setCategory(cat, { pushUrl: true });

    if (isCheckoutPage()) return;

    const returningToCheckout = getReturnParam() === "checkout";
    const signedIn = !!(currentSession && currentSession.user && currentSession.user.email);

    if (returningToCheckout && signedIn) {
      goToCheckout(cat);
      return;
    }

    requestAnimationFrame(() => {
      scrollToSection("checkout", true);
    });
  }

  function handleDocumentClick(event) {
    const target = event.target;

    const categoryTarget = findCategoryTarget(target);
    if (categoryTarget) {
      const cat = parseCategoryFromElement(categoryTarget);
      if (cat) {
        event.preventDefault();
        event.stopPropagation();
        handleCategorySelection(cat);
        return;
      }
    }

    const els = getEls();

    if (els.changeCategory && target instanceof Element && target.closest("#sl-change-category")) {
      event.preventDefault();
      event.stopPropagation();

      if (isCheckoutPage()) {
        const cat = currentCategory || getResolvedCategory();
        const query = cat
          ? `?category=${encodeURIComponent(cat)}&return=checkout`
          : "?return=checkout";
        location.href = `${UPGRADE_PATH}${query}#categories`;
      } else {
        requestAnimationFrame(() => {
          scrollToSection("categories", true);
        });
      }
      return;
    }

    if (els.continueBtn && target instanceof Element && target.closest("#sl-continue")) {
      event.preventDefault();
      event.stopPropagation();

      if (!currentCategory) {
        scrollToSection("categories", true);
        return;
      }

      const signedIn = !!(currentSession && currentSession.user && currentSession.user.email);
      if (signedIn) {
        goToCheckout(currentCategory);
      } else {
        requestAnimationFrame(() => {
          scrollToSection("checkout", true);
        });
      }
      return;
    }

    if (els.accountBtn && target instanceof Element && target.closest("#sl-account")) {
      event.preventDefault();
      event.stopPropagation();
      location.href = "/account/";
      return;
    }

    if (els.signoutBtn && target instanceof Element && target.closest("#sl-signout")) {
      event.preventDefault();
      event.stopPropagation();
      handleSignOut();
      return;
    }

    if (
      isCheckoutPage() &&
      els.checkoutBtn &&
      target instanceof Element &&
      target.closest("#sl-checkout")
    ) {
      event.preventDefault();
      event.stopPropagation();
      handleCheckout();
    }
  }

  async function getSB() {
    const auth = window.SL_AUTH;
    if (!auth) return null;

    if (auth.ready && typeof auth.ready.then === "function") {
      try {
        await auth.ready;
      } catch {}
    }

    return auth.sb || null;
  }

  async function syncSession() {
    try {
      const sb = await getSB();
      if (!sb) {
        currentSession = null;
        renderAll();
        return;
      }

      const { data } = await sb.auth.getSession();
      currentSession = data && data.session ? data.session : null;

      if (!window.SL_AUTH) window.SL_AUTH = {};
      window.SL_AUTH.__session = currentSession;

      renderAll();

      if (!authSubscribed) {
        sb.auth.onAuthStateChange((_event, session) => {
          currentSession = session || null;

          if (!window.SL_AUTH) window.SL_AUTH = {};
          window.SL_AUTH.__session = currentSession;

          renderAll();

          if (!isCheckoutPage()) {
            const returningToCheckout = getReturnParam() === "checkout";
            const signedIn =
              !!(currentSession && currentSession.user && currentSession.user.email);
            if (returningToCheckout && signedIn && currentCategory) {
              goToCheckout(currentCategory);
            }
          }
        });

        authSubscribed = true;
      }
    } catch (err) {
      console.warn("[app.js] auth sync error:", err);
      currentSession = null;
      renderAll();
    }
  }

  async function handleSignOut() {
    const els = getEls();

    try {
      if (els.signoutBtn) els.signoutBtn.disabled = true;
      const sb = await getSB();
      if (sb) {
        await sb.auth.signOut();
      }
    } catch (err) {
      console.warn("[app.js] signout error:", err);
    }

    currentSession = null;
    if (!window.SL_AUTH) window.SL_AUTH = {};
    window.SL_AUTH.__session = null;

    try {
      localStorage.removeItem(LS_KEY);
    } catch {}

    currentCategory = getUrlCategory() || null;
    renderAll();

    location.href = `${UPGRADE_PATH}#checkout`;
  }

  async function handleCheckout() {
    const els = getEls();
    const email =
      currentSession && currentSession.user && currentSession.user.email
        ? currentSession.user.email
        : "";

    if (!email || !currentCategory) {
      renderAll();
      return;
    }

    try {
      if (els.checkoutBtn) els.checkoutBtn.disabled = true;
      if (els.status) setText(els.status, "Opening Stripe Checkout…");

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          category: currentCategory,
          email,
        }),
      });

      if (!response.ok) {
        throw new Error(`bad_status_${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.url) {
        throw new Error("missing_url");
      }

      location.href = data.url;
    } catch (err) {
      console.error("[app.js] checkout error:", err);
      if (els.status) setText(els.status, "Failed to start checkout");
      if (els.checkoutBtn) els.checkoutBtn.disabled = false;
    }
  }

  function bindGlobalHandlers() {
    if (globalHandlersBound) return;

    document.addEventListener("click", handleDocumentClick, true);

    window.addEventListener("popstate", () => {
      initPage({ fromHistory: true, replaceUrl: true });
    });

    window.addEventListener("pageshow", (event) => {
      initPage({
        fromHistory: !!event.persisted,
        replaceUrl: true,
      });
    });

    globalHandlersBound = true;
  }

  function initPage(options = {}) {
    const { fromHistory = false, replaceUrl = false } = options;

    currentCategory = getResolvedCategory();
    setStoredCategory(currentCategory);

    if (currentCategory) {
      updateUrlCategory(currentCategory, { replace: true });
    }

    renderAll();

    if (!isCheckoutPage()) {
      if (location.hash === "#checkout") {
        requestAnimationFrame(() => {
          scrollToSection("checkout", !fromHistory);
        });
      }

      if (getReturnParam() === "checkout") {
        requestAnimationFrame(() => {
          scrollToSection("categories", !fromHistory);
        });
      }
    } else if (!currentCategory) {
      const els = getEls();
      if (els.status) setText(els.status, "Choose a category to continue.");
    }

    if (replaceUrl && currentCategory) {
      updateUrlCategory(currentCategory, { replace: true });
    }
  }

  async function start() {
    bindGlobalHandlers();
    initPage({ replaceUrl: true });
    await syncSession();

    if (isCheckoutPage()) {
      const signedIn =
        !!(currentSession && currentSession.user && currentSession.user.email);

      if (!signedIn) {
        const cat = currentCategory || getResolvedCategory();
        const url = cat
          ? `${UPGRADE_PATH}?category=${encodeURIComponent(cat)}#checkout`
          : `${UPGRADE_PATH}#checkout`;
        location.href = url;
        return;
      }
    }

    if (!isCheckoutPage()) {
      const returningToCheckout = getReturnParam() === "checkout";
      const signedIn =
        !!(currentSession && currentSession.user && currentSession.user.email);

      if (returningToCheckout && signedIn && currentCategory) {
        goToCheckout(currentCategory);
        return;
      }
    }
  }

  start();
})();