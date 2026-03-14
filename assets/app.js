/* /assets/app.js
   ScopedLabs Upgrade + Checkout controller
   LOCKED-DOWN version:
   - unlock state comes from backend only
   - category pages and pro tool pages trust only server-fetched entitlements
   - localStorage is cache/UI only, not source of truth
*/

(() => {
  "use strict";

  const LS_KEY = "sl_selected_category";
  const UPGRADE_PATH = "/upgrade/";
  const CHECKOUT_PATH = "/upgrade/checkout/";
  const LS_UNLOCK_CACHE_KEY = "sl_unlocked_categories";

  let currentCategory = null;
  let currentSession = null;
  let authSubscribed = false;
  let globalHandlersBound = false;
  let unlockedCategories = [];
  let unlockSyncComplete = false;

  function isUpgradePage() {
    return location.pathname.startsWith("/upgrade/");
  }

  function isCheckoutPage() {
    return (
      location.pathname.startsWith("/upgrade/checkout") ||
      location.pathname.startsWith("/upgrade/checkout/")
    );
  }

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
    power: {
      title: "Power",
      desc: "UPS sizing, runtime estimates, and load planning.",
      bullets: [
        "UPS runtime calculators",
        "Battery bank sizing",
        "Load + headroom planning",
      ],
      foot: "You’ll also receive future Pro tools added to this category.",
    },
    thermal: {
      title: "Thermal",
      desc: "Heat load estimates, airflow planning, and temperature margins.",
      bullets: [
        "BTU/HR load estimation",
        "Airflow requirements",
        "Cooling headroom planning",
      ],
      foot: "You’ll also receive future Pro tools added to this category.",
    },
    "video-storage": {
      title: "Video Storage",
      desc: "Retention planning, bitrate/storage math, and RAID impact.",
      bullets: [
        "Retention + motion modeling",
        "Overhead + RAID impact",
        "Capacity planning",
      ],
      foot: "You’ll also receive future Pro tools added to this category.",
    },
    wireless: {
      title: "Wireless",
      desc: "Link budgets, coverage planning, and capacity sanity checks.",
      bullets: [
        "Coverage + AP density planning",
        "Capacity + client load",
        "Link budget checks",
      ],
      foot: "You’ll also receive future Pro tools added to this category.",
    },
  };

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

  function getMeta(cat) {
    return META[cat] || {
      title: "None selected",
      desc: "Select a category to see its preview.",
      bullets: [],
      foot: "You’ll also receive future Pro tools added to this category.",
    };
  }

  function getEls() {
    return {
      checkoutTitle: document.getElementById("sl-checkout-title"),
      changeCategory: document.getElementById("sl-change-category"),
      continueBtn: document.getElementById("sl-continue"),
      accountBtn: document.getElementById("sl-account"),
      signoutBtn: document.getElementById("sl-signout"),

      loginHint: document.getElementById("sl-login-hint"),
      emailWrap: document.getElementById("sl-email-wrap"),
      email: document.getElementById("sl-email"),
      sendLink: document.getElementById("sl-sendlink"),
      signedInLine: document.getElementById("sl-signedin"),
      authStatus: document.getElementById("sl-auth-status"),

      selectedLabelCheckout: document.getElementById("sl-selected-category-label"),
      checkoutBtn: document.getElementById("sl-checkout"),
      status: document.getElementById("sl-status"),
      mustSignin: document.getElementById("sl-must-signin"),

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

  function setHTML(el, value) {
    if (!el) return;
    el.innerHTML = value == null ? "" : String(value);
  }

  function updateUrlCategory(cat, { replace = false } = {}) {
    try {
      const url = new URL(location.href);

      if (cat) url.searchParams.set("category", cat);
      else url.searchParams.delete("category");

      const ret = getReturnParam();
      if (ret) url.searchParams.set("return", ret);

      const next = url.pathname + url.search + url.hash;
      if (replace) history.replaceState({}, "", next);
      else history.pushState({}, "", next);
    } catch {}
  }

  function cleanNonUpgradeQueryParams() {
    try {
      if (isUpgradePage() || isCheckoutPage()) return;

      const url = new URL(location.href);
      let changed = false;

      if (url.searchParams.has("category")) {
        url.searchParams.delete("category");
        changed = true;
      }

      if (url.searchParams.has("return")) {
        url.searchParams.delete("return");
        changed = true;
      }

      if (!changed) return;

      const next = url.pathname + url.search + url.hash;
      history.replaceState({}, "", next);
    } catch {}
  }

  function scrollToCheckout({ instant = false } = {}) {
    const el =
      document.getElementById("checkout") ||
      document.querySelector("section#checkout") ||
      document.querySelector('[data-section="checkout"]');

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

  function scrollToCategories({ instant = false } = {}) {
    const el =
      document.getElementById("categories") ||
      document.querySelector("section#categories") ||
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

    const list =
      els.previewBullets || (els.preview ? els.preview.querySelector("ul") : null);

    if (list) {
      setHTML(list, "");
      for (const bullet of meta.bullets || []) {
        const li = document.createElement("li");
        li.textContent = bullet;
        list.appendChild(li);
      }
    }

    if (els.preview) {
      els.preview.hidden = false;
      els.preview.style.display = "";
    }
  }

  function renderTitle(cat) {
    const els = getEls();
    const meta = getMeta(cat);
    if (els.checkoutTitle) {
      setText(els.checkoutTitle, `Unlock ${meta.title}`);
    }
  }

  function renderCheckoutLabel(cat) {
    if (!isCheckoutPage()) return;
    const els = getEls();
    const meta = getMeta(cat);
    if (els.selectedLabelCheckout) {
      setText(els.selectedLabelCheckout, meta.title);
    }
  }

  function renderSignedInUi() {
    const els = getEls();
    const email =
      currentSession &&
      currentSession.user &&
      currentSession.user.email
        ? currentSession.user.email
        : "";

    if (els.signedInLine) {
      els.signedInLine.textContent = email ? `Signed in as ${email}` : "Not signed in";
      els.signedInLine.style.display = "";
    }

    if (els.mustSignin) {
      els.mustSignin.style.display = email ? "none" : "";
    }

    if (els.emailWrap) {
      els.emailWrap.style.display = email ? "none" : "";
    }

    if (els.loginHint) {
      els.loginHint.style.display = email ? "none" : "";
    }

    if (els.sendLink) {
      els.sendLink.style.display = email ? "none" : "";
    }

    if (els.authStatus && email) {
      els.authStatus.textContent = "";
    }
  }

  function renderButtons() {
    const els = getEls();
    const signedIn =
      !!(currentSession && currentSession.user && currentSession.user.email);
    const hasCategory = !!currentCategory;

    if (els.continueBtn && !isCheckoutPage()) {
      els.continueBtn.disabled = !hasCategory;
    }

    if (els.checkoutBtn && isCheckoutPage()) {
      els.checkoutBtn.disabled = !(signedIn && hasCategory);
    }
  }

  function renderAll() {
    renderTitle(currentCategory);
    renderCheckoutLabel(currentCategory);
    renderPreview(currentCategory);
    renderSignedInUi();
    renderButtons();
  }

  function setCategory(cat, { pushUrl = true, replaceUrl = false } = {}) {
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
    if (!(target instanceof Element)) return null;

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

  function getCachedUnlocks() {
    return [...unlockedCategories];
  }

  function clearLegacyUnlockKeys() {
    try {
      const keysToDelete = [];
      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (key && key.startsWith("scopedlabs_pro_")) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => localStorage.removeItem(key));
    } catch {}
  }

  function hydrateUnlocksFromCache() {
    try {
      const raw = localStorage.getItem(LS_UNLOCK_CACHE_KEY);
      if (!raw) return;

      const cached = raw
        .split(",")
        .map(cleanSlug)
        .filter(Boolean);

      if (cached.length) {
        unlockedCategories = cached;
      }
    } catch {}
  }

  function setUnlockedCategories(list) {
    unlockedCategories = (Array.isArray(list) ? list : [])
      .map(cleanSlug)
      .filter(Boolean);

    try {
      if (unlockedCategories.length) {
        localStorage.setItem(LS_UNLOCK_CACHE_KEY, unlockedCategories.join(","));
      } else {
        localStorage.removeItem(LS_UNLOCK_CACHE_KEY);
      }
    } catch {}

    applyUnlockedCategoryUi();
  }

  function isCategoryUnlocked(cat) {
    const slug = cleanSlug(cat);
    if (!slug) return false;
    return getCachedUnlocks().includes(slug);
  }

  function isSignedIn() {
    return !!(currentSession && currentSession.user && currentSession.user.email);
  }

  function isProtectedProToolPage() {
    const body = document.body;
    if (!body) return false;

    if (isUpgradePage() || isCheckoutPage()) return false;

    return body.dataset.tier === "pro";
  }

  function redirectToUpgradeForCategory(cat) {
    const slug = cleanSlug(cat || document.body?.dataset?.category || currentCategory);
    const url = slug
      ? `${UPGRADE_PATH}?category=${encodeURIComponent(slug)}`
      : UPGRADE_PATH;

    location.href = url;
  }

  function enforceProToolAccess() {
  if (!isProtectedProToolPage()) return false;

  const pageCategory =
    cleanSlug(document.body?.dataset?.category) || currentCategory;

  // Signed-out users should NEVER get pro access.
  if (!isSignedIn()) {
    redirectToUpgradeForCategory(pageCategory);
    return true;
  }

  // Signed-in users can temporarily use cached unlocks while auth/unlock sync finishes.
  if (isCategoryUnlocked(pageCategory)) {
    return false;
  }

  // Signed in, but still restoring auth/unlocks — do not hard-fail yet.
  if (!unlockSyncComplete) {
    return false;
  }

  redirectToUpgradeForCategory(pageCategory);
  return true;
}


  function applyUnlockedCategoryUi() {
  const category = cleanSlug(document.body?.dataset?.category);
  if (!category) return;

  const links = document.querySelectorAll("a[data-tool]");

  links.forEach((row) => {
    if (!row.dataset.upgradeHref) {
      row.dataset.upgradeHref = row.getAttribute("href") || "";
    }

    const isProLink =
      row.classList.contains("pro") ||
      row.dataset.upgradeHref.includes("/upgrade/");

    if (!isProLink) return;

    if (!isCategoryUnlocked(category)) {
      row.setAttribute("href", row.dataset.upgradeHref);
      return;
    }

    row.setAttribute("href", row.dataset.tool);

    const lock = row.querySelector(".lock-icon");
    if (lock) lock.remove();

    const pill = row.querySelector(".pill");
    if (pill) {
      pill.textContent = "Unlocked";
      pill.classList.add("unlocked-pill");
    }
  });
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

  async function syncUnlockedCategories() {
  clearLegacyUnlockKeys();

  // If session is not ready yet, preserve cached unlocks.
  if (!currentSession || !currentSession.access_token) {
    unlockSyncComplete = false;
    applyUnlockedCategoryUi();
    return;
  }

  try {
    const response = await fetch("/api/unlocks/list", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${currentSession.access_token}`,
      },
    });

    let data = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok || !data || !data.ok || !Array.isArray(data.categories)) {
      console.warn("[app.js] unlock sync returned unexpected response; preserving cached unlocks");
      unlockSyncComplete = true;
      applyUnlockedCategoryUi();
      return;
    }

    unlockSyncComplete = true;
    setUnlockedCategories(data.categories);
  } catch (err) {
    console.warn("[app.js] unlock sync error; preserving cached unlocks:", err);
    unlockSyncComplete = true;
    applyUnlockedCategoryUi();
  }
}

  async function syncSession() {
  try {
    const sb = await getSB();

    if (!sb) {
      // Preserve any prior session/cache state long enough for tool pages to load.
      currentSession = (window.SL_AUTH && window.SL_AUTH.__session) || currentSession || null;

      renderAll();

      if (getCachedUnlocks().length) {
        unlockSyncComplete = false;
        applyUnlockedCategoryUi();
      } else {
        await syncUnlockedCategories();
      }

      return;
    }

    const { data } = await sb.auth.getSession();
    currentSession = data && data.session ? data.session : null;

    if (!window.SL_AUTH) window.SL_AUTH = {};
    window.SL_AUTH.__session = currentSession;

    renderAll();
    await syncUnlockedCategories();

    if (!authSubscribed) {
      sb.auth.onAuthStateChange(async (_event, session) => {
        currentSession = session || null;

        if (!window.SL_AUTH) window.SL_AUTH = {};
        window.SL_AUTH.__session = currentSession;

        unlockSyncComplete = false;
        renderAll();
        await syncUnlockedCategories();

        if (enforceProToolAccess()) return;

        if (!isCheckoutPage()) {
          const returning = getReturnParam() === "checkout";
          const signedInNow =
            !!(currentSession && currentSession.user && currentSession.user.email);

          if (
            returning &&
            signedInNow &&
            currentCategory &&
            location.hash !== "#categories"
          ) {
            goToCheckout(currentCategory);
          }
        }
      });

      authSubscribed = true;
    }
  } catch (err) {
    console.warn("[app.js] auth sync error:", err);
    renderAll();

    if (getCachedUnlocks().length) {
      unlockSyncComplete = false;
      applyUnlockedCategoryUi();
      return;
    }

    currentSession = null;
    await syncUnlockedCategories();
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
    unlockSyncComplete = false;

    if (!window.SL_AUTH) window.SL_AUTH = {};
    window.SL_AUTH.__session = null;

    try {
      localStorage.removeItem(LS_KEY);
      localStorage.removeItem(LS_UNLOCK_CACHE_KEY);
    } catch {}

    clearLegacyUnlockKeys();
    setUnlockedCategories([]);

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

    const user_id =
      currentSession && currentSession.user && currentSession.user.id
        ? currentSession.user.id
        : "";

    if (!email || !currentCategory || !user_id) {
      if (els.status) {
        els.status.textContent = "Missing account info. Please sign in again.";
      }
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
          user_id,
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data && data.error
            ? `bad_status_${response.status}: ${data.error}`
            : `bad_status_${response.status}`
        );
      }

      if (!data || !data.url) {
        throw new Error("missing_url");
      }

      location.href = data.url;
    } catch (err) {
      console.error("[app.js] checkout error:", err);
      if (els.status) {
        els.status.textContent =
          err && err.message
            ? `Checkout failed: ${err.message}`
            : "Failed to start checkout";
      }
      if (els.checkoutBtn) els.checkoutBtn.disabled = false;
    }
  }

  function handleCategorySelection(cat) {
    if (!cat) return;

    setCategory(cat, { pushUrl: true });

    if (isCheckoutPage()) return;

    const returningToCheckout = getReturnParam() === "checkout";
    const signedIn =
      !!(currentSession && currentSession.user && currentSession.user.email);

    if (returningToCheckout && signedIn) {
      goToCheckout(cat);
      return;
    }

    requestAnimationFrame(() => {
      scrollToCheckout({ instant: false });
    });
  }

    function handleDocumentClick(event) {
    const target = event.target;

    if (target instanceof Element) {
      const row = target.closest("a[data-tool]");
      if (row) {
        const category = cleanSlug(document.body?.dataset?.category);
        const tool = row.dataset.tool;

        if (category && tool && isCategoryUnlocked(category)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          event.stopPropagation();
          window.location.assign(tool);
          return;
        }
      }
    }

    if (isUpgradePage()) {
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
    }

    if (target instanceof Element && target.closest("#sl-change-category")) {
      event.preventDefault();
      event.stopPropagation();

      const cat = currentCategory || getResolvedCategory();
      const query = cat
        ? `?category=${encodeURIComponent(cat)}&return=checkout`
        : "?return=checkout";

      location.href = `${UPGRADE_PATH}${query}#categories`;
      return;
    }

    if (target instanceof Element && target.closest("#sl-continue")) {
      event.preventDefault();
      event.stopPropagation();

      if (!currentCategory) {
        scrollToCategories({ instant: false });
        return;
      }

      const signedIn =
        !!(currentSession && currentSession.user && currentSession.user.email);

      if (signedIn) {
        goToCheckout(currentCategory);
      } else {
        requestAnimationFrame(() => {
          scrollToCheckout({ instant: false });
        });
      }
      return;
    }

    if (target instanceof Element && target.closest("#sl-account")) {
      event.preventDefault();
      event.stopPropagation();
      location.href = "/account/";
      return;
    }

    if (target instanceof Element && target.closest("#sl-signout")) {
      event.preventDefault();
      event.stopPropagation();
      handleSignOut();
      return;
    }

    if (isCheckoutPage() && target instanceof Element && target.closest("#sl-checkout")) {
      event.preventDefault();
      event.stopPropagation();
      handleCheckout();
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
      applyUnlockedCategoryUi();
    });

    globalHandlersBound = true;
  }

  function initPage({ fromHistory = false, replaceUrl = false } = {}) {
    const bodyCategory = cleanSlug(document.body?.dataset?.category);

    if (isUpgradePage() || isCheckoutPage()) {
      currentCategory = getResolvedCategory();
      setStoredCategory(currentCategory);

      if (currentCategory) {
        updateUrlCategory(currentCategory, { replace: true });
      }
    } else {
      currentCategory = bodyCategory || null;
      cleanNonUpgradeQueryParams();
    }

    renderAll();
    applyUnlockedCategoryUi();

    if (!isCheckoutPage()) {
      if (location.hash === "#checkout") {
        requestAnimationFrame(() => {
          scrollToCheckout({ instant: fromHistory });
        });
      }

      if (getReturnParam() === "checkout") {
        requestAnimationFrame(() => {
          scrollToCategories({ instant: fromHistory });
        });
      }
    } else if (!currentCategory) {
      const els = getEls();
      if (els.status) setText(els.status, "Choose a category to continue.");
    }

    if ((isUpgradePage() || isCheckoutPage()) && replaceUrl && currentCategory) {
      updateUrlCategory(currentCategory, { replace: true });
    }
  }

  async function start() {
    hydrateUnlocksFromCache();
    bindGlobalHandlers();
    initPage({ replaceUrl: true });
    applyUnlockedCategoryUi();
    await syncSession();

    if (enforceProToolAccess()) return;

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
      const returning = getReturnParam() === "checkout";
      const signedIn =
        !!(currentSession && currentSession.user && currentSession.user.email);

      if (
        returning &&
        signedIn &&
        currentCategory &&
        location.hash !== "#categories"
      ) {
        goToCheckout(currentCategory);
      }
    }

    applyUnlockedCategoryUi();
  }

  start();
})();
