/**
 * Reusable Button UI Component
 * 
 * A flexible button component that supports different variants (outline/solid)
 * and sizes (lg/md) while maintaining consistent styling across the app.
 */

import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors } from '../theme/colors';

/**
 * Button Component
 * 
 * @param {React.ReactNode} children - The content to display inside the button
 * @param {function} onPress - Function to call when button is pressed
 * @param {string} variant - Button style variant: 'outline' or 'solid' (default: 'outline')
 * @param {string} size - Button size: 'lg' or 'md' (default: 'lg')
 * @param {object} style - Additional styles to apply to the button container
 * @param {object} textStyle - Additional styles to apply to the button text
 */
export default function Button({ children, onPress, variant = 'outline', size = 'lg', style, textStyle }) {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[styles.base, styles[variant], styles[size], style]} 
      activeOpacity={0.85}
    >
      <Text style={[styles.text, variant === 'solid' ? styles.textSolid : styles.textOutline, textStyle]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

// Button component styles
const styles = StyleSheet.create({
  // Base styles applied to all buttons
  base: { 
    borderRadius: 12, 
    borderWidth: 2, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  
  // Variant styles
  outline: { 
    backgroundColor: 'transparent', 
    borderColor: colors.white 
  },
  solid: { 
    backgroundColor: colors.white, 
    borderColor: colors.white 
  },
  
  // Size styles
  lg: { 
    paddingVertical: 16, 
    paddingHorizontal: 24 
  },
  md: { 
    paddingVertical: 12, 
    paddingHorizontal: 18 
  },
  
  // Text styles
  text: { 
    fontWeight: '800' 
  },
  textOutline: { 
    color: colors.white 
  },
  textSolid: { 
    color: colors.navy 
  },
});


