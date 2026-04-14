import { Chat, useChat } from '@/context/ChatContext';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceToNow } from 'date-fns';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export const ChatList: React.FC<{ onClose: () => void; onOpenChat: (chatId: string) => void }> = ({ onClose, onOpenChat }) => {
  const { chats } = useChat();

  const renderItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity style={styles.chatItem} onPress={() => onOpenChat(item.id)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.otherUser.avatar}</Text>
        {item.otherUser.online && <View style={styles.onlineDot} />}
      </View>
      <View style={styles.chatInfo}>
        <View style={styles.topRow}>
          <Text style={styles.name}>{item.otherUser.name}</Text>
          <Text style={styles.time}>
            {item.lastMessage ? formatDistanceToNow(item.lastMessage.timestamp, { addSuffix: true }) : ''}
          </Text>
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.lastMessage} numberOfLines={1}>
            {item.lastMessage?.isDeleted ? 'Deleted message' : item.lastMessage?.text || 'No messages yet'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={24} color="#11181C" />
        </TouchableOpacity>
      </View>
      {chats.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="chatbubbles-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyText}>No conversations yet</Text>
          <Text style={styles.emptySubtext}>Tap on a user's avatar to start chatting</Text>
        </View>
      ) : (
        <FlatList data={chats} renderItem={renderItem} keyExtractor={item => item.id} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  title: { fontSize: 20, fontWeight: '700', color: '#11181C' },
  chatItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginRight: 12, position: 'relative' },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#fff' },
  chatInfo: { flex: 1 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  name: { fontSize: 16, fontWeight: '600', color: '#11181C' },
  time: { fontSize: 12, color: '#9ca3af' },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lastMessage: { fontSize: 14, color: '#6b7280', flex: 1, marginRight: 8 },
  unreadBadge: { backgroundColor: '#22c55e', borderRadius: 12, minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  unreadText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#6b7280', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#9ca3af', textAlign: 'center', marginTop: 8 },
});