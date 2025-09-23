import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { colors } from '../theme/colors';

export default function OutlineCtaButton({ title, onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, style]} activeOpacity={0.8}>
      <View style={styles.row}>
        <Text style={styles.text}>{title}</Text>
        <Text style={styles.arrow}> →</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderColor: colors.white,
    borderWidth: 3,
    backgroundColor: 'transparent',
    paddingVertical: 18,
    paddingHorizontal: 28,
    borderRadius: 14,
    minWidth: 260,
    alignItems: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  text: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 18,
  },
  arrow: { color: colors.white, fontSize: 18, fontWeight: '800' },
});


