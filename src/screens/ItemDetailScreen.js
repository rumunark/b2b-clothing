import { useEffect, useState, useMemo } from 'react';
import { View, Text, Image, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import { useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';

export default function ItemDetailScreen() {
  const route = useRoute();
  const { id } = route.params ?? {};
  const [item, setItem] = useState(null);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);

  // rent picker state
  const [showRent, setShowRent] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [nights, setNights] = useState(3);
  const [customNights, setCustomNights] = useState('');
  const [imgIndex, setImgIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: it } = await supabase
        .from('items')
        .select('id, title, description, image_url, images, price_per_day, size, owner_id, cleaning_price')
        .eq('id', id)
        .maybeSingle();
      setItem(it ?? null);

      if (it?.owner_id) {
        const { data: revs } = await supabase
          .from('reviews')
          .select('rating')
          .eq('reviewee_id', it.owner_id);
        const count = revs?.length ?? 0;
        const avg = count ? revs.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count : 0;
        setRatingAvg(avg);
        setRatingCount(count);
      }
    };
    if (id) load();
  }, [id]);

  const pricePerDay = Number(item?.price_per_day || 0);
  const cleaningFee = Number(item?.cleaning_price || 0);
  const effectiveNights = Number(customNights || nights || 1);
  const estimatedTotal = useMemo(() => {
    const total = pricePerDay * effectiveNights + cleaningFee;
    return total.toFixed(2);
  }, [pricePerDay, effectiveNights, cleaningFee]);

  const addToWishlist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert('Sign in required', 'Please log in first.'); return; }
    const { error } = await supabase
      .from('wishlist')
      .insert({ user_id: user.id, listing_id: item.id });
    if (error) {
      Alert.alert('Wishlist error', error.message);
      return;
    }
    Alert.alert('Added to wishlist', 'You can view it in Wishlist.');
  };

  const addToBasket = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert('Sign in required', 'Please log in first.'); return; }
    const total = Number(estimatedTotal);
    const { error } = await supabase.from('basket').insert([{
      user_id: user.id,
      item_id: item.id,
      start_date: startDate,
      nights: effectiveNights,
      price_per_day: pricePerDay,
      cleaning_price: cleaningFee || null,
      total
    }]);
    if (error) {
      Alert.alert('Basket error', error.message);
      return;
    }
    Alert.alert('Added to basket', `Start: ${startDate}\nNights: ${effectiveNights}\nTotal: £${estimatedTotal}`);
    setShowRent(false);
  };

  if (!item) {
    return (
      <Background>
        <View style={styles.center}>
          <Text style={{ color: colors.white }}>Loading...</Text>
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <ScrollView contentContainerStyle={styles.container}>
        {(() => {
          const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : (item.image_url ? [item.image_url] : []);
          if (!images.length) return null;
          return (
            <View onLayout={({ nativeEvent: { layout: { width } } }) => setCarouselWidth(width)}>
              <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.carousel}
                onMomentumScrollEnd={(e) => {
                  const { contentOffset, layoutMeasurement } = e.nativeEvent;
                  const idx = Math.round((contentOffset?.x || 0) / (layoutMeasurement?.width || 1));
                  setImgIndex(idx);
                }}
              >
                {images.map((uri, idx) => (
                  <Image
                    key={`${item.id}-${idx}`}
                    source={{ uri }}
                    style={[styles.image, carouselWidth ? { width: carouselWidth, height: carouselWidth } : null]}
                  />
                ))}
              </ScrollView>
              {images.length > 1 ? (
                <View style={styles.dotsRow}>
                  {images.map((_, i) => (
                    <View key={i} style={[styles.dot, imgIndex === i && styles.dotActive]} />
                  ))}
                </View>
              ) : null}
            </View>
          );
        })()}
        <Text style={styles.title}>{item.title}</Text>
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
        {item.price_per_day != null ? (
          <Text style={styles.price}>Rent from £{Number(item.price_per_day).toFixed(2)}</Text>
        ) : null}
        {item.size ? <Text style={styles.meta}>Size: {item.size}</Text> : null}
        <View style={styles.ratingRow}>
          <Ionicons name="star" size={16} color={colors.yellow} />
          <Text style={styles.ratingText}>
            {ratingCount > 0 ? `${ratingAvg.toFixed(1)} (${ratingCount})` : 'New'}
          </Text>
        </View>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.wishBtn} onPress={addToWishlist}>
            <Ionicons name="heart" size={18} color="#0B1F3A" />
            <Text style={styles.wishText}>Add to wishlist</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.rentBtn} onPress={() => setShowRent((v) => !v)}>
            <Ionicons name="cart-outline" size={18} color="#000" />
            <Text style={styles.rentText}>Rent now</Text>
          </TouchableOpacity>
        </View>

        {showRent ? (
          <View style={styles.rentBox}>
            <Text style={styles.label}>Start date</Text>
            <Calendar
              onDayPress={(d) => setStartDate(d.dateString)}
              markedDates={{ [startDate]: { selected: true, selectedColor: '#0a2a66' } }}
              theme={{ selectedDayTextColor: '#fff', todayTextColor: '#0a2a66', arrowColor: '#0a2a66' }}
            />
            <View style={{ height: 12 }} />
            <Text style={styles.label}>Duration</Text>
            <View style={styles.row}>
              {[{k:1,t:'1 night'},{k:3,t:'3 nights'},{k:7,t:'1 week'}].map(opt => (
                <TouchableOpacity
                  key={opt.k}
                  style={[styles.chip, nights === opt.k && styles.chipActive]}
                  onPress={() => { setNights(opt.k); setCustomNights(''); }}
                >
                  <Text style={[styles.chipText, nights === opt.k && styles.chipTextActive]}>{opt.t}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[styles.chip, customNights && styles.chipActive]}
                onPress={() => setNights(null)}
              >
                <Text style={[styles.chipText, customNights && styles.chipTextActive]}>Other</Text>
              </TouchableOpacity>
            </View>
            {!nights ? (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.sublabel}>Custom nights</Text>
                <TextInput
                  value={customNights}
                  onChangeText={setCustomNights}
                  keyboardType="numeric"
                  placeholder="e.g. 10"
                  style={styles.input}
                />
              </View>
            ) : null}

            <View style={{ height: 16 }} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>Price per night</Text>
              <Text style={styles.summaryVal}>£{pricePerDay.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>Cleaning fee</Text>
              <Text style={styles.summaryVal}>£{cleaningFee.toFixed(2)}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.totalText}>Estimated total</Text>
              <Text style={styles.totalVal}>£{estimatedTotal}</Text>
            </View>

            <TouchableOpacity style={styles.cta} onPress={addToBasket}>
              <Text style={styles.ctaText}>Add to basket</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  container: { padding: 16, backgroundColor: colors.navy, minHeight: '100%' },
  image: { width: '100%', aspectRatio: 1, borderRadius: 8, backgroundColor: '#f0f0f0' },
  carousel: { width: '100%' },
  dotsRow: { position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive: { backgroundColor: '#fff' },
  title: { marginTop: 12, fontSize: 20, fontWeight: '800', color: colors.white },
  desc: { marginTop: 6, color: colors.gray100 },
  price: { marginTop: 8, fontSize: 16, fontWeight: '700', color: colors.yellow },
  meta: { marginTop: 6, color: colors.gray100 },
  ratingRow: { marginTop: 6, flexDirection: 'row', alignItems: 'center' },
  ratingText: { marginLeft: 6, color: colors.white, fontWeight: '700' },

  actionsRow: { marginTop: 12, flexDirection: 'row', gap: 12 },
  wishBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  wishText: { marginLeft: 6, color: '#0B1F3A', fontWeight: '800' },
  rentBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.yellow, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  rentText: { marginLeft: 6, color: '#000', fontWeight: '800' },

  rentBox: { marginTop: 14, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 10, padding: 12 },
  label: { color: colors.white, marginTop: 4, marginBottom: 6, fontWeight: '700' },
  sublabel: { color: colors.white },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#0a2a66' },
  chipActive: { backgroundColor: '#0a2a66' },
  chipText: { color: '#0a2a66' },
  chipTextActive: { color: '#fff' },
  input: { marginTop: 6, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 12, height: 40 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  summaryText: { color: colors.gray100 },
  summaryVal: { color: colors.white, fontWeight: '700' },
  totalText: { color: colors.white, fontWeight: '900', marginTop: 8 },
  totalVal: { color: colors.yellow, fontWeight: '900', marginTop: 8 },

  cta: { marginTop: 12, backgroundColor: colors.yellow, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: '#000', fontWeight: '800' },
});


