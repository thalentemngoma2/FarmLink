import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Message, useChat } from '@/context/ChatContext';

interface ChatScreenProps {
  chatId: string;
  onClose: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  chatId,
  onClose,
}) => {
  const {
    messages,
    chats,
    sendMessage,
    sendTyping,
    markChatRead,
    deleteMessage,
    editMessage,
    pickImage,
    currentUserId,
    typingUsers,
  } = useChat();

  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768; // tablet breakpoint

  const chat = chats.find(c => c.id === chatId);
  const chatMessages = useMemo(
    () => messages[chatId] || [],
    [messages, chatId]
  );

  const otherUserTyping = typingUsers[chatId]?.includes(
    chat?.otherUser.id || ''
  );

  // Mark chat as read when opened
  useEffect(() => {
    markChatRead(chatId);
  }, [chatId]);

  // Auto‑scroll to bottom when new messages arrive (stable, no jumps)
  useEffect(() => {
    requestAnimationFrame(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    });
  }, [chatMessages.length]);

  // Debounced typing indicator
  const handleTyping = useCallback(() => {
    sendTyping(chatId, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(chatId, false);
    }, 1200);
  }, [chatId]);

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!trimmed) return;

    try {
      await sendMessage(chatId, trimmed);
      setInputText('');
      sendTyping(chatId, false);

      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      });
    } catch (error) {
      Alert.alert('Send Failed', 'Unable to send message.');
    }
  };

  const handlePickImage = async () => {
    try {
      const uri = await pickImage();
      if (uri) await sendMessage(chatId, '', uri);
    } catch {
      Alert.alert('Upload Failed', 'Could not upload image.');
    }
  };

  // Long‑press actions (only for own messages)
  const handleLongPress = (message: Message) => {
    if (message.senderId !== currentUserId) return;

    if (Platform.OS === 'ios') {
      Alert.alert('Message', 'Choose action', [
        {
          text: 'Edit',
          onPress: () => {
            Alert.prompt('Edit message', 'Enter new text', newText => {
              if (newText?.trim()) editMessage(chatId, message.id, newText.trim());
            });
          },
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMessage(chatId, message.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    } else {
      // Android fallback – simple delete only
      Alert.alert('Message', 'Delete this message?', [
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMessage(chatId, message.id),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === currentUserId;

    return (
      <Pressable
        onLongPress={() => handleLongPress(item)}
        style={[
          styles.messageRow,
          isMine ? styles.myMessageRow : styles.theirMessageRow,
        ]}
      >
        {/* Avatar on the left for other users */}
        {!isMine && (
          <View style={styles.otherAvatar}>
            <Text style={styles.avatarText}>
              {chat?.otherUser.avatar}
            </Text>
          </View>
        )}

        <BlurView
          intensity={isMine ? 50 : 80}
          tint={isMine ? 'dark' : 'light'}
          style={[
            styles.messageBubble,
            isMine ? styles.myBubble : styles.theirBubble,
            { maxWidth: isTablet ? '60%' : '82%' },
          ]}
        >
          {item.mediaUri && (
            <Image
              source={{ uri: item.mediaUri }}
              style={styles.messageImage}
              contentFit="cover"
            />
          )}

          {!item.isDeleted ? (
            <>
              {!!item.text && (
                <Text
                  style={[
                    styles.messageText,
                    isMine ? styles.myText : styles.theirText,
                  ]}
                >
                  {item.text}
                </Text>
              )}

              <View style={styles.messageFooter}>
                <Text style={styles.timestamp}>
                  {format(item.timestamp, 'p')}
                </Text>
                {item.isEdited && (
                  <Text style={styles.editedMark}>edited</Text>
                )}
                {isMine && (
                  <Ionicons
                    name={
                      item.status === 'read'
                        ? 'checkmark-done'
                        : item.status === 'delivered'
                        ? 'checkmark-done-outline'
                        : 'checkmark-outline'
                    }
                    size={14}
                    color={item.status === 'read' ? '#22c55e' : '#9ca3af'}
                    style={{ marginLeft: 4 }}
                  />
                )}
              </View>
            </>
          ) : (
            <Text style={styles.deletedText}>This message was deleted</Text>
          )}
        </BlurView>
      </Pressable>
    );
  };

  if (!chat) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* HEADER */}
        <BlurView intensity={60} tint="light" style={styles.header}>
          <Pressable onPress={onClose} style={styles.headerBtn}>
            <Ionicons name="arrow-back" size={24} color="#11181C" />
          </Pressable>

          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>
              {chat.otherUser.name}
            </Text>
            <Text style={styles.headerStatus}>
              {otherUserTyping
                ? 'Typing...'
                : chat.otherUser.online
                ? 'Online'
                : `last seen ${format(chat.otherUser.lastSeen || new Date(), 'p')}`}
            </Text>
          </View>

          <Pressable onPress={handlePickImage} style={styles.headerBtn}>
            <Ionicons name="camera-outline" size={24} color="#11181C" />
          </Pressable>
        </BlurView>

        {/* MESSAGES */}
        <FlatList
          ref={flatListRef}
          data={chatMessages}
          renderItem={renderMessage}
          keyExtractor={item => item.id}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.messagesList}
        />

        {/* TYPING INDICATOR */}
        {otherUserTyping && (
          <View style={styles.typingIndicator}>
            <Text style={styles.typingText}>
              {chat.otherUser.name} is typing...
            </Text>
          </View>
        )}

        {/* INPUT BAR */}
        <BlurView intensity={80} tint="dark" style={styles.inputWrapper}>
          <View style={styles.inputContainer}>
            <Pressable onPress={handlePickImage} style={styles.attachButton}>
              <Ionicons name="image-outline" size={24} color="#22c55e" />
            </Pressable>

            <TextInput
              style={styles.input}
              placeholder="Message..."
              placeholderTextColor="#9ca3af"
              multiline
              value={inputText}
              onChangeText={text => {
                setInputText(text);
                handleTyping();
              }}
            />

            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim()}
              style={styles.sendButton}
            >
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() ? '#22c55e' : '#9ca3af'}
              />
            </Pressable>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0fdf4', },
  flex: { flex: 1, },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(34,197,94,0.15)', backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(20px)', },
  headerBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(34,197,94,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', },
  headerInfo: { flex: 1, },
  headerName: { fontSize: 18, fontWeight: '700', color: '#166534', },
  headerStatus: { fontSize: 12, color: '#6b7280', },
  messagesList: { paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 20, },
  messageRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', },
  myMessageRow: { justifyContent: 'flex-end', },
  theirMessageRow: { justifyContent: 'flex-start', },
  otherAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginRight: 8, },
  avatarText: { fontSize: 12, fontWeight: '700', color: '#ffffff', },
  messageBubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, overflow: 'hidden', borderWidth: 1, },
  myBubble: { backgroundColor: 'rgba(144, 238, 144, 0.15)', borderColor: 'rgba(34,197,94,0.25)', borderBottomRightRadius: 6, },
  theirBubble: { backgroundColor: 'rgba(255,255,255,0.75)', borderColor: 'rgba(34,197,94,0.12)', borderBottomLeftRadius: 6, },
  messageText: { fontSize: 15, lineHeight: 22, },
  myText: { color: '#166534', fontWeight: '500', },
  theirText: { color: '#11181C', },
  editedMark: { fontSize: 11, color: '#98FF98', },
  deletedText: { fontSize: 13, fontStyle: 'italic', color: '#9ca3af', },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4, gap: 4, },
  timestamp: { fontSize: 10, color: '#9ca3af', },
  messageImage: { width: 220, height: 160, borderRadius: 16, marginBottom: 8, },
  typingIndicator: { paddingHorizontal: 16, paddingVertical: 4, },
  typingText: { fontSize: 12, color: '#16a34a', fontStyle: 'italic', },
  inputWrapper: { paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 1, borderTopColor: 'rgba(34,197,94,0.12)', backgroundColor: 'rgba(255,255,255,0.65)', },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, },
  attachButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(34,197,94,0.12)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', },
  input: { flex: 1, minHeight: 48, maxHeight: 120, borderRadius: 28, paddingHorizontal: 18, paddingVertical: 12, color: '#11181C', backgroundColor: 'rgba(255,255,255,0.82)', fontSize: 15, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)', },
  sendButton: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', },
});