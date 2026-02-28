export async function onRequest({ request, env }) {
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ categories: [], error: "Server not configured" }, 500);
  }

  const auth = request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const token = m ? m[1].trim() : "";

  if (!token) {
    return json({ categories: [] }, 200);
  }

  // Get user from Supabase token
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
  });

  if (!userRes.ok) {
    return json({ categories: [] }, 200);
  }

  const user = await userRes.json();
  const userId = user?.id;

  if (!userId) {
    return json({ categories: [] }, 200);
  }

  // Read entitlements
  const entRes = await fetch(
    `${SUPABASE_URL}/rest/v1/entitlements?select=category&user_id=eq.${userId}&active=eq.true`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        Accept: "application/json",
      },
    }
  );

  if (!entRes.ok) {
    return json({ categories: [] }, 200);
  }

  const rows = await entRes.json();

  const categories = Array.isArray(rows)
    ? rows.map(r => r.category).filter(Boolean)
    : [];

  return json({ categories }, 200);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}