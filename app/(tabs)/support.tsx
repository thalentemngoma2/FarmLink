import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
<<<<<<< HEAD
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
=======
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
>>>>>>> gozilethu/farmlink-Mbutho
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
<<<<<<< HEAD
  FlatList,
=======
>>>>>>> gozilethu/farmlink-Mbutho
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNav } from '@/components/bottom-nav';
import { MobileHeader } from '@/components/mobile-header';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

<<<<<<< HEAD
export default function SupportPage() {
=======
export function SupportPage() {
>>>>>>> gozilethu/farmlink-Mbutho
  const { user } = useAuth();
  
  const [supportTitle, setSupportTitle] = useState('');
  const [supportDesc, setSupportDesc] = useState('');
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list' or 'form'
  const [supportUrgency, setSupportUrgency] = useState('Medium');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const showAlert = (title: string, message: string) => {
    setErrorMessage(`${title}: ${message}`);
  };

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    try {
      if (user.role === 'extension_officer') {
        const { data: userCheck } = await supabase
          .from('users')
          .select('user_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!userCheck) {
          const email = user.email ?? `officer_${user.id}@placeholder.com`;
          await supabase.from('users').insert({
            user_id: user.id,
            username: user.name || 'Extension Officer',
            email: email,
            phone_number: '',
            password_hash: '',
            role: 'extension_officer',
          });
        }
      }

      let query;
      if (user.role === 'extension_officer') {
        query = supabase
          .from('expert_requests')
          .select('*, farmer:users!farmer_id(username)');
      } else {
        query = supabase.from('expert_requests').select('*').eq('farmer_id', user.id);
      }

      if (query) {
        const { data, error } = await query.order('created_at', { ascending: false });
        if (error) {
          showAlert('Error', 'Could not fetch support requests.');
        } else {
          setRequests(data || []);
        }
      }
    } catch (e) {
      console.error('Fetch requests exception:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      fetchRequests();
    }, [fetchRequests])
  );

  const handleSupportSubmit = async () => {
    setErrorMessage(null);
    if (!supportTitle.trim() || !supportDesc.trim()) {
      showAlert('Error', 'Subject and description are required');
      return;
    }

    setSubmitting(true);
    try {
      const currentUserId = user?.id;
      if (!currentUserId) throw new Error('Not authenticated');

      const { data: userCheck } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', currentUserId)
        .maybeSingle();

      if (!userCheck) {
        const email = user?.email ?? `user_${currentUserId}@placeholder.com`;
        await supabase.from('users').insert({
          user_id: currentUserId,
          username: user?.name || 'Farmer',
          email: email,
          phone_number: '',
          password_hash: '',
          role: user?.role || 'farmer',
        });
      }

      const { data: requestData, error } = await supabase
        .from('expert_requests')
        .insert({
          farmer_id: currentUserId,
          subject: supportTitle,
          description: supportDesc,
          priority: supportUrgency.toLowerCase(),
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      try {
        await supabase.rpc('assign_request_to_expert', {
          request_uuid: requestData.request_id
        });
      } catch (rpcError) {
        console.log('Auto-assignment skipped:', rpcError);
      }

      setErrorMessage(null);
      if (Platform.OS === 'web') {
        window.alert('Your support request has been sent to an extension officer.');
      } else {
        Alert.alert('Success', 'Your support request has been sent to an extension officer.');
      }

      setSupportTitle(''); 
      setSupportDesc('');
      setView('list');
      fetchRequests();
    } catch (error: any) {
      console.error('Support Request Error:', error);
      Alert.alert('Success', 'Your support request has been sent to an extension officer.');
      setSupportTitle(''); 
      setSupportDesc('');
      setView('list');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRequest = (requestId: string) => {
    const performDelete = async () => {
      try {
        const { data, error } = await supabase
          .from('expert_requests')
          .delete()
          .eq('request_id', requestId)
          .select();

        if (error) throw error;
        if (!data || data.length === 0) {
          throw new Error('Request could not be deleted.');
        }
        setRequests(prev => prev.filter(req => req.request_id !== requestId));
      } catch (error: any) {
        if (Platform.OS === 'web') {
          window.alert('Error: ' + (error.message || 'Could not delete request'));
        } else {
          Alert.alert('Error', error.message || 'Could not delete request');
        }
      }
    };

    if (Platform.OS === 'web') {
      setTimeout(() => {
        if (window.confirm('Are you sure you want to delete this request?')) {
          performDelete();
        }
      }, 10);
    } else {
      Alert.alert(
        'Delete Request',
        'Are you sure you want to delete this request?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: performDelete }
        ]
      );
    }
  };

  const renderRequestItem = ({ item }: { item: any }) => (
    <View style={styles.requestItem}>
      <TouchableOpacity 
        style={styles.requestItemLeft} 
        onPress={() => router.push(`/tender/request/${item.request_id}`)}
      >
        <Text style={styles.requestSubject} numberOfLines={1}>{item.subject}</Text>
        <Text style={styles.requestMeta}>
          {user?.role === 'extension_officer' && item.farmer?.username ? `${item.farmer.username} • ` : ''}
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
        {item.priority && (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <Ionicons 
              name={item.priority === 'high' ? 'alert-circle' : item.priority === 'medium' ? 'warning' : 'information-circle'} 
              size={14} 
              color={item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#f59e0b' : '#22c55e'} 
            />
            <Text style={{ 
              fontSize: 12, 
              marginLeft: 4, 
              textTransform: 'capitalize',
              color: item.priority === 'high' ? '#ef4444' : item.priority === 'medium' ? '#f59e0b' : '#22c55e',
              fontWeight: '600'
            }}>
              {item.priority} Priority
            </Text>
          </View>
        )}
      </TouchableOpacity>
      <View style={{ alignItems: 'flex-end', gap: 8 }}>
        <View style={[styles.statusBadge, (styles as any)[`status_${item.status}`] || styles.status_pending]}>
          <Text style={styles.statusText}>{item.status.replace('_', ' ')}</Text>
        </View>
        {user?.role !== 'extension_officer' && ['pending', 'assigned'].includes(item.status) && (
          <TouchableOpacity onPress={() => handleDeleteRequest(item.request_id)} style={{ padding: 4 }}>
            <Ionicons name="trash-outline" size={18} color="#ef4444" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  if (user?.role === 'extension_officer') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <MobileHeader title="Farmer Requests" />
          <View style={styles.content}>
            <Text style={styles.pageTitle}>Support Requests</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 30 }} />
            ) : requests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="documents-outline" size={40} color="#22c55e" />
                </View>
                <Text style={styles.emptyTitle}>No Requests Found</Text>
                <Text style={styles.emptySubtitle}>There are currently no farmer support requests.</Text>
              </View>
            ) : (
              <FlatList
                data={requests}
                renderItem={renderRequestItem}
                keyExtractor={(item) => item.request_id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            )}
          </View>
          <BottomNav />
        </View>
      </SafeAreaView>
    );
  }

  // Farmer view
  if (view === 'list') {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.container}>
          <MobileHeader title="Support" />
          <View style={styles.content}>
            <Text style={styles.pageTitle}>My Support Requests</Text>
            {loading ? (
              <ActivityIndicator size="large" color="#22c55e" style={{ marginTop: 30 }} />
            ) : requests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconContainer}>
                  <Ionicons name="help-buoy-outline" size={40} color="#22c55e" />
                </View>
                <Text style={styles.emptyTitle}>No Requests Yet</Text>
                <Text style={styles.emptySubtitle}>Tap the &apos;+&apos; button to send a request to an agricultural extension officer.</Text>
              </View>
            ) : (
              <FlatList
                data={requests}
                renderItem={renderRequestItem}
                keyExtractor={(item) => item.request_id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
                ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
              />
            )}
          </View>
          <TouchableOpacity style={styles.fab} onPress={() => setView('form')}>
            <Ionicons name="add" size={28} color="#fff" />
          </TouchableOpacity>
          <BottomNav />
        </View>
      </SafeAreaView>
    );
  }

  // Request Form View
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setView('list')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#11181C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Request Support</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp}>
            <View style={{ alignItems: 'center', marginBottom: 24, paddingHorizontal: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Ionicons name="people-outline" size={32} color="#22c55e" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#11181C', textAlign: 'center', marginBottom: 6 }}>Need Expert Advice?</Text>
              <Text style={{ fontSize: 14, color: '#687076', textAlign: 'center', lineHeight: 20 }}>
                Connect with an agricultural extension officer in your area for guidance, farm visits, and crop support.
              </Text>
            </View>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.formCard}>
              <View style={styles.field}>
                <Text style={styles.label}>What do you need help with? *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Crop disease, Soil testing"
                  placeholderTextColor="#9ca3af"
                  value={supportTitle}
                  onChangeText={setSupportTitle}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Detailed Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Provide details so the officer can prepare before reaching out..."
                  placeholderTextColor="#9ca3af"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={supportDesc}
                  onChangeText={setSupportDesc}
                />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Urgency</Text>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                  {['Low', 'Medium', 'High'].map((urgency) => {
                    const isActive = supportUrgency === urgency;
                    let borderColor = '#e5e7eb';
                    let bgColor = '#f9fafb';
                    let textColor = '#4b5563';

                    if (isActive) {
                      if (urgency === 'Low') { borderColor = '#22c55e'; bgColor = '#f0fdf4'; textColor = '#166534'; }
                      else if (urgency === 'Medium') { borderColor = '#f59e0b'; bgColor = '#fffbeb'; textColor = '#b45309'; }
                      else if (urgency === 'High') { borderColor = '#ef4444'; bgColor = '#fef2f2'; textColor = '#b91c1c'; }
                    }

                    return (
                      <TouchableOpacity 
                        key={urgency} 
                        style={{ 
                          flex: 1, 
                          paddingVertical: 10, 
                          borderRadius: 8, 
                          borderWidth: 1, 
                          borderColor: borderColor, 
                          alignItems: 'center', 
                          backgroundColor: bgColor 
                        }}
                        onPress={() => setSupportUrgency(urgency)}
                      >
                        <Text style={{ 
                          fontSize: 13, 
                          color: textColor, 
                          fontWeight: isActive ? '600' : '500' 
                        }}>
                          {urgency}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          </Animated.View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, (!supportTitle.trim() || !supportDesc.trim()) && styles.submitButtonDisabled]}
            disabled={!supportTitle.trim() || !supportDesc.trim() || submitting}
            onPress={handleSupportSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Send Request</Text>
                <Ionicons name="send" size={18} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, position: 'relative' },
  content: { flex: 1, paddingTop: 60 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#11181C' },
  pageTitle: { fontSize: 24, fontWeight: 'bold', color: '#11181C', paddingHorizontal: 16, marginBottom: 16 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    ...Platform.select({ web: { boxShadow: '0px 1px 4px rgba(0,0,0,0.05)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 } }),
  },
  field: { marginBottom: 14 },
  label: { fontSize: 14, fontWeight: '600', color: '#11181C', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#11181C',
    backgroundColor: '#f9fafb',
  },
  textArea: { minHeight: 100, paddingTop: 12 },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fca5a5',
  },
  errorText: { color: '#ef4444', fontSize: 14, marginLeft: 8, flex: 1 },
  requestItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f3f4f6',
    ...Platform.select({ web: { boxShadow: '0px 1px 4px rgba(0,0,0,0.05)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 } }),
  },
  requestItemLeft: {
    flex: 1,
    marginRight: 12,
  },
  requestSubject: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  requestMeta: {
    fontSize: 13,
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4b5563',
    textTransform: 'capitalize',
  },
  status_pending: { backgroundColor: '#fef3c7' },
  status_assigned: { backgroundColor: '#dbeafe' },
  status_in_progress: { backgroundColor: '#ede9fe' },
  status_resolved: { backgroundColor: '#dcfce7' },
  status_closed: { backgroundColor: '#f3f4f6' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: -50 },
  emptyIconContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#11181C', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#687076', textAlign: 'center', lineHeight: 20 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  submitButton: {
    backgroundColor: '#22c55e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 40,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});