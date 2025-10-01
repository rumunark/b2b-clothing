import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, StyleSheet, RefreshControl, TextInput, SafeAreaView, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import Card from '../ui/Card';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';


export default function RentListScreen() {
  const navigation = useNavigation();
  const inputRef = useRef(null);
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [query, setQuery] = useState('');
  const [hidden, setHidden] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [carouselIndexMap, setCarouselIndexMap] = useState(new Map());
  const [imageWidthMap, setImageWidthMap] = useState(new Map());
  const [showFilters, setShowFilters] = useState(false);
  const [filterCategory, setFilterCategory] = useState(''); // '', 'Fancy Dress', 'Formalwear', 'Fits'
  const [filterSize, setFilterSize] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');

  const fetchItems = useCallback(async () => {
    setLoading(true);
    // Try to include tag fields; if the schema doesn't have them yet, fall back
    let list = [];
    let { data, error } = await supabase
      .from('items')
      .select('id, title, description, image_url, images, price_per_day, tags, tags_text, category, size')
      .order('created_at', { ascending: false })
      .range(0, 49);
    if (error) {
      const fb = await supabase
        .from('items')
        .select('id, title, description, image_url, images, price_per_day, category, size')
        .order('created_at', { ascending: false })
        .range(0, 49);
      list = fb.data ?? [];
    } else {
      list = data ?? [];
    }
    setAllItems(list);
    setItems(list); // show all items by default
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  // Filter by query (tags-first) + filters (category/size/price)
  useEffect(() => {
    const q = (query || '').trim().toLowerCase();
    const filtered = (allItems || []).filter((it) => {
      // query matching
      if (q) {
        const hasTags = (Array.isArray(it.tags) && it.tags.length > 0) || (it.tags_text && it.tags_text.length > 0);
        const tagsJoined = Array.isArray(it.tags) ? it.tags.join(' ') : '';
        const tagsText = it.tags_text || '';
        const tagHay = `${tagsJoined} ${tagsText}`.toLowerCase();
        const title = (it.title || '').toLowerCase();
        const desc = (it.description || '').toLowerCase();
        const match = hasTags ? tagHay.includes(q) : `${title} ${desc}`.includes(q);
        if (!match) return false;
      }

      // category filter
      if (filterCategory) {
        if ((it.category || '') !== filterCategory) return false;
      }
      // size filter (substring case-insensitive)
      if (filterSize) {
        const sz = (it.size || '').toString().toLowerCase();
        if (!sz.includes(filterSize.trim().toLowerCase())) return false;
      }
      // price filter
      const price = Number(it.price_per_day ?? 0);
      if (filterPriceMin) {
        const mn = Number(filterPriceMin);
        if (!Number.isNaN(mn) && price < mn) return false;
      }
      if (filterPriceMax) {
        const mx = Number(filterPriceMax);
        if (!Number.isNaN(mx) && price > mx) return false;
      }

      return true;
    });
    setItems(filtered);
  }, [query, allItems, filterCategory, filterSize, filterPriceMin, filterPriceMax]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => (
    hidden.has(item.id) ? null : (
      <Card>
        <View style={styles.imageWrap}>
          <View
            style={{ flex: 1 }}
            onLayout={({ nativeEvent: { layout: { width } } }) => {
              if (!width) return;
              setImageWidthMap((prev) => { const next = new Map(prev); next.set(item.id, width); return next; });
            }}
          >
            {(() => {
              const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : (item.image_url ? [item.image_url] : []);
              const measuredWidth = imageWidthMap.get(item.id) || 0;
              if (!images.length) return null;
              return (
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={(e) => {
                    const w = imageWidthMap.get(item.id) || 1;
                    const idx = Math.round(e.nativeEvent.contentOffset.x / w);
                    setCarouselIndexMap((prev) => { const next = new Map(prev); next.set(item.id, idx); return next; });
                  }}
                >
                  {images.map((uri, idx) => (
                    <Image key={`${item.id}-${idx}`} source={{ uri }} style={{ width: measuredWidth || 300, height: '100%' }} />
                  ))}
                </ScrollView>
              );
            })()}
          </View>
          {Array.isArray(item.images) && item.images.length > 1 ? (
            <View style={styles.dots}>
              {item.images.map((_, i) => (
                <View key={i} style={[styles.dot, (carouselIndexMap.get(item.id) || 0) === i && styles.dotActive]} />
              ))}
            </View>
          ) : null}
           <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnSolid]}
              onPress={() => navigation.navigate('RentSelect', { id: item.id })}
            >
              <Ionicons name="cart-outline" size={20} color="#0B1F3A" />
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
          <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('ItemDetail', { id: item.id })}>
            <Text numberOfLines={1} style={styles.title}>{item.title}</Text>
            {item.description ? (
              <Text numberOfLines={1} style={styles.desc}>{item.description}</Text>
            ) : null}
            {item.price_per_day != null ? (
              <Text style={styles.price}>Rent from £{Number(item.price_per_day).toFixed(2)}</Text>
            ) : null}
          </TouchableOpacity>
        </Card>
    )
   );
       

  return (
    <Background>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>
        <View style={styles.headerRow}>
          <View style={{ width: 1 }} />
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <TouchableOpacity onPress={() => navigation.navigate('Basket')}>
              <Ionicons name="cart" size={22} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Ionicons name="settings-outline" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.searchRow}
          onPress={() => inputRef.current?.focus?.()}
        >
          <Ionicons name="search" size={18} color={colors.white} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder="Search by tags…"
            placeholderTextColor={colors.gray100}
            style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            returnKeyType="search"
          />
        </TouchableOpacity>
        <View style={styles.filtersWrap}>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters((v) => !v)}>
            <Ionicons name={showFilters ? 'options' : 'options-outline'} size={16} color={colors.white} />
            <Text style={styles.filterBtnText}>{showFilters ? 'Hide filters' : 'Filters'}</Text>
          </TouchableOpacity>
          {showFilters ? (
            <View style={styles.filtersPanel}>
              <Text style={styles.filterLabel}>Category</Text>
              <View style={styles.filterRow}>
                {['', 'Fancy Dress', 'Formalwear', 'Fits'].map((c) => (
                  <TouchableOpacity key={c || 'all'} onPress={() => setFilterCategory(c)}
                    style={[styles.chip, filterCategory === c && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, filterCategory === c && styles.chipTextActive]}>{c || 'All'}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ height: 8 }} />
              <Text style={styles.filterLabel}>Size</Text>
              <TextInput
                value={filterSize}
                onChangeText={setFilterSize}
                placeholder="e.g. M, 12"
                placeholderTextColor={colors.gray100}
                style={styles.filterInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={{ height: 8 }} />
              <Text style={styles.filterLabel}>Price (£)</Text>
              <View style={styles.filterRow}>
                <TextInput
                  value={filterPriceMin}
                  onChangeText={setFilterPriceMin}
                  keyboardType="numeric"
                  placeholder="Min"
                  placeholderTextColor={colors.gray100}
                  style={[styles.filterInput, { flex: 1 }]}
                />
                <TextInput
                  value={filterPriceMax}
                  onChangeText={setFilterPriceMax}
                  keyboardType="numeric"
                  placeholder="Max"
                  placeholderTextColor={colors.gray100}
                  style={[styles.filterInput, { flex: 1 }]}
                />
              </View>

              <View style={{ height: 8 }} />
              <TouchableOpacity
                onPress={() => { setFilterCategory(''); setFilterSize(''); setFilterPriceMin(''); setFilterPriceMax(''); }}
                style={styles.clearBtn}
              >
                <Text style={styles.clearBtnText}>Clear filters</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {items.length === 0 && !loading ? (
          <Text style={styles.empty}>No items yet. Pull to refresh.</Text>
        ) : null}
        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          numColumns={1}
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
        </View>
      </SafeAreaView>
    </Background>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.navy, paddingTop: 8 },
  empty: { textAlign: 'center', marginTop: 24, color: colors.white },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, margin: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334' },
  headerRow: { paddingHorizontal: 12, paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  searchInput: { flex: 1, color: colors.white },
  filtersWrap: { marginHorizontal: 12, marginBottom: 4 },
  filterBtn: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: '#334' },
  filterBtnText: { color: colors.white, fontWeight: '700' },
  filtersPanel: { marginTop: 8, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#334', gap: 6 },
  filterLabel: { color: colors.white, fontWeight: '700' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterInput: { color: colors.white, borderWidth: 1, borderColor: '#334', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, minWidth: 80 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#0a2a66' },
  chipActive: { backgroundColor: '#0a2a66' },
  chipText: { color: '#0a2a66' },
  chipTextActive: { color: '#fff' },
  card: { },
  imageWrap: { aspectRatio: 1, width: '100%', borderRadius: 6, overflow: 'hidden', backgroundColor: '#f0f0f0' },
  image: { width: '100%', height: '100%' },
  dots: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff' },
  actionsRow: { position: 'absolute', bottom: 8, right: 8, flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    actionBtnOutline: { borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.35)' },
 actionBtnSolid: { backgroundColor: '#fff' },
  title: { marginTop: 8, fontWeight: '700', color: colors.navy },
  desc: { color: colors.gray500, fontSize: 12 },
  price: { marginTop: 4, fontSize: 12, color: colors.navy },
});


