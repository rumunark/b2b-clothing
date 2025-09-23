import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

export default function Tabs({ tabs, current, onChange }) {
  return (
    <View style={styles.row}>
      {tabs.map((t) => (
        <TouchableOpacity key={t} onPress={() => onChange(t)} style={[styles.tab, current === t && styles.tabActive]}>
          <Text style={[styles.text, current === t && styles.textActive]}>{t}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 2, borderColor: colors.white },
  tabActive: { backgroundColor: colors.white },
  text: { color: colors.white, fontWeight: '700' },
  textActive: { color: colors.navy },
});


