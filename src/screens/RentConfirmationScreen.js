import { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabaseClient';
import Background from '../components/Background';
import UIButton from '../ui/Button';
import Label from '../ui/Label';
import { colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';

export default function RentConfirmationScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id, startDate: startDateParam, nights: nightsParam } = route.params ?? {};
  const [item, setItem] = useState(null);
  const [startDate, setStartDate] = useState(startDateParam || dayjs().format('YYYY-MM-DD'));
  const [nights, setNights] = useState(typeof nightsParam === 'number' ? nightsParam : 3);
  const [customNights, setCustomNights] = useState('');
  const [sending, setSending] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('items')
        .select('id, title, price_per_day, cleaning_price, category, owner_id')
        .eq('id', id)
        .maybeSingle();
      if (error) Alert.alert('Error', error.message);
      setItem(data ?? null);
    };
    if (id) load();
  }, [id]);

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

      const effectiveNights = Number(customNights || nights || 1);
      const totalPrice = (Number(item.price_per_day || 0) * effectiveNights + Number(item.cleaning_price || 0));

      const { error } = await supabase
        .from('requests')
        .insert([{
          buyer_id: user.id,
          seller_id: item.owner_id,
          item_id: item.id,
          start_date: startDate,
          nights: effectiveNights,
          total_price: totalPrice.toFixed(2),
          status: 'pending'
        }]);

      if (!error) {
        Alert.alert('Request sent', 'Your rental request has been sent to the seller for approval.');
        // TODO: Send push notification to seller (notification service)
        navigation.goBack();
      } else {
        Alert.alert('Send error', error.message);
      }
    } catch (e) {
      Alert.alert('Send error', e.message || String(e));
    } finally {
      setSending(false);
    }
  };

  const pricePerDay = Number(item?.price_per_day || 0);
  const cleaningFee = Number(item?.cleaning_price || 0);
  const effectiveNights = Number(customNights || nights || 1);
  const estimatedTotal = useMemo(() => {
    const total = pricePerDay * effectiveNights + cleaningFee;
    return total.toFixed(2);
  }, [pricePerDay, effectiveNights, cleaningFee]);

  if (!item) {
    return (
      <Background>
        <View style={[styles.centered, { paddingBottom: insets.bottom }]}>
          <ActivityIndicator size="large" color={colors.yellow} />
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView 
          contentContainerStyle={[styles.containerBackground, { paddingBottom: insets.bottom }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.screenTitle}>{item.title}</Text>

          <Label>Start date</Label>
          <Calendar
            onDayPress={(d) => setStartDate(d.dateString)}
            markedDates={{ [startDate]: { selected: true, selectedColor: colors.lightNavy } }}
            theme={{ selectedDayTextColor: colors.white, todayTextColor: colors.lightNavy, arrowColor: colors.lightNavy }}
          />

          <View style={{ height: 12 }} />
          <Label>Number of nights</Label>
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
              <Label>Custom nights</Label>
              <TextInput
                value={customNights}
                onChangeText={setCustomNights}
                keyboardType="numeric"
                placeholder="e.g. 10"
                style={styles.input}
                returnKeyType="done"
              />
            </View>
          ) : null}

          <View style={{ height: 12 }} />

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

          {/* TODO: Payment integration will be added here after seller approval */}

          <UIButton onPress={handleSendRequest} variant="gold" size="lg" disabled={sending}>
            {sending ? 'Sending...' : 'Send request'}
          </UIButton>
        </ScrollView>
      </KeyboardAvoidingView>
    </Background>
  );
}