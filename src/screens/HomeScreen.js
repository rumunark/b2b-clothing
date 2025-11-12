import { View, Text, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import UIButton from '../ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [rentalRequests, setRentalRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRentalRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setRentalRequests([]); return; }

      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          sender_id,
          profiles:sender_id (full_name),
          chat,
          created_at,
          updated_at,
          item_id,
          items:item_id (id, title, image_url)
        `)
        .eq('receiver_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      // Filter to show only the most recent request per sender
      const latestRequests = {};
      for (const req of data || []) {
        if (!latestRequests[req.sender_id] || new Date(req.created_at) > new Date(latestRequests[req.sender_id].created_at)) {
          latestRequests[req.sender_id] = req;
        }
      }
      setRentalRequests(Object.values(latestRequests));

    } catch (e) {
      Alert.alert('Error loading rental requests', e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRentalRequests(); }, [loadRentalRequests]);
  useFocusEffect(useCallback(() => { loadRentalRequests(); }, [loadRentalRequests]));

  // Main messages/notifications appear here
  return (
    <Background>
      <View style={[styles.container, { paddingBottom: insets.bottom * 2, flex: 1 }]}>
        {rentalRequests.length > 0 ? (
          <View style={{ flex: 1 }}>
            <Text style={[styles.screenTitle, { marginBottom: 12 }]}>Rental Requests</Text>
            <FlatList
              data={rentalRequests}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.listItemContainer}
                  // TODO: Open ChatScreen
                >
                  {item.items?.image_url ? (
                    <Image source={{ uri: item.items.image_url }} style={styles.listItemImage} />
                  ) : (
                    <View style={styles.listItemImage} />
                  )}
                  <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>{item.items?.title || 'Rental Request'}</Text>
                    <Text style={styles.body}>{item.chat[0].split('\n')[0]}</Text>
                    <Text style={styles.body}>From: {item.profiles.full_name}</Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        ) : (
          <View style={styles.centered}>
            <Text style={styles.brandTitle}>b2b clothing</Text>
            <Text style={styles.tagline}>Cheaper than buying • Cooler than resale • Greener than fast fashion</Text>
            <View style={{ height: 20 }} />
            <UIButton onPress={() => navigation.navigate('Tabs', { screen: 'Rent' })} style={{ width: '50%' }}>Enter the lineup →</UIButton>
            <View style={{ height: 12 }} />
            <UIButton onPress={() => navigation.navigate('Tabs', { screen: 'List' })} style={{ width: '50%' }}>Drop your gear →</UIButton>
            <View style={{ height: 24 }} />
            <Text onPress={() => supabase.auth.signOut()} style={styles.body}>Sign out</Text>
          </View>
        )}
      </View>
    </Background>
  );
}