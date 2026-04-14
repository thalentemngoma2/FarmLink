import { Message, useChat } from '@/context/ChatContext';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { Image } from 'expo-image';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ChatScreenProps {
  chatId: string;
  onClose: () => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({ chatId, onClose }) => {
  const { messages, chats, sendMessage, sendTyping, markChatRead, deleteMessage, editMessage, pickImage, currentUserId, typingUsers } = useChat();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const chat = chats.find(c => c.id === chatId);
  const chatMessages = messages[chatId] || [];
  const otherUserTyping = typingUsers[chatId]?.includes(chat?.otherUser.id || '');

  useEffect(() => {
    markChatRead(chatId);
  }, [chatId]);

  const handleSend = () => {
    if (inputText.trim() === '') return;
    sendMessage(chatId, inputText);
    setInputText('');
    handleTyping(false);
  };

  const handleTyping = (typing: boolean) => {
    if (typing === isTyping) return;
    setIsTyping(typing);
    sendTyping(chatId, typing);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    if (typing) {
      typingTimeoutRef.current = setTimeout(() => handleTyping(false), 1500);
    }
  };

  const handlePickImage = async () => {
    const uri = await pickImage();
    if (uri) sendMessage(chatId, '', uri);
  };

  const handleLongPress = (message: Message) => {
    if (message.senderId !== currentUserId) return;
    // For cross‑platform editing, consider using a custom modal instead of Alert.prompt
    if (Platform.OS === 'ios') {
      Alert.alert(
        'Message',
        'Choose action',
        [
          { text: 'Edit', onPress: () => {
            Alert.prompt('Edit message', 'Enter new text', newText => {
              if (newText?.trim()) editMessage(chatId, message.id, newText);
            });
          } },
          { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(chatId, message.id) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      // Android fallback – simple delete only, or use a custom modal
      Alert.alert(
        'Message',
        'Delete this message?',
        [
          { text: 'Delete', style: 'destructive', onPress: () => deleteMessage(chatId, message.id) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isMine = item.senderId === currentUserId;
    return (
      <TouchableOpacity onLongPress={() => handleLongPress(item)} activeOpacity={0.7}>
        <View style={[styles.messageRow, isMine ? styles.myMessageRow : styles.theirMessageRow]}>
          {!isMine && (
            <View style={styles.otherAvatar}>
              <Text style={styles.avatarText}>{chat?.otherUser.avatar}</Text>
            </View>
          )}
          <View style={[styles.messageBubble, isMine ? styles.myBubble : styles.theirBubble]}>
            {item.mediaUri && (
              <Image source={{ uri: item.mediaUri }} style={styles.messageImage} contentFit="cover" />
            )}
            {!item.isDeleted && item.text ? (
              <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText]}>
                {item.text}
                {item.isEdited && <Text style={styles.editedMark}> (edited)</Text>}
              </Text>
            ) : item.isDeleted && <Text style={styles.deletedText}>This message was deleted</Text>}
            <View style={styles.messageFooter}>
              <Text style={[styles.timestamp, isMine ? styles.myTimestamp : styles.theirTimestamp]}>
                {format(item.timestamp, 'p')}
              </Text>
              {isMine && (
                <Ionicons
                  name={item.status === 'read' ? 'checkmark-done' : item.status === 'delivered' ? 'checkmark-done-outline' : 'checkmark-outline'}
                  size={14}
                  color={item.status === 'read' ? '#22c55e' : '#9ca3af'}
                  style={{ marginLeft: 4 }}
                />
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (!chat) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color="#11181C" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerName}>{chat.otherUser.name}</Text>
          <Text style={styles.headerStatus}>
            {chat.otherUser.online ? 'Online' : chat.otherUser.lastSeen ? `Last seen ${format(chat.otherUser.lastSeen, 'p')}` : 'Offline'}
          </Text>
        </View>
        <TouchableOpacity onPress={handlePickImage}>
          <Ionicons name="camera-outline" size={24} color="#11181C" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={chatMessages}
        renderItem={renderMessage}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
      />

      {otherUserTyping && (
        <View style={styles.typingIndicator}>
          <Text style={styles.typingText}>{chat.otherUser.name} is typing...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <View style={styles.inputContainer}>
          <TouchableOpacity onPress={handlePickImage} style={styles.attachButton}>
            <Ionicons name="image-outline" size={24} color="#22c55e" />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Message..."
            value={inputText}
            onChangeText={setInputText}
            onChange={() => handleTyping(true)}
            multiline
          />
          <TouchableOpacity onPress={handleSend} style={[styles.sendButton, !inputText.trim() && styles.sendDisabled]}>
            <Ionicons name="send" size={20} color={inputText.trim() ? '#22c55e' : '#9ca3af'} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', gap: 12 },
  headerInfo: { flex: 1 },
  headerName: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  headerStatus: { fontSize: 12, color: '#6b7280' },
  messagesList: { paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  messageRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'flex-end' },
  myMessageRow: { justifyContent: 'flex-end' },
  theirMessageRow: { justifyContent: 'flex-start' },
  otherAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  avatarText: { fontSize: 12, fontWeight: 'bold', color: '#fff' },
  messageBubble: { maxWidth: '75%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20 },
  myBubble: { backgroundColor: '#22c55e', borderBottomRightRadius: 4 },
  theirBubble: { backgroundColor: '#f3f4f6', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 15, lineHeight: 20 },
  myText: { color: '#fff' },
  theirText: { color: '#11181C' },
  editedMark: { fontSize: 11, color: '#9ca3af' },
  deletedText: { fontSize: 13, fontStyle: 'italic', color: '#9ca3af' },
  messageFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 4 },
  timestamp: { fontSize: 10, color: '#9ca3af', marginRight: 4 },
  myTimestamp: { color: '#e5e7eb' },
  theirTimestamp: { color: '#9ca3af' },
  messageImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 8 },
  typingIndicator: { paddingHorizontal: 16, paddingVertical: 4 },
  typingText: { fontSize: 12, color: '#6b7280', fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb', gap: 8 },
  attachButton: { padding: 4 },
  input: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14, maxHeight: 100, backgroundColor: '#f9fafb' },
  sendButton: { padding: 8, borderRadius: 20 },
  sendDisabled: { opacity: 0.5 },
});