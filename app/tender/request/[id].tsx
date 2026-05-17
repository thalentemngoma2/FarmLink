import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

type ExpertRequestStatus = 'pending' | 'assigned' | 'in_progress' | 'resolved' | 'closed';

interface RequestMessage {
  id: string;
  content: string;
  senderId: string;
  createdAt: string;
}

export default function ExpertRequestDetailPage() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [requestTitle, setRequestTitle] = useState('');
  const [requestStatus, setRequestStatus] = useState<ExpertRequestStatus>('pending');
  const [farmerName, setFarmerName] = useState<string>('');
  const [farmerLocation, setFarmerLocation] = useState<string>('');

  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const canReply = useMemo(() => {
    if (!user) return false;
    // Extension officers can reply only when assigned (or still allowed by RLS policy for expert_id)
    return user.role === 'extension_officer' || user.role === 'admin';
  }, [user]);

  const fetchMessages = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('expert_request_messages')
        .select(`
          message_id,
          content,
          sender_id,
          created_at
        `)
        .eq('request_id', id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const mapped: RequestMessage[] = (data || []).map((m: any) => ({
        id: m.message_id,
        content: m.content,
        senderId: m.sender_id,
        createdAt: m.created_at,
      }));

      setMessages(mapped);
    } catch (e: any) {
      console.error('Failed to fetch request messages', e);
      Alert.alert('Error', 'Could not load conversation');
    }
  }, [id]);

  const fetchRequest = useCallback(async () => {
    if (!id) return;
    try {
      const { data, error } = await supabase
        .from('expert_requests')
        .select(`
          request_id,
          subject,
          status,
          farmer:farmer_id ( user_id )
        `)
        .eq('request_id', id)
        .single();

      if (error) throw error;

      setRequestTitle(data.subject ?? '');
      setRequestStatus((data.status ?? 'pending') as ExpertRequestStatus);

      // farmer join may return either a single object or an array depending on the relationship
      const farmerValue = (data as any).farmer;
      const farmer = Array.isArray(farmerValue) ? farmerValue[0] : farmerValue;
      const farmerUserId = (farmer as any)?.user_id as string | undefined;

      setFarmerName(farmerUserId ?? 'Farmer');
      setFarmerLocation('');

      // Fetch location separately to avoid failing embed relationships (PGRST201/PGRST200)
      if (farmerUserId) {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('full_name, location')
          .eq('user_id', farmerUserId)
          .maybeSingle();

        if (!profileErr && profileData) {
          setFarmerName(profileData.full_name ?? farmerUserId);
          setFarmerLocation(profileData.location ?? '');
        }
      }

    } catch (e: any) {
      console.error('Failed to fetch request', e);
      Alert.alert('Error', 'Request not found or not accessible');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      await fetchRequest();
      await fetchMessages();
    })();
  }, [id, fetchRequest, fetchMessages]);

  const handleSendReply = useCallback(async () => {
    if (!user) return Alert.alert('Login required');
    if (!id) return;

    const content = replyText.trim();
    if (!content) return;

    if (!canReply) {
      return Alert.alert('Not allowed', 'Your role cannot reply to this request');
    }

    setSending(true);
    try {
      // Create a new message in the conversation thread
      const { error } = await supabase
        .from('expert_request_messages')
        .insert({
          request_id: id,
          sender_id: user.id,
          content,
          is_read: false,
        });

      if (error) throw error;

      // Optional: if you're replying for the first time, move status to in_progress
      if (requestStatus === 'assigned') {
        const { error: statusErr } = await supabase
          .from('expert_requests')
          .update({ status: 'in_progress', updated_at: new Date().toISOString() })
          .eq('request_id', id);

        // Do not block reply if this fails
        if (statusErr) console.warn('Could not update request status', statusErr);
      }

      setReplyText('');
      await fetchMessages();
    } catch (e: any) {
      console.error('Failed to send reply', e);
      Alert.alert('Error', e.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  }, [user, id, replyText, canReply, requestStatus, fetchMessages]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/support')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#11181C" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Request Conversation</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>
              {requestTitle}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardDismissMode="interactive">
          <Animated.View entering={FadeInUp} style={styles.card}>
            <View style={styles.metaRow}>
              <View style={[styles.statusBadge, { backgroundColor: statusBg(requestStatus) }]}>
                <Text style={[styles.statusText, { color: statusFg(requestStatus) }]}>
                  {requestStatus.replace('_', ' ').toUpperCase()}
                </Text>
              </View>
              <Text style={styles.metaText}>Farmer: {farmerName}</Text>
              <Text style={styles.metaText}>Location: {farmerLocation || 'N/A'}</Text>

            </View>

            <Text style={styles.sectionTitle}>Messages</Text>

            {messages.length === 0 ? (
              <Text style={styles.emptyText}>No messages yet.</Text>
            ) : (
              messages.map(m => {
                const isMine = user?.id === m.senderId;
                return (
                  <View key={m.id} style={[styles.messageRow, isMine ? styles.mineRow : styles.theirRow]}>
                    <View style={[styles.messageBubble, isMine ? styles.mineBubble : styles.theirBubble]}>
                      <Text style={[styles.messageText, isMine ? styles.mineText : styles.theirText]}>
                        {m.content}
                      </Text>
                      <Text style={[styles.messageTime, isMine ? styles.mineTime : styles.theirTime]}>
                        {new Date(m.createdAt).toLocaleString()}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </Animated.View>
        </ScrollView>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
          style={styles.replyBar}
        >
          <View style={styles.replyInner}>
            <TextInput
              style={styles.input}
              value={replyText}
              onChangeText={setReplyText}
              placeholder={canReply ? 'Type your reply...' : 'You cannot reply'}
              editable={canReply && !sending}
              multiline
              maxLength={800}
            />
            <TouchableOpacity
              style={[styles.sendButton, (!canReply || !replyText.trim() || sending) && styles.sendDisabled]}
              onPress={handleSendReply}
              disabled={!canReply || !replyText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        <BottomNav />
      </View>
    </SafeAreaView>
  );
}

function statusBg(status: ExpertRequestStatus) {
  switch (status) {
    case 'pending':
      return 'rgba(245,158,11,0.15)';
    case 'assigned':
      return 'rgba(59,130,246,0.15)';
    case 'in_progress':
      return 'rgba(34,197,94,0.15)';
    case 'resolved':
      return 'rgba(16,185,129,0.15)';
    case 'closed':
      return 'rgba(148,163,184,0.15)';
    default:
      return 'rgba(156,163,175,0.15)';
  }
}

function statusFg(status: ExpertRequestStatus) {
  switch (status) {
    case 'pending':
      return '#f59e0b';
    case 'assigned':
      return '#3b82f6';
    case 'in_progress':
      return '#22c55e';
    case 'resolved':
      return '#10b981';
    case 'closed':
      return '#9ca3af';
    default:
      return '#9ca3af';
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, backgroundColor: '#fff' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#11181C' },
  headerSubtitle: { fontSize: 12, color: '#6b7280', marginTop: 2 },

  scrollContent: { padding: 16, paddingBottom: 180 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '700' },
  metaText: { fontSize: 12, color: '#6b7280' },
  sectionTitle: { marginTop: 12, fontSize: 16, fontWeight: '700', color: '#11181C' },
  emptyText: { marginTop: 12, color: '#6b7280' },

  messageRow: { marginTop: 12 },
  mineRow: { alignItems: 'flex-end' },
  theirRow: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '85%', padding: 12, borderRadius: 16 },
  mineBubble: { backgroundColor: '#22c55e', borderTopRightRadius: 6 },
  theirBubble: { backgroundColor: '#f3f4f6', borderTopLeftRadius: 6 },
  messageText: { fontSize: 14, lineHeight: 18 },
  mineText: { color: '#fff' },
  theirText: { color: '#11181C' },
  messageTime: { marginTop: 6, fontSize: 10 },
  mineTime: { color: 'rgba(255,255,255,0.85)' },
  theirTime: { color: '#6b7280' },

  replyBar: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  replyInner: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
    fontSize: 14,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { backgroundColor: '#d1d5db' },
});