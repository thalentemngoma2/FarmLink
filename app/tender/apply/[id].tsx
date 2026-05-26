import { Ionicons } from '@expo/vector-icons';
<<<<<<< HEAD
import { useLocalSearchParams, router } from 'expo-router';
import React, { useState } from 'react';
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
=======
import { router, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
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
>>>>>>> gozilethu/farmlink-Mbutho
} from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';

export default function ApplyToTenderPage() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [proposedPrice, setProposedPrice] = useState('');
  const [deliveryCommitment, setDeliveryCommitment] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    setErrorMessage(null); // Clear previous errors
    if (!proposedPrice.trim()) {
      setErrorMessage('Please enter your proposed price');
      return;
    }
    if (!message.trim()) {
      setErrorMessage('Please write a cover message');
      return;
    }
    if (!user) {
      setErrorMessage('You must be logged in to apply');
      return;
    }

    setSubmitting(true);
    try {
      // Auto-fix: Ensure the user exists in the public "users" table
      const { data: userCheck } = await supabase
        .from('users')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!userCheck) {
        const email = user.email ?? `user_${user.id}@placeholder.com`;
        await supabase.from('users').insert({
          user_id: user.id,
          username: user.name || 'Farmer',
          email: email,
          phone_number: '',
          password_hash: '',
          role: user.role || 'farmer',
        });
      }

      const { error } = await supabase
        .from('tender_applications')
        .insert({
          tender_id: id,
          farmer_id: user.id,
          proposed_price: proposedPrice,
          delivery_commitment: deliveryCommitment,
          message,
          status: 'pending',
        });
      if (error) {
        if (error.code === '23505') throw new Error('You have already applied to this tender');
        throw error;
      }
      
      if (Platform.OS === 'web') {
        window.alert('Success\n\nYour application has been submitted!');
        router.replace(`/tender/${id}`);
      } else {
        Alert.alert('Success', 'Your application has been submitted!', [
          { text: 'OK', onPress: () => router.replace(`/tender/${id}`) },
        ]);
      }
    } catch (error: any) {
      const msg = error.message || 'Failed to submit application';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace(`/tender/${id}`)} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#11181C" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Apply for Tender</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInUp}>
            <Text style={styles.subtitle}>Submit your offer to the retailer. Your application will be private.</Text>

            {errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={20} color="#ef4444" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.formCard}>
              {/* Proposed Price */}
              <View style={styles.field}>
                <Text style={styles.label}>Proposed Price *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. R15 000"
                  placeholderTextColor="#9ca3af"
                  value={proposedPrice}
                  onChangeText={setProposedPrice}
                />
              </View>

              {/* Delivery Commitment */}
              <View style={styles.field}>
                <Text style={styles.label}>Delivery Commitment</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Within 2 weeks of acceptance"
                  placeholderTextColor="#9ca3af"
                  value={deliveryCommitment}
                  onChangeText={setDeliveryCommitment}
                />
              </View>

              {/* Cover Message */}
              <View style={styles.field}>
                <Text style={styles.label}>Cover Message *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  placeholder="Introduce yourself, explain why you're a good fit, describe your farm and experience..."
                  placeholderTextColor="#9ca3af"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* Privacy Notice */}
            <View style={styles.privacyBox}>
              <Ionicons name="lock-closed-outline" size={18} color="#22c55e" />
              <Text style={styles.privacyText}>
                Your application is private. Only the retailer who posted this tender can see your details.
              </Text>
            </View>
          </Animated.View>
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Submit Application</Text>
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
  container: { flex: 1, backgroundColor: '#f9fafb' },
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
  scrollContent: { padding: 16, paddingBottom: 100 },
  subtitle: { fontSize: 14, color: '#6b7280', marginBottom: 16, lineHeight: 20 },
   formCard: {
     backgroundColor: '#fff',
     borderRadius: 16,
     padding: 16,
     ...Platform.select({ web: { boxShadow: '0px 1px 4px rgba(0,0,0,0.05)' }, default: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 } }),
   },
  field: { marginBottom: 16 },
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
  textArea: { minHeight: 120, paddingTop: 12 },
  privacyBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.2)',
  },
  privacyText: { fontSize: 13, color: '#166534', marginLeft: 10, flex: 1, lineHeight: 18 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
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
<<<<<<< HEAD
});
=======
});
>>>>>>> gozilethu/farmlink-Mbutho
