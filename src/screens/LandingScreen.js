import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import UIButton from '../ui/Button';

export default function LandingScreen({ navigation }) {
  return (
    <Background>
      <View style={styles.container}>
        <Text style={styles.brand}>b2b clothing</Text>
        <Text style={styles.tagline}>Swipe - Rent - Wear - Repeat</Text>
        <View style={{ height: 20 }} />
        <UIButton onPress={() => navigation.navigate('Tabs', { screen: 'Rent' })}>Enter the lineup →</UIButton>
        <View style={{ height: 12 }} />
        <UIButton onPress={() => navigation.navigate('Tabs', { screen: 'List' })}>Drop your gear →</UIButton>
        <View style={{ height: 24 }} />
        <Text onPress={() => supabase.auth.signOut()} style={styles.signout}>Sign out</Text>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  overlay: { },
  container: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  brand: { fontSize: 40, fontStyle: 'italic', fontWeight: '800', color: colors.white },
  tagline: { fontSize: 16, color: colors.white, marginTop: 6 },
  signout: { marginTop: 10, color: colors.white, textDecorationLine: 'underline' },
});


