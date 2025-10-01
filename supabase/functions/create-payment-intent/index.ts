import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
    if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
    const auth = req.headers.get("Authorization") || "";
    const jwt = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : undefined;
    if (!jwt) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    const { item_id, renter_id, start_date, nights, price_per_day, cleaning_price = 0 } = body || {};
    if (!item_id || !renter_id || !start_date || !nights || !price_per_day) throw new Error("Missing fields");

    // Look up item to get owner and stripe account
    const { data: item, error: itemErr } = await supabaseAdmin
      .from('items')
      .select('id, owner_id, price_per_day')
      .eq('id', item_id)
      .maybeSingle();
    if (itemErr || !item) throw new Error(itemErr?.message || 'Item not found');
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('stripe_account_id')
      .eq('id', item.owner_id)
      .maybeSingle();
    const destination = profile?.stripe_account_id;
    if (!destination) throw new Error('Owner not connected to Stripe');

    const total = Math.round((Number(price_per_day) * Number(nights) + Number(cleaning_price || 0)) * 100);
    const appFee = Math.round(total * 0.15);

    const pi = await stripeFormRequest('payment_intents', {
      amount: String(total),
      currency: 'gbp',
      automatic_payment_methods: 'enabled',
      'application_fee_amount': String(appFee),
      'transfer_data[destination]': destination,
    });

    // Optionally create a pending booking here and update on webhook
    await supabaseAdmin.from('bookings').insert([{
      renter_id,
      owner_id: item.owner_id,
      item_id,
      start_date,
      nights,
      price_per_day,
      cleaning_price,
      total_amount: total,
      currency: 'gbp',
      status: 'requires_payment',
      stripe_payment_intent_id: pi.id,
    }]);

    return new Response(JSON.stringify({ client_secret: pi.client_secret, payment_intent_id: pi.id }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});


