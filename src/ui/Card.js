/**
 * Reusable Card UI Component
 * 
 * A container component that provides a consistent card-like appearance
 * with rounded corners, padding, and semi-transparent background.
 * Ideal for grouping related content and creating visual hierarchy.
 */

import { View, StyleSheet } from 'react-native';

/**
 * Card Component
 * A styled container with card-like appearance
 * 
 * @param {React.ReactNode} children - The content to display inside the card
 * @param {object} style - Additional styles to apply to the card container
 */
export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Card component styles
const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.92)', // Semi-transparent white background
    borderRadius: 14, // Rounded corners for modern appearance
    padding: 16, // Internal spacing for content
    borderWidth: 2, // Subtle border
    borderColor: 'rgba(255,255,255,0.9)' // Light border color
  },
});


