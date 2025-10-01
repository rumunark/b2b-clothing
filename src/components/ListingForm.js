import { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Calendar } from 'react-native-calendars';
import dayjs from 'dayjs';
import Input from '../ui/Input';
import Label from '../ui/Label';
import UIButton from '../ui/Button';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabaseClient';
import * as ImageManipulator from 'expo-image-manipulator';
import { createConnectAccount, createOnboardingLink } from '../lib/stripeEdge';

const CATEGORIES = [
  { key: 'Fancy Dress', label: 'Fancy Dress 🎭' },
  { key: 'Formalwear', label: 'Formalwear 🎩' },
  { key: 'Fits', label: 'Fits 👕' },
];

export default function ListingForm({ onDone }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [size, setSize] = useState('');
  const [category, setCategory] = useState('Fancy Dress');
  const [assets, setAssets] = useState([]);
  const [pricePerNight, setPricePerNight] = useState('');
  const [insuranceValue, setInsuranceValue] = useState('');
  const [cleaningPrice, setCleaningPrice] = useState('');
  const [durationPreset, setDurationPreset] = useState('3'); // '1' | '3' | '7' | 'custom'
  const [customNights, setCustomNights] = useState('');
  const [selectedDates, setSelectedDates] = useState({}); // {'YYYY-MM-DD': true}
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tagsInput, setTagsInput] = useState('');

  // Recommend cleaning price for Formalwear
  useMemo(() => {
    if (category === 'Formalwear' && !cleaningPrice) setCleaningPrice('7.00');
  }, [category]);

  const markedDates = useMemo(() => {
    const marks = {};
    Object.keys(selectedDates).forEach((d) => {
      marks[d] = { selected: true, selectedColor: '#0a2a66' };
    });
    return marks;
  }, [selectedDates]);

  const toggleDate = (day) => {
    const d = day.dateString; // YYYY-MM-DD
    setSelectedDates((prev) => {
      const next = { ...prev };
      if (next[d]) delete next[d];
      else next[d] = true;
      return next;
    });
  };

  const pickImages = async () => {
    setError('');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Permission required to access photos'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ allowsMultipleSelection: true, quality: 0.9, mediaTypes: ImagePicker.MediaTypeOptions.Images });
    if (!result.canceled) setAssets(result.assets || []);
  };

  // helper to get ArrayBuffer and normalize HEIC → JPEG
  async function toJpegArrayBuffer(uri, mimeType) {
    let sourceUri = uri;
    let targetMime = (mimeType || '').toLowerCase();

    const isHeic = targetMime.includes('heic');
    if (isHeic) {
      const manip = await ImageManipulator.manipulateAsync(uri, [], {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      sourceUri = manip.uri;
      targetMime = 'image/jpeg';
    } else if (!targetMime) {
      targetMime = 'image/jpeg';
    }

    const res = await fetch(sourceUri);
    const ab = await res.arrayBuffer();
    return { ab, contentType: targetMime };
  }

  const onSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Ensure lender has a Stripe account id
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_account_id')
        .eq('id', user.id)
        .maybeSingle();
      let stripeAccountId = profile?.stripe_account_id || null;
      if (!stripeAccountId) {
        try {
          const { stripe_account_id } = await createConnectAccount();
          stripeAccountId = stripe_account_id;
        } catch (e) {
          // If creation failed, offer onboarding anyway to complete details after account exists
        }
      }
      if (!stripeAccountId) {
        try {
          const { url } = await createOnboardingLink();
          Alert.alert('Connect Stripe', 'You need to complete Stripe onboarding to get paid.', [
            { text: 'Open', onPress: () => Linking.openURL(url) },
            { text: 'Cancel', style: 'cancel' },
          ]);
          // Continue listing; payment won’t work until onboarding done
        } catch {}
      }

      // Upload images → bucket: items
      const imageUrls = [];
      for (let i = 0; i < assets.length; i++) {
        const a = assets[i];
        const extRaw = (a.fileName && a.fileName.includes('.')) ? a.fileName.split('.').pop().toLowerCase() : '';
        const isHeic = (a.mimeType || '').toLowerCase().includes('heic') || extRaw === 'heic' || extRaw === 'heif';
        const fileExt = isHeic ? 'jpg' : (extRaw || 'jpg');
        const fileName = `${user.id}-${Date.now()}-${i}.${fileExt}`;

        const { ab, contentType } = await toJpegArrayBuffer(a.uri, a.mimeType);
        const { error: upErr } = await supabase.storage
          .from('items')
          .upload(fileName, ab, {
            contentType: isHeic ? 'image/jpeg' : (contentType || 'image/jpeg'),
            upsert: true,
          });
        if (upErr) throw upErr;

        const { data: pub, error: pubErr } = await supabase.storage.from('items').getPublicUrl(fileName);
        if (pubErr || !pub?.publicUrl) throw new Error('Failed to get public URL for image');
        imageUrls.push(pub.publicUrl);
      }

      const availabilityDates = Object.keys(selectedDates)
        .sort()
        .filter((d) => dayjs(d, 'YYYY-MM-DD', true).isValid());

      const preferredDurations = durationPreset === 'custom'
        ? [1, 3, 7] // keep defaults plus record custom separately
        : [Number(durationPreset)];

      const customDurationDays = durationPreset === 'custom'
        ? (Number(customNights) || null)
        : null;

      const primaryImage = imageUrls[0] || null;

      const payload = {
        owner_id: user.id,
        title,
        description,
        size: size || null,
        category, // 'Fancy Dress' | 'Formalwear' | 'Fits'
        image_url: primaryImage,
        images: imageUrls.length ? imageUrls : null,
        price_per_day: pricePerNight ? Number(pricePerNight) : null,
        availability_dates: availabilityDates,              // date[]
        preferred_durations: preferredDurations,           // int[]
        custom_duration_days: customDurationDays,          // int | null
        insurance_value: insuranceValue ? Number(insuranceValue) : null,
        cleaning_price: cleaningPrice ? Number(cleaningPrice) : null,
      };

      const tagsArray = (tagsInput || '')
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0);
      if (tagsArray.length > 0) {
        payload.tags = tagsArray;
        payload.tags_text = tagsArray.join(', ');
      }

      const { error: insErr } = await supabase.from('items').insert([payload]);
      if (insErr) throw insErr;

      if (onDone) onDone();
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Label>Title</Label>
      <Input value={title} onChangeText={setTitle} placeholder="e.g. Navy tuxedo" />

      <View style={{ height: 8 }} />
      <Label>Description</Label>
      <Input value={description} onChangeText={setDescription} placeholder="Short description…" multiline />

      <View style={{ height: 8 }} />
      <Label>Tags (comma separated)</Label>
      <Input
        value={tagsInput}
        onChangeText={setTagsInput}
        placeholder="e.g. tuxedo, ball gown, fancy dress, pub golf"
      />

      <View style={{ height: 8 }} />
      <Label>Size</Label>
      <Input value={size} onChangeText={setSize} placeholder="S / M / L or 10 / 12…" />

      <View style={{ height: 8 }} />
      <Label>Category</Label>
      <View style={styles.row}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c.key} onPress={() => setCategory(c.key)}
            style={[styles.chip, category === c.key && styles.chipActive]}>
            <Text style={[styles.chipText, category === c.key && styles.chipTextActive]}>{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ height: 8 }} />
      <Label>Rental price per night (£)</Label>
      <Input value={pricePerNight} onChangeText={setPricePerNight} keyboardType="numeric" placeholder="e.g. 15" />

      <View style={{ height: 8 }} />
      <Label>Preferred rental duration</Label>
      <View style={styles.row}>
        {[
          { k: '1', t: '1 night' },
          { k: '3', t: '3 nights (recommended)' },
          { k: '7', t: '1 week' },
          { k: 'custom', t: 'Other' },
        ].map((opt) => (
          <TouchableOpacity key={opt.k} onPress={() => setDurationPreset(opt.k)}
            style={[styles.chip, durationPreset === opt.k && styles.chipActive]}>
            <Text style={[styles.chipText, durationPreset === opt.k && styles.chipTextActive]}>{opt.t}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {durationPreset === 'custom' ? (
        <View style={{ marginTop: 8 }}>
          <Label>Custom nights</Label>
          <Input value={customNights} onChangeText={setCustomNights} keyboardType="numeric" placeholder="e.g. 10" />
        </View>
      ) : null}

      <View style={{ height: 8 }} />
      <Label>Availability calendar (tap dates to mark available)</Label>
      <Calendar
        onDayPress={toggleDate}
        markedDates={markedDates}
        theme={{
          selectedDayBackgroundColor: '#0a2a66',
          selectedDayTextColor: '#fff',
          todayTextColor: '#0a2a66',
          arrowColor: '#0a2a66',
        }}
      />

      <View style={{ height: 8 }} />
      <Label>Insurance value (£)</Label>
      <Input value={insuranceValue} onChangeText={setInsuranceValue} keyboardType="numeric" placeholder="e.g. 150" />

      <View style={{ height: 8 }} />
      <Label>Cleaning price (optional, £)</Label>
      <Input value={cleaningPrice} onChangeText={setCleaningPrice} keyboardType="numeric" placeholder="e.g. 7" />

      <View style={{ height: 12 }} />
      <TouchableOpacity onPress={pickImages} style={styles.pickBtn}>
        <Text style={styles.pickText}>{assets.length > 0 ? `Selected ${assets.length} image(s)` : 'Pick photos'}</Text>
      </TouchableOpacity>
      <View style={styles.previewRow}>
        {assets.map((a) => (
          <Image key={a.assetId || a.uri} source={{ uri: a.uri }} style={styles.thumb} />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ height: 12 }} />
      <UIButton variant="solid" onPress={onSubmit} textStyle={{ color: '#000' }}>
        {loading ? 'Saving…' : 'Create Listing'}
      </UIButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: '#0a2a66' },
  chipActive: { backgroundColor: '#0a2a66' },
  chipText: { color: '#0a2a66' },
  chipTextActive: { color: '#fff' },
  pickBtn: { padding: 12, borderWidth: 1, borderColor: colors.border || '#ccc', borderRadius: 8, alignItems: 'center' },
  pickText: { color: '#000' },
  previewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  thumb: { width: 64, height: 64, borderRadius: 6 },
  error: { color: 'red', marginTop: 8 },
});


