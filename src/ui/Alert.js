/**
 * Reusable Alert UI Component
 * 
 * A modal-style alert component that displays messages to users with
 * customizable title, message, and action buttons. Designed to be
 * flexible and reusable across the application.
 */

import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors } from '../theme/colors';
import UIButton from './Button';

/**
 * Alert Component
 * 
 * @param {boolean} visible - Whether the alert is visible
 * @param {function} onClose - Function called when alert is dismissed
 * @param {string} title - Alert title text
 * @param {string} message - Alert message content
 * @param {string} buttonText - Text for the primary action button (default: "OK")
 * @param {object} style - Additional styles for the alert container
 */
export default function UIAlert({ 
  visible, 
  onClose, 
  title, 
  message, 
  buttonText = "OK", 
  style 
}) {
  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.alertContainer, style]}>
          {title && <Text style={styles.title}>{title}</Text>}
          {message && <Text style={styles.message}>{message}</Text>}
          <View style={styles.buttonContainer}>
            <UIButton variant="solid" onPress={onClose}>
              {buttonText}
            </UIButton>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Alert component styles
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent dark overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  alertContainer: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5, // Android shadow
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    color: colors.gray500,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  buttonContainer: {
    marginTop: 4,
  },
});