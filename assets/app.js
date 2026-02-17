/* /assets/app.js
   ScopedLabs Upgrade controller (category sync + checkout UI)

   - Keeps category in sync:
       URL ?category=, localStorage(sl_selected_category), UI pill #selected-category
   - Injects preview card into #selected-category-preview
   - Responds to auth changes (from auth.js event "sl-auth-changed")
   - Shows/hides checkout actions based on session
   - Scrolls to #checkout when return=checkout or #checkout present
*/

(() => {
  "use strict";

  function $(sel) {
    return document.querySelector(sel);
  }

  const els = {
    // Category UI
    selectedPill: $("#selected-category"),
    previewHost: $("#selected-category-preview"),

    // Buttons
    changeCategoryBtn:
      $("#sl-change-category") ||
      Array.from(document.querySelectorAll("button, a")).find((b) =>
        (b.textContent || "").toLowerCase().includes("change category")
      ),

    // Auth/checkout card controls (these exist inside the checkout card)
    checkoutBtn: $("#sl-checkout"),
    signoutBtn: $("#sl-signout"),
    status: $("#sl-status"),
    accountLink:
      Array.from(document.querySelectorAll('a[href*="/account"]')).find(Boolean) ||
      null,

    // Optional: “unlock” buttons in the category list
    categoryPickers: Array.from(
      document.querySelectorAll("[data-category], [data-cat], [data-lane]")
    ),
  };

  const CATEGORY_META = {
    power: {
      title: "Power",
      desc: "UPS runtime, battery sizing, load planning, and surge headroom.",
      bullets: ["UPS runtime helpers", "Battery sizing", "Inrush / surge checks"],
    },
    network: {
      title: "Network",
      desc: "Bandwidth, latency, throughput, and oversubscription planning.",
      bullets: ["Bandwidth planning", "Latency budgets", "Uplink oversubscription"],
    },
    "video-storage": {
      title: "Video & Storage",
      desc: "Retention, bitrate, RAID impact, and storage math.",
      bullets: ["Storage sizing", "Retention planning", "RAID impact helpers"],
    },
    wireless: {
      title: "Wireless",
      desc: "Link planning, channel assumptions, and reliability headroom.",
      bullets: ["Link budget & margin checks", "Coverage + capacity planning", "Interference risk helpers"],
    },
    thermal: {
      title: "Thermal",
      desc: "Heat load planning, airflow assumptions, and environment constraints.",
      bullets: ["BTU/Watt conversion helpers", "Room/rack thermal planning", "Cooling headroom checks"],
    },
    infrastructure: {
      title: "Infrastructure",
      desc: "Unlock Pro tools for Infrastructure (current + future).",
      bullets: ["All current Pro tools in this category", "All future Pro tools added here", "No renewals"],
    },
  };

  function safeSlug(s) {
    return (s || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "");
  }

  function readCategoryFromUrl() {
    try {
      const u = new URL(location.href);
      return safeSlug(u.searchParams.get("category") || "");
    } catch {
      return "";
    }
  }

  function readReturnFromUrl() {
    try {
      const u = new URL(location.href);
      return (u.searchParams.get("return") || "").toLowerCase();
    } catch {
      return "";
    }
  }

  function writeCategoryToUrl(cat) {
    try {
      const u = new URL(location.href);
      if (cat) u.searchParams.set("category", cat);
      else u.searchParams.delete("category");
      history.replaceState({}, "", u.pathname + "?" + u.searchParams.toString() + (location.hash || ""));
    } catch {}
  }

  function saveCategory(cat) {
    try {
      if (cat) localStorage.setItem("sl_selected_category", cat);
      else localStorage.removeItem("sl_selected_category");
    } catch {}
  }

  function loadSavedCategory() {
    try {
      return safeSlug(localStorage.getItem("sl_selected_category") || "");
    } catch {
      return "";
    }
  }

  function setStatus(msg, isError = false) {
    if (!els.status) return;
    els.status.textContent = msg || "";
    els.status.style.color = isError ? "#ffb4b4" : "";
  }

  function setSelectedCategoryLabel(cat) {
    if (!els.selectedPill) return;
    els.selectedPill.textContent = cat || "None selected";
  }

  function renderPreviewCard(cat) {
    if (!els.previewHost) return;

    // clear
    els.previewHost.innerHTML = "";

    if (!cat) return;

    const meta = CATEGORY_META[cat] || {
      title: cat.charAt(0).toUpperCase() + cat.slice(1),
      desc: `You are unlocking ${cat}.`,
      bullets: [],
    };

    const card = document.createElement("div");
    card.className = "card";
    card.style.maxWidth = "440px";
    card.style.width = "100%";
    card.style.background = "rgba(0,0,0,.16)";

    const bulletsHtml =
      meta.bullets && meta.bullets.length
        ? `<div class="muted" style="margin-top:.85rem; font-weight:600;">Includes examples like:</div>
           <ul style="margin:.5rem 0 0 1.1rem;">
             ${meta.bullets.map((b) => `<li class="muted">${b}</li>`).join("")}
           </ul>`
        : "";

    card.innerHTML = `
      <span class="pill">
        <span aria-hidden="true">🔒</span>&nbsp; Pro — Category Unlock
      </span>
      <h3 style="margin-top:.6rem;">${meta.title}</h3>
      <p class="muted" style="margin-top:.5rem;">${meta.desc}</p>
      ${bulletsHtml}
      <p class="muted" style="margin-top:.9rem;">You'll also receive future Pro tools added to <em>${meta.title}</em>.</p>
    `;

    els.previewHost.appendChild(card);
  }

  function getCurrentCategory() {
    return readCategoryFromUrl() || loadSavedCategory() || "";
  }

  function setCurrentCategory(cat) {
    cat = safeSlug(cat);
    saveCategory(cat);
    writeCategoryToUrl(cat);
    syncCategoryUI();
  }

  function syncCategoryUI() {
    const cat = getCurrentCategory();
    setSelectedCategoryLabel(cat);
    renderPreviewCard(cat);
    // also update “Selected category:” pills elsewhere if any
    Array.from(document.querySelectorAll("[data-selected-category]")).forEach((n) => {
      n.textContent = cat || "None selected";
    });
  }

  function scrollToCheckout() {
    const target = $("#checkout");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (location.hash !== "#checkout") {
      location.hash = "#checkout";
    }
  }

  function wireCategoryPickers() {
    // Strongest: elements with data-category
    const btns = Array.from(document.querySelectorAll("[data-category]"));
    btns.forEach((b) => {
      b.addEventListener("click", (e) => {
        const cat = safeSlug(b.getAttribute("data-category") || "");
        if (!cat) return;
        e.preventDefault();
        setCurrentCategory(cat);
        scrollToCheckout();
      });
    });

    // Optional fallback: any element with href containing ?category=
    const links = Array.from(document.querySelectorAll('a[href*="category="]'));
    links.forEach((a) => {
      a.addEventListener("click", () => {
        try {
          const u = new URL(a.href, location.origin);
          const cat = safeSlug(u.searchParams.get("category") || "");
          if (cat) saveCategory(cat);
        } catch {}
      });
    });

    // Change Category button: go to categories section
    if (els.changeCategoryBtn) {
      els.changeCategoryBtn.addEventListener("click", (e) => {
        e.preventDefault();
        try {
          // keep current category, just go to categories section
          location.href = "/upgrade/?return=checkout#categories";
        } catch {}
      });
    }
  }

  async function getSb() {
    if (!window.SL_AUTH || !window.SL_AUTH.ready) return null;
    try {
      return await window.SL_AUTH.ready;
    } catch {
      return null;
    }
  }

  function applyAuthUI(session) {
    const signedIn = !!(session && session.user && session.user.email);
    const cat = getCurrentCategory();

    // Checkout-related controls exist only when signed in (your HTML has checkout card section hidden by default)
    if (els.checkoutBtn) els.checkoutBtn.disabled = !(signedIn && cat);

    // Sign out button
    if (els.signoutBtn) els.signoutBtn.style.display = signedIn ? "" : "none";

    // Account link
    if (els.accountLink) els.accountLink.style.display = signedIn ? "" : "none";

    // If signed in, show the checkout card actions wrapper if your HTML uses #sl-checkout-card
    const checkoutCard = $("#sl-checkout-card");
    if (checkoutCard) checkoutCard.style.display = signedIn ? "" : "none";

    // small status message
    if (!signedIn) {
      setStatus("Sign in to unlock Pro access.");
    } else if (!cat) {
      setStatus("Choose a category to continue.");
    } else {
      setStatus("");
    }
  }

  async function init() {
    // Keep category UI in sync
    syncCategoryUI();
    wireCategoryPickers();

    // Update on back/forward or manual hash changes
    window.addEventListener("popstate", syncCategoryUI);
    window.addEventListener("hashchange", () => {
      if (location.hash === "#checkout") syncCategoryUI();
    });

    // Hook auth change events from auth.js
    window.addEventListener("sl-auth-changed", (ev) => {
      const session = ev && ev.detail ? ev.detail.session : null;
      applyAuthUI(session);

      // If they were returning to checkout, jump there once signed in
      if (session && (readReturnFromUrl() === "checkout" || location.hash === "#checkout")) {
        scrollToCheckout();
      }
    });

    // On first load, apply current session state (if available)
    const sb = await getSb();
    if (sb) {
      try {
        const { data } = await sb.auth.getSession();
        applyAuthUI(data && data.session ? data.session : null);
      } catch {
        applyAuthUI(null);
      }
    } else {
      applyAuthUI(null);
    }

    // If they landed with return=checkout or #checkout, scroll now
    if (readReturnFromUrl() === "checkout" || location.hash === "#checkout") {
      scrollToCheckout();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

