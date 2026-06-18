import { useState, useEffect } from 'react';
import { View, Text, TextInput, Image, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import Dropdown from '../ui/Dropdown';
import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import Background from '../components/Background';
import { Button } from '../ui'
import { supabase } from '../lib/supabaseClient';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';

export default function Onboarding() {
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [dob, setDob] = useState('');
  const [avatarUri, setAvatarUri] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    async function fetchUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { return; }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select(`full_name, city, birthday, avatar_url`)
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return;
      }

      if (profile) {
        setFullName(profile.full_name || '');
        setCity(profile.city || '');
        if (profile.birthday) {
          // Convert YYYY-MM-DD to DD/MM/YYYY for display
          const [yyyy, mm, dd] = profile.birthday.split('-');
          setDob(`${dd}/${mm}/${yyyy}`);
        }
        setAvatarUri(profile.avatar_url || '');
      }
    }

    fetchUserProfile();
  }, []);

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
      city: city,
      birthday: birthdayISO,
      avatar_url: avatarUri || null,
    });
    if (upsertError) {
      setError(upsertError.message);
    } else {
      //await supabase.auth.refreshSession();
      if (navigation.canGoBack()) {
        navigation.goBack();
      }
    }
    setSaving(false);
  };

  const pickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { setError('Permission to access images is required'); return; }
    
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.Images, allowsEditing: true, quality: 0.8, base64: true });
    
    if (result.canceled) return;
    
    try {
      const asset = result.assets[0];
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const fileExt = ((asset.fileName && asset.fileName.includes('.')) ? asset.fileName.split('.').pop() : 'jpg')?.toLowerCase();
      const filePath = `avatars/${user.id}-${Date.now()}.${fileExt}`;
      const contentType = asset.mimeType || `image/${fileExt}`;

      if (!asset.base64) {throw new Error('Image picker did not return base64 data');}

      const arrayBuffer = decode(asset.base64);

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, arrayBuffer, { contentType, upsert: true });
        
      if (uploadError) { setError(uploadError.message); return; }

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
      <View style={[styles.containerBackground, {paddingBottom: insets.bottom}]}>
        <View style={[styles.row, { alignItems: 'center', marginBottom: 16 }]}>
        {avatarUri ? <Image source={{ uri: avatarUri }} style={[styles.avatar, { marginRight: 10 }]} /> : null}
        <Button onPress={pickAvatar} variant="outline" size="md" icon="create-outline" iconColor={colors.white}>{avatarUri ? 'Change avatar' : 'Pick avatar'}</Button>
        </View>
        <TextInput style={styles.input} placeholder="Full name" value={fullName} onChangeText={setFullName} />
        <Dropdown title="Select a City" enumType='location' value={city} onValueChange={setCity} placeholder="Select a City"/>
        <TextInput style={styles.input} placeholder="DOB (DD/MM/YYYY)" value={dob} onChangeText={setDob} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button onPress={onSave} variant="gold">Save</Button>
      </View>
    </Background>
  );
}
