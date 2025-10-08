
import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabaseClient';
/**
   * Enum Dropdown Component
   * 
   * A dropdown component that displays a list of values for a given enum.
   * 
   * @param {string} location - The name of the enum to display
   * @param {string} chooseLocation - The current value of the dropdown
   */
export default function Dropdown({ value, onValueChange, style }) {
    const [isOpen, setIsOpen] = useState(false);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
      fetchCities();
    }, []);

    const fetchCities = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase.rpc('get_types', { enum_type: 'location' });
        console.log(data);
        if (error) throw error;
        
        // Data comes back as array of objects: [{ city_value: 'London' }, ...]
        const cityValues = data;
        setCities(cityValues);
      } catch (err) {
        console.error('Error fetching cities:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    const handleSelect = (selectedCity) => {
      onValueChange(selectedCity);
      setIsOpen(false);
    };
  
    if (loading) {
      return (
        <View style={[styles.dropdown, style]}>
          <ActivityIndicator size="small" color={colors.white} />
          <Text style={styles.dropdownText}>Loading cities...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={[styles.dropdown, style]}>
          <Text style={styles.errorText}>Unable to load cities</Text>
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
            {value || 'Select a city'}
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
                <Text style={styles.modalTitle}>Select City</Text>
                <TouchableOpacity 
                  style={styles.closeButton}
                  onPress={() => setIsOpen(false)}
                >
                  <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.cityList}>
                {cities.map((city, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.cityItem,
                      value === city && styles.selectedCityItem
                    ]}
                    onPress={() => handleSelect(city)}
                  >
                    <Text style={[
                      styles.cityText,
                      value === city && styles.selectedCityText
                    ]}>
                      {city}
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
  cityList: {
    maxHeight: 300,
  },
  cityItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  selectedCityItem: {
    backgroundColor: colors.yellow + '20',
  },
  cityText: {
    fontSize: 16,
    color: colors.navy,
  },
  selectedCityText: {
    fontWeight: '600',
    color: colors.navy,
  },
});


