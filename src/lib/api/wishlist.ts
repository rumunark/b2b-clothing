/**
 * Wishlist API Functions
 * 
 * Provides functions to manage user wishlists for clothing items.
 * Users can save items they're interested in for later viewing.
 */

import { supabase } from "../supabaseClient";

/**
 * Adds a clothing item to the user's wishlist
 * 
 * Creates a new wishlist entry linking a user to a specific clothing listing.
 * Prevents duplicate entries by using database constraints.
 * 
 * @param userId - The ID of the user adding the item
 * @param listingId - The ID of the clothing listing to add
 * @returns The created wishlist entry
 * @throws Error if the database operation fails
 */
export async function addToWishlist(userId: string, listingId: string) {
  const { data, error } = await supabase
    .from("wishlist")
    .insert([{ user_id: userId, listing_id: listingId }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Retrieves all items in a user's wishlist
 * 
 * Fetches the user's saved clothing items with full listing details
 * including images, prices, and descriptions.
 * 
 * @param userId - The ID of the user whose wishlist to retrieve
 * @returns Array of wishlist entries with full listing details
 * @throws Error if the database operation fails
 */
export async function getWishlist(userId: string) {
  const { data, error } = await supabase
    .from("wishlists")
    .select("id, listing_id, listings(*)")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}

