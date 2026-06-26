import { View, Text, FlatList, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
  const [sellerRequests, setSellerRequests] = useState([]); // seller: awaiting my approval
  const [buyerPending, setBuyerPending] = useState([]);      // buyer: awaiting seller approval
  const [ongoingChats, setOngoingChats] = useState([]);      // approved / active
  const [completedChats, setCompletedChats] = useState([]);  // completed
  const [loading, setLoading] = useState(false);

  const loadRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Seller side — requests I need to approve/deny
      const { data: sp, error: spErr } = await supabase
        .from('requests')
        .select(`
          id, buyer_id, start_date, end_date, nights, total_price, status,
          items:item_id (id, title, image_url, price_per_day),
          profiles:buyer_id (full_name)
        `)
        .eq('seller_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (spErr) throw spErr;
      setSellerRequests(sp || []);

      // Buyer side — my requests waiting for the seller
      const { data: bp, error: bpErr } = await supabase
        .from('requests')
        .select(`
          id, seller_id, start_date, end_date, nights, total_price, status,
          items:item_id (id, title, image_url, price_per_day)
        `)
        .eq('buyer_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      if (bpErr) throw bpErr;
      setBuyerPending(bp || []);
    } catch (e) {
      console.error('Load requests error:', e);
    }
  }, []);

  const loadActiveChats = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setOngoingChats([]); setCompletedChats([]); return; }

      const { data, error } = await supabase
        .from('chats')
        .select(`
          id, sender_id, receiver_id, chat, created_at, updated_at,
          item_id, request_id,
          items:item_id (id, title, image_url),
          sender:sender_id (full_name),
          receiver:receiver_id (full_name),
          requests:request_id (status, buyer_id, seller_id)
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });
      if (error) throw error;

      // Which items has this user already reviewed?
      const { data: myReviews } = await supabase
        .from('reviews').select('item_id').eq('buyer_id', user.id);
      const reviewedSet = new Set((myReviews || []).map((r) => r.item_id));

      const dedupMap = {};
      for (const chat of data || []) {
        if (chat.sender_id === chat.receiver_id) continue;
        const reqStatus = chat.requests?.status;
        if (reqStatus === 'cancelled' || reqStatus === 'declined') continue;

        const isSender = chat.sender_id === user.id;
        chat.partnerId = isSender ? chat.receiver_id : chat.sender_id;
        chat.partnerName = (isSender ? chat.receiver?.full_name : chat.sender?.full_name) || 'Unknown User';
        chat.status = reqStatus;

        const iAmBuyer = chat.requests?.buyer_id === user.id;
        chat.needsReview = reqStatus === 'completed' && iAmBuyer && !reviewedSet.has(chat.item_id);

        const key = `${chat.partnerId}_${chat.item_id}`;
        if (!dedupMap[key] || new Date(chat.updated_at) > new Date(dedupMap[key].updated_at)) {
          dedupMap[key] = chat;
        }
      }

      const all = Object.values(dedupMap);
      setOngoingChats(all.filter((c) => c.status !== 'completed'));
      setCompletedChats(all.filter((c) => c.status === 'completed'));
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

  // ── Seller: request awaiting approval ──
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
          <Text style={[styles.price, { fontSize: 14, marginTop: 4 }]}>You receive: £{netAmount}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Buyer: request awaiting seller confirmation ──
  const renderPending = ({ item }) => (
    <TouchableOpacity
      style={styles.listItemContainer}
      onPress={() => navigation.navigate('ItemDetail', { id: item.items?.id })}
    >
      {item.items?.image_url
        ? <Image source={{ uri: item.items.image_url }} style={styles.listItemImage} />
        : <View style={styles.listItemImage} />}
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle}>{item.items?.title || 'Rental Request'}</Text>
        <Text style={[styles.body, { color: colors.yellow }]}>Waiting for seller approval…</Text>
        <Text style={[styles.body, { fontSize: 12, color: colors.gray500 }]}>
          {item.nights} nights • {item.start_date}
        </Text>
      </View>
      <Ionicons name="time-outline" size={22} color={colors.gray500} />
    </TouchableOpacity>
  );

  // ── Chat card (ongoing + completed). Shows review button when needed. ──
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

      {item.needsReview && (
        <TouchableOpacity
          style={[styles.iconButtonSolid, { backgroundColor: colors.yellow }]}
          onPress={() => navigation.navigate('Review', {
            requestId: item.request_id,
            itemId: item.item_id,
            sellerId: item.requests?.seller_id,
            itemTitle: item.items?.title,
          })}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="star" size={20} color={colors.navy} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const Section = ({ title, children }) => (
    <View style={{ marginBottom: 20 }}>
      <Text style={[styles.screenTitle, { marginBottom: 12 }]}>{title}</Text>
      {children}
    </View>
  );

  const isEmpty =
    sellerRequests.length === 0 &&
    buyerPending.length === 0 &&
    ongoingChats.length === 0 &&
    completedChats.length === 0;

  return (
    <Background>
      <ScrollView style={[styles.container, { paddingBottom: insets.bottom * 2 }]}>
        {sellerRequests.length > 0 && (
          <Section title="Requests to Approve">
            <FlatList data={sellerRequests} keyExtractor={(i) => String(i.id)} renderItem={renderRequest} scrollEnabled={false} />
          </Section>
        )}

        {buyerPending.length > 0 && (
          <Section title="Pending Confirmation">
            <FlatList data={buyerPending} keyExtractor={(i) => String(i.id)} renderItem={renderPending} scrollEnabled={false} />
          </Section>
        )}

        {ongoingChats.length > 0 && (
          <Section title="Ongoing Rentals">
            <FlatList data={ongoingChats} keyExtractor={(i) => String(i.id)} renderItem={renderChat} scrollEnabled={false} />
          </Section>
        )}

        {completedChats.length > 0 && (
          <Section title="Completed">
            <FlatList data={completedChats} keyExtractor={(i) => String(i.id)} renderItem={renderChat} scrollEnabled={false} />
          </Section>
        )}

        {isEmpty && (
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
        )}
      </ScrollView>
    </Background>
  );
}