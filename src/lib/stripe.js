import { supabase } from './supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';

export async function createOrGetStripeAccount() {
  const { data, error } = await supabase.functions.invoke('stripe-create-account', {
    method: 'POST',
  });
  
  if (error) {
    if (error instanceof FunctionsHttpError) {
      // Extract the { error: err.message } payload returned by your Edge Function
      const errorResponse = await error.context.json();
      console.error('stripe-create-account failed with details:', errorResponse);
      throw new Error(errorResponse.error || error.message);
    }
    throw error;
  }
  return data; // { accountId }
}

export async function createAccountOnboardingLink() {
  const { data, error } = await supabase.functions.invoke('stripe-account-link', {
    method: 'POST',
  });
  if (error) throw error;
  return data.url;
}

export async function getStripeAccountStatus() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { connected: false, onboarding_complete: false };
  
  const { data, error } = await supabase.functions.invoke('stripe-account-status', {
    method: 'POST',
  });
  
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const errorResponse = await error.context.json();
      console.warn('stripe-account-status error details:', errorResponse);
    } else {
      console.warn('stripe-account-status error:', error.message);
    }
    return { connected: false, onboarding_complete: false };
  }
  return data;
}