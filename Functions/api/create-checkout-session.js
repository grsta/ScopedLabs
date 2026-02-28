export async function onRequestPost(ctx) {
  try {
    const { request, env } = ctx;

    const SITE_ORIGIN = env.SITE_ORIGIN;                 // https://scopedlabs.com
    const STRIPE_SECRET_KEY = env.STRIPE_SECRET_KEY;     // sk_live_...
    if (!SITE_ORIGIN) throw new Error("Missing env var: SITE_ORIGIN");
    if (!STRIPE_SECRET_KEY) throw new Error("Missing env var: STRIPE_SECRET_KEY");

    const body = await request.json().catch(() => ({}));
    const priceId = body?.priceId;
    const category = String(body?.category || "").toLowerCase().trim();
    const userId = String(body?.userId || "").trim(); // optional, but REQUIRED for unlock

    if (!priceId) return json({ ok: false, error: "missing_priceId" }, 400);
    if (!category) return json({ ok: false, error: "missing_category" }, 400);

    // After purchase, always send them to /account/ so they can see unlocks.
    const success_url =
      `${SITE_ORIGIN}/account/?success=1&category=${encodeURIComponent(category)}&session_id={CHECKOUT_SESSION_ID}#checkout`;
    const cancel_url =
      `${SITE_ORIGIN}/upgrade/?category=${encodeURIComponent(category)}#checkout`;

    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.append("line_items[0][price]", priceId);
    form.append("line_items[0][quantity]", "1");
    form.set("success_url", success_url);
    form.set("cancel_url", cancel_url);

    // ✅ What your webhook needs:
    // - metadata.category
    // - client_reference_id (user id)
    form.set("metadata[category]", category);
    if (userId) form.set("client_reference_id", userId);

    const resp = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });

    const data = await resp.json();
    if (!resp.ok) return json({ ok: false, error: "stripe_error", detail: data }, 502);

    return json({ ok: true, url: data.url });
  } catch (e) {
    return json({ ok: false, error: "worker_exception", detail: String(e?.message || e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}