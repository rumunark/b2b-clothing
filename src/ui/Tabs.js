/**
 * Reusable Tabs UI Component
 * 
 * A horizontal tab navigation component that allows users to switch between
 * different views or categories. Features active/inactive states with
 * visual feedback.
 */

import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

/**
 * Tabs Component
 * Creates a horizontal row of selectable tabs
 * 
 * @param {string[]} tabs - Array of tab labels to display
 * @param {string} current - The currently active tab
 * @param {function} onChange - Function called when a tab is selected, receives the tab value
 */
export default function Tabs({ tabs, current, onChange }) {
  return (
    <View style={styles.row}>
      {tabs.map((t) => (
        <TouchableOpacity 
          key={t} 
          onPress={() => onChange(t)} 
          style={[styles.tab, current === t && styles.tabActive]}
        >
          <Text style={[styles.text, current === t && styles.textActive]}>
            {t}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// Tabs component styles
const styles = StyleSheet.create({
  row: { 
    flexDirection: 'row', 
    gap: 8 // Space between tabs
  },
  tab: { 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 10, 
    borderWidth: 2, 
    borderColor: colors.white // Inactive tab border
  },
  tabActive: { 
    backgroundColor: colors.white // Active tab background
  },
  text: { 
    color: colors.white, // Inactive tab text color
    fontWeight: '700' 
  },
  textActive: { 
    color: colors.navy // Active tab text color
  },
});


