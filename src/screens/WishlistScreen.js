import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Image, FlatList, StyleSheet } from 'react-native';
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
    // Read snapshot fields directly from wishlist (with compatibility aliases)
    const { data: wl } = await supabase.from('wishlist')
      .select('item_id, title, image_url, price_per_day, item_name, item_image, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    const rows = (wl || []).map(w => ({
      id: w.item_id,
      title: w.title || w.item_name || 'Untitled',
      image_url: w.image_url || w.item_image || null,
      price_per_day: w.price_per_day ?? null,
    }));
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
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { color: colors.white, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12, alignItems: 'center' },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  itemTitle: { color: colors.white, fontWeight: '700' },
  price: { color: colors.white },
  empty: { color: colors.white, textAlign: 'center', marginTop: 40 },
});


