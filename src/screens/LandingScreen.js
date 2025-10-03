import { View, Text, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import UIButton from '../ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function LandingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <Background>
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.brand}>b2b clothing</Text>
        <Text style={styles.tagline}>Cheaper than buying • Cooler than resale • Greener than fast fashion</Text>
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
  brand: { fontSize: 40, fontStyle: 'italic', fontWeight: '800', color: colors.white, textAlign: 'center' },
  tagline: { fontSize: 18, color: colors.white, marginTop: 12, textAlign: 'center', lineHeight: 26, fontWeight: '700' },
  signout: { marginTop: 10, color: colors.white, textDecorationLine: 'underline' },
});


