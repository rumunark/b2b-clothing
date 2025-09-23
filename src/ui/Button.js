import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function Button({ children, onPress, variant = 'outline', size = 'lg', style, textStyle }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.base, styles[variant], styles[size], style]} activeOpacity={0.85}>
      <Text style={[styles.text, variant === 'solid' ? styles.textSolid : styles.textOutline, textStyle]}>{children}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  outline: { backgroundColor: 'transparent', borderColor: colors.white },
  solid: { backgroundColor: colors.white, borderColor: colors.white },
  lg: { paddingVertical: 16, paddingHorizontal: 24 },
  md: { paddingVertical: 12, paddingHorizontal: 18 },
  text: { fontWeight: '800' },
  textOutline: { color: colors.white },
  textSolid: { color: colors.navy },
});


