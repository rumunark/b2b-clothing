import { View, Text, FlatList, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import { Button } from '../ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState([]);
  const [activeChats, setActiveChats] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load pending requests (for sellers)
  const loadRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('requests')
        .select(`
          id,
          buyer_id,
          start_date,
          nights,
          total_price,
          status,
          items:item_id (id, title, image_url, price_per_day),
          profiles:buyer_id (full_name)
        `)
        .eq('seller_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (e) {
      console.error('Load requests error:', e);
    }
  }, []);

  // Load active chats (for both buyers and sellers)
  const loadActiveChats = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setActiveChats([]); return; }

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

      const latestChats = {};
      for (const chat of data || []) {
        if (!latestChats[chat.sender_id] || new Date(chat.updated_at) > new Date(latestChats[chat.sender_id].updated_at)) {
          latestChats[chat.sender_id] = chat;
        }
      }
      setActiveChats(Object.values(latestChats));
    } catch (e) {
      Alert.alert('Error loading chats', e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
    loadActiveChats();
  }, []);

  useFocusEffect(useCallback(() => {
    loadRequests();
    loadActiveChats();
  }, [loadRequests, loadActiveChats]));

  const renderRequest = ({ item }) => {
    const itemPrice = Number(item.items?.price_per_day || 0);
    const netAmount = (item.total_price * 0.95).toFixed(2);
    
    return (
      <TouchableOpacity
        style={styles.listItemContainer}
        onPress={() => navigation.navigate('Approval', { 
          requestId: item.id,
          buyerId: item.buyer_id,
          buyerName: item.profiles.full_name,
          item: item.items,
          startDate: item.start_date,
          nights: item.nights,
          totalPrice: item.total_price,
          netAmount: netAmount
        })}
      >
        {item.items?.image_url ? (
          <Image source={{ uri: item.items.image_url }} style={styles.listItemImage} />
        ) : (
          <View style={styles.listItemImage} />
        )}
        <View style={styles.listItemContent}>
          <Text style={styles.listItemTitle}>{item.items?.title || 'Rental Request'}</Text>
          <Text style={styles.body}>From: {item.profiles.full_name}</Text>
          <Text style={[styles.body, { fontSize: 12, color: colors.gray500 }]}>
            {item.nights} nights • {item.start_date}
          </Text>
          <Text style={[styles.price, { fontSize: 14, marginTop: 4 }]}>
            You receive: £{netAmount}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderChat = ({ item }) => (
    <TouchableOpacity
      style={styles.listItemContainer}
      onPress={() => navigation.navigate('Chat', {
        chatId: item.id,
        otherUserId: item.sender_id,
        otherUserName: item.profiles.full_name,
        item: item.items,
      })}
    >
      {item.items?.image_url ? (
        <Image source={{ uri: item.items.image_url }} style={styles.listItemImage} />
      ) : (
        <View style={styles.listItemImage} />
      )}
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{item.items?.title || 'Rental Request'}</Text>
        <Text style={styles.body}>From: {item.profiles.full_name}</Text>
        <Text style={[styles.body, { fontSize: 12, color: colors.gray500 }]}>
          {new Date(item.updated_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Background>
      <ScrollView style={[styles.container, { paddingBottom: insets.bottom * 2 }]}>
        
        {/* Pending Requests Section (Seller View) */}
        {requests.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.screenTitle, { marginBottom: 12 }]}>Pending Requests</Text>
            <FlatList
              data={requests}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderRequest}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Active Chats Section */}
        {activeChats.length > 0 ? (
          <View>
            <Text style={[styles.screenTitle, { marginBottom: 12 }]}>Active Chats</Text>
            <FlatList
              data={activeChats}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderChat}
              scrollEnabled={false}
            />
          </View>
        ) : (
          requests.length === 0 && (
            <View style={styles.centered}>
              <Text style={styles.brandTitle}>b2b clothing</Text>
              <Text style={styles.tagline}>Cheaper than buying • Cooler than resale • Greener than fast fashion</Text>
              <View style={{ height: 20 }} />
              <Button onPress={() => navigation.navigate('Tabs', { screen: 'Rent' })} style={{ width: '50%' }}>Enter the lineup →</Button>
              <View style={{ height: 12 }} />
              <Button onPress={() => navigation.navigate('Tabs', { screen: 'List' })} style={{ width: '50%' }}>Drop your gear →</Button>
              <View style={{ height: 24 }} />
              <Text onPress={() => supabase.auth.signOut()} style={styles.body}>Sign out</Text>
            </View>
          )
        )}
      </ScrollView>
    </Background>
  );
}