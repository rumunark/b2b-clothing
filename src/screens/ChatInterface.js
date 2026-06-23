import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  Platform, ActivityIndicator, Alert, StyleSheet,
  Keyboard, Animated,
} from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { decryptMessage, encryptMessage } from '../lib/encryption';
import { getPrivateKey, getPublicKey } from '../lib/keyManager';
import { styles as themeStyles } from '../theme/styles';
import Background from '../components/Background';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';

const chatStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.navy,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerContent: { flex: 1, marginLeft: 16 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: colors.white },
  headerSubtitle: { fontSize: 14, color: colors.gray500, marginTop: 2 },
  messageContainer: { maxWidth: '80%', padding: 12, borderRadius: 16, marginVertical: 4 },
  sentMessage: { backgroundColor: colors.yellow, alignSelf: 'flex-end', borderBottomRightRadius: 4 },
  receivedMessage: { backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', borderBottomLeftRadius: 4 },
  sentText: { color: colors.black, fontSize: 16 },
  receivedText: { color: colors.white, fontSize: 16 },
  timestamp: { fontSize: 12, color: colors.gray500, marginTop: 4, alignSelf: 'flex-end' },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.navy,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 12,
    borderRadius: 20,
    color: colors.white,
    marginRight: 8,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: colors.yellow,
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  sendButtonText: { color: colors.black, fontWeight: 'bold', fontSize: 18 },
});

export default function ChatInterface({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { chatId, otherUserId, otherUserName, item, requestId } = route.params;

  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const flatListRef = useRef(null);

  // ── Animated spacer replaces KeyboardAvoidingView ──────
  const keyboardPadding = useRef(new Animated.Value(insets.bottom)).current;

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = Keyboard.addListener(showEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: e.endCoordinates.height,
        duration: Platform.OS === 'ios' ? (e.duration || 250) : 150,
        useNativeDriver: false,
      }).start();
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    const onHide = Keyboard.addListener(hideEvent, (e) => {
      Animated.timing(keyboardPadding, {
        toValue: insets.bottom,
        duration: Platform.OS === 'ios' ? (e.duration || 250) : 150,
        useNativeDriver: false,
      }).start();
    });

    return () => { onShow.remove(); onHide.remove(); };
  }, [insets.bottom]);

  // ── Load messages ──────────────────────────────────────
  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigation.goBack(); return; }
      setCurrentUserId(user.id);

      const privateKey = await getPrivateKey(user.id);
      const otherPublicKey = await getPublicKey(otherUserId);
      if (!privateKey) {
        Alert.alert('Encryption Error', 'Please log out and back in to restore your keys.');
        setLoading(false);
        return;
      }
      if (!otherPublicKey) {
        Alert.alert('Encryption Error', `${otherUserName} hasn't set up encryption yet.`);
        setLoading(false);
        return;
      }

      const { data: chatData, error } = await supabase
        .from('chats').select('chat').eq('id', chatId).single();
      if (error) throw error;

      const decrypted = [];
      for (const blob of chatData?.chat || []) {
        const plain = decryptMessage(blob, otherPublicKey, privateKey);
        if (plain) {
          try {
            const msg = JSON.parse(plain);
            decrypted.push({ ...msg, id: `${msg.created_at}_${Math.random()}` });
          } catch (_) {}
        }
      }

      decrypted.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      setMessages(decrypted);
    } catch (e) {
      console.error('Load messages error:', e);
      Alert.alert('Error', 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  }, [chatId, otherUserId, navigation]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  // ── Send message ───────────────────────────────────────
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending) return;
    try {
      setSending(true);
      const privateKey = await getPrivateKey(currentUserId);
      const otherPublicKey = await getPublicKey(otherUserId);

      const payload = {
        id: Date.now().toString(),
        content: newMessage.trim(),
        sender_id: currentUserId,
        created_at: new Date().toISOString(),
        read_at: null,
      };

      const encrypted = encryptMessage(JSON.stringify(payload), otherPublicKey, privateKey);
      if (!encrypted) throw new Error('Encryption failed');

      const { data: current } = await supabase
        .from('chats').select('chat').eq('id', chatId).single();

      const { error } = await supabase
        .from('chats')
        .update({ chat: [...(current?.chat || []), encrypted], updated_at: new Date().toISOString() })
        .eq('id', chatId);
      if (error) throw error;

      setMessages((prev) => [...prev, payload]);
      setNewMessage('');
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    } catch (e) {
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [newMessage, chatId, currentUserId, otherUserId, sending]);

  // ── Cancel rental ──────────────────────────────────────
  const handleCancelRental = () => {
    Alert.alert(
      'Cancel Rental',
      'This will cancel the rental and delete this chat.',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Rental',
          style: 'destructive',
          onPress: async () => {
            try {
              if (requestId) {
                await supabase
                  .from('requests')
                  .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), cancelled_by: currentUserId })
                  .eq('id', requestId);
              }
              await supabase.from('chats').delete().eq('id', chatId);
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e.message || 'Failed to cancel');
            }
          },
        },
      ]
    );
  };

  // ── Render message ─────────────────────────────────────
  const renderMessage = useCallback(({ item: msg }) => {
    const isSent = msg.sender_id === currentUserId;
    return (
      <View style={[chatStyles.messageContainer, isSent ? chatStyles.sentMessage : chatStyles.receivedMessage]}>
        <Text style={isSent ? chatStyles.sentText : chatStyles.receivedText}>{msg.content}</Text>
        <Text style={chatStyles.timestamp}>
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }, [currentUserId]);

  if (loading) {
    return (
      <Background>
        <View style={[themeStyles.centered, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={colors.yellow} />
          <Text style={[themeStyles.body, { marginTop: 16 }]}>Loading secure chat...</Text>
        </View>
      </Background>
    );
  }

  // ── Layout: Header → FlatList → Input → Animated spacer ─
  return (
    <Background>
      <View style={{ flex: 1 }}>
        {/* Header */}
        <View style={[chatStyles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ color: colors.white, fontSize: 24 }}>←</Text>
          </TouchableOpacity>
          <View style={chatStyles.headerContent}>
            <Text style={chatStyles.headerTitle}>{item?.title || 'Rental Request'}</Text>
            <Text style={chatStyles.headerSubtitle}>Chat with {otherUserName}</Text>
          </View>
          <TouchableOpacity onPress={handleCancelRental} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ color: colors.gray500, fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(m) => m.id}
          renderItem={renderMessage}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, flexGrow: 1, justifyContent: 'flex-end' }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          keyboardShouldPersistTaps="handled"
        />

        {/* Input bar */}
        <View style={chatStyles.inputContainer}>
          <TextInput
            style={chatStyles.input}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a secure message..."
            placeholderTextColor={colors.gray500}
            multiline
            maxLength={2000}
            editable={!sending}
          />
          <TouchableOpacity
            style={[chatStyles.sendButton, { opacity: newMessage.trim() && !sending ? 1 : 0.4 }]}
            onPress={sendMessage}
            disabled={!newMessage.trim() || sending}
          >
            <Text style={chatStyles.sendButtonText}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Spacer: grows to keyboard height, shrinks to insets.bottom.
            This is what actually pushes the input above the keyboard —
            no KeyboardAvoidingView needed. */}
        <Animated.View style={{ height: keyboardPadding, backgroundColor: colors.navy }} />
      </View>
    </Background>
  );
}