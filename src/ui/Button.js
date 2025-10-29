/**
 * Reusable Button UI Component
 * 
 * A flexible button component that supports different variants (outline/solid)
 * and sizes (lg/md) while maintaining consistent styling across the app.
 * Button variant styles are defined locally, but use global styles for text.
 */

import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { fonts } from '../theme/fonts';

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
export default function Button({ children, onPress, variant = 'outline', size = 'lg', style, textStyle, icon = null, iconColor = null }) {
  return (
    <TouchableOpacity 
      onPress={onPress} 
      style={[buttonVariants.base, buttonVariants[variant], buttonVariants[size], style]} 
      activeOpacity={0.85}
    >
      {icon && <Ionicons name={icon} size={24} color={iconColor ? iconColor : colors.navy} marginRight={8} />}
      <Text style={[buttonVariants.text, variant === 'solid' || variant === 'gold' ? buttonVariants.textSolid : buttonVariants.textOutline, textStyle]}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}

// Button component styles
const buttonVariants = StyleSheet.create({
  // Base styles applied to all buttons
  base: { 
    maxWidth: "100%",
    // minWidth: "48%",
    borderRadius: 8, 
    borderWidth: 2, 
    flexDirection: 'row',
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
  gold: {
    backgroundColor: colors.yellow,
    borderColor: colors.yellow
  },
  
  // Size styles
  lg: { 
    paddingVertical: 16, 
    paddingHorizontal: 24 
  },
  md: { 
    paddingVertical: 8, 
    paddingHorizontal: 12
  },
  sm: { 
    paddingVertical: 4, 
    paddingHorizontal: 8
  },
  
  // Text styles
  text: { 
    fontWeight: fonts.weight.thick,
  },
  textOutline: { 
    color: colors.white 
  },
  textSolid: { 
    color: colors.navy 
  },
});


