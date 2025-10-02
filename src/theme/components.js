/**
 * Reusable Component Definitions
 * 
 * Contains styled components that can be reused across the application
 * to maintain consistent UI patterns and reduce code duplication.
 */

import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from './colors';

/**
 * Primary Button Component
 * A styled button using the app's primary color scheme (yellow background, navy text)
 * 
 * @param {string} title - The text to display on the button
 * @param {function} onPress - Function to call when button is pressed
 * @param {object} style - Additional styles to apply to the button
 */
export function PrimaryButton({ title, onPress, style }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.primary, style]}>
      <Text style={styles.primaryText}>{title}</Text>
    </TouchableOpacity>
  );
}

// Styles for the PrimaryButton component
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


