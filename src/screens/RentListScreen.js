import { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import Card from '../ui/Card';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';

export default function RentListScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState([]);
  const [hidden, setHidden] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('items')
      .select('id, title, description, image_url, price_per_day')
      .order('created_at', { ascending: false })
      .limit(20);
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => (
    hidden.has(item.id) ? null : (
    <TouchableOpacity onPress={() => navigation.navigate('ItemDetail', { id: item.id })}>
      <Card>
        <View style={styles.imageWrap}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.image} />
          ) : null}
           <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnOutline]}
              onPress={() => setHidden(new Set(hidden).add(item.id))}
            >
              <Ionicons name="thumbs-down" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSolid]}
              onPress={async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                await supabase.from('wishlist').upsert({
                  user_id: user.id, item_id: item.id,
                  title: item.title, image_url: item.image_url, price_per_day: item.price_per_day
                }, { onConflict: 'user_id,item_id' }).catch(()=>{});
              }}
            >
              <Ionicons name="heart" size={20} color="#0B1F3A" />
            </TouchableOpacity>
          </View>
         </View>
         <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
         {item.description ? (
           <Text numberOfLines={1} style={styles.desc}>{item.description}</Text>
         ) : null}
         {item.price_per_day != null ? (
           <Text style={styles.price}>rent from £{Number(item.price_per_day).toFixed(2)}</Text>
         ) : null}
       </Card>
     </TouchableOpacity>
    )
   );
       

  return (
    <Background>
      <View style={styles.container}>
        {items.length === 0 && !loading ? (
          <Text style={styles.empty}>No items yet. Pull to refresh.</Text>
        ) : null}
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          numColumns={2}
          columnWrapperStyle={{ gap: 12 }}
          contentContainerStyle={{ padding: 12, gap: 12 }}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.navy },
  empty: { textAlign: 'center', marginTop: 24, color: colors.white },
  card: { },
  imageWrap: { aspectRatio: 1, width: '100%', borderRadius: 6, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  image: { width: '100%', height: '100%' },
  actionsRow: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    actionBtnOutline: { borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.35)' },
 actionBtnSolid: { backgroundColor: '#fff' },
  title: { marginTop: 8, fontWeight: '700', color: colors.navy },
  desc: { color: colors.gray500, fontSize: 12 },
  price: { marginTop: 4, fontSize: 12, color: colors.navy },
});


