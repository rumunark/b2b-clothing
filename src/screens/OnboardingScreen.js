import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import * as ImagePicker from 'expo-image-picker';
import Background from '../components/Background';
import { supabase } from '../lib/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OnboardingScreen() {
  const [fullName, setFullName] = useState('');
  const [cityOrUni, setCityOrUni] = useState('');
  const [dob, setDob] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const onSave = async () => {
    setSaving(true);
    setError('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError('Not authenticated'); setSaving(false); return; }
    // Convert DOB from DD/MM/YYYY to YYYY-MM-DD for storage
    let birthdayISO = null;
    if (dob && /^(\d{2})\/(\d{2})\/(\d{4})$/.test(dob)) {
      const [, dd, mm, yyyy] = dob.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      birthdayISO = `${yyyy}-${mm}-${dd}`;
    } else if (dob) {
      // fallback: keep as-is if user typed ISO already
      birthdayISO = dob;
    }
    const { error: upsertError } = await supabase.from('profiles').upsert({
      id: user.id,
      full_name: fullName,
      city_or_uni: cityOrUni,
      birthday: birthdayISO,
      avatar_url: avatarUri || null,
    });
    if (upsertError) {
      setError(upsertError.message);
    } else {
      navigation.navigate('LandingScreen'); // Navigate to the main app tabs after successful onboarding
    }
    setSaving(false);
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Permission to access images is required'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, quality: 0.8 });
    if (result.canceled) return;
    try {
      const asset = result.assets[0];
      setAvatarUri(asset.uri);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const fileExt = ((asset.fileName && asset.fileName.includes('.')) ? asset.fileName.split('.').pop() : 'jpg')?.toLowerCase();
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;
      const res = await fetch(asset.uri);
      const blob = await res.blob();
      const contentType = asset.mimeType || `image/${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, blob, { contentType, upsert: true });
      if (uploadError) { setError(uploadError.message); return; }
      // Public bucket: use public URL immediately
      const { data: pub, error: pubErr } = await supabase.storage.from('avatars').getPublicUrl(filePath);
      if (pubErr || !pub?.publicUrl) {
        setError('Could not get public URL from avatars bucket');
        return;
      }
      setAvatarUri(pub.publicUrl);
    } catch (e) {
      const message = (e && typeof e === 'object' && 'message' in e) ? e.message : 'Avatar upload failed';
      setError(String(message));
    }
  };

  return (
    <Background>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.title}>Onboarding</Text>
        {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatar} /> : null}
        <TouchableOpacity onPress={pickAvatar} style={styles.pickBtn}><Text style={styles.pickText}>{avatarUri ? 'Change avatar' : 'Pick avatar'}</Text></TouchableOpacity>
        <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
        <TextInput style={styles.input} placeholder="City or University" value={cityOrUni} onChangeText={setCityOrUni} />
        <TextInput style={styles.input} placeholder="DOB (YYYY-MM-DD)" value={dob} onChangeText={setDob} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button title={saving ? 'Saving...' : 'Save'} onPress={onSave} disabled={saving} />
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.navy },
  title: { fontSize: 24, marginBottom: 16, fontWeight: '800', color: colors.white },
  input: { backgroundColor: colors.white, padding: 12, borderRadius: 8, marginBottom: 12 },
  error: { color: colors.yellow, marginBottom: 12 },
  avatar: { width: 96, height: 96, borderRadius: 48, alignSelf: 'center', marginBottom: 12, borderWidth: 2, borderColor: colors.white },
  pickBtn: { alignSelf: 'center', borderWidth: 2, borderColor: colors.white, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, marginBottom: 12 },
  pickText: { color: colors.white, fontWeight: '700' },
});


