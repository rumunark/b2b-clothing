import { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, Image, StyleSheet, Dimensions, Animated, PanResponder, Alert, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { useFocusEffect } from '@react-navigation/native';
import Background from '../components/Background';
import { Ionicons } from '@expo/vector-icons';

type Listing = {
  id: string;
  title: string;
  description?: string;
  size?: string;
  category?: string;
  image_url?: string | null;
};

const { width } = Dimensions.get('window');
const SWIPE_THRESHOLD = 0.25 * width;

export default function SwipeFeed() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const position = useRef(new Animated.ValueXY()).current;

  const load = useCallback(async () => {
    const user = (await supabase.auth.getUser()).data.user;
    if (user) setUserId(user.id);
    // Try with created_at ordering first, then fall back
    let rows: any[] | null = null;
    try {
      const { data, error } = await supabase
        .from('items')
        .select('id, title, description, size, category, image_url')
        .order('created_at', { ascending: false })
        .limit(50);
      if (!error) rows = data as any[];
    } catch {}
    if (!rows) {
      const { data } = await supabase
        .from('items')
        .select('id, title, description, size, category, image_url')
        .limit(50);
      rows = (data as any[]) ?? [];
    }
    setIdx(0);
    setListings(rows);
  }, []);

  useEffect(() => { load(); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSwipe = async (direction: string, listing: Listing) => {
    if (direction === 'right' && userId) {
      const payload: any = {
        user_id: userId,
        item_id: listing.id,
        title: listing.title,
        image_url: listing.image_url ?? null,
        // price_per_day may be null if not present in items
      };
      let { error } = await supabase.from('wishlist').upsert(payload, { onConflict: 'user_id,item_id' });
      if (error && /relation .* does not exist/i.test(error.message)) {
        // Fallback to pluralized table name if schema uses it
        const res = await supabase.from('wishlists').upsert(payload, { onConflict: 'user_id,item_id' });
        error = res.error || null;
      }
      if (error) { setErrMsg(`Wishlist upsert failed: ${error.message}`); Alert.alert('Wishlist error', error.message); } else { setErrMsg(null); }
    }
  };

  const forceSwipe = (direction: 'left' | 'right') => {
    Animated.timing(position, {
      toValue: { x: direction === 'right' ? width : -width, y: 0 },
      duration: 200,
      useNativeDriver: false,
    }).start(() => onSwipeComplete(direction));
  };

  const onSwipeComplete = (direction: 'left' | 'right') => {
    const current = listings[idx];
    position.setValue({ x: 0, y: 0 });
    setIdx((v) => v + 1);
    if (current) handleSwipe(direction, current);
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

  const current = listings[idx];
  const next = listings[idx + 1];

  const goNext = () => {
    position.setValue({ x: 0, y: 0 });
    setIdx((v) => v + 1);
  };

  const likeCurrent = async () => {
    if (!current) return;
    await handleSwipe('right', current);
    goNext();
  };

  const dislikeCurrent = () => {
    goNext();
  };

  return (
    <Background>
      <View style={styles.root}>
      {errMsg ? (
        <View style={styles.errorBar}><Text style={styles.errorText}>{errMsg}</Text></View>
      ) : null}
      {listings.length === 0 ? (
        <Text style={styles.empty}>No items available</Text>
      ) : !current ? (
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
              <Text style={styles.subtitle} numberOfLines={2}>{current.description || ''}</Text>
              {current.price_per_day != null ? (
                <Text style={styles.price}>£{Number(current.price_per_day).toFixed(2)} / day · Short-term (1–3 days)</Text>
              ) : null}
            </View>
            <View style={styles.actionsRow}>
              <TouchableOpacity onPress={dislikeCurrent} style={[styles.actionBtn, styles.actionBtnOutline]} accessibilityLabel="Dislike">
                <Ionicons name="thumbs-down" size={28} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={likeCurrent} style={[styles.actionBtn, styles.actionBtnSolid]} accessibilityLabel="Add to wishlist">
                <Ionicons name="heart" size={28} color="#0B1F3A" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { color: colors.white },
  errorBar: { position: 'absolute', top: 12, left: 12, right: 12, backgroundColor: 'rgba(220,53,69,0.9)', padding: 8, borderRadius: 8, zIndex: 20 },
  errorText: { color: '#fff', fontWeight: '700' },
  deck: { width: '100%', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  card: { position: 'absolute', width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)' },
  image: { width: '100%', height: width * 1.2, backgroundColor: 'rgba(255,255,255,0.2)' },
  placeholder: { width: '100%', height: width * 1.2, backgroundColor: 'rgba(0,0,0,0.2)' },
  meta: { position: 'absolute', bottom: 16, left: 12, right: 12 },
  title: { color: colors.white, fontSize: 18, fontWeight: '800' },
  subtitle: { color: colors.gray100, marginTop: 4 },
  price: { color: colors.white, marginTop: 6, fontWeight: '700' },
  actionsRow: { position: 'absolute', bottom: 12, right: 12, flexDirection: 'row', gap: 12 },
  actionBtn: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  actionBtnOutline: { borderWidth: 2, borderColor: '#fff', backgroundColor: 'rgba(0,0,0,0.35)' },
  actionBtnSolid: { backgroundColor: '#fff' },
});


