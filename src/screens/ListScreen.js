import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import Background from '../components/Background';
import { colors } from '../theme/colors';
import { supabase } from '../lib/supabaseClient';
import UIButton from '../ui/Button';
import ListingForm from '../components/ListingForm';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ListScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pricePerDay, setPricePerDay] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const insets = useSafeAreaInsets();

  const onSave = async () => {
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Not authenticated');
      setSaving(false);
      return;
    }
    const payload = {
      title,
      description,
      price_per_day: Number(pricePerDay) || null,
      image_url: imageUrl || null,
      owner_id: user.id,
    };
    const { error: err } = await supabase.from('items').insert(payload);
    if (err) setError(err.message);
    setSaving(false);
  };

  return (
    <Background>
      <View style={[styles.container, {}]}>
        {/* <Text style={styles.title}>List an item</Text> */}
        <ListingForm onDone={() => navigation.navigate('Tabs', { screen: 'Rent' })} />
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  // title: { fontSize: 20, fontWeight: '800', color: colors.white, marginBottom: 12 },
  input: { backgroundColor: 'rgba(255,255,255,0.95)', padding: 12, borderRadius: 8, marginBottom: 12 },
  error: { color: colors.white, marginBottom: 12 },
});


