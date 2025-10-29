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

export default function RentSelectScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { id, startDate: startDateParam, nights: nightsParam } = route.params ?? {};
  const [item, setItem] = useState(null);
  const [startDate, setStartDate] = useState(startDateParam || dayjs().format('YYYY-MM-DD'));
  const [nights, setNights] = useState(typeof nightsParam === 'number' ? nightsParam : 3);
  const [customNights, setCustomNights] = useState('');
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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Not signed in', 'Please sign in first.');
      return;
    }
    // Check for the 'item' state, not 'rows'
    if (!item) {
      Alert.alert('Item not loaded', 'The item details have not been loaded yet.');
      return;
    }

    const ownerId = item.owner_id; // Get owner_id from the item object
    if (!ownerId) {
      Alert.alert('Nothing sent', 'Could not find a lender to message for this item.');
      return;
    }

    // Construct the message using the component's state
    const content = `Rental request for ${item.title || 'item'}\nStart: ${startDate}\nNights: ${effectiveNights}\nTotal: £${estimatedTotal}\n\nAccept?`;

    const { error } = await supabase
      .from('messages')
      .insert([{ sender_id: user.id, receiver_id: ownerId, content }]);

    if (!error) {
      Alert.alert('Request sent', 'Your request has been sent to the lender.');
      // Optionally, navigate the user away after success
      // navigation.goBack();
    } else {
      Alert.alert('Send error', error.message);
    }
  } catch (e) {
    Alert.alert('Send error', e.message || String(e));
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
          <Text style={{ color: colors.white }}>Loading…</Text>
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <ScrollView contentContainerStyle={[styles.containerBackground, { paddingBottom: insets.bottom }]}>
        <Text style={styles.screenTitle}>{item.title}</Text>

        {/* <Text style={styles.label}>Start date</Text> */}
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

        <UIButton onPress={handleSendRequest} variant="gold" size="lg">Send request</UIButton>

      </ScrollView>
    </Background>
  );
}