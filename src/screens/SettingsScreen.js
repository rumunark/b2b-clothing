import { View, Text, StyleSheet } from 'react-native';
import Background from '../components/Background';
import { colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <Background>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <Text style={styles.text}>Coming soon.</Text>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  text: { color: colors.white },
});


