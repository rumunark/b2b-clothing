import { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import { supabase } from '../lib/supabaseClient';

export default function ProfileScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [fullName, setFullName] = useState('');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [numListed, setNumListed] = useState(0);
  const [numRented, setNumRented] = useState(0);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setEmail(user?.email ?? '');
      setUserId(user?.id ?? '');
      if (!user) return;
      const { data: profile } = await supabase.from('profiles').select('full_name, city_or_uni, role, birthday, avatar_url').eq('id', user.id).maybeSingle();
      setFullName(profile?.full_name ?? '');
      const rawDob = profile?.birthday ?? '';
      if (rawDob) {
        const d = new Date(rawDob);
        const dd = String(d.getDate()+ 1).padStart(2, '0');
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
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        {avatarUrl ? <Image source={{ uri: avatarUrl }} style={styles.avatar} /> : null}
        <Text style={styles.value}>{fullName}</Text>
        <Text style={styles.value}>{email}</Text>
        {dob ? <Text style={styles.value}>DOB: {dob}</Text> : null}
        {age != null ? <Text style={styles.value}>Age: {age}</Text> : null}
        {userId ? <Text style={styles.value}>User ID: {userId}</Text> : null}
        <View style={{ height: 12 }} />
        <Text style={styles.value}>Items listed: {numListed}</Text>
        <Text style={styles.value}>Items rented: {numRented}</Text>
        <View style={{ height: 16 }} />
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={styles.editBtn}>
          <Text style={styles.editText}>Edit profile</Text>
        </TouchableOpacity>
        <View style={{ height: 12 }} />
        <Button title="Sign out" onPress={() => supabase.auth.signOut()} />
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: colors.navy },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 8, color: colors.white },
  email: { marginBottom: 16, color: colors.gray100 },
  value: { color: colors.white, marginBottom: 6 },
  avatar: { width: 96, height: 96, borderRadius: 48, marginBottom: 12, borderWidth: 2, borderColor: colors.white },
  editBtn: { alignSelf: 'flex-start', borderWidth: 2, borderColor: colors.white, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 10 },
  editText: { color: colors.white, fontWeight: '700' },
});


