import { useState, useEffect } from 'react';
import { View, Text, Modal, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import { styles } from '../theme/styles';

/**
 * Enum Dropdown Component
 * 
 * A reusable dropdown component that displays a list of values for a given enum type from Supabase.
 * 
 * @param {string} title - The title to be displayed at the top of the modal.
 * @param {string} enumType - The name of the enum type to fetch from the database.
 * @param {string} value - The currently selected value for the dropdown.
 * @param {function} onValue- The callback function to be executed when a new value is selected.
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
      <View style={[styles.input, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, style]}>
        <ActivityIndicator size="small" color={colors.navy} />
        <Text style={{ color: colors.navy }}>Loading options...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.input, { justifyContent: 'center' }, style]}>
        <Text style={styles.error}>Unable to load options</Text>
      </View>
    );
  }

  return (
    <>
      <TouchableOpacity 
        style={[styles.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, style]} 
        onPress={() => setIsOpen(true)}
      >
        <Text style={[styles.bodyText, { color: colors.navy }, !value && { color: colors.gray500 }]}>
          {value || placeholder}
        </Text>
        <Text style={{ color: colors.navy, fontSize: 12 }}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={[styles.centered, { backgroundColor: 'rgba(0, 0, 0, 0.5)'}]}>
          <View style={{ backgroundColor: colors.white, borderRadius: 12, width: '100%', maxWidth: 400, maxHeight: '80%' }}>
            <View style={[styles.row, { justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderBottomColor: colors.gray500 }]}>
              <Text style={styles.itemTitle}>{title}</Text>
              <TouchableOpacity 
                onPress={() => setIsOpen(false)}
                style={{ width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}
              >
                <Text style={{ fontSize: 16, color: colors.gray500 }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={{ maxHeight: 300 }}>
              {values.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    { padding: 16, borderTopWidth: 1, borderTopColor: colors.gray100 },
                    value === item && { backgroundColor: colors.yellow }
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={[
                    styles.bodyText,
                    value === item && { fontWeight: '900' }
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