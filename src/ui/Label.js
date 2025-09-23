import { Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function Label({ children, style }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: { color: colors.white, fontWeight: '700', marginBottom: 6 },
});


