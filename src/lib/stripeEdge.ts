import { supabase } from './supabaseClient';

async function getJwt() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export async function createConnectAccount(): Promise<{ stripe_account_id: string }>
{
  const jwt = await getJwt();
  if (!jwt) throw new Error('Not authenticated');
  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-connect-account`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to create connect account');
  return json;
}

export async function createOnboardingLink(): Promise<{ url: string }>
{
  const jwt = await getJwt();
  if (!jwt) throw new Error('Not authenticated');
  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-onboarding-link`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}` },
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to create onboarding link');
  return json;
}

export async function createPaymentIntent(payload: {
  item_id: string,
  renter_id: string,
  start_date: string,
  nights: number,
  price_per_day: number,
  cleaning_price?: number,
})
{
  const jwt = await getJwt();
  if (!jwt) throw new Error('Not authenticated');
  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to create payment intent');
  return json as { client_secret: string, payment_intent_id: string };
}


