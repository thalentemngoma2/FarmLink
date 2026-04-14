// components/ChatScreen.tsx
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface ChatScreenProps {
  chatId: string;
  onClose: () => void;
}

export function ChatScreen({ chatId, onClose }: ChatScreenProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchMessages();
    const subscription = supabase
      .channel(`chat:${chatId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `chat_id=eq.${chatId}` }, payload => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();
    return () => { subscription.unsubscribe(); };
  }, [chatId]);

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    if (error) console.error(error);
    else setMessages(data || []);
    setLoading(false);
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;
    const { error } = await supabase.from('messages').insert({
      chat_id: chatId,
      sender_id: user!.id,
      content: inputText.trim(),
    });
    if (error) Alert.alert('Error', 'Could not send message');
    else setInputText('');
  };

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[styles.messageBubble, item.sender_id === user?.id ? styles.myMessage : styles.otherMessage]}>
      <Text style={styles.messageText}>{item.content}</Text>
      <Text style={styles.time}>{new Date(item.created_at).toLocaleTimeString()}</Text>
    </View>
  );

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#22c55e" /></View>;

  return (
    <View style={styles.container}>
      {/* Header with back button and Android top padding */}
      <View style={[styles.header, Platform.OS === 'android' && { paddingTop: 100 }]}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#11181C" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
        />
        <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
          <Ionicons name="send" size={24} color="#22c55e" />
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: { padding: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#11181C' },
  messagesList: { padding: 16, paddingBottom: 20 },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 20, marginVertical: 4 },
  myMessage: { alignSelf: 'flex-end', backgroundColor: '#22c55e', borderBottomRightRadius: 4 },
  otherMessage: { alignSelf: 'flex-start', backgroundColor: '#e5e7eb', borderBottomLeftRadius: 4 },
  messageText: { fontSize: 14, color: '#fff' },
  time: { fontSize: 10, color: '#ddd', marginTop: 4, alignSelf: 'flex-end' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb', backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8, maxHeight: 100, fontSize: 14 },
  sendButton: { marginLeft: 8, padding: 8 },
});