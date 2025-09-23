import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Input from '../ui/Input';
import Label from '../ui/Label';
import UIButton from '../ui/Button';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabaseClient';

export default function ListingForm({ onDone }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [size, setSize] = useState('');
  const [category, setCategory] = useState('');
  const [tags, setTags] = useState('');
  const [assets, setAssets] = useState([]);
  const [shortPrice, setShortPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickImages = async () => {
    setError('');
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Permission required to access photos'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: false, quality: 0.9, allowsMultipleSelection: true });
    if (!result.canceled) setAssets(result.assets || []);
  };

  const onSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      // Upload images
      const imageUrls = [];
      for (let i = 0; i < assets.length; i++) {
        const a = assets[i];
        const fileExt = (a.fileName && a.fileName.includes('.')) ? a.fileName.split('.').pop().toLowerCase() : 'jpg';
        const fileName = `${user.id}-${Date.now()}-${i}.${fileExt}`;
        const res = await fetch(a.uri);
        const blob = await res.blob();
        const contentType = a.mimeType || `image/${fileExt}`;
        const { error: upErr } = await supabase.storage.from('listing-images').upload(fileName, blob, { contentType, upsert: true });
        if (upErr) throw upErr;
        const { data: pub, error: pubErr } = await supabase.storage.from('listing-images').getPublicUrl(fileName);
        if (pubErr || !pub?.publicUrl) throw new Error('Failed to get public URL for image');
        imageUrls.push(pub.publicUrl);
      }

      // Insert row into items so it appears in Rent
      const primaryImage = imageUrls[0] || null;
      const { error: insErr } = await supabase.from('items').insert([{
        owner_id: user.id,
        title: name,
        description,
        size: size || null,
        category: category || null,
        image_url: primaryImage,
        price_per_day: shortPrice ? Number(shortPrice) : null,
        // optional fields left null: gender, price_per_day
      }]);
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
      <Label>Name</Label>
      <Input value={name} onChangeText={setName} placeholder="Name" />
      <View style={{ height: 8 }} />
      <Label>Description</Label>
      <Input value={description} onChangeText={setDescription} placeholder="Description" />
      <View style={{ height: 8 }} />
      <Label>Size</Label>
      <Input value={size} onChangeText={setSize} placeholder="Size (S, M, L)" />
      <View style={{ height: 8 }} />
      <Label>Category</Label>
      <Input value={category} onChangeText={setCategory} placeholder="e.g. fancy dress, formalwear" />
      <View style={{ height: 8 }} />
      <Label>Tags</Label>
      <Input value={tags} onChangeText={setTags} placeholder="tag1, tag2, tag3" />

      <View style={{ height: 12 }} />
      <Label>Short-term price (1–3 days)</Label>
      <Input value={shortPrice} onChangeText={setShortPrice} placeholder="e.g. 15" keyboardType="numeric" />
      <View style={{ height: 12 }} />
      <TouchableOpacity onPress={pickImages} style={styles.pickBtn}>
        <Text style={styles.pickText}>{assets.length > 0 ? `Selected ${assets.length} image(s)` : 'Pick images'}</Text>
      </TouchableOpacity>
      <View style={styles.previewRow}>
        {assets.map((a) => (
          <Image key={a.assetId || a.uri} source={{ uri: a.uri }} style={styles.thumb} />
        ))}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={{ height: 12 }} />
      <UIButton variant="solid" onPress={onSubmit} textStyle={{ color: '#000' }}>{loading ? 'Uploading...' : 'Create Listing'}</UIButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  pickBtn: { alignSelf: 'flex-start', borderWidth: 2, borderColor: colors.white, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10 },
  pickText: { color: colors.white, fontWeight: '700' },
  previewRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  error: { color: colors.white, marginTop: 8 },
});


