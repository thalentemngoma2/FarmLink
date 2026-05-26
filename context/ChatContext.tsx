import { useAuth } from '@/context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';

import { supabase } from '@/lib/supabase';

// ---------- Types ----------
export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
  status: 'pending' | 'sent' | 'delivered' | 'read';
  mediaUri?: string;
  mediaType?: 'image';
  isEdited?: boolean;
  isDeleted?: boolean;
  encrypted: boolean;
}

export interface Chat {
  id: string;
  participants: string[];
  otherUser: {
    id: string;
    name: string;
    avatar: string;
    online: boolean;
    lastSeen?: number;
  };
  lastMessage?: Message;
  unreadCount: number;
}

interface ChatState {
  currentUserId: string;
  chats: Chat[];
  messages: Record<string, Message[]>;
  typingUsers: Record<string, string[]>;
}

type ChatAction =
  | { type: 'SET_CURRENT_USER'; payload: string }
  | { type: 'SET_CHATS'; payload: Chat[] }
  | { type: 'ADD_CHAT'; payload: Chat }
  | { type: 'SET_MESSAGES'; payload: { chatId: string; messages: Message[] } }
  | { type: 'ADD_MESSAGE'; payload: { chatId: string; message: Message } }
  | { type: 'UPDATE_MESSAGE_STATUS'; payload: { chatId: string; messageId: string; status: Message['status'] } }
  | { type: 'DELETE_MESSAGE'; payload: { chatId: string; messageId: string } }
  | { type: 'EDIT_MESSAGE'; payload: { chatId: string; messageId: string; newText: string } }
  | { type: 'SET_TYPING'; payload: { chatId: string; userId: string; isTyping: boolean } }
  | { type: 'MARK_CHAT_READ'; payload: { chatId: string } }
  | { type: 'UPDATE_ONLINE_STATUS'; payload: { userId: string; online: boolean; lastSeen?: number } };

const chatReducer = (state: ChatState, action: ChatAction): ChatState => {
  switch (action.type) {
    case 'SET_CURRENT_USER':
      return { ...state, currentUserId: action.payload };
    case 'SET_CHATS':
      return { ...state, chats: action.payload };
    case 'ADD_CHAT':
      return { ...state, chats: [action.payload, ...state.chats] };
    case 'SET_MESSAGES':
      return { ...state, messages: { ...state.messages, [action.payload.chatId]: action.payload.messages } };
    case 'ADD_MESSAGE': {
      const { chatId, message } = action.payload;
      const existing = state.messages[chatId] || [];
      if (existing.some(m => m.id === message.id)) return state; // avoid duplicates
      const updatedChats = state.chats.map(chat =>
        chat.id === chatId
          ? {
              ...chat,
              lastMessage: message,
              unreadCount: chat.unreadCount + (message.senderId !== state.currentUserId ? 1 : 0),
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
        m.id === messageId ? { ...m, text: '[deleted]', isDeleted: true, mediaUri: undefined } : m
      );
      return { ...state, messages: { ...state.messages, [chatId]: updatedMessages } };
    }
    case 'EDIT_MESSAGE': {
      const { chatId, messageId, newText } = action.payload;
      const updatedMessages = (state.messages[chatId] || []).map(m =>
        m.id === messageId ? { ...m, text: newText, isEdited: true } : m
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
      const { userId, online, lastSeen } = action.payload;
      const updatedChats = state.chats.map(chat =>
        chat.otherUser.id === userId
          ? { ...chat, otherUser: { ...chat.otherUser, online, lastSeen } }
          : chat
      );
      return { ...state, chats: updatedChats };
    }
    default:
      return state;
  }
};

interface ChatContextValue extends ChatState {
  sendMessage: (chatId: string, text: string, mediaUri?: string) => Promise<void>;
  sendTyping: (chatId: string, isTyping: boolean) => void;
  markChatRead: (chatId: string) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  editMessage: (chatId: string, messageId: string, newText: string) => Promise<void>;
  createChat: (userId: string, name: string, avatar: string, initialMessage?: string) => Promise<string>;
  pickImage: () => Promise<string | null>;
  isE2EEActive: boolean;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, {
    currentUserId: '',
    chats: [],
    messages: {},
    typingUsers: {},
  });

  const { user } = useAuth();
  const currentUserId = user?.id || '';

  // Update current user ID when auth changes
  useEffect(() => {
    if (currentUserId !== state.currentUserId) {
      dispatch({ type: 'SET_CURRENT_USER', payload: currentUserId });
    }
  }, [currentUserId, state.currentUserId]);

  // ---------- Load data from Supabase on mount (only if logged in) ----------
  useEffect(() => {
    if (!currentUserId) return;

    const loadChatsAndMessages = async () => {
      try {
        const { data: chatsData, error: chatsError } = await supabase
          .from('chats')
          .select('*')
          .or(`participant1_id.eq.${currentUserId},participant2_id.eq.${currentUserId}`);

        if (chatsError) {
          console.error('Error fetching chats:', chatsError);
          return;
        }

        const otherUserIds = new Set<string>();
        (chatsData || []).forEach(c => {
          const other = c.participant1_id === currentUserId ? c.participant2_id : c.participant1_id;
          otherUserIds.add(other);
        });

        const { data: usersData } = await supabase
          .from('users')
          .select('user_id, username, avatar')
          .in('user_id', Array.from(otherUserIds));

        const userMap: Record<string, { name: string; avatar: string }> = {};
        (usersData || []).forEach(u => {
          userMap[u.user_id] = { name: u.username || 'Farmer', avatar: u.avatar || '🌾' };
        });

        const chats: Chat[] = (chatsData || []).map(c => {
          const otherId = c.participant1_id === currentUserId ? c.participant2_id : c.participant1_id;
          return {
            id: c.id,
            participants: [c.participant1_id, c.participant2_id],
            otherUser: {
              id: otherId,
              name: userMap[otherId]?.name || 'Unknown',
              avatar: userMap[otherId]?.avatar || '🌾',
              online: false,
              lastSeen: undefined,
            },
            lastMessage: undefined,
            unreadCount: 0,
          };
        });

        dispatch({ type: 'SET_CHATS', payload: chats });

        const allMessages: Record<string, Message[]> = {};
        await Promise.all(
          chats.map(async chat => {
            const { data: msgs, error: msgError } = await supabase
              .from('messages')
              .select('*')
              .eq('chat_id', chat.id)
              .order('created_at', { ascending: true });

            if (!msgError && msgs) {
              allMessages[chat.id] = msgs.map(m => ({
                id: m.id,
                text: m.content,
                senderId: m.sender_id,
                receiverId: chat.otherUser.id,
                timestamp: new Date(m.created_at).getTime(),
                status: m.status as Message['status'],
                mediaUri: m.media_uri,
                mediaType: m.media_type,
                isEdited: m.is_edited || false,
                isDeleted: m.is_deleted || false,
                encrypted: true,
              }));
            }
          })
        );

        Object.entries(allMessages).forEach(([chatId, msgs]) => {
          dispatch({ type: 'SET_MESSAGES', payload: { chatId, messages: msgs } });
        });

        // Mark any 'sent' messages from others as 'delivered'
        chats.forEach(async chat => {
          await supabase
            .from('messages')
            .update({ status: 'delivered' })
            .eq('chat_id', chat.id)
            .neq('sender_id', currentUserId)
            .eq('status', 'sent');
        });
      } catch (err) {
        console.error('Failed to load chats/messages:', err);
      }
    };

    loadChatsAndMessages();
  }, [currentUserId]);

  // ---------- Real‑time subscription ----------
  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newMsg = payload.new;
          if (!newMsg) return;

          const chatId = newMsg.chat_id;
          if ((state.messages[chatId] || []).some(m => m.id === newMsg.id)) return;

          const chat = state.chats.find(c => c.id === chatId);
          const message: Message = {
            id: newMsg.id,
            text: newMsg.content,
            senderId: newMsg.sender_id,
            receiverId: chat?.otherUser.id || '',
            timestamp: new Date(newMsg.created_at).getTime(),
            status: newMsg.status as Message['status'],
            mediaUri: newMsg.media_uri,
            mediaType: newMsg.media_type,
            isEdited: newMsg.is_edited || false,
            isDeleted: newMsg.is_deleted || false,
            encrypted: true,
          };

          dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message } });

          if (newMsg.sender_id !== currentUserId && newMsg.status === 'sent') {
            supabase
              .from('messages')
              .update({ status: 'delivered' })
              .eq('id', newMsg.id)
              .then(() => {});
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updated = payload.new;
          if (!updated) return;

          const chatId = updated.chat_id;
          dispatch({
            type: 'UPDATE_MESSAGE_STATUS',
            payload: { chatId, messageId: updated.id, status: updated.status as Message['status'] },
          });

          if (updated.is_edited) {
            dispatch({
              type: 'EDIT_MESSAGE',
              payload: { chatId, messageId: updated.id, newText: updated.content },
            });
          }
          if (updated.is_deleted) {
            dispatch({ type: 'DELETE_MESSAGE', payload: { chatId, messageId: updated.id } });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, state.chats, state.messages]);

  // ---------- Typing indicator (broadcast) ----------
  const sendTyping = useCallback((chatId: string, isTyping: boolean) => {
    if (!currentUserId) return;

    supabase
      .channel(`typing-${chatId}`)
      .send({
        type: 'broadcast',
        event: isTyping ? 'typing_start' : 'typing_stop',
        payload: { userId: currentUserId, chatId },
      });
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    const channels: Record<string, any> = {};
    state.chats.forEach(chat => {
      const channel = supabase.channel(`typing-${chat.id}`, {
        config: { broadcast: { self: false } },
      });
      channel.on('broadcast', { event: 'typing_start' }, (payload: any) => {
        dispatch({
          type: 'SET_TYPING',
          payload: { chatId: chat.id, userId: payload.userId, isTyping: true },
        });
      });
      channel.on('broadcast', { event: 'typing_stop' }, (payload: any) => {
        dispatch({
          type: 'SET_TYPING',
          payload: { chatId: chat.id, userId: payload.userId, isTyping: false },
        });
      });
      channel.subscribe();
      channels[chat.id] = channel;
    });

    return () => {
      Object.values(channels).forEach((ch: any) => supabase.removeChannel(ch));
    };
  }, [state.chats, currentUserId]);

  // ---------- Send Message (uploads image to Supabase Storage, then inserts) ----------
  const sendMessage = useCallback(async (chatId: string, text: string, mediaUri?: string) => {
    if (!currentUserId || (!text.trim() && !mediaUri)) return;

    // 1. Upload image if provided
    let uploadedUrl: string | undefined = undefined;
    if (mediaUri) {
      try {
        // Convert to blob
        const response = await fetch(mediaUri);
        const blob = await response.blob();
        const ext = mediaUri.split('.').pop()?.split('?')[0] || 'jpg';
        const fileName = `chat/${chatId}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('farmlink')
          .upload(fileName, blob, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
          });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('farmlink')
          .getPublicUrl(fileName);
        uploadedUrl = publicUrlData.publicUrl;
      } catch (err) {
        console.error('Image upload failed:', err);
        // Continue without image (or you could abort)
      }
    }

    // 2. Optimistic message (temp ID)
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      text: text.trim(),
      senderId: currentUserId,
      receiverId: state.chats.find(c => c.id === chatId)?.otherUser.id || '',
      timestamp: Date.now(),
      status: 'pending',
      mediaUri: uploadedUrl,
      mediaType: uploadedUrl ? 'image' : undefined,
      encrypted: true,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message: optimisticMsg } });

    // 3. Insert into database (no id – let Supabase generate UUID)
    const { data, error } = await supabase
      .from('messages')
      .insert({
        chat_id: chatId,
        sender_id: currentUserId,
        content: text.trim(),
        media_uri: uploadedUrl,
        status: 'sent',
        created_at: new Date().toISOString(),
        is_edited: false,
        is_deleted: false,
      })
      .select()
      .single();

    if (error) {
      dispatch({ type: 'DELETE_MESSAGE', payload: { chatId, messageId: tempId } });
      console.error('Failed to send message:', error);
      return;
    }

    // 4. Replace temp message with real one
    const realMessage: Message = {
      id: data.id,
      text: data.content,
      senderId: data.sender_id,
      receiverId: optimisticMsg.receiverId,
      timestamp: new Date(data.created_at).getTime(),
      status: data.status,
      mediaUri: data.media_uri,
      mediaType: data.media_type,
      isEdited: data.is_edited || false,
      isDeleted: data.is_deleted || false,
      encrypted: true,
    };

    dispatch({ type: 'DELETE_MESSAGE', payload: { chatId, messageId: tempId } });
    dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message: realMessage } });
  }, [currentUserId, state.chats]);

  // ---------- Mark Chat Read (also marks notifications as read) ----------
  const markChatRead = useCallback(async (chatId: string) => {
    if (!currentUserId) return;

    // Local state
    dispatch({ type: 'MARK_CHAT_READ', payload: { chatId } });

    // Update message statuses
    const chatMsgs = state.messages[chatId] || [];
    const idsToMark = chatMsgs
      .filter(m => m.senderId !== currentUserId && m.status !== 'read')
      .map(m => m.id);

    if (idsToMark.length > 0) {
      await supabase
        .from('messages')
        .update({ status: 'read' })
        .in('id', idsToMark);
    }

    // Mark related notifications as read
    // Assumption: action_url contains the chatId (e.g. /chat/123)
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUserId)
      .ilike('action_url', `%${chatId}%`)
      .eq('read', false);
  }, [currentUserId, state.messages]);

  // ---------- Delete / Edit ----------
  const deleteMessage = useCallback(async (chatId: string, messageId: string) => {
    dispatch({ type: 'DELETE_MESSAGE', payload: { chatId, messageId } });
    await supabase
      .from('messages')
      .update({ is_deleted: true, content: '[deleted]' })
      .eq('id', messageId);
  }, []);

  const editMessage = useCallback(async (chatId: string, messageId: string, newText: string) => {
    dispatch({ type: 'EDIT_MESSAGE', payload: { chatId, messageId, newText } });
    await supabase
      .from('messages')
      .update({ content: newText, is_edited: true })
      .eq('id', messageId);
  }, []);

  // ---------- Create Chat ----------
  const createChat = useCallback(async (otherUserId: string, name: string, avatar: string, initialMessage?: string) => {
    if (!currentUserId) return '';

    const { data: existing } = await supabase
      .from('chats')
      .select('id')
      .or(`and(participant1_id.eq.${currentUserId},participant2_id.eq.${otherUserId}),and(participant1_id.eq.${otherUserId},participant2_id.eq.${currentUserId})`)
      .maybeSingle();

    if (existing) return existing.id;

    const { data: newChat, error } = await supabase
      .from('chats')
      .insert({
        participant1_id: currentUserId,
        participant2_id: otherUserId,
      })
      .select('id')
      .single();

    if (error || !newChat) throw error || new Error('Failed to create chat');

    const chat: Chat = {
      id: newChat.id,
      participants: [currentUserId, otherUserId],
      otherUser: { id: otherUserId, name, avatar, online: false },
      unreadCount: 0,
    };

    dispatch({ type: 'ADD_CHAT', payload: chat });

    if (initialMessage) {
      await sendMessage(chat.id, initialMessage);
    }

    return chat.id;
  }, [currentUserId, sendMessage]);

  // ---------- Pick Image ----------
  const pickImage = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      alert('Need camera roll permissions to send images');
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

  return (
    <ChatContext.Provider
      value={{
        ...state,
        sendMessage,
        sendTyping,
        markChatRead,
        deleteMessage,
        editMessage,
        createChat,
        pickImage,
        isE2EEActive: true,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChat must be used within ChatProvider');
  return ctx;
};