// Deno / Supabase Edge Function: Create Stripe Connect Express account and store on profile
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!STRIPE_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required environment variables");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

async function stripeFormRequest(path: string, params: Record<string, string>) {
  const body = new URLSearchParams(params);
  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || "Stripe error");
  }
  return json;
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : undefined;
    if (!jwt) return new Response("Unauthorized", { status: 401 });

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(jwt);
    if (userErr || !userData?.user) return new Response("Unauthorized", { status: 401 });
    const userId = userData.user.id;

    // Create Stripe Connect Express account
    const account = await stripeFormRequest("accounts", { type: "express" });
    const stripeAccountId = account.id as string;

    // Store on profile
    await supabaseAdmin
      .from("profiles")
      .update({ stripe_account_id: stripeAccountId })
      .eq("id", userId);

    return new Response(JSON.stringify({ stripe_account_id: stripeAccountId }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});


