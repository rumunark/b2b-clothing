import { supabase } from "../supabaseClient";

export async function addToWishlist(userId: string, listingId: string) {
  const { data, error } = await supabase
    .from("wishlist")
    .insert([{ user_id: userId, listing_id: listingId }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getWishlist(userId: string) {
  const { data, error } = await supabase
    .from("wishlists")
    .select("id, listing_id, listings(*)")
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}

