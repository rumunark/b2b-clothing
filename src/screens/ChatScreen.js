import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { supabase } from '../lib/supabaseClient';
import { decryptMessage, encryptMessage, getPrivateKey, getPublicKey } from '../lib/encryption';
import { styles as themeStyles } from '../theme/styles';
import Background from '../components/Background';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { colors } from '../theme/colors';

//TODO: Port to main styles file
const chatStyles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: colors.navy,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerContent: {
    flex: 1,
    marginLeft: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.gray500,
    marginTop: 2,
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
  },
  sentMessage: {
    backgroundColor: colors.yellow,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  receivedMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  sentText: {
    color: colors.black,
    fontSize: 16,
  },
  receivedText: {
    color: colors.white,
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: colors.gray500,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.navy,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 12,
    borderRadius: 20,
    color: colors.white,
    marginRight: 8,
    maxHeight: 80,
  },
  sendButton: {
    backgroundColor: colors.yellow,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    color: colors.black,
    fontWeight: 'bold',
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: colors.gray500,
    fontSize: 16,
    textAlign: 'center',
  },
});

export default function ChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { chatId, otherUserId, otherUserName, item } = route.params;
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const flatListRef = useRef(null);

  const loadMessages = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigation.goBack(); return; }
      setCurrentUserId(user.id);

      const privateKey = await getPrivateKey(user.id);
      const otherPublicKey = await getPublicKey(otherUserId);
      
      if (!privateKey || !otherPublicKey) {
        Alert.alert('Encryption Error', 'Could not load encryption keys');
        setLoading(false);
        return;
      }

      const { data: chatData, error: chatError } = await supabase
        .from('chats')
        .select('chat, sender_id, receiver_id')
        .eq('id', chatId)
        .single();

      if (chatError) throw chatError;

      const decryptedMessages = [];
      const encryptedMessages = chatData?.chat || [];
      
      for (const encryptedMsg of encryptedMessages) {
        // DECRYPT WITH BOTH POSSIBLE KEY COMBINATIONS
        let decryptedContent = null;
        
        // Try as if current user is recipient
        decryptedContent = decryptMessage(encryptedMsg, otherPublicKey, privateKey);
        
        // If that fails, try as if current user is sender (for self-testing)
        if (!decryptedContent) {
          const myPublicKey = await getPublicKey(user.id);
          decryptedContent = decryptMessage(encryptedMsg, myPublicKey, privateKey);
        }
        
        if (decryptedContent) {
          try {
            const messageObj = JSON.parse(decryptedContent);
            // TRACK SENDER via embedded sender_id in payload
            decryptedMessages.push({
              ...messageObj,
              id: `${messageObj.created_at}-${Math.random()}`,
            });
          } catch (e) {
            console.error('Failed to parse message:', e);
          }
        }
      }

      // SORT: newest at bottom (standard chat behavior)
      decryptedMessages.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      setMessages(decryptedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      Alert.alert('Error', 'Failed to load messages: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [chatId, otherUserId, navigation]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  useFocusEffect(useCallback(() => { loadMessages(); }, [loadMessages]));

  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || sending) return;

    try {
      setSending(true);

      const privateKey = await getPrivateKey(currentUserId);
      const otherPublicKey = await getPublicKey(otherUserId);
      const myPublicKey = await getPublicKey(currentUserId);

      const messagePayload = {
        content: newMessage.trim(),
        sender_id: currentUserId,
        created_at: new Date().toISOString(),
        read_at: null
      };

      const encryptedContent = encryptMessage(
        JSON.stringify(messagePayload),
        otherPublicKey,
        privateKey
      );

      if (!encryptedContent) throw new Error('Encryption failed');

      const { data: currentChat } = await supabase
        .from('chats')
        .select('chat')
        .eq('id', chatId)
        .single();

      const updatedChat = [...(currentChat?.chat || []), encryptedContent];

      const { error: updateError } = await supabase
        .from('chats')
        .update({ 
          chat: updatedChat,
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId);

      if (updateError) throw updateError;

      setMessages(prev => [...prev, messagePayload]);
      setNewMessage('');
      
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message: ' + error.message);
    } finally {
      setSending(false);
    }
  }, [newMessage, chatId, currentUserId, otherUserId, sending]);

  const renderMessage = useCallback(({ item }) => {
    const isSent = item.sender_id === currentUserId;
    const messageStyle = isSent ? chatStyles.sentMessage : chatStyles.receivedMessage;
    const textStyle = isSent ? chatStyles.sentText : chatStyles.receivedText;

    return (
      <View style={[chatStyles.messageContainer, messageStyle]}>
        <Text style={textStyle}>{item.content}</Text>
        <Text style={chatStyles.timestamp}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
        </View>

        {/* Messages - KEYBOARD AVOIDING */}
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ 
              padding: 16,
              flexGrow: 1,
              justifyContent: 'flex-end'
            }}
            // REMOVED inverted prop - messages now in natural order
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          />
          
          {/* Input */}
          <View style={[chatStyles.inputContainer, { paddingBottom: insets.bottom + 8 }]}>
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
              style={[chatStyles.sendButton, { opacity: (newMessage.trim() && !sending) ? 1 : 0.4 }]}
              onPress={sendMessage}
              disabled={!newMessage.trim() || sending}
            >
              <Text style={chatStyles.sendButtonText}>→</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Background>
  );
}