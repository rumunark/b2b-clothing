import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from './colors';

export function PrimaryButton({ title, onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.primary, style]}>
      <Text style={styles.primaryText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  primary: {
    backgroundColor: colors.yellow,
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  primaryText: {
    color: colors.navy,
    fontWeight: '700',
    textAlign: 'center',
  },
});


