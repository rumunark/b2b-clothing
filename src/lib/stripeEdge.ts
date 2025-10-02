/**
 * Stripe Integration Functions
 * 
 * Provides client-side functions to interact with Stripe services through
 * Supabase Edge Functions. Handles authentication and error management
 * for Stripe Connect accounts and payment processing.
 */

import { supabase } from './supabaseClient';

/**
 * Gets the current user's JWT token for authenticated requests
 * @returns The access token or undefined if not authenticated
 */
async function getJwt() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

/**
 * Creates a Stripe Connect account for the current user
 * 
 * This allows users to receive payments for their clothing rentals.
 * The account is created through a Supabase Edge Function that handles
 * the Stripe API integration securely.
 * 
 * @returns Promise containing the Stripe account ID
 * @throws Error if user is not authenticated or account creation fails
 */
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

/**
 * Creates a Stripe onboarding link for Connect account setup
 * 
 * Generates a secure link that allows users to complete their Stripe Connect
 * account setup, including providing business information and bank details
 * for receiving payments.
 * 
 * @returns Promise containing the onboarding URL
 * @throws Error if user is not authenticated or link creation fails
 */
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

/**
 * Creates a Stripe Payment Intent for clothing rental transactions
 * 
 * Initiates a payment process for renting clothing items. Calculates the total
 * cost based on rental duration, daily price, and optional cleaning fees.
 * The payment is processed through Stripe Connect to pay the item owner.
 * 
 * @param payload - Payment details including item, renter, dates, and pricing
 * @returns Promise containing client secret and payment intent ID for frontend processing
 * @throws Error if user is not authenticated or payment intent creation fails
 */
export async function createPaymentIntent(payload: {
  item_id: string,        // ID of the clothing item being rented
  renter_id: string,      // ID of the user renting the item
  start_date: string,     // Rental start date (ISO string)
  nights: number,         // Number of nights for the rental
  price_per_day: number,  // Daily rental price
  cleaning_price?: number, // Optional cleaning fee
})
{
  const jwt = await getJwt();
  if (!jwt) throw new Error('Not authenticated');
  
  const res = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-payment-intent`, {
    method: 'POST',
    headers: { 
      Authorization: `Bearer ${jwt}`, 
      'Content-Type': 'application/json' 
    },
    body: JSON.stringify(payload),
  });
  
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error || 'Failed to create payment intent');
  return json as { client_secret: string, payment_intent_id: string };
}


