import React, { useState } from 'react';
import { View, Text, Alert, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabaseClient';
import Background from '../components/Background';
import { Button, Label } from '../ui'
import { colors } from '../theme/colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { styles } from '../theme/styles';
import { encryptMessage, getPrivateKey, getPublicKey } from '../lib/encryption';

export default function RentApprovalScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { requestId, buyerId, buyerName, item, startDate, endDate, nights, totalPrice, netAmount } = route.params;
  const insets = useSafeAreaInsets();
  const [processing, setProcessing] = useState(false);

  const handleApprove = async () => {
    setProcessing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error: updateError } = await supabase
        .from('requests')
        .update({ status: 'approved' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      const sellerPrivateKey = await getPrivateKey(user.id);
      const buyerPublicKey = await getPublicKey(buyerId);

      if (!sellerPrivateKey || !buyerPublicKey) {
        throw new Error('Unable to load encryption keys');
      }

      const initialMessage = {
        content: `Rental approved 
                \nStart: ${startDate}\nNights: ${nights}\n\nNext steps: Arrange a pickup time through chat.`,
        sender_id: user.id,
        created_at: new Date().toISOString(),
        read_at: null
      };

      const encryptedMessage = encryptMessage(JSON.stringify(initialMessage), buyerPublicKey, sellerPrivateKey);

      if (!encryptedMessage) throw new Error('Message encryption failed');

      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .insert([{
          sender_id: user.id,
          receiver_id: buyerId,
          item_id: item.id,
          chat: [encryptedMessage],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select('id')
        .single();

      if (chatError) throw chatError;

      // TODO: Send push notification to buyers device
      // TODO: Payment will be taken here from the buyers promise

      Alert.alert('Approved', 'Rental approved! Chat opened.');
      navigation.navigate('Chat', {
        chatId: chatData.id,
        otherUserId: buyerId,
        otherUserName: buyerName,
        item
      });
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to approve rental');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    setProcessing(true);
    try {
      const { error } = await supabase
        .from('requests')
        .update({ status: 'declined' })
        .eq('id', requestId);

      if (error) throw error;

      // TODO: Send push notification to buyer or decline silently?
      
      Alert.alert('Declined', 'Rental request declined.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to decline rental');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Background>
      <ScrollView 
        contentContainerStyle={[styles.containerBackground, { paddingBottom: insets.bottom }]}
      >
        <Text style={styles.screenTitle}>Rental Request</Text>
        <Text style={[styles.body, { fontSize: 18, fontWeight: 'bold' }]}>{item.title}</Text>

        <Label>From</Label>
        <Text style={styles.body}>{buyerName}</Text>

        {/* TODO: Fix date formatting>*/}
        <Label>Dates</Label>
        <Text style={styles.body}>Start: {startDate}</Text>
        <Text style={styles.body}>End: {endDate}</Text>
        <Text style={styles.body}>Nights: {nights}</Text>

        <View style={{ height: 16 }} />

        <View style={styles.row}>
          <Text style={styles.body}>You receive:</Text>
          <Text style={[styles.price, { color: colors.yellow }]}>£{netAmount}</Text>
        </View>

        <View style={{ height: 24 }} />

        <View style={styles.row}>
          <Button onPress={handleDecline} variant="outline" size="lg" disabled={processing} style={{ flex: 1 }}>
            {processing ? 'Processing...' : 'Decline'}
          </Button>
          <Button onPress={handleApprove} variant="gold" size="lg" disabled={processing} style={{ flex: 1 }}>
            {processing ? 'Processing...' : 'Approve'}
          </Button>
        </View>
      </ScrollView>
    </Background>
  );
}