import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import { supabase } from '../lib/supabaseClient';
import Background from '../components/Background';
import { colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
        .select('id, title, price_per_day, cleaning_price, category')
        .eq('id', id)
        .maybeSingle();
      if (error) Alert.alert('Error', error.message);
      setItem(data ?? null);
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

  if (!item) {
    return (
      <Background>
        <View style={[styles.center, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Text style={{ color: colors.white }}>Loading…</Text>
        </View>
      </Background>
    );
  }

  return (
    <Background>
      <ScrollView contentContainerStyle={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.title}>{item.title}</Text>

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

        <TouchableOpacity
          style={styles.cta}
          onPress={() => {
            Alert.alert(
              'Request summary',
              `Start: ${startDate}\nNights: ${effectiveNights}\nTotal: £${estimatedTotal}`,
              [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
          }}
        >
          <Text style={styles.ctaText}>Proceed</Text>
        </TouchableOpacity>
      </ScrollView>
    </Background>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.navy },
  container: { padding: 16, backgroundColor: colors.navy, minHeight: '100%' },
  title: { color: colors.white, fontSize: 18, fontWeight: '800', marginBottom: 12 },
  label: { color: colors.white, marginTop: 8, marginBottom: 6, fontWeight: '700' },
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
  cta: { marginTop: 16, backgroundColor: colors.yellow, borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  ctaText: { color: '#000', fontWeight: '800' },
});