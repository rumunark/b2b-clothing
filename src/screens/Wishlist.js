import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, Image, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Background from '../components/Background';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabaseClient';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';

export default function WishlistScreen() {
  const [items, setItems] = useState([]);
  const userIdRef = useRef(null);
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

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
      <View style={styles.container}>
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={{ paddingTop: 12 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => navigation.navigate('ItemDetail', { id: item.id })}
              style={styles.listItemContainer}
            >
              {item.image_url ? (
                <Image source={{ uri: item.image_url }} style={styles.listItemImage} />
              ) : (
                <View style={styles.listItemImage} /> // Placeholder
              )}
              <View style={styles.listItemContent}>
                <Text style={styles.listItemTitle}>{item.title}</Text>
                {item.price_per_day != null && (
                  <Text style={styles.body}>
                    £{Number(item.price_per_day).toFixed(2)} / day
                  </Text>
                )}
              </View>
              <View style={styles.listItemActions}>
                {/* TODO: Create an app provider as a wrapper to allow a wishlist context which manages global add/delete to wishlist */}
                <TouchableOpacity onPress={() => toggleWishlist(item.id)} style={styles.iconButtonTransparent}>
                  <Ionicons name="trash" size={18} color={colors.white} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.body}>No items yet.</Text>}
        />
      </View>
    </Background>
  );
}