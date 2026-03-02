/* /assets/account.js
   ScopedLabs Account page controller.

   Works with /account/index.html IDs:
   - #sl-whoami
   - #sl-login-card
   - #sl-checkout-card
   - #sl-email
   - #sl-sendlink
   - #sl-email-hint
   - #sl-entitlements
   - #sl-signout
   - #sl-status

   Requires /assets/auth.js to load first and expose:
   window.SL_AUTH = { sb, ready }
*/

(() => {
  "use strict";

  const els = {
    whoami: document.getElementById("sl-whoami"),
    loginCard: document.getElementById("sl-login-card"),
    checkoutCard: document.getElementById("sl-checkout-card"),
    email: document.getElementById("sl-email"),
    sendLink: document.getElementById("sl-sendlink"),
    emailHint: document.getElementById("sl-email-hint"),
    entitlements: document.getElementById("sl-entitlements"),
    signout: document.getElementById("sl-signout"),
    status: document.getElementById("sl-status"),
  };

  const sb = () => (window.SL_AUTH && window.SL_AUTH.sb ? window.SL_AUTH.sb : null);
  const ready = () =>
    window.SL_AUTH && window.SL_AUTH.ready ? window.SL_AUTH.ready : Promise.resolve();

  function setStatus(msg) {
    if (els.status) els.status.textContent = msg || "";
  }

  function show(el, on) {
    if (!el) return;
    el.style.display = on ? "" : "none";
  }

  function setText(el, txt) {
    if (!el) return;
    el.textContent = txt || "";
  }

  function normalizeCat(c) {
    return String(c || "")
      .trim()
      .toLowerCase();
  }

  function renderEntitlementsList(cats) {
    if (!els.entitlements) return;

    const list = (cats || []).map(normalizeCat).filter(Boolean);

    if (!list.length) {
      els.entitlements.textContent = "No unlocks yet. Go to Upgrade to purchase a category.";
      return;
    }

    // Pretty label
    const pretty = (slug) =>
      slug
        .split("-")
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
        .join(" ");

    // Render as inline chips (no CSS dependency—just spans)
    els.entitlements.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.style.display = "flex";
    wrap.style.flexWrap = "wrap";
    wrap.style.gap = "8px";
    wrap.style.marginTop = "8px";

    list.forEach((slug) => {
      const chip = document.createElement("span");
      chip.className = "pill"; // uses your existing pill styling
      chip.textContent = pretty(slug);
      wrap.appendChild(chip);
    });

    els.entitlements.appendChild(wrap);
  }

  async function fetchEntitlements(session) {
    // Expected backend: GET /api/entitlements
    // Auth: Authorization: Bearer <supabase access_token>
    // Acceptable response shapes:
    // - { categories: ["network","power"] }
    // - { entitlements: [{category:"network"}] }
    // - { data: { categories: [...] } }
    // - ["network","power"]
    if (!els.entitlements) return;

    setText(els.entitlements, "Loading…");

    try {
      const token = session?.access_token || "";
      if (!token) throw new Error("missing_token");

      const res = await fetch("/api/unlocks/list", {
        method: "GET",
        headers: {
          Authorization: "Bearer " + token,
          Accept: "application/json",
        },
      });

      if (!res.ok) throw new Error("bad_status_" + res.status);

      const data = await res.json();

      let cats = null;

      if (Array.isArray(data)) cats = data;
      else if (data && Array.isArray(data.categories)) cats = data.categories;
      else if (data && data.data && Array.isArray(data.data.categories)) cats = data.data.categories;
      else if (data && Array.isArray(data.entitlements))
        cats = data.entitlements.map((x) => (x ? x.category : null));
      else if (data && data.data && Array.isArray(data.data.entitlements))
        cats = data.data.entitlements.map((x) => (x ? x.category : null));

      if (!cats) cats = [];

      renderEntitlementsList(cats);
      setStatus("");
    } catch (e) {
      console.warn("[account.js] entitlements fetch failed:", e);
      setText(els.entitlements, "Unable to load unlocks right now.");
      setStatus("Entitlements check unavailable. If you just purchased, refresh in a moment.");
    }
  }

  function setSignedOutUI() {
    setText(els.whoami, "Not signed in");
    show(els.loginCard, true);
    show(els.checkoutCard, false);
    show(els.signout, false);
    setStatus("");
  }

  function setSignedInUI(email) {
    setText(els.whoami, email ? `Signed in as ${email}` : "Signed in");
    show(els.loginCard, false);
    show(els.checkoutCard, true);
    show(els.signout, true);
  }

  async function refresh() {
    const client = sb();
    if (!client) {
      setStatus("Auth client not available.");
      return;
    }

    try {
      await ready();
      const { data } = await client.auth.getSession();
      const session = data?.session || null;

      if (!session) {
        setSignedOutUI();
        return;
      }

      setSignedInUI(session.user?.email || "");
      await fetchEntitlements(session);
    } catch (e) {
      console.warn("[account.js] refresh failed:", e);
      setSignedOutUI();
    }
  }

  function bindOnce() {
    if (window.__SL_ACCOUNT_BOUND) return;
    window.__SL_ACCOUNT_BOUND = true;

    // Cosmetic hint when sending link (auth.js does the actual signInWithOtp)
    if (els.sendLink && els.email && els.emailHint) {
      els.sendLink.addEventListener("click", () => {
        const email = (els.email.value || "").trim();
        if (!email) {
          els.emailHint.textContent = "Enter your email above.";
          return;
        }
        els.emailHint.textContent = `Sending magic link to ${email}…`;
        setStatus("");
      });
    }

    // Keep UI in sync with auth changes
    const client = sb();
    if (client) {
      ready().then(() => {
        if (window.__SL_ACCOUNT_AUTH_SUB) return;
        window.__SL_ACCOUNT_AUTH_SUB = true;

        client.auth.onAuthStateChange(async (_evt, session) => {
          if (!session) {
            setSignedOutUI();
            return;
          }
          setSignedInUI(session.user?.email || "");
          await fetchEntitlements(session);
        });
      });
    }
  }

  async function init() {
    bindOnce();
    await refresh();
  }

  // Normal load
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // BFCache restore: refresh only (no re-bind)
  window.addEventListener("pageshow", () => {
    refresh();
  });
})();