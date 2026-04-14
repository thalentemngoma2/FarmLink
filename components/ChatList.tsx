// components/ChatList.tsx
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/context/ChatContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Chat {
  id: string;
  participant: {
    id: string;
    name: string;
    avatar: string;
  };
  last_message: string;
  updated_at: string;
}

interface ChatListProps {
  onClose: () => void;
  onOpenChat: (chatId: string) => void;
}

export function ChatList({ onClose, onOpenChat }: ChatListProps) {
  const { user } = useAuth();
  const { chats, createChat } = useChat();
  const [loading, setLoading] = useState(true);
  const [newChatModalVisible, setNewChatModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    // Chats are already in context, but we can simulate loading
    setLoading(false);
  }, []);

  const searchUsers = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      return;
    }
    const { data, error } = await supabase.rpc('search_users', {
      search_term: query,
      current_user_id: user!.id,
    });
    if (!error) setSearchResults(data || []);
    else setSearchResults([]);
  };

  const startNewChat = async (selectedUser: any) => {
    const chatId = createChat(selectedUser.user_id, selectedUser.name, selectedUser.avatar);
    setNewChatModalVisible(false);
    setSearchQuery('');
    onOpenChat(chatId);
  };

  const renderChatItem = ({ item }: { item: Chat }) => (
    <TouchableOpacity style={styles.chatItem} onPress={() => onOpenChat(item.id)}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.participant.avatar}</Text>
      </View>
      <View style={styles.chatInfo}>
        <Text style={styles.chatName}>{item.participant.name}</Text>
        <Text style={styles.lastMessage} numberOfLines={1}>{item.last_message}</Text>
      </View>
      <Text style={styles.time}>{new Date(item.updated_at).toLocaleDateString()}</Text>
    </TouchableOpacity>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#22c55e" /></View>;

  return (
    <View style={styles.container}>
      {/* Header with back button and new chat button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#11181C" />
        </TouchableOpacity>
        <Text style={styles.title}>Messages</Text>
        <TouchableOpacity onPress={() => setNewChatModalVisible(true)} style={styles.newChatButton}>
          <Ionicons name="create-outline" size={24} color="#22c55e" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No conversations yet</Text>
            <TouchableOpacity onPress={() => setNewChatModalVisible(true)} style={styles.startButton}>
              <Text style={styles.startButtonText}>Start a new chat</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* New Chat Modal */}
      <Modal visible={newChatModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Chat</Text>
              <TouchableOpacity onPress={() => setNewChatModalVisible(false)}>
                <Ionicons name="close" size={24} color="#11181C" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchInput}
              placeholder="Search by name..."
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                searchUsers(text);
              }}
              autoFocus
            />
            {searchResults.length > 0 ? (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.user_id}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.userItem} onPress={() => startNewChat(item)}>
                    <View style={styles.userAvatar}>
                      <Text style={styles.userAvatarText}>{item.avatar || item.name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.userName}>{item.name}</Text>
                  </TouchableOpacity>
                )}
                style={styles.userList}
              />
            ) : (
              <View style={styles.emptySearch}>
                <Text style={styles.emptySearchText}>No users found</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  backButton: { padding: 4 },
  title: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  newChatButton: { padding: 4 },
  list: { paddingHorizontal: 16 },
  chatItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  chatInfo: { flex: 1 },
  chatName: { fontSize: 16, fontWeight: '500', color: '#11181C' },
  lastMessage: { fontSize: 13, color: '#687076', marginTop: 2 },
  time: { fontSize: 11, color: '#9ca3af' },
  emptyContainer: { alignItems: 'center', marginTop: 40 },
  emptyText: { fontSize: 14, color: '#687076' },
  startButton: { marginTop: 16, backgroundColor: '#22c55e', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 24 },
  startButtonText: { color: '#fff', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '90%', maxHeight: '80%', backgroundColor: '#fff', borderRadius: 24, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  searchInput: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 16 },
  userList: { maxHeight: 400 },
  userItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  userAvatarText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  userName: { fontSize: 14, fontWeight: '500', color: '#11181C' },
  emptySearch: { alignItems: 'center', paddingVertical: 20 },
  emptySearchText: { fontSize: 14, color: '#9ca3af' },
});