import { View, Text, FlatList, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import { Button } from '../ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

export default function Home({ navigation }) {
  const insets = useSafeAreaInsets();
  const [requests, setRequests] = useState([]);
  const [activeChats, setActiveChats] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('requests')
        .select(`
          id, buyer_id, start_date, end_date, nights, total_price, status,
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

  const loadActiveChats = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setActiveChats([]); return; }

      const { data, error } = await supabase
        .from('chats')
        .select(`
          id, sender_id, receiver_id, chat, created_at, updated_at,
          item_id, request_id,
          items:item_id (id, title, image_url),
          sender:sender_id (full_name),
          receiver:receiver_id (full_name)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const dedupMap = {};

      for (const chat of data || []) {
        // Skip self-chats
        if (chat.sender_id === chat.receiver_id) continue;
        // Skip chats whose request was cancelled or declined
        const reqStatus = chat.requests?.status;
        if (reqStatus === 'cancelled' || reqStatus === 'declined') continue;
        const isSender = chat.sender_id === user.id;
        chat.partnerId = isSender ? chat.receiver_id : chat.sender_id;
        chat.partnerName = (isSender
          ? chat.receiver?.full_name
          : chat.sender?.full_name) || 'Unknown User';
        const key = `${chat.partnerId}_${chat.item_id}`;
        if (!dedupMap[key] || new Date(chat.updated_at) > new Date(dedupMap[key].updated_at)) {
          dedupMap[key] = chat;
        }
      }

      setActiveChats(Object.values(dedupMap));
    } catch (e) {
      Alert.alert('Error loading chats', e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRequests(); loadActiveChats(); }, []);

  useFocusEffect(useCallback(() => {
    loadRequests();
    loadActiveChats();
  }, [loadRequests, loadActiveChats]));

  const renderRequest = ({ item }) => {
    const netAmount = (item.total_price * 0.95).toFixed(2);
    const buyerName = item.profiles?.full_name || 'Unknown User';

    return (
      <TouchableOpacity
        style={styles.listItemContainer}
        onPress={() => navigation.navigate('Approval', {
          requestId: item.id,
          buyerId: item.buyer_id,
          buyerName,
          item: item.items,
          startDate: item.start_date,
          endDate: item.end_date,
          nights: item.nights,
          totalPrice: item.total_price,
          netAmount,
        })}
      >
        {item.items?.image_url
          ? <Image source={{ uri: item.items.image_url }} style={styles.listItemImage} />
          : <View style={styles.listItemImage} />}
        <View style={styles.listItemContent}>
          <Text style={styles.listItemTitle}>{item.items?.title || 'Rental Request'}</Text>
          <Text style={styles.body}>From: {buyerName}</Text>
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
        otherUserId: item.partnerId,
        otherUserName: item.partnerName,
        item: item.items,
        requestId: item.request_id,
      })}
    >
      {item.items?.image_url
        ? <Image source={{ uri: item.items.image_url }} style={styles.listItemImage} />
        : <View style={styles.listItemImage} />}
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{item.items?.title || 'Rental Chat'}</Text>
        <Text style={styles.body}>With: {item.partnerName}</Text>
        <Text style={[styles.body, { fontSize: 12, color: colors.gray500 }]}>
          {new Date(item.updated_at).toLocaleDateString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Background>
      <ScrollView style={[styles.container, { paddingBottom: insets.bottom * 2 }]}>
        {requests.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <Text style={[styles.screenTitle, { marginBottom: 12 }]}>Pending Requests</Text>
            <FlatList data={requests} keyExtractor={(i) => String(i.id)} renderItem={renderRequest} scrollEnabled={false} />
          </View>
        )}

        {activeChats.length > 0 ? (
          <View>
            <Text style={[styles.screenTitle, { marginBottom: 12 }]}>Active Chats</Text>
            <FlatList data={activeChats} keyExtractor={(i) => String(i.id)} renderItem={renderChat} scrollEnabled={false} />
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