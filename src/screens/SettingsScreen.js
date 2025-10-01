import { View, Text, StyleSheet } from 'react-native';
import Background from '../components/Background';
import { colors } from '../theme/colors';

export default function SettingsScreen() {
  return (
    <Background>
      <View style={styles.container}>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.text}>Coming soon.</Text>
      </View>
    </Background>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { color: colors.white, fontSize: 20, fontWeight: '800', marginBottom: 12 },
  text: { color: colors.white },
});


