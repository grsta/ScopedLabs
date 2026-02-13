// Cloudflare Pages Function: POST /api/stripe-webhook
// Verifies Stripe signature and writes entitlements to Supabase.
// Required env vars:
// - STRIPE_WEBHOOK_SECRET
// - SUPABASE_URL
// - SUPABASE_SERVICE_ROLE_KEY

async function hmacSHA256(key, msg) {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function parseStripeSig(header) {
  // header: "t=...,v1=...,v1=..."
  const parts = String(header || "").split(",").map(s => s.trim());
  const out = { t: null, v1: [] };
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k === "t") out.t = v;
    if (k === "v1") out.v1.push(v);
  }
  return out;
}

export async function onRequestPost({ request, env }) {
  const STRIPE_WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!STRIPE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response("Server not configured", { status: 500 });
  }

  const sigHeader = request.headers.get("Stripe-Signature");
  if (!sigHeader) return new Response("Missing signature", { status: 400 });

  // Stripe requires the raw body for signature verification
  const rawBody = await request.text();
  const { t, v1 } = parseStripeSig(sigHeader);
  if (!t || !v1.length) return new Response("Bad signature header", { status: 400 });

  // Compute expected signature: HMAC_SHA256(secret, `${t}.${rawBody}`)
  const signedPayload = `${t}.${rawBody}`;
  const expected = await hmacSHA256(STRIPE_WEBHOOK_SECRET, signedPayload);

  const ok = v1.some(sig => timingSafeEqual(sig, expected));
  if (!ok) return new Response("Signature verification failed", { status: 400 });

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // We care about checkout.session.completed
  if (event.type !== "checkout.session.completed") {
    return new Response("Ignored", { status: 200 });
  }

  const session = event.data && event.data.object ? event.data.object : {};
  const userId = session.client_reference_id;
  const category = session.metadata && session.metadata.category ? String(session.metadata.category).toLowerCase().trim() : "";

  if (!userId || !category) {
    return new Response("Missing fields", { status: 200 });
  }

  // Insert entitlement (upsert on unique constraint user_id+category)
  const insertBody = [{ user_id: userId, category, source: "stripe" }];

  const upRes = await fetch(`${SUPABASE_URL}/rest/v1/entitlements?on_conflict=user_id,category`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "resolution=merge-duplicates,return=minimal"
    },
    body: JSON.stringify(insertBody)
  });

  if (!upRes.ok) {
    const txt = await upRes.text();
    return new Response(`Supabase error: ${txt.slice(0, 300)}`, { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
