import { useState, useEffect } from 'react';
import { colors } from '../theme/colors';
import { View, Text, StyleSheet, Modal, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabaseClient';

/**
 * Enum Dropdown Component
 * 
 * A reusable dropdown component that displays a list of values for a given enum type from Supabase.
 * 
 * @param {string} title - The title to be displayed at the top of the modal.
 * @param {string} enumType - The name of the enum type to fetch from the database.
 * @param {string} value - The currently selected value for the dropdown.
 * @param {function} onValueChange - The callback function to be executed when a new value is selected.
 * @param {object} style - Optional custom styles for the dropdown container.
 * @param {string} placeholder - Optional placeholder text.
 */
export default function Dropdown({ title, enumType, value, onValueChange, style, placeholder = 'Select an option' }) {
    const [isOpen, setIsOpen] = useState(false);
    const [values, setValues] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      if (enumType) {
        fetchEnumValues();
      } else {
        setError("Enum type is not provided.");
        setLoading(false);
      }
    }, [enumType]);

    const fetchEnumValues = async () => {
      try {
        setLoading(true);
        setError(null);
        const { data, error } = await supabase.rpc('get_types', { enum_type: enumType });
        if (error) throw error;
        setValues(data);
      } catch (err) {
        console.error('Error fetching enum data:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const handleSelect = (selectedValue) => {
      onValueChange(selectedValue);
      setIsOpen(false);
    };
  
    if (loading) {
      return (
        <View style={[styles.dropdown, style]}>
          <ActivityIndicator size="small" color={colors.white} />
          <Text style={styles.dropdownText}>Loading options...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.dropdown, style]}>
          <Text style={styles.errorText}>Unable to load options</Text>
        </View>
      );
    }

    return (
      <>
        <TouchableOpacity 
          style={[styles.dropdown, style]} 
          onPress={() => setIsOpen(true)}
        >
          <Text style={[styles.dropdownText, !value && styles.placeholderText]}>
            {value || placeholder}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>

        <Modal
          visible={isOpen}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsOpen(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setIsOpen(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.itemList}>
                {values.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.item,
                      value === item && styles.selectedItem
                    ]}
                    onPress={() => handleSelect(item)}
                  >
                    <Text style={[
                      styles.itemText,
                      value === item && styles.selectedItemText
                    ]}>
                      {item}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </>
    );
  }

const styles = StyleSheet.create({
  dropdown: {
    backgroundColor: colors.white,
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dropdownText: {
    color: colors.navy,
    fontSize: 16,
  },
  placeholderText: {
    color: colors.gray500,
  },
  dropdownArrow: {
    color: colors.navy,
    fontSize: 12,
  },
  errorText: {
    color: colors.yellow,
    textAlign: 'center',
    padding: 12,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.navy,
  },
  closeButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: colors.gray500,
  },
  itemList: {
    maxHeight: 300,
  },
  item: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray100,
  },
  selectedItem: {
    backgroundColor: colors.yellow + '20',
  },
  itemText: {
    fontSize: 16,
    color: colors.navy,
  },
  selectedItemText: {
    fontWeight: '600',
    color: colors.navy,
  },
});