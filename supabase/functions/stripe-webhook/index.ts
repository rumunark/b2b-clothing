import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET");

const supabaseAdmin = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

serve(async (req) => {
  try {
    // In Deno Edge, raw body available via req.text()
    const sig = req.headers.get('stripe-signature');
    const body = await req.text();

    // Minimal parse without stripe sdk: read type and data.object.id
    const evt = JSON.parse(body || '{}');
    const type = evt?.type;
    const pi = evt?.data?.object;

    if (type === 'payment_intent.succeeded') {
      const paymentIntentId = pi?.id;
      const amount = pi?.amount_received ?? pi?.amount;
      const currency = pi?.currency || 'gbp';
      if (paymentIntentId) {
        await supabaseAdmin
          .from('bookings')
          .update({ status: 'paid' })
          .eq('stripe_payment_intent_id', paymentIntentId);
        await supabaseAdmin
          .from('payments')
          .insert([{ stripe_payment_intent_id: paymentIntentId, amount: amount || 0, currency }]);
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }
});


