/**
 * Reusable Input UI Component
 * 
 * A styled text input component with consistent appearance across the app.
 * Uses semi-transparent white background to work well over dark backgrounds.
 */

import { TextInput, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

/**
 * Input Component
 * A wrapper around React Native's TextInput with consistent styling
 * 
 * @param {object} props - All TextInput props are passed through
 * @param {object} props.style - Additional styles to apply to the input
 */
export default function Input(props) {
  return <TextInput
      {...props}
      style={[styles.input, props.style]}
      placeholderTextColor={colors.navy}
    />
}

// Input component styles
const styles = StyleSheet.create({
  input: { 
    backgroundColor: colors.white,
    color: colors.black,
    padding: 12, 
    borderRadius: 10, 
    borderWidth: 1, 
    borderColor: colors.navy
  },
});


