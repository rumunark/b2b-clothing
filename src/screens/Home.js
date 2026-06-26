import { View, Text, FlatList, Image, TouchableOpacity, Alert, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabaseClient';
import { colors } from '../theme/colors';
import Background from '../components/Background';
import { Button } from '../ui';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '';

const renderDateLine = (start, end, nights) => {
  const range = [fmtDate(start), fmtDate(end)].filter(Boolean).join(' – ');
  const nightsText = nights ? `${nights} night${nights > 1 ? 's' : ''}` : '';
  return [range, nightsText].filter(Boolean).join(' • ');
};

const local = StyleSheet.create({
  sub:   { color: colors.white, fontSize: 13, marginTop: 2 },
  date:  { color: colors.gray500, fontSize: 12, marginTop: 2 },
  action:{ fontSize: 12, marginTop: 4, fontWeight: '600' },
  badge: {
    minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.yellow,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, marginLeft: 8,
  },
  badgeText:      { color: colors.navy, fontWeight: 'bold', fontSize: 12 },
  sectionHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitleRow:{ flexDirection: 'row', alignItems: 'center' },
});

export default function Home({ navigation }) {
  const insets = useSafeAreaInsets();
  const [sellerRequests, setSellerRequests] = useState([]);
  const [buyerPending, setBuyerPending]     = useState([]);
  const [ongoingChats, setOngoingChats]     = useState([]);
  const [completedChats, setCompletedChats] = useState([]);
  const [collapsed, setCollapsed] = useState({});

  const toggleSection = (id) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  /* ── Data loading ── */

  const loadRequests = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: sp } = await supabase
        .from('requests')
        .select('id, buyer_id, start_date, end_date, nights, total_price, status, items:item_id (id, title, image_url, price_per_day), buyer:buyer_id (full_name)')
        .eq('seller_id', user.id).eq('status', 'pending')
        .order('created_at', { ascending: false });
      setSellerRequests(sp || []);

      const { data: bp } = await supabase
        .from('requests')
        .select('id, seller_id, start_date, end_date, nights, total_price, status, items:item_id (id, title, image_url, price_per_day), seller:seller_id (full_name)')
        .eq('buyer_id', user.id).eq('status', 'pending')
        .order('created_at', { ascending: false });
      setBuyerPending(bp || []);
    } catch (e) { console.error('Load requests error:', e); }
  }, []);

  const loadActiveChats = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setOngoingChats([]); setCompletedChats([]); return; }

      const { data } = await supabase
        .from('chats')
        .select(`
          id, sender_id, receiver_id, chat, created_at, updated_at,
          item_id, request_id,
          items:item_id (id, title, image_url),
          sender:sender_id (full_name),
          receiver:receiver_id (full_name),
          requests:request_id (
            status, buyer_id, seller_id, start_date, end_date, nights,
            seller_handoff_at, buyer_handoff_at, seller_return_at, buyer_return_at
          )
        `)
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('updated_at', { ascending: false });

      const { data: myReviews } = await supabase
        .from('reviews').select('item_id').eq('buyer_id', user.id);
      const reviewedSet = new Set((myReviews || []).map((r) => r.item_id));

      const CLOSED = ['cancelled', 'declined'];
      const dedupMap = {};

      for (const chat of data || []) {
        if (chat.sender_id === chat.receiver_id) continue;
        const r = chat.requests || {};
        const reqStatus = r.status;
        if (CLOSED.includes(reqStatus)) continue;

        const isSender = chat.sender_id === user.id;
        chat.partnerId   = isSender ? chat.receiver_id : chat.sender_id;
        chat.partnerName = (isSender ? chat.receiver?.full_name : chat.sender?.full_name) || 'Unknown User';
        chat.status      = reqStatus;

        const iAmSeller = r.seller_id === user.id;
        const iAmBuyer  = r.buyer_id  === user.id;

        chat.needsReview = reqStatus === 'completed' && iAmBuyer && !reviewedSet.has(chat.item_id);

        const handoffMine = iAmSeller ? r.seller_handoff_at : r.buyer_handoff_at;
        const handoffBoth = r.seller_handoff_at && r.buyer_handoff_at;
        const returnMine  = iAmSeller ? r.seller_return_at  : r.buyer_return_at;
        const returnBoth  = r.seller_return_at  && r.buyer_return_at;

        chat.pendingType    = null;
        if (reqStatus !== 'completed') {
          if (!handoffBoth && !handoffMine) chat.pendingType = iAmSeller ? 'handover' : 'collection';
          else if (handoffBoth && !returnBoth && !returnMine) chat.pendingType = 'return';
        }
        chat.awaitingAction = !!chat.pendingType;

        const key = `${chat.partnerId}_${chat.item_id}`;
        if (!dedupMap[key] || new Date(chat.updated_at) > new Date(dedupMap[key].updated_at)) dedupMap[key] = chat;
      }

      const visible = Object.values(dedupMap).filter((c) => !CLOSED.includes(c.status));
      setOngoingChats(visible.filter((c) => c.status !== 'completed'));
      setCompletedChats(visible.filter((c) => c.status === 'completed'));
    } catch (e) { Alert.alert('Error loading chats', e.message || String(e)); }
  }, []);

  useEffect(() => { loadRequests(); loadActiveChats(); }, []);
  useFocusEffect(useCallback(() => { loadRequests(); loadActiveChats(); }, [loadRequests, loadActiveChats]));

  const handleCancelRequest = (requestId) => {
    Alert.alert('Cancel Request', 'Are you sure you want to cancel this rental request?', [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Request', style: 'destructive', onPress: async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('requests')
            .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: user?.id })
            .eq('id', requestId);
          loadRequests(); loadActiveChats();
        } catch (e) { Alert.alert('Error', e.message || 'Failed to cancel'); }
      }},
    ]);
  };

  /* ── Action metadata (unique icons per action type) ── */

  const chatActionMeta = (item) => {
    switch (item.pendingType) {
      case 'handover':   return { text: 'Confirm handover',   icon: 'swap-horizontal-outline', actionable: true };
      case 'collection': return { text: 'Confirm collection', icon: 'swap-horizontal-outline', actionable: true };
      case 'return':     return { text: 'Confirm return',     icon: 'arrow-undo-outline',      actionable: true };
      default:           return { text: 'Awaiting other party', icon: 'hourglass-outline',      actionable: false };
    }
  };

  const completedActionMeta = (item) =>
    item.needsReview
      ? { text: 'Leave a review', icon: 'star',                  actionable: true }
      : { text: 'Completed',      icon: 'checkmark-done-outline', actionable: false };

  /* ── Unified card (action icon left, extras/trash always rightmost) ── */

  const RentalCard = ({ image, title, user, date, action, actionable, actionIcon, onPress, onActionPress, extraButton }) => (
    <TouchableOpacity style={styles.listItemContainer} onPress={onPress}>
      {image ? <Image source={{ uri: image }} style={styles.listItemImage} /> : <View style={styles.listItemImage} />}
      <View style={styles.listItemContent}>
        <Text style={styles.listItemTitle} numberOfLines={1}>{title}</Text>
        <Text style={local.sub} numberOfLines={1}>{user}</Text>
        <Text style={local.date} numberOfLines={1}>{date || ' '}</Text>
        <Text style={[local.action, { color: actionable ? colors.yellow : colors.gray500 }]} numberOfLines={1}>{action}</Text>
      </View>
      <View style={styles.listItemActions}>
        {actionIcon ? (
          onActionPress ? (
            <TouchableOpacity onPress={onActionPress} style={styles.iconButtonTransparent}>
              <Ionicons name={actionIcon} size={18} color={actionable ? colors.yellow : colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={styles.iconButtonTransparent}>
              <Ionicons name={actionIcon} size={18} color={actionable ? colors.yellow : colors.white} />
            </View>
          )
        ) : null}
        {extraButton}
      </View>
    </TouchableOpacity>
  );

  /* ── Per-section renderers ── */

  const renderRequest = ({ item }) => {
    const netAmount = (item.total_price * 0.95).toFixed(2);
    return (
      <RentalCard
        image={item.items?.image_url}
        title={item.items?.title || 'Rental Request'}
        user={`With: ${item.buyer?.full_name || 'Unknown User'}`}
        date={renderDateLine(item.start_date, item.end_date, item.nights)}
        action="Tap to approve"
        actionable
        actionIcon="time-outline"
        onPress={() => navigation.navigate('Approval', {
          requestId: item.id, buyerId: item.buyer_id,
          buyerName: item.buyer?.full_name || 'Unknown User',
          item: item.items, startDate: item.start_date, endDate: item.end_date,
          nights: item.nights, totalPrice: item.total_price, netAmount,
        })}
      />
    );
  };

  const renderPending = ({ item }) => (
    <RentalCard
      image={item.items?.image_url}
      title={item.items?.title || 'Rental Request'}
      user={`With: ${item.seller?.full_name || 'Unknown User'}`}
      date={renderDateLine(item.start_date, item.end_date, item.nights)}
      action="Awaiting seller approval"
      actionable={false}
      actionIcon={null}
      onPress={() => navigation.navigate('ItemDetail', { id: item.items?.id })}
      extraButton={
        <TouchableOpacity onPress={() => handleCancelRequest(item.id)} style={styles.iconButtonTransparent}>
          <Ionicons name="trash" size={18} color={colors.white} />
        </TouchableOpacity>
      }
    />
  );

  const renderChat = ({ item }) => {
    const r = item.requests || {};
    const meta = item.status === 'completed' ? completedActionMeta(item) : chatActionMeta(item);
    return (
      <RentalCard
        image={item.items?.image_url}
        title={item.items?.title || 'Rental'}
        user={`With: ${item.partnerName}`}
        date={renderDateLine(r.start_date, r.end_date, r.nights)}
        action={meta.text}
        actionable={meta.actionable}
        actionIcon={meta.icon}
        onActionPress={item.needsReview ? () => navigation.navigate('Review', {
          requestId: item.request_id, itemId: item.item_id,
          sellerId: r.seller_id, itemTitle: item.items?.title,
        }) : undefined}
        onPress={() => navigation.navigate('Chat', {
          chatId: item.id, otherUserId: item.partnerId,
          otherUserName: item.partnerName, item: item.items, requestId: item.request_id,
        })}
      />
    );
  };

  /* ── Collapsible section with yellow action badge ── */

  const Section = ({ id, title, actionCount, children }) => {
    const isCollapsed = !!collapsed[id];
    return (
      <View style={{ marginBottom: 20 }}>
        <TouchableOpacity onPress={() => toggleSection(id)} style={local.sectionHeader}>
          <View style={local.sectionTitleRow}>
            <Text style={styles.screenTitle}>{title}</Text>
            {actionCount > 0 && (
              <View style={local.badge}><Text style={local.badgeText}>{actionCount}</Text></View>
            )}
          </View>
          <Ionicons name={isCollapsed ? 'chevron-down' : 'chevron-up'} size={24} color={colors.white} />
        </TouchableOpacity>
        {!isCollapsed && children}
      </View>
    );
  };

  const ongoingActionCount = ongoingChats.filter((c) => c.awaitingAction).length;
  const reviewCount = completedChats.filter((c) => c.needsReview).length;

  const isEmpty = sellerRequests.length === 0 && buyerPending.length === 0 &&
    ongoingChats.length === 0 && completedChats.length === 0;

  return (
    <Background>
      <ScrollView style={[styles.container, { paddingBottom: insets.bottom * 2 }]}>
        {sellerRequests.length > 0 && (
          <Section id="approve" title="Requests to Approve" actionCount={sellerRequests.length}>
            <FlatList data={sellerRequests} keyExtractor={(i) => String(i.id)} renderItem={renderRequest} scrollEnabled={false} />
          </Section>
        )}
        {buyerPending.length > 0 && (
          <Section id="pending" title="Pending Confirmation" actionCount={0}>
            <FlatList data={buyerPending} keyExtractor={(i) => String(i.id)} renderItem={renderPending} scrollEnabled={false} />
          </Section>
        )}
        {ongoingChats.length > 0 && (
          <Section id="ongoing" title="Ongoing Rentals" actionCount={ongoingActionCount}>
            <FlatList data={ongoingChats} keyExtractor={(i) => String(i.id)} renderItem={renderChat} scrollEnabled={false} />
          </Section>
        )}
        {completedChats.length > 0 && (
          <Section id="completed" title="Completed" actionCount={reviewCount}>
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