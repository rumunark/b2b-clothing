import { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';

type WLRow = {
  id: number;
  item_id: string;
  title: string | null;
  image_url: string | null;
  price_per_day: number | null;
};

export default function Wishlist() {
  const [rows, setRows] = useState<WLRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setRows([]); setLoading(false); return; }
    const { data, error } = await supabase
      .from('wishlist')
      .select('id, item_id, title, image_url, price_per_day')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setRows(data as any);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const remove = async (id: number) => {
    const { error } = await supabase.from('wishlist').delete().eq('id', id);
    if (!error) setRows((prev) => prev.filter((r) => r.id !== id));
  };

  if (loading) return <Text style={styles.loading}>Loading wishlist...</Text>;
  if (rows.length === 0) return <Text style={styles.empty}>No items in wishlist yet 👀</Text>;

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => String(r.id)}
      contentContainerStyle={{ padding: 16, gap: 12 }}
      renderItem={({ item }) => (
        <View style={styles.card}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, { backgroundColor: 'rgba(0,0,0,0.2)' }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title ?? 'Untitled'}</Text>
            {item.price_per_day != null ? (
              <Text style={styles.price}>£{Number(item.price_per_day).toFixed(2)} / day</Text>
            ) : null}
          </View>
          <TouchableOpacity onPress={() => remove(item.id)} style={styles.removeBtn}>
            <Text style={styles.removeText}>Remove</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  loading: { color: colors.white, textAlign: 'center', marginTop: 24 },
  empty: { color: colors.white, textAlign: 'center', marginTop: 24 },
  card: { flexDirection: 'row', gap: 12, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', padding: 12, borderRadius: 12 },
  thumb: { width: 72, height: 72, borderRadius: 8 },
  title: { color: colors.navy, fontWeight: '800' },
  price: { color: colors.navy },
  removeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 2, borderColor: colors.navy, borderRadius: 10 },
  removeText: { color: colors.navy, fontWeight: '700' },
});


