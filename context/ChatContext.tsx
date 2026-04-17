// context/ChatContext.tsx
import { supabase } from '@/lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import React, { createContext, useCallback, useContext, useEffect, useReducer, useRef } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './AuthContext';

// -----------------------------------------------------------------------------
// Types (extended Supabase schema)
// -----------------------------------------------------------------------------
export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  status: 'sent' | 'delivered' | 'read';
  media_uri?: string;
  media_type?: 'image';
  is_edited: boolean;
  is_deleted: boolean;
}

export interface Chat {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message?: string;
  last_message_time?: string;
  // Derived fields
  otherUser: {
    id: string;
    name: string;
    avatar: string;
    online: boolean;
    last_seen?: string;
  };
  unreadCount: number;
  // Convenience getter for simple participant object (used by ChatList)
  get participant(): { id: string; name: string; avatar: string };
}

// Helper to create a Chat object with getter
const enrichChat = (
  chat: any,
  otherUser: Chat['otherUser'],
  unreadCount = 0
): Chat => ({
  ...chat,
  otherUser,
  unreadCount,
  get participant() {
    return {
      id: this.otherUser.id,
      name: this.otherUser.name,
      avatar: this.otherUser.avatar,
    };
  },
});

interface ChatState {
  chats: Chat[];
  messages: Record<string, Message[]>; // chatId -> messages
  typingUsers: Record<string, string[]>; // chatId -> userIds
  loading: boolean;
}

type ChatAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'ADD_CHAT'; payload: Chat }
  | { type: 'SET_MESSAGES'; payload: { chatId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'UPDATE_MESSAGE_STATUS'; payload: { chatId: string; messageId: string; status: Message['status'] } }
  | { type: 'DELETE_MESSAGE'; payload: { chatId: string; messageId: string } }
  | { type: 'EDIT_MESSAGE'; payload: { chatId: string; messageId: string; newContent: string } }
  | { type: 'SET_TYPING'; payload: { chatId: string; userId: string; isTyping: boolean } }
  | { type: 'MARK_CHAT_READ'; payload: { chatId: string } }
  | { type: 'UPDATE_ONLINE_STATUS'; payload: { userId: string; online: boolean; last_seen?: string } };

// -----------------------------------------------------------------------------
// Reducer
// -----------------------------------------------------------------------------
const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_CHATS':
      return { ...state, chats: action.payload };
    case 'ADD_CHAT':
      return { ...state, chats: [action.payload, ...state.chats] };
    case 'SET_MESSAGES':
      return { ...state, messages: { ...state.messages, [action.payload.chatId]: action.payload.messages } };
    case 'ADD_MESSAGE': {
      const { chatId, message } = action.payload;
      const existing = state.messages[chatId] || [];
      const updatedChats = state.chats.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              last_message: message.content,
              last_message_time: message.created_at,
              unreadCount: message.sender_id !== chat.otherUser.id ? chat.unreadCount + 1 : chat.unreadCount,
            }
          : chat
      );
      return {
        ...state,
        messages: { ...state.messages, [chatId]: [...existing, message] },
        chats: updatedChats,
      };
    }
    case 'UPDATE_MESSAGE_STATUS': {
      const { chatId, messageId, status } = action.payload;
      const updatedMessages = (state.messages[chatId] || []).map(m =>
        m.id === messageId ? { ...m, status } : m
      );
      return { ...state, messages: { ...state.messages, [chatId]: updatedMessages } };
    }
    case 'DELETE_MESSAGE': {
      const { chatId, messageId } = action.payload;
      const updatedMessages = (state.messages[chatId] || []).map(m =>
        m.id === messageId ? { ...m, content: '[deleted]', is_deleted: true, media_uri: undefined } : m
      );
      return { ...state, messages: { ...state.messages, [chatId]: updatedMessages } };
    }
    case 'EDIT_MESSAGE': {
      const { chatId, messageId, newContent } = action.payload;
      const updatedMessages = (state.messages[chatId] || []).map(m =>
        m.id === messageId ? { ...m, content: newContent, is_edited: true } : m
      );
      return { ...state, messages: { ...state.messages, [chatId]: updatedMessages } };
    }
    case 'SET_TYPING': {
      const { chatId, userId, isTyping } = action.payload;
      const typing = state.typingUsers[chatId] || [];
      const newTyping = isTyping
        ? [...typing.filter(id => id !== userId), userId]
        : typing.filter(id => id !== userId);
      return { ...state, typingUsers: { ...state.typingUsers, [chatId]: newTyping } };
    }
    case 'MARK_CHAT_READ': {
      const { chatId } = action.payload;
      const updatedChats = state.chats.map(chat =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      );
      return { ...state, chats: updatedChats };
    }
    case 'UPDATE_ONLINE_STATUS': {
      const { userId, online, last_seen } = action.payload;
      const updatedChats = state.chats.map(chat =>
        chat.otherUser.id === userId
          ? { ...chat, otherUser: { ...chat.otherUser, online, last_seen } }
          : chat
      );
      return { ...state, chats: updatedChats };
    }
    default:
      return state;
  }
};

// -----------------------------------------------------------------------------
// Context Value Interface
// -----------------------------------------------------------------------------
interface ChatContextValue extends ChatState {
  sendMessage: (chatId: string, text: string, mediaUri?: string) => Promise<void>;
  sendTyping: (chatId: string, isTyping: boolean) => void;
  markChatRead: (chatId: string) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  editMessage: (chatId: string, messageId: string, newContent: string) => Promise<void>;
  fetchMessages: (chatId: string) => Promise<Message[]>;
  createChat: (userId: string, name: string, avatar: string) => Promise<string>;
  pickImage: () => Promise<string | null>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(chatReducer, {
    chats: [],
    messages: {},
    typingUsers: {},
    loading: true,
  });

  // Realtime subscriptions refs
  const messageSubscription = useRef<any>(null);
  const typingSubscription = useRef<any>(null);
  const presenceSubscription = useRef<any>(null);

  // Load chats from Supabase
  const loadChats = useCallback(async () => {
    if (!user) return;
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data, error } = await supabase
        .from('chats')
        .select(`
          id,
          participant1_id,
          participant2_id,
          last_message,
          last_message_time
        `)
        .or(`participant1_id.eq.${user.id},participant2_id.eq.${user.id}`)
        .order('last_message_time', { ascending: false });

      if (error) throw error;

      // Get unread counts per chat
      const { data: unreadData } = await supabase
        .from('messages')
        .select('chat_id, sender_id')
        .eq('status', 'sent')
        .neq('sender_id', user.id);

      const unreadMap: Record<string, number> = {};
      unreadData?.forEach((m: any) => {
        unreadMap[m.chat_id] = (unreadMap[m.chat_id] || 0) + 1;
      });

      const chatList: Chat[] = await Promise.all(
        (data || []).map(async (chat) => {
          const otherUserId = chat.participant1_id === user.id ? chat.participant2_id : chat.participant1_id;
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('name, avatar, online, last_seen')
            .eq('id', otherUserId)
            .single();
          if (profileError) console.error('Profile error', profileError);
          return enrichChat(
            chat,
            {
              id: otherUserId,
              name: profile?.name || 'Unknown',
              avatar: profile?.avatar || '🌱',
              online: profile?.online || false,
              last_seen: profile?.last_seen,
            },
            unreadMap[chat.id] || 0
          );
        })
      );
      dispatch({ type: 'SET_CHATS', payload: chatList });
    } catch (err) {
      console.error('Failed to load chats', err);
      Alert.alert('Error', 'Could not load your conversations');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [user]);

  // Fetch messages for a specific chat
  const fetchMessages = useCallback(async (chatId: string): Promise<Message[]> => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const messages = data || [];
      dispatch({ type: 'SET_MESSAGES', payload: { chatId, messages } });
      return messages;
    } catch (err) {
      console.error('Failed to fetch messages', err);
      Alert.alert('Error', 'Could not load messages');
      return [];
    }
  }, []);

  // Send message (with optional image)
  const sendMessage = useCallback(async (chatId: string, text: string, mediaUri?: string) => {
    if (!user) return;
    if (!text.trim() && !mediaUri) return;

    // Optimistically create a temporary message
    const tempId = `temp_${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      chat_id: chatId,
      sender_id: user.id,
      content: text.trim(),
      created_at: new Date().toISOString(),
      status: 'sent',
      media_uri: mediaUri,
      media_type: mediaUri ? 'image' : undefined,
      is_edited: false,
      is_deleted: false,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message: newMessage } });

    try {
      // Upload image if present
      let mediaUrl: string | undefined;
      if (mediaUri) {
        const fileName = `${user.id}/${Date.now()}.jpg`;
        // Convert URI to Blob
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, blob, { contentType: 'image/jpeg' });
        if (uploadError) throw uploadError;
        const { data: publicUrl } = supabase.storage.from('chat-media').getPublicUrl(fileName);
        mediaUrl = publicUrl.publicUrl;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          chat_id: chatId,
          sender_id: user.id,
          content: text.trim(),
          status: 'sent',
          media_uri: mediaUrl,
          media_type: mediaUri ? 'image' : undefined,
        })
        .select()
        .single();

      if (error) throw error;

      // Replace temp message with real one
      const currentMessages = state.messages[chatId] || [];
      dispatch({
        type: 'SET_MESSAGES',
        payload: {
          chatId,
          messages: currentMessages.map(m => (m.id === tempId ? data : m))
        }
      });

      // Update chat's last message (use 'Image' if only media sent)
      const lastMsgContent = text.trim() || (mediaUri ? '📷 Image' : '');
      await supabase
        .from('chats')
        .update({ last_message: lastMsgContent, last_message_time: new Date().toISOString() })
        .eq('id', chatId);
    } catch (err) {
      console.error('Send message error', err);
      Alert.alert('Error', 'Failed to send message');
      // Remove optimistic message
      const filtered = (state.messages[chatId] || []).filter(m => m.id !== tempId);
      dispatch({ type: 'SET_MESSAGES', payload: { chatId, messages: filtered } });
    }
  }, [user, state.messages]);

  // Mark chat as read (update unread count and message statuses)
  const markChatRead = useCallback(async (chatId: string) => {
    if (!user) return;
    dispatch({ type: 'MARK_CHAT_READ', payload: { chatId } });
    // Update all unread messages in this chat to 'read'
    const { error } = await supabase
      .from('messages')
      .update({ status: 'read' })
      .eq('chat_id', chatId)
      .eq('status', 'sent')
      .neq('sender_id', user.id);
    if (error) console.error('Failed to mark messages as read', error);
    // Also update local messages
    const msgs = state.messages[chatId] || [];
    msgs.forEach(msg => {
      if (msg.sender_id !== user.id && msg.status === 'sent') {
        dispatch({ type: 'UPDATE_MESSAGE_STATUS', payload: { chatId, messageId: msg.id, status: 'read' } });
      }
    });
  }, [user, state.messages]);

  // Delete message (soft delete)
  const deleteMessage = useCallback(async (chatId: string, messageId: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true, content: '[deleted]', media_uri: null })
        .eq('id', messageId)
        .eq('sender_id', user.id);
      if (error) throw error;
      dispatch({ type: 'DELETE_MESSAGE', payload: { chatId, messageId } });
    } catch (err) {
      console.error('Delete message error', err);
      Alert.alert('Error', 'Could not delete message');
    }
  }, [user]);

  // Edit message
  const editMessage = useCallback(async (chatId: string, messageId: string, newContent: string) => {
    if (!user || !newContent.trim()) return;
    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: newContent.trim(), is_edited: true })
        .eq('id', messageId)
        .eq('sender_id', user.id);
      if (error) throw error;
      dispatch({ type: 'EDIT_MESSAGE', payload: { chatId, messageId, newContent: newContent.trim() } });
    } catch (err) {
      console.error('Edit message error', err);
      Alert.alert('Error', 'Could not edit message');
    }
  }, [user]);

  // Create a new chat (or return existing)
  const createChat = useCallback(async (userId: string, name: string, avatar: string): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    try {
      // Check if chat already exists
      const { data: existing } = await supabase
        .from('chats')
        .select('id')
        .or(`and(participant1_id.eq.${user.id},participant2_id.eq.${userId}),and(participant1_id.eq.${userId},participant2_id.eq.${user.id})`)
        .maybeSingle();
      if (existing) return existing.id;

      // Create new chat
      const { data, error } = await supabase
        .from('chats')
        .insert({
          participant1_id: user.id,
          participant2_id: userId,
          last_message: 'Start chatting!',
          last_message_time: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      await loadChats(); // refresh list
      return data.id;
    } catch (err) {
      console.error('Create chat error', err);
      Alert.alert('Error', 'Could not start conversation');
      throw err;
    }
  }, [user, loadChats]);

  // Pick image from library
  const pickImage = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled) return result.assets[0].uri;
    return null;
  };

  // Send typing indicator via broadcast
  const sendTyping = useCallback((chatId: string, isTyping: boolean) => {
    if (!user) return;
    // Local update
    dispatch({ type: 'SET_TYPING', payload: { chatId, userId: user.id, isTyping } });
    // Broadcast to other participant
    const chat = state.chats.find(c => c.id === chatId);
    if (chat) {
      supabase.channel(`typing:${chatId}`).send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId: user.id, isTyping },
      });
    }
  }, [user, state.chats]);

  // ---------------------------------------------------------------------------
  // Real-time subscriptions
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!user) return;

    // 1. Subscribe to new messages
    const messageChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new as Message;
          // Only add if it's not from current user (already added optimistically) and belongs to a chat we have
          if (newMsg.sender_id !== user.id && state.chats.some(c => c.id === newMsg.chat_id)) {
            dispatch({ type: 'ADD_MESSAGE', payload: { chatId: newMsg.chat_id, message: newMsg } });
            // Auto-mark as delivered if we are the receiver
            if (newMsg.status === 'sent') {
              supabase
                .from('messages')
                .update({ status: 'delivered' })
                .eq('id', newMsg.id)
                .then(({ error }) => console.error(error));
              dispatch({ type: 'UPDATE_MESSAGE_STATUS', payload: { chatId: newMsg.chat_id, messageId: newMsg.id, status: 'delivered' } });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updated = payload.new as Message;
          const chatId = updated.chat_id;
          if (updated.status && updated.status !== 'sent') {
            dispatch({ type: 'UPDATE_MESSAGE_STATUS', payload: { chatId, messageId: updated.id, status: updated.status } });
          }
          if (updated.is_deleted) {
            dispatch({ type: 'DELETE_MESSAGE', payload: { chatId, messageId: updated.id } });
          }
          if (updated.is_edited) {
            dispatch({ type: 'EDIT_MESSAGE', payload: { chatId, messageId: updated.id, newContent: updated.content } });
          }
        }
      )
      .subscribe();

    messageSubscription.current = messageChannel;

    // 2. Subscribe to typing indicators (broadcast per chat)
    const typingChannels = state.chats.map(chat =>
      supabase.channel(`typing:${chat.id}`)
        .on('broadcast', { event: 'typing' }, ({ payload }) => {
          if (payload.userId !== user.id) {
            dispatch({ type: 'SET_TYPING', payload: { chatId: chat.id, userId: payload.userId, isTyping: payload.isTyping } });
          }
        })
        .subscribe()
    );
    typingSubscription.current = typingChannels;

    // 3. Subscribe to profile online status (presence)
    const presenceChannel = supabase.channel('online-status');
    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = presenceChannel.presenceState();
        // Update each chat's otherUser online status
        Object.entries(presenceState).forEach(([userId, presences]) => {
          const online = presences.length > 0;
          const last_seen = online ? undefined : new Date().toISOString();
          dispatch({ type: 'UPDATE_ONLINE_STATUS', payload: { userId, online, last_seen } });
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });
    presenceSubscription.current = presenceChannel;

    // Cleanup
    return () => {
      messageChannel.unsubscribe();
      typingChannels.forEach(ch => ch.unsubscribe());
      presenceChannel.unsubscribe();
    };
  }, [user, state.chats]);

  // Load chats on mount and when user changes
  useEffect(() => {
    loadChats();
    // Subscribe to chat table changes (new chats, last message updates)
    const chatSubscription = supabase
      .channel('chats-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chats' }, () => loadChats())
      .subscribe();
    return () => { chatSubscription.unsubscribe(); };
  }, [loadChats]);

  const value: ChatContextValue = {
    ...state,
    sendMessage,
    sendTyping,
    markChatRead,
    deleteMessage,
    editMessage,
    fetchMessages,
    createChat,
    pickImage,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};