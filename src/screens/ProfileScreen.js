import { useEffect, useState } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import { supabase } from '../lib/supabaseClient';
import UIButton from '../ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';

export default function ProfileScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState(null);
  const [verified, setVerified] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [numListed, setNumListed] = useState(0);
  const [numRented, setNumRented] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? '');
      setUserId(user?.id ?? '');
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('full_name, city, birthday, avatar_url, is_verified').eq('id', user.id).maybeSingle();
      setFullName(profile?.full_name ?? '');
      const rawDob = profile?.birthday ?? '';
      if (rawDob) {
        const d = new Date(rawDob);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        setDob(`${dd}/${mm}/${yyyy}`);
      } else {
        setDob('');
      }
      setAvatarUrl(profile?.avatar_url ?? '');
      if (profile?.birthday) {
        const d = new Date(profile.birthday);
        const today = new Date();
        let years = today.getFullYear() - d.getFullYear();
        const m = today.getMonth() - d.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < d.getDate())) years--;
        setAge(years);
      }
      const { count: listedCount } = await supabase.from('items').select('id', { count: 'exact', head: true }).eq('owner_id', user.id);
      setNumListed(listedCount ?? 0);
      const { count: rentedCount } = await supabase.from('rentals').select('id', { count: 'exact', head: true }).eq('renter_id', user.id);
      setNumRented(rentedCount ?? 0);
    };
    load();
  }, []);

  return (
    <Background>
      <View style={[styles.containerBackground, styles.centered]}>
        {/* <Text style={profileScreenStyles.title}>Profile</Text> */}
        {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatar} /> : null}
        <Text style={styles.body}>Full name: {fullName}</Text>
        <Text style={styles.body}>Email: {email}</Text>
        {dob ? <Text style={styles.body}>DOB: {dob}</Text> : null}
        {age != null ? <Text style={styles.body}>Age: {age}</Text> : null}
        {verified ? <Text style={styles.body}>Verified: Yes</Text> : <Text style={styles.body}>Verified: No</Text>}
        <Text style={styles.body}>Items listed: {numListed}</Text>
        <Text style={styles.body}>Items rented: {numRented}</Text>
        <UIButton onPress={() => navigation.navigate('EditProfile')}>Edit profile</UIButton>
        <UIButton onPress={() => supabase.auth.signOut()}>Sign Out</UIButton>
      </View>
    </Background>
  );
}
