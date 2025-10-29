import { View, Text } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import UIButton from '../ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';

export default function LandingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <Background>
      <View style={styles.centered}>
        <Text style={styles.brandTitle}>b2b clothing</Text>
        <Text style={styles.tagline}>Cheaper than buying • Cooler than resale • Greener than fast fashion</Text>
        <View style={{ height: 20 }} />
        <UIButton onPress={() => navigation.navigate('Tabs', { screen: 'Rent' })} style={{ width: '50%' }}>Enter the lineup →</UIButton>
        <View style={{ height: 12 }} />
        <UIButton onPress={() => navigation.navigate('Tabs', { screen: 'List' })} style={{ width: '50%' }}>Drop your gear →</UIButton>
        <View style={{ height: 24 }} />
        <Text onPress={() => supabase.auth.signOut()} style={styles.body}>Sign out</Text>
      </View>
    </Background>
  );
}