import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated, PanResponder, TouchableOpacity, TextInput } from 'react-native';
import Background from '../components/Background';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.25 * width;

export default function SwipeRentScreen() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mode, setMode] = useState('swipe'); // 'all' | 'swipe'
  const [size, setSize] = useState('');
  const [category, setCategory] = useState('');
  const [gender, setGender] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [idx, setIdx] = useState(0);
  const [termMenuOpen, setTermMenuOpen] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;

  const fetchItems = useCallback(async () => {
    let query = supabase
      .from('items')
      .select('id, title, description, image_url, price_per_day, size, category, gender')
      .order('created_at', { ascending: false })
      .limit(50);
    if (q && q.trim().length > 0) query = query.ilike('title', `%${q.trim()}%`);
    if (size) query = query.eq('size', size);
    if (category) query = query.eq('category', category);
    if (gender) query = query.eq('gender', gender);
    if (maxPrice) query = query.lte('price_per_day', Number(maxPrice));
    const { data } = await query;
    let rows = data ?? [];
    if (mode === 'swipe') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: wl } = await supabase.from('wishlist').select('item_id').eq('user_id', user.id);
        const excluded = new Set((wl || []).map(w => w.item_id));
        rows = rows.filter(r => !excluded.has(r.id));
      }
    }
    setItems(rows);
    setIdx(0);
  }, [q, size, category, gender, maxPrice, mode]);

  useEffect(() => { fetchItems(); }, [fetchItems]);
  useFocusEffect(useCallback(() => { fetchItems(); }, [fetchItems]));

  const forceSwipe = (direction) => {
    Animated.timing(position, {
      toValue: { x: direction === 'right' ? width : -width, y: 0 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = async (direction) => {
    const item = items[idx];
    position.setValue({ x: 0, y: 0 });
    setIdx((v) => v + 1);
    if (direction === 'right' && item) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Snapshot essential fields into wishlist
          const payload: any = { user_id: user.id, item_id: item.id, title: item.title, image_url: item.image_url, price_per_day: item.price_per_day };
          const { error } = await supabase
            .from('wishlist')
            .upsert(payload, { onConflict: 'user_id,item_id' });
          if (error) {
            console.log('Wishlist insert error:', error.message);
          }
        }
      } catch (e) {
        console.log('Wishlist insert exception:', e?.message || String(e));
      }
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) forceSwipe('right');
        else if (gesture.dx < -SWIPE_THRESHOLD) forceSwipe('left');
        else Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const rotate = position.x.interpolate({ inputRange: [-width * 1.5, 0, width * 1.5], outputRange: ['-15deg', '0deg', '15deg'] });
  const cardStyle = { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] };

  const current = items[idx];
  const next = items[idx + 1];

  const onRequestRent = () => setTermMenuOpen((v) => !v);
  const chooseTerm = async (label) => {
    setTermMenuOpen(false);
    // Hook up to checkout flow; placeholder no-op
  };

  return (
    <Background>
      <View style={styles.container}>
        <View style={styles.searchRow} pointerEvents="auto">
          <TextInput placeholder="Search" value={q} onChangeText={setQ} style={styles.search} placeholderTextColor="#ddd" />
          <TouchableOpacity onPress={fetchItems} style={styles.searchBtn}><Text style={styles.filterText}>Search</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setFiltersOpen((v) => !v)} style={styles.filterBtn}><Text style={styles.filterText}>Filters ▾</Text></TouchableOpacity>
        </View>
        <View style={styles.modeRow} pointerEvents="auto">
          <TouchableOpacity onPress={() => setMode('all')} style={[styles.modeBtn, mode === 'all' && styles.modeBtnActive]}>
            <Text style={[styles.modeText, mode === 'all' && styles.modeTextActive]}>All items</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('swipe')} style={[styles.modeBtn, mode === 'swipe' && styles.modeBtnActive]}>
            <Text style={[styles.modeText, mode === 'swipe' && styles.modeTextActive]}>Swipe mode</Text>
          </TouchableOpacity>
        </View>
        {filtersOpen ? (
          <View style={styles.filters} pointerEvents="auto">
            <TextInput placeholder="Size" value={size} onChangeText={setSize} style={styles.filterInput} placeholderTextColor="#ddd" />
            <TextInput placeholder="Category" value={category} onChangeText={setCategory} style={styles.filterInput} placeholderTextColor="#ddd" />
            <TextInput placeholder="Gender" value={gender} onChangeText={setGender} style={styles.filterInput} placeholderTextColor="#ddd" />
            <TextInput placeholder="Max price" value={maxPrice} onChangeText={setMaxPrice} keyboardType="numeric" style={styles.filterInput} placeholderTextColor="#ddd" />
          </View>
        ) : null}
        {!current ? (
          <Text style={styles.empty}>No more items</Text>
        ) : (
          <View style={styles.deck}>
            {next && next.image_url ? (
              <Animated.View style={[styles.card, { top: 8, width: '100%' }]}> 
                <Image source={{ uri: next.image_url }} style={styles.image} />
              </Animated.View>
            ) : null}
            <Animated.View style={[styles.card, cardStyle]} {...panResponder.panHandlers}>
              {current.image_url ? (
                <Image source={{ uri: current.image_url }} style={styles.image} />
              ) : (
                <View style={styles.placeholder} />
              )}
              <View style={styles.meta}>
                <Text style={styles.title} numberOfLines={1}>{current.title}</Text>
                {current.price_per_day != null ? (
                  <Text style={styles.price}>£{Number(current.price_per_day).toFixed(2)} / day</Text>
                ) : null}
              </View>
              <TouchableOpacity onPress={onRequestRent} style={styles.rentBtn}>
                <Text style={styles.rentText}>Request to rent ▾</Text>
              </TouchableOpacity>
              {termMenuOpen ? (
                <View style={styles.menu}>
                  {['1-3 days', '3-7 days', '7-14 days'].map((t) => (
                    <TouchableOpacity key={t} onPress={() => chooseTerm(t)} style={styles.menuItem}>
                      <Text style={styles.menuText}>{t}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </Animated.View>
          </View>
        )}
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 96 },
  searchRow: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', gap: 8, marginBottom: 8, zIndex: 10, elevation: 4 },
  search: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', color: '#fff', paddingHorizontal: 12, borderRadius: 10 },
  searchBtn: { paddingHorizontal: 12, borderWidth: 2, borderColor: colors.white, borderRadius: 10, justifyContent: 'center' },
  filterBtn: { paddingHorizontal: 12, borderWidth: 2, borderColor: colors.white, borderRadius: 10, justifyContent: 'center' },
  filterText: { color: colors.white, fontWeight: '700' },
  filters: { position: 'absolute', top: 64, left: 16, right: 16, backgroundColor: 'rgba(0,0,0,0.35)', padding: 8, borderRadius: 10, marginBottom: 8, zIndex: 9, elevation: 3 },
  filterInput: { backgroundColor: 'transparent', color: '#fff', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.6)', marginBottom: 6 },
  modeRow: { position: 'absolute', top: 120, left: 16, right: 16, flexDirection: 'row', gap: 8, zIndex: 8 },
  modeBtn: { paddingVertical: 8, paddingHorizontal: 12, borderWidth: 2, borderColor: colors.white, borderRadius: 10 },
  modeBtnActive: { backgroundColor: colors.white },
  modeText: { color: colors.white, fontWeight: '700' },
  modeTextActive: { color: colors.navy },
  empty: { color: colors.white, textAlign: 'center', marginTop: 40 },
  deck: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  image: { width: '100%', height: width * 1.2, backgroundColor: 'rgba(255,255,255,0.2)' },
  placeholder: { width: '100%', height: width * 1.2, backgroundColor: 'rgba(0,0,0,0.2)' },
  meta: { position: 'absolute', bottom: 56, left: 12, right: 12 },
  title: { color: colors.white, fontSize: 20, fontWeight: '800' },
  price: { color: colors.white, marginTop: 4 },
  rentBtn: { position: 'absolute', right: 12, bottom: 12, borderWidth: 2, borderColor: colors.white, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.25)' },
  rentText: { color: colors.white, fontWeight: '700' },
  menu: { position: 'absolute', right: 12, bottom: 60, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)' },
  menuItem: { paddingVertical: 10, paddingHorizontal: 14 },
  menuText: { color: colors.white },
});


