/**
 * Reusable Label UI Component
 * 
 * A styled text component used for form labels and other descriptive text.
 * Designed to work well with the Input component and dark backgrounds.
 */

import { Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';
import { styles } from '../theme/styles';

/**
 * Label Component
 * A styled text component for labels and descriptive text
 * 
 * @param {React.ReactNode} children - The text content to display
 * @param {object} style - Additional styles to apply to the label
 */
export default function Label({ children, style }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

// // Label component styles
// const styles = StyleSheet.create({
//   label: { 
//     color: colors.white, // White text for visibility on dark backgrounds
//     fontWeight: '700', // Bold font weight for emphasis
//     marginBottom: 6 // Small margin for spacing from associated inputs
//   },
// });


