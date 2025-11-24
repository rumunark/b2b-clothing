import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { View, Text, FlatList, Image, TouchableOpacity, RefreshControl, TextInput, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import { Card, Label, Button } from '../ui'
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';
import Fuse from 'fuse.js';

export default function RentListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const inputRef = useRef(null);
  
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [carouselIndexMap, setCarouselIndexMap] = useState(new Map());
  const [imageWidthMap, setImageWidthMap] = useState(new Map());
  const [showFilters, setShowFilters] = useState(false);
  
  // Filters
  const [filterCategory, setFilterCategory] = useState('');
  const [filterSize, setFilterSize] = useState('');
  const [filterPriceMin, setFilterPriceMin] = useState('');
  const [filterPriceMax, setFilterPriceMax] = useState('');
  const [wishlistItems, setWishlistItems] = useState(new Set());

  const fetchItems = useCallback(async () => {
    setLoading(true);
    let list = [];
    let { data, error } = await supabase
      .from('items')
      .select('id, title, description, image_url, images, price_per_day, tags, category, size')
      .order('created_at', { ascending: false })
      .range(0, 49);
    list = data ?? [];
    
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: wishlistData, error: wishlistError } = await supabase
        .from('wishlist')
        .select('listing_id')
        .eq('user_id', user.id);

      if (wishlistError) {
        console.error('Error fetching wishlist:', wishlistError);
      } else if (wishlistData) {
        setWishlistItems(new Set(wishlistData.map(item => item.listing_id)));
      }
    }

    setAllItems(list);
    setItems(list);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchItems();
    }, [fetchItems])
  );

  // useMemo so we don't rebuild the search index on every render, only when items change.
  const fuse = useMemo(() => {
    return new Fuse(allItems, {
      keys: [
        { name: 'title', weight: 2 },
        { name: 'tags', weight: 1.5 },
        'category',
        'description'
      ],
      threshold: 0.4,
      ignoreLocation: true,
      minMatchCharLength: 2,
    });
  }, [allItems]);

  useEffect(() => {
    let resultList = allItems;
    const q = (query || '').trim();
    if (q) {
      resultList = fuse.search(q).map(result => result.item);
    }

    // Apply strict filters (Category, Size, Price) on the result of A
    const filtered = resultList.filter((item) => {
      // category filter
      if (filterCategory) {
        if ((item.category || '') !== filterCategory) return false;
      }
      // size filter (substring case-insensitive)
      if (filterSize) {
        const sz = (item.size || '').toString().toLowerCase();
        if (!sz.includes(filterSize.trim().toLowerCase())) return false;
      }
      // price filter
      const price = Number(item.price_per_day ?? 0);
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
  }, [query, allItems, fuse, filterCategory, filterSize, filterPriceMin, filterPriceMax]);

  const toggleWishlist = useCallback(async (item) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert('Sign in required', 'Please log in first.'); return; }

    const isWishlisted = wishlistItems.has(item.id);
    if (isWishlisted) {
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('listing_id', item.id);

      if (error) {
        Alert.alert('Wishlist error', error.message);
      } else {
        setWishlistItems(prev => { const next = new Set(prev); next.delete(item.id); return next; });
        Alert.alert('Removed from wishlist', 'The item has been removed from your wishlist.');
      }
    } else {
      const { error } = await supabase.from('wishlist').upsert({
        user_id: user.id, listing_id: item.id,
      }, { onConflict: 'user_id,listing_id' });

      if (error) {
        Alert.alert('Wishlist error', error.message);
      } else {
        setWishlistItems(prev => { const next = new Set(prev); next.add(item.id); return next; });
        Alert.alert('Added to wishlist', 'You can view item in Wishlist.');
      }
    }
  }, [wishlistItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchItems();
    setRefreshing(false);
  };

  const renderItem = ({ item }) => {
    const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : (item.image_url ? [item.image_url] : []);
    const measuredWidth = imageWidthMap.get(item.id) || 0;
    const isWishlisted = wishlistItems.has(item.id);

    return (
      <Card style={styles.cardContainer}>
        <View style={styles.cardImageContainer}>
          <View
            style={{ flex: 1 }}
            onLayout={({ nativeEvent: { layout: { width } } }) => {
              if (!width) return;
              setImageWidthMap((prev) => new Map(prev).set(item.id, width));
            }}
          >
            {images.length > 0 && (
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={(e) => {
                  const idx = Math.round(e.nativeEvent.contentOffset.x / measuredWidth);
                  setCarouselIndexMap((prev) => new Map(prev).set(item.id, idx));
                }}
              >
                {images.map((uri, idx) => (
                  <Image key={`${item.id}-${idx}`} source={{ uri }} style={{ width: measuredWidth, height: '100%' }} />
                ))}
              </ScrollView>
            )}
          </View>

          {images.length > 1 && (
            <View style={styles.dotsRow}>
              {images.map((_, i) => (
                <View key={i} style={[styles.dot, (carouselIndexMap.get(item.id) || 0) === i && styles.dotActive]} />
              ))}
            </View>
          )}

          <View style={styles.cardActionsOverlay}>
            <TouchableOpacity style={[styles.iconButtonSolid]} onPress={() => navigation.navigate('RentSelect', { id: item.id })}>
              <Ionicons name="cart-outline" size={20} color={colors.navy} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconButtonSolid]} onPress={() => toggleWishlist(item)}>
              <Ionicons name={isWishlisted ? "heart" : "heart-outline"} size={20} color={isWishlisted ? colors.pink : colors.navy} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('ItemDetail', { id: item.id })}>
          <View style={styles.cardContent}>
            <Text numberOfLines={1} style={styles.cardTitle}>{item.title}</Text>
            {item.description && <Text numberOfLines={1} style={styles.cardDescription}>{item.description}</Text>}
            {item.price_per_day != null && <Text style={styles.cardPrice}>Rent from £{Number(item.price_per_day).toFixed(2)}</Text>}
          </View>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <Background>
      <View style={styles.headerPanel}>
        <View style={styles.row}>
          <TouchableOpacity activeOpacity={0.9} style={styles.searchBar} onPress={() => inputRef.current?.focus?.()}>
            <Ionicons name="search" size={18} color={colors.white} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search items..."
              placeholderTextColor={colors.gray100}
              style={styles.searchInput}
              returnKeyType="search"
            />
          </TouchableOpacity>

          <Button onPress={() => setShowFilters((v) => !v)} size="sm" icon="options-outline" iconColor={colors.white}>
            Filters
          </Button>
        </View>

        {showFilters && (
          <View style={styles.filterPanel}>
            <Label>Category</Label>
            <View style={styles.row}>
              {['', 'Fancy Dress', 'Formalwear', 'Fits'].map((c) => (
                <TouchableOpacity key={c || 'all'} onPress={() => setFilterCategory(c)} style={[styles.chip, filterCategory === c && styles.chipActive]}>
                  <Text style={[styles.chipText, filterCategory === c && styles.chipTextActive]}>{c || 'All'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Label>Size</Label>
            <TextInput value={filterSize} onChangeText={setFilterSize} placeholder="e.g. M, 12" style={styles.input} />
            
            <Label>Price</Label>
            <View style={styles.row}>
              <TextInput value={filterPriceMin} onChangeText={setFilterPriceMin} keyboardType="numeric" placeholder="Min" style={[styles.input, { flex: 1 }]} />
              <TextInput value={filterPriceMax} onChangeText={setFilterPriceMax} keyboardType="numeric" placeholder="Max" style={[styles.input, { flex: 1 }]} />
            </View>

            <TouchableOpacity onPress={() => { setFilterCategory(''); setFilterSize(''); setFilterPriceMin(''); setFilterPriceMax(''); }}>
              <Label>Clear all filters</Label>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={<Text style={[styles.body]}>{loading ? 'Loading...' : 'No items found.'}</Text>}
      />
    </Background>
  );
}