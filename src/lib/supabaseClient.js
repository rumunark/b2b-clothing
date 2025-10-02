/**
 * Supabase Client Configuration
 * 
 * Sets up the Supabase client for the B2B Clothing app with secure storage
 * for authentication tokens. Uses Expo SecureStore to safely persist
 * user sessions across app restarts.
 */

import 'react-native-url-polyfill/auto'; // Polyfill for URL support in React Native
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Configured Supabase client instance
 * 
 * Features:
 * - Secure token storage using Expo SecureStore
 * - Automatic token refresh
 * - Persistent sessions across app restarts
 * - Optimized for mobile usage (no URL session detection)
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: {
      // Use Expo SecureStore for secure token persistence
      getItem: (key) => SecureStore.getItemAsync(key),
      setItem: (key, value) => SecureStore.setItemAsync(key, value),
      removeItem: (key) => SecureStore.deleteItemAsync(key),
    },
    autoRefreshToken: true, // Automatically refresh expired tokens
    persistSession: true, // Keep user logged in across app restarts
    detectSessionInUrl: false, // Disable URL-based session detection (not needed in mobile)
  },
});


