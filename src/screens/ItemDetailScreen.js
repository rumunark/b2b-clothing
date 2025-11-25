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
  const { id, startDate: startDateParam, endDate: endDateParam } = route.params ?? {};
  const [item, setItem] = useState(null);
  const [ratingAvg, setRatingAvg] = useState(0);
  const [ratingCount, setRatingCount] = useState(0);
  const [isWishlisted, setIsWishlisted] = useState(false);

  // rent picker state
  const [basketItem, setBasketItem] = useState(null);
  const [showRent, setShowRent] = useState(route.params?.showRent || false);
  
  // Default to today, or params, will be overridden by basket data if found
  const [startDate, setStartDate] = useState(startDateParam || dayjs().format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(endDateParam || dayjs().format('YYYY-MM-DD'));

  const [imgIndex, setImgIndex] = useState(0);
  const [carouselWidth, setCarouselWidth] = useState(0);
  const insets = useSafeAreaInsets();
  const [sending, setSending] = useState(false);

 useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      // Load all item details
      const { data: itemData } = await supabase
        .from('items')
        .select('id, title, description, image_url, images, price_per_day, size, owner_id, cleaning_price')
        .eq('id', id)
        .maybeSingle();
      setItem(itemData ?? null);

      if (user && itemData?.id) {
        // Load Basket Data
        const { data: existingBasketItem } = await supabase
          .from('basket')
          .select('id, item_id, start_date, end_date, nights, total')
          .eq('user_id', user.id)
          .eq('item_id', itemData.id)
          .maybeSingle();
        
        // Use these pre-existing values
        if (existingBasketItem) {
          setBasketItem(existingBasketItem);
          setStartDate(existingBasketItem.start_date);
          setEndDate(existingBasketItem.end_date);
          setShowRent(true); // Open the rent view if they already have it in basket
        }

        const { data: wishlistEntry } = await supabase
          .from('wishlist')
          .select('id')
          .eq('user_id', user.id)
          .eq('listing_id', itemData.id)
          .maybeSingle();
        setIsWishlisted(!!wishlistEntry);
      }

      if (itemData?.owner_id) {
        const { data: revs } = await supabase
          .from('reviews')
          .select('rating')
          .eq('reviewee_id', itemData.owner_id);
        const count = revs?.length ?? 0;
        const avg = count ? revs.reduce((s, r) => s + (Number(r.rating) || 0), 0) / count : 0;
        setRatingAvg(avg);
        setRatingCount(count);
      }
    };

    if (id) load();
  }, [id]);

  const nights = useMemo(() => {
    if (startDate && endDate) {
      const diff = dayjs(endDate).diff(dayjs(startDate), 'day');
      return diff > 0 ? diff : 0;
    }
    return 0;
  }, [startDate, endDate]);

  const pricePerDay = Number(item?.price_per_day || 0);
  const cleaningFee = Number(item?.cleaning_price || 0);
  
  const estimatedTotal = useMemo(() => {
    if (nights < 1) return (0).toFixed(2);
    const total = pricePerDay * nights + cleaningFee;
    return total.toFixed(2);
  }, [pricePerDay, nights, cleaningFee]);

  // Generate Marked Dates for Range Visualization
  const markedDates = useMemo(() => {
    let marks = {};
    
    if (startDate) {
      marks[startDate] = { startingDay: true, color: colors.navy, textColor: colors.white };
      if (!endDate) {
        marks[startDate] = { selected: true, color: colors.navy, textColor: colors.white };
      }
    }

    if (startDate && endDate) {
      let curr = dayjs(startDate).add(1, 'day');
      const end = dayjs(endDate);
      
      while (curr.isBefore(end)) {
        const dateStr = curr.format('YYYY-MM-DD');
        marks[dateStr] = { color: colors.navy, textColor: colors.white, opacity: 0.2 };
        curr = curr.add(1, 'day');
      }
      
      marks[endDate] = { endingDay: true, color: colors.navy, textColor: colors.white };
    }
    
    return marks;
  }, [startDate, endDate]);

  const onDayPress = (day) => {
    if (!startDate || (startDate && endDate)) {
      setStartDate(day.dateString);
      setEndDate(null);
    } else if (startDate && !endDate) {
      if (dayjs(day.dateString).isBefore(dayjs(startDate))) {
        setStartDate(day.dateString);
      } else {
        setEndDate(day.dateString);
      }
    }
  };

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


  const saveToBasket = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const totalPrice = (Number(item.price_per_day || 0) * nights + Number(item.cleaning_price || 0));
      if (!user) {
        Alert.alert("Please sign in", "You must be signed in to add items to your basket.");
        return;
      }
      
      if (!startDate || !endDate || nights < 1) {
        Alert.alert("Invalid dates", "Please select a valid date range.");
        return;
      }

      if (basketItem && basketItem.id) {
        const { error, data } = await supabase
          .from('basket')
          .update({
            start_date: startDate,
            end_date: endDate,
            nights: nights,
            total: totalPrice,
          })
          .eq('id', basketItem.id)
          .select()
          .single();
          setBasketItem(data);
        if (error) {throw error};
      } else {
        const { error, data } = await supabase
          .from('basket')
          .insert({
            user_id: user.id,
            item_id: item.id,
            start_date: startDate,
            end_date: endDate,
            nights: nights,
            total: totalPrice,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();
          setBasketItem(data);
        if (error) {throw error};
      }
    
      Alert.alert('Saved to basket', `Start: ${startDate}\nEnd: ${endDate}\nNights: ${nights}\nTotal: ${totalPrice.toFixed(2)}`);
    } catch (e) {
      Alert.alert('Send error', e.message || String(e));
    }
  } 

  const handleSendRequest = async () => {
    try {
      setSending(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Not signed in', 'Please sign in first.');
        return;
      }

      if (!item || !item.owner_id) {
        Alert.alert('Error', 'Item details not loaded or missing owner.');
        return;
      }

      const totalPrice = (Number(item.price_per_day || 0) * nights + Number(item.cleaning_price || 0));

      const { error } = await supabase
        .from('requests')
        .insert([{
          buyer_id: user.id,
          seller_id: item.owner_id,
          item_id: item.id,
          start_date: startDate,
          end_date: endDate,
          nights: nights,
          total_price: totalPrice.toFixed(2),
          status: 'pending'
        }]);

    } catch (e) {
      Alert.alert('Send error', e.message || String(e));
    } finally {
      setSending(false);
    }
    Alert.alert('Your rental request has been sent to the seller for approval.');
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
        <View style={styles.row}>
          <Button onPress={toggleWishlist} variant="solid" size="md" icon='heart' iconColor={isWishlisted ? colors.pink : colors.navy} style={{ flex: 1 }}>Wishlist</Button>
          <Button onPress={() => setShowRent(v => !v)} variant="gold" size="md" icon={showRent ? "cart" : "cart-outline"} iconColor={colors.navy} style={{ flex: 1 }}>Rent Now</Button>
        </View>

        {showRent && (
          <View>
            <Text style={styles.label}>Start date</Text>
            <Calendar
              onDayPress={onDayPress}
              markingType={'period'}
              markedDates={markedDates}
              minDate={dayjs().format('YYYY-MM-DD')}
              theme={{ 
                calendarBackground: colors.white, 
                selectedDayTextColor: colors.white, 
                todayTextColor: colors.yellow, 
                dayTextColor: colors.navy, 
                textDisabledColor: colors.gray200, 
                arrowColor: colors.navy, 
                monthTextColor: colors.navy, 
                textSectionTitleColor: colors.gray500 
              }}
              
            />

            <View style={{ height: 12 }} />
              <View style={styles.row}>
                  <Text style={styles.body}>Duration:</Text>
                  <Text style={styles.value}>{nights} night{nights > 1 ? 's' : ''}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.body}>Price per day:</Text>
                <Text style={styles.value}>£{pricePerDay.toFixed(2)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.body}>Cleaning fee:</Text>
                <Text style={styles.value}>£{cleaningFee.toFixed(2)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.body}>Estimated total:</Text>
                <Text style={styles.price}>£{estimatedTotal}</Text>
              </View>

            <View style={{ height: 16 }} />

            <Button onPress={saveToBasket} variant="solid">Save to basket</Button>
            <View style={{ height: 12 }} />
            <Button onPress={handleSendRequest} variant="gold">Send Request</Button>
            <View style={{ height: 12 }} />
          </View>
        )}
      </ScrollView>
    </Background>
  );
}