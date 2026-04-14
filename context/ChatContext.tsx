import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { createContext, useCallback, useContext, useEffect, useReducer } from 'react';

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------
export interface Message {
  id: string;
  text: string;
  senderId: string;
  receiverId: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  mediaUri?: string;
  mediaType?: 'image';
  isEdited?: boolean;
  isDeleted?: boolean;
}

export interface Chat {
  id: string;
  participants: string[]; // [currentUserId, otherUserId]
  otherUser: {
    id: string;
    name: string;
    avatar: string;
    online: boolean;
    lastSeen?: number;
  };
  lastMessage?: Message;
  unreadCount: number;
  // Convenience getter for the simple participant object (used by ChatList)
  get participant(): { id: string; name: string; avatar: string };
}

// Add the getter to the Chat type (we'll implement it when creating chats)
const createChatObject = (
  id: string,
  participants: string[],
  otherUser: Chat['otherUser'],
  unreadCount: number = 0,
  lastMessage?: Message
): Chat => ({
  id,
  participants,
  otherUser,
  unreadCount,
  lastMessage,
  get participant() {
    return {
      id: this.otherUser.id,
      name: this.otherUser.name,
      avatar: this.otherUser.avatar,
    };
  },
});

interface ChatState {
  currentUserId: string;
  chats: Chat[];
  messages: Record<string, Message[]>; // chatId -> messages
  typingUsers: Record<string, string[]>; // chatId -> userIds
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

// -----------------------------------------------------------------------------
// Reducer
// -----------------------------------------------------------------------------
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
      const updatedChats = state.chats.map(chat =>
        chat.id === chatId
          ? { ...chat, lastMessage: message, unreadCount: chat.unreadCount + (message.senderId !== state.currentUserId ? 1 : 0) }
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

// -----------------------------------------------------------------------------
// Context Value Interface
// -----------------------------------------------------------------------------
interface ChatContextValue extends ChatState {
  sendMessage: (chatId: string, text: string, mediaUri?: string) => void;
  sendTyping: (chatId: string, isTyping: boolean) => void;
  markChatRead: (chatId: string) => void;
  deleteMessage: (chatId: string, messageId: string) => void;
  editMessage: (chatId: string, messageId: string, newText: string) => void;
  createChat: (userId: string, name: string, avatar: string) => string;
  pickImage: () => Promise<string | null>;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

// -----------------------------------------------------------------------------
// Provider
// -----------------------------------------------------------------------------
// In a real app, replace with the actual authenticated user ID
const CURRENT_USER_ID = 'currentUser';

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, {
    currentUserId: CURRENT_USER_ID,
    chats: [],
    messages: {},
    typingUsers: {},
  });

  // Load chats & messages from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedChats = await AsyncStorage.getItem('chats');
        const storedMessages = await AsyncStorage.getItem('messages');
        if (storedChats) dispatch({ type: 'SET_CHATS', payload: JSON.parse(storedChats) });
        if (storedMessages) {
          const parsed = JSON.parse(storedMessages);
          Object.entries(parsed).forEach(([chatId, msgs]) => {
            dispatch({ type: 'SET_MESSAGES', payload: { chatId, messages: msgs as Message[] } });
          });
        }
      } catch (e) {}
    };
    loadData();
  }, []);

  // Persist chats & messages on changes
  useEffect(() => {
    AsyncStorage.setItem('chats', JSON.stringify(state.chats));
    AsyncStorage.setItem('messages', JSON.stringify(state.messages));
  }, [state.chats, state.messages]);

  // Simulate other user reading messages after 2 seconds
  useEffect(() => {
    const intervals: ReturnType<typeof setTimeout>[] = [];
    Object.entries(state.messages).forEach(([chatId, msgs]) => {
      const lastUnread = msgs.filter(m => m.senderId !== state.currentUserId && m.status !== 'read').slice(-1)[0];
      if (lastUnread) {
        const timer = setTimeout(() => {
          dispatch({ type: 'UPDATE_MESSAGE_STATUS', payload: { chatId, messageId: lastUnread.id, status: 'read' } });
        }, 2000);
        intervals.push(timer);
      }
    });
    return () => intervals.forEach(clearTimeout);
  }, [state.messages]);

  // Simulate random online status changes
  useEffect(() => {
    const interval = setInterval(() => {
      state.chats.forEach(chat => {
        const online = Math.random() > 0.7;
        dispatch({
          type: 'UPDATE_ONLINE_STATUS',
          payload: { userId: chat.otherUser.id, online, lastSeen: online ? undefined : Date.now() },
        });
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [state.chats]);

  const sendMessage = useCallback((chatId: string, text: string, mediaUri?: string) => {
    if (!text.trim() && !mediaUri) return;
    const chat = state.chats.find(c => c.id === chatId);
    if (!chat) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      senderId: state.currentUserId,
      receiverId: chat.otherUser.id,
      timestamp: Date.now(),
      status: 'sent',
      mediaUri,
      mediaType: mediaUri ? 'image' : undefined,
    };
    dispatch({ type: 'ADD_MESSAGE', payload: { chatId, message: newMessage } });
    // Simulate delivered after 500ms
    setTimeout(() => {
      dispatch({ type: 'UPDATE_MESSAGE_STATUS', payload: { chatId, messageId: newMessage.id, status: 'delivered' } });
    }, 500);
  }, [state.currentUserId, state.chats]);

  const sendTyping = useCallback((chatId: string, isTyping: boolean) => {
    dispatch({ type: 'SET_TYPING', payload: { chatId, userId: state.currentUserId, isTyping } });
  }, [state.currentUserId]);

  const markChatRead = useCallback((chatId: string) => {
    dispatch({ type: 'MARK_CHAT_READ', payload: { chatId } });
    const chatMessages = state.messages[chatId] || [];
    chatMessages.forEach(msg => {
      if (msg.senderId !== state.currentUserId && msg.status !== 'read') {
        dispatch({ type: 'UPDATE_MESSAGE_STATUS', payload: { chatId, messageId: msg.id, status: 'read' } });
      }
    });
  }, [state.messages, state.currentUserId]);

  const deleteMessage = useCallback((chatId: string, messageId: string) => {
    dispatch({ type: 'DELETE_MESSAGE', payload: { chatId, messageId } });
  }, []);

  const editMessage = useCallback((chatId: string, messageId: string, newText: string) => {
    dispatch({ type: 'EDIT_MESSAGE', payload: { chatId, messageId, newText } });
  }, []);

  const createChat = useCallback((userId: string, name: string, avatar: string) => {
    const existingChat = state.chats.find(c => c.otherUser.id === userId);
    if (existingChat) return existingChat.id;
    const newChat = createChatObject(
      `chat_${Date.now()}`,
      [state.currentUserId, userId],
      { id: userId, name, avatar, online: false, lastSeen: Date.now() },
      0
    );
    dispatch({ type: 'ADD_CHAT', payload: newChat });
    return newChat.id;
  }, [state.chats, state.currentUserId]);

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

  const value: ChatContextValue = {
    ...state,
    sendMessage,
    sendTyping,
    markChatRead,
    deleteMessage,
    editMessage,
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