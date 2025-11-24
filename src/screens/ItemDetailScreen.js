import { useEffect, useState, useMemo } from 'react';
import { View, Text, Image, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import { Button } from '../ui'
import { useRoute } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';

export default function ItemDetailScreen() {
  const route = useRoute();
  const { id } = route.params ?? {};
  const [item, setItem] = useState(null);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // rent picker state
  const [showRent, setShowRent] = useState(false);
  const [startDate, setStartDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [nights, setNights] = useState(3);
  const [customNights, setCustomNights] = useState('');
  const [imgIndex, setImgIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const insets = useSafeAreaInsets();

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

      const { data: { user } } = await supabase.auth.getUser();
      if (user && it?.id) {
        const { data: wishlistEntry } = await supabase
          .from('wishlist')
          .select('id')
          .eq('user_id', user.id)
          .eq('listing_id', it.id)
          .maybeSingle();
        setIsWishlisted(!!wishlistEntry);
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

  const toggleWishlist = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert('Sign in required', 'Please log in first.'); return; }
    if (!item?.id) { return; }

    if (isWishlisted) {
      const { error } = await supabase.from('wishlist').delete().match({ user_id: user.id, listing_id: item.id });
      if (error) {
        Alert.alert('Wishlist error', error.message);
      } else {
        setIsWishlisted(false);
        Alert.alert('Removed from wishlist');
      }
    } else {
      const { error } = await supabase.from('wishlist').insert({ user_id: user.id, listing_id: item.id });
      if (error) {
        Alert.alert('Wishlist error', error.message);
      } else {
        setIsWishlisted(true);
        Alert.alert('Added to wishlist');
      }
    }
  };

  const addToBasket = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { Alert.alert('Sign in required', 'Please log in first.'); return; }
    
    const { error } = await supabase.from('basket').insert([{
      user_id: user.id,
      item_id: item.id,
      start_date: startDate,
      nights: effectiveNights,
      price_per_day: pricePerDay,
      cleaning_price: cleaningFee || null,
      total: Number(estimatedTotal)
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
        <View style={[styles.centered, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Text style={styles.body}>Loading...</Text>
        </View>
      </Background>
    );
  }

  const images = Array.isArray(item.images) && item.images.length > 0 ? item.images : (item.image_url ? [item.image_url] : []);

  return (
    <Background>
      <ScrollView contentContainerStyle={[styles.containerBackground, { paddingBottom: insets.bottom }]}>
        {images.length > 0 && (
          <View onLayout={({ nativeEvent: { layout: { width } } }) => setCarouselWidth(width)}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onMomentumScrollEnd={(e) => {
                const { contentOffset, layoutMeasurement } = e.nativeEvent;
                const idx = Math.round(contentOffset.x / layoutMeasurement.width);
                setImgIndex(idx);
              }}
            >
              {images.map((uri, idx) => (
                <Image
                  key={`${item.id}-${idx}`}
                  source={{ uri }}
                  style={[styles.carouselImage, { width: carouselWidth }]}
                />
              ))}
            </ScrollView>
            {images.length > 1 && (
              <View style={styles.dotsRow}>
                {images.map((_, i) => (
                  <View key={i} style={[styles.dot, imgIndex === i && styles.dotActive]} />
                ))}
              </View>
            )}
          </View>
        )}

      
        <Text style={styles.screenTitle}>{item.title}</Text>
        {item.description && <Text style={styles.body}>{item.description}</Text>}
        {item.price_per_day != null && (
          <Text style={styles.price}>
            Rent from £{Number(item.price_per_day).toFixed(2)}
          </Text>
        )}
        {item.size && <Text style={[styles.body]}>Size: {item.size}</Text>}
        
        <View style={styles.row}>
          <Ionicons name="star" size={16} color={colors.yellow} />
          <Text style={styles.body}>
            {ratingCount > 0 ? `${ratingAvg.toFixed(1)} (${ratingCount}) reviews` : 'New'}
          </Text>
        </View>

        {/* Rent and wishlist buttons */}
        <View style={[styles.row]}>
          <Button onPress={toggleWishlist} variant="solid" size="md" icon='heart' iconColor={isWishlisted ? colors.pink : colors.navy}>Wishlist</Button>
          <Button onPress={() => setShowRent(v => !v)} variant="gold" size="md" icon="cart-outline">Rent Now</Button>
        </View>

        {showRent && (
          <View>
            <Text style={styles.label}>Start date</Text>
            <Calendar
              onDayPress={(d) => setStartDate(d.dateString)}
              markedDates={{ [startDate]: { selected: true, selectedColor: colors.navy } }}
              theme={{ calendarBackground: colors.white, selectedDayTextColor: colors.white, todayTextColor: colors.yellow, dayTextColor: colors.navy, textDisabledColor: colors.gray200, arrowColor: colors.navy, monthTextColor: colors.navy, textSectionTitleColor: colors.gray500 }}
              style={{ borderRadius: 8 }}
            />
            
            <Text style={styles.label}>Duration</Text>
            <View style={[styles.row, { flexWrap: 'wrap' }]}>
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
                style={[styles.chip, !nights && styles.chipActive]}
                onPress={() => setNights(null)}
              >
                <Text style={[styles.chipText, !nights && styles.chipTextActive]}>Other</Text>
              </TouchableOpacity>
            </View>
            
            {!nights && (
              <>
                <Text style={styles.label}>Custom nights</Text>
                <TextInput
                  value={customNights}
                  onChangeText={setCustomNights}
                  keyboardType="numeric"
                  placeholder="e.g. 10"
                  placeholderTextColor={colors.gray500}
                  style={styles.input}
                />
              </>
            )}

            <View>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={styles.body}>Price per night</Text>
                <Text style={styles.body}>£{pricePerDay.toFixed(2)}</Text>
              </View>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={styles.body}>Cleaning fee</Text>
                <Text style={styles.body}>£{cleaningFee.toFixed(2)}</Text>
              </View>
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={styles.label}>Estimated total</Text>
                <Text style={styles.price}>£{estimatedTotal}</Text>
              </View>
            </View>

            <Button onPress={addToBasket} variant="gold">Add to basket</Button>
          </View>
        )}
      </ScrollView>
    </Background>
  );
}