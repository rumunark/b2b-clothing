import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Image, FlatList, StyleSheet, SafeAreaView } from 'react-native';
import Background from '../components/Background';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';

export default function WishlistScreen() {
  const [items, setItems] = useState([]);
  const userIdRef = useRef(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setItems([]); return; }
    userIdRef.current = user.id;

    const { data, error } = await supabase
  .from("wishlist")
  .select(`
    listing_id,
    created_at,
    items (
      id,
      title,
      image_url,
      price_per_day
    )
  `)
  .eq("user_id", user.id)
  .order("created_at", { ascending: false });

  if (error) {
    console.error("Wishlist fetch error:", error);
    setItems([]);
    return;
  }
    // Try mapping via relation first
    let rows = (data || [])
      .map(w => {
        const it = w.items;
        if (!it) return null;
        return {
          id: it.id,
          title: it.title || 'Untitled',
          image_url: it.image_url || null,
          price_per_day: it.price_per_day ?? null,
        };
      })
      .filter(Boolean);

    // If relation not configured (items is null), fallback to fetching by listing_id
    if ((!rows.length) && (data && data.length)) {
      const ids = data.map(w => w.listing_id).filter(Boolean);
      if (ids.length) {
        const { data: itemsData, error: itemsErr } = await supabase
          .from('items')
          .select('id, title, image_url, price_per_day')
          .in('id', ids);
        if (itemsErr) {
          console.error('Items fallback fetch error:', itemsErr);
          setItems([]);
          return;
        }
        const byId = new Map((itemsData || []).map(it => [it.id, it]));
        rows = ids
          .map(id => byId.get(id))
          .filter(Boolean)
          .map(it => ({
            id: it.id,
            title: it.title || 'Untitled',
            image_url: it.image_url || null,
            price_per_day: it.price_per_day ?? null,
          }));
      }
    }
    setItems(rows);
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    let channel;
    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      channel = supabase.channel('wishlist_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'wishlist', filter: `user_id=eq.${user.id}` }, () => {
          load();
        })
        .subscribe();
    };
    setup();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [load]);

  return (
    <Background>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
        <Text style={styles.title}>Wishlist</Text>
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          renderItem={({ item }) => (
            <View style={styles.row}>
              {item.image_url ? <Image source={{ uri: item.image_url }} style={styles.thumb} /> : null}
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>{item.title}</Text>
                {item.price_per_day != null ? <Text style={styles.price}>£{Number(item.price_per_day).toFixed(2)} / day</Text> : null}
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.empty}>No items yet.</Text>}
        />
        </View>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, padding: 16, paddingTop: 24 },
  title: { color: colors.white, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'center' },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  itemTitle: { color: colors.white, fontWeight: '700' },
  price: { color: colors.white },
  empty: { color: colors.white, textAlign: 'center', marginTop: 40 },
});


